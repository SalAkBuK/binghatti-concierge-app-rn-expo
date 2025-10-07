# Future Agent Notes — `lib/`
_Review date: 7 October 2025_

## Structure
- `context/` — React context providers that hold app state.
- `hooks/` — Data-level hooks such as AsyncStorage helpers.
- `services/` — Future API client surface with mocked implementations.
- `types/` — Domain model definitions.
- `utils/` — Constants, helper functions, and mock data seeds.

## Key Entry Points
- Exported collectively via `lib/index.ts` (check for re-exports when wiring new modules).
- `ConnectedAppProvider` is mounted in `app/_layout.tsx`; it’s your integration point for new app-wide state.
