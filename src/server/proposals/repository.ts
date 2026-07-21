import type { PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import { hashProposalToken, isTokenExpired, isTokenRevoked } from "./tokens";
import type {
  ProposalAvailability,
  ProposalWithPublicRelations,
} from "./types";
import { getFixtureProposalByToken } from "./fixture";

const publicProposalInclude = {
  organization: true,
  sections: {
    where: { isVisible: true },
    orderBy: { sortOrder: "asc" as const },
  },
  deliverables: { orderBy: { sortOrder: "asc" as const } },
  addOns: true,
  paymentSchedule: { orderBy: { sortOrder: "asc" as const } },
  acceptances: { orderBy: { acceptedAt: "desc" as const }, take: 1 },
};

export async function findProposalByToken(
  token: string,
  db: PrismaClient = getDb(),
) {
  return db.proposal.findFirst({
    where: { publicTokenHash: hashProposalToken(token) },
    include: publicProposalInclude,
  });
}

export async function getPublicProposalAvailability(
  token: string,
  options: { allowFixtureFallback?: boolean; db?: PrismaClient } = {},
): Promise<ProposalAvailability> {
  const correlationId = crypto.randomUUID();

  try {
    const proposal = await findProposalByToken(token, options.db ?? getDb());
    return availabilityFromProposal(proposal, correlationId);
  } catch (error) {
    console.error("Public proposal lookup failed", {
      correlationId,
      tokenHint: token.slice(-6),
      message: error instanceof Error ? error.message : "Unknown error",
    });

    if (options.allowFixtureFallback) {
      const fixture = getFixtureProposalByToken(token);
      if (fixture) {
        return availabilityFromProposal(fixture, correlationId);
      }
    }

    return { status: "unavailable", correlationId };
  }
}

export function availabilityFromProposal(
  proposal: ProposalWithPublicRelations | null,
  correlationId = crypto.randomUUID(),
): ProposalAvailability {
  if (
    !proposal ||
    proposal.deletedAt ||
    !proposal.isPublic ||
    isTokenRevoked(proposal)
  ) {
    return { status: "unavailable", correlationId };
  }

  if (isTokenExpired(proposal) || proposal.status === "EXPIRED") {
    return { status: "expired", correlationId };
  }

  if (
    proposal.status === "DRAFT" ||
    proposal.status === "DECLINED" ||
    proposal.status === "CANCELLED"
  ) {
    return { status: "unavailable", correlationId };
  }

  if (
    proposal.acceptances.length > 0 ||
    proposal.status === "PAYMENT_PENDING"
  ) {
    return { status: "accepted", proposal };
  }

  return { status: "available", proposal };
}

export async function getAcceptanceForToken(
  token: string,
  db: PrismaClient = getDb(),
) {
  const proposal = await findProposalByToken(token, db);

  if (
    !proposal ||
    !proposal.isPublic ||
    isTokenExpired(proposal) ||
    isTokenRevoked(proposal)
  ) {
    return null;
  }

  return proposal.acceptances[0]
    ? { proposal, acceptance: proposal.acceptances[0] }
    : null;
}
