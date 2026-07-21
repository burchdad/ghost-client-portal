export function ProposalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line py-8">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-muted md:text-base">
        {children}
      </div>
    </section>
  );
}
