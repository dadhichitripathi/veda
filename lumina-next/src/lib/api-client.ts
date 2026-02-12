import type {
  CurrentKundaliResponse,
  CurrentOnboardingResponse,
  KundaliGenerateResponse,
  OnboardingPayload,
  SaveOnboardingResponse,
} from "@/types/lumina";
import type { FieldErrors } from "@/lib/validation";

export async function saveOnboarding(
  payload: OnboardingPayload,
): Promise<
  | SaveOnboardingResponse
  | {
      success: false;
      message: string;
      errors?: FieldErrors;
    }
> {
  const response = await fetch("/api/onboarding/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await response.json()) as SaveOnboardingResponse | {
    success: false;
    message: string;
    errors?: FieldErrors;
  };
}

export async function getCurrentOnboarding(): Promise<CurrentOnboardingResponse> {
  const response = await fetch("/api/onboarding/current", {
    method: "GET",
    cache: "no-store",
  });
  return (await response.json()) as CurrentOnboardingResponse;
}

export async function generateKundali(
  payload: OnboardingPayload,
): Promise<KundaliGenerateResponse | { success: false; message: string }> {
  const response = await fetch("/api/kundali/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await response.json()) as KundaliGenerateResponse | { success: false; message: string };
}

export async function getCurrentKundali(): Promise<CurrentKundaliResponse> {
  const response = await fetch("/api/kundali/current", {
    method: "GET",
    cache: "no-store",
  });
  return (await response.json()) as CurrentKundaliResponse;
}

