# Vedanga Lumina — fresh elegant project proposal

Date: 2026-02-10  
Derived from: `ONBOARDING_EXPERIENCE_SUMMARY.md`

## 1) Product idea

**Vedanga Lumina** is a next-generation astrology experience that feels premium, trustworthy, and calming while staying conversion-focused.

It keeps the emotional strengths of the current flow (guided onboarding, personalized reveal, card-based output) and fixes key trust/usability issues discovered in the review.

## 2) Product goals

1. Increase onboarding completion rate
2. Improve trust and perceived reliability
3. Make insights more actionable, not just descriptive
4. Reduce drop-off between first result view and paid consultation intent

## 3) Core improvements from findings

### A. Reliable data flow and user trust

- Add **save status UX**: "Saving...", "Saved", "Retry"
- Prevent silent failures before navigation
- Add **explicit recovery CTA** when onboarding data is missing

### B. Better validation quality

- Field-level inline error messages
- Consistent phone behavior (UI + validation + API contract)
- Improved birth data helper text (time format and city assist)

### C. Stronger personalization consistency

- Normalize moon sign labels (e.g., `Meena (Pisces)` -> `Pisces`) before using poll content
- Persist curiosity signal and reuse it in result emphasis + chat opener

### D. Result experience redesign

- Story-first summary card ("What this means for you now")
- Domain cards with clear score explanations and actions
- Timeline card with "next 90 days" focus
- Remedies card grouped by effort level (easy, medium, deep)
- Confidence band for each recommendation

### E. Graceful AI support mode

- Chat reliability status visible in UI
- Fast fallback to "guided FAQ mode" if AI backend times out
- One-tap transition to human consultation

## 4) Target user flow (v2)

1. **Welcome + trust setup**  
   Promise, privacy line, 2-min expectation.

2. **Smart onboarding**  
   Name, gender, DOB, TOB, city, phone, consent.

3. **Crafting stage**  
   Progress + compact interactive questions + personalization memory.

4. **Insight reveal**  
   Elegant card deck with quick summary, scores, timeline, remedies, and next actions.

5. **Guided decision layer**  
   Ask AI or book expert with contextual handoff.

## 5) UX principles

- **Calm over clutter**
- **Clarity over mystique**
- **Action over abstraction**
- **Reliability over novelty**

## 6) Tech architecture (recommended)

### Frontend

- Next.js + TypeScript + Tailwind + Framer Motion
- Local-first state with server sync
- Componentized card system for rapid experiment velocity

### Backend

- API routes for onboarding save, kundali generation, chat, PDFs
- Queue/timeout protection for slow AI calls
- Structured telemetry for conversion + reliability

### Observability

- Route-level latency and timeout dashboards
- Event funnel:
  - `onboarding_start`
  - `onboarding_field_error`
  - `onboarding_submit_success`
  - `crafting_question_answered`
  - `result_card_viewed`
  - `chat_opened`
  - `consult_click`

## 7) MVP scope (4-6 weeks)

### Week 1-2

- v2 onboarding UI and validation model
- save/retry UX
- moon sign normalization

### Week 3-4

- redesigned result card system
- recommendation confidence labels
- guided action panel

### Week 5-6

- AI fallback mode
- analytics instrumentation
- A/B test setup vs current flow

## 8) Success metrics

- +15% onboarding completion
- +20% first-result interaction depth (3+ cards viewed)
- -30% error-related session exits
- +10% consultation intent actions

## 9) Build artifact in this repository

This proposal is paired with a fresh prototype:

- `fresh-elegant-kundali/index.html`
- `fresh-elegant-kundali/styles.css`
- `fresh-elegant-kundali/app.js`
- `fresh-elegant-kundali/docs/IMPLEMENTATION_NOTES.md`

The prototype demonstrates the improved flow and can be used as the design/engineering baseline for production.

