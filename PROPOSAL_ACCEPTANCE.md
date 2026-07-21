# Proposal Acceptance

Acceptance collects legal name, title, email, authorization confirmation, scope confirmation, payment schedule confirmation, terms confirmation, typed signature, optional note, and optional purchase-order number.

Server-side validation uses Zod. The typed signature is normalized for whitespace, punctuation, and case, and must reasonably match the legal name.

When accepted, the service creates a deterministic snapshot containing proposal identity, organization, summary, scope, deliverables, exclusions, timeline, total amount, payment schedule, terms, selected add-ons, signatory details, and acceptance timestamp.

Hashing strategy:

- `proposalContentHash` hashes the canonical proposal snapshot without signatory-only fields.
- `acceptancePayloadHash` hashes signatory data, confirmations, proposal version, and timestamp.
- `acceptanceHash` combines both hashes.

Duplicate prevention uses `idempotencyKey` and a unique `(proposalId, proposalVersion)` constraint. Duplicate valid submissions return the original success path and do not create another acceptance.

Acceptance records are immutable through normal workflows. If an accepted proposal must change, create a new version or replacement proposal.

The acceptance summary route generates a print-friendly HTML download from the stored snapshot. It does not expose internal database IDs or raw proposal tokens.

After acceptance, Phase 3 payment pages use the acceptance record as an eligibility requirement. Checkout cannot be created for proposals without an immutable acceptance snapshot.
