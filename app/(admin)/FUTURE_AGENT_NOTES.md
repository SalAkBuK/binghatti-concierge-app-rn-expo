# Future Agent Notes — `app/(admin)`
_Reviewed: 7 October 2025_

## Responsibility
Management and admin dashboards. Loaded when `currentUser.role` is `admin` or `management`.

## Tab Breakdown
- `index.tsx` — KPI dashboard using `components/admin/AnalyticsTile`. Pulls analytics via `useApp().actions.getAnalytics()`.
- `users.tsx` — Lists tenants/users with search, edit, and role management using `EntityTable`.
- `buildings.tsx` — CRUD surface for building metadata (`actions.getBuildings`, `actions.updateBuilding`).
- `permissions.tsx` — Role permission matrix; reads from `actions.getRolePermissions()`.
- `jobs.tsx` — Work order tracker for service providers.

## Implementation Notes
- `_layout.tsx` defines the custom tab appearance (rounded bar, safe-area friendly).
- Most screen interactions depend on context actions declared in `lib/context/connected-app-provider.tsx` and `requests-context`.
- To extend analytics, add fields to `DEFAULT_ANALYTICS` (lib/utils/mockData.ts) and adapt the screen.
