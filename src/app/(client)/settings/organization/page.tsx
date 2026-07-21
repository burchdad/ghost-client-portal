import { requireOrganizationMembership } from "@/lib/auth/guards";

export default async function OrganizationSettingsPage() {
  const { organization, membership } = await requireOrganizationMembership();

  return (
    <section className="rounded-lg border border-line bg-panel p-6">
      <h1 className="text-3xl font-semibold">Organization settings</h1>
      <dl className="mt-6 grid gap-4 text-sm md:grid-cols-2">
        <div>
          <dt className="text-muted">Organization</dt>
          <dd className="mt-1 font-medium">{organization.name}</dd>
        </div>
        <div>
          <dt className="text-muted">Your role</dt>
          <dd className="mt-1 font-medium">{membership.role.replaceAll("_", " ").toLowerCase()}</dd>
        </div>
      </dl>
    </section>
  );
}
