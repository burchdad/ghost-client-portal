import { getDb } from "@/lib/db";

export const crmStages = [
  { value: "NEW", label: "New", detail: "Needs review" },
  { value: "QUALIFIED", label: "Qualified", detail: "Good fit" },
  { value: "READY_FOR_OUTREACH", label: "Ready", detail: "Draft next" },
  { value: "CONTACTED", label: "Contacted", detail: "First touch sent" },
  { value: "REPLIED", label: "Replied", detail: "Conversation open" },
  { value: "BOOKED", label: "Booked", detail: "Meeting scheduled" },
  { value: "WON", label: "Won", detail: "Converted" },
  { value: "LOST", label: "Lost", detail: "Closed out" },
] as const;

export const crmStageValues: ReadonlySet<string> = new Set(
  crmStages.map((stage) => stage.value),
);

export async function getClientCrmData({
  organizationId,
  query,
  stage,
}: {
  organizationId: string;
  query?: string;
  stage?: string;
}) {
  const trimmedQuery = query?.trim();
  const normalizedStage = stage && crmStageValues.has(stage) ? stage : "ALL";
  const leads = await getDb().vegaLead.findMany({
    where: {
      organizationId,
      ...(normalizedStage !== "ALL" ? { status: normalizedStage } : {}),
      ...(trimmedQuery
        ? {
            OR: [
              { company: { contains: trimmedQuery, mode: "insensitive" } },
              { contactName: { contains: trimmedQuery, mode: "insensitive" } },
              { title: { contains: trimmedQuery, mode: "insensitive" } },
              { email: { contains: trimmedQuery, mode: "insensitive" } },
              { segment: { contains: trimmedQuery, mode: "insensitive" } },
              { notes: { contains: trimmedQuery, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 300,
  });

  const stageCounts = crmStages.map((stageItem) => ({
    ...stageItem,
    count: leads.filter((lead) => lead.status === stageItem.value).length,
  }));

  return {
    leads,
    stage: normalizedStage,
    stageCounts,
    summary: {
      total: leads.length,
      outreachReady: leads.filter((lead) =>
        ["QUALIFIED", "READY_FOR_OUTREACH"].includes(lead.status),
      ).length,
      activeConversations: leads.filter((lead) =>
        ["CONTACTED", "REPLIED", "BOOKED"].includes(lead.status),
      ).length,
      emailReady: leads.filter((lead) => Boolean(lead.email)).length,
      won: leads.filter((lead) => lead.status === "WON").length,
    },
  };
}

export async function getClientCrmLead({
  organizationId,
  leadId,
}: {
  organizationId: string;
  leadId: string;
}) {
  return getDb().vegaLead.findFirst({
    where: {
      id: leadId,
      organizationId,
    },
    include: {
      query: {
        select: {
          prompt: true,
          source: true,
          createdAt: true,
        },
      },
    },
  });
}

export function buildCrmNote({
  authorName,
  body,
}: {
  authorName: string;
  body: string;
}) {
  const timestamp = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

  return `[${timestamp} - ${authorName}] ${body}`;
}

export function appendCrmNote(existing: string | null, note: string) {
  return [note, existing].filter(Boolean).join("\n\n");
}

export function buildOutreachDraft({
  company,
  contactName,
  segment,
  nextStep,
}: {
  company: string;
  contactName: string | null;
  segment: string;
  nextStep: string | null;
}) {
  const firstName = contactName?.split(" ")[0] ?? "there";

  return [
    `Subject: Quick growth idea for ${company}`,
    "",
    `Hi ${firstName},`,
    "",
    `I came across ${company} while researching ${segment.toLowerCase()} opportunities and noticed a few places where stronger search visibility, AI answer readiness, and follow-up automation could help create more qualified conversations.`,
    "",
    nextStep
      ? `The immediate angle I would explore: ${nextStep}`
      : "The immediate angle I would explore is a quick visibility and lead-flow audit before recommending any larger project.",
    "",
    "Would it be useful if I sent over a few specific opportunities I see?",
    "",
    "Stephen",
  ].join("\n");
}
