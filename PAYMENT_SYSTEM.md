# Payment System

Ghost Client Portal uses trusted server-side payment records. The browser may submit only a secure proposal-token reference; it cannot control amounts, currency, contract value, payment type, proposal status, or project activation.

Checkout flow:

1. Validate proposal token and payment eligibility.
2. Load accepted proposal, immutable acceptance, and unpaid deposit schedule item.
3. Create or reuse a Stripe Customer for the organization.
4. Create an internal `Payment` attempt.
5. Create a Stripe Checkout Session with server-generated line items.
6. Store Checkout Session details.
7. Wait for signed Stripe webhooks to confirm payment.

Gray Matters values:

- Contract value: `150000` cents
- Deposit: `75000` cents
- Final balance: `75000` cents

Database-backed checkout creation requires a reachable PostgreSQL database. Real Checkout requires Stripe test-mode credentials.

Phase 4 adds environment mode enforcement. Live keys are valid only in production, and staging/local verification must use test-mode Stripe keys against a separate database.
