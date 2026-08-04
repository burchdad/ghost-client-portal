"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { createVegaLeadQuery } from "@/server/vega/service";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function createVegaLeadQueryAction(formData: FormData) {
  const prompt = String(formData.get("prompt") ?? "").trim();
  const { user, organization } = await requireClientWorkspace();
  const limit = checkRateLimit(`vega:${user.id}:${organization.id}`, {
    limit: 8,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    redirectWith("error", "Too many Vega requests. Please wait a moment.");
  }

  if (prompt.length < 10) {
    redirectWith("error", "Tell Vega what kind of leads to pull.");
  }

  const query = await createVegaLeadQuery({
    organizationId: organization.id,
    requestedById: user.id,
    prompt,
  });

  revalidatePath("/vega");
  if (query.status === "FAILED") {
    redirectWith(
      "error",
      "Vega could not pull live Lead Command leads. Check source health and try again.",
    );
  }

  if (query.resultCount === 0) {
    redirectWith(
      "notice",
      "Vega ran the live Lead Command source, but no leads matched this request.",
    );
  }

  redirectWith(
    "notice",
    `Vega pulled ${query.resultCount} live Lead Command leads.`,
  );
}

const leadStatuses = new Set(["QUALIFIED", "READY_FOR_OUTREACH", "ENGAGED"]);

export async function updateVegaLeadStatusAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const { organization } = await requireClientWorkspace();

  if (!leadId || !leadStatuses.has(status)) {
    redirectWith("error", "Vega could not update that lead.");
  }

  const updated = await getDb().vegaLead.updateMany({
    where: {
      id: leadId,
      organizationId: organization.id,
    },
    data: {
      status,
      nextStep:
        status === "QUALIFIED"
          ? "Added to the qualified prospect list."
          : status === "READY_FOR_OUTREACH"
            ? "Draft outreach copy and review before sending."
            : "Engagement recorded. Prepare follow-up.",
    },
  });

  if (!updated.count) {
    redirectWith("error", "That lead is not available in this workspace.");
  }

  revalidatePath("/vega");
  redirectWith("notice", "Vega lead updated.");
}

function redirectWith(key: "error" | "notice", value: string): never {
  redirect(`/vega?${new URLSearchParams({ [key]: value }).toString()}`);
}
