# Worker Diagnosis Report — 2026-03-06

> **Agents:** @debugger, @database-architect
> **Period Analyzed:** 2026-03-06 05:24 → 13:25 UTC (~8 hours)
> **Trigger:** User force-stopped worker after long runtime without quota completion

---

## Verdict: NOT A BUG — Sequential Bottleneck on Massive Queue

The worker was functioning correctly. It was not stuck in a CAPTCHA loop, rate-limited, or spinning idle. It was processing a queue of **202 tasks sequentially** with a **single browser instance**, at an average rate of ~7 minutes per task. At that rate, full completion would require **~23 hours** — the worker was force-killed at the ~8 hour mark with 67/202 tasks completed.

---

## Evidence Summary

### Timeline (from `scraper.log`)

| Time (UTC) | Event |
|------------|-------|
| 05:23 | First boot failed — PostgreSQL not running |
| 05:24 | Retry: connected to DB, started Service Mode |
| 05:24 | Worker `worker-e51c01af` initialized (Headless Chromium) |
| 05:26 | Task 1: "Construction companies in Tbilisi" (50 leads) |
| 05:51 | Task 2: "სამშენებლო კომპანიები ბათუმში" |
| 06:37 | Task 3+: US city batch begins (New York) |
| 06:37–13:20 | 65 US city tasks processed sequentially |
| 13:25 | `🛑 Shutting down worker...` (force-stopped) |

### Processing Rate (from `worker.log`)

Per-company timing from log timestamps:

| Metric | Value |
|--------|-------|
| Average per company (with website) | 5–15 seconds |
| Average per company (no website / timeout) | 10–30 seconds |
| Average per task (search + scroll + 20-40 companies) | 3–10 minutes |
| Outlier: kareo.com redirect timeout | ~4.5 minutes for single company |

### Database State (at diagnosis time)

| Metric | Value |
|--------|-------|
| **Tasks completed today** | 67 |
| **Tasks still PENDING** | 133 |
| **Tasks stuck PROCESSING** | 13 (orphaned by force-stop) |
| **Companies created (last 6h)** | 1,281 |
| **Contacts created (last 6h)** | 985 (760 VALID, 157 UNKNOWN, 68 INVALID) |
| **Jobs FAILED today** | 135 |
| **Jobs COMPLETED today** | 67 |
| **Overall DB: Companies** | 7,580 |
| **Overall DB: Contacts** | 9,559 |

### The MedSpas Parent Job (Still PROCESSING)

| Field | Value |
|-------|-------|
| ID | `6c454bfa...` |
| Query | "MedSpas" |
| maxResults | **5,000** |
| resultsFound | **777** (counter undercount — actual companies = 5,000) |
| Tasks | **350** |
| Created | 2026-03-01 |
| Status | PROCESSING (5 days running) |

---

## Root Cause Analysis

### Primary Bottleneck: Sequential Single-Worker Processing

```
Task Queue: 202 tasks today
Worker: 1 browser instance, 1 poller thread
Rate: ~7 min/task average
ETA: 202 × 7 = 1,414 min ≈ 23.5 hours
Killed at: ~8 hours (36% complete)
```

The `jobPoller.ts` processes tasks **one at a time** in a `while` loop with 5-second polling interval. Each task involves:
1. Navigate Google Maps → search → scroll (1-2 min)
2. Extract 20-40 business details → navigate each detail page (1-3 min)
3. Deep crawl each business website for emails (2-5 min)
4. Sequential email verification with DNS delays (500ms each)

### Secondary Issue: 135 FAILED Jobs

The most recent 5 jobs in the DB are all FAILED (Tampa, Wichita) with `resultsFound: 0`. These appear to be smaller cities where:
- Google Maps returned fewer results
- Or the scraper task failed during processing
- Their parent ScrapeJobs were marked FAILED but the tasks were never re-queued

### Tertiary Issue: resultsFound Counter Mismatch

The MedSpas job shows `resultsFound: 777` but has `companies: 5,000`. The counter is only set once at job completion (`scraperService.ts` line 224-243), but since the job never completed (worker was killed), it reflects a partial/stale count.

### Orphaned Tasks (13 Stuck PROCESSING)

When the worker was force-stopped, 13 tasks remained in `PROCESSING` status with no `workerId` or `lockedAt`. These will never be picked up again without manual intervention. The existing `resetStalledJobs()` in `queue.ts` only handles Company-level locks, not ScrapeTask-level.

### Non-Issues Confirmed

| Suspected Issue | Status |
|----------------|--------|
| CAPTCHA/reCAPTCHA blocking | **NOT DETECTED** — no CAPTCHA entries in logs |
| Google rate limiting | **NOT DETECTED** — scrolling works normally (20→38 links in 1 second) |
| Browser memory leak | **NOT DETECTED** — heap stable at 30-50MB |
| Infinite scroll loop | **NOT DETECTED** — `🎯 Reached max results limit` fires correctly |
| DNS rate limiting | **NOT DETECTED** — sequential 500ms delays prevent it |

### P2002 Unique Constraint Warnings

```
⚠️ Unique constraint failed on the fields: (`company_id`,`work_email`)
```

These appear ~136 times today. They are **expected dedup behavior** — the `contact.createMany()` call attempts to insert contacts that already exist from a previous run. This is harmless but noisy; could be silenced with `skipDuplicates: true` on `createMany()`.

---

## Immediate Actions Required

### 1. Reset Orphaned Tasks
```bash
npx tsx src/scripts/reset_tasks.ts
```
This resets 13 stuck PROCESSING tasks → PENDING.

### 2. Silence P2002 Noise
Add `skipDuplicates: true` to `contact.createMany()` in `src/db/company.ts`.

### 3. Fix resultsFound Counter
Update `resultsFound` incrementally (per-company insert) instead of only at job completion.

---

## Structural Recommendations (for Zip Code Brainstorm)

| Problem | Current | Needed |
|---------|---------|--------|
| Sequential processing | 1 task at a time | Parallel workers (PM2 cluster + SKIP LOCKED) |
| No global quota tracking | Counter set only at completion | Atomic `currentResults` per insert |
| No task cancellation | All 202 tasks must complete | Cancel PENDING tasks when quota met |
| No stale task recovery | Only Company-level `resetStalledJobs` | Add ScrapeTask-level stale detection |
| Dedup noise | P2002 errors logged as warnings | `skipDuplicates: true` or `ON CONFLICT DO NOTHING` |

> These align directly with **Option 1 (Atomic Counter)** from `docs/architecture-zipcode-brainstorm.md`.

---

## Diagnostic Script

Left at `src/scripts/check-worker-state.ts` for future use. Run with:
```bash
npx tsx src/scripts/check-worker-state.ts
```
