"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createCheckoutSessionAction } from "@/app/p/[proposalToken]/payment/actions";

export function CheckoutButton({
  token,
  label,
  disabled,
  requireLiveTestConfirmation,
}: {
  token: string;
  label: string;
  disabled?: boolean;
  requireLiveTestConfirmation?: boolean;
}) {
  const [state, action] = useActionState(createCheckoutSessionAction, {
    error: null,
  });

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      {requireLiveTestConfirmation ? (
        <label className="block text-sm text-muted">
          Live test checkout confirmation
          <input
            name="liveTestConfirmation"
            placeholder="CREATE UNPAID LIVE TEST CHECKOUT"
            className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
          />
        </label>
      ) : null}
      {state.error ? (
        <p className="rounded-md border border-red-300/40 bg-red-950/30 p-3 text-sm text-red-100">
          {state.error}
        </p>
      ) : null}
      <Submit label={label} disabled={disabled} />
    </form>
  );
}

function Submit({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Preparing secure checkout..." : label}
    </button>
  );
}
