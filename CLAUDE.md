# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tower Desk** is a React Native mobile application built with Expo that provides a concierge service platform for residential buildings. The app serves multiple user roles (tenants, management, service providers, admins) with different features and permissions for each role.

- **App Name**: Tower Desk
- **Package**: com.codefier.towerdesk
- **Framework**: Expo v54 with React Native 0.81.4
- **Router**: Expo Router v6 (file-based routing)
- **Backend API**: https://1bnx.online/api
- **Build Platform**: EAS Build

## Development Commands

### Running the App
```bash
npm start                    # Start development server (uses increased memory)
npm run start-win           # Windows-specific start command
npm run android             # Start on Android emulator
npm run ios                 # Start on iOS simulator
npm run web                 # Start on web
```

### Testing & Quality
```bash
npm run lint                # Run ESLint
npm run typecheck           # Run TypeScript type checking (no emit)
npm test                    # Run Jest tests
npm run test:watch          # Run Jest in watch mode
npm run test:api            # Test API services
```

### Building for Production
```bash
npm run build:preview       # Build Android APK for preview/testing
npm run build:production    # Build Android AAB for Play Store
npm run build:list          # List all EAS builds
```

**Important**: All builds are managed through EAS Build. See `eas.json` for build profiles:
- `preview`: Creates APK for internal testing
- `production`: Creates AAB with auto-increment version for Play Store submission

## Architecture

### Directory Structure

```
app/                          # Expo Router file-based routing
  ├── (tenant)/              # Tab navigator routes (tenant views)
  │   ├── index.tsx           # Home dashboard
  │   ├── requests.tsx        # Request management
  │   ├── new-request.tsx     # Create new request
  │   ├── amenities.tsx       # Amenity booking
  │   ├── my-bookings.tsx     # View bookings
  │   ├── visitors.tsx        # Visitor management
  │   ├── my-ratings.tsx      # Submitted ratings
  │   └── profile.tsx         # User profile
  ├── (admin)/                # Admin-only routes
  │   ├── index.tsx           # Admin dashboard
  │   ├── users.tsx           # User management
  │   ├── buildings.tsx       # Building management
  │   ├── jobs.tsx            # Job/task management
  │   └── permissions.tsx     # Role permissions
  ├── (modals)/               # Modal screens
  │   ├── notifications-hub.tsx
  │   ├── request-details.tsx
  │   ├── notice-details.tsx
  │   ├── amenity-booking-form.tsx
  │   ├── register-visitor.tsx
  │   └── submit-rating.tsx
  ├── _layout.tsx             # Root layout with providers
  ├── index.tsx               # Landing/redirect screen
  └── auth.tsx                # Authentication screen

lib/
  ├── context/                # React Context providers
  │   ├── connected-app-provider.tsx  # Main provider composing all contexts
  │   ├── auth-context.tsx            # Authentication state
  │   ├── requests-context.tsx        # Service requests
  │   ├── notifications-context.tsx   # User notifications
  │   └── notices-context.tsx         # Building notices
  ├── services/api/           # API service layer
  │   ├── index.ts            # Main API service (singleton)
  │   ├── base.ts             # BaseApiService with fetch/auth/interceptors
  │   ├── auth.ts             # Authentication endpoints
  │   ├── requests.ts         # Service request endpoints
  │   ├── notifications.ts    # Notification endpoints
  │   ├── users.ts            # User management endpoints
  │   ├── admin.ts            # Admin-specific endpoints
  │   ├── cache.ts            # Caching utilities
  │   ├── retry.ts            # Retry logic
  │   └── errors.ts           # Error handling
  ├── types/                  # TypeScript type definitions
  ├── utils/                  # Utility functions
  │   ├── constants.ts        # App constants & config
  │   ├── helpers.ts          # General helpers
  │   ├── imageUtils.ts       # Image processing
  │   └── mockData.ts         # Mock data for development
  └── hooks/                  # Custom React hooks

components/
  ├── ui/                     # Reusable UI components
  ├── notifications/          # Notification-specific components
  ├── admin/                  # Admin-specific components
  └── icons/                  # Custom icon components
```

### State Management Architecture

The app uses a **composed Context API architecture** with multiple specialized contexts:

1. **ConnectedAppProvider** (Root Provider - `lib/context/connected-app-provider.tsx`)
   - Composes all contexts together
   - Provides `useApp()` hook that aggregates all state and actions
   - Handles cross-context communication (e.g., requests creating notifications)

2. **Individual Contexts**:
   - `AuthContext`: User authentication, user management, role-based access
   - `RequestsContext`: Service requests (create, update, status tracking)
   - `NotificationsContext`: In-app notifications, read/unread tracking
   - `NoticesContext`: Building-wide notices/announcements

3. **State Flow**:
   - Each context manages its own state with `useState`/`useReducer`
   - Actions in one context can trigger actions in another (via ConnectedRequestsProvider)
   - `useApp()` hook provides unified access to all state and actions

### API Service Architecture

The API layer is built on a modular, extensible architecture:

1. **BaseApiService** (`lib/services/api/base.ts`)
   - Handles all HTTP requests using `fetch` API
   - Manages authentication tokens via `expo-secure-store`
   - Implements request/response interceptors
   - Automatic timeout handling (configurable, default 10s)
   - Error standardization

2. **MainApiService** (`lib/services/api/index.ts`)
   - Singleton instance: `apiService`
   - Aggregates specialized service modules:
     - `AuthApiService`: login, register, logout, token refresh
     - `RequestsApiService`: CRUD for service requests
     - `NotificationsApiService`: notification management
     - `UsersApiService`: user profile operations
     - `AdminApiService`: admin operations
   - Synchronizes auth tokens across all modules

3. **Usage Pattern**:
   ```typescript
   import apiService from '@/lib/services/api';

   // Auth
   await apiService.login({ email, password });

   // Requests
   await apiService.requests.getRequests();

   // Notifications
   await apiService.notifications.getNotifications();
   ```

### Routing & Navigation

- **Expo Router v6** with file-based routing
- **Typed Routes** enabled for type-safe navigation
- **Route Groups**:
  - `(tenant)`: Bottom tab navigation for tenant role
  - `(management)`: Operations workspace for building managers
  - `(admin)`: Stack navigation for admin role
  - `(modals)`: Modal presentations
- **Role-based routing**: Users are redirected based on their role (see `ROLE_HOME_VIEWS` in `lib/utils/constants.ts`)
- **Root anchor**: Set to `(tenant)` via `unstable_settings` in `app/_layout.tsx`

### Authentication Flow

1. User lands on `app/index.tsx` (checks if authenticated)
2. If not authenticated → redirect to `app/auth.tsx`
3. After login → `AuthContext` stores user data and token
4. `MainApiService` syncs token across all API modules
5. User redirected to role-specific home:
   - Tenant → `(tenant)/index`
   - Management → `(management)/index`
   - Admin → `(admin)/index`

### Role-Based Access Control

The app supports 5 user roles with different permissions:

- **tenant**: Standard residents (access to requests, amenities, bookings, visitors)
- **management**: Building managers (access to all building data, analytics, job assignment)
- **admin**: System administrators (full access, user/building/permission management)
- **service_provider**: External service providers (job management, schedule)
- **employee**: Building staff (task management, schedule)

Role-specific navigation is defined in `NAVIGATION_ITEMS` (lib/utils/constants.ts).

### Key Features by Role

**Tenant Features**:
- Service request submission and tracking
- Amenity booking (gym, pool, etc.)
- Visitor pre-registration with QR codes
- Rating/feedback for completed services
- Notifications and building notices

**Management Features**:
- Dashboard with building analytics
- View and manage all requests for managed buildings
- Job creation and assignment to service providers
- Broadcast notifications to tenants
- Building occupancy and performance metrics

**Admin Features**:
- User management (create, update, delete users)
- Building management (CRUD operations)
- Job/task management across all buildings
- Role and permission management
- System-wide analytics

## Important Configuration Details

### Path Aliases (tsconfig.json)
```typescript
"@/*": ["./*"]
"@/lib/*": ["./lib/*"]
"@/components/*": ["./components/*"]
"@/app/*": ["./app/*"]
"@/assets/*": ["./assets/*"]
```

### API Configuration (lib/utils/constants.ts)
```typescript
APP_CONFIG.api.baseUrl = "https://1bnx.online/api"
APP_CONFIG.api.timeout = 10000
```

### Storage Keys
Secure storage keys are defined in `STORAGE_KEYS` constant:
- `auth_token`: JWT authentication token
- `user_data`: Serialized user object
- `user_role`: Current user role
- Context-specific keys for requests, notifications, notices

### Build Configuration

- **React Compiler**: Enabled (`experiments.reactCompiler: true`)
- **New Architecture**: Enabled (`newArchEnabled: true`)
- **Edge-to-Edge**: Enabled for Android
- **Console Stripping**: Production builds remove console.log (except error/warn)
- **Memory Settings**: Increased Node memory (`--max-old-space-size=4096`)

## Development Best Practices

### When Adding New Features

1. **Check User Role**: Always verify `currentUser.role` before showing UI or allowing actions
2. **Use Context Actions**: Access state/actions via `useApp()` hook, not directly
3. **Handle Loading States**: All async operations should set loading state
4. **Error Handling**: Use try-catch and display user-friendly error messages
5. **Type Safety**: Define types in `lib/types/index.ts`, import from there

### API Integration

1. **Add endpoints** to the appropriate service class in `lib/services/api/`
2. **Sync tokens** when adding new service modules (see MainApiService.setAuthToken)
3. **Use interceptors** for cross-cutting concerns (logging, analytics, etc.)
4. **Test with `npm run test:api`** to verify API service behavior

### Adding New Screens

1. Create file in appropriate route group (`(tenant)`, `(admin)`, `(modals)`)
2. Add route configuration in `app/_layout.tsx` if needed
3. Update `NAVIGATION_ITEMS` in constants if adding to navigation
4. Ensure role-based access control is enforced

### Working with Context

- Always use `ConnectedAppProvider` as root provider
- Use `useApp()` for accessing combined state/actions
- Use individual hooks (`useAuth`, `useRequests`, etc.) for focused access
- Cross-context actions should be handled in ConnectedRequestsProvider

## Common Issues & Solutions

### Memory Issues During Build
- Use `npm start` (not `npx expo start`) to leverage memory settings
- On Windows, use `npm run start-win`

### Type Errors
- Run `npm run typecheck` to check all types
- The project has `strict: false` to allow gradual type adoption

### Build Fails
- Check EAS Build logs with `npm run build:list`
- Ensure all dependencies are properly installed with `npm install`
- Run `npx expo install --fix` to align Expo SDK versions

### Route Not Found
- File-based routing requires exact file names
- Check that route groups use parentheses: `(tenant)`, `(admin)`, `(modals)`
- Verify `unstable_settings.anchor` is correctly set

## Testing Strategy

- **Unit Tests**: Jest for utilities and helpers
- **API Tests**: Use `test.ts` file in `lib/services/api/`
- **Manual Testing**: Use preview builds on real devices
- **Type Safety**: Regular `npm run typecheck` runs

## Deployment Process

1. Ensure code passes: `npm run lint && npm run typecheck`
2. Update version in `app.json` (or use auto-increment for production)
3. Build with appropriate profile:
   - Preview/Testing: `npm run build:preview`
   - Play Store: `npm run build:production`
4. Download APK/AAB from EAS dashboard
5. Test on physical devices before release
6. Submit AAB to Play Store for production release

See `QUICK_REFERENCE.md` and `PRE_BUILD_CHECKLIST.md` for detailed build procedures.
