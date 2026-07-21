import { requireOrganizationMembership } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export default async function NotificationsPage() {
  const { organization } = await requireOrganizationMembership();
  const notifications = await getDb().notification.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section>
      <h1 className="text-3xl font-semibold">Notifications</h1>
      <div className="mt-6 space-y-3">
        {notifications.map((item) => (
          <div key={item.id} className="rounded-lg border border-line bg-panel p-5">
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-1 text-sm text-muted">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
