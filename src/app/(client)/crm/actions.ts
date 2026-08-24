"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import {
  appendCrmNote,
  buildCrmNote,
  buildOutreachDraft,
  crmStageValues,
} from "@/server/crm/service";

export async function updateCrmLeadStatusAction(formData: FormData) {
  const leadId = getString(formData, "leadId");
  const status = getString(formData, "status");
  const returnTo = getReturnTo(formData);
  const { user, organization } = await requireClientWorkspace();

  if (!leadId || !crmStageValues.has(status)) {
    redirectWith(returnTo, "error", "CRM could not update that lead.");
  }

  const updated = await getDb().vegaLead.updateMany({
    where: { id: leadId, organizationId: organization.id },
    data: {
      status,
      nextStep: nextStepForStatus(status),
    },
  });

  if (!updated.count) {
    redirectWith(returnTo, "error", "That lead is not available here.");
  }

  await writeCrmAudit({
    actorUserId: user.id,
    organizationId: organization.id,
    leadId,
    eventType: "crm.lead_status.updated",
    title: "CRM lead stage updated",
    body: `Lead moved to ${status.replaceAll("_", " ").toLowerCase()}.`,
  });

  revalidateCrm(leadId);
  redirectWith(returnTo, "notice", "Lead stage updated.");
}

export async function updateCrmLeadAction(formData: FormData) {
  const leadId = getString(formData, "leadId");
  const returnTo = getReturnTo(formData);
  const { user, organization } = await requireClientWorkspace();

  if (!leadId) {
    redirectWith(returnTo, "error", "CRM could not save that lead.");
  }

  const company = getString(formData, "company");
  const segment = getString(formData, "segment");
  if (!company || !segment) {
    redirectWith(returnTo, "error", "Company and segment are required.");
  }

  const updated = await getDb().vegaLead.updateMany({
    where: { id: leadId, organizationId: organization.id },
    data: {
      company,
      contactName: nullableText(formData, "contactName"),
      title: nullableText(formData, "title"),
      email: nullableText(formData, "email"),
      phone: nullableText(formData, "phone"),
      website: nullableText(formData, "website"),
      segment,
      intentScore: getIntentScore(formData),
      nextStep: nullableText(formData, "nextStep"),
    },
  });

  if (!updated.count) {
    redirectWith(returnTo, "error", "That lead is not available here.");
  }

  await writeCrmAudit({
    actorUserId: user.id,
    organizationId: organization.id,
    leadId,
    eventType: "crm.lead.updated",
    title: "CRM lead updated",
    body: "Contact details and next step were updated.",
  });

  revalidateCrm(leadId);
  redirectWith(returnTo, "notice", "Lead details saved.");
}

export async function addCrmNoteAction(formData: FormData) {
  const leadId = getString(formData, "leadId");
  const body = getString(formData, "body");
  const returnTo = getReturnTo(formData);
  const { user, organization } = await requireClientWorkspace();

  if (!leadId || body.length < 3) {
    redirectWith(returnTo, "error", "Add a note before saving.");
  }

  const lead = await getDb().vegaLead.findFirst({
    where: { id: leadId, organizationId: organization.id },
    select: { notes: true },
  });

  if (!lead) {
    redirectWith(returnTo, "error", "That lead is not available here.");
  }

  await getDb().vegaLead.update({
    where: { id: leadId },
    data: {
      notes: appendCrmNote(
        lead.notes,
        buildCrmNote({ authorName: user.name, body }),
      ),
    },
  });

  await writeCrmAudit({
    actorUserId: user.id,
    organizationId: organization.id,
    leadId,
    eventType: "crm.lead_note.created",
    title: "CRM lead note added",
    body,
  });

  revalidateCrm(leadId);
  redirectWith(returnTo, "notice", "Note added.");
}

export async function createCrmOutreachDraftAction(formData: FormData) {
  const leadId = getString(formData, "leadId");
  const returnTo = getReturnTo(formData);
  const { user, organization } = await requireClientWorkspace();
  const lead = await getDb().vegaLead.findFirst({
    where: { id: leadId, organizationId: organization.id },
  });

  if (!lead) {
    redirectWith(returnTo, "error", "That lead is not available here.");
  }

  const draft = buildOutreachDraft(lead);
  const note = buildCrmNote({
    authorName: user.name,
    body: `Outreach draft prepared:\n${draft}`,
  });

  await getDb().vegaLead.update({
    where: { id: lead.id },
    data: {
      status: "READY_FOR_OUTREACH",
      notes: appendCrmNote(lead.notes, note),
      nextStep: lead.email
        ? "Review the outreach draft, send from the correct mailbox, then mark contacted."
        : "Find or verify an email before sending outreach.",
    },
  });

  await writeCrmAudit({
    actorUserId: user.id,
    organizationId: organization.id,
    leadId,
    eventType: "crm.outreach_draft.created",
    title: "CRM outreach draft created",
    body: `Outreach draft prepared for ${lead.company}.`,
  });

  revalidateCrm(leadId);
  redirectWith(returnTo, "notice", "Outreach draft added to notes.");
}

export async function markCrmLeadContactedAction(formData: FormData) {
  const leadId = getString(formData, "leadId");
  const returnTo = getReturnTo(formData);
  const { user, organization } = await requireClientWorkspace();
  const lead = await getDb().vegaLead.findFirst({
    where: { id: leadId, organizationId: organization.id },
    select: { id: true, notes: true, company: true },
  });

  if (!lead) {
    redirectWith(returnTo, "error", "That lead is not available here.");
  }

  await getDb().vegaLead.update({
    where: { id: lead.id },
    data: {
      status: "CONTACTED",
      nextStep: "Watch for reply and schedule follow-up.",
      notes: appendCrmNote(
        lead.notes,
        buildCrmNote({
          authorName: user.name,
          body: "Outreach marked as sent from the CRM workspace.",
        }),
      ),
    },
  });

  await writeCrmAudit({
    actorUserId: user.id,
    organizationId: organization.id,
    leadId,
    eventType: "crm.outreach.sent",
    title: "CRM lead contacted",
    body: `${lead.company} was marked contacted.`,
  });

  revalidateCrm(leadId);
  redirectWith(returnTo, "notice", "Lead marked contacted.");
}

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableText(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length ? value : null;
}

function getIntentScore(formData: FormData) {
  const value = Number(getString(formData, "intentScore"));
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getReturnTo(formData: FormData) {
  const value = getString(formData, "returnTo");
  return value.startsWith("/crm") ? value : "/crm";
}

function nextStepForStatus(status: string) {
  if (status === "QUALIFIED") return "Confirm fit and add to the correct list.";
  if (status === "READY_FOR_OUTREACH") {
    return "Draft and review first-touch outreach.";
  }
  if (status === "CONTACTED") return "Watch for reply and schedule follow-up.";
  if (status === "REPLIED") return "Respond and qualify the opportunity.";
  if (status === "BOOKED") return "Prepare for the scheduled conversation.";
  if (status === "WON") return "Convert this opportunity into client delivery.";
  if (status === "LOST") return "Archive the reason and avoid further outreach.";
  return "Review this lead and decide the next CRM move.";
}

async function writeCrmAudit({
  actorUserId,
  organizationId,
  leadId,
  eventType,
  title,
  body,
}: {
  actorUserId: string;
  organizationId: string;
  leadId: string;
  eventType: string;
  title: string;
  body: string;
}) {
  const db = getDb();
  await Promise.all([
    db.activityEvent.create({
      data: {
        organizationId,
        type: eventType,
        title,
        body,
      },
    }),
    db.auditLog.create({
      data: {
        actorUserId,
        eventType,
        entityType: "VegaLead",
        entityId: leadId,
        metadata: {
          organizationId,
        },
      },
    }),
  ]);
}

function revalidateCrm(leadId: string) {
  revalidatePath("/crm");
  revalidatePath(`/crm/${leadId}`);
  revalidatePath("/vega");
  revalidatePath("/dashboard");
}

function redirectWith(
  returnTo: string,
  key: "error" | "notice",
  value: string,
): never {
  redirect(`${returnTo}?${new URLSearchParams({ [key]: value }).toString()}`);
}
