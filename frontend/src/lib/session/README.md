# Session Management System

This document describes the new session management system that replaces the archived session and guards implementation.

## Overview

The new session system provides:
- **Centralized session management** with caching and auto-refresh
- **Guard functions** that work with TanStack Router's `beforeLoad`
- **React hooks** for component-level session access
- **Type safety** throughout the application
- **Event-driven updates** for reactive UI

## Architecture

### Core Components

1. **SessionManager Class** (`SessionManager.ts`)
   - Manages session data lifecycle
   - Handles caching and auto-refresh
   - Provides event system for updates

2. **useSession Hook** (`useSession.ts`)
   - React wrapper for SessionManager
   - Provides reactive session state
   - Handles Logto integration

3. **Guard Functions** (`guards.ts`)
   - Route protection functions
   - Work with `beforeLoad` in route definitions
   - Provide automatic redirects

4. **Types** (`types.ts`)
   - TypeScript definitions
   - Session data structure
   - Event types

## Usage

### In Route Definitions

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { requireAuth, requireActiveSub, requireOnboarding } from "~/lib/session";

// Require authentication
export const Route = createFileRoute("/protected")({
  beforeLoad: requireAuth,
  component: ProtectedPage,
});

// Require active subscription
export const Route = createFileRoute("/premium")({
  beforeLoad: requireActiveSub,
  component: PremiumPage,
});

// Require completed onboarding
export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireOnboarding,
  component: DashboardPage,
});

// Require specific role in organization
export const Route = createFileRoute("/org/$orgId/admin")({
  beforeLoad: requireAdmin(),
  component: AdminPage,
});
```

### In Components

```typescript
import { useSession } from "~/lib/session";

function MyComponent() {
  const { session, isLoading, error, refreshSession } = useSession();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!session) return <div>Not authenticated</div>;

  return (
    <div>
      <h1>Welcome, {session.user?.name}!</h1>
      <p>Subscription: {session.subscription?.status}</p>
      <button onClick={refreshSession}>Refresh</button>
    </div>
  );
}
```

### Direct SessionManager Usage

```typescript
import { sessionManager } from "~/lib/session";

// Load session
const session = await sessionManager.loadSession();

// Get current session
const currentSession = sessionManager.getSession();

// Check if session is valid
const isValid = sessionManager.isSessionValid();

// Subscribe to events
const unsubscribe = sessionManager.on('session:loaded', (session) => {
  console.log('Session loaded:', session);
});
```

## Guard Functions

### Available Guards

- `requireAuth()` - Requires user to be authenticated
- `requireActiveSub()` - Requires active subscription
- `requireOnboarding()` - Requires completed onboarding
- `requireOrgChosen()` - Requires organization to be selected
- `requireRole(minRole)` - Requires specific role level
- `requireAdmin()` - Requires admin role
- `requireEditor()` - Requires editor or admin role

### Custom Guards

```typescript
import { requireOnboarding } from "~/lib/session";

export function requireCustomFeature() {
  return async () => {
    const session = await requireOnboarding();
    
    // Custom logic here
    if (!session.user?.customData?.hasFeature) {
      throw redirect({ to: "/upgrade" });
    }
    
    return session;
  };
}
```

## Session Data Structure

```typescript
interface SessionData {
  user: User | null;
  subscription: Subscription | null;
  onboarding: {
    completed: boolean;
    profileCompleted: boolean;
    organizationCompleted: boolean;
  };
  organizations: OrganizationData[];
  defaultOrgId?: string;
  isLoading: boolean;
  lastUpdated: number;
}
```

## Events

The SessionManager emits the following events:

- `session:loaded` - Session data loaded
- `session:updated` - Session data updated
- `session:refreshed` - Session data refreshed
- `session:error` - Error occurred

## Configuration

```typescript
import { SessionManager } from "~/lib/session";

const sessionManager = new SessionManager({
  refreshInterval: 5 * 60 * 1000, // 5 minutes
  cacheTimeout: 2 * 60 * 1000,   // 2 minutes
  enableAutoRefresh: true,
});
```

## Migration from Old System

### Before (Archived)
```typescript
// Old way
import { requireAuth } from "~/lib/guards";
import { loadSession } from "~/lib/session";

export const Route = createFileRoute("/route")({
  beforeLoad: requireAuth,
  component: Component,
});

function Component() {
  const [session, setSession] = useState(null);
  
  useEffect(() => {
    loadSession().then(setSession);
  }, []);
  
  // Manual session management...
}
```

### After (New System)
```typescript
// New way
import { requireAuth, useSession } from "~/lib/session";

export const Route = createFileRoute("/route")({
  beforeLoad: requireAuth,
  component: Component,
});

function Component() {
  const { session, isLoading, error } = useSession();
  
  // Automatic session management with reactivity
}
```

## Benefits

1. **Simplified Code**: Less boilerplate in components
2. **Better Performance**: Caching and smart refresh
3. **Type Safety**: Full TypeScript support
4. **Reactive Updates**: Automatic UI updates on session changes
5. **Centralized Logic**: Single source of truth for session management
6. **Easy Testing**: Mockable session manager
7. **Route Protection**: Clean guard functions for `beforeLoad`

## Best Practices

1. **Use guards in routes** for automatic protection
2. **Use useSession hook** in components for reactive data
3. **Handle loading and error states** appropriately
4. **Subscribe to events** for custom session handling
5. **Clear session** on logout
6. **Refresh session** after important operations

## Troubleshooting

### Common Issues

1. **Session not loading**: Check if user is authenticated with Logto
2. **Guards not working**: Ensure guards are properly imported and used in `beforeLoad`
3. **Stale data**: Use `refreshSession()` to force update
4. **Memory leaks**: Unsubscribe from events when components unmount

### Debug Mode

```typescript
// Enable debug logging
sessionManager.on('session:loaded', (session) => {
  console.log('Session loaded:', session);
});

sessionManager.on('session:error', (error) => {
  console.error('Session error:', error);
});
```
