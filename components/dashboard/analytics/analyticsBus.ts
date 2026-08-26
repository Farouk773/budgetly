const EVENT_NAME = "analytics:refresh";

/** Call after any mutation that should be reflected on an analytics curve
 * (a loan payment, a savings contribution, a deletion...) so a chart already
 * mounted on the same page refetches immediately instead of only updating on
 * the next full page load. Charts fetched via useAnalyticsData subscribe to
 * this automatically. */
export function notifyAnalyticsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

export function subscribeAnalyticsChanged(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}
