"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export async function markNotificationsReadAction() {
  const { user, organization } = await requireClientWorkspace();

  await getDb().notification.updateMany({
    where: {
      organizationId: organization.id,
      OR: [{ userId: null }, { userId: user.id }],
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  redirect("/notifications?notice=Notifications marked reviewed");
}
