# Architecture

Ghost Client Portal is a standalone Next.js application with an organization-centered tenant model. Every client-owned record references an organization directly or through a project/proposal relationship.

Mission Control remains the internal source of truth. This app owns portal-specific authentication, client-facing visibility controls, proposal access tokens, payment schedule records, onboarding forms, notifications, audit logs, and outbox events until a production integration is connected.

Server components, server actions, and route handlers must enforce permissions with helpers in `src/lib/auth/guards.ts`. UI visibility is not treated as authorization.

The Mission Control boundary lives in `src/lib/mission-control`. The local adapter records sync intent in `OutboxEvent`; a later webhook or authenticated API client can replace it without coupling the portal UI to Mission Control internals.

## Proposal System

Public proposal behavior lives in `src/server/proposals`. Route components are thin and use repository/service functions for token lookup, status transitions, view tracking, acceptance, snapshots, and summary generation.

Proposal public URLs use raw opaque tokens, while the database stores only `publicTokenHash` and a short hint. Token rotation and revocation are internal admin operations.

Acceptance creates a deterministic snapshot of the proposal content and signatory payload. Hashes are stored on `ProposalAcceptance` so later proposal edits cannot change the signed record.

## Payment System

Payment behavior lives in `src/server/payments`, `src/server/stripe`, `src/server/projects`, and `src/server/onboarding`. Public routes collect only the proposal token and invoke server-side services. The browser never supplies amount, currency, payment type, proposal status, or activation state.

Checkout creation prepares an internal `Payment`, calls Stripe Checkout with deterministic idempotency keys, then stores the returned Checkout Session ID. Webhooks verify signatures, persist Stripe event IDs, cross-check amount/currency against trusted records, and activate projects idempotently after confirmed deposits.
