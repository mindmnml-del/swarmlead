# Planner: Ratings Pipeline Restore

## Overview

Restoration of lost data pipeline connecting `googleMapsScraper` fields (`rating`, `reviewCount`) through `scraperService` payloads, `company.ts` DB interfaces, and ultimately the `schema.prisma`. Will also restore the lost `worker` npm script and ensure the Next.js UI properly renders the ratings. Note: I was unable to locate `googleMapsScraper.txt` and `page.txt` on the filesystem; they either were not created properly or are located elsewhere. We will rely on the instructions provided here to complete the tasks, and the user can provide the text logic when needed.

## Project Type

WEB

## Success Criteria

- Ratings and review counts extracted accurately from Google Maps.
- Prisma schema and TypeScript types reflect new fields.
- Backend and DB correctly map and handle the data.
- Dashboard properly renders the extracted ratings and counts.
- `worker` script is restored in `package.json`.

## Tech Stack

- Typescript / Node.js
- Prisma & PostgreSQL
- Next.js (App Router)

## File Structure

- `package.json`
- `prisma/schema.prisma`
- `src/db/company.ts`
- `src/scraper/googleMapsScraper.ts`
- `src/services/scraperService.ts`
- `dashboard/src/app/api/leads/export/route.ts`
- `dashboard/src/app/dashboard/leads/page.tsx`

## Task Breakdown

1. **Restore package.json:**
   - Add `"worker": "tsx src/worker.ts"` to `scripts.worker`

2. **Restore prisma/schema.prisma:** (@database-architect)
   - Add `rating Float?` to model `Company`
   - Add `reviewCount Int? @map("review_count")` to model `Company`

3. **Restore src/db/company.ts:** (@database-architect)
   - `CompanyData` Interface: Add `rating?: number | null;` & `reviewCount?: number | null;`
   - `createCompanyIfNotExists`: Add exact mapping inside `prisma.company.create` block:
     - `rating: data.rating ?? null,`
     - `reviewCount: data.reviewCount ?? null,`

4. **Restore src/scraper/googleMapsScraper.ts:** (@backend-specialist)
   - `GoogleMapsResult` Interface: Add `rating?: number | null;` & `reviewCount?: number | null;`
   - `extractDetails()` evaluate context: Extract rating via regex `/\d\.\d/` and review count via `/([\d,]+)\s*reviews/i` OR `/\(([\d,]+)\)/`. Return cleanly mapped objects.

5. **Restore src/services/scraperService.ts:** (@backend-specialist)
   - `processJob()` loop logic explicitly strict-casts map payloads:
     - `rating: details.rating ? Number(details.rating) : null,`
     - `reviewCount: details.reviewCount ? parseInt(String(details.reviewCount).replace(/[^0-9]/g, ''), 10) : null,`
6. **Update dashboard/src/app/api/leads/export/route.ts:** (@backend-specialist)
   - Include `rating` and `reviewCount` in the CSV export row builder.

7. **Update dashboard/src/app/dashboard/leads/page.tsx:** (@frontend-specialist)
   - Properly render star ratings and review counts, parsing the `page.txt` UI logic.

## Phase X: Verification Checklist

- [ ] Run `npx prisma db push` to verify table adjustments without `migrate dev`.
- [ ] Run typescript checks (`npx tsc --noEmit`) to verify no `any` types were added.
- [ ] Ensure output formatting does not alter/rewrite remaining logic per constraints.
