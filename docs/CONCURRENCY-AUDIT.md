# Concurrency Audit — `processJob` Pipeline

> **Date:** 2026-02-25  
> **Auditors:** `@backend-specialist`, `@performance-optimizer`  
> **Scope:** `src/services/scraperService.ts` → `processJob()` loop  
> **Objective:** Evaluate if concurrency can be safely added to the lead-processing loop without compromising system stability, stealth, or data integrity.

---

## 1. Current Architecture Summary

```
processJob(taskId)
  └─ Launch 1× StealthBrowser (Chromium)
     └─ GoogleMapsScraper.init(sharedBrowser)
        └─ search(query) → collectResultLinks(N)
           └─ FOR EACH link (sequential):
              ├─ extractDetails(link)        ← Puppeteer page navigation
              ├─ createCompanyIfNotExists()   ← Prisma findFirst + create
              ├─ scrapeEmailsFromWebsite()    ← opens new page, crawls ≤3 URLs
              ├─ verifyEmail() × N            ← DNS MX lookup (Promise.all)
              ├─ updateCompanyEmails()        ← Prisma update + createMany
              └─ company.update(COMPLETED)
```

**Observed timing:** ~30 min for 100 leads ≈ **~18 s/lead** (dominated by `simulateHuman` delays + page navigation + email deep-crawl).

---

## 2. Risk Analysis — Failure Points

### 2.1 🧠 RAM / Chromium Instability

| Factor                    | Current                                          | Risk if Concurrent                          |
| ------------------------- | ------------------------------------------------ | ------------------------------------------- |
| Open Chromium pages       | 1 at a time (maps) + 1 (email crawl) = **2 max** | N leads × 2 pages = **potential 20+ pages** |
| RAM per Chromium tab      | ~50–80 MB (images/fonts blocked)                 | 20 pages → **1–1.6 GB additional RAM**      |
| `--disable-dev-shm-usage` | ✅ Set                                           | Helps, but not enough for 20+ tabs          |
| Browser rotation          | Worker rotates every 50 jobs                     | `processJob` has **no rotation logic**      |

> [!CAUTION]
> **Verdict:** Opening >4 concurrent Chromium pages on a single browser instance is the #1 crash vector. Puppeteer's `newPage()` is not designed for high fan-out from a single `Browser` instance. Expect `Page crashed!` errors, zombie processes, and OOM kills.

### 2.2 🛡️ Google Maps Bot Detection / Rate Limiting

| Factor                          | Current                     | Risk if Concurrent                                                          |
| ------------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| `simulateHuman()` delay         | 1–3 s per page              | Concurrent pages bypass the delay's purpose                                 |
| Request rate to maps.google.com | ~1 req / 3–5 s (sequential) | N concurrent = N reqs in <1 s → **burst detected**                          |
| IP fingerprint                  | Single IP (or single proxy) | Burst from same IP = **CAPTCHA / soft-ban**                                 |
| User-Agent rotation             | Per page session            | Same browser → shared TLS fingerprint anyway                                |
| `StealthPlugin` effectiveness   | Good for sequential         | **Degrades with parallel page opens** — Google correlates tab open patterns |

> [!CAUTION]
> **Verdict:** Naïve `Promise.all` on `extractDetails` would produce burst traffic to Google Maps, defeating stealth measures. Google's anti-bot system correlates request timing across tabs from the same IP. Risk: **CAPTCHA walls, temporary IP ban (429), or permanent block.**

### 2.3 🗄️ Prisma Database Race Conditions

| Factor                                       | Current                                 | Risk if Concurrent                                                                |
| -------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------- |
| Duplicate check                              | `findFirst` → `create` (**NOT atomic**) | Two leads with same name+address processed simultaneously → **duplicate inserts** |
| `prisma.company.count()` quota check         | Sequential = accurate                   | Concurrent reads get **stale counts** → over-quota inserts                        |
| Connection pool                              | Prisma default = **5 connections**      | 10+ concurrent DB operations → **connection exhaustion + P2002 errors**           |
| `updateCompanyEmails` + `contact.createMany` | Sequential = safe                       | Concurrent writes to same company → **race on `emails[]` array**                  |

> [!WARNING]
> **Verdict:** The `findFirst → create` pattern in `createCompanyIfNotExists` is a textbook TOCTOU (Time-Of-Check-To-Time-Of-Use) race. Under concurrency, duplicate companies **will** be created. The quota check (`company.count`) will also report stale values.

### 2.4 🌐 DNS Resolver Contention

| Factor                        | Current                                          | Risk if Concurrent                             |
| ----------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| `verifyEmail`                 | Already uses `Promise.all` internally (per lead) | Low risk — DNS lookups are lightweight         |
| Public DNS (8.8.8.8, 1.1.1.1) | Rate limits are generous (>1000 QPS)             | **No significant risk** even under concurrency |

> **Verdict:** ✅ Email verification is the **safest** candidate for parallelization. Already done correctly.

---

## 3. Bottleneck Breakdown

Where does the ~18 s/lead actually go?

| Phase                                 | Est. Time  | % of Total | Parallelizable?          |
| ------------------------------------- | ---------- | ---------- | ------------------------ |
| `extractDetails` (Maps page nav)      | ~3–5 s     | 22%        | ⚠️ Risky (bot detection) |
| `simulateHuman` in extractDetails     | ~1–3 s     | 14%        | ❌ Must keep for stealth |
| `scrapeEmailsFromWebsite` (3 pages)   | ~6–10 s    | 44%        | ⚠️ RAM-limited           |
| `verifyEmail` (DNS)                   | ~0.5–1 s   | 5%         | ✅ Already parallel      |
| DB operations (create, update, count) | ~0.3–0.5 s | 3%         | ⚠️ Race conditions       |
| Overhead (serialization, logging)     | ~1–2 s     | 12%        | ✅ Negligible            |

> **Key insight:** The biggest win is in the **email deep-crawl** phase (44%), not the Maps extraction.

---

## 4. Three Safe Optimization Strategies

### Strategy A: Strict Chunked Queue with `p-queue` ⭐ RECOMMENDED

**Concept:** Process leads in small, controlled batches (concurrency = 2–3) with a queue library that enforces limits.

```
npm install p-queue
```

```
Lead 1 ─┐
Lead 2 ─┤ ← Batch 1 (concurrency: 2)
         │
Lead 3 ─┐
Lead 4 ─┤ ← Batch 2 (concurrency: 2)
         │ ...
```

**Implementation sketch:**

- Use `p-queue` with `concurrency: 2`, `intervalCap: 2`, `interval: 5000` (max 2 tasks per 5 s)
- Each queue task: `extractDetails` → `createCompany` → `scrapeEmails` → `verifyEmail`
- **Shared browser, but each task gets its own page** (via `createPage()` / `closePage()`)
- Add `await page.close()` in a `finally` block to prevent leaks

**Risk mitigations:**
| Risk | Mitigation |
|------|-----------|
| RAM | Hard cap at 2 concurrent = max 4 pages (2 maps + 2 email) |
| Bot detection | `interval: 5000` enforces minimum 2.5 s between new Maps requests |
| DB races | Wrap `findFirst` + `create` in `prisma.$transaction` with isolation |
| Quota accuracy | Use `$transaction` for atomic count-and-insert |

**Expected speedup:** ~1.6–1.8× (30 min → ~17–19 min) with near-zero stability risk.

**Stability:** ★★★★★ (5/5)  
**Speed gain:** ★★★☆☆ (3/5)

---

### Strategy B: Decouple Email Crawl to Post-Processing Worker

**Concept:** Remove the email deep-crawl from the `processJob` loop entirely. Let the _existing worker_ (`worker.ts`) handle it asynchronously after Maps extraction completes.

```
processJob:    Maps extract → createCompany(status: PENDING) → DONE (fast)
worker.ts:     Poll PENDING companies → scrapeEmails → verifyEmail → COMPLETED
```

**Current state:** The worker already does exactly this for companies with `emailScraped: false`. The only change needed is to **remove the inline email extraction from processJob** and let the worker pick it up.

**Risk mitigations:**
| Risk | Mitigation |
|------|-----------|
| RAM | Zero — processJob uses only 1 page for Maps, worker uses 1 page for emails |
| Bot detection | Maps requests stay sequential, email crawl is to different domains (no Google risk) |
| DB races | None — worker uses `SKIP LOCKED` atomic job claim |
| Complexity | **Minimal code change** — delete ~30 lines from processJob |

**Expected speedup:** ~2× (30 min → ~14–16 min for Maps-only, emails finish in background).

**Stability:** ★★★★★ (5/5)  
**Speed gain:** ★★★★☆ (4/5)

---

### Strategy C: Reduce `simulateHuman` Delays Safely

**Concept:** The current `simulateHuman` uses 1–3 s random delays. These may be over-conservative for detail page extractions (which are navigations to individual business pages, not search result scrolling).

**Proposed tuning:**

- **Search results page:** Keep 1–3 s delay (high detection risk)
- **Detail page extractions:** Reduce to 0.5–1.5 s (lower risk — organic users click through quickly)
- **Email crawl pages (external sites):** Reduce to 0.3–1 s (not Google, no bot detection concern)

**Risk mitigations:**
| Risk | Mitigation |
|------|-----------|
| Bot detection | Only reduce delays on low-risk pages (detail + external) |
| Behavioral analysis | Add random jitter via `Math.random() * 700 + 300` |

**Expected speedup:** ~1.3× (30 min → ~23 min) — modest but zero-risk.

**Stability:** ★★★★★ (5/5)  
**Speed gain:** ★★☆☆☆ (2/5)

---

## 5. Final Recommendation

> [!IMPORTANT]
>
> ### Implement Strategy B first, then layer Strategy C on top.

**Rationale:**

| Criteria        | Strategy A (p-queue)                 | Strategy B (Decouple)                        | Strategy C (Delays)            |
| --------------- | ------------------------------------ | -------------------------------------------- | ------------------------------ |
| Code complexity | Medium (new dependency, queue logic) | **Low** (remove code, worker already exists) | **Trivial** (change constants) |
| Stability risk  | Low (but not zero — shared browser)  | **Zero** (already proven in production)      | **Zero**                       |
| Speed gain      | 1.6–1.8×                             | **~2×**                                      | 1.3×                           |
| Reversibility   | Medium                               | **Easy** (re-add email block)                | **Easy**                       |

**Combined B + C projected time:** 100 leads in **~11–13 minutes** (from 30 min) — a **~2.5× improvement** with **zero new dependencies** and **zero stability risk**.

Strategy A (`p-queue`) should be reserved for a future phase when you need >3× throughput and are willing to invest in:

1. Atomic `prisma.$transaction` for duplicate checks
2. Per-lead page lifecycle management
3. A monitoring dashboard for concurrent page count

---

## 6. Pre-Implementation Checklist

Before writing any code, address these prerequisites:

- [ ] **Prisma connection pool:** Increase from default 5 → 10 in `DATABASE_URL` (`?connection_limit=10`)
- [ ] **Atomic dedup:** Wrap `createCompanyIfNotExists` in `prisma.$transaction` regardless of strategy choice
- [ ] **Memory monitoring:** Add `process.memoryUsage().heapUsed` logging to worker rotation logic
- [ ] **Browser page tracking:** `StealthBrowser.pages.length` should be logged per-job for leak detection
- [ ] **Test on small batch:** Run Strategy B on a 10-lead job and compare worker pickup latency

---

_No application code was modified during this audit._
