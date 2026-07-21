# Client Lifecycle Test Runbook

Use this runbook for isolated fake-client production validation. Do not use Gray Matters records for this workflow.

## Preconditions

- `PORTAL_TEST_CLIENT_EMAIL` is set in production to a real inbox controlled by Ghost AI Solutions.
- `NEXT_PUBLIC_APP_URL` points to the production portal URL.
- Email delivery variables are configured.
- A fresh Railway backup exists before applying the test lifecycle migration.
- Operator is signed in as `FOUNDER` or `ADMINISTRATOR`.

## Admin Workflow

Open `/admin/testing/client-lifecycle`.

1. Create or reuse the fake client test run.
2. Copy the one-time proposal URL shown after creation.
3. Send the proposal only after entering `SEND TEST PROPOSAL`.
4. Open the proposal as the test client and validate view tracking.
5. Accept/sign the test proposal.
6. Open the payment page and review the live Stripe handoff guard.
7. In production, do not complete a live Stripe charge.
8. Create a reviewed invitation only after entering `CREATE TEST INVITATION`.
9. Copy the one-time invitation URL shown after creation.
10. Send the invitation only after entering `SEND TEST INVITATION`.
11. Activate the fake client account from the invitation.
12. Validate dashboard, project, onboarding, files/messages placeholders, payments, and notifications.
13. Run cleanup only after entering `DELETE TEST RUN`.

## Boundaries

- This workflow creates only records marked as test data.
- It sends only to `PORTAL_TEST_CLIENT_EMAIL`.
- Proposal and invitation sends require explicit confirmation phrases.
- Checkout creation for test proposals in production requires `CREATE UNPAID LIVE TEST CHECKOUT`.
- Cleanup refuses any test run that has a paid payment or Stripe PaymentIntent.
