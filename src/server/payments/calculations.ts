import type { PaymentScheduleItem, Payment } from "@prisma/client";

export const supportedCurrencies = ["usd"] as const;

export function normalizeCurrency(currency: string) {
  return currency.trim().toLowerCase();
}

export function assertSupportedCurrency(currency: string) {
  const normalized = normalizeCurrency(currency);

  if (
    !supportedCurrencies.includes(
      normalized as (typeof supportedCurrencies)[number],
    )
  ) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  return normalized;
}

export function dollarsToMinorUnits(value: string) {
  const normalized = value.trim().replace(/^\$/, "");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Invalid money value.");
  }

  const [dollars, cents = ""] = normalized.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}

export function paymentScheduleTotal(
  items: Pick<PaymentScheduleItem, "amountCents">[],
) {
  return items.reduce((total, item) => total + item.amountCents, 0);
}

export function amountPaid(
  payments: Pick<Payment, "amountCents" | "status">[],
) {
  return payments
    .filter(
      (payment) =>
        payment.status === "PAID" || payment.status === "PARTIALLY_REFUNDED",
    )
    .reduce((total, payment) => total + payment.amountCents, 0);
}

export function amountRemaining(contractValueCents: number, paidCents: number) {
  return Math.max(contractValueCents - paidCents, 0);
}

export function refundTotal(payments: Pick<Payment, "refundedAmountCents">[]) {
  return payments.reduce(
    (total, payment) => total + payment.refundedAmountCents,
    0,
  );
}

export function selectDepositItem<
  T extends Pick<PaymentScheduleItem, "paymentType" | "status" | "amountCents">,
>(items: T[]) {
  return items.find(
    (item) =>
      item.paymentType === "DEPOSIT" &&
      item.status !== "PAID" &&
      item.amountCents > 0,
  );
}

export function validateDepositAmount(
  item: Pick<PaymentScheduleItem, "amountCents" | "paymentType">,
) {
  if (item.paymentType !== "DEPOSIT") {
    throw new Error("Payment schedule item is not a deposit.");
  }

  if (!Number.isInteger(item.amountCents) || item.amountCents <= 0) {
    throw new Error("Deposit amount must be a positive integer.");
  }

  return item.amountCents;
}

export function reconcilePaymentSchedule(
  contractValueCents: number,
  items: Pick<PaymentScheduleItem, "amountCents">[],
  allowException = false,
) {
  const total = paymentScheduleTotal(items);

  if (!allowException && total !== contractValueCents) {
    throw new Error(
      `Payment schedule total ${total} does not match contract value ${contractValueCents}.`,
    );
  }

  return { total, reconciled: total === contractValueCents };
}

export function paymentStatusFromRefund(
  amountCents: number,
  refundedAmountCents: number,
) {
  if (refundedAmountCents <= 0) {
    return "PAID" as const;
  }

  return refundedAmountCents >= amountCents
    ? ("REFUNDED" as const)
    : ("PARTIALLY_REFUNDED" as const);
}
