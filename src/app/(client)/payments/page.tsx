import { requireOrganizationMembership } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export default async function PaymentsPage() {
  const { organization } = await requireOrganizationMembership();
  const payments = await getDb().payment.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section>
      <h1 className="text-3xl font-semibold">Payments</h1>
      <div className="mt-6 rounded-lg border border-line bg-panel">
        {payments.length ? (
          payments.map((payment) => (
            <div key={payment.id} className="flex justify-between border-b border-line p-4 last:border-b-0">
              <span>{payment.paymentType.replaceAll("_", " ").toLowerCase()}</span>
              <span>${(payment.amountCents / 100).toLocaleString()} · {payment.status}</span>
            </div>
          ))
        ) : (
          <p className="p-5 text-sm text-muted">No payments are due yet.</p>
        )}
      </div>
    </section>
  );
}
