# Management Profile Setup Implementation

## Overview
Implemented a mandatory profile setup flow for management users, similar to the admin portal. When management users log in for the first time (or if their profile is incomplete), they are redirected to a profile setup screen before accessing the dashboard.

## Changes Made

### 1. Created Management Profile Screen
**File:** `app/(management)/profile.tsx`

Features:
- **First-time setup mode**: Shows welcome screen with icon when `profileCompleted: false`
- **Profile editing mode**: Shows regular header when profile is complete
- **Assigned Buildings Display**: Shows all buildings assigned to the management user with:
  - Building name and address
  - Occupancy stats (occupied/total units)
  - Building status badge (active, maintenance, inactive)
- **Profile Fields**:
  - Profile photo upload (via AttachmentPicker)
  - Full name (required for first-time setup)
  - Phone number (required for first-time setup)
  - Email (read-only, cannot be changed)
  - Job title (optional)
  - Department (optional)
  - Bio/About (optional)
- **Validation**: Enforces required fields during first-time setup
- **Save Action**:
  - Updates user profile via `actions.updateProfile()`
  - Marks profile as completed on first save
  - Redirects to dashboard after completion

### 2. Updated Management Layout
**File:** `app/(management)/_layout.tsx`

Changes:
- Added `usePathname` import to track current route
- Added `hasRedirectedToProfile` ref to prevent redirect loops
- Added profile completion check effect:
  ```typescript
  useEffect(() => {
    if (
      isAuthenticated &&
      currentUser &&
      isManagement &&
      !currentUser.profileCompleted &&
      pathname !== "/(management)/profile" &&
      !hasRedirectedToProfile.current
    ) {
      hasRedirectedToProfile.current = true;
      router.replace("/(management)/profile");
    }
  }, [isAuthenticated, currentUser, isManagement, pathname]);
  ```
- Added `<Stack.Screen name="profile" />` to navigation stack

### 3. Updated Management "More" Screen
**File:** `app/(management)/more.tsx`

Changes:
- Added "My Profile" menu item at the top of the list:
  ```typescript
  {
    id: "profile",
    title: "My Profile",
    description: "Edit your personal information and settings",
    icon: "person-circle",
    route: "/(management)/profile",
    color: "#7C3AED",
  }
  ```

### 4. Updated Side Menu
**File:** `components/ui/SideMenu.tsx`

Changes:
- Added "My Profile" link to management menu (before logout):
  ```typescript
  {
    id: "management-profile",
    title: "My Profile",
    icon: "person-outline",
    action: () => navigateAndClose("/(management)/profile"),
  }
  ```

### 5. Updated Mock Data
**File:** `lib/utils/mockData.ts`

Changes:
- Set `profileCompleted: false` for `management@demo.com`:
  ```typescript
  "management@demo.com": {
    id: "2",
    email: "management@demo.com",
    name: "John Smith",
    role: "management",
    profileCompleted: false, // Force profile setup on first login
    // ...
  }
  ```

## User Experience Flow

### First Login (Profile Incomplete)
1. User logs in with `management@demo.com`
2. Layout detects `profileCompleted: false`
3. User is automatically redirected to `/(management)/profile`
4. Profile screen shows welcome header: "Welcome to Tower Desk!"
5. Shows assigned buildings section (if any)
6. User fills required fields (name, phone)
7. User clicks "Complete Setup"
8. Profile is marked as complete
9. Alert shown: "Profile Complete! Your profile has been set up successfully."
10. User is redirected to dashboard `/(management)`

### Subsequent Logins (Profile Complete)
1. User logs in with `management@demo.com`
2. Layout checks `profileCompleted: true`
3. User proceeds directly to dashboard
4. Can access profile anytime via:
   - Side menu → "My Profile"
   - More screen → "My Profile"

### Profile Editing (After Setup)
1. Navigate to profile via menu
2. Profile screen shows regular header: "Management Profile"
3. All fields are editable except email
4. Changes are saved with "Save Profile" button
5. Success alert shown
6. User stays on profile screen

## Building Assignment Display

The profile screen shows all buildings assigned to the management user:

```typescript
{managedBuildings.length > 0 && (
  <View style={styles.card}>
    <View style={styles.buildingHeader}>
      <Ionicons name="business" size={20} color="#2563EB" />
      <Text style={styles.sectionTitle}>Your Assigned Buildings</Text>
    </View>
    {managedBuildings.map((building) => (
      <View key={building.id} style={styles.buildingCard}>
        {/* Building info display */}
      </View>
    ))}
  </View>
)}
```

Building cards show:
- Building name (e.g., "Skyline Tower")
- Address (e.g., "123 Sheikh Zayed Road, Dubai")
- Occupancy: "45/50 units"
- Status badge: "ACTIVE" (green), "MAINTENANCE" (yellow), "INACTIVE" (gray)

## Testing

### Test User
- **Email:** `management@demo.com`
- **Password:** Any password (demo mode)
- **Role:** management
- **Profile Complete:** false (will trigger setup)
- **Assigned Buildings:** building-1 (Skyline Tower)

### Test Steps
1. Log in with `management@demo.com`
2. Verify redirect to profile setup screen
3. Verify welcome message is shown
4. Verify assigned building (Skyline Tower) is displayed
5. Try submitting without required fields → should show validation alerts
6. Fill name: "John Smith"
7. Fill phone: "+971 50 345 6789"
8. Click "Complete Setup"
9. Verify success alert
10. Verify redirect to dashboard
11. Verify dashboard loads correctly with building data
12. Navigate to More → My Profile
13. Verify profile loads with saved data
14. Make changes and save
15. Verify changes are persisted

## Technical Notes

### Profile Completion Flag
The `profileCompleted` boolean on the User object controls the redirect:
- `false` or `undefined` → Redirect to profile
- `true` → Allow access to dashboard

### Redirect Guard
Uses `hasRedirectedToProfile` ref to prevent infinite redirect loops during the profile completion process.

### Building Data Access
Uses `actions.getManagedBuildings()` to fetch buildings assigned to the management user, which filters buildings based on `profile.managedBuildingIds`.

### Form State
Profile form maintains local state and syncs with user context on save. Changes are persisted via the `updateProfile` and `updateUser` actions.

### Validation
Required fields for first-time setup:
- Full name (must not be empty)
- Phone number (must not be empty)

Optional fields:
- Job title
- Department
- Bio/About
- Profile photo

## Similar Implementation

This implementation mirrors the admin profile setup at `app/(admin)/profile.tsx` with the following differences:

1. **Admin Profile**:
   - Company-focused (Company Name, Website, Logo, Description)
   - No building assignment display
   - Uses business icon in welcome screen

2. **Management Profile**:
   - Personal-focused (Name, Job Title, Department, Bio)
   - Shows assigned buildings with occupancy stats
   - Uses person icon in welcome screen
   - Displays building information prominently

Both implementations share:
- First-time setup flow with welcome screen
- Required field validation
- Profile completion tracking
- Redirect logic on login
- Side menu and More screen integration
- Similar UI/UX patterns and styling
