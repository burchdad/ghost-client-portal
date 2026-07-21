"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireInternalRole } from "@/lib/auth/guards";
import {
  cleanupTestRun,
  createOrReuseTestRun,
  createReviewedTestInvitation,
  sendTestInvitation,
  sendTestProposal,
} from "@/server/testing/client-lifecycle";

const route = "/admin/testing/client-lifecycle";

export async function createTestRunAction(formData: FormData) {
  const user = await requireInternalRole(["FOUNDER", "ADMINISTRATOR"]);
  const forceNew = formData.get("forceNew") === "yes";
  const { run, proposalToken } = await createOrReuseTestRun({
    actorUserId: user.id,
    forceNew,
  });

  revalidatePath(route);
  redirect(
    `${route}?created=${run?.id ?? ""}${proposalToken ? `&proposalToken=${proposalToken}` : ""}`,
  );
}

export async function sendTestProposalAction(formData: FormData) {
  const user = await requireInternalRole(["FOUNDER", "ADMINISTRATOR"]);
  await sendTestProposal({
    testRunId: String(formData.get("testRunId") ?? ""),
    proposalToken: String(formData.get("proposalToken") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
    actorUserId: user.id,
  });
  revalidatePath(route);
}

export async function createTestInvitationAction(formData: FormData) {
  const user = await requireInternalRole(["FOUNDER", "ADMINISTRATOR"]);
  const { token } = await createReviewedTestInvitation({
    testRunId: String(formData.get("testRunId") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
    actorUserId: user.id,
  });
  revalidatePath(route);
  redirect(`${route}?invitationToken=${token}`);
}

export async function sendTestInvitationAction(formData: FormData) {
  const user = await requireInternalRole(["FOUNDER", "ADMINISTRATOR"]);
  await sendTestInvitation({
    testRunId: String(formData.get("testRunId") ?? ""),
    invitationToken: String(formData.get("invitationToken") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
    actorUserId: user.id,
  });
  revalidatePath(route);
}

export async function cleanupTestRunAction(formData: FormData) {
  const user = await requireInternalRole(["FOUNDER", "ADMINISTRATOR"]);
  await cleanupTestRun({
    testRunId: String(formData.get("testRunId") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
    actorUserId: user.id,
  });
  revalidatePath(route);
}
