import { BellRing } from "lucide-react";
import {
  EmptyWorkspace,
  MetricCard,
  PageHero,
  SectionPanel,
  StatusBadge,
} from "@/components/workspace-ui";
import { requireOrganizationMembership } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function NotificationsPage() {
  const { organization } = await requireOrganizationMembership();
  const notifications = await getDb().notification.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });
  const unread = notifications.filter((item) => !item.readAt);

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Notification center"
        title={`Workspace alerts for ${organization.name}`}
        body="Client-safe updates, approvals, payment notices, project activity, and system messages collect here."
        metrics={[
          {
            label: "Unread",
            value: String(unread.length),
            detail: "Need review",
          },
          {
            label: "Total",
            value: String(notifications.length),
            detail: "Workspace messages",
          },
          {
            label: "Latest",
            value: notifications[0]
              ? formatDate(notifications[0].createdAt)
              : "None",
            detail: "Most recent alert",
          },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <MetricCard
          label="Unread alerts"
          value={String(unread.length)}
          detail="Items that have not been marked as reviewed."
          tone={unread.length ? "warning" : "accent"}
        />
        <MetricCard
          label="Workspace health"
          value={unread.length ? "Needs review" : "Clear"}
          detail="Notification state for this client workspace."
        />
      </section>

      {notifications.length ? (
        <SectionPanel title="Notifications" eyebrow="Activity feed">
          <div className="space-y-3">
            {notifications.map((item) => (
              <article
                key={item.id}
                className="rounded-md border border-line bg-white/[0.035] p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <StatusBadge tone={item.readAt ? "default" : "accent"}>
                      {item.readAt ? "Read" : "Unread"}
                    </StatusBadge>
                    <h2 className="mt-3 text-xl font-semibold">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {item.body}
                    </p>
                  </div>
                  <p className="text-sm text-muted">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </SectionPanel>
      ) : (
        <EmptyWorkspace
          icon={BellRing}
          title="No notifications yet"
          body="Approvals, project updates, payment events, and client-safe Ghost notices will appear here as the workspace moves."
          steps={[
            "Notifications publish from portal activity",
            "Unread items surface in the header",
            "Important decisions stay visible",
          ]}
        />
      )}
    </section>
  );
}
