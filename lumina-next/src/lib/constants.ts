import type { CountryCode, CraftingPhase } from "@/types/lumina";

export const COUNTRY_CODES: CountryCode[] = [
  { code: "+91", country: "India", flag: "IN" },
  { code: "+1", country: "USA/Canada", flag: "US" },
  { code: "+44", country: "United Kingdom", flag: "GB" },
  { code: "+971", country: "UAE", flag: "AE" },
  { code: "+65", country: "Singapore", flag: "SG" },
  { code: "+61", country: "Australia", flag: "AU" },
  { code: "+49", country: "Germany", flag: "DE" },
  { code: "+966", country: "Saudi Arabia", flag: "SA" },
  { code: "+974", country: "Qatar", flag: "QA" },
  { code: "+60", country: "Malaysia", flag: "MY" },
  { code: "+64", country: "New Zealand", flag: "NZ" },
  { code: "+33", country: "France", flag: "FR" },
  { code: "+977", country: "Nepal", flag: "NP" },
  { code: "+880", country: "Bangladesh", flag: "BD" },
];

export const CRAFTING_PHASES: CraftingPhase[] = [
  { progress: 20, message: "Casting your birth chart..." },
  { progress: 40, message: "Analyzing planetary positions..." },
  { progress: 60, message: "Calculating dasha periods..." },
  { progress: 80, message: "Finding personalized insights..." },
  { progress: 100, message: "Your Lumina blueprint is ready." },
];

export const CITY_HINTS: string[] = [
  "Delhi, India",
  "Mumbai, India",
  "Bangalore, India",
  "Kolkata, India",
  "Chennai, India",
  "Pune, India",
  "Hyderabad, India",
  "Jaipur, India",
  "Lucknow, India",
  "Ahmedabad, India",
  "New Delhi, India",
  "London, UK",
  "Dubai, UAE",
  "Singapore",
  "Sydney, Australia",
];

export const STORAGE_KEYS = {
  onboarding: "lumina_onboarding_data",
  result: "lumina_kundali_result",
  curiosity: "lumina_user_curiosity",
} as const;

