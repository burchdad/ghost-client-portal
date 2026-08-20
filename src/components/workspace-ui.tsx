import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  body,
  actions,
  metrics,
}: {
  eyebrow: string;
  title: string;
  body: string;
  actions?: ReactNode;
  metrics?: { label: string; value: string; detail?: string }[];
}) {
  return (
    <section className="panel-surface overflow-hidden rounded-lg border border-line shadow-2xl shadow-black/10">
      <div className="border-b border-white/5 bg-white/[0.018] px-6 py-5">
        <p className="text-xs uppercase tracking-[0.24em] text-accent">
          {eyebrow}
        </p>
      </div>
      <div className="flex flex-col gap-6 p-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl">
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{body}</p>
          {actions ? (
            <div className="mt-5 flex flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>
        {metrics?.length ? (
          <div className="grid w-full gap-3 sm:grid-cols-3 xl:w-[34rem] xl:shrink-0">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="min-h-24 min-w-0 rounded-md border border-line bg-black/15 px-4 py-3"
              >
                <p className="text-xs text-muted">{metric.label}</p>
                <p className="mt-1 break-words text-xl font-semibold leading-tight md:text-2xl">
                  {metric.value}
                </p>
                {metric.detail ? (
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {metric.detail}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function FeatureHero({
  eyebrow,
  title,
  body,
  actions,
  metrics,
}: {
  eyebrow: string;
  title: string;
  body: string;
  actions?: ReactNode;
  metrics?: { label: string; value: string; detail?: string }[];
}) {
  return (
    <section className="panel-surface rounded-lg border border-line p-6 shadow-2xl shadow-black/10">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.24em] text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
          {actions ? (
            <div className="mt-5 flex flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>
        {metrics?.length ? (
          <div className="grid w-full gap-3 sm:grid-cols-3 xl:w-[31rem] xl:shrink-0">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="min-h-24 min-w-0 rounded-md border border-line bg-black/15 px-4 py-3"
              >
                <p className="text-xs text-muted">{metric.label}</p>
                <p className="mt-1 break-words text-xl font-semibold leading-tight md:text-2xl">
                  {metric.value}
                </p>
                {metric.detail ? (
                  <p className="mt-1 text-xs text-muted">{metric.detail}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "accent" | "signal" | "warning";
}) {
  const toneClass =
    tone === "accent"
      ? "border-accent/35 bg-accent/10"
      : tone === "signal"
        ? "border-blue-300/30 bg-blue-400/10"
        : tone === "warning"
          ? "border-amber-300/35 bg-amber-400/10"
          : "border-line bg-panel";

  return (
    <div className={`min-h-32 rounded-lg border p-5 ${toneClass}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm leading-5 text-muted">{detail}</p>
    </div>
  );
}

export function SectionPanel({
  title,
  eyebrow,
  children,
  aside,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel">
      <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs uppercase tracking-[0.18em] text-accent">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-xl font-semibold">{title}</h2>
        </div>
        {aside}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyWorkspace({
  icon: Icon,
  title,
  body,
  steps,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  steps: string[];
}) {
  return (
    <div className="panel-surface rounded-lg border border-dashed border-line p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-md border border-accent/30 bg-accent/10 p-2 text-accent">
            <Icon size={20} aria-hidden />
          </div>
          <h2 className="mt-4 text-2xl font-semibold">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
        </div>
        <div className="grid gap-2 text-sm text-muted xl:min-w-72">
          {steps.map((step) => (
            <p
              key={step}
              className="rounded-md border border-line bg-black/10 p-3"
            >
              {step}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "warning" | "danger";
}) {
  const toneClass =
    tone === "accent"
      ? "border-accent/40 bg-accent/10 text-accent"
      : tone === "warning"
        ? "border-amber-300/40 bg-amber-400/10 text-amber-100"
        : tone === "danger"
          ? "border-red-300/40 bg-red-500/10 text-red-100"
          : "border-line bg-white/[0.035] text-muted";

  return (
    <span
      className={`rounded-md border px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 rounded-full bg-black/30">
      <div
        className="h-full rounded-full bg-accent"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
