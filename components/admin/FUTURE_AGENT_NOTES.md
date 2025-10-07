# Future Agent Notes — `components/admin/`
_Captured: 7 October 2025_

## Key Components
- `AnalyticsTile.tsx` — KPI card with icon, metric, optional trend indicator.
- `EntityTable.tsx` — Generic table with search, pull-to-refresh, animated rows.
- `JobCard.tsx` — Compact display of maintenance jobs for admin dashboards.

## Usage Hints
- Designed for management tabs and can be reused by tenant views if needed.
- Accepts render props for flexible cell rendering (`EntityTable`).
- Animations rely on `react-native-reanimated`; ensure new components wrap content in `Animated.View` if you want entry animations.
