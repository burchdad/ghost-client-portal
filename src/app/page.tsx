import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  FileSignature,
  LockKeyhole,
  Megaphone,
  MessageSquareText,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

const accessPaths = [
  {
    label: "Client Login",
    href: "/login",
    description:
      "Enter your secure workspace, review open items, and track delivery.",
    primary: true,
  },
  {
    label: "Review Proposal",
    href: "/login",
    description: "Use the private link from your Ghost proposal email.",
    primary: false,
  },
  {
    label: "Activate Workspace",
    href: "/login",
    description: "Create your password from the invitation Ghost sent you.",
    primary: false,
  },
];

const modules = [
  {
    name: "Vega",
    icon: Sparkles,
    title: "LeadGen command",
    description:
      "Request lead pulls, qualify prospects, build lists, and prepare outreach.",
    signal: "Prospects and engagement",
  },
  {
    name: "GEO",
    icon: SearchCheck,
    title: "Search visibility",
    description:
      "Track SEO, AEO, GEO positioning, competitors, and brand visibility.",
    signal: "Positioning intelligence",
  },
  {
    name: "Echo",
    icon: Megaphone,
    title: "Marketing tactics",
    description:
      "Turn lead and visibility signals into campaigns, content, and next moves.",
    signal: "Campaign direction",
  },
  {
    name: "Projects",
    icon: BriefcaseBusiness,
    title: "Delivery workspace",
    description:
      "See active engagements, milestones, files, requests, and progress.",
    signal: "Work in motion",
  },
  {
    name: "Proposals",
    icon: FileSignature,
    title: "Approvals",
    description:
      "Review terms, accept proposals, and keep a clean approval record.",
    signal: "Decision trail",
  },
  {
    name: "Payments",
    icon: WalletCards,
    title: "Billing clarity",
    description:
      "View balances, payment status, and secure Stripe checkout links.",
    signal: "Financial view",
  },
];

const workflow = [
  "Review proposal",
  "Accept and activate",
  "Launch workspace",
  "Track delivery",
];

const trustItems = [
  "Tenant-isolated client data",
  "Typed signature acceptance",
  "Stripe-powered payment flow",
  "Audit-ready activity history",
];

export default function HomePage() {
  return (
    <main className="surface min-h-screen overflow-hidden text-foreground">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="Ghost AI Solutions Client Portal home"
        >
          <Image
            src="/ghost-ai-logo.png"
            alt=""
            width={54}
            height={54}
            priority
            className="h-12 w-12 rounded-full object-cover ring-1 ring-accent/30"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-accent">
              Ghost AI
            </p>
            <p className="text-lg font-semibold leading-tight">Client Portal</p>
          </div>
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white/[0.04] px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent/10"
        >
          Client Login
          <ArrowRight size={16} aria-hidden />
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-5.75rem)] w-full max-w-7xl content-center gap-10 px-5 pb-10 pt-8 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:pb-14 lg:pt-10">
        <div className="max-w-4xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
            <ShieldCheck size={15} aria-hidden />
            Secure client command center
          </p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] text-balance sm:text-6xl lg:text-7xl">
            Your Ghost AI workspace for approvals, growth, and delivery.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Review proposals, activate your workspace, pull leads through Vega,
            track GEO visibility, approve work, and keep payments in one
            tenant-protected portal.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {accessPaths.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={
                  item.primary
                    ? "group rounded-lg border border-accent/50 bg-accent px-4 py-4 text-background shadow-xl shadow-accent/10 transition hover:bg-accent-strong"
                    : "group rounded-lg border border-line bg-panel/80 px-4 py-4 transition hover:border-accent hover:bg-white/[0.05]"
                }
              >
                <span className="flex items-center justify-between gap-3 text-sm font-semibold">
                  {item.label}
                  <ArrowRight
                    size={16}
                    className="transition group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
                <span
                  className={
                    item.primary
                      ? "mt-3 block text-sm leading-6 text-background/75"
                      : "mt-3 block text-sm leading-6 text-muted"
                  }
                >
                  {item.description}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel-surface rounded-lg border border-line p-5 shadow-2xl shadow-black/30">
          <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="text-sm text-muted">Workspace status</p>
              <h2 className="mt-1 text-2xl font-semibold">
                Ready when your account is active
              </h2>
            </div>
            <BadgeCheck className="mt-1 text-accent" aria-hidden />
          </div>

          <div className="grid gap-3 py-5 sm:grid-cols-2">
            {[
              ["Vega prospects", "Query and list"],
              ["GEO visibility", "Search position"],
              ["Echo tactics", "Campaign moves"],
              ["Projects", "Delivery status"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-md border border-line bg-background/55 p-4"
              >
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-2 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-accent/25 bg-accent/10 p-4">
            <div className="mb-4 flex items-center gap-3">
              <MessageSquareText
                size={18}
                className="text-accent"
                aria-hidden
              />
              <p className="text-sm font-semibold text-accent">
                Client workspace preview
              </p>
            </div>
            <div className="space-y-3">
              {[
                "Ask Vega for local prospects",
                "Review competitor visibility",
                "Approve next project milestone",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-md bg-background/60 p-3 text-sm"
                >
                  <CheckCircle2 size={16} className="text-accent" aria-hidden />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-panel/45">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {workflow.map((step, index) => (
            <div key={step} className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-accent/35 bg-accent/10 text-sm font-semibold text-accent">
                {index + 1}
              </div>
              <p className="font-semibold">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
            What Clients Can See
          </p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
            One clean place for the parts of Ghost that touch your business.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted">
            The portal is built for quick decisions: what is happening, what
            needs your approval, what Ghost is finding, and what is next.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <article
                key={module.name}
                className="panel-surface rounded-lg border border-line p-5 transition hover:border-accent/60"
              >
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-background/60 text-accent">
                      <Icon size={19} aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                        {module.name}
                      </p>
                      <h3 className="text-xl font-semibold">{module.title}</h3>
                    </div>
                  </div>
                </div>
                <p className="min-h-14 text-sm leading-6 text-muted">
                  {module.description}
                </p>
                <div className="mt-5 inline-flex rounded-md border border-line bg-background/50 px-3 py-2 text-xs font-semibold text-signal">
                  {module.signal}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="panel-surface rounded-lg border border-line p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
              Trust Layer
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Private by default, useful by design.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Clients see the records meant for them. Ghost keeps internal
              operations separate while the portal gives your team a polished
              front door for decisions, requests, and payments.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {trustItems.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg border border-line bg-panel p-4"
              >
                <LockKeyhole size={17} className="text-accent" aria-hidden />
                <p className="text-sm font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-panel/45">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
              Ghost AI Solutions
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Access your workspace when Ghost sends your private link.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-background transition hover:bg-accent-strong"
            >
              Open Client Login
              <ArrowRight size={16} aria-hidden />
            </Link>
            <a
              href="mailto:support@ghostai.solutions"
              className="inline-flex items-center rounded-md border border-line bg-white/[0.04] px-4 py-3 text-sm font-semibold transition hover:border-accent hover:bg-white/[0.07]"
            >
              Contact Support
            </a>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-muted sm:px-8 md:flex-row md:items-center md:justify-between">
        <p>
          (c) 2026 Ghost AI Solutions. Client portal access is invitation only.
        </p>
        <div className="flex flex-wrap gap-4">
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
          <Link href="/login" className="hover:text-accent">
            Login
          </Link>
        </div>
      </footer>
    </main>
  );
}
