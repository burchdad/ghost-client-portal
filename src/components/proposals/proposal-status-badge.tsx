import { humanizeEnum } from "@/lib/format";

export function ProposalStatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-accent">
      {humanizeEnum(status)}
    </span>
  );
}
