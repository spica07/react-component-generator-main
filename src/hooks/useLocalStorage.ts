import { useState, useCallback } from 'react';
import { safeJsonParse, safeJsonStringify, isLocalStorageAvailable } from '../utils/localStorage';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!isLocalStorageAvailable()) return initialValue;
    const raw = localStorage.getItem(key);
    if (raw === null) return initialValue;
    return safeJsonParse<T>(raw) ?? initialValue;
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = typeof value === 'function'
          ? (value as (prev: T) => T)(prev)
          : value;
        if (isLocalStorageAvailable()) {
          localStorage.setItem(key, safeJsonStringify(next));
        }
        return next;
      });
    },
    [key]
  );

  const remove = useCallback(() => {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    }
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, remove];
}
