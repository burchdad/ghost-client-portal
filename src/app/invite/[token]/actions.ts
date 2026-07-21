"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { acceptInvitation } from "@/server/invitations/service";
import { checkRateLimit } from "@/server/security/rate-limit";

const invitationSchema = z.object({
  token: z.string().min(20),
  email: z.string().email(),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(12),
  acceptedTerms: z.literal("yes"),
});

export async function acceptInvitationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const parsed = invitationSchema.safeParse({
    token: formData.get("token"),
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    acceptedTerms: formData.get("acceptedTerms"),
  });
  if (!parsed.success) {
    redirect(
      `/invite/${token}?error=${encodeURIComponent(
        "Password must be at least 12 characters and all fields are required.",
      )}`,
    );
  }

  const limit = checkRateLimit(`invite:${parsed.data.token.slice(-8)}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    redirect(
      `/invite/${parsed.data.token}?error=${encodeURIComponent(
        "Too many invitation attempts. Please wait a moment and try again.",
      )}`,
    );
  }

  try {
    await acceptInvitation({
      ...parsed.data,
      acceptedTerms: parsed.data.acceptedTerms === "yes",
    });
  } catch (error) {
    redirect(
      `/invite/${parsed.data.token}?error=${encodeURIComponent(
        error instanceof Error
          ? error.message
          : "Invitation activation failed.",
      )}`,
    );
  }

  redirect("/dashboard");
}
