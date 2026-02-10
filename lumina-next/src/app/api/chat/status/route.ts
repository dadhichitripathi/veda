import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "degraded",
      message: "AI is available with occasional delays. Guided fallback is enabled.",
    },
    { status: 200 },
  );
}

