import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET() {
  try {
    const grouped = await db.analyticsEvent.groupBy({
      by: ["eventName"],
      _count: {
        _all: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        events: grouped
          .map((item) => ({
            eventName: item.eventName,
            count: item._count._all,
          }))
          .sort((a, b) => b.count - a.count),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch analytics summary",
      },
      { status: 500 },
    );
  }
}

