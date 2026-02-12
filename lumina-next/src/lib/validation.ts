import type { OnboardingPayload } from "@/types/lumina";

export type OnboardingField = keyof OnboardingPayload;
export type FieldErrors = Partial<Record<OnboardingField, string>>;

export function validateField(
  field: OnboardingField,
  value: OnboardingPayload[OnboardingField],
  payload: OnboardingPayload,
): string {
  switch (field) {
    case "name":
      return typeof value === "string" && value.trim().length >= 2
        ? ""
        : "Please enter at least 2 characters.";
    case "gender":
      return value ? "" : "Please choose gender.";
    case "dateOfBirth": {
      if (typeof value !== "string" || value.length === 0) {
        return "Please select date of birth.";
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "Invalid date.";
      if (date > new Date()) return "Date of birth cannot be in the future.";
      return "";
    }
    case "timeOfBirth":
      return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value))
        ? ""
        : "Please enter valid birth time.";
    case "placeOfBirth":
      return typeof value === "string" && value.trim().length >= 2
        ? ""
        : "Please enter birth city.";
    case "countryCode":
      return typeof value === "string" && value.startsWith("+")
        ? ""
        : "Please choose country code.";
    case "phone":
      return /^\d{8,15}$/.test(String(value))
        ? ""
        : "Phone must have 8 to 15 digits.";
    case "consent":
      return payload.consent ? "" : "Please accept consent to continue.";
    case "sessionId":
      return "";
    default:
      return "";
  }
}

export function validatePayload(payload: OnboardingPayload): FieldErrors {
  const fields: OnboardingField[] = [
    "name",
    "gender",
    "dateOfBirth",
    "timeOfBirth",
    "placeOfBirth",
    "countryCode",
    "phone",
    "consent",
  ];

  return fields.reduce<FieldErrors>((acc, field) => {
    const message = validateField(field, payload[field], payload);
    if (message) acc[field] = message;
    return acc;
  }, {});
}

