import { NextResponse } from "next/server";
import { requireClientWorkspace } from "@/lib/auth/guards";
import {
  getGeoApprovalSync,
  submitGeoApprovalDecision,
} from "@/server/geo-command/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { organization } = await requireClientWorkspace();
    const sync = await getGeoApprovalSync(organization);
    return NextResponse.json({ success: true, sync });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, organization } = await requireClientWorkspace();
    const body = await request.json().catch(() => ({}));
    const decisionAction = String(body.decisionAction || "");
    if (
      decisionAction !== "client_approve" &&
      decisionAction !== "client_request_changes" &&
      decisionAction !== "client_reject"
    ) {
      return NextResponse.json(
        { error: "Choose a valid approval action." },
        { status: 400 },
      );
    }

    const result = await submitGeoApprovalDecision({
      organization,
      approvalId: String(body.approvalId || ""),
      decisionAction,
      note: String(body.note || ""),
      actorEmail: user.email,
      actorName: user.name,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "G.E.O. approval center request failed.";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
