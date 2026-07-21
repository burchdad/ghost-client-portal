import type { PrismaClient, Proposal } from "@prisma/client";
import { constantTimeEqual, createOpaqueToken, sha256 } from "@/lib/crypto";

export function generateProposalToken() {
  return createOpaqueToken(32);
}

export function hashProposalToken(token: string) {
  return sha256(token);
}

export function redactProposalToken(token: string) {
  return token.length <= 8 ? "[redacted]" : `[redacted:${token.slice(-6)}]`;
}

export function isTokenExpired(
  proposal: Pick<Proposal, "tokenExpiresAt" | "expiresAt">,
  now = new Date(),
) {
  const expiresAt = proposal.tokenExpiresAt ?? proposal.expiresAt;
  return Boolean(expiresAt && expiresAt <= now);
}

export function isTokenRevoked(proposal: Pick<Proposal, "tokenRevokedAt">) {
  return Boolean(proposal.tokenRevokedAt);
}

export function hashesMatch(token: string, tokenHash: string) {
  return constantTimeEqual(hashProposalToken(token), tokenHash);
}

export async function rotateProposalToken(
  db: PrismaClient,
  proposalId: string,
  expiresAt?: Date,
) {
  const token = generateProposalToken();
  const updated = await db.proposal.update({
    where: { id: proposalId },
    data: {
      publicTokenHash: hashProposalToken(token),
      publicTokenHint: token.slice(-8),
      tokenRevokedAt: null,
      tokenExpiresAt: expiresAt,
    },
  });

  return { token, proposal: updated };
}

export async function revokeProposalToken(
  db: PrismaClient,
  proposalId: string,
) {
  return db.proposal.update({
    where: { id: proposalId },
    data: { tokenRevokedAt: new Date() },
  });
}
