import { CreditCard, ReceiptText } from "lucide-react";
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

export default async function PaymentsPage() {
  const { organization } = await requireOrganizationMembership();
  const payments = await getDb().payment.findMany({
    where: { organizationId: organization.id },
    include: { project: true, proposal: true, paymentScheduleItem: true },
    orderBy: { createdAt: "desc" },
  });
  const paidCents = payments
    .filter((payment) => payment.status === "PAID")
    .reduce((total, payment) => total + payment.amountCents, 0);
  const pendingCents = payments
    .filter((payment) => payment.status !== "PAID")
    .reduce((total, payment) => total + payment.amountCents, 0);
  const duePayments = payments.filter((payment) =>
    ["PENDING", "CHECKOUT_CREATED", "PROCESSING", "RECOVERY_REQUIRED"].includes(
      payment.status,
    ),
  );

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Payment center"
        title={`Billing activity for ${organization.name}`}
        body="Track checkout status, recorded payments, pending balances, and the proposal or project each payment belongs to."
        metrics={[
          {
            label: "Records",
            value: String(payments.length),
            detail: "Payment events",
          },
          {
            label: "Paid",
            value: formatMoney(paidCents),
            detail: "Succeeded payments",
          },
          {
            label: "Pending",
            value: formatMoney(pendingCents),
            detail: "Open or processing",
          },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Due or processing"
          value={String(duePayments.length)}
          detail="Payments that may still need attention."
          tone={duePayments.length ? "warning" : "accent"}
        />
        <MetricCard
          label="Latest record"
          value={payments[0] ? formatDate(payments[0].createdAt) : "None"}
          detail="Most recent payment activity."
        />
        <MetricCard
          label="Workspace status"
          value={humanizeEnum(organization.accountStatus)}
          detail="Client account payment context."
        />
      </section>

      {payments.length ? (
        <SectionPanel title="Payment records" eyebrow="Stripe ledger">
          <div className="divide-y divide-line rounded-md border border-line">
            {payments.map((payment) => (
              <div key={payment.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    <div className="hidden rounded-md border border-accent/30 bg-accent/10 p-2 text-accent sm:block">
                      <ReceiptText size={20} aria-hidden />
                    </div>
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          tone={
                            payment.status === "PAID" ? "accent" : "warning"
                          }
                        >
                          {humanizeEnum(payment.status)}
                        </StatusBadge>
                        <StatusBadge>
                          {humanizeEnum(payment.paymentType)}
                        </StatusBadge>
                      </div>
                      <h2 className="mt-3 text-xl font-semibold">
                        {payment.paymentScheduleItem?.label ??
                          humanizeEnum(payment.paymentType)}
                      </h2>
                      <p className="mt-2 text-sm text-muted">
                        {payment.project?.name ??
                          payment.proposal?.title ??
                          organization.name}
                      </p>
                    </div>
                  </div>
                  <div className="lg:text-right">
                    <p className="text-2xl font-semibold">
                      {formatMoney(payment.amountCents, payment.currency)}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      {payment.paidAt
                        ? `Paid ${formatDate(payment.paidAt)}`
                        : `Created ${formatDate(payment.createdAt)}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
      ) : (
        <EmptyWorkspace
          icon={CreditCard}
          title="No payments are due right now"
          body="When a proposal requires a deposit, milestone payment, or final balance, the payment record and checkout status will appear here."
          steps={[
            "Proposal acceptance creates payment context",
            "Stripe status syncs into the ledger",
            "Receipts and balances stay visible",
          ]}
        />
      )}
    </section>
  );
}
