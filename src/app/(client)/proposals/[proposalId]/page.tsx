import Link from "next/link";
import { requireProposalAccess } from "@/lib/auth/guards";
import { formatDate, formatMoney, humanizeEnum } from "@/lib/format";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposal } = await requireProposalAccess((await params).proposalId);

  return (
    <section className="space-y-6">
      <div className="panel-surface rounded-lg border border-line p-6">
        <Link
          href="/proposals"
          className="text-sm text-muted hover:text-accent"
        >
          Back to proposals
        </Link>
        <p className="mt-5 text-sm text-accent">{proposal.proposalNumber}</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{proposal.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
              {proposal.executiveSummary}
            </p>
          </div>
          <div className="rounded-md border border-line bg-black/10 px-4 py-3 text-sm">
            {humanizeEnum(proposal.status)}
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Info
          label="Investment"
          value={formatMoney(proposal.totalCents, proposal.currency)}
        />
        <Info label="Version" value={proposal.versionLabel} />
        <Info label="Expires" value={formatDate(proposal.expiresAt)} />
        <Info label="Last viewed" value={formatDate(proposal.lastViewedAt)} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Scope" body={proposal.scopeOfWork} />
        <Section title="Timeline" body={proposal.timeline} />
        <Section title="Terms" body={proposal.terms} />
        <Section title="Pricing" body={proposal.pricingSummary} />
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

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">
        {body}
      </p>
    </div>
  );
}
