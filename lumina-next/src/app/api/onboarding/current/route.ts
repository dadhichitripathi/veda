import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { CurrentOnboardingResponse, OnboardingPayload } from "@/types/lumina";

function normalizeGender(value: string): OnboardingPayload["gender"] {
  if (value === "male" || value === "female" || value === "other") {
    return value;
  }
  return "other";
}

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    const response: CurrentOnboardingResponse = {
      success: false,
      message: "No session found",
    };
    return NextResponse.json(response, { status: 404 });
  }

  try {
    const onboarding = await db.onboarding.findUnique({
      where: { sessionId },
    });

    if (!onboarding) {
      const response: CurrentOnboardingResponse = {
        success: false,
        message: "No onboarding data for this session",
      };
      return NextResponse.json(response, { status: 404 });
    }

    const payload: OnboardingPayload = {
      name: onboarding.name,
      gender: normalizeGender(onboarding.gender),
      dateOfBirth: onboarding.dateOfBirth,
      timeOfBirth: onboarding.timeOfBirth,
      placeOfBirth: onboarding.placeOfBirth,
      countryCode: onboarding.countryCode,
      phone: onboarding.phone,
      consent: onboarding.consent,
      sessionId,
    };

    const response: CurrentOnboardingResponse = {
      success: true,
      sessionId,
      onboarding: payload,
    };

    return NextResponse.json(response, { status: 200 });
  } catch {
    const response: CurrentOnboardingResponse = {
      success: false,
      message: "Failed to load onboarding from storage",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

