import { z } from "zod";

export const acceptanceSchema = z
  .object({
    token: z.string().min(20).max(256),
    idempotencyKey: z.string().min(16).max(128),
    signerName: z
      .string()
      .trim()
      .min(2, "Enter your full legal name.")
      .max(120),
    signerTitle: z.string().trim().min(2, "Enter your job title.").max(120),
    signerEmail: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .max(180),
    typedSignature: z.string().trim().min(2, "Type your signature.").max(120),
    authorizedApproval: z.literal("on", {
      message: "Confirm you are authorized to approve this proposal.",
    }),
    reviewedScope: z.literal("on", {
      message: "Confirm you reviewed the scope.",
    }),
    acceptedPaymentSchedule: z.literal("on", {
      message: "Confirm you accept the payment schedule.",
    }),
    acceptedTerms: z.literal("on", {
      message: "Confirm you accept the terms.",
    }),
    note: z.string().trim().max(1000).optional(),
    purchaseOrderNumber: z.string().trim().max(80).optional(),
  })
  .superRefine((value, context) => {
    if (!signatureReasonablyMatches(value.signerName, value.typedSignature)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["typedSignature"],
        message: "Typed signature should reasonably match the legal name.",
      });
    }
  });

export type AcceptanceInput = z.infer<typeof acceptanceSchema>;

export function parseAcceptanceForm(formData: FormData) {
  return acceptanceSchema.safeParse({
    token: formData.get("token"),
    idempotencyKey: formData.get("idempotencyKey"),
    signerName: formData.get("signerName"),
    signerTitle: formData.get("signerTitle"),
    signerEmail: formData.get("signerEmail"),
    typedSignature: formData.get("typedSignature"),
    authorizedApproval: formData.get("authorizedApproval"),
    reviewedScope: formData.get("reviewedScope"),
    acceptedPaymentSchedule: formData.get("acceptedPaymentSchedule"),
    acceptedTerms: formData.get("acceptedTerms"),
    note: formData.get("note") || undefined,
    purchaseOrderNumber: formData.get("purchaseOrderNumber") || undefined,
  });
}

export function normalizeSignature(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

export function signatureReasonablyMatches(name: string, signature: string) {
  const normalizedName = normalizeSignature(name);
  const normalizedSignature = normalizeSignature(signature);

  if (!normalizedName || !normalizedSignature) {
    return false;
  }

  if (normalizedName === normalizedSignature) {
    return true;
  }

  const nameParts = normalizedName.split(" ").filter(Boolean);
  const signatureParts = normalizedSignature.split(" ").filter(Boolean);

  if (nameParts.length < 2 || signatureParts.length < 2) {
    return false;
  }

  return (
    nameParts[0] === signatureParts[0] &&
    nameParts.at(-1) === signatureParts.at(-1)
  );
}
