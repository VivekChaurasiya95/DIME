# DIME

Data-Driven Idea and Market Evaluation Platform.

This repository contains the working DIME application under [dime-app](dime-app), built with Next.js App Router, Prisma, and dataset-driven analysis modules.

## Repository Structure

- [dime-app](dime-app): Main web application (frontend + API routes)
- [dime-app/src/lib/analysis/similarity.ts](dime-app/src/lib/analysis/similarity.ts): TF-IDF similarity and novelty scoring
- [dime-app/src/lib/analysis/sentiment.ts](dime-app/src/lib/analysis/sentiment.ts): Dataset-based sentiment and issue clustering
- [dime-app/datasets](dime-app/datasets): CSV datasets used for similarity and sentiment signals

## Tech Stack

- Next.js (App Router) + TypeScript
- Prisma ORM
- SQLite (current local setup)
- Recharts for visualizations
- NextAuth/Firebase auth integration

## Quick Start

1. Install dependencies:

```bash
npm install --prefix dime-app
```

2. Run Prisma setup commands (from repo root):

```bash
npm run prisma:validate --prefix dime-app
npm run prisma:generate --prefix dime-app
npm run prisma:migrate-status --prefix dime-app
```

3. Start development server:

```bash
npm run dev --prefix dime-app
```

App default URL: http://localhost:3000

## Key Product Areas Implemented

- Idea similarity and novelty scoring from GitHub dataset
- Sentiment insights from review datasets
- Market Analysis dashboard with context-aware, traceable metrics
- Opportunity Matrix using computed backend scores
- Dashboard overview driven by real aggregate data

## Market Analysis Notes

Market Analysis is designed as a research dashboard, not a judgment engine:

- Sentiment is dataset-based and explicitly labeled as external market feedback
- Top reported issues are rule-based grouped categories (not raw noisy keywords)
- Review volume and source distribution are dataset-traceable
- Market pain signal explains scale and derivation

Relevant files:

- [dime-app/src/app/api/market-analysis/overview/route.ts](dime-app/src/app/api/market-analysis/overview/route.ts)
- [dime-app/src/app/dashboard/insights/page.tsx](dime-app/src/app/dashboard/insights/page.tsx)
- [dime-app/src/lib/analysis/sentiment.ts](dime-app/src/lib/analysis/sentiment.ts)

## Prisma Utilities

From repo root, run:

```bash
npm run prisma:validate --prefix dime-app
npm run prisma:generate --prefix dime-app
npm run prisma:migrate-status --prefix dime-app
npm run prisma:studio --prefix dime-app
```

Prisma Studio default URL: http://localhost:5555

## Troubleshooting

- Ensure commands are run with --prefix dime-app to use the correct app context.
- If auth fails with CredentialsSignin, verify Prisma migrations and DATABASE_URL.
- First compile may be slower due to NLP dependencies.

## License

See [LICENSE](LICENSE).
