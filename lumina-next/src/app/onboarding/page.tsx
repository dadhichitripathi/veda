"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics-client";
import { getCurrentOnboarding, saveOnboarding } from "@/lib/api-client";
import { CITY_HINTS, COUNTRY_CODES } from "@/lib/constants";
import { getOnboardingLocal, saveOnboardingLocal } from "@/lib/storage";
import { validateField, validatePayload, type FieldErrors } from "@/lib/validation";
import type { OnboardingPayload, SaveOnboardingResponse } from "@/types/lumina";

type StatusTone = "muted" | "ok" | "warn" | "error";

type StatusState = {
  tone: StatusTone;
  message: string;
};

const DEFAULT_FORM: OnboardingPayload = {
  name: "",
  gender: "male",
  dateOfBirth: "",
  timeOfBirth: "",
  placeOfBirth: "",
  countryCode: "+91",
  phone: "",
  consent: false,
};

export default function OnboardingPage() {
  const router = useRouter();
  const trackedFieldErrors = useRef<Set<string>>(new Set());

  const [form, setForm] = useState<OnboardingPayload>(DEFAULT_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<StatusState>({
    tone: "muted",
    message: "Fill details to continue.",
  });
  const [saving, setSaving] = useState(false);
  const [retryVisible, setRetryVisible] = useState(false);

  const canSubmit = useMemo(
    () => !saving && Object.keys(validatePayload(form)).length === 0,
    [form, saving],
  );

  useEffect(() => {
    void trackEvent({ eventName: "lumina_onboarding_started" });

    let mounted = true;
    const hydrateExisting = async () => {
      const [serverData, localData] = await Promise.all([
        getCurrentOnboarding().catch(() => null),
        Promise.resolve(getOnboardingLocal()),
      ]);

      if (!mounted) return;
      const resolved =
        serverData && serverData.success ? serverData.onboarding : localData;

      if (!resolved) return;

      window.setTimeout(() => {
        if (!mounted) return;
        setForm(resolved);
        setStatus({
          tone: "muted",
          message: "Loaded your previous details. You can edit and continue.",
        });
        void trackEvent({
          eventName: "lumina_onboarding_prefilled",
          metadata: {
            source: serverData && serverData.success ? "server" : "local",
          },
        });
      }, 0);
    };

    void hydrateExisting();

    return () => {
      mounted = false;
    };
  }, []);

  const onFieldChange = (
    field: keyof OnboardingPayload,
    value: string | boolean,
  ): void => {
    const sanitizedValue =
      field === "phone" && typeof value === "string"
        ? value.replace(/\D/g, "").slice(0, 15)
        : value;

    const updated = {
      ...form,
      [field]: sanitizedValue,
    };
    setForm(updated);

    const message = validateField(field, updated[field], updated);
    setErrors((prev) => ({
      ...prev,
      [field]: message || undefined,
    }));

    if (message && !trackedFieldErrors.current.has(field)) {
      trackedFieldErrors.current.add(field);
      void trackEvent({
        eventName: "lumina_field_error",
        metadata: {
          field,
          message,
        },
      });
    }
  };

  const submitSave = async (maxRetries: number): Promise<void> => {
    setSaving(true);
    setRetryVisible(false);
    setStatus({ tone: "muted", message: "Saving your details securely..." });

    let attempt = 0;
    let lastError = "Unknown save error";
    const basePayload = { ...form };

    while (attempt <= maxRetries) {
      attempt += 1;

      if (attempt > 1) {
        setStatus({
          tone: "warn",
          message: `Retrying save (attempt ${attempt}/${maxRetries + 1})...`,
        });
      }

      try {
        const json = (await saveOnboarding(basePayload)) as
          | SaveOnboardingResponse
          | { success: false; message: string; errors?: FieldErrors };

        if (!json.success) {
          if ("errors" in json && json.errors) setErrors(json.errors);
          lastError = json.message || "Could not save details";
          throw new Error(lastError);
        }

        const payloadWithSession: OnboardingPayload = {
          ...basePayload,
          sessionId: json.sessionId,
        };
        saveOnboardingLocal(payloadWithSession);

        setStatus({
          tone: "ok",
          message: "Saved successfully. Preparing your kundali...",
        });
        void trackEvent({
          eventName: "lumina_onboarding_submit_success",
          metadata: {
            sessionId: json.sessionId,
          },
        });
        setSaving(false);
        router.push("/crafting");
        return;
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
        if (attempt <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        }
      }
    }

    setSaving(false);
    setRetryVisible(true);
    setStatus({
      tone: "error",
      message: `Could not save data. ${lastError}. Please retry.`,
    });
    void trackEvent({
      eventName: "lumina_onboarding_submit_failed",
      metadata: {
        reason: lastError,
      },
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldErrors = validatePayload(form);
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      setStatus({
        tone: "warn",
        message: "Please fix highlighted fields before continuing.",
      });
      void trackEvent({
        eventName: "lumina_onboarding_validation_failed",
        metadata: {
          errorCount: Object.keys(fieldErrors).length,
        },
      });
      return;
    }

    await submitSave(2);
  };

  return (
    <main className="lumina-shell">
      <section className="lumina-card">
        <p className="lumina-eyebrow">Vedanga Lumina</p>
        <h1 className="text-2xl font-semibold">Step 1: Confirm your details</h1>
        <p className="mt-3 text-[var(--muted)]">
          Takes about 2 minutes. Your data is used only to generate personalized
          Vedic insights.
        </p>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit} noValidate>
          <FormField
            label="Full name"
            field="name"
            error={errors.name}
            className="md:col-span-1"
          >
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={(event) => onFieldChange("name", event.target.value)}
              onBlur={(event) => onFieldChange("name", event.target.value)}
              placeholder="Your name"
            />
          </FormField>

          <FormField
            label="Gender"
            field="gender"
            error={errors.gender}
            className="md:col-span-1"
          >
            <select
              id="gender"
              name="gender"
              value={form.gender}
              onChange={(event) =>
                onFieldChange("gender", event.target.value as OnboardingPayload["gender"])
              }
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </FormField>

          <FormField
            label="Date of birth"
            field="dateOfBirth"
            error={errors.dateOfBirth}
            className="md:col-span-1"
          >
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={(event) => onFieldChange("dateOfBirth", event.target.value)}
              onBlur={(event) => onFieldChange("dateOfBirth", event.target.value)}
            />
          </FormField>

          <FormField
            label="Birth time"
            field="timeOfBirth"
            error={errors.timeOfBirth}
            className="md:col-span-1"
          >
            <input
              id="timeOfBirth"
              name="timeOfBirth"
              type="time"
              value={form.timeOfBirth}
              onChange={(event) => onFieldChange("timeOfBirth", event.target.value)}
              onBlur={(event) => onFieldChange("timeOfBirth", event.target.value)}
            />
          </FormField>

          <FormField
            label="Birth city"
            field="placeOfBirth"
            error={errors.placeOfBirth}
            hint="Type at least 2 letters for suggestions."
            className="md:col-span-2"
          >
            <>
              <input
                id="placeOfBirth"
                name="placeOfBirth"
                value={form.placeOfBirth}
                list="city-suggestions"
                placeholder="City, Country"
                onChange={(event) => onFieldChange("placeOfBirth", event.target.value)}
                onBlur={(event) => onFieldChange("placeOfBirth", event.target.value)}
              />
              <datalist id="city-suggestions">
                {CITY_HINTS.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </>
          </FormField>

          <FormField
            label="Country code"
            field="countryCode"
            error={errors.countryCode}
            className="md:col-span-1"
          >
            <select
              id="countryCode"
              name="countryCode"
              value={form.countryCode}
              onChange={(event) => onFieldChange("countryCode", event.target.value)}
            >
              {COUNTRY_CODES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.flag} {item.code} ({item.country})
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="WhatsApp number"
            field="phone"
            error={errors.phone}
            hint="Only numbers. 8 to 15 digits supported."
            className="md:col-span-1"
          >
            <input
              id="phone"
              name="phone"
              value={form.phone}
              placeholder="8 to 15 digits"
              onChange={(event) => onFieldChange("phone", event.target.value)}
              onBlur={(event) => onFieldChange("phone", event.target.value)}
            />
          </FormField>

          <div className="md:col-span-2">
            <label className="lumina-checkbox">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(event) => onFieldChange("consent", event.target.checked)}
              />
              <span>
                I agree to use my details for astrology calculation and personalized
                recommendations.
              </span>
            </label>
            {errors.consent && <p className="lumina-error mt-1">{errors.consent}</p>}
          </div>

          <div className={`lumina-status ${status.tone} md:col-span-2`}>{status.message}</div>

          <div className="mt-1 flex flex-wrap gap-3 md:col-span-2">
            <button type="submit" disabled={!canSubmit}>
              {saving ? "Saving..." : "Generate my Kundali"}
            </button>
            {retryVisible && (
              <button
                type="button"
                className="lumina-button-secondary"
                disabled={saving}
                onClick={() => {
                  void submitSave(1);
                }}
              >
                Retry save
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}

function FormField({
  label,
  field,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  field: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`lumina-field ${className ?? ""}`} htmlFor={field}>
      <span className="lumina-label">{label}</span>
      {children}
      {hint && <span className="lumina-hint">{hint}</span>}
      <span className="lumina-error">{error ?? ""}</span>
    </label>
  );
}

