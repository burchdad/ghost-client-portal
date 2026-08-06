import Link from "next/link";
import { ArrowRight, FileSignature } from "lucide-react";
import {
  EmptyWorkspace,
  MetricCard,
  PageHero,
  SectionPanel,
  StatusBadge,
} from "@/components/workspace-ui";
import { requireOrganizationMembership } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { formatDate, formatMoney, humanizeEnum } from "@/lib/format";

export default async function ProposalsPage() {
  const { organization } = await requireOrganizationMembership();
  const proposals = await getDb().proposal.findMany({
    where: { organizationId: organization.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  const totalCents = proposals.reduce(
    (total, proposal) => total + proposal.totalCents,
    0,
  );
  const openProposals = proposals.filter((proposal) =>
    ["DRAFT", "SENT", "VIEWED", "APPROVED", "PAYMENT_PENDING"].includes(
      proposal.status,
    ),
  );

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Proposal hub"
        title={`Commercial approvals for ${organization.name}`}
        body="Review client-visible proposals, acceptance status, investment totals, and the documents that unlock payments and delivery workspaces."
        metrics={[
          {
            label: "Proposals",
            value: String(proposals.length),
            detail: "Visible records",
          },
          {
            label: "Open",
            value: String(openProposals.length),
            detail: "Awaiting decision or fulfillment",
          },
          {
            label: "Investment",
            value: formatMoney(totalCents),
            detail: "Total proposed value",
          },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Accepted"
          value={String(
            proposals.filter((proposal) => proposal.status === "APPROVED")
              .length,
          )}
          detail="Approved proposals ready for payment or delivery."
          tone="accent"
        />
        <MetricCard
          label="Pending"
          value={String(
            proposals.filter((proposal) =>
              ["SENT", "VIEWED"].includes(proposal.status),
            ).length,
          )}
          detail="Waiting on client review or signature."
        />
        <MetricCard
          label="Latest update"
          value={proposals[0] ? formatDate(proposals[0].updatedAt) : "None"}
          detail="Most recent proposal activity."
        />
      </section>

      {proposals.length ? (
        <SectionPanel title="Proposal records" eyebrow="Approvals">
          <div className="space-y-3">
            {proposals.map((proposal) => (
              <Link
                key={proposal.id}
                href={`/proposals/${proposal.id}`}
                className="block rounded-lg border border-line bg-white/[0.035] p-5 transition hover:border-accent hover:bg-white/[0.055]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        tone={
                          proposal.status === "APPROVED" ? "accent" : "default"
                        }
                      >
                        {humanizeEnum(proposal.status)}
                      </StatusBadge>
                      <StatusBadge>{proposal.proposalNumber}</StatusBadge>
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold">
                      {proposal.title}
                    </h2>
                    <p className="mt-2 text-sm text-muted">
                      Updated {formatDate(proposal.updatedAt)}
                    </p>
                  </div>
                  <div className="lg:text-right">
                    <p className="text-2xl font-semibold">
                      {formatMoney(proposal.totalCents, proposal.currency)}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-2 text-sm text-accent">
                      View proposal
                      <ArrowRight size={16} aria-hidden />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </SectionPanel>
      ) : (
        <EmptyWorkspace
          icon={FileSignature}
          title="No proposals are available yet"
          body="When Ghost publishes a proposal, this hub will show the offer, investment, acceptance status, summary download, and payment next steps."
          steps={[
            "Proposal created by Ghost",
            "Client reviews and accepts",
            "Payments and projects unlock",
          ]}
        />
      )}
    </section>
  );
}
