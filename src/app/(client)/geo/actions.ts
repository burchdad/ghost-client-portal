"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { submitGeoApprovalDecision } from "@/server/geo-command/service";
import { checkRateLimit } from "@/server/security/rate-limit";
import { assertSameOriginSubmission } from "@/server/security/request";

const approvalDecisionSchema = z.object({
  approvalId: z.string().trim().min(1),
  decisionAction: z.enum([
    "client_approve",
    "client_request_changes",
    "client_reject",
  ]),
  note: z.string().trim().max(1000).optional(),
});

export async function decideGeoApprovalAction(formData: FormData) {
  const { user, organization } = await requireClientWorkspace();
  await assertSameOriginSubmission();

  const limit = checkRateLimit(`geo-approval:${user.id}`, {
    limit: 12,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    redirectWith("error", "Too many approval decisions. Please wait a minute.");
  }

  const parsed = approvalDecisionSchema.safeParse({
    approvalId: formData.get("approvalId"),
    decisionAction: formData.get("decisionAction"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    redirectWith("error", "Choose a valid approval action.");
  }

  try {
    await submitGeoApprovalDecision({
      organization,
      approvalId: parsed.data.approvalId,
      decisionAction: parsed.data.decisionAction,
      note: parsed.data.note,
      actorEmail: user.email,
      actorName: user.name,
    });
  } catch (error) {
    redirectWith(
      "error",
      error instanceof Error
        ? error.message
        : "G.E.O. could not record this approval decision.",
    );
  }

  revalidatePath("/geo");
  redirectWith("notice", "G.E.O. approval decision recorded.");
}

function redirectWith(key: "error" | "notice", value: string): never {
  redirect(`/geo?${new URLSearchParams({ [key]: value }).toString()}`);
}
