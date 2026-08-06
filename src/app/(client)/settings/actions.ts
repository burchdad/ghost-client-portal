import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/guards";

export const notificationPreferenceKeys = [
  "proposals",
  "payments",
  "projects",
  "vega",
  "geo",
  "echo",
  "requests",
] as const;

export type NotificationPreferenceKey =
  (typeof notificationPreferenceKeys)[number];

export type NotificationPreferences = Record<
  NotificationPreferenceKey,
  boolean
>;

export const defaultNotificationPreferences: NotificationPreferences = {
  proposals: true,
  payments: true,
  projects: true,
  vega: true,
  geo: true,
  echo: true,
  requests: true,
};

export async function getNotificationPreferences(userId: string) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(preferenceCookieName(userId))?.value;

  if (!raw) {
    return defaultNotificationPreferences;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;

    return {
      ...defaultNotificationPreferences,
      ...Object.fromEntries(
        notificationPreferenceKeys.map((key) => [key, Boolean(parsed[key])]),
      ),
    } as NotificationPreferences;
  } catch {
    return defaultNotificationPreferences;
  }
}

export async function saveNotificationPreferencesAction(formData: FormData) {
  "use server";

  const user = await requireAuthenticatedUser();
  const preferences = Object.fromEntries(
    notificationPreferenceKeys.map((key) => [key, formData.get(key) === "on"]),
  ) as NotificationPreferences;
  const cookieStore = await cookies();

  cookieStore.set(preferenceCookieName(user.id), JSON.stringify(preferences), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/settings");
  redirect("/settings?notice=Notification preferences saved.");
}

function preferenceCookieName(userId: string) {
  return `ghost_portal_notification_preferences_${userId}`;
}
