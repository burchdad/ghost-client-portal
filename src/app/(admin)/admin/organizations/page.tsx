import Link from "next/link";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { humanizeEnum } from "@/lib/format";

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
          <Link
            key={organization.id}
            href={`/admin/organizations/${organization.id}`}
            className="block rounded-lg border border-line bg-panel p-5 transition hover:border-accent hover:bg-white/[0.035]"
          >
            <h2 className="text-xl font-semibold">{organization.name}</h2>
            <p className="text-sm text-muted">
              {humanizeEnum(organization.accountStatus)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
