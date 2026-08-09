import type { ClientActionStatus } from "@prisma/client";
import { isClientSafeActivity } from "@/server/activity/client-safe";
import { calculateProjectProgress } from "@/server/projects/progress";
import { getDb } from "@/lib/db";
import {
  inferRequestedLeadCount,
  LeadCommandAuthError,
  searchLeadCommandLeads,
} from "./lead-command-client";

type OnboardingResponseInput = {
  fieldKey: string;
  value: unknown;
};

type VegaProjectInput = {
  id: string;
  name: string;
  serviceCategory: string;
  currentPhase: string;
  progress: number;
  clientVisibleSummary: string;
  updatedAt: Date;
  phases: { status: string; progress: number }[];
  milestones: {
    status: string;
    dueAt: Date | null;
    plannedDate: Date | null;
  }[];
  clientActions: {
    title: string;
    description: string;
    status: ClientActionStatus;
    priority: string;
    dueAt: Date | null;
  }[];
};

type VegaLeadRecord = {
  id: string;
  company: string;
  contact: string;
  title: string;
  segment: string;
  stage: string;
  intentScore: number;
  emailStatus: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  source: string;
  sourceEvidence: string[];
  sourceConfidence: string;
  notes: string | null;
  nextStep: string;
};

export type VegaSnapshot = {
  positioningScore: number;
  summary: {
    activeProjects: number;
    capturedCompetitors: number;
    openEngagements: number;
    leadSignals: number;
  };
  positioning: {
    label: string;
    score: number;
    status: string;
    detail: string;
  }[];
  competitors: {
    name: string;
    source: string;
    note: string;
  }[];
  leads: {
    name: string;
    source: string;
    stage: string;
    intentScore: number;
    nextStep: string;
  }[];
  leadRecords: VegaLeadRecord[];
  leadLists: {
    name: string;
    count: number;
    source: string;
    status: string;
  }[];
  outreachSequences: {
    name: string;
    audience: string;
    status: string;
    steps: number;
    nextAction: string;
  }[];
  queryPresets: {
    label: string;
    query: string;
  }[];
  queries: {
    id: string;
    prompt: string;
    status: string;
    resultCount: number;
    requestedCount: number;
    fulfillmentRate: number;
    source: string;
    guidance: string;
    createdAt: Date;
  }[];
  engagement: {
    title: string;
    body: string;
    signal: string;
  }[];
  marketingTactics: {
    name: string;
    channel: string;
    status: string;
    nextMove: string;
  }[];
};

export async function getClientVegaData(organizationId: string) {
  const db = getDb();
  const [organization, projects, forms, activity, storedLeads, queries] =
    await Promise.all([
      db.organization.findUnique({
        where: { id: organizationId },
        include: { contacts: true, primaryContact: true },
      }),
      db.project.findMany({
        where: { organizationId, deletedAt: null, portalVisible: true },
        include: {
          phases: true,
          milestones: true,
          clientActions: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.onboardingForm.findMany({
        where: { organizationId },
        include: { responses: true },
        orderBy: { updatedAt: "desc" },
      }),
      db.activityEvent.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.vegaLead.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.vegaLeadQuery.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  const responses = forms.flatMap((form) => form.responses);

  return {
    organization,
    snapshot: buildVegaSnapshot({
      projects,
      responses,
      storedLeads: storedLeads.map((lead) => buildStoredLeadRecord(lead)),
      queries: queries.map((query) => ({
        id: query.id,
        prompt: query.prompt,
        status: query.status,
        resultCount: query.resultCount,
        requestedCount: inferRequestedLeadCount(query.prompt),
        fulfillmentRate: fulfillmentRate(
          query.resultCount,
          inferRequestedLeadCount(query.prompt),
        ),
        source: query.source,
        guidance: queryGuidance({
          status: query.status,
          resultCount: query.resultCount,
          requestedCount: inferRequestedLeadCount(query.prompt),
        }),
        createdAt: query.createdAt,
      })),
      useGeneratedLeadFallback: false,
      activity: activity
        .filter((item) => isClientSafeActivity(item.type))
        .map((item) => ({
          title: item.title,
          body: item.body ?? "Portal activity recorded.",
          type: item.type,
        })),
    }),
  };
}

function buildStoredLeadRecord(lead: {
  id: string;
  company: string;
  contactName: string | null;
  title: string | null;
  segment: string;
  status: string;
  intentScore: number;
  email: string | null;
  phone: string | null;
  website: string | null;
  source: string;
  notes: string | null;
  nextStep: string | null;
}): VegaLeadRecord {
  const sourceEvidence = buildSourceEvidence({
    source: lead.source,
    notes: lead.notes,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
  });

  return {
    id: lead.id,
    company: lead.company,
    contact: lead.contactName ?? "Contact pending",
    title: lead.title ?? "Decision maker",
    segment: lead.segment,
    stage: lead.status,
    intentScore: lead.intentScore,
    emailStatus: lead.email
      ? "Verified email ready"
      : "Email blocked until verified",
    email: lead.email,
    phone: lead.phone,
    website: normalizeWebsite(lead.website),
    source: lead.source,
    sourceEvidence,
    sourceConfidence:
      sourceEvidence.length >= 4
        ? "Multi-signal"
        : sourceEvidence.length >= 2
          ? "Single source + context"
          : "Needs confirmation",
    notes: lead.notes,
    nextStep: lead.nextStep ?? "Review lead before outreach.",
  };
}

export async function getAdminVegaData() {
  const db = getDb();
  const organizations = await db.organization.findMany({
    where: { deletedAt: null },
    include: {
      projects: {
        where: { deletedAt: null, portalVisible: true },
        include: { phases: true, milestones: true, clientActions: true },
      },
      onboarding: { include: { responses: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    accountStatus: organization.accountStatus,
    snapshot: buildVegaSnapshot({
      projects: organization.projects,
      responses: organization.onboarding.flatMap((form) => form.responses),
      activity: [],
    }),
  }));
}

export async function createVegaLeadQuery(input: {
  organizationId: string;
  requestedById: string;
  prompt: string;
}) {
  const db = getDb();
  let searchResult: Awaited<ReturnType<typeof searchLeadCommandLeads>>;

  try {
    searchResult = await searchLeadCommandLeads(input.prompt);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Lead Command sourcing failed for this request.";
    const status =
      error instanceof LeadCommandAuthError ? "AUTH_FAILED" : "FAILED";

    return db.$transaction(async (tx) => {
      const query = await tx.vegaLeadQuery.create({
        data: {
          organizationId: input.organizationId,
          requestedById: input.requestedById,
          prompt: input.prompt,
          status,
          source: "lead_command",
          resultCount: 0,
          completedAt: new Date(),
        },
      });

      await tx.activityEvent.create({
        data: {
          organizationId: input.organizationId,
          type: "vega.leads_failed",
          title: "Vega lead request failed",
          body: message,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: input.requestedById,
          eventType: "vega.lead_query.failed",
          entityType: "VegaLeadQuery",
          entityId: query.id,
          metadata: {
            organizationId: input.organizationId,
            error: message,
            status,
          },
        },
      });

      return query;
    });
  }

  return db.$transaction(async (tx) => {
    const query = await tx.vegaLeadQuery.create({
      data: {
        organizationId: input.organizationId,
        requestedById: input.requestedById,
        prompt: input.prompt,
        status: "COMPLETED",
        source: searchResult.source,
        resultCount: searchResult.leads.length,
        completedAt: new Date(),
      },
    });

    if (searchResult.leads.length) {
      await tx.vegaLead.createMany({
        data: searchResult.leads.map((lead) => ({
          organizationId: input.organizationId,
          queryId: query.id,
          ...lead,
        })),
      });
    }

    await tx.activityEvent.create({
      data: {
        organizationId: input.organizationId,
        type: "vega.leads_pulled",
        title: "Vega lead request completed",
        body: searchResult.message,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.requestedById,
        eventType: "vega.lead_query.created",
        entityType: "VegaLeadQuery",
        entityId: query.id,
        metadata: {
          organizationId: input.organizationId,
          provider: searchResult.provider,
          resultCount: searchResult.leads.length,
        },
      },
    });

    return query;
  });
}

export function buildVegaSnapshot(input: {
  projects: VegaProjectInput[];
  responses: OnboardingResponseInput[];
  activity: { title: string; body: string; type: string }[];
  storedLeads?: VegaLeadRecord[];
  queries?: VegaSnapshot["queries"];
  useGeneratedLeadFallback?: boolean;
}): VegaSnapshot {
  const competitors = extractCompetitors(input.responses);
  const openActions = input.projects.flatMap((project) =>
    project.clientActions
      .filter((action) => !["COMPLETED", "WAIVED"].includes(action.status))
      .map((action) => ({ project, action })),
  );
  const projectSignals = input.projects.map((project) => ({
    project,
    progress: calculateProjectProgress({
      phases: project.phases,
      milestones: project.milestones,
      actions: project.clientActions,
    }),
  }));
  const leadSignals = buildLeadSignals(projectSignals, openActions);
  const generatedLeadRecords = buildLeadRecords(leadSignals);
  const leadRecords = input.storedLeads?.length
    ? input.storedLeads
    : input.useGeneratedLeadFallback === false
      ? []
      : generatedLeadRecords;
  const baseScore =
    30 +
    Math.min(25, input.projects.length * 8) +
    Math.min(20, competitors.length * 5) +
    Math.min(25, leadSignals.length * 6);

  return {
    positioningScore: Math.min(100, baseScore),
    summary: {
      activeProjects: input.projects.length,
      capturedCompetitors: competitors.length,
      openEngagements: openActions.length,
      leadSignals: leadSignals.length,
    },
    positioning: buildPositioning(projectSignals, competitors.length),
    competitors,
    leads: leadSignals,
    leadRecords,
    leadLists: buildLeadLists(leadRecords, competitors.length),
    outreachSequences: buildOutreachSequences(leadRecords, openActions),
    queryPresets: buildQueryPresets(projectSignals, competitors),
    queries: input.queries ?? [],
    engagement: buildEngagement(input.activity, openActions),
    marketingTactics: buildMarketingTactics(projectSignals, openActions),
  };
}

function buildPositioning(
  projectSignals: { project: VegaProjectInput; progress: number }[],
  competitorCount: number,
) {
  const projectText = projectSignals
    .map(({ project }) =>
      [
        project.name,
        project.serviceCategory,
        project.currentPhase,
        project.clientVisibleSummary,
      ].join(" "),
    )
    .join(" ")
    .toLowerCase();
  const averageProgress = projectSignals.length
    ? Math.round(
        projectSignals.reduce((total, item) => total + item.progress, 0) /
          projectSignals.length,
      )
    : 0;

  return [
    {
      label: "SEO visibility",
      score: scoreFor(
        projectText,
        ["seo", "search", "ranking"],
        averageProgress,
      ),
      status: statusFor(projectText, ["seo", "search", "ranking"]),
      detail:
        "Organic search positioning, content signals, and crawl readiness.",
    },
    {
      label: "AEO readiness",
      score: scoreFor(
        projectText,
        ["aeo", "answer", "faq", "schema"],
        averageProgress,
      ),
      status: statusFor(projectText, ["aeo", "answer", "faq", "schema"]),
      detail:
        "Answer engine readiness for direct responses and structured answers.",
    },
    {
      label: "GEO presence",
      score: scoreFor(
        projectText,
        ["geo", "generative", "ai", "llm"],
        averageProgress,
      ),
      status: statusFor(projectText, ["geo", "generative", "ai", "llm"]),
      detail:
        "Generative engine positioning across AI-assisted discovery paths.",
    },
    {
      label: "Competitive context",
      score: Math.min(100, 35 + competitorCount * 15),
      status: competitorCount
        ? "Competitors captured"
        : "Needs competitor input",
      detail:
        "Known competitor set used to guide positioning and opportunity analysis.",
    },
  ];
}

function scoreFor(text: string, terms: string[], progress: number) {
  const matched = terms.some((term) => text.includes(term));
  return Math.min(100, (matched ? 55 : 25) + Math.round(progress * 0.45));
}

function statusFor(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
    ? "Active signal"
    : "Not yet configured";
}

function extractCompetitors(responses: OnboardingResponseInput[]) {
  const competitorResponse = responses.find((response) =>
    response.fieldKey.toLowerCase().includes("competitor"),
  );
  const values = normalizeList(competitorResponse?.value);

  return values.length
    ? values.map((name) => ({
        name,
        source: "Client onboarding",
        note: "Captured from the client workspace and ready for Vega analysis.",
      }))
    : [
        {
          name: "Competitor set needed",
          source: "Vega setup",
          note: "Add competitors during onboarding or operations review to unlock deeper comparisons.",
        },
      ];
}

function buildLeadSignals(
  projectSignals: { project: VegaProjectInput; progress: number }[],
  openActions: {
    project: VegaProjectInput;
    action: VegaProjectInput["clientActions"][number];
  }[],
) {
  const projectLeads = projectSignals.map(({ project, progress }) => ({
    name: `${project.name} opportunity`,
    source: project.serviceCategory,
    stage: project.currentPhase,
    intentScore: Math.min(100, 45 + Math.round(progress * 0.45)),
    nextStep:
      openActions.find((item) => item.project.id === project.id)?.action
        .title ?? "Ghost is preparing the next client-visible update.",
  }));
  const actionLeads = openActions.slice(0, 3).map(({ project, action }) => ({
    name: action.title,
    source: project.name,
    stage: action.priority,
    intentScore:
      action.priority === "HIGH" || action.priority === "URGENT" ? 82 : 64,
    nextStep: action.description,
  }));

  return [...projectLeads, ...actionLeads].slice(0, 6);
}

function buildLeadRecords(
  leadSignals: {
    name: string;
    source: string;
    stage: string;
    intentScore: number;
    nextStep: string;
  }[],
) {
  return leadSignals.length
    ? leadSignals.map((lead, index) => ({
        id: `generated-${index}`,
        company: lead.name.replace(/ opportunity$/i, ""),
        contact: ["Operations Lead", "Growth Director", "Founder"][index % 3],
        title: ["Decision maker", "Budget owner", "Primary evaluator"][
          index % 3
        ],
        segment: lead.source,
        stage: lead.stage,
        intentScore: lead.intentScore,
        emailStatus:
          lead.intentScore >= 80 ? "Ready for outreach" : "Needs enrichment",
        email: null,
        phone: null,
        website: null,
        source: lead.source,
        sourceEvidence: [lead.source],
        sourceConfidence: "Generated placeholder",
        notes: null,
        nextStep: lead.nextStep,
      }))
    : [
        {
          id: "setup-placeholder",
          company: "No Vega lead list connected",
          contact: "Lead source pending",
          title: "Import or query leads",
          segment: "Vega setup",
          stage: "Needs source",
          intentScore: 0,
          emailStatus: "Not ready",
          email: null,
          phone: null,
          website: null,
          source: "Vega setup",
          sourceEvidence: ["Vega setup"],
          sourceConfidence: "Needs source",
          notes: null,
          nextStep:
            "Connect a lead source or run a Vega query to populate this workspace.",
        },
      ];
}

function buildSourceEvidence(input: {
  source: string;
  notes: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
}) {
  const evidence = [
    input.source ? `Primary source: ${formatSource(input.source)}` : null,
    input.email ? "Verified email captured" : null,
    input.phone ? "Phone path captured" : null,
    input.website ? "Company website captured" : null,
    ...(input.notes
      ?.split("\n")
      .map((line) => line.trim())
      .filter((line) =>
        /signal|source|profile|website|phone|email|buyer fit|confidence/i.test(
          line,
        ),
      )
      .slice(0, 4) ?? []),
  ];

  return [...new Set(evidence.filter((item): item is string => Boolean(item)))];
}

function formatSource(source: string) {
  return source
    .replace(/^lead_command:/i, "")
    .replace(/:/g, " · ")
    .replace(/_/g, " ")
    .trim();
}

function normalizeWebsite(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function fulfillmentRate(resultCount: number, requestedCount: number) {
  if (!requestedCount) return 0;
  return Math.round((resultCount / requestedCount) * 100);
}

function queryGuidance(input: {
  status: string;
  resultCount: number;
  requestedCount: number;
}) {
  if (input.status === "AUTH_FAILED") {
    return "Lead Command authorization needs attention before live sourcing can continue.";
  }

  if (input.status === "FAILED") {
    return "Lead Command could not complete this source request. Try again or broaden the audience.";
  }

  if (input.resultCount === 0) {
    return "No qualified prospects matched. Broaden the geography, buyer role, or industry terms.";
  }

  if (input.resultCount < input.requestedCount) {
    return "Vega returned the qualified matches it could verify. Broaden the search to find more volume.";
  }

  return "Lead Command returned a full qualified set for this request.";
}

function buildLeadLists(
  leadRecords: VegaLeadRecord[],
  competitorCount: number,
) {
  const qualified = leadRecords.filter((lead) => lead.intentScore >= 65).length;
  const highIntent = leadRecords.filter(
    (lead) => lead.intentScore >= 80,
  ).length;

  return [
    {
      name: "Qualified prospects",
      count: qualified,
      source: "Vega query",
      status: qualified ? "Ready to pull" : "Awaiting matches",
    },
    {
      name: "High-intent outreach",
      count: highIntent,
      source: "Intent scoring",
      status: highIntent ? "Outreach ready" : "Needs enrichment",
    },
    {
      name: "Competitor gap targets",
      count: competitorCount,
      source: "GEO competitor set",
      status: competitorCount ? "Ready for review" : "Needs competitor input",
    },
  ];
}

function buildOutreachSequences(
  leadRecords: VegaLeadRecord[],
  openActions: {
    project: VegaProjectInput;
    action: VegaProjectInput["clientActions"][number];
  }[],
) {
  const readyCount = leadRecords.filter(
    (lead) => lead.intentScore >= 65,
  ).length;

  return [
    {
      name: "Intro value email",
      audience: `${readyCount} qualified leads`,
      status: readyCount ? "Draft ready" : "Waiting on lead list",
      steps: 3,
      nextAction: "Review subject line, offer, and call-to-action.",
    },
    {
      name: "Follow-up and proof sequence",
      audience: "Warm prospects",
      status: openActions.length ? "Needs client input" : "Queued",
      steps: 4,
      nextAction:
        openActions[0]?.action.title ??
        "Choose a lead list before generating follow-up copy.",
    },
    {
      name: "Reactivation campaign",
      audience: "Dormant or unresponsive leads",
      status: "Planned",
      steps: 2,
      nextAction: "Pull a stale lead list or upload prior prospect data.",
    },
  ];
}

function buildQueryPresets(
  projectSignals: { project: VegaProjectInput; progress: number }[],
  competitors: { name: string; source: string; note: string }[],
) {
  const primaryProject = projectSignals[0]?.project;
  const service = primaryProject?.serviceCategory ?? "growth services";
  const competitor = competitors.find(
    (item) => item.name !== "Competitor set needed",
  )?.name;

  return [
    {
      label: "Find local buyers",
      query: `${service} decision makers in my target market`,
    },
    {
      label: "Pull competitor gap list",
      query: competitor
        ? `companies comparing us against ${competitor}`
        : "companies underserved by our top competitors",
    },
    {
      label: "Build outreach segment",
      query: `high-intent leads for ${primaryProject?.name ?? "current campaign"}`,
    },
  ];
}

function buildEngagement(
  activity: { title: string; body: string; type: string }[],
  openActions: {
    project: VegaProjectInput;
    action: VegaProjectInput["clientActions"][number];
  }[],
) {
  const actionSignals = openActions.slice(0, 4).map(({ project, action }) => ({
    title: action.title,
    body: `${project.name}: ${action.description}`,
    signal: action.status,
  }));
  const activitySignals = activity.slice(0, 4).map((item) => ({
    title: item.title,
    body: item.body,
    signal: item.type,
  }));

  return [...actionSignals, ...activitySignals].slice(0, 6);
}

function buildMarketingTactics(
  projectSignals: { project: VegaProjectInput; progress: number }[],
  openActions: {
    project: VegaProjectInput;
    action: VegaProjectInput["clientActions"][number];
  }[],
) {
  const projectText = projectSignals
    .map(({ project }) =>
      [
        project.name,
        project.serviceCategory,
        project.currentPhase,
        project.clientVisibleSummary,
      ].join(" "),
    )
    .join(" ")
    .toLowerCase();
  const hasSearch = ["seo", "search", "geo", "aeo"].some((term) =>
    projectText.includes(term),
  );
  const hasBrand = ["brand", "logo", "identity", "creative"].some((term) =>
    projectText.includes(term),
  );
  const hasLeadGen = ["lead", "funnel", "campaign", "engagement"].some((term) =>
    projectText.includes(term),
  );
  const nextAction =
    openActions[0]?.action.description ??
    "Ghost will publish the next campaign move after the current workspace milestone.";

  return [
    {
      name: "Search capture campaign",
      channel: "SEO / AEO / GEO",
      status: hasSearch ? "Active" : "Ready for planning",
      nextMove: hasSearch
        ? "Expand ranking, answer, and generative discovery coverage."
        : "Define the first search visibility campaign.",
    },
    {
      name: "Authority and trust content",
      channel: "Content",
      status: hasBrand ? "In motion" : "Queued",
      nextMove: hasBrand
        ? "Turn brand positioning into proof-led market content."
        : "Collect brand and audience inputs before publishing.",
    },
    {
      name: "Lead engagement sequence",
      channel: "Email / CRM",
      status: hasLeadGen ? "Active" : "Needs lead source",
      nextMove: nextAction,
    },
    {
      name: "Competitor response plays",
      channel: "Positioning",
      status: "Draft",
      nextMove:
        "Use competitor gaps from GEO to create differentiating campaign angles.",
    },
  ];
}

function normalizeList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeList(item));
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap((item) => normalizeList(item));
  }
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
