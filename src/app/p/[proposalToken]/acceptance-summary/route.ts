import { NextResponse } from "next/server";
import { getAcceptanceForToken } from "@/server/proposals/repository";
import { buildAcceptanceSummaryPdf } from "@/server/proposals/summary";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ proposalToken: string }> },
) {
  const { proposalToken } = await params;
  const result = await getAcceptanceForToken(proposalToken).catch(() => null);

  if (!result) {
    return new NextResponse("Acceptance summary unavailable.", { status: 404 });
  }

  const pdf = await buildAcceptanceSummaryPdf(result.acceptance);

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${result.proposal.proposalNumber}-acceptance-summary.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
