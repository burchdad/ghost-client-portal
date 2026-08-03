import type { ClientActionStatus } from "@prisma/client";
import { isClientSafeActivity } from "@/server/activity/client-safe";
import { calculateProjectProgress } from "@/server/projects/progress";
import { getDb } from "@/lib/db";

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
  engagement: {
    title: string;
    body: string;
    signal: string;
  }[];
};

export async function getClientVegaData(organizationId: string) {
  const db = getDb();
  const [organization, projects, forms, activity] = await Promise.all([
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
  ]);

  const responses = forms.flatMap((form) => form.responses);

  return {
    organization,
    snapshot: buildVegaSnapshot({
      projects,
      responses,
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
    accountStatus: organization.accountStatus,
    snapshot: buildVegaSnapshot({
      projects: organization.projects,
      responses: organization.onboarding.flatMap((form) => form.responses),
      activity: [],
    }),
  }));
}

export function buildVegaSnapshot(input: {
  projects: VegaProjectInput[];
  responses: OnboardingResponseInput[];
  activity: { title: string; body: string; type: string }[];
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
    engagement: buildEngagement(input.activity, openActions),
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
