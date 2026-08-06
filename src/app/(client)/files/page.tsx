import { FolderOpen } from "lucide-react";
import { EmptyWorkspace, PageHero } from "@/components/workspace-ui";
import { requireOrganizationMembership } from "@/lib/auth/guards";

export default async function FilesPage() {
  const { organization } = await requireOrganizationMembership();

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="File library"
        title={`Secure files for ${organization.name}`}
        body="Shared references, proposal assets, exports, deliverables, and client-visible uploads will collect in this workspace library."
        metrics={[
          { label: "Files", value: "0", detail: "Published assets" },
          { label: "Visibility", value: "Client", detail: "Scoped library" },
          { label: "Delivery", value: "Ready", detail: "When assets publish" },
        ]}
      />
      <EmptyWorkspace
        icon={FolderOpen}
        title="No files have been published yet"
        body="When Ghost shares research, documents, summaries, exports, or final deliverables, they will appear here with client-safe access."
        steps={[
          "Ghost publishes a client-visible file",
          "The asset appears in this library",
          "Project and proposal files stay organized",
        ]}
      />
    </section>
  );
}
