# Mission Control Integration

The MVP is intentionally decoupled from Ghost Mission Control. Integration contracts are defined in `src/lib/mission-control/types.ts`.

Current local behavior records sync requests in the portal database outbox. Future production integration should replace the local adapter with either:

- authenticated Mission Control API calls, or
- webhook-based outbox publishing with retry handling.

Supported boundary operations include proposal status pushes, payment status pushes, Mission Control project creation, client request pushes, approval events, client-visible project status pulls, milestone pulls, and deliverable metadata pulls.

Mission Control may send only client-approved fields back to this app.
