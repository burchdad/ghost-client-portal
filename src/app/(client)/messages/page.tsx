import { MessagesSquare } from "lucide-react";
import { EmptyWorkspace, PageHero } from "@/components/workspace-ui";
import { requireOrganizationMembership } from "@/lib/auth/guards";

export default async function MessagesPage() {
  const { organization } = await requireOrganizationMembership();

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Workspace messages"
        title={`Message threads for ${organization.name}`}
        body="Project conversations, Ghost updates, client questions, and operational notes will collect here as threaded workspace communication expands."
        metrics={[
          { label: "Threads", value: "0", detail: "Open conversations" },
          { label: "Unread", value: "0", detail: "Need response" },
          { label: "Channel", value: "Portal", detail: "Client-safe" },
        ]}
      />
      <EmptyWorkspace
        icon={MessagesSquare}
        title="No message threads are open right now"
        body="When workspace conversations are published, clients will have a focused place to review context, replies, project decisions, and Ghost updates."
        steps={[
          "Ghost opens or publishes a thread",
          "Client replies stay tied to the workspace",
          "Important context remains searchable",
        ]}
      />
    </section>
  );
}
