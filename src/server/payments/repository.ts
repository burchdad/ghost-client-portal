import type { PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import { isSafeFixtureEnvironment } from "@/server/env";
import { getFixtureProposalByToken } from "@/server/proposals/fixture";
import { hashProposalToken } from "@/server/proposals/tokens";
import type { ProposalPaymentContext } from "./types";

export async function getProposalPaymentContextByToken(
  token: string,
  db: PrismaClient = getDb(),
) {
  return db.proposal.findFirst({
    where: { publicTokenHash: hashProposalToken(token) },
    include: {
      organization: { include: { contacts: true } },
      acceptances: { orderBy: { acceptedAt: "desc" }, take: 1 },
      paymentSchedule: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      projects: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  }) as Promise<ProposalPaymentContext | null>;
}

export async function getProposalPaymentContextByTokenWithFallback(
  token: string,
  db: PrismaClient = getDb(),
) {
  try {
    return await getProposalPaymentContextByToken(token, db);
  } catch (error) {
    console.warn("Payment proposal lookup failed", {
      tokenHint: token.slice(-6),
      message: error instanceof Error ? error.message : "Unknown error",
    });
    if (!isSafeFixtureEnvironment()) {
      return null;
    }

    const fixture = getFixtureProposalByToken(token);
    if (!fixture) {
      return null;
    }

    return {
      ...fixture,
      organization: {
        ...fixture.organization,
        contacts: [{ email: "client@example.com", isPrimary: true }],
      },
      payments: [],
      projects: [],
    } as ProposalPaymentContext;
  }
}

export async function getLatestDepositPaymentForToken(
  token: string,
  db: PrismaClient = getDb(),
) {
  const proposal = await getProposalPaymentContextByToken(token, db);

  if (!proposal) {
    return null;
  }

  const deposit = proposal.paymentSchedule.find(
    (item) => item.paymentType === "DEPOSIT",
  );
  const payment = deposit
    ? proposal.payments.find(
        (item) => item.paymentScheduleItemId === deposit.id,
      )
    : undefined;

  return { proposal, deposit, payment, project: proposal.projects[0] };
}
