export type Gender = "male" | "female" | "other";

export type OnboardingPayload = {
  name: string;
  gender: Gender;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  countryCode: string;
  phone: string;
  consent: boolean;
  sessionId?: string;
};

export type SaveOnboardingResponse = {
  success: true;
  message: string;
  sessionId: string;
  persistedAt?: string;
};

export type ScoreLabel = "Strong" | "Good" | "Balanced" | "Needs support";

export type DomainScore = {
  score: number;
  label: ScoreLabel;
};

export type KundaliResult = {
  name: string;
  lagna: string;
  moonSignRaw: string;
  moonSign: string;
  nakshatra: string;
  selectedTopic: string;
  summary: string;
  positiveHighlight: string;
  lifeDomains: {
    career: DomainScore;
    relationships: DomainScore;
    wealth: DomainScore;
  };
  yogas: string[];
  doshas: Array<{
    name: string;
    severity: "Mild" | "Moderate" | "Severe";
    remedy: string;
  }>;
  timeline: Array<{
    period: string;
    theme: string;
    advice: string;
  }>;
  chatHealth: "healthy" | "degraded";
  source: "remote" | "local";
};

export type KundaliGenerateResponse = {
  success: true;
  result: KundaliResult;
  sessionId: string;
};

export type CurrentOnboardingResponse =
  | {
      success: true;
      sessionId: string;
      onboarding: OnboardingPayload;
    }
  | {
      success: false;
      message: string;
    };

export type CurrentKundaliResponse =
  | {
      success: true;
      sessionId: string;
      result: KundaliResult;
    }
  | {
      success: false;
      message: string;
    };

export type CountryCode = {
  code: string;
  country: string;
  flag: string;
};

export type CraftingPhase = {
  progress: number;
  message: string;
};

export type ExperienceOption = {
  emoji: string;
  text: string;
  response: string;
};

export type ExperienceQuestion = {
  kind: "moon" | "curiosity";
  question: string;
  options: ExperienceOption[];
  didYouKnow: string;
};

