# Soft Archive Credit System & Worker Crash Recovery

## Overview

The goal is to softly archive the Credit System (keeping the Stripe and Credit logic in the codebase for potential future use but hiding it from the UI and bypassing it in the backend) and to implement robust crash recovery for the worker process so it can run unattended indefinitely.

## Project Type

WEB and BACKEND

## Success Criteria

- [ ] Navigation links for "Credits" and "Pricing" are hidden/commented out in the Sidebar.
- [ ] The credit balance badge is removed from the UI.
- [ ] Backend route `createScrapeJob` successfully bypasses credit checks.
- [ ] `scraperService.ts` successfully bypasses credit deduction/checking.
- [ ] The worker process and job poller have catastrophic `catch` blocks that prevent unexpected Node exits.
- [ ] Critical errors in the worker cause a 30-second cooldown (`setTimeout`) followed by continuing the loop, rather than exiting.
- [ ] No Stripe or User DB files are deleted.

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS (for UI modifications)
- **Backend**: Node.js, Prisma (for worker stability and credit bypassing)

## File Structure

- `dashboard/src/components/Sidebar.tsx` / `dashboard/src/components/SidebarClient.tsx`
- `dashboard/src/app/actions.ts`
- `src/services/scraperService.ts`
- `src/worker.ts`
- `src/services/jobPoller.ts`

## Task Breakdown

### Task 1: Frontend UI Cleanup (Soft Archive)

- **Agent**: `frontend-specialist`
- **Input**: `Sidebar.tsx` and `SidebarClient.tsx`
- **Output**: Navigation items for pricing and credits are removed/commented. Credit balance badge is hidden.
- **Verify**: Inspect the Sidebar component in the browser to ensure no credit-related items are visible.

### Task 2: Backend Bypass Confirmation

- **Agent**: `backend-specialist`
- **Input**: `dashboard/src/app/actions.ts`, `src/services/scraperService.ts`
- **Output**: `createScrapeJob` skips credit validation. `scraperService.ts` does not invoke `deductCredit` or `hasCredits`. Existing imports are kept but commented out or unused.
- **Verify**: Run a test data collection job and confirm it processes successfully without requiring credits or interacting with Stripe.

### Task 3: Worker Crash Recovery (Stability)

- **Agent**: `backend-specialist`
- **Input**: `src/worker.ts`, `src/services/jobPoller.ts`
- **Output**: Main loops have catastrophic `try-catch` blocks. On error: log error, wait 30 seconds (`await new Promise(r => setTimeout(r, 30000))`), and continue the loop.
- **Verify**: Simulate a crash (e.g., throwing a temporary error) and verify that the worker logs the error, waits 30 seconds, and resumes polling without exiting the Node process.

## Phase X: Verification

- [ ] Lint: ✅ Pass
- [ ] Build: ✅ Success
- [ ] Run & Test: ⏳ Pending approval and implementation
