import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { CurrentKundaliResponse, KundaliResult } from "@/types/lumina";

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    const response: CurrentKundaliResponse = {
      success: false,
      message: "No session found",
    };
    return NextResponse.json(response, { status: 404 });
  }

  try {
    const reading = await db.kundaliReading.findUnique({
      where: { sessionId },
    });

    if (!reading) {
      const response: CurrentKundaliResponse = {
        success: false,
        message: "No kundali reading for this session",
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: CurrentKundaliResponse = {
      success: true,
      sessionId,
      result: reading.resultJson as KundaliResult,
    };

    return NextResponse.json(response, { status: 200 });
  } catch {
    const response: CurrentKundaliResponse = {
      success: false,
      message: "Failed to load kundali reading from storage",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

