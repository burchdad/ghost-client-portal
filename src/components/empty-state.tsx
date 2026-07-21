export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-panel p-6">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}
