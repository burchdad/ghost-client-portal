"use server";

import { z } from "zod";
import { requestPasswordReset } from "@/server/auth/password-reset";
import { checkRateLimit } from "@/server/security/rate-limit";

const schema = z.object({ email: z.string().email() });

export type ForgotPasswordState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

export async function forgotPasswordAction(
  _previousState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return {
      status: "error",
      message:
        "Enter the email address attached to your client portal account.",
    };
  }

  const limit = checkRateLimit(`password-reset:${parsed.data.email}`, {
    limit: 3,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return {
      status: "error",
      message: "Too many reset attempts. Please wait a minute and try again.",
    };
  }

  await requestPasswordReset(parsed.data.email);

  return {
    status: "success",
    message:
      "If that account exists, a secure password reset link is on its way.",
  };
}
