/**
 * Admin Profiler Module
 *
 * Comprehensive performance profiling for the Admin Portal.
 * All hooks and components are guarded with __DEV__ to ensure zero impact in production.
 *
 * Features:
 * - Component mount/unmount tracking
 * - Render count tracking
 * - Screen focus/blur tracking (React Navigation)
 * - Navigation state logging
 * - Synchronous function timing
 * - Portal load time measurement
 *
 * Usage:
 * Import the hooks and components you need, then call them in your admin screens/layouts.
 * All logging only happens in development mode (__DEV__ === true).
 *
 * Example:
 * @example
 * import { useMountLog, useRenderLog, useScreenFocusLog } from '@/utils/adminProfiler';
 *
 * function MyAdminScreen() {
 *   useMountLog('Admin/MyScreen');
 *   useRenderLog('Admin/MyScreen');
 *   useScreenFocusLog('Admin/MyScreen');
 *   // ... rest of component
 * }
 */

// Type declaration for React Native's __DEV__ global
declare const __DEV__: boolean;

import React, { useEffect, useRef } from 'react';
import { useFocusEffect, useNavigationState } from '@react-navigation/native';

/**
 * useMountLog
 *
 * Logs when a component mounts and unmounts.
 * Useful for tracking component lifecycle and identifying unexpected unmounts.
 *
 * @param name - The name/identifier for the component
 *
 * Example output:
 * [MOUNT] AdminLayout
 * [UNMOUNT] AdminLayout
 */
export function useMountLog(name: string): void {
  useEffect(() => {
    if (__DEV__) {
      console.log(`[MOUNT] ${name}`);
    }

    return () => {
      if (__DEV__) {
        console.log(`[UNMOUNT] ${name}`);
      }
    };
  }, []); // Empty deps - only mount/unmount
}

/**
 * useRenderLog
 *
 * Logs on every render with an incrementing counter.
 * Useful for identifying unnecessary re-renders and performance issues.
 *
 * @param name - The name/identifier for the component
 *
 * Example output:
 * [RENDER] AdminLayout (#1)
 * [RENDER] AdminLayout (#2)
 * [RENDER] AdminLayout (#3)
 */
export function useRenderLog(name: string): void {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  // Increment on every render
  renderCount.current += 1;

  if (__DEV__) {
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    // Log with timing information
    console.log(
      `[RENDER] ${name} (#${renderCount.current}) +${timeSinceLastRender.toFixed(2)}ms`,
      new Error().stack?.split('\n')[2]?.trim() || '' // Show caller for debugging
    );
  }
}

/**
 * useScreenFocusLog
 *
 * Logs when a screen comes into focus or loses focus (React Navigation).
 * Useful for tracking navigation flow and screen visibility lifecycle.
 *
 * @param name - The name/identifier for the screen
 *
 * Example output:
 * [FOCUS] Admin/Users
 * [BLUR] Admin/Users
 */
export function useScreenFocusLog(name: string): void {
  useFocusEffect(
    React.useCallback(() => {
      if (__DEV__) {
        console.log(`[FOCUS] ${name}`);
      }

      return () => {
        if (__DEV__) {
          console.log(`[BLUR] ${name}`);
        }
      };
    }, [name])
  );
}

/**
 * useNavLog
 *
 * Logs navigation state changes, showing the current route index and name.
 * Useful for debugging navigation issues and understanding navigation stack state.
 *
 * @param tag - A tag to identify where this nav log is coming from
 *
 * Example output:
 * [NAV][AdminLayout] index=2 route=users/index
 * [NAV][AdminLayout] index=0 route=index
 */
export function useNavLog(tag: string): void {
  const navigationState = useNavigationState((state) => state);

  useEffect(() => {
    if (!__DEV__ || !navigationState) return;

    // Extract the active route info
    const routes = navigationState.routes;
    const index = navigationState.index;

    if (routes && routes[index]) {
      const activeRoute = routes[index];
      const routeName = activeRoute.name;

      console.log(`[NAV][${tag}] index=${index} route=${routeName}`);
    }
  }, [navigationState, tag]);
}

/**
 * measure
 *
 * Measures and logs the execution time of a synchronous function.
 * Useful for profiling expensive computations, filters, sorts, and data transformations.
 *
 * @param label - A descriptive label for the operation being measured
 * @param fn - The function to measure (synchronous only)
 * @returns The return value of fn
 *
 * Example usage:
 * @example
 * const filteredData = useMemo(
 *   () => measure('Filter admin users', () =>
 *     users.filter(u => u.role === 'admin').sort((a, b) => a.name.localeCompare(b.name))
 *   ),
 *   [users]
 * );
 *
 * Example output:
 * [MEASURE] Filter admin users: 2.34 ms
 */
export function measure<T>(label: string, fn: () => T): T {
  if (!__DEV__) {
    // In production, just execute the function without measurement
    return fn();
  }

  const t0 = performance.now();
  const result = fn();
  const t1 = performance.now();
  const duration = (t1 - t0).toFixed(2);

  console.log(`[MEASURE] ${label}: ${duration} ms`);

  return result;
}

/**
 * PortalProfiler Component
 *
 * Measures the time from component construction to first effect.
 * This gives you the initial load time for a portal/section of your app.
 *
 * Place this component near the root of your portal/section to measure overall load time.
 *
 * @param portalName - The name of the portal/section being measured
 *
 * Example usage:
 * @example
 * function AdminLayout() {
 *   return (
 *     <Tabs>
 *       <PortalProfiler portalName="Admin Portal" />
 *       // rest of layout
 *     </Tabs>
 *   );
 * }
 *
 * Example output:
 * [PORTAL LOADED] Admin Portal in 342.18 ms
 */
interface PortalProfilerProps {
  portalName: string;
}

export function PortalProfiler({ portalName }: PortalProfilerProps): null {
  // Record construction time
  const t0Ref = useRef(performance.now());

  useEffect(() => {
    if (!__DEV__) return;

    const t1 = performance.now();
    const loadTime = (t1 - t0Ref.current).toFixed(2);

    console.log(`[PORTAL LOADED] ${portalName} in ${loadTime} ms`);
  }, []); // Empty deps - only run once on mount

  // This component doesn't render anything
  return null;
}

/**
 * Helper: Log arbitrary events/checkpoints
 *
 * Use this for one-off logging needs or custom checkpoints.
 *
 * @param tag - A tag/category for the log
 * @param message - The message to log
 *
 * Example:
 * @example
 * logCheckpoint('DataFetch', 'Starting to fetch users...');
 *
 * Example output:
 * [CHECKPOINT][DataFetch] Starting to fetch users...
 */
export function logCheckpoint(tag: string, message: string): void {
  if (__DEV__) {
    console.log(`[CHECKPOINT][${tag}] ${message}`);
  }
}

/**
 * Helper: Measure async operations
 *
 * For measuring async operations like API calls, data fetching, etc.
 * Returns a Promise that resolves to the function's result.
 *
 * @param label - A descriptive label for the operation
 * @param fn - The async function to measure
 * @returns Promise resolving to fn's result
 *
 * Example usage:
 * @example
 * const data = await measureAsync('Fetch users', () => apiService.users.getUsers());
 *
 * Example output:
 * [MEASURE][ASYNC] Fetch users: 1234.56 ms
 */
export async function measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!__DEV__) {
    // In production, just execute the function without measurement
    return fn();
  }

  const t0 = performance.now();
  const result = await fn();
  const t1 = performance.now();
  const duration = (t1 - t0).toFixed(2);

  console.log(`[MEASURE][ASYNC] ${label}: ${duration} ms`);

  return result;
}

/**
 * useContextRenderLog
 *
 * Logs when a context consumer re-renders and shows what values changed.
 * Useful for debugging context re-render issues.
 *
 * @param name - The name/identifier for the context consumer
 * @param values - Object containing the context values to track
 *
 * Example usage:
 * @example
 * const { currentUser } = useAuth();
 * const { notifications } = useNotifications();
 * useContextRenderLog('Admin/Tenants narrow hooks', { currentUser, notifications });
 *
 * Example output:
 * [CONTEXT] Admin/Tenants narrow hooks (#1) changed: currentUser
 * [CONTEXT] Admin/Tenants narrow hooks (#2) changed: notifications
 */
export function useContextRenderLog(name: string, values: Record<string, any>): void {
  const renderCount = useRef(0);
  const prevValues = useRef<Record<string, any>>({});

  renderCount.current += 1;

  if (__DEV__) {
    const changedKeys: string[] = [];

    Object.keys(values).forEach((key) => {
      if (prevValues.current[key] !== values[key]) {
        changedKeys.push(key);
      }
    });

    if (changedKeys.length > 0) {
      console.log(
        `[CONTEXT] ${name} (#${renderCount.current}) changed: ${changedKeys.join(', ')}`
      );
    } else if (renderCount.current === 1) {
      console.log(`[CONTEXT] ${name} (#1) initial render`);
    } else {
      console.log(`[CONTEXT] ${name} (#${renderCount.current}) no changes (unnecessary re-render)`);
    }

    prevValues.current = values;
  }
}

/**
 * Type guard to ensure __DEV__ is always checked
 * All exports from this module are safe to use in production.
 */
export const IS_PROFILING_ENABLED = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
