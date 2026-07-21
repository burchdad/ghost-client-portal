import type { PaymentStatus } from "@prisma/client";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { formatMoney, humanizeEnum } from "@/lib/format";
import { redactStripeId } from "@/server/stripe/ids";

const statuses: PaymentStatus[] = [
  "PENDING",
  "CHECKOUT_CREATED",
  "PROCESSING",
  "PAID",
  "FAILED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "RECOVERY_REQUIRED",
];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: PaymentStatus; q?: string }>;
}) {
  await requireInternalRole();
  const filters = await searchParams;
  const payments = await getDb().payment.findMany({
    where: {
      status: filters.status || undefined,
      OR: filters.q
        ? [
            { organization: { name: { contains: filters.q, mode: "insensitive" } } },
            { proposal: { proposalNumber: { contains: filters.q, mode: "insensitive" } } },
            { stripeCheckoutId: { contains: filters.q, mode: "insensitive" } },
            { stripePaymentIntentId: { contains: filters.q, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: { organization: true, proposal: true, project: true, paymentScheduleItem: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section>
      <h1 className="text-3xl font-semibold">Admin payments</h1>
      <p className="mt-2 text-sm text-muted">Stripe-backed payment attempts, confirmations, refunds, and recovery indicators.</p>
      <form className="mt-6 grid gap-3 rounded-lg border border-line bg-panel p-4 md:grid-cols-[1fr_220px_auto]">
        <input name="q" placeholder="Search organization, proposal, or Stripe reference" defaultValue={filters.q} className="rounded-md border border-line bg-black/20 px-3 py-3 text-sm" />
        <select name="status" defaultValue={filters.status ?? ""} className="rounded-md border border-line bg-black/20 px-3 py-3 text-sm">
          <option value="">All statuses</option>
          {statuses.map((status) => <option key={status} value={status}>{humanizeEnum(status)}</option>)}
        </select>
        <button className="rounded-md border border-line px-4 py-3 text-sm">Filter</button>
      </form>
      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-panel">
        {payments.length ? payments.map((payment) => (
          <div key={payment.id} className="grid gap-3 border-b border-line p-4 text-sm last:border-b-0 lg:grid-cols-[1fr_0.8fr_0.8fr_0.8fr]">
            <div>
              <p className="font-semibold">{payment.organization.name}</p>
              <p className="text-muted">{payment.proposal?.proposalNumber ?? "No proposal"} · {payment.project?.name ?? "No project"}</p>
            </div>
            <div>
              <p>{humanizeEnum(payment.paymentType)}</p>
              <p className="text-muted">{formatMoney(payment.amountCents, payment.currency)} · {humanizeEnum(payment.status)}</p>
            </div>
            <div className="font-mono text-xs text-muted">
              <p>Session: {redactStripeId(payment.stripeCheckoutId)}</p>
              <p>Intent: {redactStripeId(payment.stripePaymentIntentId)}</p>
            </div>
            <div className="text-muted">
              <p>Created: {payment.createdAt.toLocaleString()}</p>
              <p>Paid: {payment.paidAt ? payment.paidAt.toLocaleString() : "Not confirmed"}</p>
              {payment.recoveryRequired ? <p className="text-red-200">Recovery: {payment.recoveryReason ?? "required"}</p> : null}
            </div>
          </div>
        )) : <p className="p-5 text-sm text-muted">No payment attempts yet.</p>}
      </div>
    </section>
  );
}
