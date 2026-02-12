# Implementation notes for productionizing Vedanga Lumina

## 1) API contracts to wire

Replace mock functions in `app.js`:

- `mockSaveOnboarding` -> `POST /api/onboarding/save`
- `mockGenerateKundali` -> `POST /api/kundali/generate`

Recommended payload contract:

```json
{
  "name": "string",
  "gender": "male|female|other",
  "dateOfBirth": "YYYY-MM-DD",
  "timeOfBirth": "HH:mm",
  "placeOfBirth": "string",
  "countryCode": "+91",
  "phone": "digits",
  "consent": true,
  "sessionId": "string"
}
```

## 2) Reliability hardening

- Keep save call blocking before route transition
- Add retry with capped exponential backoff
- Persist pending payload in local storage for recovery
- Show explicit states: saving, retrying, saved, failed

## 3) Moon sign normalization

Use normalization before personalization lookups:

- `"Meena (Pisces)"` -> `"Pisces"`
- `"Mesha (Aries)"` -> `"Aries"`

This prevents fallback mismatch in crafting questions.

## 4) Validation consistency

- Keep same phone constraints in:
  - frontend input behavior
  - frontend validation
  - backend validation schema
- Return structured field errors from backend to render inline

## 5) Chat resilience

If `/api/agent` is slow/unavailable:

1. Show status "AI response delayed"
2. Auto-switch to guided FAQ templates
3. Provide one-tap "Book Pandit" handoff

## 6) Analytics events

Recommended events:

- `lumina_onboarding_started`
- `lumina_field_error`
- `lumina_onboarding_saved`
- `lumina_crafting_question_answered`
- `lumina_results_card_viewed`
- `lumina_consultation_clicked`

## 7) UI migration recommendation

For production, migrate this prototype to:

- Next.js + TypeScript
- Design tokens extracted from `styles.css`
- Reusable card components for experiments

