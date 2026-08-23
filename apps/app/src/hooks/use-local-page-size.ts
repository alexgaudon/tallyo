import { useEffect, useState } from "react";

const LOCAL_STORAGE_KEY = "transactions-page-size";
const DEFAULT_PAGE_SIZE = 10;

const VALID_PAGE_OPTIONS = [10, 25, 50, 100];

function isValidPageSize(size: number) {
  return VALID_PAGE_OPTIONS.includes(size);
}

export function useLocalPageSize() {
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // Load page size from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = Number.parseInt(stored, 10);
        if (isValidPageSize(parsed)) {
          setPageSize(parsed);
        } else {
          setPageSize(DEFAULT_PAGE_SIZE);
        }
      } else {
        setPageSize(DEFAULT_PAGE_SIZE);
      }
    } catch (error) {
      // Ignore local storage errors
      console.warn("Failed to read page size from local storage:", error);
      setPageSize(DEFAULT_PAGE_SIZE);
    }
  }, []);

  const savePageSize = (newPageSize: number) => {
    if (isValidPageSize(newPageSize)) {
      setPageSize(newPageSize);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, newPageSize.toString());
      } catch (error) {
        // Ignore local storage errors
        console.warn("Failed to save page size to local storage:", error);
      }
    } else {
      setPageSize(DEFAULT_PAGE_SIZE);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, DEFAULT_PAGE_SIZE.toString());
      } catch (error) {
        // Ignore local storage errors
        console.warn("Failed to save page size to local storage:", error);
      }
    }
  };

  return { pageSize, savePageSize };
}
