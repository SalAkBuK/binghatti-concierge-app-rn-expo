# API Service Layer

A comprehensive, typed API service layer for the Binghatti Concierge App.

## Features

- 🔐 **Authentication Management**: Login, register, token handling
- 📋 **Request Management**: CRUD operations for maintenance requests
- 🔔 **Notifications**: Real-time notification handling
- 👥 **User Management**: User profiles and administration
- 🛡️ **Type Safety**: Full TypeScript support with proper typing
- ⚡ **Interceptors**: Request/response middleware support
- 🔄 **Auto-retry**: Automatic token refresh on 401 errors
- 📱 **Secure Storage**: Token management with Expo SecureStore

## Architecture

```
lib/services/api/
├── base.ts          # Base API service with common functionality
├── types.ts         # TypeScript interfaces and types
├── auth.ts          # Authentication endpoints
├── requests.ts      # Request management endpoints
├── notifications.ts # Notification endpoints
├── users.ts         # User management endpoints
├── index.ts         # Main service combining all modules
└── test.ts          # Integration tests
```

## Usage

### Basic Setup

```typescript
import { apiService } from "@/lib/services/api";

// The service is ready to use - no initialization required
```

### Authentication

```typescript
// Login
const response = await apiService.login({
  email: "user@example.com",
  password: "password123",
});

if (response.success) {
  console.log("Logged in:", response.user);
}

// Register
await apiService.register({
  email: "new@example.com",
  password: "password123",
  name: "John Doe",
  apartment: "101",
  tower: "A",
});

// Logout
await apiService.logout();

// Check auth state
const authState = await apiService.getAuthState();
console.log("Authenticated:", authState.isAuthenticated);
```

### Requests Management

```typescript
// Get all requests
const requests = await apiService.requests.getRequests();

// Create a new request
const newRequest = await apiService.requests.createRequest({
  title: "Leaky Faucet",
  description: "Kitchen faucet is dripping constantly",
  type: "plumbing",
  priority: "medium",
  apartment: "101",
  tower: "A",
});

// Update request status
await apiService.requests.markAsInProgress(requestId);
await apiService.requests.markAsCompleted(requestId);

// Assign request to someone
await apiService.requests.assignRequest(requestId, userId);

// Delete request
await apiService.requests.deleteRequest(requestId);
```

### Notifications

```typescript
// Get notifications
const notifications = await apiService.notifications.getNotifications();

// Get unread notifications only
const unread = await apiService.notifications.getUnreadNotifications();

// Mark as read
await apiService.notifications.markAsRead(notificationId);
await apiService.notifications.markAllAsRead();

// Get unread count
const { data } = await apiService.notifications.getUnreadCount();
console.log("Unread count:", data.count);
```

### User Management

```typescript
// Get users by role
const tenants = await apiService.users.getTenants();
const staff = await apiService.users.getManagementStaff();

// Search users
const results = await apiService.users.searchUsers("john");

// Update user profile
await apiService.updateProfile({
  name: "John Smith",
  phone: "+1234567890",
});
```

## Context Integration

The API service is already integrated with the app contexts:

### Auth Context

```typescript
import { useAuth } from "@/lib/context/auth-context";

function LoginScreen() {
  const { actions } = useAuth();

  const handleLogin = async (credentials) => {
    try {
      await actions.login(credentials);
      // User is now logged in
    } catch (error) {
      console.error("Login failed:", error.message);
    }
  };
}
```

### Requests Context

```typescript
import { useRequests } from "@/lib/context/requests-context";

function RequestsScreen() {
  const { requests, actions } = useRequests();

  useEffect(() => {
    // Load requests on component mount
    actions.loadRequests();
  }, []);

  const createRequest = async (data) => {
    try {
      await actions.createRequest(data, currentUser.id);
      // Request created successfully
    } catch (error) {
      console.error("Failed to create request:", error.message);
    }
  };
}
```

## Error Handling

The API service provides comprehensive error handling:

```typescript
try {
  const response = await apiService.requests.createRequest(data);
} catch (error) {
  if (error.status === 401) {
    // Authentication error - user will be logged out automatically
  } else if (error.status === 400) {
    // Bad request - show error message
    console.error("Validation error:", error.message);
  } else if (error.code === "NETWORK_ERROR") {
    // Network connectivity issue
    console.error("Please check your internet connection");
  } else {
    // Generic error
    console.error("Something went wrong:", error.message);
  }
}
```

## Configuration

The API service uses configuration from `lib/utils/constants.ts`:

```typescript
export const APP_CONFIG = {
  api: {
    baseUrl: "https://1bnx.online/api",
    timeout: 10000,
  },
};
```

## Testing

Run the integration tests to verify API functionality:

```typescript
import { ApiServiceTest } from "@/lib/services/api/test";

// Test all endpoints
const results = await ApiServiceTest.runAllTests();

// Test specific functionality
await ApiServiceTest.testAuthFlow();
await ApiServiceTest.testRequestsFlow();
await ApiServiceTest.testNotificationsFlow();

// Test connectivity
await ApiServiceTest.testConnection();
```

## Migration from Legacy

If you're migrating from the old `authService.js`:

### Before

```javascript
import authService from "@/src/shared/services/authService";

const response = await authService.login(email, password);
```

### After

```typescript
import { apiService } from "@/lib/services/api";

const response = await apiService.login({ email, password });
```

The new service provides:

- ✅ Full TypeScript support
- ✅ Better error handling
- ✅ Consistent API across all endpoints
- ✅ Automatic token management
- ✅ Context integration
- ✅ Comprehensive testing

## API Endpoints

The service maps to these backend endpoints:

- **Auth**: `/auth/login`, `/auth/register`, `/auth/logout`, `/auth/refresh`
- **Requests**: `/requests`, `/requests/:id`
- **Users**: `/users/profile`, `/users/:id`
- **Notifications**: `/notifications`, `/notifications/:id/read`

All endpoints expect and return JSON, with consistent response format:

```typescript
{
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}
```
