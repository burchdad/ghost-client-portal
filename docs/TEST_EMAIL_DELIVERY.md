# Test Email Delivery

The lifecycle test page can send the fake proposal and fake invitation to `PORTAL_TEST_CLIENT_EMAIL`.

## Variables

- `PORTAL_TEST_CLIENT_EMAIL`: required recipient for test lifecycle sends.
- `PORTAL_TEST_CLIENT_NAME`: optional display name.
- `PORTAL_TEST_CLIENT_TITLE`: optional contact title.
- `PORTAL_TEST_ORGANIZATION_NAME`: optional fake organization name.
- `EMAIL_FROM`: verified sender address.
- `EMAIL_PROVIDER_API_KEY`: Resend-compatible API key.
- `EMAIL_PROVIDER=console`: optional override to prevent external delivery.

## Send Boundaries

Proposal email requires `SEND TEST PROPOSAL`.

Invitation email requires a reviewed invitation, the one-time invitation token, and `SEND TEST INVITATION`.

The app stores provider status and message ID on the `TestRun` record without exposing provider secrets.
