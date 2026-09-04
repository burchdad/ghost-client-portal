"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle, Search } from "lucide-react";

export function VegaPullButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex min-w-36 items-center justify-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
    >
      {pending ? (
        <LoaderCircle size={16} className="animate-spin" aria-hidden />
      ) : (
        <Search size={16} aria-hidden />
      )}
      {pending ? "Finding leads..." : "Find leads"}
    </button>
  );
}
