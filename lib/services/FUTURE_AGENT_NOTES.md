# Future Agent Notes — `lib/services/`
_Snapshot: 7 October 2025_

## Purpose
Houses client-side service abstractions. Currently only `api/` is present, modelling REST endpoints with mocked responses.

## Integration Strategy
- Consume the singleton `apiService` from `lib/services/api/index.ts`.
- When the real backend is available, swap mock implementations inside individual service classes without touching the UI.
- Token management lives in `AuthApiService`; `MainApiService` syncs tokens across module instances.
