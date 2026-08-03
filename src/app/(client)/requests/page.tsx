import { requireOrganizationMembership } from "@/lib/auth/guards";

export default async function RequestsPage() {
  const { organization } = await requireOrganizationMembership();

  return (
    <section className="space-y-6">
      <div className="panel-surface rounded-lg border border-line p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">
          Requests
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          Open requests for {organization.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Service requests, support follow-ups, and client-side asks will appear
          here when they are attached to the workspace.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-line bg-panel p-6 text-sm text-muted">
        No requests are currently open.
      </div>
    </section>
  );
}
