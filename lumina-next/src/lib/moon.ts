import type { ExperienceQuestion } from "@/types/lumina";

export const MOON_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

type MoonSign = (typeof MOON_SIGNS)[number];

const SIGN_PROFILE: Record<
  MoonSign,
  {
    emoji: string;
    trait: string;
    fact: string;
  }
> = {
  Aries: {
    emoji: "♈",
    trait: "initiative and direct action",
    fact: "Aries Moon often responds quickly and courageously to emotional triggers.",
  },
  Taurus: {
    emoji: "♉",
    trait: "stability and comfort",
    fact: "Taurus Moon usually values routines, consistency, and emotional grounding.",
  },
  Gemini: {
    emoji: "♊",
    trait: "curiosity and mental agility",
    fact: "Gemini Moon tends to process emotions through thought and conversation.",
  },
  Cancer: {
    emoji: "♋",
    trait: "nurturing and emotional memory",
    fact: "Cancer Moon is often highly intuitive and deeply connected to home and family.",
  },
  Leo: {
    emoji: "♌",
    trait: "warm expression and heart-led confidence",
    fact: "Leo Moon can thrive when appreciation and creativity are present.",
  },
  Virgo: {
    emoji: "♍",
    trait: "precision and practical care",
    fact: "Virgo Moon often seeks calm through structure, service, and clarity.",
  },
  Libra: {
    emoji: "♎",
    trait: "harmony and partnership awareness",
    fact: "Libra Moon tends to balance emotions through fairness and connection.",
  },
  Scorpio: {
    emoji: "♏",
    trait: "depth and transformation",
    fact: "Scorpio Moon often experiences emotions intensely and values authenticity.",
  },
  Sagittarius: {
    emoji: "♐",
    trait: "optimism and meaning-seeking",
    fact: "Sagittarius Moon is usually energized by purpose and exploration.",
  },
  Capricorn: {
    emoji: "♑",
    trait: "discipline and responsibility",
    fact: "Capricorn Moon can be resilient, strategic, and long-term oriented.",
  },
  Aquarius: {
    emoji: "♒",
    trait: "individuality and perspective",
    fact: "Aquarius Moon often regulates emotions through logic and objectivity.",
  },
  Pisces: {
    emoji: "♓",
    trait: "intuition and sensitivity",
    fact: "Pisces Moon can absorb emotional environments strongly and deeply.",
  },
};

export function normalizeMoonSign(rawValue: string | undefined | null): MoonSign {
  if (!rawValue || typeof rawValue !== "string") return "Aries";

  const cleaned = rawValue
    .replace(/\(([^)]+)\)/g, " $1 ")
    .replace(/[^a-zA-Z\s]/g, " ")
    .toLowerCase();

  const found = MOON_SIGNS.find((sign) => cleaned.includes(sign.toLowerCase()));
  return found ?? "Aries";
}

export function buildExperienceQuestions(rawMoonSign: string): ExperienceQuestion[] {
  const moonSign = normalizeMoonSign(rawMoonSign);
  const profile = SIGN_PROFILE[moonSign];

  return [
    {
      kind: "moon",
      question: `${profile.emoji} As a ${moonSign} Moon person, what helps you reset emotionally?`,
      options: [
        {
          emoji: "🧘",
          text: "Quiet reflection",
          response: "Strong choice. Reflection builds emotional clarity for you.",
        },
        {
          emoji: "💬",
          text: "Talking it out",
          response: "Communication can release emotional pressure quickly.",
        },
        {
          emoji: "⚡",
          text: "Taking action",
          response: "Action helps convert emotional energy into momentum.",
        },
      ],
      didYouKnow: profile.fact,
    },
    {
      kind: "moon",
      question: `Your chart suggests ${profile.trait}. Which life area should we prioritize first?`,
      options: [
        {
          emoji: "💼",
          text: "Career",
          response: "Great. We will highlight practical career timing first.",
        },
        {
          emoji: "💞",
          text: "Relationships",
          response: "Great. We will surface emotional compatibility cues first.",
        },
        {
          emoji: "💰",
          text: "Wealth",
          response: "Great. We will prioritize cashflow and discipline signals first.",
        },
      ],
      didYouKnow: `${moonSign} Moon patterns often become strongest during stress and transitions.`,
    },
    {
      kind: "curiosity",
      question: "What are you most curious about in this reading?",
      options: [
        {
          emoji: "🔮",
          text: "Future predictions",
          response: "Perfect. We will highlight your next actionable windows.",
        },
        {
          emoji: "🪞",
          text: "Personality insights",
          response: "Excellent. We will reveal your emotional blueprint first.",
        },
        {
          emoji: "💎",
          text: "Remedies and guidance",
          response: "Wise choice. You will get remedies sorted by effort level.",
        },
      ],
      didYouKnow:
        "A kundali can be translated into practical weekly decisions, not just static traits.",
    },
  ];
}

