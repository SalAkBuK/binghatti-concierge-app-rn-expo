# Context Architecture

This directory contains the new domain-driven context architecture that replaces the monolithic `app-context.tsx`.

## Structure

### Core Contexts

- **`auth-context.tsx`** - User authentication and profile management
- **`requests-context.tsx`** - Request CRUD operations and lifecycle
- **`notifications-context.tsx`** - Notification management and state

### Provider Composition

- **`connected-app-provider.tsx`** - Root provider that composes all contexts with proper connections
- **`app-provider.tsx`** - Simple composition without connections

## Usage

### In App Root

```tsx
import { ConnectedAppProvider } from "../lib/context/connected-app-provider";

export default function RootLayout() {
  return (
    <ConnectedAppProvider>{/* Your app components */}</ConnectedAppProvider>
  );
}
```

### In Components - Use Combined Hook

```tsx
import { useApp } from "../lib/context/connected-app-provider";

function MyComponent() {
  const { currentUser, requests, actions } = useApp();
  // Same API as before, but now with better performance
}
```

### In Components - Use Specific Hooks

```tsx
import {
  useAuth,
  useRequests,
  useNotifications,
} from "../lib/context/connected-app-provider";

function MyComponent() {
  const { currentUser } = useAuth(); // Only re-renders on auth changes
  const { requests } = useRequests(); // Only re-renders on request changes
  const { notifications } = useNotifications(); // Only re-renders on notification changes
}
```

## Benefits

### Performance

- **Selective Re-renders**: Components only update when their specific domain changes
- **Memory Optimization**: Smaller context states and reduced re-render frequency
- **Better Debugging**: Clear separation makes performance issues easier to track

### Architecture

- **Domain Separation**: Each context handles one business domain
- **Testability**: Contexts can be tested in isolation
- **Maintainability**: Changes to one domain don't affect others

### Developer Experience

- **Type Safety**: Full TypeScript support with proper interfaces
- **Clear Boundaries**: Easy to understand what each context manages
- **Backwards Compatibility**: `useApp()` hook maintains the same API

## Migration

The migration maintains 100% backwards compatibility. All existing components continue to work without changes while gaining the performance benefits of the new architecture.

## Legacy

The old monolithic context has been backed up as `app-context.tsx.backup` and can be restored if needed.
