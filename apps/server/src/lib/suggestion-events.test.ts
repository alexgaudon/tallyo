import { afterEach, describe, expect, it } from "vitest";
import {
  publishSuggestion,
  type SuggestionEvent,
  subscribeToSuggestions,
} from "@/lib/suggestion-events";

const event = (transactionId: string): SuggestionEvent => ({
  transactionId,
  suggestedCategoryId: "cat-1",
  suggestedCategoryConfidence: 0.9,
  suggestedMerchantId: null,
  suggestedMerchantConfidence: null,
});

describe("suggestion events", () => {
  const unsubscribers: Array<() => void> = [];

  afterEach(() => {
    while (unsubscribers.length > 0) unsubscribers.pop()?.();
  });

  const subscribe = (userId: string, fn: (event: SuggestionEvent) => void) => {
    const unsubscribe = subscribeToSuggestions(userId, fn);
    unsubscribers.push(unsubscribe);
    return unsubscribe;
  };

  it("delivers an event to a subscriber for the same user", () => {
    const received: SuggestionEvent[] = [];
    subscribe("user-a", (e) => received.push(e));

    publishSuggestion("user-a", event("t1"));

    expect(received).toHaveLength(1);
    expect(received[0].transactionId).toBe("t1");
  });

  it("does not deliver to a different user", () => {
    const received: SuggestionEvent[] = [];
    subscribe("user-a", (e) => received.push(e));

    publishSuggestion("user-b", event("t1"));

    expect(received).toHaveLength(0);
  });

  it("delivers to every subscriber of a user", () => {
    const first: SuggestionEvent[] = [];
    const second: SuggestionEvent[] = [];
    subscribe("user-a", (e) => first.push(e));
    subscribe("user-a", (e) => second.push(e));

    publishSuggestion("user-a", event("t1"));

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
  });

  it("stops delivering after unsubscribe", () => {
    const received: SuggestionEvent[] = [];
    const unsubscribe = subscribe("user-a", (e) => received.push(e));

    publishSuggestion("user-a", event("t1"));
    unsubscribe();
    publishSuggestion("user-a", event("t2"));

    expect(received.map((e) => e.transactionId)).toEqual(["t1"]);
  });

  it("is a no-op when nobody is subscribed", () => {
    expect(() => publishSuggestion("user-nobody", event("t1"))).not.toThrow();
  });

  it("keeps delivering when one subscriber throws", () => {
    const received: SuggestionEvent[] = [];
    subscribe("user-a", () => {
      throw new Error("boom");
    });
    subscribe("user-a", (e) => received.push(e));

    expect(() => publishSuggestion("user-a", event("t1"))).not.toThrow();
    expect(received).toHaveLength(1);
  });
});
