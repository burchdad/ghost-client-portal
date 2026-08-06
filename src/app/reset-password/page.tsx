import Image from "next/image";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { ResetPasswordForm } from "@/components/password-reset-forms";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const token = (await searchParams)?.token ?? "";

  return (
    <main className="surface grid min-h-screen place-items-center px-6 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel/90 p-6 shadow-2xl shadow-black/30">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/ghost-ai-logo.png"
            alt=""
            width={46}
            height={46}
            className="h-11 w-11 rounded-full object-cover ring-1 ring-accent/30"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-accent">
              Ghost AI
            </p>
            <p className="font-semibold">Client Portal</p>
          </div>
        </Link>
        <div className="mt-6 rounded-md border border-accent/30 bg-accent/10 p-3 text-accent">
          <KeyRound size={18} aria-hidden />
        </div>
        <h1 className="mt-4 text-3xl font-semibold">Create a new password</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Use at least 12 characters. Updating your password signs out any
          existing portal sessions.
        </p>
        <div className="mt-6">
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="rounded-md border border-red-300/40 bg-red-500/10 p-3 text-sm text-red-100">
              This reset link is missing a token. Request a fresh link from the
              forgot password page.
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-between text-sm text-muted">
          <Link href="/forgot-password" className="hover:text-foreground">
            Request new link
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
