## Vedanga Lumina Next.js Starter

This is a production-oriented Next.js + TypeScript starter that continues the Lumina prototype work with:

- `/onboarding` — inline validation + save/retry UX
- `/crafting` — progress phases + interactive insight questions
- `/results` — elegant multi-card output with actionable recommendations
- API routes:
  - `POST /api/onboarding/save`
  - `POST /api/kundali/generate`
  - `GET /api/chat/status`

### Why this build exists

It directly addresses the issues discovered in the onboarding experience analysis:

- no silent save failure path
- consistent phone validation
- moon-sign normalization before personalization
- recovery CTA if onboarding/result state is missing

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000/onboarding](http://localhost:3000/onboarding) to begin the full flow.
