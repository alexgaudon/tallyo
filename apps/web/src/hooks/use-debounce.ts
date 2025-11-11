import { useMemo, useRef, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const previousValueRef = useRef<T>(value);

  // Update debounced value when input value changes
  useMemo(() => {
    // Only debounce if the value actually changed
    if (previousValueRef.current !== value) {
      previousValueRef.current = value;

      // Clear the previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set a new timeout
      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
    }
  }, [value, delay]);

  return debouncedValue;
}
