import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Building, ServiceProviderProfile, UnitType } from '../../types';

/**
 * Local Storage Service
 *
 * Provides persistent storage for admin data using AsyncStorage.
 * Each admin user has their own isolated data scope.
 */

// Storage key prefixes
const STORAGE_KEYS = {
  BUILDINGS: 'buildings',
  USERS: 'users',
  SERVICE_PROVIDERS: 'service_providers',
  UNIT_TYPES: 'unit_types',
} as const;

/**
 * Get user-scoped storage key
 * Format: {userId}_{dataType}
 */
function getUserStorageKey(userId: string, dataType: keyof typeof STORAGE_KEYS): string {
  return `${userId}_${STORAGE_KEYS[dataType]}`;
}

/**
 * Generic save function for any data type
 */
async function saveData<T>(userId: string, dataType: keyof typeof STORAGE_KEYS, data: T[]): Promise<void> {
  try {
    const key = getUserStorageKey(userId, dataType);
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error(`Failed to save ${dataType} for user ${userId}:`, error);
    throw new Error(`Failed to save ${dataType}`);
  }
}

/**
 * Generic load function for any data type
 */
async function loadData<T>(userId: string, dataType: keyof typeof STORAGE_KEYS): Promise<T[]> {
  try {
    const key = getUserStorageKey(userId, dataType);
    const jsonValue = await AsyncStorage.getItem(key);

    if (jsonValue === null) {
      // No data stored yet - return empty array for new users
      return [];
    }

    return JSON.parse(jsonValue) as T[];
  } catch (error) {
    console.error(`Failed to load ${dataType} for user ${userId}:`, error);
    // Return empty array on error to prevent app crash
    return [];
  }
}

/**
 * Buildings Service
 */
export const buildingsStorage = {
  async save(userId: string, buildings: Building[]): Promise<void> {
    return saveData(userId, 'BUILDINGS', buildings);
  },

  async load(userId: string): Promise<Building[]> {
    return loadData<Building>(userId, 'BUILDINGS');
  },

  async add(userId: string, building: Building): Promise<Building[]> {
    const buildings = await this.load(userId);
    const updated = [...buildings, building];
    await this.save(userId, updated);
    return updated;
  },

  async update(userId: string, buildingId: string, updates: Partial<Building>): Promise<Building[]> {
    const buildings = await this.load(userId);
    const updated = buildings.map(b =>
      b.id === buildingId ? { ...b, ...updates } : b
    );
    await this.save(userId, updated);
    return updated;
  },

  async delete(userId: string, buildingId: string): Promise<Building[]> {
    const buildings = await this.load(userId);
    const updated = buildings.filter(b => b.id !== buildingId);
    await this.save(userId, updated);
    return updated;
  },
};

/**
 * Users Service
 */
export const usersStorage = {
  async save(userId: string, users: User[]): Promise<void> {
    return saveData(userId, 'USERS', users);
  },

  async load(userId: string): Promise<User[]> {
    return loadData<User>(userId, 'USERS');
  },

  async add(userId: string, user: User): Promise<User[]> {
    const users = await this.load(userId);
    const updated = [...users, user];
    await this.save(userId, updated);
    return updated;
  },

  async update(userId: string, targetUserId: string, updates: Partial<User>): Promise<User[]> {
    const users = await this.load(userId);
    const updated = users.map(u =>
      u.id === targetUserId ? { ...u, ...updates } : u
    );
    await this.save(userId, updated);
    return updated;
  },

  async delete(userId: string, targetUserId: string): Promise<User[]> {
    const users = await this.load(userId);
    const updated = users.filter(u => u.id !== targetUserId);
    await this.save(userId, updated);
    return updated;
  },
};

/**
 * Service Providers Service
 */
export const serviceProvidersStorage = {
  async save(userId: string, providers: ServiceProviderProfile[]): Promise<void> {
    return saveData(userId, 'SERVICE_PROVIDERS', providers);
  },

  async load(userId: string): Promise<ServiceProviderProfile[]> {
    return loadData<ServiceProviderProfile>(userId, 'SERVICE_PROVIDERS');
  },

  async add(userId: string, provider: ServiceProviderProfile): Promise<ServiceProviderProfile[]> {
    const providers = await this.load(userId);
    const updated = [...providers, provider];
    await this.save(userId, updated);
    return updated;
  },

  async update(userId: string, providerId: string, updates: Partial<ServiceProviderProfile>): Promise<ServiceProviderProfile[]> {
    const providers = await this.load(userId);
    const updated = providers.map(p =>
      p.id === providerId ? { ...p, ...updates } : p
    );
    await this.save(userId, updated);
    return updated;
  },

  async delete(userId: string, providerId: string): Promise<ServiceProviderProfile[]> {
    const providers = await this.load(userId);
    const updated = providers.filter(p => p.id !== providerId);
    await this.save(userId, updated);
    return updated;
  },
};

/**
 * Unit Types Service
 */
export const unitTypesStorage = {
  async save(userId: string, unitTypes: UnitType[]): Promise<void> {
    return saveData(userId, 'UNIT_TYPES', unitTypes);
  },

  async load(userId: string): Promise<UnitType[]> {
    return loadData<UnitType>(userId, 'UNIT_TYPES');
  },

  async add(userId: string, unitType: UnitType): Promise<UnitType[]> {
    const unitTypes = await this.load(userId);
    const updated = [...unitTypes, unitType];
    await this.save(userId, updated);
    return updated;
  },

  async update(userId: string, unitTypeId: string, updates: Partial<UnitType>): Promise<UnitType[]> {
    const unitTypes = await this.load(userId);
    const updated = unitTypes.map(ut =>
      ut.id === unitTypeId ? { ...ut, ...updates } : ut
    );
    await this.save(userId, updated);
    return updated;
  },

  async delete(userId: string, unitTypeId: string): Promise<UnitType[]> {
    const unitTypes = await this.load(userId);
    const updated = unitTypes.filter(ut => ut.id !== unitTypeId);
    await this.save(userId, updated);
    return updated;
  },
};

/**
 * Clear all data for a specific user
 * Useful for testing or user deletion
 */
export async function clearUserData(userId: string): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(getUserStorageKey(userId, 'BUILDINGS')),
      AsyncStorage.removeItem(getUserStorageKey(userId, 'USERS')),
      AsyncStorage.removeItem(getUserStorageKey(userId, 'SERVICE_PROVIDERS')),
      AsyncStorage.removeItem(getUserStorageKey(userId, 'UNIT_TYPES')),
    ]);
  } catch (error) {
    console.error(`Failed to clear data for user ${userId}:`, error);
    throw new Error('Failed to clear user data');
  }
}

/**
 * Check if user has any stored data
 */
export async function hasUserData(userId: string): Promise<boolean> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.some(key => key.startsWith(`${userId}_`));
  } catch (error) {
    console.error(`Failed to check data for user ${userId}:`, error);
    return false;
  }
}
