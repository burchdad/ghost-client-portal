# Ghost Client Portal

Ghost Client Portal is the external customer-facing layer for Ghost AI Solutions. It gives clients a secure headquarters for proposals, payments, onboarding, project status, requests, messages, files, approvals, and deliverables.

It is not Ghost Mission Control and it is not the internal employee portal. Mission Control remains the internal source of truth; this app exposes only approved client-facing records.

## Stack

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS
- PostgreSQL with Prisma ORM
- Secure HTTP-only cookie sessions
- Zod validation, bcrypt password hashing
- Stripe-ready payment models and webhook event table
- Vitest, Playwright, ESLint, Prettier

## Local Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Fill `DATABASE_URL`, `AUTH_SECRET`, and seed credential variables.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate`.
6. Run `npm run db:seed`.
7. Start locally with `npm run dev`.

## Database Setup

Use any PostgreSQL host, including Railway PostgreSQL or Supabase PostgreSQL. The code uses a normal `DATABASE_URL` and does not depend on vendor-specific database APIs.

## Stripe Setup

Phase 1 includes payment models and idempotent Stripe event foundations. Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` before Phase 3 checkout/webhook work.

Phase 3 adds Stripe Checkout foundations for accepted proposals. Payment amounts come only from trusted server-side proposal and payment schedule records. Stripe webhooks, not redirect pages, confirm payment.

## Seed Process

Seed credentials must come from environment variables:

- `FOUNDER_SEED_EMAIL`
- `FOUNDER_SEED_PASSWORD`
- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`
- `GRAY_MATTERS_CLIENT_SEED_PASSWORD`
- optional `GRAY_MATTERS_CLIENT_SEED_EMAIL`

The seed creates internal users, a Gray Matters Technology tenant, a primary contact, a logo rebrand proposal, schedule items, template records, a project shell, milestones, onboarding questions, activity, and a sample notification.

The development proposal URL is printed only by the seed command. The current fixture token for read-only public page smoke testing is `/p/gray-matters-logo-rebrand-seed-token`.

The accepted proposal fixture for payment-page smoke testing is `/p/gray-matters-logo-rebrand-accepted-token/payment`. It does not create real Checkout Sessions without Stripe configuration and a reachable PostgreSQL database.

## Test Commands

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm audit --audit-level=moderate`

Database-backed verification still requires a reachable PostgreSQL `DATABASE_URL`:

- `npm run db:migrate`
- `npm run db:seed`

## Deployment

Deploy on Vercel as a standard Next.js app. Configure the production domain as `clientportal.ghostai.solutions`, set all required environment variables, run Prisma migrations against production PostgreSQL, then seed only approved bootstrap users.

## Environment Safety

Use `APP_ENV` to separate `local`, `staging`, and `production`. Production uses live Stripe credentials. Local and staging must use test Stripe credentials against a non-production database. See `ENVIRONMENT_STRATEGY.md`.
