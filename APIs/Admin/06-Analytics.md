# Module 06 — Analytics & Dashboard

The Admin dashboard (`app/(admin)/index.tsx`) renders a portfolio snapshot with tiles, charts, and timelines. This module describes the analytics endpoints required to replace the mock data in `lib/context/connected-app-provider.tsx`.

**Key types**: `Analytics` (`lib/types/index.ts:1126-1160`).

---

## GET `/api/admin/analytics`
- Returns `ApiResponse<Analytics>`.
- Include:
  - `openJobsCount`, `pendingRequestsCount`
  - `tenantsCount`, `buildingsCount`
  - `bookingsToday`, `revenueThisMonth`, `totalRevenue`
  - `completionRate`, `averageCompletionTime`
  - `topServiceProviders[]` (`id`, `name`, `jobsCompleted`, `averageRating`)
  - `recentActivity[]` (`id`, `type`, `description`, `timestamp`)
- Optional query params:
  | Param | Type | Notes |
  | --- | --- | --- |
  | `range` | string | e.g., `today`, `7d`, `30d`; defaults to latest snapshot. |
  | `buildingId` | string | Scope metrics to a single property for manager views. |

## GET `/api/admin/analytics/recent-activity`
- Use when you want to decouple the timeline feed from the heavy analytics payload.
- Response: Array of `Analytics["recentActivity"]`.
- Optional filters: `type`, `buildingId`, pagination cursors.

## Future Enhancements
- Provide alert metadata (e.g., `alerts[]`) for the dashboard banner.
- Expose comparative metrics (`deltaVsLastWeek`) to drive trend arrows client side.
