# Project Activation

After a confirmed deposit, the payment service activates the accepted proposal.

Activation behavior:

1. Mark payment and deposit schedule item paid.
2. Transition proposal `PAYMENT_PENDING -> DEPOSIT_PAID`.
3. Create or activate a project for the proposal.
4. Create Logo Rebrand phases and client onboarding actions when new.
5. Create onboarding form for the project and service template.
6. Transition proposal `DEPOSIT_PAID -> ACTIVE` after project activation succeeds.
7. Emit outbox events for Mission Control synchronization.

Activation is designed to be idempotent. A project is unique per accepted proposal, and onboarding is unique per project/template.
