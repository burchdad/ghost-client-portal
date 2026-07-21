# Client Dashboard

The authenticated dashboard is organization-scoped and answers:

- What Ghost is working on
- What needs attention
- What has been paid
- What remains due
- What the next milestone is
- What client-safe activity has happened

Dashboard data comes from `src/server/dashboard/service.ts`. Queries are scoped to the authenticated organization membership and filter activity to client-safe event types.
