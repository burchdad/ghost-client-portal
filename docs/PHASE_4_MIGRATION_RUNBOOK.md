# Phase 4 Migration Runbook

## Before Migration

- Confirm the target environment and database URL.
- Take a database backup.
- Confirm the deployment contains the matching Prisma schema and generated client.
- Confirm no fixture seed command will run against production.

## Apply

Use the guarded production command. Do not run this against production without explicit confirmation.

```bash
APP_ENV=production \
APPLY_PRODUCTION_MIGRATION=YES \
PRODUCTION_MIGRATION_CONFIRMATION="APPLY PHASE 4.6 PRODUCTION MIGRATION" \
PRODUCTION_BACKUP_REFERENCE="railway-snapshot-or-note" \
PRODUCTION_BACKUP_TIMESTAMP="2026-07-21T00:00:00.000Z" \
PRODUCTION_MIGRATION_OPERATOR="Stephen" \
npm run migrate:production
```

## After Migration

- Run `npx prisma validate`.
- Load `/login`.
- Load the admin organization detail page.
- Run the production smoke test.
- Review application logs for Prisma migration or Server Component exceptions.
