# Environment Strategy

Ghost Client Portal must keep live payment data separate from test verification.

| Environment     | App URL                                                    | Database                                       | Stripe Mode | Webhook                 |
| --------------- | ---------------------------------------------------------- | ---------------------------------------------- | ----------- | ----------------------- |
| Local           | `http://localhost:3000`                                    | Local/dev PostgreSQL                           | Test        | Stripe CLI              |
| Preview/Staging | Vercel preview or `clientportal-staging.ghostai.solutions` | Staging PostgreSQL database or isolated schema | Test        | Stripe test destination |
| Production      | `https://clientportal.ghostai.solutions`                   | Railway production PostgreSQL                  | Live        | Stripe live destination |

Required staging variables:

- `APP_ENV=staging`
- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`
- `AUTH_SECRET`
- `STRIPE_SECRET_KEY=sk_test_...`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`

Safety rules:

- Production must use live Stripe keys unless `ALLOW_STRIPE_TEST_IN_PRODUCTION=true` is deliberately set for a temporary emergency.
- Non-production environments must never use `sk_live_` keys.
- Test webhooks must not point at the production database.
- Live webhook events must not be replayed into staging.
- Do not store actual credentials in documentation or commit env files.
