"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClientWorkspace } from "@/lib/auth/guards";
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

  await createVegaLeadQuery({
    organizationId: organization.id,
    requestedById: user.id,
    prompt,
  });

  revalidatePath("/vega");
  redirectWith("notice", "Vega lead request created.");
}

function redirectWith(key: "error" | "notice", value: string): never {
  redirect(`/vega?${new URLSearchParams({ [key]: value }).toString()}`);
}
