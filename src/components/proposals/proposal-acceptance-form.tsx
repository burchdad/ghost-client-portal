"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { acceptProposalAction, type AcceptProposalState } from "@/app/p/[proposalToken]/accept/actions";

export function ProposalAcceptanceForm({
  token,
  idempotencyKey,
}: {
  token: string;
  idempotencyKey: string;
}) {
  const [state, action] = useActionState(acceptProposalAction, initialState);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.error || Object.keys(state.fieldErrors).length) {
      errorRef.current?.focus();
    }
  }, [state]);

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {(state.error || Object.keys(state.fieldErrors).length > 0) ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          className="rounded-md border border-red-300/40 bg-red-950/30 p-4 text-sm text-red-100"
        >
          <p className="font-semibold">Please review the highlighted fields.</p>
          {state.error ? <p className="mt-1">{state.error}</p> : null}
        </div>
      ) : null}
      <TextField name="signerName" label="Full legal name" error={state.fieldErrors.signerName} />
      <TextField name="signerTitle" label="Job title" error={state.fieldErrors.signerTitle} />
      <TextField name="signerEmail" label="Email address" type="email" error={state.fieldErrors.signerEmail} />
      <Checkbox
        name="authorizedApproval"
        label="I am authorized to approve this proposal for the organization."
        error={state.fieldErrors.authorizedApproval}
      />
      <Checkbox
        name="reviewedScope"
        label="I reviewed the scope of work and deliverables."
        error={state.fieldErrors.reviewedScope}
      />
      <Checkbox
        name="acceptedPaymentSchedule"
        label="I accept the payment schedule described in this proposal."
        error={state.fieldErrors.acceptedPaymentSchedule}
      />
      <Checkbox
        name="acceptedTerms"
        label="I accept the terms of this proposal."
        error={state.fieldErrors.acceptedTerms}
      />
      <TextField name="typedSignature" label="Typed digital signature" error={state.fieldErrors.typedSignature} />
      <TextField name="purchaseOrderNumber" label="Purchase-order number (optional)" error={state.fieldErrors.purchaseOrderNumber} required={false} />
      <div>
        <label htmlFor="note" className="mb-2 block text-sm text-muted">
          Client note (optional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={4}
          className="w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
        />
        {state.fieldErrors.note ? <p className="mt-1 text-sm text-red-200">{state.fieldErrors.note}</p> : null}
      </div>
      <SubmitButton />
    </form>
  );
}

const initialState: AcceptProposalState = { error: null, fieldErrors: {} };

function TextField({
  name,
  label,
  error,
  type = "text",
  required = true,
}: {
  name: string;
  label: string;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm text-muted">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className="w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
      />
      {error ? <p id={`${name}-error`} className="mt-1 text-sm text-red-200">{error}</p> : null}
    </div>
  );
}

function Checkbox({ name, label, error }: { name: string; label: string; error?: string }) {
  return (
    <div>
      <label className="flex gap-3 rounded-md border border-line bg-white/[0.035] p-3 text-sm">
        <input
          name={name}
          type="checkbox"
          aria-invalid={Boolean(error)}
          className="mt-1 h-4 w-4 accent-[var(--accent)]"
        />
        <span>{label}</span>
      </label>
      {error ? <p className="mt-1 text-sm text-red-200">{error}</p> : null}
    </div>
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
      {pending ? "Recording acceptance..." : "Accept and Sign Proposal"}
    </button>
  );
}
