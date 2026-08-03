export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel-surface rounded-lg border border-dashed border-line p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">
        Workspace
      </p>
      <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{body}</p>
      <div className="mt-5 grid gap-3 text-sm text-muted sm:grid-cols-3">
        <p className="rounded-md border border-line bg-black/10 p-3">
          Status: queued
        </p>
        <p className="rounded-md border border-line bg-black/10 p-3">
          Access: secured
        </p>
        <p className="rounded-md border border-line bg-black/10 p-3">
          Owner: Ghost AI
        </p>
      </div>
    </div>
  );
}
