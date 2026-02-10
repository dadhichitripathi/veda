import { NextResponse } from "next/server";

import { validatePayload } from "@/lib/validation";
import type { OnboardingPayload, SaveOnboardingResponse } from "@/types/lumina";

export async function POST(request: Request) {
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

  // Simulate a short network/database delay to mimic production behavior.
  await new Promise((resolve) => setTimeout(resolve, 350));

  const response: SaveOnboardingResponse = {
    success: true,
    message: "Onboarding saved successfully",
    sessionId: payload.sessionId ?? `lumina-${Date.now().toString(36)}`,
  };

  return NextResponse.json(response, { status: 200 });
}

