# Future Agent Notes — `lib/utils/`
_Captured: 7 October 2025_

## Files
- `mockData.ts` — Seed data for users, requests, notifications, amenities, buildings, jobs, analytics, etc.
- `helpers.ts` — Formatting utilities, badge color helpers, ID generators, validation helpers.
- `constants.ts` — Shared status/priority color maps and storage key enums.
- `imageUtils.ts` — Helper for image loading / placeholder fallbacks.
- `index.ts` — Barrel exports for downstream imports.

## Usage Guidance
- Extend `mockData.ts` when you need new fake entities for demos.
- Keep helper functions pure; anything stateful should move into contexts or hooks.
