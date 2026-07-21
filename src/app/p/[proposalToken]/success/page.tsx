import Link from "next/link";
import { ProposalUnavailable } from "@/components/proposals/proposal-unavailable";
import { formatMoney } from "@/lib/format";
import { getAcceptanceForToken } from "@/server/proposals/repository";

export default async function PublicProposalSuccessPage({
  params,
}: {
  params: Promise<{ proposalToken: string }>;
}) {
  const { proposalToken } = await params;
  const result = await getAcceptanceForToken(proposalToken).catch(() => null);

  if (!result) {
    return <ProposalUnavailable title="Confirmation unavailable" />;
  }

  const deposit = result.proposal.paymentSchedule.find(
    (item) => item.paymentType === "DEPOSIT",
  );

  return (
    <main className="surface min-h-screen px-5 py-10">
      <section className="mx-auto max-w-3xl rounded-lg border border-line bg-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">
          Proposal accepted
        </p>
        <h1 className="mt-4 text-4xl font-semibold">{result.proposal.title}</h1>
        <dl className="mt-6 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted">Organization</dt>
            <dd className="mt-1 font-medium">
              {result.proposal.organization.name}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Signatory</dt>
            <dd className="mt-1 font-medium">{result.acceptance.signerName}</dd>
          </div>
          <div>
            <dt className="text-muted">Accepted</dt>
            <dd className="mt-1 font-medium">
              {result.acceptance.acceptedAt.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Total project investment</dt>
            <dd className="mt-1 font-medium">
              {formatMoney(
                result.proposal.totalCents,
                result.proposal.currency,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Deposit due</dt>
            <dd className="mt-1 font-medium">
              {deposit
                ? formatMoney(deposit.amountCents, result.proposal.currency)
                : "Pending"}
            </dd>
          </div>
        </dl>
        <p className="mt-6 rounded-md border border-line bg-white/[0.035] p-4 text-sm text-muted">
          Payment collection is the next step and will be completed in Phase 3.
          No payment has been processed yet.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={`/p/${proposalToken}/acceptance-summary`}
            className="rounded-md bg-accent px-4 py-3 text-center text-sm font-semibold text-slate-950"
          >
            Download Acceptance Summary
          </a>
          <button
            disabled
            className="rounded-md border border-line px-4 py-3 text-sm text-muted"
          >
            Payment setup in progress
          </button>
          <Link
            href={`/p/${proposalToken}`}
            className="rounded-md border border-line px-4 py-3 text-center text-sm"
          >
            View Proposal
          </Link>
        </div>
      </section>
    </main>
  );
}
