const PREFERRED_PAGE_SIZE_KEY = "tallyo.preferredPageSize";

export const getPreferredPageSize = (): number => {
  if (typeof window === "undefined") return 10;
  try {
    const stored = localStorage.getItem(PREFERRED_PAGE_SIZE_KEY);
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (parsed >= 1 && parsed <= 100) {
        return parsed;
      }
    }
  } catch {
    // If localStorage fails, use default
  }
  return 10;
};
