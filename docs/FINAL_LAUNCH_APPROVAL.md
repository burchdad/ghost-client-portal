# Final Launch Approval

The launch-readiness page calculates:

- `NO-GO` when any blocker remains
- `REVIEW REQUIRED` when checks pass but the operator checklist has not been recorded as `GO`
- `GO` only after all required checks pass and the final launch review is recorded

Download the latest report from:

```text
/admin/organizations/[organizationId]/launch-readiness/report
```

The report excludes raw proposal and invitation tokens.
