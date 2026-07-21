import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  await requireInternalRole();
  const organization = await getDb().organization.findUnique({
    where: { id: (await params).organizationId },
  });

  return (
    <section className="rounded-lg border border-line bg-panel p-6">
      <h1 className="text-3xl font-semibold">{organization?.name ?? "Organization not found"}</h1>
      <p className="mt-3 text-sm text-muted">Portal-specific tenant administration shell.</p>
    </section>
  );
}
