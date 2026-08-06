"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/server/security/rate-limit";

const threadSchema = z.object({
  subject: z.string().trim().min(4).max(140),
  body: z.string().trim().min(10).max(2000),
  projectId: z.string().optional(),
});

export async function createMessageThreadAction(formData: FormData) {
  const { user, organization } = await requireClientWorkspace();
  const limit = checkRateLimit(`message-thread:${user.id}`, {
    limit: 8,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    redirectWith("error", "Too many messages sent. Please wait a minute.");
  }

  const parsed = threadSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
    projectId: formData.get("projectId") || undefined,
  });

  if (!parsed.success) {
    redirectWith("error", "Add a subject and enough message detail.");
  }

  const projectId = parsed.data.projectId;
  if (projectId) {
    const project = await getDb().project.findFirst({
      where: {
        id: projectId,
        organizationId: organization.id,
        deletedAt: null,
        portalVisible: true,
      },
      select: { id: true },
    });

    if (!project) {
      redirectWith("error", "That project is not available in this workspace.");
    }
  }

  const thread = await getDb().$transaction(async (tx) => {
    const created = await tx.messageThread.create({
      data: {
        organizationId: organization.id,
        projectId,
        subject: parsed.data.subject,
        messages: {
          create: {
            authorId: user.id,
            body: parsed.data.body,
            clientVisible: true,
          },
        },
      },
    });

    await tx.notification.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        type: "message.thread_created",
        title: "Message sent",
        body: `Ghost received: ${created.subject}`,
        linkTarget: "/messages",
      },
    });

    await tx.activityEvent.create({
      data: {
        organizationId: organization.id,
        projectId,
        type: "message.thread_created",
        title: "Client message sent",
        body: created.subject,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        eventType: "message.thread.created",
        entityType: "MessageThread",
        entityId: created.id,
        metadata: { organizationId: organization.id, projectId },
      },
    });

    return created;
  });

  revalidatePath("/messages");
  revalidatePath("/dashboard");
  redirect(
    `/messages?notice=${encodeURIComponent(`Message sent: ${thread.subject}`)}`,
  );
}

function redirectWith(key: "error" | "notice", value: string): never {
  redirect(`/messages?${new URLSearchParams({ [key]: value }).toString()}`);
}
