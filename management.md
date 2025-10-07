# Management Dashboard Plan

This document captures the proposed steps to differentiate the management experience from the super-admin control center. Review and adjust as needed before implementation.

## Step 1 – Current-State Recon
- Log in as `management@demo.com` and map the routes/screens currently shared with super admin.
- Audit `lib/utils/mockData.ts` and context providers to confirm entities (requests, bookings, visitors, jobs) carry building identifiers.
- Verify how management users are associated with buildings (e.g., `profile.buildingId`); note required schema changes if absent.

## Step 2 – Data & Selector Strategy
- Decide on canonical mapping between management users and buildings (consider `managedBuildingIds` array).
- Extend context selectors (`useApp()`) with building-scoped getters: analytics, requests, bookings, visitors, jobs.
- Preserve existing admin/global selectors to avoid regressions.

## Step 3 – Management Dashboard Design
- Introduce a dedicated management dashboard screen rendering building-scoped analytics.
- Layout ideas: health banner, KPI grid (requests, jobs, amenity utilization, occupancy), and sections for today’s requests, upcoming bookings, expected visitors.
- Reuse current responsive UI components (tiles, trend cards) with filtered data.

## Step 4 – Navigation & Access Control
- Update `SideMenu` so management users land on the new dashboard and only see building-relevant menu items.
- Adjust `app/index.tsx` routing to direct management roles to the management dashboard.
- Filter notification feeds by the manager’s building when rendering the header bell/modal.

## Step 5 – Management Detail Screens
- Either create dedicated management screens (requests/bookings/visitors) or wrap existing ones with building-level filters and restricted actions.
- Hide or limit admin-only tools (global user management, role permissions) for management users unless required.

## Step 6 – Implementation Order
1. Update mock data, types, and management user profiles for building assignments.
2. Add building-scoped selectors in contexts.
3. Build the management dashboard UI.
4. Update navigation, menus, and notifications for role specificity.
5. Wire up management detail screens with filtered data.
6. Perform role-based QA (admin vs. management vs. tenant) to verify behavior.
