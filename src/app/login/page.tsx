import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  FileSignature,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ reset?: string }>;
}) {
  const resetComplete = (await searchParams)?.reset === "complete";

  return (
    <main className="surface min-h-screen px-5 py-8">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_28rem]">
        <div className="max-w-3xl">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/ghost-ai-logo.png"
              alt=""
              width={58}
              height={58}
              priority
              className="h-14 w-14 rounded-full object-cover ring-1 ring-accent/30"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-accent">
                Ghost AI Solutions
              </p>
              <p className="text-xl font-semibold">Client Portal</p>
            </div>
          </Link>
          <h1 className="mt-10 max-w-3xl text-5xl font-semibold leading-tight text-balance md:text-6xl">
            Secure access to your Ghost AI workspace.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            Sign in to review proposals, manage project actions, pull Vega
            leads, track GEO visibility, and keep payment status in one
            tenant-protected workspace.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["Private workspace", ShieldCheck],
              ["Signed approvals", FileSignature],
              ["Protected sessions", LockKeyhole],
            ].map(([label, Icon]) => (
              <div
                key={String(label)}
                className="rounded-lg border border-line bg-panel/70 p-4"
              >
                <Icon size={18} className="text-accent" aria-hidden />
                <p className="mt-3 text-sm font-semibold">{String(label)}</p>
              </div>
            ))}
          </div>
        </div>

        <section className="rounded-lg border border-line bg-panel/90 p-6 shadow-2xl shadow-black/30">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-accent">
                Portal login
              </p>
              <h2 className="mt-2 text-3xl font-semibold">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Use the email and password attached to your active client
                account.
              </p>
            </div>
            <BadgeCheck className="mt-1 text-accent" aria-hidden />
          </div>
          {resetComplete ? (
            <p className="mb-4 rounded-md border border-accent/35 bg-accent/10 px-3 py-2 text-sm text-accent">
              Password updated. Sign in with your new password.
            </p>
          ) : null}
          <LoginForm />
          <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm text-muted">
            <Link href="/forgot-password" className="hover:text-foreground">
              Forgot password
            </Link>
            <span>Invitation links are sent by Ghost.</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 border-t border-line pt-4 text-xs text-muted">
            <a
              href="https://ghostai.solutions/privacy-policy"
              className="hover:text-accent"
            >
              Privacy
            </a>
            <a
              href="https://ghostai.solutions/terms-of-use"
              className="hover:text-accent"
            >
              Terms
            </a>
            <a
              href="mailto:support@ghostai.solutions"
              className="hover:text-accent"
            >
              Support
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
