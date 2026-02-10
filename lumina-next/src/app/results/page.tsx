"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import {
  clearLuminaLocalState,
  getCuriosityLocal,
  getOnboardingLocal,
  getResultLocal,
} from "@/lib/storage";
import type { DomainScore, KundaliResult, OnboardingPayload } from "@/types/lumina";

type ResultCard = {
  tag: string;
  title: string;
  content: ReactNode;
};

export default function ResultsPage() {
  const router = useRouter();

  const [onboarding, setOnboarding] = useState<OnboardingPayload | null | undefined>(
    undefined,
  );
  const [result, setResult] = useState<KundaliResult | null | undefined>(undefined);
  const [cardIndex, setCardIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const onboardingData = getOnboardingLocal();
      const resultData = getResultLocal();
      setOnboarding(onboardingData);
      setResult(resultData);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const cards = useMemo<ResultCard[]>(() => {
    if (!result) return [];

    const curiosity = getCuriosityLocal();
    const priorityText = curiosity
      ? `Priority based on your input: ${curiosity}.`
      : "Priority is based on your moon-sign profile and domain scores.";

    return [
      {
        tag: "Identity",
        title: `${result.moonSignRaw} Moon, ${result.lagna} Lagna`,
        content: (
          <>
            <p>{result.positiveHighlight}</p>
            <ul className="lumina-list">
              <li>
                Nakshatra: <strong>{result.nakshatra}</strong>
              </li>
              <li>Summary: {result.summary}</li>
              <li>{priorityText}</li>
            </ul>
          </>
        ),
      },
      {
        tag: "Domain scores",
        title: "Where your momentum is strongest",
        content: (
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Career" domain={result.lifeDomains.career} />
            <MetricCard label="Relationships" domain={result.lifeDomains.relationships} />
            <MetricCard label="Wealth" domain={result.lifeDomains.wealth} />
          </div>
        ),
      },
      {
        tag: "Yogas",
        title: "Strength patterns to leverage",
        content: (
          <ul className="lumina-list">
            {result.yogas.map((yoga) => (
              <li key={yoga}>{yoga}</li>
            ))}
          </ul>
        ),
      },
      {
        tag: "Remedies",
        title: "Challenges and practical remedies",
        content: (
          <ul className="lumina-list">
            {result.doshas.map((dosha) => (
              <li key={dosha.name}>
                <strong>{dosha.name}</strong> ({dosha.severity})
                <br />
                {dosha.remedy}
              </li>
            ))}
          </ul>
        ),
      },
      {
        tag: "Timeline",
        title: "Your next 12-month roadmap",
        content: (
          <div className="grid gap-3">
            {result.timeline.map((item) => (
              <article key={item.period} className="lumina-timeline-item">
                <h3 className="font-semibold">{item.period}</h3>
                <p>{item.theme}</p>
                <p className="text-sm text-[var(--muted)]">{item.advice}</p>
              </article>
            ))}
          </div>
        ),
      },
      {
        tag: "Action",
        title: "What to do next",
        content: (
          <ul className="lumina-list">
            <li>Pick one focus area and set a 4-week action sprint.</li>
            <li>Review remedies every Tuesday for consistency.</li>
            <li>Book a pandit consult for deeper event timing.</li>
            <li>
              AI chat status: <strong>{result.chatHealth}</strong> (guided fallback enabled
              on delay).
            </li>
          </ul>
        ),
      },
    ];
  }, [result]);

  if (onboarding === undefined || result === undefined) return null;

  if (!onboarding || !result) {
    return (
      <main className="lumina-shell">
        <section className="lumina-card">
          <p className="lumina-eyebrow">Recovery</p>
          <h1 className="text-2xl font-semibold">Result data unavailable</h1>
          <p className="mt-3 text-[var(--muted)]">
            Start from onboarding to generate your fresh personalized reading.
          </p>
          <div className="mt-5">
            <button onClick={() => router.push("/onboarding")}>Go to onboarding</button>
          </div>
        </section>
      </main>
    );
  }

  if (!result || !onboarding) {
    return null;
  }

  const activeCard = cards[cardIndex];

  return (
    <main className="lumina-shell">
      <section className="lumina-card">
        <p className="lumina-eyebrow">Vedanga Lumina</p>
        <h1 className="text-2xl font-semibold">
          Your Lumina Blueprint, {firstName(onboarding.name)}
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Insight-focused guidance for your next meaningful actions.
        </p>

        <article className="lumina-result-card mt-6">
          <span className="lumina-tag">
            {cardIndex + 1}/{cards.length} {activeCard.tag}
          </span>
          <h2 className="mt-2 text-xl font-semibold">{activeCard.title}</h2>
          <div className="mt-3 text-[15px] leading-7 text-[#dce7ff]">{activeCard.content}</div>
        </article>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            className="lumina-button-secondary"
            disabled={cardIndex === 0}
            onClick={() => setCardIndex((value) => Math.max(0, value - 1))}
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {cards.map((card, index) => (
              <button
                key={card.tag}
                className={index === cardIndex ? "lumina-dot active" : "lumina-dot"}
                onClick={() => setCardIndex(index)}
                aria-label={`Go to ${card.tag} card`}
              />
            ))}
          </div>

          <button
            className="lumina-button-secondary"
            disabled={cardIndex === cards.length - 1}
            onClick={() =>
              setCardIndex((value) => Math.min(cards.length - 1, value + 1))
            }
          >
            Next
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="lumina-button-secondary" onClick={() => router.push("/onboarding")}>
            Edit onboarding details
          </button>
          <button
            onClick={() => {
              clearLuminaLocalState();
              router.push("/onboarding");
            }}
          >
            Start a new reading
          </button>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, domain }: { label: string; domain: DomainScore }) {
  return (
    <article className="lumina-metric">
      <p className="font-semibold">
        {label}: {domain.score}
      </p>
      <p className="text-sm text-[var(--muted)]">{domain.label}</p>
      <div className="lumina-meter mt-2">
        <span style={{ width: `${domain.score}%` }} />
      </div>
    </article>
  );
}

function firstName(value: string): string {
  return value.trim().split(/\s+/)[0] ?? value;
}

