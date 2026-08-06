"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { resetPasswordWithToken } from "@/server/auth/password-reset";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(12),
  confirmPassword: z.string().min(12),
});

export type ResetPasswordState = {
  error: string | null;
};

export async function resetPasswordAction(
  _previousState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error:
        "Enter a valid reset link and a new password with at least 12 characters.",
    };
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const result = await resetPasswordWithToken({
    token: parsed.data.token,
    password: parsed.data.password,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  redirect("/login?reset=complete");
}
