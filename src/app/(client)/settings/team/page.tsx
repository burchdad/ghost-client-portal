import { UsersRound } from "lucide-react";
import { EmptyWorkspace, PageHero } from "@/components/workspace-ui";
import { requireOrganizationMembership } from "@/lib/auth/guards";

export default async function TeamSettingsPage() {
  const { organization, membership } = await requireOrganizationMembership();

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Team access"
        title={`Client team for ${organization.name}`}
        body="Manage who can view projects, approve proposals, review payments, and receive workspace notifications as team controls come online."
        metrics={[
          {
            label: "Your role",
            value: membership.role,
            detail: "Current access",
          },
          { label: "Invites", value: "Portal", detail: "Activation flow" },
          { label: "Access", value: "Scoped", detail: "Client workspace only" },
        ]}
      />
      <EmptyWorkspace
        icon={UsersRound}
        title="Team management is staged for the next client-admin phase"
        body="The portal currently supports secure invitation activation and organization membership. A dedicated team panel will add role changes, additional invites, and notification routing."
        steps={[
          "Invite links activate members",
          "Roles protect workspace access",
          "Team controls land here",
        ]}
      />
    </section>
  );
}
