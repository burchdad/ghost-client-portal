import type { PaymentScheduleItem } from "@prisma/client";
import { formatMoney, humanizeEnum } from "@/lib/format";

export function InvestmentSummary({
  totalCents,
  currency,
  pricingSummary,
  schedule,
}: {
  totalCents: number;
  currency: string;
  pricingSummary: string;
  schedule: PaymentScheduleItem[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-lg border border-line bg-panel p-5">
        <p className="text-sm text-muted">Total investment</p>
        <p className="mt-2 text-4xl font-semibold">{formatMoney(totalCents, currency)}</p>
        <p className="mt-3 text-sm leading-6 text-muted">{pricingSummary}</p>
      </div>
      <PaymentSchedule schedule={schedule} currency={currency} />
    </div>
  );
}

export function PaymentSchedule({
  schedule,
  currency,
}: {
  schedule: PaymentScheduleItem[];
  currency: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <h3 className="text-lg font-semibold">Payment schedule</h3>
      <div className="mt-4 space-y-3">
        {schedule.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 rounded-md bg-white/[0.035] p-3">
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted">{humanizeEnum(item.paymentType)}</p>
            </div>
            <p className="font-semibold">{formatMoney(item.amountCents, currency)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
