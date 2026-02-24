# PLAN-ratings-pipeline-restore.md

## User Request Mapping

Restoration of lost data pipeline connecting `googleMapsScraper` fields (`rating`, `reviewCount`) through `scraperService` payloads, `company.ts` DB interfaces, and ultimately the `schema.prisma`. Will also restore the lost `worker` npm script.

## Phase -1: Context Check & Rules

Required roles explicitly assigned: @backend-specialist @database-architect.
No code to be written during **plan** mode. Surgical extraction target boundaries identified.

## Task Breakdown

1. **Restore package.json:**
   - Add `"worker": "tsx src/worker.ts"` to `scripts.worker`

2. **Restore prisma/schema.prisma:**
   - Add `rating Float?` to model `Company`
   - Add `reviewCount Int? @map("review_count")` to model `Company`

3. **Restore src/db/company.ts:**
   - `CompanyData` Interface: Add `rating?: number | null;` & `reviewCount?: number | null;`
   - `createCompanyIfNotExists`: Add exact mapping inside `prisma.company.create` block:
     - `rating: data.rating ?? null,`
     - `reviewCount: data.reviewCount ?? null,`

4. **Restore src/scraper/googleMapsScraper.ts:**
   - `GoogleMapsResult` Interface: Add `rating?: number | null;` & `reviewCount?: number | null;`
   - `extractDetails()` evaluate context: Extract rating via regex `/\d\.\d/` and review count via `/([\d,]+)\s*reviews/i` OR `/\(([\d,]+)\)/`. Return cleanly mapped objects.

5. **Restore src/services/scraperService.ts:**
   - `processJob()` loop logic explicitly strict-casts map payloads:
     - `rating: details.rating ? Number(details.rating) : null,`
     - `reviewCount: details.reviewCount ? parseInt(String(details.reviewCount).replace(/[^0-9]/g, ''), 10) : null,`

## Phase X: Verification Checklist

- Run `npx prisma db push` to verify table adjustments without `migrate dev`.
- Ensure output formatting does not alter/rewrite remaining logic per constraints.
