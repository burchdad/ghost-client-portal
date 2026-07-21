# Test Client Data Policy

The fake-client lifecycle is separate from live client launch records.

## Required Markers

Test-created organizations, contacts, proposals, projects, payments, and invitations use:

- `isTestRecord=true`
- `testRunId=<TestRun.id>`

The `TestRun` record stores operational metadata such as token hints, send timestamps, message IDs, and cleanup state.

## Production Rules

- Do not hardcode a personal email address in lifecycle code.
- Use `PORTAL_TEST_CLIENT_EMAIL` for the recipient.
- Do not use `example.com` as the test recipient.
- Do not edit, reuse, or cleanup Gray Matters records from this workflow.
- Do not complete live Stripe charges as part of general validation.

## Cleanup Rules

Cleanup is a soft archive path. It revokes invitations, revokes proposal tokens, hides projects from the portal, and soft-deletes the marked test organization. Records with real payment evidence are left untouched for manual review.
