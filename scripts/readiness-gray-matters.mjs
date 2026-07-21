import { PrismaClient } from "@prisma/client";
import { loadProductionEnv, safeId } from "./production-env.mjs";

loadProductionEnv();

const prisma = new PrismaClient({ log: [] });

function hasPlaceholder(value) {
  return (
    typeof value === "string" &&
    /client@example\.com|example\.com|primary contact|placeholder|sample|seed|localhost/i.test(
      value,
    )
  );
}

async function columns(table) {
  const rows = await prisma.$queryRawUnsafe(
    "select column_name from information_schema.columns where table_schema='public' and table_name=$1",
    table,
  );
  return new Set(rows.map((row) => row.column_name));
}

async function tableExists(table) {
  const rows = await prisma.$queryRawUnsafe(
    "select exists (select 1 from information_schema.tables where table_schema='public' and table_name=$1) as exists",
    table,
  );
  return Boolean(rows[0]?.exists);
}

function selectList(fields, cols) {
  return fields.filter((field) => cols.has(field)).map((field) => `"${field}"`);
}

async function main() {
  const [
    orgCols,
    contactCols,
    proposalCols,
    acceptanceCols,
    paymentCols,
    scheduleCols,
  ] = await Promise.all([
    columns("Organization"),
    columns("Contact"),
    columns("Proposal"),
    columns("ProposalAcceptance"),
    columns("Payment"),
    columns("PaymentScheduleItem"),
  ]);
  const launchReviewExists = await tableExists("LaunchReview");
  const migrationConfirmationExists = await tableExists(
    "MigrationConfirmation",
  );
  const orgFields = selectList(["id", "name", "createdAt"], orgCols);
  const organizations = await prisma.$queryRawUnsafe(
    `select ${orgFields.join(", ")} from "Organization" where name ilike '%Gray Matters%' order by "createdAt" desc limit 1`,
  );
  const organization = organizations[0];

  if (!organization) {
    throw new Error("Gray Matters organization was not found.");
  }

  const contactFields = selectList(
    ["id", "name", "email", "title", "isPrimary"],
    contactCols,
  );
  const contacts = await prisma.$queryRawUnsafe(
    `select ${contactFields.join(", ")} from "Contact" where "organizationId"=$1 order by ${contactCols.has("isPrimary") ? '"isPrimary" desc,' : ""} "createdAt" asc`,
    organization.id,
  );
  const proposalFields = selectList(
    [
      "id",
      "title",
      "proposalNumber",
      "status",
      "isPublic",
      "publicTokenHint",
      "viewedAt",
      "acceptedAt",
      "signedAt",
      "paidAt",
      "totalCents",
      "currency",
      "createdAt",
    ],
    proposalCols,
  );
  const proposals = await prisma.$queryRawUnsafe(
    `select ${proposalFields.join(", ")} from "Proposal" where "organizationId"=$1 order by "createdAt" desc limit 1`,
    organization.id,
  );
  const proposal = proposals[0] ?? null;
  const acceptances =
    proposal && acceptanceCols.size
      ? await prisma.$queryRawUnsafe(
          `select ${selectList(["id", "signerName", "signerTitle", "signerEmail", "acceptedAt", "invalidatedAt"], acceptanceCols).join(", ")} from "ProposalAcceptance" where "proposalId"=$1 order by "acceptedAt" desc`,
          proposal.id,
        )
      : [];
  const payments =
    proposal && paymentCols.size
      ? await prisma.$queryRawUnsafe(
          `select ${selectList(["id", "status", "amountCents", "currency", "stripeCheckoutId", "stripePaymentIntentId", "checkoutDisposition"], paymentCols).join(", ")} from "Payment" where "proposalId"=$1 order by "createdAt" desc`,
          proposal.id,
        )
      : [];
  const schedule =
    proposal && scheduleCols.size
      ? await prisma.$queryRawUnsafe(
          `select ${selectList(["id", "label", "paymentType", "amountCents", "currency", "status"], scheduleCols).join(", ")} from "PaymentScheduleItem" where "proposalId"=$1 order by "sortOrder" asc`,
          proposal.id,
        )
      : [];
  const launchReviews = launchReviewExists
    ? await prisma.$queryRawUnsafe(
        'select "finalStatus", "createdAt" from "LaunchReview" where "organizationId"=$1 order by "createdAt" desc limit 1',
        organization.id,
      )
    : [];
  const migrationConfirmations = migrationConfirmationExists
    ? await prisma.$queryRawUnsafe(
        'select result, "createdAt" from "MigrationConfirmation" where environment=$1 order by "createdAt" desc limit 1',
        "production",
      )
    : [];
  const primary =
    contacts.find((contact) => contact.isPrimary) ?? contacts[0] ?? null;
  const activeAcceptance = acceptances.find(
    (acceptance) => !acceptance.invalidatedAt,
  );
  const deposit = schedule.find((item) => item.paymentType === "DEPOSIT");
  const finalPayment = schedule.find(
    (item) => item.paymentType === "REMAINING_BALANCE",
  );
  const placeholders = [
    ["primaryContactName", primary?.name],
    ["primaryContactEmail", primary?.email],
    ["primaryContactTitle", primary?.title],
    ["acceptanceSigner", activeAcceptance?.signerName],
    ["acceptanceEmail", activeAcceptance?.signerEmail],
  ].filter(([, value]) => hasPlaceholder(value));
  const blockers = [
    !orgCols.has("primaryContactId") && "Phase 4 migration is pending",
    !launchReviewExists && "Phase 4.6 migration is pending",
    !migrationConfirmations.length &&
      "Production backup/migration confirmation has not been recorded",
    !proposal && "Proposal missing",
    placeholders.length &&
      `Placeholder fields remain: ${placeholders.map(([field]) => field).join(", ")}`,
    proposal?.acceptedAt &&
      !proposal.viewedAt &&
      activeAcceptance &&
      "Active acceptance has no viewed timestamp",
    proposal?.publicTokenHint === "ed-token" && "Seed token hint remains",
    proposal?.totalCents !== 150000 && "Total does not equal $1,500",
    deposit?.amountCents !== 75000 && "Deposit does not equal $750",
    finalPayment?.amountCents !== 75000 && "Final payment does not equal $750",
    payments.some(
      (payment) => payment.stripeCheckoutId && !payment.checkoutDisposition,
    ) && "Existing Checkout Session has no internal disposition",
    launchReviews[0]?.finalStatus !== "GO" && "Final launch review is not GO",
  ].filter(Boolean);

  console.log(
    JSON.stringify(
      {
        mode: "READ_ONLY",
        organization: { id: safeId(organization.id), name: organization.name },
        proposal: proposal
          ? {
              id: safeId(proposal.id),
              title: proposal.title,
              status: proposal.status,
              totalCents: proposal.totalCents,
              tokenHint: proposal.publicTokenHint ?? null,
              acceptedAt: proposal.acceptedAt ?? null,
              viewedAt: proposal.viewedAt ?? null,
            }
          : null,
        latestPayment: payments[0]
          ? {
              id: safeId(payments[0].id),
              status: payments[0].status,
              checkoutDisposition: payments[0].checkoutDisposition ?? null,
              stripeCheckoutId: safeId(payments[0].stripeCheckoutId),
            }
          : null,
        latestLaunchReview: launchReviews[0]?.finalStatus ?? null,
        finalStatus: blockers.length ? "NO-GO" : "GO",
        blockers,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Gray Matters readiness failed.",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
