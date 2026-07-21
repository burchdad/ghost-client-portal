# Test Acceptance Invalidation

Recommended Gray Matters disposition: invalidate the seeded/test acceptance and require Barbara to complete the real acceptance workflow.

Use confirmation phrase: `INVALIDATE SEEDED ACCEPTANCE`.

The action:

- Preserves the original acceptance record
- Marks it invalidated with reason and actor
- Resets proposal status to `SENT`
- Clears accepted/signed/payment timestamps through audited test-reset logic
- Refuses to run after a confirmed payment or PaymentIntent
