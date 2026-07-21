import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <main className="surface min-h-screen px-6 py-8">
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-accent">
            Ghost AI Solutions
          </p>
          <h1 className="text-2xl font-semibold">Client Portal</h1>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white/5 px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent hover:bg-white/10"
        >
          Client Login
          <ArrowRight size={16} aria-hidden />
        </Link>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm text-accent">
            <Sparkles size={15} aria-hidden />
            Premium account headquarters
          </p>
          <h2 className="text-5xl font-semibold leading-tight text-balance md:text-7xl">
            Know what Ghost is building, what is owed, and what needs your
            approval.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            A secure, client-facing layer for proposals, projects, payments,
            onboarding, and deliverables. Mission Control remains the internal
            source of truth.
          </p>
        </div>

        <div className="rounded-lg border border-line bg-panel/80 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-5 flex items-center justify-between border-b border-line pb-4">
            <div>
              <p className="text-sm text-muted">Account status</p>
              <p className="text-xl font-semibold">Awaiting activation</p>
            </div>
            <ShieldCheck className="text-accent" aria-hidden />
          </div>
          <div className="space-y-3">
            {[
              "Secure proposal review",
              "Typed signature acceptance",
              "Tenant-isolated dashboard",
              "Internal-only administration boundary",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-md bg-white/[0.04] p-3"
              >
                <LockKeyhole size={16} className="text-accent" aria-hidden />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
