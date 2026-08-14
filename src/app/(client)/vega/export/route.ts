import { NextResponse } from "next/server";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { deduplicateVegaLeads } from "@/server/vega/service";

export async function GET() {
  const { organization } = await requireClientWorkspace();
  const leads = deduplicateVegaLeads(
    await getDb().vegaLead.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
    }),
  );
  const rows = [
    [
      "Company",
      "Contact",
      "Title",
      "Email",
      "Phone",
      "Website",
      "Segment",
      "Status",
      "Intent score",
      "Source",
      "Next step",
    ],
    ...leads.map((lead) => [
      lead.company,
      lead.contactName ?? "",
      lead.title ?? "",
      lead.email ?? "",
      lead.phone ?? "",
      lead.website ?? "",
      lead.segment,
      lead.status,
      String(lead.intentScore),
      lead.source,
      lead.nextStep ?? "",
    ]),
  ];
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${organization.slug}-vega-leads.csv"`,
    },
  });
}
