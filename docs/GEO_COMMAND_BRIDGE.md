# G.E.O. Command Bridge

The monthly client portal connects to `geo.ghostai.solutions` through a server-side bridge.

## Environment

- `GEO_COMMAND_BASE_URL`: defaults to `https://geo.ghostai.solutions`.
- `GEO_COMMAND_API_TOKEN`: preferred server-to-server token for the bridge.
- `GEO_CLIENT_ID_MAP`: optional organization-to-G.E.O. client map.

`GEO_COMMAND_API_TOKEN` may reuse the G.E.O. app's `GEO_ADMIN_TOKEN`, `ADMIN_API_TOKEN`, or `OPERATOR_API_TOKEN` value. Do not expose it to the browser.

`GEO_CLIENT_ID_MAP` accepts JSON:

```json
{"design-haven-build":"client-mrs5c8j2-770849"}
```

or comma-separated pairs:

```text
design-haven-build:client-mrs5c8j2-770849,ghost-ai-solutions:client-mplijcy9-461cad
```

The bridge ships with default mappings for Ghost AI Solutions and Design Haven Build. Add future monthly clients to `GEO_CLIENT_ID_MAP`.

## Surfaces

- Client page: `/geo`
- Client API: `/api/geo/approval-center`
- Founder/admin page: `/admin/geo`

The client page shows client-safe G.E.O. approval cards and can record client decisions. It does not publish Google Business Profile posts, mutate source code, send outreach, or claim performance outcomes.
