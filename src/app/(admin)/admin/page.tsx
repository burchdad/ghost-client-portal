import { StatusCard } from "@/components/status-card";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export default async function AdminPage() {
  await requireInternalRole();
  const db = getDb();
  const [organizations, proposals, projects, auditEvents] = await Promise.all([
    db.organization.count(),
    db.proposal.count(),
    db.project.count(),
    db.auditLog.count(),
  ]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-accent">Portal-specific administration</p>
        <h1 className="text-3xl font-semibold">Client-facing records</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard label="Organizations" value={String(organizations)} detail="Portal tenants" />
        <StatusCard label="Proposals" value={String(proposals)} detail="Client-visible proposals" />
        <StatusCard label="Projects" value={String(projects)} detail="Portal-visible projects" />
        <StatusCard label="Audit events" value={String(auditEvents)} detail="Immutable security trail" />
      </div>
    </section>
  );
}
