import type {
  Organization,
  Payment,
  PaymentScheduleItem,
  Prisma,
  Project,
  Proposal,
  ProposalAcceptance,
} from "@prisma/client";

export type ProposalPaymentContext = Proposal & {
  organization: Organization & { contacts: { email: string; isPrimary: boolean }[] };
  acceptances: ProposalAcceptance[];
  paymentSchedule: PaymentScheduleItem[];
  payments: Payment[];
  projects: Project[];
};

export type PaymentEligibility =
  | {
      eligible: true;
      proposal: ProposalPaymentContext;
      acceptance: ProposalAcceptance;
      depositItem: PaymentScheduleItem;
      existingPayment?: Payment;
    }
  | { eligible: false; reason: string; correlationId: string };

export type CheckoutMetadata = {
  organizationId: string;
  proposalId: string;
  proposalNumber: string;
  proposalAcceptanceId: string;
  paymentScheduleItemId: string;
  internalPaymentId: string;
  paymentType: string;
  projectId?: string;
  environment: string;
  requestId: string;
};

export type TransactionLike = Prisma.TransactionClient;
