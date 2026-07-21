import { PortalShell } from "@/components/portal-shell";
import { requireOrganizationMembership } from "@/lib/auth/guards";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, organization } = await requireOrganizationMembership();

  return (
    <PortalShell user={user} organizationName={organization.name} mode="client">
      {children}
    </PortalShell>
  );
}
