## Vedanga Lumina Next.js Starter

This is a production-oriented Next.js + TypeScript starter that continues the Lumina prototype work with:

- `/onboarding` — inline validation + save/retry UX
- `/crafting` — progress phases + interactive insight questions
- `/results` — elegant multi-card output with actionable recommendations
- API routes:
  - `POST /api/onboarding/save`
  - `GET /api/onboarding/current`
  - `POST /api/kundali/generate`
  - `GET /api/kundali/current`
  - `GET /api/chat/status`
  - `POST /api/analytics/track`
  - `GET /api/analytics/summary`

### Why this build exists

It directly addresses the issues discovered in the onboarding experience analysis:

- no silent save failure path
- consistent phone validation
- moon-sign normalization before personalization
- recovery CTA if onboarding/result state is missing

## Getting Started

1) Install dependencies:

```bash
npm install
```

2) Configure environment:

```bash
cp .env.example .env
```

3) Run Prisma migration and generate client:

```bash
npm run prisma:migrate -- --name init
```

4) Start development server:

```bash
npm run dev
```

Open [http://localhost:3000/onboarding](http://localhost:3000/onboarding) to begin the full flow.

## Production notes

- Session data is persisted in SQLite via Prisma.
- Onboarding and generated kundali results are stored server-side by session.
- Client events are tracked via `/api/analytics/track`.
- If `LUMINA_REMOTE_KUNDALI_URL` is configured, the server tries remote generation first and falls back to local generation when needed.
