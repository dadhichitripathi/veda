import { NextRequest, NextResponse } from "next/server";

import { recordAnalyticsEvent } from "@/lib/analytics-server";
import { db } from "@/lib/db";
import { resolveSessionId, setSessionCookie } from "@/lib/session";
import { validatePayload } from "@/lib/validation";
import type { OnboardingPayload, SaveOnboardingResponse } from "@/types/lumina";

export async function POST(request: NextRequest) {
  let payload: OnboardingPayload;

  try {
    payload = (await request.json()) as OnboardingPayload;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const errors = validatePayload(payload);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Validation failed",
        errors,
      },
      { status: 400 },
    );
  }

  const sessionId = resolveSessionId(request, payload.sessionId);

  try {
    await db.session.upsert({
      where: { id: sessionId },
      update: {},
      create: { id: sessionId },
    });

    await db.onboarding.upsert({
      where: { sessionId },
      update: {
        name: payload.name.trim(),
        gender: payload.gender,
        dateOfBirth: payload.dateOfBirth,
        timeOfBirth: payload.timeOfBirth,
        placeOfBirth: payload.placeOfBirth.trim(),
        countryCode: payload.countryCode,
        phone: payload.phone,
        consent: payload.consent,
      },
      create: {
        sessionId,
        name: payload.name.trim(),
        gender: payload.gender,
        dateOfBirth: payload.dateOfBirth,
        timeOfBirth: payload.timeOfBirth,
        placeOfBirth: payload.placeOfBirth.trim(),
        countryCode: payload.countryCode,
        phone: payload.phone,
        consent: payload.consent,
      },
    });

    await recordAnalyticsEvent({
      eventName: "lumina_onboarding_saved",
      sessionId,
      path: request.nextUrl.pathname,
    });

    const response: SaveOnboardingResponse = {
      success: true,
      message: "Onboarding saved successfully",
      sessionId,
      persistedAt: new Date().toISOString(),
    };

    const nextResponse = NextResponse.json(response, { status: 200 });
    setSessionCookie(nextResponse, sessionId);
    return nextResponse;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Could not persist onboarding data right now. Please retry.",
      },
      { status: 500 },
    );
  }
}

