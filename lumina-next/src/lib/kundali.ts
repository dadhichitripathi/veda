import { normalizeMoonSign } from "@/lib/moon";
import type { KundaliResult, OnboardingPayload, ScoreLabel } from "@/types/lumina";

function hashCode(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value << 5) - value + input.charCodeAt(index);
    value |= 0;
  }
  return value;
}

function pickBySeed<T>(items: readonly T[], seed: number): T {
  const index = Math.abs(seed) % items.length;
  return items[index];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreLabel(score: number): ScoreLabel {
  if (score >= 75) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 45) return "Balanced";
  return "Needs support";
}

export function generateKundali(payload: OnboardingPayload): KundaliResult {
  const seed = hashCode(
    `${payload.name}|${payload.dateOfBirth}|${payload.timeOfBirth}|${payload.placeOfBirth}`,
  );

  const moonSignRaw = pickBySeed(
    [
      "Meena (Pisces)",
      "Mesha (Aries)",
      "Vrishabha (Taurus)",
      "Mithuna (Gemini)",
      "Karka (Cancer)",
      "Simha (Leo)",
      "Kanya (Virgo)",
      "Tula (Libra)",
      "Vrischika (Scorpio)",
      "Dhanu (Sagittarius)",
      "Makara (Capricorn)",
      "Kumbha (Aquarius)",
    ] as const,
    seed,
  );

  const moonSign = normalizeMoonSign(moonSignRaw);
  const scoreBase = 45 + Math.abs(seed % 22);

  return {
    name: payload.name,
    lagna: pickBySeed(["Kanya", "Tula", "Vrischika", "Makara"] as const, seed + 2),
    moonSignRaw,
    moonSign,
    nakshatra: pickBySeed(["Revati", "Rohini", "Pushya", "Anuradha"] as const, seed + 5),
    selectedTopic: "career",
    summary: "A balanced cycle with strong potential for focused growth",
    positiveHighlight: `${moonSign} Moon supports intuitive decisions when paired with structure.`,
    lifeDomains: {
      career: {
        score: clamp(scoreBase + 4, 35, 92),
        label: scoreLabel(scoreBase + 4),
      },
      relationships: {
        score: clamp(scoreBase - 3, 35, 92),
        label: scoreLabel(scoreBase - 3),
      },
      wealth: {
        score: clamp(scoreBase + 2, 35, 92),
        label: scoreLabel(scoreBase + 2),
      },
    },
    yogas: [
      "Dhana support for steady wealth habits",
      "Creative expression pattern in communication houses",
      "Discipline-aligned growth through long-term planning",
    ],
    doshas: [
      {
        name: "Mild Manglik influence",
        severity: "Moderate",
        remedy: "Tuesday discipline ritual, service, and conflict-aware communication.",
      },
    ],
    timeline: [
      {
        period: "Next 90 days",
        theme: "Skill compounding and steady execution",
        advice: "Pick one strategic goal and track weekly milestones.",
      },
      {
        period: "Month 4 to 8",
        theme: "Relationship clarity",
        advice: "Have one high-trust conversation before major commitments.",
      },
      {
        period: "Month 9 to 12",
        theme: "Financial optimization",
        advice: "Shift from reactive spending to rule-based investing.",
      },
    ],
    chatHealth: "degraded",
  };
}

