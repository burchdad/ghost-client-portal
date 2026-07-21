# Payment Recovery

Payment processing can require recovery when Stripe confirms payment but downstream activation, notification, or persistence work fails.

Recovery indicators:

- `Payment.recoveryRequired`
- `Payment.recoveryReason`
- `StripeEvent.processingStatus = RECOVERY_REQUIRED`
- internal notification records
- admin payment list recovery flag

Confirmed payments should not be charged again. Retry processing must reuse internal payment, schedule, proposal, and project identifiers.

Refunds create an internal review trail and do not automatically cancel active projects.

Internal recovery can retry post-payment activation only after a `Payment` is already `PAID`. It must not create a new Checkout Session, charge the client, or change the amount.
