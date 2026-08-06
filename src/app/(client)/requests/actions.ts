"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/server/security/rate-limit";

const requestSchema = z.object({
  category: z.enum([
    "WEBSITE_EDIT",
    "TECHNICAL_ISSUE",
    "NEW_FEATURE",
    "BILLING_QUESTION",
    "MARKETING_REQUEST",
    "CONTENT_UPDATE",
    "DESIGN_REVISION",
    "GENERAL_QUESTION",
    "URGENT_ISSUE",
  ]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  subject: z.string().trim().min(4).max(120),
  description: z.string().trim().min(10).max(2000),
});

export async function createSupportRequestAction(formData: FormData) {
  const { user, organization } = await requireClientWorkspace();
  const limit = checkRateLimit(`support-request:${user.id}`, {
    limit: 6,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    redirectWith("error", "Too many requests submitted. Please wait a minute.");
  }

  const parsed = requestSchema.safeParse({
    category: formData.get("category"),
    priority: formData.get("priority"),
    subject: formData.get("subject"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    redirectWith(
      "error",
      "Add a subject and enough detail for Ghost to route this.",
    );
  }

  const request = await getDb().$transaction(async (tx) => {
    const created = await tx.supportRequest.create({
      data: {
        organizationId: organization.id,
        category: parsed.data.category,
        priority: parsed.data.priority,
        subject: parsed.data.subject,
        description: parsed.data.description,
        status: "SUBMITTED",
        updates: {
          create: {
            authorId: user.id,
            body: parsed.data.description,
            clientVisible: true,
          },
        },
      },
    });

    await tx.notification.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        type: "support.request_submitted",
        title: "Request submitted",
        body: `Ghost received: ${created.subject}`,
        linkTarget: "/requests",
      },
    });

    await tx.activityEvent.create({
      data: {
        organizationId: organization.id,
        type: "support.request_submitted",
        title: "Client request submitted",
        body: created.subject,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        eventType: "support.request.created",
        entityType: "SupportRequest",
        entityId: created.id,
        metadata: {
          organizationId: organization.id,
          category: created.category,
          priority: created.priority,
        },
      },
    });

    return created;
  });

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  redirect(
    `/requests?notice=${encodeURIComponent(`Request submitted: ${request.subject}`)}`,
  );
}

function redirectWith(key: "error" | "notice", value: string): never {
  redirect(`/requests?${new URLSearchParams({ [key]: value }).toString()}`);
}
