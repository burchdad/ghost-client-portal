import Link from "next/link";
import { CheckoutButton } from "@/components/payments/checkout-button";
import { ProposalUnavailable } from "@/components/proposals/proposal-unavailable";
import { formatMoney } from "@/lib/format";
import { getPaymentPageState } from "@/server/payments/service";

export default async function PublicProposalPaymentPage({
  params,
}: {
  params: Promise<{ proposalToken: string }>;
}) {
  const { proposalToken } = await params;
  const state = await getPaymentPageState(proposalToken);

  if (state.status === "unavailable") {
    return <ProposalUnavailable title="Payment unavailable" correlationId={state.correlationId} />;
  }

  return (
    <main className="surface min-h-screen px-5 py-10">
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-accent">Ghost AI Solutions</p>
          <h1 className="mt-4 text-4xl font-semibold">Secure deposit payment</h1>
          <p className="mt-4 text-muted">{state.proposal.organization.name}</p>
          <div className="mt-6 rounded-lg border border-line bg-panel p-5">
            <p className="text-sm text-muted">Accepted by</p>
            <p className="mt-1 font-semibold">{state.acceptance.signerName}</p>
            <p className="text-sm text-muted">{state.acceptance.signerTitle}</p>
          </div>
        </div>
        <section className="rounded-lg border border-line bg-panel p-6">
          <h2 className="text-2xl font-semibold">{state.proposal.title}</h2>
          <dl className="mt-6 space-y-4 text-sm">
            <Row label="Contract total" value={formatMoney(state.contractTotalCents, state.proposal.currency)} />
            <Row label="Amount already paid" value={formatMoney(state.amountPaidCents, state.proposal.currency)} />
            <Row label="Deposit due" value={formatMoney(state.depositDueCents, state.proposal.currency)} />
            <Row label="Remaining after deposit" value={formatMoney(state.remainingAfterDepositCents, state.proposal.currency)} />
          </dl>
          <p className="mt-6 rounded-md border border-line bg-white/[0.035] p-4 text-sm text-muted">
            Checkout is created server-side from trusted proposal records. Stripe webhooks confirm payment status; this page does not mark payments successful.
          </p>
          <div className="mt-6 space-y-3">
            <CheckoutButton
              token={proposalToken}
              label={`Pay ${formatMoney(state.depositDueCents, state.proposal.currency)} Deposit`}
              disabled={!state.stripeConfigured}
            />
            {!state.stripeConfigured ? (
              <p className="text-sm text-muted">{state.stripeUnavailableReason}</p>
            ) : null}
            <a href={`/p/${proposalToken}/acceptance-summary`} className="block rounded-md border border-line px-4 py-3 text-center text-sm">
              Download Acceptance Summary
            </a>
            <Link href={`/p/${proposalToken}`} className="block rounded-md border border-line px-4 py-3 text-center text-sm">
              Review Proposal Terms
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
