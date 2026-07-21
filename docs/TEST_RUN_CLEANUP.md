# Test Run Cleanup

Use cleanup after completing fake-client lifecycle validation.

## Operator Steps

1. Open `/admin/testing/client-lifecycle`.
2. Confirm the current run is the fake-client test run.
3. Enter `DELETE TEST RUN`.
4. Submit cleanup.
5. Confirm proposals and invitations no longer work.
6. Confirm the project is hidden from the portal.

## Safety Behavior

Cleanup refuses to proceed when:

- Any payment is `PAID`.
- Any payment has a Stripe PaymentIntent.
- The related organization or proposal is not marked as test data.

Cleanup intentionally archives instead of hard-deleting records so audit history remains available.
