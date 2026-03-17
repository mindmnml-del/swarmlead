# NotebookLM Sales Email Generator — TrueBase

> Load this file + SALES-TEMPLATES.md + GTM-PLAN.md + TRUTH-MATRIX.md into one notebook.

## Input Format

```
Prospect: [First Name] | Agency: [Agency Name]
Niche: [what they serve] | Offer: [MedSpa/HVAC/Dental]
Template: [bounce-rate/hidden-market/decision-maker]
Context: [optional — LinkedIn post, tagline, recent win]
```

Output: subject line + body + Day 3 follow-up.

## Mandatory Rules

1. Under 100 words (body only, exclude subject + signature)
2. Never say "verified email addresses" — say "MX-verified contacts" or "contacts with confidence scores"
3. Never say "SMTP verified", "100% accurate", "database of X million"
4. Never mention LinkedIn — we have no integration
5. Always include free 50-lead CSV offer
6. Always mention one differentiator: AI confidence score (0-100) OR live MX verification
7. Subject line lowercase. Sign as: `— Nick Bokuchava, Founder, TrueBase`

## Templates

### bounce-rate (for cold email / outbound SDR agencies)
Subject: `[first name] — what's your list bounce rate?`
```
Hi [First Name],
Quick one — if you're running cold email for [Niche] clients,
bounce rate is probably your #1 deliverability killer.
I built TrueBase — AI-verified contact infrastructure. We surface
direct business emails with live MX verification and an AI confidence
score (0-100) per lead — so you know what you're sending before it goes out.
Can I send you a free CSV of 50 [Offer] leads for one of your current campaigns?
— Nick Bokuchava, Founder, TrueBase
```

### hidden-market (niche Apollo/ZoomInfo misses)
Subject: `[first name] — [niche] leads that aren't on apollo`
```
Hi [First Name],
[If Context provided: reference it here.]
Quick context: [Niche] businesses are nearly invisible on Apollo and ZoomInfo.
We use an AI pipeline to surface their direct emails from Google Maps + company
websites — with a confidence score attached to every contact.
Want me to send 50 [Offer] leads as a free sample? Just say the word.
— Nick Bokuchava, Founder, TrueBase
```

### decision-maker (reach business owners directly)
Subject: `[first name] — reaching [niche] owners directly`
```
Hi [First Name],
Most [Niche] lead lists give you info@ and contact@ addresses. We built something different.
TrueBase uses AI to identify business owners and founders from company websites,
then infers and verifies their direct email. Each contact comes with a confidence
score so you can prioritize the strongest leads.
I have 50 [Offer] leads with decision-maker emails ready. Free sample — just reply "yes".
— Nick Bokuchava, Founder, TrueBase
```

## Outreach Cadence

| Day | Action |
|-----|--------|
| 1 | Initial email (selected template) |
| 3 | Short bump — restate CSV offer |
| 7 | Switch angle (if Day 1 was bounce-rate, use hidden-market) |
| 14 | Breakup: "Last note — no follow-ups after this. Reply 'send it' if you want the CSV." |

## Objection Handling (under 75 words each)

**"We use Apollo"** → "Totally get it — Apollo is great for enterprise. [Niche] local businesses are barely indexed there. We collect live data from Google Maps with AI confidence scores — data Apollo doesn't have. Worth a 2-min look at a free sample?"
Key: Don't trash Apollo. Position as complementary.

**"Too expensive"** → "Growth pack is $67 for 1,000 leads ($0.067/lead — 1/50th of ZoomInfo). But before pricing — want the free 50-lead sample to see if quality is worth it?"
Key: Redirect to free sample.

**"Not interested"** → "Understood — appreciate the reply. If you ever need fresh [Niche] data, ping this thread."
Key: Graceful exit. Leave door open.

**"How do I know data is good?"** → "Every lead includes: AI confidence score 0-100, live MX status, and extraction source (regex/AI/inference). Easiest way to judge: let me send the free sample."

**"Send me the sample" (YES)** →
```
Here's your sample — 50 [Offer] leads attached as CSV.
What you'll notice:
- Column J: AI confidence score (0-100) per email
- Column L: MX verification status (VALID/CATCH_ALL/UNKNOWN)
- Column K: how email was found (REGEX/LLM/INFERENCE)
Let me know after running a few. Happy to build a custom list.
```

## Post-Sample Close Sequence

- **Day 2:** "Did you get a chance to look at the sample?"
- **Day 5:** "If quality works, Agency pack = 5,000 leads + weekly refresh + decision-maker emails for $197. Want one for [Niche]?"
- **Day 10:** "Last follow-up. No worries if not the right fit."

## Differentiators vs Apollo (use in replies)

| Feature | TrueBase | Apollo/ZoomInfo |
|---------|----------|-----------------|
| AI Confidence Score (0-100) | Yes | No |
| Live MX Verification | Yes | Static snapshot |
| Catch-All Filtering | Yes | No |
| Google Maps ratings/reviews | Yes | No |
| Real-time (no stale data) | Yes | Months-old |
| C-Level email inference | Yes (Premium) | Yes (from DB) |

## Pricing (only if asked)

Starter $27 (500 leads, no emails) | Growth $67 (1K leads + emails) | Agency $197 (5K + C-Level + refresh) | Monthly $97/mo (1K fresh/mo) | Retainer $297/mo (5K + custom)
