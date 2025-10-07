// Simple in-memory caching for API responses

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
}

export class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      ...config,
    };
  }

  /**
   * Generate cache key from URL and parameters
   */
  private generateKey(url: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : "";
    return `${url}:${paramString}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Enforce cache size limit
   */
  private enforceMaxSize(): void {
    if (this.cache.size > this.config.maxSize) {
      // Remove oldest entries first
      const entries = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp,
      );

      const toRemove = entries.slice(0, entries.length - this.config.maxSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Get cached data if available and valid
   */
  get<T>(url: string, params?: any): T | null {
    const key = this.generateKey(url, params);
    const entry = this.cache.get(key);

    if (entry && this.isValid(entry)) {
      return entry.data;
    }

    // Clean up expired entry
    if (entry) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * Store data in cache
   */
  set<T>(url: string, data: T, params?: any, ttl?: number): void {
    const key = this.generateKey(url, params);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
    };

    this.cache.set(key, entry);

    // Perform maintenance
    this.cleanup();
    this.enforceMaxSize();
  }

  /**
   * Clear specific cache entry
   */
  delete(url: string, params?: any): void {
    const key = this.generateKey(url, params);
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    this.cleanup();
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        age: Date.now() - entry.timestamp,
      })),
    };
  }

  /**
   * Stale-while-revalidate pattern
   * Returns cached data immediately if available, but triggers background refresh
   */
  async getStaleWhileRevalidate<T>(
    url: string,
    fetchFn: () => Promise<T>,
    params?: any,
    ttl?: number,
  ): Promise<T> {
    const cached = this.get<T>(url, params);

    if (cached) {
      // Return cached data immediately
      setImmediate(async () => {
        try {
          // Background refresh
          const fresh = await fetchFn();
          this.set(url, fresh, params, ttl);
        } catch (error) {
          console.warn("Background refresh failed:", error);
        }
      });

      return cached;
    }

    // No cache, fetch fresh data
    const fresh = await fetchFn();
    this.set(url, fresh, params, ttl);
    return fresh;
  }
}

// Default cache instance with reasonable defaults
export const apiCache = new ApiCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 50,
});

// Cache configurations for different endpoint types
export const CACHE_CONFIGS = {
  // Static data that rarely changes
  units: { ttl: 60 * 60 * 1000 }, // 1 hour
  towers: { ttl: 60 * 60 * 1000 }, // 1 hour
  userProfile: { ttl: 15 * 60 * 1000 }, // 15 minutes

  // Dynamic data that changes more frequently
  requests: { ttl: 2 * 60 * 1000 }, // 2 minutes
  notifications: { ttl: 30 * 1000 }, // 30 seconds

  // Real-time data - very short cache
  unreadCount: { ttl: 10 * 1000 }, // 10 seconds
} as const;
