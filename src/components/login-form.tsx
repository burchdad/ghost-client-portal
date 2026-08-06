"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, { error: null });

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm text-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className="w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm text-muted">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="off"
          required
          className="w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
        />
      </div>
      {state.error ? (
        <p className="rounded-md border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Checking access..." : "Sign in"}
    </button>
  );
}
