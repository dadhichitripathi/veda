"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics-client";
import { generateKundali, getCurrentOnboarding } from "@/lib/api-client";
import { CRAFTING_PHASES } from "@/lib/constants";
import { buildExperienceQuestions } from "@/lib/moon";
import {
  getOnboardingLocal,
  saveOnboardingLocal,
  saveResultLocal,
  setCuriosityLocal,
} from "@/lib/storage";
import type { ExperienceQuestion, KundaliResult, OnboardingPayload } from "@/types/lumina";

const QUESTION_THRESHOLDS = [25, 55, 80] as const;

export default function CraftingPage() {
  const router = useRouter();
  const completionTriggeredRef = useRef(false);

  const [onboarding, setOnboarding] = useState<OnboardingPayload | null>(null);
  const [missingOnboarding, setMissingOnboarding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<KundaliResult | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [questions, setQuestions] = useState<ExperienceQuestion[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);

  const phaseText = useMemo(() => {
    const activePhase =
      CRAFTING_PHASES.find((phase, index) => {
        const previous = index === 0 ? 0 : CRAFTING_PHASES[index - 1].progress;
        return progress <= phase.progress && progress > previous - 0.1;
      }) ?? CRAFTING_PHASES[CRAFTING_PHASES.length - 1];
    return activePhase.message;
  }, [progress]);

  const activeQuestion =
    activeQuestionIndex !== null ? questions[activeQuestionIndex] : null;

  useEffect(() => {
    let mounted = true;

    const loadAndGenerate = async () => {
      const serverOnboarding = await getCurrentOnboarding().catch(() => null);
      const localData = getOnboardingLocal();
      const resolvedOnboarding =
        serverOnboarding && serverOnboarding.success ? serverOnboarding.onboarding : localData;

      if (!mounted) return;

      if (!resolvedOnboarding) {
        setMissingOnboarding(true);
        void trackEvent({ eventName: "lumina_missing_onboarding_recovery" });
        return;
      }

      setOnboarding(resolvedOnboarding);
      saveOnboardingLocal(resolvedOnboarding);

      void trackEvent({
        eventName: "lumina_crafting_started",
        metadata: { sessionId: resolvedOnboarding.sessionId },
      });

      try {
        const json = await generateKundali(resolvedOnboarding);
        if (!json.success) throw new Error(json.message || "Generate failed");
        if (!mounted) return;
        setResult(json.result);
        saveResultLocal(json.result);
        setQuestions(buildExperienceQuestions(json.result.moonSignRaw));
        void trackEvent({
          eventName: "lumina_kundali_generated_client",
          metadata: { source: json.result.source },
        });
      } catch {
        if (!mounted) return;
        const fallback: KundaliResult = {
          name: resolvedOnboarding.name,
          lagna: "Vrischika",
          moonSignRaw: "Meena (Pisces)",
          moonSign: "Pisces",
          nakshatra: "Uttara Bhadrapada",
          selectedTopic: "career",
          summary: "A transition period with high upside through consistency",
          positiveHighlight:
            "You have strong emotional intelligence and long-term resilience.",
          lifeDomains: {
            career: { score: 72, label: "Good" },
            relationships: { score: 64, label: "Good" },
            wealth: { score: 70, label: "Good" },
          },
          yogas: [
            "Strategic thinking support",
            "Gradual but stable material growth",
            "Mentorship and learning advantage",
          ],
          doshas: [
            {
              name: "Communication stress pattern",
              severity: "Mild",
              remedy: "Journaling and weekly clarity rituals.",
            },
          ],
          timeline: [
            {
              period: "Next 90 days",
              theme: "Structured reset",
              advice: "Rebuild fundamentals: sleep, focus blocks, and financial rules.",
            },
            {
              period: "Month 4 to 8",
              theme: "Opportunity expansion",
              advice: "Take one visible risk with preparation.",
            },
            {
              period: "Month 9 to 12",
              theme: "Consolidation",
              advice: "Convert momentum into stable routines.",
            },
          ],
          chatHealth: "degraded",
          source: "local",
        };

        setResult(fallback);
        saveResultLocal(fallback);
        setQuestions(buildExperienceQuestions(fallback.moonSignRaw));
      } finally {
        if (!mounted) return;
        setDataReady(true);
      }
    };

    void loadAndGenerate();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (missingOnboarding) return;

    const interval = window.setInterval(() => {
      setProgress((current) => {
        const increment = dataReady ? 1.15 : 0.75;
        return Math.min(100, current + increment);
      });
    }, 120);

    return () => window.clearInterval(interval);
  }, [dataReady, missingOnboarding]);

  useEffect(() => {
    if (activeQuestionIndex !== null) return;
    if (!questions.length) return;
    if (answeredCount >= Math.min(3, questions.length)) return;

    const threshold = QUESTION_THRESHOLDS[answeredCount];
    if (progress >= threshold) {
      setActiveQuestionIndex(answeredCount);
      setSelectedOption(null);
    }
  }, [activeQuestionIndex, answeredCount, progress, questions]);

  useEffect(() => {
    const targetQuestionCount = Math.min(3, questions.length || 3);
    if (
      !completionTriggeredRef.current &&
      result &&
      dataReady &&
      progress >= 100 &&
      answeredCount >= targetQuestionCount
    ) {
      completionTriggeredRef.current = true;
      saveResultLocal(result);
      void trackEvent({
        eventName: "lumina_crafting_complete",
        metadata: {
          source: result.source,
        },
      });
      window.setTimeout(() => router.push("/results"), 500);
    }
  }, [answeredCount, dataReady, progress, questions.length, result, router]);

  if (missingOnboarding) {
    return (
      <main className="lumina-shell">
        <section className="lumina-card">
          <p className="lumina-eyebrow">Recovery</p>
          <h1 className="text-2xl font-semibold">Onboarding details not found</h1>
          <p className="mt-3 text-[var(--muted)]">
            Please complete onboarding first to generate your personalized kundali.
          </p>
          <div className="mt-5">
            <button onClick={() => router.push("/onboarding")}>Go to onboarding</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="lumina-shell">
      <section className="lumina-card">
        <p className="lumina-eyebrow">Vedanga Lumina</p>
        <h1 className="text-2xl font-semibold">
          Step 2: Crafting your insights{onboarding ? `, ${firstName(onboarding.name)}` : ""}
        </h1>
        <p className="mt-3 text-[var(--muted)]">{phaseText}</p>

        <div className="lumina-progress-shell mt-5">
          <div className="lumina-progress-fill" style={{ width: `${Math.round(progress)}%` }} />
        </div>
        <p className="mt-2 text-sm font-semibold text-[#d9e7ff]">{Math.round(progress)}%</p>

        {activeQuestion && (
          <article className="lumina-question-card mt-6">
            <p className="lumina-eyebrow">Quick insight</p>
            <h2 className="mt-2 text-lg font-semibold">{activeQuestion.question}</h2>
            <div className="mt-4 grid gap-2">
              {activeQuestion.options.map((option, index) => (
                <button
                  key={option.text}
                  className="lumina-option-button"
                  disabled={selectedOption !== null}
                  onClick={() => {
                    setSelectedOption(index);
                    if (activeQuestion.kind === "curiosity") {
                      setCuriosityLocal(option.text);
                    }
                    void trackEvent({
                      eventName: "lumina_crafting_question_answered",
                      metadata: {
                        questionIndex: activeQuestionIndex,
                        option: option.text,
                        kind: activeQuestion.kind,
                      },
                    });

                    window.setTimeout(() => {
                      setAnsweredCount((count) => count + 1);
                      setActiveQuestionIndex(null);
                      setSelectedOption(null);
                    }, 1700);
                  }}
                >
                  {option.emoji} {option.text}
                </button>
              ))}
            </div>

            {selectedOption !== null && (
              <div className="mt-4 grid gap-2 text-sm">
                <p className="text-[#bde6ff]">
                  {activeQuestion.options[selectedOption].response}
                </p>
                <p className="text-[#c7efd9]">Did you know: {activeQuestion.didYouKnow}</p>
              </div>
            )}
          </article>
        )}

        {!activeQuestion && (
          <div className="lumina-status muted mt-6">
            {dataReady
              ? "Preparing your final cards..."
              : "Computing planetary positions and timing windows..."}
          </div>
        )}
      </section>
    </main>
  );
}

function firstName(value: string): string {
  return value.trim().split(/\s+/)[0] ?? value;
}

