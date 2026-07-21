import Link from "next/link";
import { ProposalAcceptanceForm } from "@/components/proposals/proposal-acceptance-form";
import { ProposalUnavailable } from "@/components/proposals/proposal-unavailable";
import { formatMoney } from "@/lib/format";
import { createOpaqueToken } from "@/lib/crypto";
import { getPublicProposalAvailability } from "@/server/proposals/repository";

export default async function PublicProposalAcceptPage({
  params,
}: {
  params: Promise<{ proposalToken: string }>;
}) {
  const { proposalToken } = await params;
  const availability = await getPublicProposalAvailability(proposalToken, {
    allowFixtureFallback: true,
  });

  if (availability.status === "unavailable") {
    return <ProposalUnavailable correlationId={availability.correlationId} />;
  }

  if (availability.status === "expired") {
    return <ProposalUnavailable title="Proposal expired" correlationId={availability.correlationId} />;
  }

  if (availability.status === "accepted") {
    return (
      <main className="surface grid min-h-screen place-items-center px-6 py-12">
        <section className="max-w-lg rounded-lg border border-line bg-panel p-6 text-center">
          <h1 className="text-3xl font-semibold">Proposal already accepted</h1>
          <p className="mt-3 text-sm text-muted">The acceptance record is already on file.</p>
          <Link href={`/p/${proposalToken}/success`} className="mt-5 inline-flex rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
            View Confirmation
          </Link>
        </section>
      </main>
    );
  }

  const proposal = availability.proposal;

  return (
    <main className="surface min-h-screen px-5 py-8">
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Link href={`/p/${proposalToken}`} className="text-sm text-accent">
            Back to proposal
          </Link>
          <h1 className="mt-5 text-4xl font-semibold">Accept and sign</h1>
          <p className="mt-4 text-muted">{proposal.organization.name}</p>
          <div className="mt-6 rounded-lg border border-line bg-panel p-5">
            <p className="text-sm text-muted">Proposal</p>
            <h2 className="mt-2 text-2xl font-semibold">{proposal.title}</h2>
            <p className="mt-3 text-sm text-muted">
              Total investment: {formatMoney(proposal.totalCents, proposal.currency)}
            </p>
          </div>
        </div>
        <section className="rounded-lg border border-line bg-panel p-6">
          <h2 className="text-2xl font-semibold">Authorized signatory</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Required confirmations are intentionally unchecked. Your typed signature will be stored with a tamper-evident acceptance snapshot.
          </p>
          <div className="mt-6">
            <ProposalAcceptanceForm token={proposalToken} idempotencyKey={createOpaqueToken(18)} />
          </div>
        </section>
      </section>
    </main>
  );
}
