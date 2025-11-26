# Critical Performance Fixes - Admin Portal

## Summary

This document describes the **CRITICAL** performance fixes applied to resolve the admin portal's slow load times (1751ms → target <400ms) and excessive re-renders.

## Root Causes Identified

### 1. **useApp() Hook Creating New Objects on Every Render** ⚠️ CRITICAL

**File**: [lib/context/connected-app-provider.tsx](lib/context/connected-app-provider.tsx:118)

**Problem**:
- The `useApp()` hook returned a massive object (100+ properties) that was recreated on **every single render**
- This caused ALL components using `useApp()` to re-render whenever ANY context changed
- Even if a component only needed `currentUser`, it would re-render when notifications, requests, or any other state changed

**Impact**:
- AdminLayout: 7-15 re-renders during simple navigation
- Dashboard: Multiple re-renders triggering expensive computations
- Tenants: 38ms filtering operation running 3+ times on mount
- Portal load time: 1751ms (should be ~380ms)

**Fix Applied**:
```typescript
// BEFORE (BAD):
export const useApp = () => {
  const auth = useAuth();
  const requests = useRequests();
  // ... many more contexts

  return {
    // NEW object created every render
    isAuthenticated: auth.isAuthenticated,
    currentUser: auth.currentUser,
    // ... 100+ more properties
  };
};

// AFTER (GOOD):
export const useApp = () => {
  const auth = useAuth();
  const requests = useRequests();
  // ... many more contexts

  // Memoize the entire return object
  return React.useMemo(
    () => ({
      isAuthenticated: auth.isAuthenticated,
      currentUser: auth.currentUser,
      // ... 100+ more properties
    }),
    [
      // Comprehensive dependency array
      auth.isAuthenticated,
      auth.currentUser,
      // ... all dependencies listed
    ]
  );
};
```

**Expected Impact**:
- 80-90% reduction in unnecessary re-renders
- Portal load time: 1751ms → ~400ms
- Tenants filtering: 38ms × 3 renders → 38ms × 1 render
- Dashboard computations: Run once per actual state change instead of on every render

---

### 2. **useTenantsData Hook Calling Functions in useMemo**

**File**: [app/(admin)/tenants/_hooks/useTenantsData.ts](app/(admin)/tenants/_hooks/useTenantsData.ts:25)

**Problem**:
```typescript
// BEFORE (BAD):
const allBuildings = useMemo(() => getBuildings(), [getBuildings]);
const allUsers = useMemo(() => getUsers(), [getUsers]);
```
- `getBuildings()` and `getUsers()` were called inside `useMemo` with the function itself as a dependency
- If the function reference changed (which it did on every `useApp()` re-render), the memo was invalidated
- This caused the 38ms filtering operation to run multiple times

**Fix Applied**:
```typescript
// AFTER (GOOD):
// Functions are now stable from memoized useApp()
const allBuildings = getBuildings();
const allUsers = getUsers();

// Memoize expensive computations
const tenants = useMemo(
  () => allUsers.filter((user) => user.role === "tenant"),
  [allUsers]
);

const hasUnreadNotifications = useMemo(() => {
  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  return userNotifications.some((notif) => !notif.read);
}, [notifications, currentUser?.id]);
```

**Expected Impact**:
- Tenants screen: 38ms computation runs once per mount instead of 3 times
- Filtering operation: ~114ms saved (38ms × 2 extra renders eliminated)

---

### 3. **useDashboardData Hook Not Memoizing Computed Values**

**File**: [app/(admin)/dashboard/_hooks/useDashboardData.ts](app/(admin)/dashboard/_hooks/useDashboardData.ts:17)

**Problem**:
```typescript
// BEFORE (BAD):
const isManagement = currentUser?.role === "management";
const managementBaseRoute = isManagement ? "/(management)" : "/(admin)";
```
- These values were re-computed on every render
- `managementBaseRoute` was used in many `onPress` handlers, causing them to be recreated

**Fix Applied**:
```typescript
// AFTER (GOOD):
const isManagement = useMemo(
  () => currentUser?.role === "management",
  [currentUser?.role]
);

const managementBaseRoute = useMemo(
  () => (isManagement ? "/(management)" : "/(admin)"),
  [isManagement]
);

const managedBuildings = useMemo(
  () => (isManagement ? actions.getManagedBuildings?.() ?? [] : []),
  [isManagement, actions.getManagedBuildings]
);

const hasUnreadNotifications = useMemo(() => {
  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  return userNotifications.some((notif) => !notif.read);
}, [notifications, currentUser?.id]);
```

**Expected Impact**:
- Prevents re-creation of callback functions that depend on these values
- Reduces Dashboard re-renders when unrelated state changes

---

### 4. **AdminLayout Re-renders (Previously Fixed, but Context Issue Remained)**

**File**: [app/(admin)/_layout.tsx](app/(admin)/_layout.tsx:28)

**Previous Fix**:
- Switched from `useApp()` to `useAuth()` ✅
- Memoized `isAdmin` computation ✅
- Added navigation guards with `useRef` ✅

**Why It Wasn't Enough**:
The AdminLayout improvements helped, but child screens (Dashboard, Tenants, etc.) were still using `useApp()` which triggered re-renders across the entire admin portal.

**Current State**:
With the `useApp()` memoization fix, AdminLayout should now stay stable and only re-render when auth state actually changes.

---

## New Profiling Tools Added

### useContextRenderLog

**File**: [utils/adminProfiler.tsx](utils/adminProfiler.tsx:310)

A new hook to track context re-renders and identify which values changed:

```typescript
export function useContextRenderLog(name: string, values: Record<string, any>): void;
```

**Usage**:
```typescript
const { currentUser, notifications, actions } = useApp();
useContextRenderLog('Admin/Tenants useApp()', {
  currentUser,
  notifications,
  actions
});
```

**Output**:
```
[CONTEXT] Admin/Tenants useApp() (#1) initial render
[CONTEXT] Admin/Tenants useApp() (#2) changed: notifications
[CONTEXT] Admin/Tenants useApp() (#3) no changes (unnecessary re-render)
```

This helps identify:
- Which context values are changing
- Unnecessary re-renders (when no values changed)
- Patterns of re-render cascades

---

## Testing Instructions

### Before Testing
1. Clear any cached data
2. Perform a fresh login
3. Have Metro bundler logs visible

### Test 1: Portal Load Time
**Expected**: Portal should load in <500ms (target ~380ms)

1. Log in as admin
2. Watch for `[PORTAL LOADED] Admin Portal in XXX ms` log
3. **Success Criteria**: Load time < 500ms

### Test 2: Navigation Re-renders
**Expected**: Minimal re-renders during navigation (1-3 per component)

1. Navigate: Dashboard → Users → Tenants → Buildings → Dashboard
2. Watch for `[RENDER]` logs
3. **Success Criteria**: Each screen renders ≤3 times during navigation

### Test 3: Tenants Filtering Performance
**Expected**: 38ms filtering runs only once per mount

1. Navigate to Tenants screen
2. Watch for `[MEASURE] Build Admin/Tenants filteredTenants` log
3. **Success Criteria**: Appears only 1 time on mount

### Test 4: Scroll Performance After Navigation
**Expected**: Smooth scrolling even after visiting multiple screens

1. Fresh login → Navigate to Users → Scroll (should be smooth)
2. Navigate through: Dashboard → Tenants → Buildings → Users
3. Scroll Users list again
4. **Success Criteria**: Scrolling remains smooth (no cumulative lag)

---

## Performance Metrics

### Before Fixes
- Portal load time: **1751ms** ❌
- AdminLayout renders during navigation: **7-15 times** ❌
- Tenants filtering on mount: **3 times (38ms each = 114ms total)** ❌
- Dashboard renders on mount: **Multiple times** ❌
- Cumulative lag: **Worsens after each screen visit** ❌

### After Fixes (Expected)
- Portal load time: **<500ms** ✅ (target ~380ms)
- AdminLayout renders during navigation: **1-2 times** ✅
- Tenants filtering on mount: **1 time (38ms total)** ✅
- Dashboard renders on mount: **1-2 times** ✅
- Cumulative lag: **None - animations don't stack** ✅

### Potential Improvements
If portal load time is still >500ms:
- 380ms target: Reduce initial component tree depth
- 300ms target: Implement code splitting for admin screens
- 200ms target: Lazy load heavy components (charts, tables)

---

## Related Documentation

- [ADMIN_PROFILER_INSTRUMENTATION.md](ADMIN_PROFILER_INSTRUMENTATION.md) - Full profiling setup and instrumented screens
- [utils/adminProfiler.tsx](utils/adminProfiler.tsx) - Profiling utilities source code

---

## Architecture Notes

### Why useMemo is Critical Here

React's reconciliation works by comparing object references. When `useApp()` returned a new object on every render:

```typescript
// Render 1
const app1 = { currentUser: user, notifications: [...] };

// Render 2 (even if nothing changed)
const app2 = { currentUser: user, notifications: [...] };

// React sees: app1 !== app2 → trigger re-render of ALL consumers
```

With `useMemo`:
```typescript
// Render 1
const app1 = useMemo(() => ({ currentUser: user, ... }), [user, ...]);

// Render 2 (if dependencies unchanged)
const app2 = app1; // Same reference!

// React sees: app1 === app2 → skip re-render
```

### Why This Matters for Admin Portal

The admin portal has:
- 13 instrumented screens
- Each screen uses `useApp()` or hooks that use `useApp()`
- Each unnecessary re-render triggers:
  - Component re-mount/unmount cycles
  - useMemo/useCallback re-computations
  - Child component re-renders
  - Animation restarts

**Cascading Effect**:
1 unnecessary AdminLayout re-render
→ 5 admin screens re-render
→ Each screen has 10-20 child components
→ 50-100 component re-renders
→ 1000+ render cycles per navigation

With memoization, this drops to:
1 actual state change
→ 1-2 component re-renders
→ Minimal child re-renders

---

## Future Optimizations

### Short Term (If Needed)
1. **Split useApp() into smaller hooks**:
   - `useAppAuth()` - Auth state only
   - `useAppRequests()` - Requests state only
   - `useAppNotifications()` - Notifications state only

2. **Implement React.memo for expensive components**:
   - EntityTable
   - AnalyticsSection
   - MiniTrendCard

3. **Add virtualization for large lists**:
   - Users table (900+ items)
   - Tenants table
   - Jobs table

### Long Term
1. **Context splitting**: Separate admin contexts from tenant contexts
2. **Code splitting**: Lazy load admin screens
3. **State management library**: Consider Zustand/Jotai for fine-grained subscriptions
4. **Server state**: Implement React Query for data fetching and caching

---

## Troubleshooting

### If portal load time is still >500ms:
1. Check `[PORTAL LOADED]` log - is it accurate?
2. Check for network requests blocking render
3. Use `useContextRenderLog` to identify hot re-render paths
4. Check `[RENDER]` logs for unexpected re-renders

### If re-renders persist:
1. Use `useContextRenderLog` in problematic components
2. Check if context dependencies are properly listed in `useMemo` deps array
3. Verify that actions from contexts are stable (using `useCallback`)

### If filtering still runs multiple times:
1. Verify `useApp()` memoization is working
2. Check that `getUsers()` and `getBuildings()` are stable references
3. Add `measure()` around suspected duplicate computations
