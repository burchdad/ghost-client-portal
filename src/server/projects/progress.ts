import type { ClientAction, Milestone, ProjectPhase } from "@prisma/client";

export function calculateProjectProgress(input: {
  phases: Pick<ProjectPhase, "status" | "progress">[];
  milestones: Pick<Milestone, "status">[];
  actions: Pick<ClientAction, "status">[];
}) {
  const phaseScore = average(
    input.phases.map((phase) => {
      if (phase.status === "Completed") return 100;
      if (
        phase.status === "In Progress" ||
        phase.status === "Ready" ||
        phase.status === "Waiting on Client"
      ) {
        return Math.max(phase.progress, 25);
      }
      if (phase.status === "Client Review") return Math.max(phase.progress, 60);
      return phase.progress;
    }),
  );
  const milestoneScore = completionScore(
    input.milestones.map((milestone) => milestone.status),
  );
  const actionScore = completionScore(
    input.actions.map((action) => action.status),
  );

  if (
    !input.phases.length &&
    !input.milestones.length &&
    !input.actions.length
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      weightedAverage([
        { score: phaseScore, weight: input.phases.length ? 0.5 : 0 },
        { score: milestoneScore, weight: input.milestones.length ? 0.25 : 0 },
        { score: actionScore, weight: input.actions.length ? 0.25 : 0 },
      ]),
    ),
  );
}

export function nextMilestone(
  milestones: Pick<Milestone, "name" | "status" | "dueAt" | "plannedDate">[],
) {
  return (
    milestones.find((milestone) => !isCompleteStatus(milestone.status)) ??
    milestones[0] ??
    null
  );
}

function completionScore(statuses: string[]) {
  if (!statuses.length) {
    return 0;
  }

  return (statuses.filter(isCompleteStatus).length / statuses.length) * 100;
}

function isCompleteStatus(status: string) {
  return (
    status === "COMPLETED" ||
    status === "Completed" ||
    status === "WAIVED" ||
    status === "Waived"
  );
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function weightedAverage(values: { score: number; weight: number }[]) {
  const weight = values.reduce((total, value) => total + value.weight, 0);
  if (weight <= 0) {
    return 0;
  }

  return (
    values.reduce((total, value) => total + value.score * value.weight, 0) /
    weight
  );
}
