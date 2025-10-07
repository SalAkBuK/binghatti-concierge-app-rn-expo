import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type SetValue<T> = (value: T | ((prevValue: T) => T)) => Promise<void>;

export const useAsyncStorage = <T>(
  key: string,
  initialValue: T,
): [T, SetValue<T>, boolean] => {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load value from AsyncStorage on mount
  useEffect(() => {
    const loadStoredValue = async (): Promise<void> => {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item !== null) {
          const parsedValue = JSON.parse(item) as T;
          setStoredValue(parsedValue);
        }
      } catch (error) {
        console.error(`Error loading ${key} from AsyncStorage:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredValue();
  }, [key]);

  // Wrap setValue in useCallback to ensure stable reference
  const setValue: SetValue<T> = useCallback(async (value) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      await AsyncStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error saving ${key} to AsyncStorage:`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue, isLoading];
};
