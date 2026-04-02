import { useCallback } from "react";
import { usePersistedValuesStore } from "@/store/persistedValuesStore";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const stored = usePersistedValuesStore((s) => s.values[key] as T | undefined);
  const setStoreValue = usePersistedValuesStore((s) => s.setValue);
  const removeStoreValue = usePersistedValuesStore((s) => s.removeValue);

  const value = stored !== undefined ? stored : initialValue;

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(value) : next;
      try {
        setStoreValue(key, resolved);
      } catch {
        // Storage quota or private mode — persist middleware may fail on write
      }
    },
    [key, setStoreValue, value],
  );

  const removeValue = useCallback(() => {
    removeStoreValue(key);
  }, [key, removeStoreValue]);

  return { value, setValue, removeValue };
}
