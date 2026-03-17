# Architectural Review — LEADS2 Swarm Lead Intelligence Engine

**Date:** 2026-03-14
**Scope:** Full system (Worker + Dashboard + Data Layer)
**Impact Assessment:** System-wide

---

## 1. Architecture Overview

| Layer | Technology | Pattern |
|-------|-----------|---------|
| Frontend | Next.js 16 (App Router), Clerk, Stripe | Server Components + Server Actions |
| Backend Worker | Node.js + TypeScript, Puppeteer Stealth | CLI/Long-running poller |
| Data | PostgreSQL + Prisma | Bridge Pattern (DB-as-queue) |
| AI | OpenAI gpt-4o-mini | Premium email extraction |

**Communication:** Dashboard ↔ Worker via PostgreSQL job queue (no REST/gRPC between them).

---

## 2. Strengths

### S1 — Bridge Pattern Simplicity
Using PostgreSQL as the sole communication channel eliminates service discovery, API versioning, and network failure modes between dashboard and worker. `FOR UPDATE SKIP LOCKED` provides safe concurrent polling without Redis or RabbitMQ.

### S2 — Sequential Email Verification
Moving from `Promise.all` to sequential `for...of` with 500ms delays prevents DNS rate-limiting. This is the correct tradeoff for a data collection workload where throughput matters less than deliverability accuracy.

### S3 — Stealth Browser Reuse
Sharing a single Chromium instance across Maps + website data collection (ARC-02) reduces memory and startup overhead. Browser rotation every 50 jobs balances fingerprint freshness against resource cost.

### S4 — Catch-All Domain Detection
Probing with a garbage local part before trusting SMTP RCPT TO responses prevents false positives on catch-all domains (Microsoft 365, etc.). Returning `CATCH_ALL` with confidence 40 is honest and useful.

### S5 — Server-Side Price Validation (SEC-02)
`PRICE_TO_CREDITS` mapping lives server-side only. The client sends a `priceId`, never a credit amount. This prevents credit-amount tampering.

### S6 — Webhook Idempotency (SEC-03)
`ProcessedEvent` table prevents duplicate credit grants from replayed Stripe webhooks.

---

## 3. Risks & Findings

### CRITICAL

#### R1 — Single Point of Failure: Shared Browser Instance
**Impact:** HIGH | **Likelihood:** HIGH

The entire pipeline runs through one Chromium process. A single tab crash, memory leak, or Google captcha kills all in-flight work.

- `worker.ts` rotates browsers every 50 jobs, but a crash mid-job leaves the task in `PROCESSING` with no automatic recovery.
- No health check on the browser process between jobs.

**Recommendation:**
1. Add a `browser.isConnected()` check before each `processJob` call.
2. Implement a `PROCESSING` → `PENDING` recovery sweep for tasks locked >10 minutes (stale lock detection).
3. Consider browser-per-task for isolation (at ~200MB/instance cost).

#### R2 — No Dead Letter / Retry Limit on ScrapeTask
**Impact:** HIGH | **Likelihood:** MEDIUM

`ScrapeTask` has no `retries` field (unlike `Company`). A poisoned task (e.g., query that always crashes Puppeteer) will be retried infinitely:
- Worker picks it up → crashes → task stays PROCESSING → stale lock sweep resets to PENDING → loop.

**Recommendation:**
1. Add `retries Int @default(0)` and `maxRetries Int @default(3)` to `ScrapeTask`.
2. After `maxRetries`, move to `FAILED` status with error message.
3. Surface failed tasks in the dashboard with retry button.

#### R3 — In-Memory Rate Limiter (SEC-06)
**Impact:** HIGH | **Likelihood:** MEDIUM

`rateLimit.ts` uses an in-memory `Map`. In production with multiple Next.js instances (Vercel, PM2 cluster), each instance has its own map — rate limits are per-instance, not per-user.

**Recommendation:**
1. Move rate limiting to PostgreSQL (simple `INSERT ... ON CONFLICT` with timestamp window) or Redis.
2. Alternatively, use Vercel's edge rate limiting if deploying there.

---

### HIGH

#### R4 — No Transaction Around Job Completion
**Impact:** HIGH | **Likelihood:** LOW

`scraperService.ts` updates `ScrapeJob.status` to `COMPLETED` and sets `resultsFound` in separate queries. A crash between these writes leaves the job marked complete with wrong count.

**Recommendation:** Wrap the finalization in a Prisma `$transaction`.

#### R5 — LLM Confidence Scores Unvalidated (Known Bug)
**Impact:** MEDIUM | **Likelihood:** HIGH

`hybridParser.ts` passes LLM output directly as confidence scores without clamping to [0, 100] or validating numeric type. A hallucinated score of 999 would pollute downstream filtering.

**Recommendation:**
```typescript
const score = Math.max(0, Math.min(100, Number(llmScore) || 0));
```

#### R6 — `force-dynamic` on All Dashboard Pages
**Impact:** MEDIUM | **Likelihood:** HIGH

Every dashboard page sets `export const dynamic = 'force-dynamic'`, disabling Next.js caching entirely. For pages like `/dashboard/credits` (rarely changing), this wastes server resources and increases latency.

**Recommendation:** Use `revalidate` with ISR (e.g., 60s) for semi-static pages. Keep `force-dynamic` only for `/dashboard/jobs` and `/dashboard/leads` where freshness matters.

---

### MEDIUM

#### R7 — No Graceful Shutdown for In-Flight Data Collection
**Impact:** MEDIUM | **Likelihood:** MEDIUM

`worker.ts` handles SIGINT/SIGTERM but doesn't wait for the current `processJob` to finish. A deploy or restart mid-extraction leaves the task in PROCESSING.

**Recommendation:** Set a `shuttingDown` flag on signal, let the current job finish, then exit. Combine with R1's stale lock recovery as a safety net.

#### R8 — Client-Side Polling Instead of Server-Sent Events
**Impact:** LOW | **Likelihood:** HIGH (UX)

`JobPoller.tsx` calls `router.refresh()` every 10 seconds, causing full page re-renders. For a dashboard with many leads, this is wasteful.

**Recommendation:** Replace with SSE or WebSocket for real-time job status updates. Even a simple `EventSource` endpoint would reduce server load and improve UX.

#### R9 — No Index on `Company.jobId`
**Impact:** MEDIUM | **Likelihood:** MEDIUM

The schema indexes `Company` on `[status, createdAt]` and `[userId]`, but the dashboard frequently queries by `jobId` (leads page, CSV export). Without an index, these queries do full table scans as data grows.

**Recommendation:** Add `@@index([jobId])` to the `Company` model.

#### R10 — Hardcoded DNS Resolvers
**Impact:** LOW | **Likelihood:** LOW

`emailVerifier.ts` uses `8.8.8.8` and `1.1.1.1`. In corporate/restricted networks, these may be blocked.

**Recommendation:** Make DNS resolvers configurable via environment variable with these as defaults.

#### R11 — No Credit Deduction Guard
**Impact:** HIGH | **Likelihood:** MEDIUM

`createScrapeJob` in `actions.ts` checks `hasCredits()` but doesn't atomically deduct credits. A race condition allows a user to submit multiple jobs before credits are decremented, overdrawing their balance.

**Recommendation:** Use `prisma.user.update({ where: { credits: { gte: cost } }, data: { credits: { decrement: cost } } })` with a conditional update to make the check-and-deduct atomic.

---

### LOW

#### R12 — `HYBRID` Source Enum Dead Code
`hybridParser.ts` defines `HYBRID` as an email source but never assigns it. Dead enum values confuse future developers.

#### R13 — Rating Regex False Matches
`googleMapsScraper.ts` uses `\d\.\d` which matches version numbers, prices, etc. Use a more specific pattern like `\d\.\d\s*★` or extract from a known DOM element.

#### R14 — No Health Check Endpoint
Neither the worker nor the dashboard exposes a `/health` or `/readyz` endpoint for container orchestration (Docker, K8s liveness/readiness probes).

---

## 4. Architecture Pattern Compliance

| Principle | Status | Notes |
|-----------|--------|-------|
| Single Responsibility | ✅ PASS | Clear separation: collector, verifier, parser, guesser |
| Dependency Inversion | ⚠️ PARTIAL | Services directly import Prisma client; no repository abstraction |
| Open/Closed | ⚠️ PARTIAL | Adding new data sources requires modifying `scraperService.ts` |
| Interface Segregation | ✅ PASS | Small, focused modules |
| Clean Architecture | ⚠️ PARTIAL | No domain layer; business logic mixed with infrastructure (Prisma calls in service layer) |
| 12-Factor App | ⚠️ PARTIAL | Config from env ✅, but logs to file not stdout, no health endpoint |

---

## 5. Scalability Assessment

| Dimension | Current State | Ceiling | Bottleneck |
|-----------|--------------|---------|------------|
| Concurrent jobs | 1 (sequential poller) | 1 | Single worker, sequential processing |
| Leads per job | ~60 (maxResults) | ~100 | Google Maps scroll limit, memory |
| Email verification | ~2/sec (500ms delay) | ~2/sec | DNS rate limiting (by design) |
| Dashboard users | ~50 concurrent | ~200 | `force-dynamic` + polling overhead |
| Database | Single PostgreSQL | ~10K jobs | No read replicas, no connection pooling config |

**Scaling Path:**
1. **Horizontal workers:** The `SKIP LOCKED` pattern already supports multiple workers. Deploy 2-3 worker instances behind the same DB.
2. **Connection pooling:** Add PgBouncer or Prisma Accelerate for dashboard query load.
3. **Read replicas:** Route dashboard reads to a replica once write volume justifies it.

---

## 6. Security Posture

| Control | Status | Details |
|---------|--------|---------|
| Authentication | ✅ | Clerk with middleware-enforced routes |
| Authorization | ⚠️ | User ownership checks exist but not consistently applied (verify all mutations) |
| Payment security | ✅ | Server-side price mapping, webhook signature validation, idempotency |
| Rate limiting | ❌ | In-memory only (R3) |
| Input validation | ⚠️ | `query` field from job creation not sanitized for injection into Google Maps URL |
| CSRF | ✅ | Server Actions use built-in Next.js CSRF protection |
| Secrets | ✅ | All in `.env`, not committed |

---

## 7. Recommended Priority Actions

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | R1 — Browser health check + stale lock recovery | 2h | Prevents silent job loss |
| P0 | R2 — ScrapeTask retry limit + dead letter | 1h | Prevents infinite retry loops |
| P0 | R11 — Atomic credit deduction | 30m | Prevents credit overdraw |
| P1 | R3 — Persistent rate limiting | 2h | Security requirement for production |
| P1 | R4 — Transaction around job completion | 30m | Data consistency |
| P1 | R9 — Add `@@index([jobId])` to Company | 5m | Query performance |
| P2 | R5 — Clamp LLM confidence scores | 15m | Data quality |
| P2 | R7 — Graceful shutdown | 1h | Deployment reliability |
| P2 | R14 — Health check endpoints | 30m | Operability |
| P3 | R6 — ISR for semi-static pages | 30m | Dashboard performance |
| P3 | R8 — SSE for job status | 3h | UX improvement |

---

## 8. Architecture Decision Records

### ADR-001: PostgreSQL as Message Queue
**Status:** Accepted
**Context:** Dashboard and worker need to communicate job status.
**Decision:** Use PostgreSQL `FOR UPDATE SKIP LOCKED` instead of Redis/RabbitMQ.
**Consequences:** (+) No additional infrastructure, atomic with data writes. (−) Polling latency (5s), no pub/sub, limited throughput (~100 jobs/min).
**Review:** Appropriate for current scale. Revisit at >1000 jobs/day.

### ADR-002: Shared Browser Instance
**Status:** Accepted with Conditions
**Context:** Puppeteer instances cost ~200MB RAM each.
**Decision:** Share one Chromium instance across Maps + website data collection, rotate every 50 jobs.
**Consequences:** (+) Memory efficient. (−) Single point of failure, crash propagation.
**Conditions:** Must implement R1 (health check + stale lock recovery) before production traffic.

### ADR-003: Sequential Email Verification
**Status:** Accepted
**Context:** Parallel DNS/SMTP probes trigger rate limits from providers.
**Decision:** Sequential verification with 500ms/1500ms delays.
**Consequences:** (+) Reliable verification, no rate-limit bans. (−) Slow for large batches (~2 emails/sec).
**Review:** Acceptable. Could batch by domain to share MX lookups.

---

*End of review.*
