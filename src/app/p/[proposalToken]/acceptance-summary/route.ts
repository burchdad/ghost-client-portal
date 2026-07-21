import { NextResponse } from "next/server";
import { getAcceptanceForToken } from "@/server/proposals/repository";
import { buildAcceptanceSummaryHtml } from "@/server/proposals/summary";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ proposalToken: string }> },
) {
  const { proposalToken } = await params;
  const result = await getAcceptanceForToken(proposalToken).catch(() => null);

  if (!result) {
    return new NextResponse("Acceptance summary unavailable.", { status: 404 });
  }

  return new NextResponse(buildAcceptanceSummaryHtml(result.acceptance), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="${result.proposal.proposalNumber}-acceptance-summary.html"`,
      "cache-control": "private, no-store",
    },
  });
}
