# System Memory & Technical Context

## ExtensionPay Configuration
- Architecture integrates ExtensionPay for payment flows. Ensure credit tracking respects job quotas appropriately.
- DaaS mode enables unlimited processing (disables credit deduction logic).

## State Management Patterns
- **Task Retries**: Handled within `processJob` rather than separate queue processes. If a `ScrapeTask` throws, retries are safely incremented to a limit of `maxRetries` (default 3) returning to `PENDING`, after which the task fails.
- **Atomic Job Finalization**: Job completion logic (`update status to COMPLETED`, set `resultsFound`) fires conditionally when a transaction verifies 0 `PENDING/PROCESSING` tasks remain for a job. This ensures race-condition safety among concurrent workers.
- **Worker Browser Health**: Worker loop proactively tests `browser.isConnected()` before processing a job. If Chromium is disconnected or hangs, `rotateBrowser()` handles clean crash recovery and resets the connection.
