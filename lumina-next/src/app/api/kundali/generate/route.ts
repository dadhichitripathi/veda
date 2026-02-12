import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { recordAnalyticsEvent } from "@/lib/analytics-server";
import { db } from "@/lib/db";
import { resolveKundali } from "@/lib/kundali-provider";
import { resolveSessionId, setSessionCookie } from "@/lib/session";
import { validatePayload } from "@/lib/validation";
import type { KundaliGenerateResponse, OnboardingPayload } from "@/types/lumina";

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

    const onboardingExists = await db.onboarding.findUnique({
      where: { sessionId },
    });

    if (!onboardingExists) {
      await db.onboarding.create({
        data: {
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
    }

    const result = await resolveKundali(payload);
    const resultJson = JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue;

    await db.kundaliReading.upsert({
      where: { sessionId },
      update: {
        resultJson,
        source: result.source,
      },
      create: {
        sessionId,
        resultJson,
        source: result.source,
      },
    });

    await recordAnalyticsEvent({
      eventName: "lumina_kundali_generated",
      sessionId,
      path: request.nextUrl.pathname,
      metadata: {
        source: result.source,
      },
    });

    const response: KundaliGenerateResponse = {
      success: true,
      sessionId,
      result,
    };

    const nextResponse = NextResponse.json(response, { status: 200 });
    setSessionCookie(nextResponse, sessionId);
    return nextResponse;
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to generate kundali at this time." },
      { status: 500 },
    );
  }
}

