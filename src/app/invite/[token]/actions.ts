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
  const parsed = invitationSchema.parse({
    token: formData.get("token"),
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    acceptedTerms: formData.get("acceptedTerms"),
  });
  const limit = checkRateLimit(`invite:${parsed.token.slice(-8)}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    throw new Error(
      "Too many invitation attempts. Please wait a moment and try again.",
    );
  }

  await acceptInvitation({
    ...parsed,
    acceptedTerms: parsed.acceptedTerms === "yes",
  });
  redirect("/dashboard");
}
