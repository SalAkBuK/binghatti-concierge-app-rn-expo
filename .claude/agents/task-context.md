# Admin Functionality Implementation Task

## Objective
Implement missing admin features in the Binghatti Concierge React Native Expo app:
1. Create Building UI with modal form
2. Assign Manager functionality
3. Permissions management screen
4. Update admin navigation

## Technical Context

### File Locations
- Buildings screen: `C:\Users\13463\OneDrive\Documents\CodeFier\binghatti-concierge-app-rn-expo\app\(admin)\buildings.tsx`
- New Permissions screen: `C:\Users\13463\OneDrive\Documents\CodeFier\binghatti-concierge-app-rn-expo\app\(admin)\permissions.tsx` (create new)
- Admin layout: `C:\Users\13463\OneDrive\Documents\CodeFier\binghatti-concierge-app-rn-expo\app\(admin)\_layout.tsx`

### Pattern Reference
- Use `app/(admin)/users.tsx` as primary reference for modal forms and patterns
- Follow existing EntityTable usage
- Match color scheme: primary #7034FF, backgrounds #F9FAFB, etc.

### Available Actions (from useApp hook)
- `actions.createBuilding(buildingData: CreateBuildingDTO)` - returns Promise<Building>
- `actions.updateBuilding(buildingId, updates: UpdateBuildingDTO)` - returns Promise<Building>
- `actions.getUsers()` - returns User[] (for manager dropdown)
- `actions.getPermissions()` - returns RolePermissions[]
- `actions.getPermissionsByRole(role)` - returns RolePermissions

### Type Definitions (from lib/types/index.ts)

```typescript
interface CreateBuildingDTO {
  name: string;
  address: string;
  city: string;
  country: string;
  managerId?: string;
  totalUnits: number;
  amenities?: string[];
}

interface UpdateBuildingDTO {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  managerId?: string;
  totalUnits?: number;
  occupiedUnits?: number;
  amenities?: string[];
  status?: "active" | "maintenance" | "inactive";
}

interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  managerId?: string;
  managerName?: string;
  totalUnits: number;
  occupiedUnits: number;
  amenities: string[];
  status: "active" | "maintenance" | "inactive";
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: string;
  resource: string; // e.g., "users", "buildings", "jobs"
  action: "create" | "read" | "update" | "delete" | "manage";
  description: string;
}

interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}
```

## Implementation Requirements

### 1. Buildings Screen Enhancement

**Add Create Building Button and Modal:**
- Add "Create Building" button after HeaderBar (similar to users.tsx line 171-179)
- Use Ionicons "business-add" for button icon
- Create modal state: `showCreateModal`, `isCreating`
- Form state with all CreateBuildingDTO fields
- Manager dropdown should filter users where `role === "management"`
- Status dropdown with 3 options: active, maintenance, inactive
- Form validation: name, address, city, country, totalUnits required
- Call `actions.createBuilding()` on submit
- Show success Alert and refresh list

**Add Manager Column and Assignment:**
- Update columns array to show manager name (width: SCREEN_WIDTH * 0.25)
- In onRowPress Alert, show current manager
- Add separate "Assign Manager" button in modal or alert
- Dropdown to select from management users
- Call `actions.updateBuilding(buildingId, { managerId })` on selection

### 2. Permissions Screen (NEW FILE)

**Create: app/(admin)/permissions.tsx**

Structure:
- SafeAreaView with HeaderBar
- Display 5 roles in cards or sections
- For each role, show permissions grouped by resource
- Use Switch or Checkbox for each permission
- Save button to call `actions.updatePermissions(role, permissionIds[])`
- Loading state while saving
- Success/error alerts

UI Pattern:
```
[Header Bar]

[Role: Admin]
  Users
    ☑ Create  ☑ Read  ☑ Update  ☑ Delete
  Buildings
    ☑ Create  ☑ Read  ☑ Update  ☑ Delete
  ...

[Role: Management]
  Users
    ☐ Create  ☑ Read  ☑ Update  ☐ Delete
  ...

[Save Changes Button]
```

### 3. Admin Layout Update

**Modify: app/(admin)/_layout.tsx**

- Add new Tabs.Screen for permissions
- Place after buildings tab, before jobs tab
- Use icon: `shield-checkmark` (focused) / `shield-checkmark-outline` (unfocused)
- Title: "Permissions"
- Name: "permissions"

## Code Style Requirements
- Use React Native components only (no web-specific)
- Use Ionicons from @expo/vector-icons
- Follow existing color scheme and spacing
- Use ActivityIndicator for loading states
- Use Alert for success/error messages
- Use Animated components from react-native-reanimated for animations
- Follow existing StyleSheet patterns
- TypeScript strict typing

## Success Criteria
1. Buildings screen has functional Create Building modal
2. Manager assignment works via updateBuilding
3. Permissions screen displays all roles and permissions
4. All screens match existing admin UI design
5. No TypeScript errors
6. All functionality works with mock data

## Notes
- The app uses mock data (USE_MOCK = true in admin.ts)
- All actions have 500ms simulated delay
- Actions create notifications automatically
- Follow patterns from users.tsx exactly for consistency
