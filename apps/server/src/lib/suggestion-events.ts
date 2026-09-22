/**
 * In-memory pub/sub for AI category suggestions, keyed by user. The worker
 * publishes here; the SSE route subscribes. Single-process only — if the server
 * is ever scaled out this needs a shared bus (Postgres NOTIFY or similar).
 */
export interface SuggestionEvent {
  transactionId: string;
  suggestedCategoryId: string;
  suggestedCategoryConfidence: number;
}

type Subscriber = (event: SuggestionEvent) => void;

const subscribers = new Map<string, Set<Subscriber>>();

/** Subscribe to a user's suggestion events. Returns an unsubscribe function. */
export function subscribeToSuggestions(
  userId: string,
  subscriber: Subscriber,
): () => void {
  let set = subscribers.get(userId);
  if (!set) {
    set = new Set();
    subscribers.set(userId, set);
  }
  set.add(subscriber);

  return () => {
    const current = subscribers.get(userId);
    if (!current) return;
    current.delete(subscriber);
    if (current.size === 0) {
      subscribers.delete(userId);
    }
  };
}

export function publishSuggestion(
  userId: string,
  event: SuggestionEvent,
): void {
  const set = subscribers.get(userId);
  if (!set) return;
  for (const subscriber of set) {
    try {
      subscriber(event);
    } catch {
      // A failing subscriber must not break the others.
    }
  }
}
