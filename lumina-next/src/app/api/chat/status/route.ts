import { NextResponse } from "next/server";

export async function GET() {
  const hasRemoteProvider = Boolean(process.env.LUMINA_REMOTE_KUNDALI_URL);
  return NextResponse.json(
    {
      status: "degraded",
      message: "AI is available with occasional delays. Guided fallback is enabled.",
      remoteKundaliProviderConfigured: hasRemoteProvider,
    },
    { status: 200 },
  );
}

