# Admin Profiler Instrumentation Complete

## Instrumented Screens

### ✅ Fully Instrumented with Profiling Hooks

The following admin screens now have profiling hooks:

1. **AdminLayout** - `app/(admin)/_layout.tsx`
   - useMountLog, useRenderLog, useNavLog
   - PortalProfiler component

2. **Dashboard** - `app/(admin)/index.tsx`
   - useMountLog, useRenderLog, useScreenFocusLog

3. **Users** - `app/(admin)/users/index.tsx`
   - useMountLog, useRenderLog, useScreenFocusLog
   - measure: filteredUsers, columns

4. **Tenants** - `app/(admin)/tenants/index.tsx`
   - useMountLog, useRenderLog, useScreenFocusLog
   - measure: filteredTenants, occupancySnapshot

5. **Buildings** - `app/(admin)/buildings/index.tsx`
   - useMountLog, useRenderLog, useScreenFocusLog
   - measure: filteredBuildings

6. **Unit Types** - `app/(admin)/unit-types/index.tsx`
   - useMountLog, useRenderLog, useScreenFocusLog
   - measure: filteredUnitTypes

7. **More** - `app/(admin)/more.tsx`
   - useMountLog, useRenderLog, useScreenFocusLog

8. **Jobs** - `app/(admin)/jobs/index.tsx`
   - useMountLog, useRenderLog, useScreenFocusLog
   - measure: filteredJobs

9. **Service Providers** - `app/(admin)/service-providers/index.tsx`
   - useMountLog, useRenderLog, useScreenFocusLog

10. **Requests** - `app/(admin)/requests/index.tsx`
    - useMountLog, useRenderLog, useScreenFocusLog

11. **Workforce** - `app/(admin)/workforce/index.tsx`
    - useMountLog, useRenderLog, useScreenFocusLog

12. **Activity** - `app/(admin)/activity.tsx`
    - useMountLog, useRenderLog, useScreenFocusLog

13. **Permissions** - `app/(admin)/permissions.tsx`
    - useMountLog, useRenderLog, useScreenFocusLog

### Remaining Screens (To Instrument Manually)

To add profiling to the remaining screens, use this pattern:

```typescript
// 1. Add import at top of file
import {
  useMountLog,
  useRenderLog,
  useScreenFocusLog,
  measure,  // optional, for expensive operations
} from "../../../utils/adminProfiler";

// 2. Add hooks at top of component function
export default function YourScreen() {
  // Profiler hooks - track lifecycle and performance
  useMountLog("Admin/YourScreenName");
  useRenderLog("Admin/YourScreenName");
  useScreenFocusLog("Admin/YourScreenName");

  // ... rest of component
}

// 3. Optionally wrap expensive computations
const filteredData = useMemo(
  () => measure("Build Admin/YourScreen data", () =>
    data.filter(...).sort(...)
  ),
  [data]
);
```

#### Screens Needing Instrumentation

- `app/(admin)/billing/index.tsx`
- `app/(admin)/maintenance/index.tsx`
- `app/(admin)/broadcast-notifications/index.tsx`
- `app/(admin)/visitors/index.tsx`
- `app/(admin)/parcels/index.tsx`

## Critical Performance Fixes

### 🔥 EntityTable Animation Memory Leak - `components/admin/EntityTable.tsx`

**Problem Identified**: Cumulative lag when scrolling lists after navigating through multiple screens. Fresh login scroll is smooth, but after visiting multiple screens, scrolling becomes extremely laggy.

**Root Cause**:
- **Stacked animation delays**: Every row had `FadeInDown.delay(index * 50)`, creating delays up to 48+ seconds for large lists
- **Memory accumulation**: Animation queues from unmounted screens stayed in memory
- **Cumulative effect**: Each screen visit added more animations to memory, slowing down subsequent list renders

Example with 966 users:
- Row 1: 50ms delay
- Row 100: 5000ms delay (5 seconds)
- Row 966: **48,300ms delay (48 seconds!)** ← Matches VirtualizedList warning

**Solution Applied**:
1. **Only animate first 15 items** - Prevents memory bloat from large lists
2. **Cap animation delay at 300ms** - Changed from `index * 50` to `Math.min(index * 20, 300)`
3. **Reduce animation duration** - Changed from 400ms to 300ms
4. **Use plain View for items beyond 15** - No animation overhead for bulk of list

**Expected Impact**:
- Eliminates cumulative lag from navigation
- List renders in <1 second regardless of navigation history
- Smooth scrolling even with 900+ items
- Dramatic memory usage reduction

### 🔥 AdminLayout Re-render Optimization - `app/(admin)/_layout.tsx`

**Problem Identified**: AdminLayout was re-rendering 15+ times during navigation sessions.

**Root Cause**:
- Using `useApp()` hook which creates a new object on every render
- This caused re-renders whenever ANY context changed (auth, requests, notifications, etc.)
- `useEffect` dependencies were triggering navigation loops

**Solution Applied**:
1. **Switched from `useApp()` to `useAuth()`** - Only subscribes to auth context changes
2. **Memoized `isAdmin` computation** - Prevents recalculation on every render
3. **Added navigation guards with `useRef`** - Prevents navigation loops in useEffect hooks

**Expected Impact**:
- Reduces unnecessary re-renders during navigation
- Portal load time: ~380ms (as measured in logs)

## Backend Performance Instrumentation

### ✅ Context Layer Profiling

The following backend operations now have performance profiling:

1. **ConnectedAppProvider** - `lib/context/connected-app-provider.tsx`
   - `getUsers()` - Wraps `Object.values(auth.users)` with measure
   - This is called by many admin screens to fetch user data

2. **useUsersData Hook** - `app/(admin)/users/_hooks/useUsersData.ts`
   - `scopedUsers` - Measures filtering and scoping of users by role and building

### ✅ Dashboard Component Profiling

**Dashboard Screen** - `app/(admin)/index.tsx`
- `managementTiles` - Measures tile building logic
- `performanceBanner` - Measures banner configuration
- `bookingsTrend` - Measures trend data computation
- `completionTrend` - Measures completion rate trend
- `occupancyTrend` - Measures occupancy trend computation

## Usage

When running the app in development mode, you'll see logs like:

```
[MOUNT] AdminLayout
[RENDER] AdminLayout (#1)
[NAV][AdminLayout] index=0 route=index
[PORTAL LOADED] Admin Portal in 342.18 ms
[MOUNT] Admin/Dashboard
[RENDER] Admin/Dashboard (#1)
[FOCUS] Admin/Dashboard
[MEASURE] getUsers: Object.values(auth.users): 0.23 ms
[MEASURE] Build Admin/Dashboard managementTiles: 1.45 ms
[MEASURE] Build Admin/Dashboard performanceBanner: 0.12 ms
```

Navigate between screens to see focus/blur events and render counts.

## Performance Tips

- **High render counts** indicate unnecessary re-renders
- **Slow measurements** (>10ms) indicate performance bottlenecks
- **Frequent mount/unmount** may indicate navigation or key issues
- All profiling has **zero production impact** (guarded by `__DEV__`)

## ✅ RESOLVED: Systemic Performance Issues

### ✅ FIXED: `useApp()` Hook Creates New Objects on Every Render

**Issue**: The `useApp()` hook in [lib/context/connected-app-provider.tsx](lib/context/connected-app-provider.tsx:118) was returning a massive object that was recreated on every render. This caused ALL components using `useApp()` to re-render whenever ANY context changed.

**Fix Applied**: ✅ **COMPLETE**
```typescript
// Wrapped entire return object in React.useMemo with comprehensive dependency array
export const useApp = () => {
  const auth = useAuth();
  const requests = useRequests();
  const notifications = useNotifications();
  // ... many more hooks

  return React.useMemo(
    () => ({
      isAuthenticated: auth.isAuthenticated,
      currentUser: auth.currentUser,
      // ... hundreds of properties
    }),
    [
      // Comprehensive dependency array listing ALL state and actions
      auth.isAuthenticated,
      auth.currentUser,
      // ... all dependencies
    ]
  );
};
```

**Additional Fixes Applied**:
1. ✅ Optimized `useTenantsData()` hook to eliminate redundant `useMemo` calls
2. ✅ Optimized `useDashboardData()` hook with proper memoization
3. ✅ Added `useContextRenderLog()` profiling tool to track context re-renders

**Expected Impact**:
- 80-90% reduction in unnecessary re-renders
- Portal load time: 1751ms → ~400ms
- Tenants filtering: 114ms (3×38ms) → 38ms (1 time)
- Dashboard: Computations run once per actual state change

See [PERFORMANCE_FIXES_CRITICAL.md](PERFORMANCE_FIXES_CRITICAL.md) for complete documentation.
