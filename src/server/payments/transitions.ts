import type { Prisma } from "@prisma/client";

export async function markPaymentFailed(
  tx: Prisma.TransactionClient,
  input: {
    paymentId: string;
    paymentScheduleItemId?: string | null;
    failureCode?: string | null;
    failureMessage?: string | null;
  },
) {
  const redactedMessage = input.failureMessage?.slice(0, 240) ?? null;

  await tx.payment.update({
    where: { id: input.paymentId },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      failureCode: input.failureCode?.slice(0, 80) ?? null,
      failureMessage: redactedMessage,
    },
  });

  if (input.paymentScheduleItemId) {
    await tx.paymentScheduleItem.update({
      where: { id: input.paymentScheduleItemId },
      data: { status: "PENDING", failedAt: new Date() },
    });
  }
}

export async function markPaymentRefunded(
  tx: Prisma.TransactionClient,
  input: {
    paymentId: string;
    paymentScheduleItemId?: string | null;
    refundedAmountCents: number;
    status: "PARTIALLY_REFUNDED" | "REFUNDED";
  },
) {
  await tx.payment.update({
    where: { id: input.paymentId },
    data: {
      status: input.status,
      refundedAmountCents: input.refundedAmountCents,
    },
  });

  if (input.paymentScheduleItemId) {
    await tx.paymentScheduleItem.update({
      where: { id: input.paymentScheduleItemId },
      data: {
        status: input.status,
        refundedAmountCents: input.refundedAmountCents,
      },
    });
  }
}
