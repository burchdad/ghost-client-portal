import { requireOrganizationMembership } from "@/lib/auth/guards";

export default async function MessagesPage() {
  const { organization } = await requireOrganizationMembership();

  return (
    <section className="space-y-6">
      <div className="panel-surface rounded-lg border border-line p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">
          Messages
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          Workspace messages for {organization.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Project conversations and client-visible Ghost updates will collect
          here as threads are opened.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-line bg-panel p-6 text-sm text-muted">
        No message threads are open right now.
      </div>
    </section>
  );
}
