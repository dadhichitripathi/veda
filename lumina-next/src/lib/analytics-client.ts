type AnalyticsPayload = {
  eventName: string;
  path?: string;
  metadata?: Record<string, unknown>;
};

export async function trackEvent({
  eventName,
  path,
  metadata,
}: AnalyticsPayload): Promise<void> {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventName,
        path: path ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
        metadata: metadata ?? {},
      }),
      keepalive: true,
    });
  } catch {
    // Ignore analytics failures in UI.
  }
}

