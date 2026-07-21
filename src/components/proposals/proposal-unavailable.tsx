export function ProposalUnavailable({
  title = "Proposal unavailable",
  correlationId,
}: {
  title?: string;
  correlationId?: string;
}) {
  return (
    <main className="surface grid min-h-screen place-items-center px-6 py-12">
      <section className="max-w-lg rounded-lg border border-line bg-panel p-6 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">
          Ghost AI Solutions
        </p>
        <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          This proposal link cannot be opened. Contact Ghost AI Solutions if you
          believe this is a mistake.
        </p>
        {correlationId ? (
          <p className="mt-5 font-mono text-xs text-muted">
            Support code: {correlationId}
          </p>
        ) : null}
      </section>
    </main>
  );
}
