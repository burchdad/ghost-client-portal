import { PortalShell } from "@/components/portal-shell";
import { requireClientWorkspace } from "@/lib/auth/guards";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, organization } = await requireClientWorkspace();

  return (
    <PortalShell user={user} organizationName={organization.name} mode="client">
      {children}
    </PortalShell>
  );
}
