import { NextResponse } from "next/server";

import { generateKundali } from "@/lib/kundali";
import { validatePayload } from "@/lib/validation";
import type { KundaliGenerateResponse, OnboardingPayload } from "@/types/lumina";

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

  await new Promise((resolve) => setTimeout(resolve, 850));
  const result = generateKundali(payload);

  const response: KundaliGenerateResponse = {
    success: true,
    result,
  };

  return NextResponse.json(response, { status: 200 });
}

