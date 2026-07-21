import Link from "next/link";
import { ProposalUnavailable } from "@/components/proposals/proposal-unavailable";
import { formatMoney } from "@/lib/format";
import { getPaymentSuccessState } from "@/server/payments/service";

export default async function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ proposalToken: string }>;
}) {
  const { proposalToken } = await params;
  const state = await getPaymentSuccessState(proposalToken);

  if (state.status === "unavailable") {
    return <ProposalUnavailable title="Payment status unavailable" />;
  }

  const title =
    state.status === "confirmed"
      ? "Payment received"
      : state.status === "failed"
        ? "Payment was not confirmed"
        : "Payment is being confirmed";

  return (
    <main className="surface min-h-screen px-5 py-10">
      <section className="mx-auto max-w-3xl rounded-lg border border-line bg-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">
          Ghost AI Solutions
        </p>
        <h1 className="mt-4 text-4xl font-semibold">{title}</h1>
        <p className="mt-3 text-muted">{state.proposal.title}</p>
        <dl className="mt-6 grid gap-4 text-sm md:grid-cols-2">
          <Info label="Organization" value={state.proposal.organization.name} />
          <Info
            label="Deposit amount"
            value={
              state.deposit
                ? formatMoney(
                    state.deposit.amountCents,
                    state.proposal.currency,
                  )
                : "Pending"
            }
          />
          <Info
            label="Payment date"
            value={
              state.payment?.paidAt
                ? state.payment.paidAt.toLocaleString()
                : "Not confirmed yet"
            }
          />
          <Info
            label="Project status"
            value={state.project?.status ?? "Activation pending"}
          />
        </dl>
        <p className="mt-6 rounded-md border border-line bg-white/[0.035] p-4 text-sm text-muted">
          {state.status === "confirmed"
            ? "Your deposit is confirmed. Project onboarding is the next step."
            : state.status === "failed"
              ? "No confirmed charge is recorded here. You can safely return to the payment page."
              : "Stripe is still confirming this payment. Refresh this page in a moment or contact support if it does not update."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {state.status === "failed" ? (
            <Link
              href={`/p/${proposalToken}/payment`}
              className="rounded-md bg-accent px-4 py-3 text-center text-sm font-semibold text-slate-950"
            >
              Return to Payment
            </Link>
          ) : (
            <Link
              href={
                state.project ? `/onboarding/${state.project.id}` : "/dashboard"
              }
              className="rounded-md bg-accent px-4 py-3 text-center text-sm font-semibold text-slate-950"
            >
              Begin Onboarding
            </Link>
          )}
          <a
            href={`/p/${proposalToken}/acceptance-summary`}
            className="rounded-md border border-line px-4 py-3 text-center text-sm"
          >
            Download Acceptance PDF
          </a>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
