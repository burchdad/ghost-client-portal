import type { ProposalAcceptance } from "@prisma/client";
import type { AcceptanceSnapshot } from "./types";

export function buildAcceptanceSummaryHtml(acceptance: ProposalAcceptance) {
  const snapshot = acceptance.proposalSnapshot as AcceptanceSnapshot;
  const money = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: snapshot.currency.toUpperCase(),
    }).format(cents / 100);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Proposal Acceptance Summary</title>
  <style>
    body { font-family: Arial, sans-serif; color: #101820; margin: 40px; line-height: 1.5; }
    h1, h2 { color: #07111f; }
    section { margin: 28px 0; }
    .meta { color: #536173; }
    .hash { font-family: monospace; overflow-wrap: anywhere; }
    @media print { body { margin: 24px; } }
  </style>
</head>
<body>
  <h1>Ghost AI Solutions</h1>
  <p class="meta">Proposal Acceptance Summary</p>
  <section>
    <h2>${escapeHtml(snapshot.clientOrganization)}</h2>
    <p><strong>${escapeHtml(snapshot.proposalTitle)}</strong></p>
    <p>Proposal ${escapeHtml(snapshot.proposalNumber)} · ${escapeHtml(snapshot.proposalVersionLabel)}</p>
  </section>
  <section><h2>Summary</h2><p>${escapeHtml(snapshot.executiveSummary)}</p></section>
  <section><h2>Scope</h2><p>${escapeHtml(snapshot.scopeOfWork)}</p></section>
  <section><h2>Deliverables</h2><ul>${snapshot.deliverables.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
  <section><h2>Investment</h2><p>${money(snapshot.totalCents)}</p></section>
  <section><h2>Payment Schedule</h2><ul>${snapshot.paymentSchedule.map((item) => `<li>${escapeHtml(item.label)}: ${money(item.amountCents)}</li>`).join("")}</ul></section>
  <section><h2>Terms</h2><p>${escapeHtml(snapshot.terms)}</p></section>
  <section>
    <h2>Signatory</h2>
    <p>${escapeHtml(snapshot.signatory.fullName)} · ${escapeHtml(snapshot.signatory.title)} · ${escapeHtml(snapshot.signatory.email)}</p>
    <p>Accepted at ${escapeHtml(new Date(snapshot.acceptedAt).toLocaleString())}</p>
    <p>Typed signature: ${escapeHtml(snapshot.signatory.typedSignature)}</p>
  </section>
  <section>
    <h2>Verification</h2>
    <p>Proposal content hash:</p><p class="hash">${acceptance.proposalContentHash}</p>
    <p>Acceptance payload hash:</p><p class="hash">${acceptance.acceptancePayloadHash}</p>
    <p>This document was generated from the stored immutable acceptance snapshot, not the mutable live proposal record.</p>
  </section>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
