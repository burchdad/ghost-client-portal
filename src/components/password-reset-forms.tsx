"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ForgotPasswordState } from "@/app/forgot-password/actions";
import { forgotPasswordAction } from "@/app/forgot-password/actions";
import type { ResetPasswordState } from "@/app/reset-password/actions";
import { resetPasswordAction } from "@/app/reset-password/actions";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<ForgotPasswordState, FormData>(
    forgotPasswordAction,
    { status: "idle", message: null },
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm text-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
        />
      </div>
      {state.message ? (
        <p
          className={
            state.status === "error"
              ? "text-sm text-red-300"
              : "rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent"
          }
        >
          {state.message}
        </p>
      ) : null}
      <SubmitButton
        idleLabel="Send reset link"
        pendingLabel="Sending link..."
      />
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    { error: null },
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="mb-2 block text-sm text-muted">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className="w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm text-muted"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className="w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-300">{state.error}</p>
      ) : null}
      <SubmitButton
        idleLabel="Update password"
        pendingLabel="Updating password..."
      />
    </form>
  );
}

function SubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
