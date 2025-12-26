/**
 * Cache Service with TTL (Time-To-Live) support
 * Provides intelligent caching with automatic expiration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheService {
  private prefix = '@cache:';

  /**
   * Save data to cache with TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttlMinutes TTL in minutes (default: 5 minutes)
   */
  async set<T>(key: string, data: T, ttlMinutes: number = 5): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlMinutes * 60 * 1000, // Convert minutes to milliseconds
      };
      await AsyncStorage.setItem(`${this.prefix}${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error(`[CacheService] Failed to set cache for ${key}:`, error);
    }
  }

  /**
   * Get data from cache if not expired
   * @param key Cache key
   * @returns Cached data or null if expired/not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.prefix}${key}`);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();
      const age = now - entry.timestamp;

      // Check if cache has expired
      if (age > entry.ttl) {
        console.log(`[CacheService] Cache expired for ${key} (age: ${Math.round(age / 1000)}s, ttl: ${Math.round(entry.ttl / 1000)}s)`);
        await this.remove(key); // Clean up expired cache
        return null;
      }

      console.log(`[CacheService] Cache hit for ${key} (age: ${Math.round(age / 1000)}s, remaining: ${Math.round((entry.ttl - age) / 1000)}s)`);
      return entry.data;
    } catch (error) {
      console.error(`[CacheService] Failed to get cache for ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove specific cache entry
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.prefix}${key}`);
    } catch (error) {
      console.error(`[CacheService] Failed to remove cache for ${key}:`, error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.prefix));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`[CacheService] Cleared ${cacheKeys.length} cache entries`);
    } catch (error) {
      console.error('[CacheService] Failed to clear all cache:', error);
    }
  }

  /**
   * Get cache metadata (age, TTL, etc.)
   */
  async getMetadata(key: string): Promise<{ age: number; ttl: number; expired: boolean } | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.prefix}${key}`);
      if (!cached) return null;

      const entry: CacheEntry<any> = JSON.parse(cached);
      const now = Date.now();
      const age = now - entry.timestamp;
      const expired = age > entry.ttl;

      return { age, ttl: entry.ttl, expired };
    } catch (error) {
      console.error(`[CacheService] Failed to get metadata for ${key}:`, error);
      return null;
    }
  }
}

export const cacheService = new CacheService();

// Cache Keys Constants
export const CACHE_KEYS = {
  BUILDINGS: (userId: string) => `buildings_${userId}`,
  BUILDING_MANAGERS: (buildingId: string) => `building_managers_${buildingId}`,
  ADMIN_BUILDINGS: (adminId: number) => `admin_buildings_${adminId}`,
  USERS: (userId: string) => `users_${userId}`,
} as const;

// Default TTL values (in minutes)
export const DEFAULT_TTL = {
  BUILDINGS: 5, // 5 minutes
  MANAGERS: 10, // 10 minutes
  USERS: 15, // 15 minutes
} as const;
