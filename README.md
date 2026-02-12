# veda

## Experience research outputs

- `ONBOARDING_EXPERIENCE_SUMMARY.md` — live exploration summary of onboarding, crafting cards, and results flow
- `FRESH_ELEGANT_PROJECT_PROPOSAL.md` — improved next-gen concept ("Vedanga Lumina") derived from findings

## Fresh elegant prototype

Path: `fresh-elegant-kundali/`

Key files:

- `fresh-elegant-kundali/index.html`
- `fresh-elegant-kundali/styles.css`
- `fresh-elegant-kundali/app.js`
- `fresh-elegant-kundali/docs/IMPLEMENTATION_NOTES.md`

Open `fresh-elegant-kundali/index.html` in a browser to view the new onboarding-to-results prototype.

## Production starter (Next.js + TypeScript)

Path: `lumina-next/`

Highlights:

- Routes: `/onboarding`, `/crafting`, `/results`
- API routes:
  - `GET /api/onboarding/current`
  - `POST /api/onboarding/save`
  - `GET /api/kundali/current`
  - `POST /api/kundali/generate`
  - `GET /api/chat/status`
  - `POST /api/analytics/track`
  - `GET /api/analytics/summary`
  - `GET /api/health`

Run:

```bash
cd lumina-next
npm install
npm run prisma:migrate -- --name init
npm run dev
```

Then open `http://localhost:3000/onboarding`.