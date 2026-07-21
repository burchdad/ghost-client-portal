import { isClientSafeActivity } from "@/server/activity/client-safe";
import { amountPaid, amountRemaining } from "@/server/payments/calculations";
import {
  calculateProjectProgress,
  nextMilestone,
} from "@/server/projects/progress";
import { getDb } from "@/lib/db";

export async function getClientDashboardData(
  organizationId: string,
  userId: string,
) {
  const db = getDb();
  const [
    organization,
    projects,
    actions,
    approvals,
    payments,
    activity,
    notifications,
  ] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      include: {
        primaryContact: true,
        billingContact: true,
        contacts: true,
      },
    }),
    db.project.findMany({
      where: { organizationId, deletedAt: null, portalVisible: true },
      include: {
        projectOwner: true,
        phases: { orderBy: { sortOrder: "asc" } },
        milestones: { orderBy: [{ dueAt: "asc" }, { plannedDate: "asc" }] },
        clientActions: { orderBy: [{ priority: "desc" }, { dueAt: "asc" }] },
        payments: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.clientAction.findMany({
      where: {
        organizationId,
        status: {
          in: ["PENDING", "IN_PROGRESS", "SUBMITTED", "NEEDS_CHANGES"],
        },
      },
      include: { project: true },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      take: 8,
    }),
    db.approval.findMany({
      where: {
        project: { organizationId, deletedAt: null, portalVisible: true },
        decision: null,
      },
      include: { project: true },
      take: 5,
    }),
    db.payment.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    }),
    db.activityEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.notification.findMany({
      where: { organizationId, userId, readAt: null },
      take: 10,
    }),
  ]);

  const paidCents = amountPaid(payments);
  const contractCents = projects.reduce(
    (total, project) => total + project.contractValueCents,
    0,
  );
  const remainingCents = amountRemaining(contractCents, paidCents);
  const amountDueCents = payments
    .filter(
      (payment) =>
        payment.status === "PENDING" ||
        payment.status === "FAILED" ||
        payment.status === "CHECKOUT_CREATED",
    )
    .reduce((total, payment) => total + payment.amountCents, 0);

  return {
    organization,
    projects: projects.map((project) => ({
      ...project,
      calculatedProgress: calculateProjectProgress({
        phases: project.phases,
        milestones: project.milestones,
        actions: project.clientActions,
      }),
      nextMilestone: nextMilestone(project.milestones),
      paidCents: amountPaid(project.payments),
      remainingCents: amountRemaining(
        project.contractValueCents,
        amountPaid(project.payments),
      ),
      openActionCount: project.clientActions.filter(
        (action) => action.status !== "COMPLETED" && action.status !== "WAIVED",
      ).length,
    })),
    actions,
    approvals,
    payments,
    safeActivity: activity
      .filter((item) => isClientSafeActivity(item.type))
      .slice(0, 8),
    unreadNotificationCount: notifications.length,
    summary: {
      activeProjects: projects.length,
      openActions: actions.length,
      awaitingApproval: approvals.length,
      amountDueCents,
      paidCents,
      remainingCents,
    },
  };
}
