import { STORAGE_KEYS } from "@/lib/constants";
import type { KundaliResult, OnboardingPayload } from "@/types/lumina";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function saveOnboardingLocal(payload: OnboardingPayload): void {
  if (!hasWindow()) return;
  window.localStorage.setItem(STORAGE_KEYS.onboarding, JSON.stringify(payload));
}

export function getOnboardingLocal(): OnboardingPayload | null {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEYS.onboarding);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OnboardingPayload;
  } catch {
    return null;
  }
}

export function saveResultLocal(result: KundaliResult): void {
  if (!hasWindow()) return;
  window.localStorage.setItem(STORAGE_KEYS.result, JSON.stringify(result));
}

export function getResultLocal(): KundaliResult | null {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEYS.result);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as KundaliResult;
  } catch {
    return null;
  }
}

export function setCuriosityLocal(value: string): void {
  if (!hasWindow()) return;
  window.localStorage.setItem(STORAGE_KEYS.curiosity, value);
}

export function getCuriosityLocal(): string {
  if (!hasWindow()) return "";
  return window.localStorage.getItem(STORAGE_KEYS.curiosity) ?? "";
}

export function clearLuminaLocalState(): void {
  if (!hasWindow()) return;
  window.localStorage.removeItem(STORAGE_KEYS.onboarding);
  window.localStorage.removeItem(STORAGE_KEYS.result);
  window.localStorage.removeItem(STORAGE_KEYS.curiosity);
}

