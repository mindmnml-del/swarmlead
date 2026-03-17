# Go-To-Market Plan: Premium B2B Lead Lists

> **Product:** AI-Enriched Local Business Lead CSVs  
> **Channels:** Gumroad, Whop, Direct Outreach  
> **Date:** February 2026

---

## 1. Target Niches (Top 3)

Niches selected for: data availability on Google Maps, buyer willingness-to-pay for cold email data, low coverage on Apollo/ZoomInfo, and high agency demand.

### Niche A: MedSpas & Aesthetic Clinics

| Factor                | Detail                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why**               | Explosive growth industry ($18B+ market). Owners invest heavily in marketing but are poorly indexed by enterprise data vendors. High LTV clients = agencies love selling to them. |
| **Google Maps Query** | `"medspa"`, `"aesthetics clinic"`, `"botox near me"`, `"laser hair removal"`                                                                                                      |
| **Buyer Persona**     | Marketing agencies selling SEO, Google Ads, and reputation management to MedSpas                                                                                                  |
| **Pain Point Data**   | Businesses with < 4.0 rating = easy pitch for reputation management                                                                                                               |
| **US Coverage**       | ~35,000+ locations across all major metros                                                                                                                                        |

### Niche B: HVAC, Plumbing & Electrical (Home Services)

| Factor                | Detail                                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why**               | Massive fragmented market (500K+ businesses). Most are 1-10 employee shops with zero marketing sophistication. Cold email converts extremely well because owners are busy and need help. |
| **Google Maps Query** | `"hvac"`, `"plumber"`, `"electrician"`, `"air conditioning repair"`                                                                                                                      |
| **Buyer Persona**     | Cold email agencies, SaaS tools (ServiceTitan, Housecall Pro), and marketing agencies                                                                                                    |
| **Pain Point Data**   | No website detected = pitch for web design; few reviews = pitch for review generation                                                                                                    |
| **US Coverage**       | 500,000+ locations, every zip code                                                                                                                                                       |

### Niche C: Dental Clinics & Orthodontists

| Factor                | Detail                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why**               | Dentists spend $20K-50K/year on marketing. Highly competitive local market = hungry for leads and reputation tools. Well-structured Google Maps presence makes data extraction accurate. |
| **Google Maps Query** | `"dentist"`, `"dental clinic"`, `"orthodontist"`, `"cosmetic dentistry"`                                                                                                          |
| **Buyer Persona**     | Dental marketing agencies, patient scheduling SaaS, and insurance brokers                                                                                                         |
| **Pain Point Data**   | Low review count = pitch for patient engagement; no website = pitch for web presence                                                                                              |
| **US Coverage**       | ~200,000+ locations                                                                                                                                                               |

### Niche Comparison

| Niche             | Market Size | Avg. Deal Value (for buyer)  | Data Scarcity on Apollo | Collection Difficulty |
| ----------------- | ----------- | ---------------------------- | ----------------------- | ----------------- |
| **MedSpas**       | ★★★★☆       | ★★★★★ ($3K-10K/mo retainers) | ★★★★★ (very scarce)     | Easy              |
| **Home Services** | ★★★★★       | ★★★☆☆ ($500-2K/mo)           | ★★★★☆                   | Easy              |
| **Dental**        | ★★★★☆       | ★★★★☆ ($2K-5K/mo retainers)  | ★★★☆☆                   | Easy              |

---

## 2. Premium CSV Schema

Map our existing database fields to what buyers expect. All columns below are **already captured** by the extraction pipeline unless marked with 🆕.

| #   | Column Name           | Source                       | Notes                            |
| --- | --------------------- | ---------------------------- | -------------------------------- |
| 1   | `company_name`        | `Company.name`               | Business name from Google Maps   |
| 2   | `phone`               | `Company.phone`              | Primary business phone           |
| 3   | `website`             | `Company.website`            | Business website URL             |
| 4   | `address`             | `Company.address`            | Full street address              |
| 5   | `google_rating`       | `Company.rating`             | Star rating (1.0-5.0)            |
| 6   | `review_count`        | `Company.reviewCount`        | Total Google reviews             |
| 7   | `email_1`             | `Contact.workEmail`          | Primary verified email           |
| 8   | `email_2`             | `Contact.workEmail`          | Secondary email (if found)       |
| 9   | `email_type`          | `Contact.emailType`          | `personal` or `generic`          |
| 10  | `email_confidence`    | `Contact.confidenceScore`    | AI confidence score (0-100)      |
| 11  | `email_source`        | `Contact.emailSource`        | `REGEX`, `LLM`, or `HYBRID`      |
| 12  | `verification_status` | `Contact.verificationStatus` | `VALID`, `INVALID`, `UNKNOWN`    |
| 13  | `niche`               | `ScrapeJob.query`            | 🆕 Derived from the search query |
| 14  | `state`               | `Company.address`            | 🆕 Parsed from address string    |
| 15  | `zip_code`            | `ScrapeTask.zipCode`         | Zip code of the collection       |
| 16  | `collected_date`      | `Company.emailScrapedAt`     | Data freshness timestamp         |

> **Key Differentiator:** Columns 9-12 (AI Confidence, Email Type, Source, Verification) do not exist in Apollo/ZoomInfo exports. This is our unique value proposition — **AI-enriched data**.

---

## 3. Tiered Pricing Strategy

Based on market research: Apollo charges ~$0.05/email credit, ZoomInfo ~$3+/lead, and Gumroad data sellers price niche CSVs at $27-97 per list.

### Tier Structure

| Tier | Name                | What's Included                                                         | Price    | Per-Lead Cost |
| ---- | ------------------- | ----------------------------------------------------------------------- | -------- | ------------- |
| 🥉   | **Starter Pack**    | 500 leads, 1 niche, 1 state, basic columns (1-6 only, no emails)        | **$27**  | $0.054        |
| 🥈   | **Growth Pack**     | 1,000 leads, 1 niche, nationwide, full schema + emails                  | **$67**  | $0.067        |
| 🥇   | **Agency Pack**     | 5,000 leads, 1 niche, nationwide, full schema + emails + weekly refresh | **$197** | $0.039        |
| 💎   | **Unlimited Niche** | 10,000+ leads, ALL niches, nationwide, full schema + priority refresh   | **$497** | $0.050        |

### Subscription Add-On (Recurring Revenue)

| Plan                | Frequency | Fresh Leads/Month               | Price       |
| ------------------- | --------- | ------------------------------- | ----------- |
| **Monthly Drip**    | Monthly   | 1,000 new leads                 | **$97/mo**  |
| **Agency Retainer** | Monthly   | 5,000 new leads + custom niches | **$297/mo** |

### Pricing Rationale

- **Starter at $27** — Impulse buy price point. Zero friction. Captures email for upsell.
- **Growth at $67** — Sweet spot for solo agency owners testing a niche.
- **Agency at $197** — Covers the typical cold email agency that needs volume + freshness.
- **Unlimited at $497** — Enterprise play for multi-niche agencies. Our COGS is near-zero at this scale.

---

## 4. Sales Channel Strategy

| Channel                              | Action                                                                                                                     | Timeline |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Gumroad**                          | List Starter + Growth packs as digital products. SEO-optimize titles (e.g., "500 MedSpa Leads with Verified Emails - USA") | Week 1   |
| **Whop**                             | List Agency + Unlimited packs as membership products with monthly drip access                                              | Week 1   |
| **Cold Email** (eat our own dogfood) | Use our own data to email marketing agencies offering a free sample of 50 leads                                            | Week 2   |
| **Twitter/X**                        | Post data quality screenshots, email confidence breakdowns, niche previews                                                 | Ongoing  |
| **Reddit**                           | r/coldoutreach, r/Emailmarketing, r/Entrepreneur — value posts with CTA                                                    | Ongoing  |

---

## 5. Launch Checklist

- [ ] Run full US data collection for **MedSpas** (all zip codes) — ~35K leads
- [ ] Run full US data collection for **HVAC** (top 50 metros first) — ~25K leads
- [ ] Run full US data collection for **Dental** (all zip codes) — ~40K leads
- [ ] Build CSV export script (query DB → format per schema above → output `.csv`)
- [ ] Create Gumroad product pages (3 niches × 4 tiers = 12 listings)
- [ ] Create Whop membership page (Agency + Unlimited tiers)
- [ ] Write 3 cold email templates targeting marketing agencies
- [ ] Prepare free 50-lead sample CSVs for each niche (lead magnet)
- [ ] Launch and post on Twitter/Reddit

---

## 6. Unit Economics

| Metric                      | Value                                                   |
| --------------------------- | ------------------------------------------------------- |
| **COGS per 1,000 leads**    | ~$2.50 (proxy costs + server + ~$0.10 LLM for fallback) |
| **Selling price per 1,000** | $67 (Growth Pack)                                       |
| **Gross Margin**            | **96.3%**                                               |
| **Break-even**              | 1 sale covers infrastructure for a month                |
| **Target MRR (Month 3)**    | $3,000 (mix of one-time + subscriptions)                |
