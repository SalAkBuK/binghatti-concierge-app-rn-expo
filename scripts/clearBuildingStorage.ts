/**
 * Utility script to clear building-related storage
 * Run this to remove cached mock building data from AsyncStorage
 *
 * Usage:
 * 1. Import this in your app temporarily
 * 2. Call clearBuildingStorage() on app start
 * 3. Remove the import after running once
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearBuildingStorage() {
  try {
    console.log('[ClearStorage] Starting to clear building-related data...');

    // Get all keys
    const allKeys = await AsyncStorage.getAllKeys();

    // Find all building-related keys
    const buildingKeys = allKeys.filter(key =>
      key.includes('buildings') ||
      key.includes('building_') ||
      key.includes('BUILDINGS') ||
      key.includes('units') ||
      key.includes('leases') ||
      key.includes('employees')
    );

    console.log('[ClearStorage] Found keys to clear:', buildingKeys);

    // Remove all building-related data
    if (buildingKeys.length > 0) {
      await AsyncStorage.multiRemove(buildingKeys);
      console.log('[ClearStorage] Successfully cleared', buildingKeys.length, 'keys');
    } else {
      console.log('[ClearStorage] No building data found to clear');
    }

    console.log('[ClearStorage] Complete!');
    return true;
  } catch (error) {
    console.error('[ClearStorage] Failed to clear building storage:', error);
    return false;
  }
}

// Alternative: Clear ALL AsyncStorage (nuclear option)
export async function clearAllStorage() {
  try {
    console.log('[ClearStorage] WARNING: Clearing ALL AsyncStorage data...');
    await AsyncStorage.clear();
    console.log('[ClearStorage] All data cleared!');
    return true;
  } catch (error) {
    console.error('[ClearStorage] Failed to clear all storage:', error);
    return false;
  }
}
