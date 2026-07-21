# Deployment

The app targets Vercel with PostgreSQL hosted by Railway, Supabase, or another standard PostgreSQL provider.

Production checklist:

1. Configure `clientportal.ghostai.solutions` in Vercel.
2. Set all environment variables from `.env.example`.
3. Run Prisma migrations against production.
4. Seed bootstrap internal users with environment-supplied passwords.
5. Configure Stripe webhook endpoint in Phase 3.
6. Confirm secure cookies, HTTPS, and security headers.
7. Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.

For production payments, configure Stripe webhook delivery to `/api/stripe/webhook`, set `STRIPE_WEBHOOK_SECRET`, run `npx prisma migrate deploy`, and verify a Stripe test-mode Checkout Session before enabling live keys.

Before deploying Phase 4, set `APP_ENV=production` in production and `APP_ENV=staging` in staging. Never point test-mode Stripe webhooks at the production Railway database.
