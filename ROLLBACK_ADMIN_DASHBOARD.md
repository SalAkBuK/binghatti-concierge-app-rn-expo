# Rollback Plan — Super Admin Dashboard Split (7 Oct 2025)

Use this checklist to revert the super-admin dashboard refresh, role-specific side menu updates, and admin notification modal introduced on 7 October 2025.

## 1. Restore Modified Files
Reset the following files to their pre-refresh versions (either via `git checkout -- <path>` or by copying from your preferred backup):
- `app/(admin)/index.tsx`
- `components/ui/HeaderBar.tsx`
- `components/ui/SideMenu.tsx`
- `app/(admin)/users.tsx`
- `app/(admin)/buildings.tsx`
- `app/(admin)/jobs.tsx`
- `app/(admin)/permissions.tsx`
- `lib/utils/mockData.ts`

## 2. Remove Newly Added Files
Delete the files that were introduced for the refresh:
- `components/admin/AnalyticsSection.tsx`
- `components/admin/MiniTrendCard.tsx`
- `components/admin/TrendDelta.tsx`
- `app/(modals)/admin-notifications.tsx`

## 3. Regenerate Navigation & Notifications
- After restoring the files, clear Metro caches with `npx expo start --clear` to drop any stale module references.
- If you seeded additional admin notifications via AsyncStorage, run `node scripts/clear-auth-cache.js` (answer “yes”) so the app reloads the original notification set.

## 4. Validate the Rollback
1. Launch `npx expo start` and open the app as an admin user (`admin@demo.com`).
2. Confirm the dashboard layout matches the pre-refresh grid and that the side menu/notification bell revert to the shared tenant style.
3. Spot-check tenant flows to ensure the shared menu still behaves as expected.

Once these steps pass, the codebase is effectively restored to the state before the super-admin dashboard changes.
