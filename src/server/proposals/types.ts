import type {
  Organization,
  PaymentScheduleItem,
  Proposal,
  ProposalAcceptance,
  ProposalAddOn,
  ProposalDeliverable,
  ProposalSection,
} from "@prisma/client";

export type ProposalWithPublicRelations = Proposal & {
  organization: Organization;
  sections: ProposalSection[];
  deliverables: ProposalDeliverable[];
  addOns: ProposalAddOn[];
  paymentSchedule: PaymentScheduleItem[];
  acceptances: ProposalAcceptance[];
};

export type ProposalAvailability =
  | { status: "available"; proposal: ProposalWithPublicRelations }
  | { status: "unavailable"; correlationId: string }
  | { status: "expired"; correlationId: string }
  | { status: "accepted"; proposal: ProposalWithPublicRelations };

export type AcceptanceSnapshot = {
  ghostIdentity: "Ghost AI Solutions";
  clientOrganization: string;
  proposalTitle: string;
  proposalNumber: string;
  proposalVersion: number;
  proposalVersionLabel: string;
  executiveSummary: string;
  objectives: string;
  scopeOfWork: string;
  deliverables: string[];
  exclusions: string;
  timeline: string;
  totalCents: number;
  currency: string;
  paymentSchedule: Array<{ label: string; amountCents: number; paymentType: string }>;
  terms: string;
  selectedAddOns: Array<{ name: string; priceCents: number }>;
  signatory: {
    fullName: string;
    title: string;
    email: string;
    typedSignature: string;
    note?: string;
    purchaseOrderNumber?: string;
  };
  acceptedAt: string;
};
