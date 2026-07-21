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
  const proposalToken = String(formData.get("proposalToken") ?? "");
  let destination = withParams({
    proposalToken,
    notice: "Test proposal email sent.",
  });

  try {
    await sendTestProposal({
      testRunId: String(formData.get("testRunId") ?? ""),
      proposalToken,
      confirmation: String(formData.get("confirmation") ?? ""),
      actorUserId: user.id,
    });
  } catch (error) {
    destination = withParams({
      proposalToken,
      error: errorMessage(error),
    });
  }

  revalidatePath(route);
  redirect(destination);
}

export async function createTestInvitationAction(formData: FormData) {
  const user = await requireInternalRole(["FOUNDER", "ADMINISTRATOR"]);
  let destination = withParams({
    notice: "Reviewed test invitation created.",
  });

  try {
    const { token } = await createReviewedTestInvitation({
      testRunId: String(formData.get("testRunId") ?? ""),
      confirmation: String(formData.get("confirmation") ?? ""),
      actorUserId: user.id,
    });
    destination = withParams({
      invitationToken: token,
      notice: "Reviewed test invitation created.",
    });
  } catch (error) {
    destination = withParams({ error: errorMessage(error) });
  }

  revalidatePath(route);
  redirect(destination);
}

export async function sendTestInvitationAction(formData: FormData) {
  const user = await requireInternalRole(["FOUNDER", "ADMINISTRATOR"]);
  const invitationToken = String(formData.get("invitationToken") ?? "");
  let destination = withParams({
    invitationToken,
    notice: "Test invitation email sent.",
  });

  try {
    await sendTestInvitation({
      testRunId: String(formData.get("testRunId") ?? ""),
      invitationToken,
      confirmation: String(formData.get("confirmation") ?? ""),
      actorUserId: user.id,
    });
  } catch (error) {
    destination = withParams({
      invitationToken,
      error: errorMessage(error),
    });
  }

  revalidatePath(route);
  redirect(destination);
}

export async function cleanupTestRunAction(formData: FormData) {
  const user = await requireInternalRole(["FOUNDER", "ADMINISTRATOR"]);
  let destination = withParams({ notice: "Test run cleanup completed." });

  try {
    await cleanupTestRun({
      testRunId: String(formData.get("testRunId") ?? ""),
      confirmation: String(formData.get("confirmation") ?? ""),
      actorUserId: user.id,
    });
  } catch (error) {
    destination = withParams({ error: errorMessage(error) });
  }

  revalidatePath(route);
  redirect(destination);
}

function withParams(params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return suffix ? `${route}?${suffix}` : route;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Action failed.";
}
