import type { ProposalDeliverable } from "@prisma/client";

export function DeliverablesList({ deliverables }: { deliverables: ProposalDeliverable[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {deliverables.map((deliverable) => (
        <li key={deliverable.id} className="rounded-md border border-line bg-white/[0.035] p-3 text-foreground">
          {deliverable.name}
        </li>
      ))}
    </ul>
  );
}
