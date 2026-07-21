# Client Invitations

Invitations are cryptographically random and hashed at rest.

The admin workflow creates an invitation link for review. It does not send automatically during deployment.

Activation flow:

1. Client opens `/invite/[token]`.
2. Client confirms email and name.
3. Client creates a password.
4. Client accepts portal terms.
5. The invitation is consumed.
6. Organization membership is created or restored.
7. Audit, activity, and welcome notification records are created.
8. Client is redirected to `/dashboard`.

Tokens are expiring, single use, revocable, tenant scoped, and role scoped.
