"use server";

import { redirect } from "next/navigation";
import { acceptProposal } from "@/server/proposals/acceptance";
import { parseAcceptanceForm } from "@/server/proposals/validation";
import {
  assertSameOriginSubmission,
  getSafeRequestMetadata,
} from "@/server/security/request";
import { checkRateLimit } from "@/server/security/rate-limit";

export type AcceptProposalState = {
  error: string | null;
  fieldErrors: Record<string, string>;
};

export async function acceptProposalAction(
  _previousState: AcceptProposalState,
  formData: FormData,
): Promise<AcceptProposalState> {
  try {
    await assertSameOriginSubmission();
  } catch {
    return {
      error: "This submission could not be verified. Refresh and try again.",
      fieldErrors: {},
    };
  }

  const parsed = parseAcceptanceForm(formData);

  if (!parsed.success) {
    return {
      error: null,
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      ),
    };
  }

  const metadata = await getSafeRequestMetadata();
  const rateLimit = checkRateLimit(
    `accept:${metadata.ipAddress ?? "unknown"}:${parsed.data.token.slice(-6)}`,
    {
      limit: 10,
      windowMs: 60_000,
    },
  );

  if (!rateLimit.allowed) {
    return {
      error: "Too many attempts. Please wait a moment and try again.",
      fieldErrors: {},
    };
  }

  const result = await acceptProposal(parsed.data, metadata);

  if (result.status === "accepted" || result.status === "duplicate") {
    redirect(`/p/${parsed.data.token}/success`);
  }

  return {
    error: `Proposal acceptance failed. Support code: ${result.correlationId}`,
    fieldErrors: {},
  };
}
