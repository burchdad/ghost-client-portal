import { ClipboardList } from "lucide-react";
import { EmptyWorkspace, PageHero } from "@/components/workspace-ui";
import { requireOrganizationMembership } from "@/lib/auth/guards";

export default async function RequestsPage() {
  const { organization } = await requireOrganizationMembership();

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Request desk"
        title={`Open requests for ${organization.name}`}
        body="Service requests, support follow-ups, project asks, and client-side decisions will appear here when they are attached to the workspace."
        metrics={[
          { label: "Open", value: "0", detail: "Active requests" },
          { label: "Blocked", value: "0", detail: "Waiting on input" },
          { label: "Routing", value: "Ghost", detail: "Workspace team" },
        ]}
      />
      <EmptyWorkspace
        icon={ClipboardList}
        title="No requests are currently open"
        body="Requests will give clients a direct place to track asks without losing context in email or chat threads."
        steps={[
          "A request is opened",
          "Ghost routes the owner",
          "Status and follow-up stay visible",
        ]}
      />
    </section>
  );
}
