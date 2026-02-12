import { generateKundali } from "@/lib/kundali";
import { normalizeMoonSign } from "@/lib/moon";
import type { KundaliResult, OnboardingPayload, ScoreLabel } from "@/types/lumina";

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" ? (value as JsonObject) : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeScoreLabel(input: unknown, score: number): ScoreLabel {
  const raw = asString(input).toLowerCase();
  if (raw.includes("excellent") || raw.includes("strong")) return "Strong";
  if (raw.includes("good")) return "Good";
  if (raw.includes("average") || raw.includes("moderate") || raw.includes("balanced")) {
    return "Balanced";
  }
  if (score >= 75) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 45) return "Balanced";
  return "Needs support";
}

function normalizeSeverity(value: unknown): "Mild" | "Moderate" | "Severe" {
  const raw = asString(value).toLowerCase();
  if (raw.includes("severe")) return "Severe";
  if (raw.includes("moderate")) return "Moderate";
  return "Mild";
}

function mapDomain(domain: unknown): { score: number; label: ScoreLabel } {
  const obj = asObject(domain);
  const score = Math.max(0, Math.min(100, asNumber(obj.score, 60)));
  return {
    score,
    label: normalizeScoreLabel(obj.scoreLabel, score),
  };
}

function parseTimeline(raw: unknown): Array<{ period: string; theme: string; advice: string }> {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => asObject(item))
    .map((item) => ({
      period: asString(item.period, "Upcoming period"),
      theme: asString(item.theme, "Growth"),
      advice: asString(item.advice, "Stay consistent with your key goals."),
    }))
    .slice(0, 4);
}

function parseYogas(rawObject: JsonObject): string[] {
  const detailed = rawObject.yogasDetailed;
  if (Array.isArray(detailed) && detailed.length > 0) {
    return detailed
      .map((item) => asObject(item))
      .map(
        (item) =>
          `${asString(item.name, "Yoga")}: ${asString(item.description, "Positive chart support")}`,
      );
  }

  const simple = rawObject.yogas;
  if (Array.isArray(simple) && simple.length > 0) {
    return simple.map((item) => asString(item, "Yoga")).filter((value) => value.length > 0);
  }

  return [
    "Steady growth signature across effort and discipline houses.",
    "Auspicious alignment supporting focused execution.",
  ];
}

function parseDoshas(
  rawObject: JsonObject,
): Array<{ name: string; severity: "Mild" | "Moderate" | "Severe"; remedy: string }> {
  const detailed = rawObject.doshasDetailed;
  if (Array.isArray(detailed) && detailed.length > 0) {
    return detailed
      .map((item) => asObject(item))
      .map((item) => ({
        name: asString(item.name, "Dosha influence"),
        severity: normalizeSeverity(item.severity),
        remedy: asString(item.remedy, "Follow a weekly discipline and reflection ritual."),
      }));
  }

  return [
    {
      name: "Stress-reactivity pattern",
      severity: "Mild",
      remedy: "Use a weekly grounding routine and calm communication rituals.",
    },
  ];
}

function normalizeRemoteResult(raw: unknown, payload: OnboardingPayload): KundaliResult {
  const obj = asObject(raw);
  const lifeDomains = asObject(obj.lifeDomains);
  const relationshipsDomain = lifeDomains.relationships ?? lifeDomains.marriage;
  const timeline = parseTimeline(obj.upcomingPeriods);

  const moonSignRaw = asString(obj.moonSign, "Meena (Pisces)");

  return {
    name: asString(obj.name, payload.name),
    lagna: asString(obj.lagna, "Kanya"),
    moonSignRaw,
    moonSign: normalizeMoonSign(moonSignRaw),
    nakshatra: asString(obj.nakshatra, "Revati"),
    selectedTopic: asString(obj.selectedTopic, "career"),
    summary: asString(
      obj.summary,
      "A balanced cycle with strong potential for focused growth.",
    ),
    positiveHighlight: asString(
      obj.positiveHighlight,
      "Your chart supports steady progress through disciplined action.",
    ),
    lifeDomains: {
      career: mapDomain(lifeDomains.career),
      relationships: mapDomain(relationshipsDomain),
      wealth: mapDomain(lifeDomains.wealth),
    },
    yogas: parseYogas(obj),
    doshas: parseDoshas(obj),
    timeline:
      timeline.length > 0
        ? timeline
        : [
            {
              period: "Next 90 days",
              theme: "Focused growth",
              advice: "Pick one high-impact goal and execute weekly.",
            },
            {
              period: "Month 4 to 8",
              theme: "Stabilization",
              advice: "Strengthen systems and relationships before expansion.",
            },
          ],
    chatHealth: "degraded",
    source: "remote",
  };
}

async function fetchRemoteKundali(payload: OnboardingPayload): Promise<KundaliResult | null> {
  const endpoint = process.env.LUMINA_REMOTE_KUNDALI_URL;
  if (!endpoint) return null;

  const timeoutMs = Number(process.env.LUMINA_REMOTE_TIMEOUT_MS ?? "12000");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.LUMINA_REMOTE_API_KEY
          ? { Authorization: `Bearer ${process.env.LUMINA_REMOTE_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        ...payload,
        lat: 28.6139,
        lon: 77.209,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) return null;
    const json = (await response.json()) as unknown;

    // Supports both wrapped (`{ success, result }`) and direct object payloads.
    const root = asObject(json);
    const resultCandidate = root.result ?? json;
    return normalizeRemoteResult(resultCandidate, payload);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveKundali(payload: OnboardingPayload): Promise<KundaliResult> {
  const remote = await fetchRemoteKundali(payload);
  if (remote) return remote;

  const local = generateKundali(payload);
  return {
    ...local,
    source: "local",
  };
}

