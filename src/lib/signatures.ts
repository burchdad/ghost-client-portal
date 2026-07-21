import { sha256 } from "@/lib/crypto";

export function createAcceptanceHash(input: {
  proposalId: string;
  signerName: string;
  signerTitle: string;
  typedSignature: string;
  acceptedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return sha256(
    JSON.stringify({
      proposalId: input.proposalId,
      signerName: input.signerName,
      signerTitle: input.signerTitle,
      typedSignature: input.typedSignature,
      acceptedAt: input.acceptedAt.toISOString(),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    }),
  );
}
