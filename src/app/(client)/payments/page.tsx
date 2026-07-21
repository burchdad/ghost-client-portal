import { requireOrganizationMembership } from "@/lib/auth/guards";
import { formatDate, formatMoney, humanizeEnum } from "@/lib/format";
import { getDb } from "@/lib/db";

export default async function PaymentsPage() {
  const { organization } = await requireOrganizationMembership();
  const payments = await getDb().payment.findMany({
    where: { organizationId: organization.id },
    include: { project: true, proposal: true, paymentScheduleItem: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section>
      <h1 className="text-3xl font-semibold">Payments</h1>
      <div className="mt-6 rounded-lg border border-line bg-panel">
        {payments.length ? (
          payments.map((payment) => (
            <div
              key={payment.id}
              className="border-b border-line p-4 last:border-b-0"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">
                    {payment.paymentScheduleItem?.label ??
                      humanizeEnum(payment.paymentType)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {payment.project?.name ??
                      payment.proposal?.title ??
                      organization.name}
                  </p>
                </div>
                <div className="text-sm sm:text-right">
                  <p className="font-semibold">
                    {formatMoney(payment.amountCents, payment.currency)}
                  </p>
                  <p className="text-muted">{humanizeEnum(payment.status)}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted">
                {payment.paidAt
                  ? `Paid ${formatDate(payment.paidAt)}`
                  : `Created ${formatDate(payment.createdAt)}`}
              </p>
            </div>
          ))
        ) : (
          <p className="p-5 text-sm text-muted">No payments are due yet.</p>
        )}
      </div>
    </section>
  );
}
