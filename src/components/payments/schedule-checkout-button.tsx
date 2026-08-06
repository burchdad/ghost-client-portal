"use client";

import { useFormStatus } from "react-dom";
import { createScheduleCheckoutAction } from "@/app/(client)/payments/actions";

export function ScheduleCheckoutButton({
  paymentScheduleItemId,
  label = "Pay now",
  disabled,
}: {
  paymentScheduleItemId: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <form action={createScheduleCheckoutAction}>
      <input
        type="hidden"
        name="paymentScheduleItemId"
        value={paymentScheduleItemId}
      />
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
      className="inline-flex w-full justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Opening Stripe..." : label}
    </button>
  );
}
