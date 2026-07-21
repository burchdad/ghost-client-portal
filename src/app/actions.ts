"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticateWithPassword, destroySession } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginState = { error: string | null };

export async function loginAction(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const user = await authenticateWithPassword(parsed.data.email, parsed.data.password);

  if (!user) {
    return { error: "Those credentials do not match an active portal user." };
  }

  redirect(user.internalRole ? "/admin" : "/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
