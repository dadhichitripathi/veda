# Vedanga onboarding and results experience summary

Date: 2026-02-10  
Environment: https://vedanga-unified.vercel.app  
Scope: onboarding form, post-submit experience cards, and final kundali results flow.

## 1) What was explored

I explored the journey in three layers:

1. Live page rendering (`/onboarding`, `/kundali`)
2. Live API behavior (`/api/onboarding/save`, `/api/cities/search`, `/api/kundali/generate`, related result asset endpoints)
3. Client flow logic from the production Next.js chunks (to confirm exact card sequence and interaction logic)

## 2) Onboarding experience

### Entry and structure

- Page title: "Get Your Free Kundali | Vedanga Astrology"
- Hero copy: "Ready to reveal your destiny? Please confirm your details"
- Input model is a compact expandable card format (progressive disclosure), with these sections:
  - Name
  - Gender (default selected: Male)
  - Born on (date selector)
  - Birth Time
  - Birthplace
  - WhatsApp number

### Validation and interaction behavior

- Generate button is disabled until all required fields are valid.
- Validation logic observed:
  - Name: minimum 2 characters
  - Date: required
  - Time: required
  - Birthplace: minimum 2 characters
  - Phone: numeric format check exists (`10-15`), but UI input limits to max 10 digits
- City autocomplete:
  - Fires after 2+ characters with debounce (~300 ms)
  - Endpoint used: `/api/cities/search?q=<query>`
  - Live check for `Delhi` returned suggestions correctly.

### Submission behavior

- On click "Generate My Kundali":
  - Saves payload to local storage
  - Calls `/api/onboarding/save` (POST)
  - Navigates to `/kundali`
- Live endpoint check:
  - `/api/onboarding/save` returned success for sample payload.

## 3) Post-submit "experience card" phase (crafting flow)

After submit, users enter a crafting stage before final results.

### Progress phases shown

- 20%: "Casting your birth chart..."
- 40%: "Analyzing planetary positions..."
- 60%: "Calculating Dasha periods..."
- 80%: "Finding personalized insights..."
- 100%: "Your Kundali is ready!"

### Interactive quick-insight cards

- This phase includes compact poll cards while progress advances:
  - 2 moon-sign-based questions (from a 12-sign content bank)
  - 1 generic curiosity question:
    - "What are you most curious about in your Kundali?"
    - Options: Future predictions, Personality insights, Remedies and guidance
- Selected curiosity option is stored in local storage (`vedanga_user_curiosity`).

## 4) Results experience (final swipe cards)

Results are presented as a horizontal swipe deck with page dots.

### Card order (11 cards)

1. Identity
2. Topic
3. Yogas
4. Doshas
5. Dasha
6. Planets
7. Timeline
8. Lucky
9. Remedies
10. Chat
11. Pandit

### Header actions

- Download action (PDF)
- AI Chat action

### Live API result check (sample payload)

Using sample birth details, `/api/kundali/generate` returned a rich response including:

- Core identity:
  - Lagna: Kanya (Virgo)
  - Sun sign: Karka (Cancer)
  - Moon sign: Meena (Pisces)
  - Nakshatra: Revati
- Highlight and dasha summary
- Life-domain scoring:
  - Career: 50 (Average)
  - Marriage: 45 (Average)
  - Wealth: 50 (Average)
- Detailed yogas/doshas
- Key planets
- Upcoming periods and mahadashas
- Lucky elements
- Chart URL and PDF download URL

Related result assets were live:

- `/api/chart/render` -> 200 (SVG)
- `/api/forecast/render` -> 200 (SVG)
- `/api/pdf/download` -> 200 (PDF)

## 5) Overall experience assessment

Overall experience score: **7.8/10**

### What works well

- Clean single-page onboarding with low cognitive load
- Good visual hierarchy and modern styling
- Useful city autocomplete and clear CTA state
- Strong perceived personalization in crafting stage
- Rich, multi-card result output with actionable detail
- PDF export available directly from results

### Friction and risks observed

1. Potential moon-sign mapping mismatch in crafting poll
   - Crafting poll content keys are English zodiac names (`Aries`, `Pisces`, etc.).
   - Sample API moon sign came as `Meena (Pisces)`.
   - If not normalized before lookup, the flow falls back to Aries poll content.

2. Phone validation mismatch
   - Regex allows up to 15 digits, but UI input caps at 10 digits.
   - This inconsistency can confuse international users.

3. Save call is not blocking navigation
   - Onboarding save request is fire-and-forget before route change.
   - Users can proceed even if save fails silently.

4. No field-level inline error messaging
   - Only a generic "fill all details correctly" message appears.
   - More targeted validation hints would reduce friction.

5. AI chat endpoint instability in live checks
   - `/api/agent` repeatedly returned `FUNCTION_INVOCATION_TIMEOUT` during testing.
   - This can degrade confidence in the "Chat" result card.

6. Missing recovery CTA when onboarding data is absent
   - `/kundali` without onboarding data shows "Please complete onboarding."
   - No direct button back to onboarding was observed in that state.

## 6) Recommended improvements (priority order)

### High priority

- Normalize moon sign labels before poll-content lookup (avoid incorrect Aries fallback).
- Fix phone-length consistency (input cap and regex should match product intent).
- Add robust error handling for onboarding save and user-visible retry state.
- Stabilize AI chat endpoint timeout behavior or add graceful fallback copy.

### Medium priority

- Add per-field validation messages (name/date/time/city/phone).
- Add "Go to onboarding" CTA when kundali page loads without onboarding data.
- Track and surface skeleton/loading states for slow API responses in results cards.

### Nice to have

- Let users review/edit onboarding details from results page.
- Show explicit "how data is used" trust note near WhatsApp field.

