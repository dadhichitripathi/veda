import { db } from "@/lib/db";

type AnalyticsInput = {
  eventName: string;
  sessionId?: string | null;
  path?: string | null;
  metadata?: unknown;
};

export async function recordAnalyticsEvent(input: AnalyticsInput): Promise<void> {
  try {
    if (input.sessionId) {
      await db.session.upsert({
        where: { id: input.sessionId },
        update: {},
        create: { id: input.sessionId },
      });
    }

    await db.analyticsEvent.create({
      data: {
        eventName: input.eventName,
        sessionId: input.sessionId ?? null,
        path: input.path ?? null,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null,
      },
    });
  } catch {
    // Analytics should not break product behavior.
  }
}

