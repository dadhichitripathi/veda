import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        database: "ok",
        remoteProviderConfigured: Boolean(process.env.LUMINA_REMOTE_KUNDALI_URL),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "error",
      },
      { status: 500 },
    );
  }
}

