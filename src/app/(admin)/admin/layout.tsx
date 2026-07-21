import { PortalShell } from "@/components/portal-shell";
import { requireInternalRole } from "@/lib/auth/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireInternalRole();

  return (
    <PortalShell user={user} mode="admin">
      {children}
    </PortalShell>
  );
}
