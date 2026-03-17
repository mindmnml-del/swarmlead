# I built an AI-powered lead intelligence tool that finds founder emails Apollo and ZoomInfo completely miss — here's how

**TL;DR:** I got tired of buying "verified" B2B lead lists that bounced at 30%+. So I built my own pipeline that collects data from Google Maps in real-time, crawls company websites, and uses GPT-4o-mini to infer founder/CEO emails. Latest run: **100% MX-verified domains, 96.8% hit rate on C-Level contacts.** Sharing the full technical breakdown below.

---

## The problem nobody talks about

If you've ever bought a lead list from Apollo, ZoomInfo, or any of the usual suspects for **local/SMB niches** — MedSpas, HVAC companies, dental clinics — you already know the pain:

- **Stale data.** These platforms snapshot their databases every few months. By the time you download your CSV, 20-40% of the emails are dead.
- **Generic inboxes only.** You get `info@`, `contact@`, `admin@` — the black hole where cold emails go to die. Good luck reaching the actual owner.
- **Terrible coverage for local businesses.** A solo MedSpa owner in Scottsdale? A plumber in rural Ohio? Apollo literally doesn't know they exist.
- **Bounce rates that kill your domain.** Send 1,000 emails from a list with 30% bounces and watch your deliverability score crater. Now you've burned a warmed domain.

I was running outbound for a niche marketing agency and kept hitting this wall. The data vendors optimize for enterprise SaaS companies, not the local plumber with 12 Google reviews.

So I started building.

---

## What I actually built

**Swarm Lead Intelligence** — a real-time pipeline that does three things no static database can:

### 1. Zip Code Grid Architecture (bypassing Google Maps limits)

Google Maps caps search results at ~120 businesses per query. If you search "medspa" for all of California, you get 120 results out of 3,000+.

My workaround: **break the entire US into a zip code grid.** Every search runs against a single zip code, so you never hit the cap. For MedSpas alone, this surfaces **35,000+ businesses** that Apollo has maybe 8,000 of.

The collector uses Puppeteer with stealth plugins (UA rotation, viewport randomization, human-like mouse movements) to scroll through Maps results without getting flagged.

### 2. Hybrid AI Parser (Regex + GPT-4o-mini)

Finding a business on Google Maps is step one. Finding the **owner's actual email** is the hard part.

The pipeline does this in layers:

- **Layer 1 — Regex extraction.** Crawls the company website (homepage + contact/about/team pages) and pulls every `mailto:` link and email pattern it finds. Fast, cheap, catches ~60% of discoverable emails.
- **Layer 2 — Obfuscation handling.** Catches emails hidden behind `[at]` / `[dot]` patterns that basic regex misses.
- **Layer 3 — LLM inference (the interesting part).** For premium jobs, GPT-4o-mini reads the rendered page text and extracts **names and roles** — Founders, CEOs, Owners. Then the system generates email pattern guesses (`first@domain`, `first.last@domain`, etc.) and MX-verifies each one.

This is the part that makes it different from Hunter.io or any regex-only extractor. **A regex can find `john@company.com` on a page, but it can't read "Founded by John Smith" in an About section and infer his email.** The LLM can.

Every extracted email gets a confidence score (0-100) based on how it was found:
- `mailto:` link on the page → 100
- Personal email via regex → 95
- LLM-inferred + MX-verified → 90
- Generic inbox (`info@`) → 70

### 3. Live MX verification with catch-all filtering

This is where the data quality moat lives.

Every single email domain gets a **live DNS MX lookup** before it enters the database. No MX records? Marked INVALID. Never reaches the customer.

But here's the thing most people miss: **catch-all domains are a trap.** A catch-all domain accepts mail to *any* address — `gibberish123@domain.com` would "verify" as valid. Apollo and ZoomInfo don't filter these. We do.

The system probes each domain with a randomized garbage address. If it resolves, the domain is flagged as `CATCH_ALL` with a lowered confidence score. This single check eliminates a huge source of false positives.

---

## The results

Ran a full pipeline test last week on a MedSpa niche job. Here's the audit:

| Metric | Result |
|--------|--------|
| **Quality Score** | 80.0 |
| **MX Domain Validity** | 100% — every email domain has live mail servers |
| **C-Level Inference Hit Rate** | 96.8% — founder/CEO email found for nearly every business with a website |
| **Verification Rate** | 96.2% marked VALID |
| **Bounce rate (projected)** | <5% based on MX + catch-all filtering |

For context, the industry average bounce rate on Apollo lists for local niches is 25-40%.

---

## What I'm NOT claiming

Being transparent because I've seen too many "data companies" oversell:

- **This is NOT SMTP mailbox verification.** We verify the domain can receive mail (MX check). We don't verify the specific mailbox exists. It's domain-level plausibility, not ZeroBounce-level confirmation.
- **We're slow.** 100 leads with full premium extraction takes 30-60 minutes. Apollo serves that in seconds. Our advantage is **freshness**, not speed. A business that opened yesterday shows up today.
- **CSS selectors break.** Google Maps uses obfuscated class names that change without warning. When they rotate, I'm manually updating selectors. This isn't enterprise-grade infra — it's a focused pipeline that works really well for the niches it targets.
- **LLMs can hallucinate.** The AI extraction has guardrails (confidence scoring, MX verification as a sanity check), but it's not perfect. We score and flag uncertainty rather than hiding it.

I'd rather under-promise and let the data speak.

---

## The data quality moat (vs. Apollo/ZoomInfo)

| Feature | Us | Apollo / ZoomInfo |
|---------|-----|-------------------|
| AI Confidence Score (0-100) per email | Yes | Not exposed |
| Live MX Verification at export | Yes | Static snapshot |
| Catch-All Domain Filtering | Yes | No — you get false positives |
| Google Maps ratings & reviews | Yes | No |
| Email source transparency (REGEX / LLM) | Yes | Black box |
| Data freshness (collected today) | Yes | Weeks/months old |
| Hyper-local niche coverage | Yes | Incomplete for SMBs |

---

## What's next

Right now I'm focused on three niches: **MedSpas, HVAC/Home Services, and Dental Clinics.** These are markets where the data gap between what Apollo offers and what actually exists on Google Maps is massive.

The unit economics are solid — COGS is ~$2.50 per 1,000 leads (proxy + compute + LLM costs). Gross margin is north of 96%.

I'm packaging this as tiered CSV exports through Gumroad and direct outreach to marketing agencies who run cold email for these niches.

---

## Want to test it? Free 50-lead sample.

If you're working in a specific micro-niche and want to see what this pipeline can pull, **drop your niche in the comments** (e.g., "MedSpas in Texas", "HVAC in Florida", "Dental clinics in Chicago").

I'll run a custom extraction and send you a **free 50-lead CSV** with:
- Business name, phone, website, address
- Google rating & review count
- Verified founder/owner email (when discoverable)
- AI confidence score per contact
- MX verification status

No strings, no pitch. Just data. If the quality speaks for itself, we can talk.

---

*Built solo over the past few months. Stack: Node.js + TypeScript, Puppeteer Stealth, GPT-4o-mini via Vercel AI SDK, Prisma + PostgreSQL, Next.js dashboard. Happy to answer technical questions in the comments.*
