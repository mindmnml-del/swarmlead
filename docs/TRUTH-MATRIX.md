# TRUTH MATRIX: Capability Audit vs. Industry

**Purpose:** Internal reference for the founding team. Every claim below is traced to a specific source file and function. If a claim has no code reference, it is not a real capability — it is aspirational.

**Last audited:** 2026-02-28
**Audited modules:** `googleMapsScraper.ts`, `hybridParser.ts`, `emailVerifier.ts`, `emailGuesser.ts`, `websiteScraper.ts`, `stealthBrowser.ts`

---

## 1. What We Actually Do (And Where It Lives)

### 1a. Real-Time Google Maps Extraction

| Capability | File | Function / Line | Notes |
|---|---|---|---|
| Business name extraction | `src/scraper/googleMapsScraper.ts` | `extractDetails()` L201 | CSS selector `h1.DUwDvf`, fragile obfuscated class |
| Phone number | same | L203-205 | `aria-label` containing `"Phone:"` |
| Website URL | same | L210-211 | `a[data-item-id="authority"]` — relatively stable selector |
| Street address | same | L207-208 | `aria-label` containing `"Address:"` |
| Rating (float) | same | L214-216 | Regex `\d\.\d` — can false-match non-rating decimals |
| Review count (int) | same | L218-219 | Regex `([\d,]+)\s*reviews` — fallback pattern is greedy |
| Infinite scroll collection | same | `collectResultLinks()` L86-179 | Mouse wheel + PageDown, up to 60 scroll attempts |

**Advantage over static DBs (Apollo/ZoomInfo):** Data is as fresh as Google Maps itself. No stale records. A business that opened yesterday can be found today.

**Honest caveat:** All CSS selectors except `data-item-id="authority"` use Google's obfuscated class names (e.g., `a.hfpxzc`, `h1.DUwDvf`). These break without warning when Google deploys frontend updates.

### 1b. Stealth Browser Infrastructure

| Capability | File | Function / Line | Notes |
|---|---|---|---|
| Puppeteer stealth plugin | `src/scraper/stealthBrowser.ts` | L3, L10 | `puppeteer-extra-plugin-stealth` — patches `navigator.webdriver`, `chrome.runtime`, etc. |
| User-agent rotation | same | `getRandomUserAgent()` L22-24 | Pool of 6 static UAs (Chrome 120/121, Firefox 121, Safari 17). Applied per page. |
| Viewport randomization | same | `createPage()` L90-93 | Width 1366-1565, height 768-867 |
| Image/font/media blocking | same | L74-83 | Reduces bandwidth, NOT a stealth measure |
| Proxy support | same | L49-51, L66-71 | `PROXY_SERVER` / `PROXY_USERNAME` / `PROXY_PASSWORD` env vars |
| Human simulation | same | `simulateHuman()` L122-140 | Single random mouse move + half-viewport scroll + delay |

**Honest caveat:** ~~`simulateHuman()` is defined but **never called** from the Google Maps scraping pipeline.~~ (Fixed: now invoked after `search()` and `extractDetails()` navigation.) The UA pool is static and will become stale. The stealth is sufficient for Google Maps at low volume but will not survive Cloudflare/Akamai/DataDome.

### 1c. Website Crawling & Email Extraction

| Capability | File | Function / Line | Notes |
|---|---|---|---|
| Multi-page website crawl | `src/scraper/websiteScraper.ts` | `scrapeEmailsFromWebsite()` L79 | Visits homepage + candidate paths, capped at `maxPages` (default: 3) |
| Contact page discovery | same | `findInternalContactLinks()` L38-74 | Finds `<a>` hrefs containing: contact, about, team, impressum, legal |
| Predefined candidate paths | same | `CONTACT_PAGES` L23-32 | 8 paths: `/contact`, `/contact-us`, `/kontakt`, `/about`, `/about-us`, `/imprint`, `/impressum`, homepage |
| Post-JS DOM capture | same | L146 | `page.content()` returns rendered DOM — works for JS-rendered content |
| Cross-page email dedup | same | L196-207 | Map keyed on email, keeps highest confidence |
| Cross-page people dedup | same | L218-224 | Set keyed on `name.toLowerCase()`, first occurrence wins |

**Honest caveat:** Link discovery runs only on the homepage (L160 condition). `maxPages=3` means most candidate paths are never visited. No `robots.txt` compliance.

### 1d. Hybrid Email Parsing (Regex + LLM)

| Capability | File | Function / Line | Notes |
|---|---|---|---|
| Mailto link extraction | `src/utils/hybridParser.ts` | `extract()` L55-69 | Runs on raw HTML before sanitization |
| Standard email regex | same | `extractWithRegex()` L105-120 | Pattern: `[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+` |
| Obfuscated email parsing | same | `extractObfuscated()` L122-137 | Handles `[at]` / `[dot]` patterns only |
| Email classification | same | `classifyEmail()` L39-45 | Deterministic: 20 generic prefixes (info, admin, sales, etc.) = "generic", everything else = "personal" |
| LLM-based extraction (premium) | same | `extractWithLlm()` L162-200 | `gpt-4o-mini` via Vercel AI SDK `generateObject()` with Zod schema |
| C-Level person extraction | same | L178-186 | LLM prompt asks for Founders, CEOs, Owners. **This is the only mechanism for person extraction.** |
| Placeholder domain filtering | same | `deduplicateAndFilter()` L143-160 | Removes `example.com`, `email.com`, `domain.com` |
| Confidence scoring | same | L63, L42-44, L132 | Mailto=100, personal regex=95, generic regex=70, obfuscated=60, LLM=unvalidated |

**Advantage over pure regex scrapers (Hunter.io):** The LLM can extract founder/CEO names and roles from unstructured text — something regex cannot do at all.

**Honest caveats:**
- The `HYBRID` source enum (L10) is defined but never assigned — dead code.
- LLM confidence scores are unvalidated — the model can return `confidence: 99` for a hallucinated email.
- LLM-extracted emails are NOT cross-validated against the source text.
- Input truncated at 15,000 characters (L167) — info past this cutoff is silently lost.
- Standard email regex misses `+` in local parts, no RFC 5322 compliance.
- Obfuscated regex only handles `[at]`/`[dot]`, not HTML entities, JS-assembled, or `(at)` patterns.

### 1e. Email Pattern Generation

| Capability | File | Function / Line | Notes |
|---|---|---|---|
| Pattern generation from name + domain | `src/utils/emailGuesser.ts` | `generateEmailPatterns()` L1 | Generates 4 patterns per name |
| Patterns: `first@`, `f.last@`, `first.last@`, `flast@` | same | L25-29 | Hardcoded templates |
| Single-name handling | same | L14-18 | Returns 1 pattern: `name@domain` |
| Special char stripping | same | L8 | Regex `/[^\w\s-]/g` — **destroys non-ASCII characters** |
| Deduplication | same | L33 | `Set`-based exact match |

**Honest caveats:**
- Only 4 patterns. Industry standard (Apollo/Hunter) tests 15-30+ patterns.
- Missing common patterns: `last@`, `firstlast@`, `last.first@`, `first_last@`, `firstL@`.
- Middle names silently discarded (L22: takes `parts[0]` and `parts[-1]` only).
- ~~The `\w` regex is ASCII-only in JS — strips accented characters. `Rene` becomes `Ren`, `Muller` becomes `Mller`. This is a data corruption bug.~~ (Fixed: NFD normalization + diacritic stripping now preserves `Rene` → `Rene`, `Muller` → `Muller`.)
- No domain-specific pattern intelligence (unlike Hunter which knows each domain's convention).
- No confidence scoring per pattern.

### 1f. Email Verification

| Capability | File | Function / Line | Notes |
|---|---|---|---|
| Domain format validation | `src/services/emailVerifier.ts` | L36 | `DOMAIN_REGEX` — validates domain portion only |
| DNS MX record lookup | same | L41 | `resolveMx(domain)` via Google DNS (8.8.8.8) + Cloudflare (1.1.1.1) |
| MX provider detection | same | `getProvider()` L14-22 | Substring match: Google, Outlook, Zoho, ProtonMail, AWS SES, Other |
| Anti-ban delay support | caller responsibility | — | Not built into verifier; callers add 1500ms delay between calls |

**~~CRITICAL BUG — Lines 49-51~~ (FIXED):**

Previously, the catch block returned `VALID` for all DNS failures including `ENOTFOUND`. Now:
- `ENOTFOUND` / `ENODATA` / `ESERVFAIL` → returns `INVALID` with descriptive error
- Transient errors (`ETIMEOUT`, `ECONNREFUSED`) → returns `UNKNOWN` (confidence: 20)
- Catch-all domains (MX exists for garbage local part) → returns `CATCH_ALL` (confidence: 40)
- Legitimate MX resolution → returns `VALID` (confidence: 90)

**What "VALID" now means in our system:**
> The domain passed regex validation, has MX records, AND is not a catch-all domain.

**Remaining gap:** "VALID" still does not mean the specific mailbox exists (no SMTP RCPT TO check). It is domain-level + catch-all-filtered plausibility, not mailbox verification.

---

## 2. Our Hard Limitations

### 2a. Speed Constraints

| Operation | Time | Bottleneck | Competitor Equivalent |
|---|---|---|---|
| Puppeteer browser launch | 1-3 sec | Chromium process startup | Apollo: 0ms (API call to pre-built DB) |
| Google Maps scroll + collect links | 30-90 sec | Up to 60 scroll iterations at 1200ms each | Apollo: 0ms (indexed) |
| Per-business detail extraction | 3-5 sec | Full page navigation + DOM parse | Apollo: included in single API call |
| Website crawl (3 pages) | 10-30 sec | 3 navigations + JS rendering | Hunter: <1 sec (pre-crawled index) |
| LLM call per page (premium) | 0.5-3 sec | OpenAI API latency | N/A (unique to our system) |
| Email pattern generation | <1 ms | Pure computation | Hunter: <1 ms (same) |
| MX verification per email | 0.5-2 sec | DNS resolution + 1.5s anti-ban delay | ZeroBounce: bulk API, ~0.1s per email |
| **Total: 100 leads, premium** | **~30-60 min** | Serial execution across all stages | **Apollo: seconds** |

**Bottom line:** We are 100-1000x slower than static database providers. Our advantage is freshness, not speed. At scale (thousands of leads), this is hours or days of runtime.

### 2b. C-Level Extraction Dependencies

The pipeline for finding a CEO/Founder email requires ALL of these to succeed:

```
Google Maps has the business
        AND
Website URL is present on the listing
        AND
Website is accessible (no Cloudflare/auth/downtime)
        AND
Contact/About/Team page is within 3 hops of homepage
        AND
The founder's name is visible in rendered text (not an image, not behind JS interaction)
        AND
The name appears within the first 15,000 characters of sanitized text
        AND
The LLM correctly extracts the name (no hallucination)
        AND
Our 4 email patterns include the domain's actual convention
        AND
The domain has MX records (and DNS doesn't error out)
```

**If any single step fails, the pipeline returns nothing for that lead.** There is no fallback data source, no LinkedIn integration, no database lookup.

### 2c. Data Gaps vs. Competitors

| Data Point | Our System | Apollo | ZoomInfo | Hunter |
|---|---|---|---|---|
| Business name | Yes (Google Maps) | Yes | Yes | No |
| Phone | Yes (Google Maps) | Yes | Yes | No |
| Address | Yes (Google Maps) | Yes | Yes | No |
| Website | Yes (Google Maps) | Yes | Yes | Yes |
| Rating / Reviews | Yes (Google Maps) | No | No | No |
| Business email | Regex + LLM from website | Database | Database | Database + scrape |
| Personal email | Pattern guess + MX check | Verified database | Verified database | Pattern + SMTP verify |
| Contact name | LLM extraction (premium only) | Database | Database | Database |
| Job title | LLM extraction (limited) | Database | Database | No |
| LinkedIn profile | **No** | Yes | Yes | Yes |
| Company size | **No** | Yes | Yes | No |
| Revenue | **No** | Yes | Yes | No |
| Tech stack | **No** | Yes | Yes | No |
| Org chart | **No** | Yes | Yes | No |
| Phone direct dial | **No** | Yes | Yes | No |
| Intent data | **No** | Yes | Yes | No |
| SMTP-verified email | **No** (MX only) | Yes | Yes | Yes |

### 2d. Reliability Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Google obfuscated CSS class rotation | High (quarterly) | Scraper returns empty data | Manual selector updates |
| Google CAPTCHA on Maps | Medium-High | Complete scraper failure | None built in |
| IP ban from Google | Medium (volume dependent) | Scraper blocked | Proxy rotation (manual config) |
| OpenAI API outage / rate limit | Low-Medium | Premium extraction fails silently | Regex fallback still works |
| LLM hallucinated email | Medium | False email delivered to customer | No cross-validation exists |
| Target site behind Cloudflare | Medium | Website crawl returns nothing | None built in |
| Non-ASCII name corruption | High (non-US markets) | Wrong email patterns generated | Bug in emailGuesser.ts L8 |

---

## 3. Sales Boundaries

### 3a. What We CAN Promise

| Claim | Evidence | Phrasing Guide |
|---|---|---|
| "Real-time business data from Google Maps" | `googleMapsScraper.ts` scrapes live Google Maps DOM | Safe to say. Emphasize freshness vs. stale databases. |
| "AI-powered contact extraction" | `hybridParser.ts` L162-200 uses `gpt-4o-mini` for name/role extraction | Safe for premium tier only. Specify it requires a discoverable name on the website. |
| "Multi-source email finding: mailto, regex, and obfuscated patterns" | `hybridParser.ts` L55 (mailto), L105 (regex), L122 (obfuscated) | Safe to say. Three extraction methods is factual. |
| "Email classification: personal vs. generic" | `hybridParser.ts` `classifyEmail()` L39-45, 20 known generic prefixes | Safe to say. The classification is deterministic and based on a defined prefix list. |
| "MX record verification with provider identification" | `emailVerifier.ts` L41 (MX lookup), `getProvider()` L14-22 | Safe to say, but MUST NOT call it "email verification" — it is domain verification. See below. |
| "Stealth browsing with anti-detection" | `stealthBrowser.ts` uses `puppeteer-extra-plugin-stealth` | Safe to say at a general level. Do not promise it defeats all bot detection. |
| "Google Maps ratings and review data" | `googleMapsScraper.ts` L214-219 | Safe to say. We extract this; Apollo/ZoomInfo do not. |
| "Catch-all domain detection" | `emailVerifier.ts` `isCatchAllDomain()` probes a randomized mailbox (`verify_catchall_<hex>@domain`) via MX lookup. If the garbage address resolves, the domain is flagged `CATCH_ALL` with confidence 40. | Safe to claim. We actively filter out catch-all domains that competitors sell as valid. Specify it is MX-level detection, not SMTP RCPT TO. |
| "International name support for email pattern generation" | `emailGuesser.ts` applies `name.normalize('NFD')` + diacritic stripping (`/[\u0300-\u036f]/g`) + non-ASCII removal before generating patterns. | Safe to claim for Western, European, and Latin-based international names (e.g., Rene, Muller, Gonzalez). Not safe for CJK, Arabic, or Cyrillic names. |

### 3b. What We MUST NEVER Promise

| Forbidden Claim | Why | Reality |
|---|---|---|
| "Verified email addresses" | Our verifier checks DNS MX records, not mailbox existence. There is no SMTP `RCPT TO` check. | We verify the domain can receive mail. We do NOT verify the specific mailbox exists. Bounce rates from our "VALID" emails will be 20-40%+. |
| "100% accurate contact data" | LLM hallucination risk, regex false matches, CSS selector fragility | Every stage has a failure mode. Accuracy is best-effort, not guaranteed. |
| "Database of X million contacts" | We have no static database. Every data point is scraped live. | We are a real-time scraper, not a data provider. We cannot quote a database size. |
| "Faster than Apollo/ZoomInfo" | We are 100-1000x slower due to live scraping. | We are fresher, not faster. These are different value propositions. |
| "GDPR/CCPA compliant" | We scrape public websites without consent mechanisms. We do not comply with `robots.txt`. Google Maps scraping violates their ToS. | Legal review required before making any compliance claims. |
| "Works for any business" | Requires Google Maps listing, accessible website, discoverable name on the site. | Works for businesses with public web presence and standard website structures. |
| "Enterprise-grade reliability" | No retry logic, no CAPTCHA handling, CSS selectors break on Google updates, silent error swallowing. | Best suited for SMB/startup use cases at low-to-moderate volume. |
| "LinkedIn integration" | We have no LinkedIn scraping or API integration. | Do not mention LinkedIn in any context. |
| "SMTP email verification" | We perform DNS MX lookup only. Zero SMTP connections are made. | Never use the word "SMTP" in marketing materials. |
| "Works globally for ALL name formats" | NFD normalization handles Latin-based names, but CJK/Arabic/Cyrillic names are dropped entirely during transliteration. | Safe for Western/European. Do NOT claim global coverage — qualify as "Latin-script names". |

### 3c. Recommended Positioning

**What we are:**
> A real-time local business intelligence tool that extracts fresh contact data directly from Google Maps and company websites, using AI to identify decision-makers and their likely email addresses.

**What we are not:**
> Not a verified contact database. Not an email verification service. Not a competitor to Apollo/ZoomInfo's breadth of data. Not suitable for high-volume enterprise cold email without additional verification.

**Differentiation that is real and defensible:**
1. **Freshness** — live scraping vs. months-old database snapshots.
2. **Google Maps data** — ratings, reviews, phone, address in one pipeline. Apollo doesn't provide Google ratings.
3. **AI person extraction** — LLM identifies founders/CEOs from unstructured website text. Regex scrapers cannot do this.
4. **No per-seat pricing or credit limits** — our cost is compute, not seats.

**Differentiation that is NOT defensible:**
1. "Better email data" — we cannot out-verify Apollo's SMTP-checked database with MX-only lookups.
2. "More contacts" — we have zero stored contacts. Every query starts from scratch.
3. "Enterprise scale" — serial Puppeteer scraping cannot compete with API-served databases on throughput.

---

## 4. Known Bugs to Fix Before Any Sales Claim

| Bug | File | Line | Severity | Impact | Status |
|---|---|---|---|---|---|
| ~~DNS catch-all returns VALID~~ | `emailVerifier.ts` | ~~L49-51~~ | ~~**Critical**~~ | ~~Nonexistent domains marked as valid~~ | **FIXED** — DNS errors now distinguished (`ENOTFOUND`→INVALID, timeout→UNKNOWN); catch-all domains return `CATCH_ALL` with confidence 40 |
| ~~Non-ASCII name corruption~~ | `emailGuesser.ts` | ~~L8~~ | ~~High~~ | ~~International names produce garbage patterns~~ | **FIXED** — NFD normalization + diacritic stripping + non-ASCII removal before pattern generation |
| ~~`simulateHuman()` never called in scraping pipeline~~ | `stealthBrowser.ts` / `googleMapsScraper.ts` | ~~L122-140~~ | ~~Medium~~ | ~~Anti-detection weaker than intended~~ | **FIXED** — `simulateHuman()` now called after `search()` and `extractDetails()` navigation in Google Maps scraper |
| LLM confidence scores unvalidated | `hybridParser.ts` | L9 | Medium | Hallucinated emails can overwrite real ones in dedup | Open |
| ~~Rating regex false matches~~ | `googleMapsScraper.ts` | ~~L216~~ | ~~Low~~ | ~~`\d\.\d` matches any decimal, not just ratings~~ | **FIXED** — Replaced innerText regex with deterministic `aria-label` DOM selectors (same pattern as Phone/Address extraction). Returns `null` when no structured element found. |
| `HYBRID` source enum never assigned | `hybridParser.ts` | L10 | Low | Dead code, no functional impact | Open |
