import Link from "next/link";
import { ProposalStatusBadge } from "@/components/proposals/proposal-status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { inspectProposalLifecycle } from "@/server/integrity/service";
import {
  publishProposalAction,
  reconcileProposalLifecycleAction,
  revokeProposalTokenAction,
  rotateProposalTokenAction,
  updateProposalOperationsAction,
} from "../actions";

export default async function AdminProposalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ proposalId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  await requireInternalRole();
  const [{ proposalId }, query] = await Promise.all([params, searchParams]);
  const proposal = await getDb().proposal.findUnique({
    where: { id: proposalId },
    include: {
      organization: true,
      deliverables: { orderBy: { sortOrder: "asc" } },
      paymentSchedule: { orderBy: { sortOrder: "asc" } },
      acceptances: { orderBy: { acceptedAt: "desc" }, take: 1 },
      sections: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      projects: { orderBy: { createdAt: "desc" } },
      primaryContact: true,
      internalOwner: true,
    },
  });
  const [contacts, owners] = await Promise.all([
    getDb().contact.findMany({
      where: { organizationId: proposal?.organizationId ?? "" },
      orderBy: { name: "asc" },
    }),
    getDb().user.findMany({
      where: { internalRole: { not: null }, deletedAt: null },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!proposal) {
    return (
      <section className="rounded-lg border border-line bg-panel p-6">
        Proposal not found.
      </section>
    );
  }

  const rawToken = query.token ?? null;
  const acceptance = proposal.acceptances[0];
  const warnings = inspectProposalLifecycle(proposal);

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-accent">{proposal.organization.name}</p>
            <h1 className="mt-2 text-3xl font-semibold">{proposal.title}</h1>
            <p className="mt-2 text-sm text-muted">
              {proposal.proposalNumber} · {proposal.versionLabel}
            </p>
          </div>
          <ProposalStatusBadge status={proposal.status} />
        </div>
        {rawToken ? (
          <div className="mt-5 rounded-md border border-accent/30 bg-accent/10 p-4 text-sm">
            <p className="font-medium text-accent">
              Secure public proposal link
            </p>
            <Link
              href={`/p/${rawToken}`}
              className="mt-2 block break-all font-mono text-foreground"
            >
              /p/{rawToken}
            </Link>
          </div>
        ) : (
          <p className="mt-5 rounded-md border border-line bg-white/[0.035] p-4 text-sm text-muted">
            Raw token is not stored. Rotate the token to generate a fresh
            previewable link.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Info
          label="First viewed"
          value={
            proposal.viewedAt ? proposal.viewedAt.toLocaleString() : "Not yet"
          }
        />
        <Info
          label="Last viewed"
          value={
            proposal.lastViewedAt
              ? proposal.lastViewedAt.toLocaleString()
              : "Not yet"
          }
        />
        <Info label="Views" value={String(proposal.viewCount)} />
      </div>

      <div className="rounded-lg border border-line bg-panel p-5">
        <h2 className="text-xl font-semibold">Lifecycle integrity</h2>
        <div className="mt-4 space-y-3 text-sm">
          {warnings.length ? (
            warnings.map((warning) => (
              <div
                key={warning.code}
                className="rounded-md border border-line bg-white/[0.035] p-3"
              >
                <p
                  className={
                    warning.severity === "critical"
                      ? "font-semibold text-red-200"
                      : "font-semibold text-amber-100"
                  }
                >
                  {warning.message}
                </p>
                {warning.repair ? (
                  <p className="mt-1 text-muted">{warning.repair}</p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="rounded-md border border-emerald-300/30 bg-emerald-400/10 p-3 text-emerald-100">
              No lifecycle integrity warnings detected.
            </p>
          )}
        </div>
        {warnings.some(
          (warning) => warning.code === "accepted_without_view",
        ) ? (
          <form
            action={reconcileProposalLifecycleAction}
            className="mt-4 rounded-md border border-amber-200/30 bg-amber-400/10 p-4"
          >
            <input type="hidden" name="proposalId" value={proposal.id} />
            <label className="text-sm text-amber-50">
              Reconciliation reason
              <textarea
                name="reason"
                required
                minLength={10}
                className="mt-2 min-h-24 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
              />
            </label>
            <button className="mt-3 rounded-md border border-amber-200/40 px-4 py-3 text-sm text-amber-50">
              Record lifecycle reconciliation
            </button>
          </form>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Proposal content</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <InfoRow
              label="Expiration"
              value={formatDate(proposal.expiresAt)}
            />
            <InfoRow
              label="Investment"
              value={formatMoney(proposal.totalCents, proposal.currency)}
            />
            <InfoRow
              label="Token hint"
              value={proposal.publicTokenHint ?? "None"}
            />
            <InfoRow
              label="Revoked"
              value={
                proposal.tokenRevokedAt
                  ? proposal.tokenRevokedAt.toLocaleString()
                  : "No"
              }
            />
          </dl>
          <h3 className="mt-5 font-semibold">Deliverables</h3>
          <ul className="mt-3 list-inside list-disc text-sm text-muted">
            {proposal.deliverables.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Acceptance</h2>
          {acceptance ? (
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow label="Signatory" value={acceptance.signerName} />
              <InfoRow label="Title" value={acceptance.signerTitle} />
              <InfoRow label="Email" value={acceptance.signerEmail} />
              <InfoRow
                label="Accepted"
                value={acceptance.acceptedAt.toLocaleString()}
              />
              {rawToken ? (
                <a
                  href={`/p/${rawToken}/acceptance-summary`}
                  className="inline-flex rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
                >
                  Download summary
                </a>
              ) : null}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted">
              No acceptance has been recorded.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Payment schedule</h2>
          <div className="mt-4 space-y-3 text-sm">
            {proposal.paymentSchedule.map((item) => (
              <div key={item.id} className="rounded-md bg-white/[0.035] p-3">
                <div className="flex justify-between gap-4">
                  <p className="font-medium">{item.label}</p>
                  <p>{formatMoney(item.amountCents, item.currency)}</p>
                </div>
                <p className="mt-1 text-muted">
                  {item.status} · Checkout{" "}
                  {item.stripeCheckoutId ? "created" : "not created"}
                </p>
              </div>
            ))}
          </div>
          {rawToken ? (
            <Link
              href={`/p/${rawToken}/payment`}
              className="mt-4 inline-flex rounded-md border border-line px-4 py-3 text-sm"
            >
              Copy secure payment URL
            </Link>
          ) : null}
        </div>
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Payment attempts</h2>
          <div className="mt-4 space-y-3 text-sm">
            {proposal.payments.length ? (
              proposal.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-md bg-white/[0.035] p-3"
                >
                  <p className="font-medium">
                    {formatMoney(payment.amountCents, payment.currency)} ·{" "}
                    {payment.status}
                  </p>
                  <p className="mt-1 text-muted">
                    Checkout: {payment.stripeCheckoutId ? "created" : "none"} ·
                    Intent: {payment.stripePaymentIntentId ? "present" : "none"}
                  </p>
                  {payment.recoveryRequired ? (
                    <p className="mt-1 text-red-200">
                      Recovery required: {payment.recoveryReason}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-muted">
                No payment attempts have been created.
              </p>
            )}
          </div>
          <p className="mt-4 text-sm text-muted">
            Project activation:{" "}
            {proposal.projects[0]?.status ?? "not activated"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel p-5">
        <h2 className="text-xl font-semibold">Controls</h2>
        <form
          action={updateProposalOperationsAction}
          className="mt-4 grid gap-3 rounded-md border border-line p-4 md:grid-cols-3"
        >
          <input type="hidden" name="proposalId" value={proposal.id} />
          <label className="text-sm text-muted">
            Proposal contact
            <select
              name="primaryContactId"
              defaultValue={proposal.primaryContactId ?? ""}
              className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
            >
              <option value="">None</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name} ({contact.email})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-muted">
            Proposal owner
            <select
              name="internalOwnerId"
              defaultValue={proposal.internalOwnerId ?? ""}
              className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
            >
              <option value="">Unassigned</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-muted">
            Expiration
            <input
              name="expiresAt"
              type="date"
              defaultValue={
                proposal.expiresAt
                  ? proposal.expiresAt.toISOString().slice(0, 10)
                  : ""
              }
              className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
            />
          </label>
          <button className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950 md:col-span-3">
            Save proposal operations
          </button>
        </form>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <form action={publishProposalAction}>
            <input type="hidden" name="proposalId" value={proposal.id} />
            <button className="w-full rounded-md border border-line px-4 py-3 text-sm">
              Send / publish
            </button>
          </form>
          <form
            action={rotateProposalTokenAction}
            className="rounded-md border border-line p-3"
          >
            <input type="hidden" name="proposalId" value={proposal.id} />
            <label className="flex items-start gap-2 text-xs text-muted">
              <input
                type="checkbox"
                name="confirmRotation"
                value="yes"
                required
                className="mt-1"
              />
              Confirm token rotation. The old public proposal link stops
              working.
            </label>
            <button className="mt-3 w-full rounded-md border border-line px-4 py-3 text-sm">
              Rotate token
            </button>
          </form>
          <form action={revokeProposalTokenAction}>
            <input type="hidden" name="proposalId" value={proposal.id} />
            <button className="w-full rounded-md border border-red-300/40 px-4 py-3 text-sm text-red-100">
              Revoke link
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
