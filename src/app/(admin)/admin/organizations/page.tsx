import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export default async function AdminOrganizationsPage() {
  await requireInternalRole();
  const organizations = await getDb().organization.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <section>
      <h1 className="text-3xl font-semibold">Organizations</h1>
      <div className="mt-6 space-y-3">
        {organizations.map((organization) => (
          <div
            key={organization.id}
            className="rounded-lg border border-line bg-panel p-5"
          >
            <h2 className="text-xl font-semibold">{organization.name}</h2>
            <p className="text-sm text-muted">{organization.accountStatus}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
