import { NextRequest, NextResponse } from "next/server";

import { recordAnalyticsEvent } from "@/lib/analytics-server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

type AnalyticsRequestBody = {
  eventName?: string;
  path?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  let body: AnalyticsRequestBody;

  try {
    body = (await request.json()) as AnalyticsRequestBody;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON payload" }, { status: 400 });
  }

  if (!body.eventName || body.eventName.trim().length === 0) {
    return NextResponse.json(
      { success: false, message: "eventName is required" },
      { status: 400 },
    );
  }

  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
  await recordAnalyticsEvent({
    eventName: body.eventName,
    sessionId,
    path: body.path ?? null,
    metadata: body.metadata ?? {},
  });

  return NextResponse.json({ success: true }, { status: 200 });
}

