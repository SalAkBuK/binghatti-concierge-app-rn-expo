# Future Agent Notes — `lib/services/api/`
_Verified: 7 October 2025_

## Module Layout
- `base.ts` — Base class responsible for Axios-style request configuration, token injection, retry helpers.
- `auth.ts` — Mock auth API (login/register/profile) storing tokens in AsyncStorage keys defined in `lib/utils/constants`.
- `requests.ts`, `notifications.ts`, `users.ts`, `admin.ts` — Feature-specific service classes returning static data from `lib/utils/mockData.ts`.
- `retry.ts`, `errors.ts`, `cache.ts` — Utilities for retry policies, error normalization, and simple in-memory caching.
- `examples.ts`, `test.ts` — Usage snippets and service-level smoke tests.
- `types.ts` — Shared types for API services.
- `index.ts` — `MainApiService` orchestrator + singleton export `apiService`.

## Working With It
- Replace mock return values with real `fetch`/`axios` calls once endpoints stabilize.
- Keep token sync by calling `apiService.setAuthToken(token)` after login; contexts already do this when re-enabled.
