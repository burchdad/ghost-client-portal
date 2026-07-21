import Link from "next/link";
import { requireInternalRole } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/format";
import {
  INVALIDATE_SEEDED_ACCEPTANCE_CONFIRMATION,
  MARK_CHECKOUT_ABANDONED_CONFIRMATION,
} from "@/server/launch-execution/service";
import { getLaunchReadiness } from "@/server/launch-readiness/service";
import {
  invalidateSeededAcceptanceAction,
  markCheckoutSessionAbandonedAction,
  recordLaunchReviewAction,
} from "./actions";

export default async function LaunchReadinessPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  await requireInternalRole();
  const { organizationId } = await params;
  const readiness = await getLaunchReadiness({ organizationId });
  const groups = readiness.checks.reduce<Map<string, typeof readiness.checks>>(
    (items, check) => {
      const categoryChecks = items.get(check.category) ?? [];
      categoryChecks.push(check);
      items.set(check.category, categoryChecks);
      return items;
    },
    new Map(),
  );

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-6">
        <p className="text-sm text-accent">Launch readiness</p>
        <h1 className="mt-2 text-3xl font-semibold">
          {readiness.organization.name}
        </h1>
        <p className="mt-3 text-sm text-muted">
          Overall status:{" "}
          <span className={statusClass(readiness.overallStatus)}>
            {readiness.overallStatus}
          </span>
        </p>
        <p className="mt-2 text-sm text-muted">
          Launch gate:{" "}
          <span className={statusClass(readiness.launchStatus)}>
            {readiness.launchStatus}
          </span>
        </p>
        <Link
          href={`/admin/organizations/${readiness.organization.id}`}
          className="mt-4 inline-flex rounded-md border border-line px-4 py-3 text-sm"
        >
          Back to Organization
        </Link>
      </div>

      {readiness.proposal ? (
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Gray Matters Launch Review</h2>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <InfoRow label="Organization" value={readiness.organization.name} />
            <InfoRow label="Proposal" value={readiness.proposal.title} />
            <InfoRow
              label="Proposal number"
              value={readiness.proposal.proposalNumber}
            />
            <InfoRow
              label="Total"
              value={formatMoney(
                readiness.proposal.totalCents,
                readiness.proposal.currency,
              )}
            />
            {readiness.proposal.paymentSchedule.map((item) => (
              <InfoRow
                key={item.id}
                label={item.label}
                value={formatMoney(item.amountCents, item.currency)}
              />
            ))}
            <InfoRow
              label="Proposal status"
              value={readiness.proposal.status}
            />
            <InfoRow
              label="Public"
              value={readiness.proposal.isPublic ? "Yes" : "No"}
            />
            <InfoRow
              label="Token hint"
              value={readiness.proposal.publicTokenHint ?? "None"}
            />
            <InfoRow
              label="Latest launch review"
              value={readiness.latestLaunchReview?.finalStatus ?? "None"}
            />
          </dl>
        </div>
      ) : null}

      {[...groups.entries()].map(([category, checks]) => (
        <div
          key={category}
          className="rounded-lg border border-line bg-panel p-5"
        >
          <h2 className="text-xl font-semibold">{category}</h2>
          <div className="mt-4 space-y-3">
            {checks.map((check) => (
              <div
                key={`${check.category}-${check.label}`}
                className="rounded-md border border-line bg-white/[0.035] p-3 text-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-medium">{check.label}</p>
                  <span className={statusClass(check.status)}>
                    {check.status}
                  </span>
                </div>
                <p className="mt-1 text-muted">{check.message}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {readiness.proposal ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            action={invalidateSeededAcceptanceAction}
            className="rounded-lg border border-line bg-panel p-5"
          >
            <input
              type="hidden"
              name="organizationId"
              value={readiness.organization.id}
            />
            <input
              type="hidden"
              name="proposalId"
              value={readiness.proposal.id}
            />
            <h2 className="text-xl font-semibold">
              Invalidate Seeded Acceptance
            </h2>
            <p className="mt-2 text-sm text-muted">
              Use only for the known seeded/test acceptance. This preserves
              acceptance evidence, marks it invalidated, and returns the
              proposal to SENT.
            </p>
            <Textarea label="Reason" name="reason" />
            <Field
              label="Confirmation phrase"
              name="confirmation"
              defaultValue=""
              placeholder={INVALIDATE_SEEDED_ACCEPTANCE_CONFIRMATION}
            />
            <button className="mt-4 rounded-md border border-amber-200/40 px-4 py-3 text-sm text-amber-50">
              Invalidate seeded acceptance
            </button>
          </form>

          {readiness.proposal.payments[0] ? (
            <form
              action={markCheckoutSessionAbandonedAction}
              className="rounded-lg border border-line bg-panel p-5"
            >
              <input
                type="hidden"
                name="organizationId"
                value={readiness.organization.id}
              />
              <input
                type="hidden"
                name="paymentId"
                value={readiness.proposal.payments[0].id}
              />
              <h2 className="text-xl font-semibold">Checkout Disposition</h2>
              <p className="mt-2 text-sm text-muted">
                Mark the existing unpaid Checkout Session as abandoned
                internally after review. This does not mutate Stripe.
              </p>
              <Textarea label="Disposition reason" name="reason" />
              <Field
                label="Confirmation phrase"
                name="confirmation"
                defaultValue=""
                placeholder={MARK_CHECKOUT_ABANDONED_CONFIRMATION}
              />
              <button className="mt-4 rounded-md border border-line px-4 py-3 text-sm">
                Mark checkout abandoned
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <form
        action={recordLaunchReviewAction}
        className="rounded-lg border border-line bg-panel p-5"
      >
        <input
          type="hidden"
          name="organizationId"
          value={readiness.organization.id}
        />
        <input
          type="hidden"
          name="proposalId"
          value={readiness.proposal?.id ?? ""}
        />
        <h2 className="text-xl font-semibold">Final Launch Review</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {checklist.map((item) => (
            <label
              key={item.name}
              className="flex items-start gap-3 rounded-md border border-line bg-white/[0.035] p-3 text-sm"
            >
              <input
                type="checkbox"
                name={item.name}
                value="yes"
                className="mt-1"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
        <Textarea label="Review reason / notes" name="reason" />
        <button className="mt-4 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
          Record launch review
        </button>
      </form>
    </section>
  );
}

function statusClass(status: string) {
  if (status === "READY" || status === "GO") return "text-emerald-200";
  if (status === "BLOCKED" || status === "NO-GO") return "text-red-200";
  if (status === "WARNING" || status === "REVIEW REQUIRED")
    return "text-amber-100";
  return "text-muted";
}

const checklist = [
  { name: "contactVerified", label: "Contact verified" },
  { name: "emailVerified", label: "Email verified" },
  { name: "scopeVerified", label: "Scope verified" },
  { name: "deliverablesVerified", label: "Deliverables verified" },
  { name: "paymentScheduleVerified", label: "Payment schedule verified" },
  { name: "termsVerified", label: "Terms verified" },
  { name: "expirationVerified", label: "Expiration verified" },
  { name: "stripeModeVerified", label: "Stripe mode verified" },
  {
    name: "existingCheckoutSessionReviewed",
    label: "Existing Checkout Session reviewed",
  },
  { name: "tokenRotated", label: "Token rotated" },
  { name: "noPlaceholdersRemain", label: "No placeholders remain" },
  {
    name: "noLifecycleInconsistenciesRemain",
    label: "No lifecycle inconsistencies remain",
  },
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/70 pb-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <label className="mt-4 block text-sm text-muted">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
      />
    </label>
  );
}

function Textarea({ label, name }: { label: string; name: string }) {
  return (
    <label className="mt-4 block text-sm text-muted">
      {label}
      <textarea
        name={name}
        required
        minLength={12}
        className="mt-2 min-h-24 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
      />
    </label>
  );
}
