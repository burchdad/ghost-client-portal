"use server";

import { revalidatePath } from "next/cache";
import { requireInternalRole } from "@/lib/auth/guards";
import { retryPaymentActivation } from "@/server/payments/recovery";

export async function retryPaymentActivationAction(formData: FormData) {
  const user = await requireInternalRole([
    "FOUNDER",
    "ADMINISTRATOR",
    "ACCOUNT_MANAGER",
    "PROJECT_MANAGER",
  ]);
  const paymentId = String(formData.get("paymentId") ?? "");
  await retryPaymentActivation({ paymentId, actorUserId: user.id });
  revalidatePath("/admin/payments");
}
