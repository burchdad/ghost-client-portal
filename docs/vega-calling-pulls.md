# Vega calling pulls

## Behavior

- Portal result selector: 20, 50 (default), or 100. The selector is authoritative over a count typed in the prompt.
- Call-ready mode allows business switchboards without a named decision-maker or email. It does not verify a direct dial or authorize email.
- Source requests preserve the selected query and location; no extra cities are automatically added. Provider location matching is not independent GIS/radius verification.
- Additional connected sources tries the inferred provider, then Apollo and PDL. Turn it off for a single-provider request.
- Up to 12 source API batches and 210 seconds of orchestration; individual requests time out after 45 seconds. These bounds limit work, not dollar cost. Provider enrichment may consume additional credits.
- Existing workspace contacts are excluded before counting toward the target. Include-existing mode links matching records to the new query without inserting duplicates or moving their original query.
- Saves are serialized per organization and recheck duplicates. A concurrent pull can therefore produce a documented shortfall.
- Unknown Vega workspace mappings fail closed in call-ready mode. The portal supplies its authenticated organization's slug; Lead Command resolves the same slug before checking that workspace's phone/company/domain suppressions.
- Email-specific suppressions remove that email while retaining an otherwise callable business. Email sender-governor policy is unchanged.
- Reports retain requested/returned counts, excluded duplicates, unusable phone counts, source errors, and budget/exhaustion stop reasons. Mock source data is never accepted.

## Deployment order

This change spans two separate repositories and is not live merely because one app deploys.

1. Deploy ghost-lead-command with the corrected Google Maps offset pagination and call-ready source API.
2. Confirm the intended portal organization has a matching workspace slug in Lead Command and the existing service access key is configured. Do not map an unknown client to the Ghost workspace.
3. Back up the portal database, then run the portal's normal production migration process, including `20260904120000_vega_calling_pulls`. The migration adds requested counts, a source report, and a query-result join table; it does not remove existing leads.
4. Deploy ghost-client-portal.
5. Run an authenticated, sourcing-only 50-lead pull for the approved market. Confirm the report, phone and website links, tenant scoping, and repeat-pull dedupe. Do not send emails as part of this smoke test.

## Verification

Automated coverage includes 50/100 result targets, page continuation after duplicates, missing phone paths, mock-data rejection, repeated cursors, source failures, request budget, tenant-scoped history, concurrent-save dedupe, and reuse without duplicate insertion. The rendered portal form is tested using fixture data at desktop/mobile sizes. A real authenticated provider pull and production migration remain deployment checks, not claims made by mocked tests.

Google Maps pagination follows the documented `start` offsets rather than `next_page_token`: https://serpapi.com/google-maps-api
