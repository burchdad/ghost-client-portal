import { createProposalAction } from "../actions";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export default async function AdminNewProposalPage() {
  await requireInternalRole();
  const [organizations, templates] = await Promise.all([
    getDb().organization.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
    getDb().proposalTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <section className="max-w-3xl rounded-lg border border-line bg-panel p-6">
      <h1 className="text-3xl font-semibold">New proposal</h1>
      <form action={createProposalAction} className="mt-6 space-y-4">
        <label className="block text-sm text-muted">
          Organization
          <select
            name="organizationId"
            required
            className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-muted">
          Template
          <select
            name="templateId"
            required
            className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-muted">
          Title
          <input
            name="title"
            required
            defaultValue="Logo Rebrand and Brand Identity Refresh"
            className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
          />
        </label>
        <label className="block text-sm text-muted">
          Expiration date
          <input
            name="expiresAt"
            type="date"
            className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
          />
        </label>
        <button className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
          Create from template
        </button>
      </form>
    </section>
  );
}
