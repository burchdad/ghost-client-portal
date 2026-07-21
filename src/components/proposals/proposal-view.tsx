import Link from "next/link";
import type { ProposalWithPublicRelations } from "@/server/proposals/types";
import { formatDate } from "@/lib/format";
import { DeliverablesList } from "./deliverables-list";
import { InvestmentSummary } from "./investment-summary";
import { ProposalSection } from "./proposal-section";
import { ProposalStatusBadge } from "./proposal-status-badge";

export function ProposalView({
  proposal,
  token,
  accepted = false,
}: {
  proposal: ProposalWithPublicRelations;
  token: string;
  accepted?: boolean;
}) {
  return (
    <main className="surface min-h-screen px-5 py-6 print:bg-white print:text-slate-950">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-start justify-between gap-4 border-b border-line pb-5 print:border-slate-300">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-accent">Ghost AI Solutions</p>
            <h1 className="mt-3 text-4xl font-semibold md:text-6xl">{proposal.title}</h1>
            <p className="mt-4 text-muted">{proposal.organization.name}</p>
          </div>
          <ProposalStatusBadge status={proposal.status} />
        </header>

        <section className="rounded-lg border border-line bg-panel p-5 print:border-slate-300 print:bg-white">
          <div className="grid gap-4 text-sm text-muted md:grid-cols-4">
            <p>Proposal: <span className="text-foreground print:text-slate-950">{proposal.proposalNumber}</span></p>
            <p>Prepared: <span className="text-foreground print:text-slate-950">{formatDate(proposal.sentAt ?? proposal.createdAt)}</span></p>
            <p>Expires: <span className="text-foreground print:text-slate-950">{formatDate(proposal.expiresAt)}</span></p>
            <p>Version: <span className="text-foreground print:text-slate-950">{proposal.versionLabel}</span></p>
          </div>
        </section>

        <ProposalSection title="Executive Summary">
          <p>{proposal.executiveSummary}</p>
        </ProposalSection>
        <ProposalSection title="Objectives">
          <p>{proposal.objectives}</p>
        </ProposalSection>
        <ProposalSection title="Scope of Work">
          <p>{proposal.scopeOfWork}</p>
        </ProposalSection>
        <ProposalSection title="Deliverables">
          <DeliverablesList deliverables={proposal.deliverables} />
        </ProposalSection>
        <ProposalSection title="Exclusions">
          <p>{proposal.exclusions}</p>
        </ProposalSection>
        <ProposalSection title="Timeline">
          <p>{proposal.timeline}</p>
        </ProposalSection>
        <ProposalSection title="Investment">
          <InvestmentSummary
            totalCents={proposal.totalCents}
            currency={proposal.currency}
            pricingSummary={proposal.pricingSummary}
            schedule={proposal.paymentSchedule}
          />
        </ProposalSection>
        {proposal.addOns.length ? (
          <ProposalSection title="Optional Add-ons">
            <ul className="space-y-2">
              {proposal.addOns.map((addOn) => (
                <li key={addOn.id}>{addOn.name}</li>
              ))}
            </ul>
          </ProposalSection>
        ) : null}
        <ProposalSection title="Terms">
          <p>{proposal.terms}</p>
        </ProposalSection>

        <section className="sticky bottom-4 mt-8 rounded-lg border border-accent/30 bg-panel/95 p-4 shadow-2xl shadow-black/30 backdrop-blur print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              {accepted ? "This proposal has been accepted. Payment setup is next." : "Ready to move forward?"}
            </p>
            {accepted ? (
              <Link href={`/p/${token}/success`} className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
                View Confirmation
              </Link>
            ) : (
              <Link href={`/p/${token}/accept`} className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
                Review and Accept Proposal
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
