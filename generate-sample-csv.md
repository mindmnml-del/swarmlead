# Generate Sample CSV Plan

1. [x] Create the CLI script at `src/scripts/generate-sample-csv.ts`.
2. [x] Add the package `csv-writer`.
3. [x] Query Prisma `Company` model including related `Contact` records with quality filters.
4. [x] Map data to standard column names mapping (Company Name, Phone, Website, Address, Email, AI Confidence, MX Provider).
5. [x] Ensure robust escaping via `csv-writer`.
6. [x] Add npm script: `"generate-sample": "tsx src/scripts/generate-sample-csv.ts"`.
7. [ ] Verify type safety.
8. [ ] Test the script manually.
