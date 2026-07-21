import { NextResponse } from "next/server";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  await requireInternalRole(["FOUNDER", "ADMINISTRATOR", "ACCOUNT_MANAGER"]);
  const { organizationId } = await params;
  const review = await getDb().launchReview.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { organization: true, proposal: true },
  });

  if (!review) {
    return NextResponse.json(
      { error: "No launch review has been recorded." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    organization: review.organization.name,
    proposal: review.proposal?.title ?? null,
    finalStatus: review.finalStatus,
    checklist: review.checklist,
    report: review.report,
    operator: review.operatorLabel,
    timestamp: review.createdAt.toISOString(),
  });
}
