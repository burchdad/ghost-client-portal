# Production Migration Confirmation

Run `npm run inspect:production` first. It is read-only.

Before `npm run migrate:production`, Stephen must confirm:

- Railway backup or snapshot completed
- Backup timestamp
- Backup reference or note
- Operator identity
- Intended migration
- Confirmation phrase: `APPLY PHASE 4.6 PRODUCTION MIGRATION`

The guarded migration command refuses to run unless `APP_ENV=production`, `APPLY_PRODUCTION_MIGRATION=YES`, a backup reference, a backup timestamp, and an operator label are present.
