import type { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "lumina_session_id";

export function createSessionId(): string {
  if (typeof crypto?.randomUUID === "function") {
    return `lumina-${crypto.randomUUID()}`;
  }

  return `lumina-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function resolveSessionId(request: NextRequest, preferred?: string): string {
  if (preferred && preferred.length > 0) return preferred;

  const fromCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (fromCookie && fromCookie.length > 0) return fromCookie;

  return createSessionId();
}

export function setSessionCookie(response: NextResponse, sessionId: string): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

