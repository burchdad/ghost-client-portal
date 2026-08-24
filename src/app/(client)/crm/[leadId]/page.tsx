import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Sparkles } from "lucide-react";
import { PageHero, SectionPanel, StatusBadge } from "@/components/workspace-ui";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { formatDate, humanizeEnum } from "@/lib/format";
import {
  buildOutreachDraft,
  crmStages,
  getClientCrmLead,
} from "@/server/crm/service";
import {
  addCrmNoteAction,
  createCrmOutreachDraftAction,
  markCrmLeadContactedAction,
  updateCrmLeadAction,
  updateCrmLeadStatusAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function CrmLeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ leadId: string }>;
  searchParams?: Promise<{ notice?: string; error?: string }>;
}) {
  const { organization } = await requireClientWorkspace();
  const { leadId } = await params;
  const lead = await getClientCrmLead({
    organizationId: organization.id,
    leadId,
  });
  const message = (await searchParams) ?? {};

  if (!lead) {
    notFound();
  }

  const draft = buildOutreachDraft(lead);
  const mailto = lead.email
    ? `mailto:${lead.email}?subject=${encodeURIComponent(`Quick growth idea for ${lead.company}`)}&body=${encodeURIComponent(draft.replace(/^Subject:.*\n\n/, ""))}`
    : null;

  return (
    <section className="space-y-6">
      <Link
        href="/crm"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent"
      >
        <ArrowLeft size={16} aria-hidden />
        Back to CRM
      </Link>

      <PageHero
        eyebrow="CRM record"
        title={lead.company}
        body={`${lead.contactName ?? "Contact pending"} - ${lead.title ?? "Decision maker"}. Work this record through qualification, outreach, follow-up, and closeout.`}
        actions={
          <>
            {mailto ? (
              <a
                href={mailto}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
              >
                Open email draft
                <Mail size={16} aria-hidden />
              </a>
            ) : null}
            <form action={createCrmOutreachDraftAction}>
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="returnTo" value={`/crm/${lead.id}`} />
              <button className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-3 text-sm hover:border-accent">
                Save draft to notes
                <Sparkles size={16} aria-hidden />
              </button>
            </form>
          </>
        }
        metrics={[
          {
            label: "Stage",
            value: humanizeEnum(lead.status),
            detail: "Current CRM state",
          },
          {
            label: "Intent",
            value: String(lead.intentScore),
            detail: "Vega score",
          },
          {
            label: "Updated",
            value: formatDate(lead.updatedAt),
            detail: "Latest CRM change",
          },
        ]}
      />

      {message.error || message.notice ? (
        <p
          className={`rounded-md border px-4 py-3 text-sm ${
            message.error
              ? "border-red-300/40 bg-red-500/10 text-red-100"
              : "border-accent/40 bg-accent/10 text-accent"
          }`}
        >
          {message.error ?? message.notice}
        </p>
      ) : null}

      <section className="grid items-start gap-5 xl:grid-cols-[1fr_0.65fr]">
        <SectionPanel
          title="Lead profile"
          eyebrow="Editable record"
          aside={<StatusBadge>{humanizeEnum(lead.status)}</StatusBadge>}
        >
          <form action={updateCrmLeadAction} className="grid gap-4">
            <input type="hidden" name="leadId" value={lead.id} />
            <input type="hidden" name="returnTo" value={`/crm/${lead.id}`} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Company" name="company" defaultValue={lead.company} />
              <Field
                label="Segment"
                name="segment"
                defaultValue={lead.segment}
              />
              <Field
                label="Contact"
                name="contactName"
                defaultValue={lead.contactName ?? ""}
              />
              <Field label="Title" name="title" defaultValue={lead.title ?? ""} />
              <Field label="Email" name="email" defaultValue={lead.email ?? ""} />
              <Field label="Phone" name="phone" defaultValue={lead.phone ?? ""} />
              <Field
                label="Website"
                name="website"
                defaultValue={lead.website ?? ""}
              />
              <Field
                label="Intent score"
                name="intentScore"
                defaultValue={String(lead.intentScore)}
                type="number"
              />
            </div>
            <label className="grid gap-2 text-sm text-muted">
              Next step
              <textarea
                name="nextStep"
                defaultValue={lead.nextStep ?? ""}
                className="min-h-24 rounded-md border border-line bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent"
              />
            </label>
            <button className="justify-self-start rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
              Save profile
            </button>
          </form>
        </SectionPanel>

        <div className="space-y-5">
          <SectionPanel title="Stage controls" eyebrow="Pipeline">
            <form action={updateCrmLeadStatusAction} className="grid gap-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="returnTo" value={`/crm/${lead.id}`} />
              <select
                name="status"
                defaultValue={lead.status}
                className="rounded-md border border-line bg-background px-4 py-3 text-sm outline-none focus:border-accent"
              >
                {crmStages.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
              <button className="rounded-md border border-line px-4 py-3 text-sm hover:border-accent">
                Update stage
              </button>
            </form>
            <form action={markCrmLeadContactedAction} className="mt-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="returnTo" value={`/crm/${lead.id}`} />
              <button className="w-full rounded-md border border-line px-4 py-3 text-sm hover:border-accent">
                Mark contacted
              </button>
            </form>
          </SectionPanel>

          <SectionPanel title="Contact paths" eyebrow="Reachability">
            <div className="space-y-3">
              <ContactSignal icon={Mail} label="Email" value={lead.email} />
              <ContactSignal icon={Phone} label="Phone" value={lead.phone} />
              <div className="rounded-md border border-line bg-white/[0.035] p-4">
                <p className="text-xs text-muted">Website</p>
                {lead.website ? (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all font-medium hover:text-accent"
                  >
                    {lead.website}
                  </a>
                ) : (
                  <p className="mt-1 font-medium">Not captured</p>
                )}
              </div>
            </div>
          </SectionPanel>
        </div>
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[1fr_0.7fr]">
        <SectionPanel title="CRM notes" eyebrow="Working history">
          <form action={addCrmNoteAction} className="mb-5 grid gap-3">
            <input type="hidden" name="leadId" value={lead.id} />
            <input type="hidden" name="returnTo" value={`/crm/${lead.id}`} />
            <label className="grid gap-2 text-sm text-muted">
              Add note
              <textarea
                name="body"
                placeholder="Example: Called office, owner unavailable. Follow up Tuesday morning."
                className="min-h-28 rounded-md border border-line bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent"
              />
            </label>
            <button className="justify-self-start rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
              Save note
            </button>
          </form>
          {lead.notes ? (
            <pre className="whitespace-pre-wrap rounded-md border border-line bg-black/10 p-4 text-sm leading-6 text-muted">
              {lead.notes}
            </pre>
          ) : (
            <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
              No notes yet. Add call notes, qualification details, outreach
              drafts, objections, or follow-up reminders here.
            </p>
          )}
        </SectionPanel>

        <SectionPanel title="Source context" eyebrow="Vega origin">
          <div className="space-y-3 text-sm leading-6 text-muted">
            <p>
              <span className="text-foreground">Source:</span>{" "}
              {humanizeEnum(lead.source)}
            </p>
            <p>
              <span className="text-foreground">Created:</span>{" "}
              {formatDate(lead.createdAt)}
            </p>
            {lead.query ? (
              <div className="rounded-md border border-line bg-white/[0.035] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-accent">
                  Original request
                </p>
                <p className="mt-2">{lead.query.prompt}</p>
                <p className="mt-2 text-xs">
                  {humanizeEnum(lead.query.source)} -{" "}
                  {formatDate(lead.query.createdAt)}
                </p>
              </div>
            ) : null}
          </div>
        </SectionPanel>
      </section>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-muted">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="rounded-md border border-line bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent"
      />
    </label>
  );
}

function ContactSignal({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-line bg-white/[0.035] p-4">
      <Icon size={16} className="mt-0.5 text-accent" aria-hidden />
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-1 break-words font-medium">
          {value ?? "Not captured"}
        </p>
      </div>
    </div>
  );
}
