import { PrismaClient } from "@prisma/client";
import { hashPassword, sha256 } from "../src/lib/crypto";

const prisma = new PrismaClient();

const proposalTemplates = [
  "Website Design",
  "Website Subscription",
  "Logo Rebrand",
  "Brand Identity",
  "SEO/AEO/GEO",
  "Marketing Retainer",
  "Custom AI System",
  "Mobile Application",
  "Fractional CTO",
  "Fractional CAIO",
  "Automation Implementation",
  "Consulting",
  "Maintenance Agreement",
];

const logoQuestions = [
  ["existing_logo_files", "Existing logo files", "file", true],
  ["existing_brand_colors", "Existing brand colors", "textarea", false],
  ["preferred_colors", "Preferred colors", "textarea", false],
  ["colors_to_avoid", "Colors to avoid", "textarea", false],
  ["current_fonts", "Current fonts", "textarea", false],
  ["target_audience", "Target audience", "textarea", true],
  ["primary_services", "Primary services", "textarea", true],
  ["brand_personality", "Brand personality", "textarea", true],
  ["competitors", "Competitors", "textarea", false],
  ["logos_they_like", "Logos they like", "textarea", false],
  ["logos_they_dislike", "Logos they dislike", "textarea", false],
  ["symbols_to_include", "Symbols or imagery to include", "textarea", false],
  ["symbols_to_avoid", "Symbols or imagery to avoid", "textarea", false],
  ["required_wording", "Required wording", "text", true],
  ["industry_positioning", "Industry positioning", "textarea", false],
  ["enterprise_requirements", "Government or enterprise requirements", "textarea", false],
  ["decision_makers", "Final decision-makers", "textarea", true],
  ["additional_notes", "Additional notes", "textarea", false],
] as const;

async function main() {
  const founderEmail = requiredEnv("FOUNDER_SEED_EMAIL").toLowerCase();
  const founderPassword = requiredEnv("FOUNDER_SEED_PASSWORD");
  const adminEmail = requiredEnv("ADMIN_SEED_EMAIL").toLowerCase();
  const adminPassword = requiredEnv("ADMIN_SEED_PASSWORD");
  const clientEmail = process.env.GRAY_MATTERS_CLIENT_SEED_EMAIL?.toLowerCase() ?? "client@example.com";
  const clientPassword = requiredEnv("GRAY_MATTERS_CLIENT_SEED_PASSWORD");

  const founder = await prisma.user.upsert({
    where: { email: founderEmail },
    update: {},
    create: {
      email: founderEmail,
      name: "Ghost Founder",
      title: "Founder",
      internalRole: "FOUNDER",
      passwordHash: await hashPassword(founderPassword),
    },
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Portal Administrator",
      title: "Administrator",
      internalRole: "ADMINISTRATOR",
      passwordHash: await hashPassword(adminPassword),
    },
  });

  const client = await prisma.user.upsert({
    where: { email: clientEmail },
    update: {},
    create: {
      email: clientEmail,
      name: "Gray Matters Primary Contact",
      title: "Primary Contact",
      passwordHash: await hashPassword(clientPassword),
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: "gray-matters-technology" },
    update: {},
    create: {
      name: "Gray Matters Technology",
      slug: "gray-matters-technology",
      accountStatus: "ACTIVE",
    },
  });

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: client.id, organizationId: organization.id } },
    update: { role: "OWNER" },
    create: { userId: client.id, organizationId: organization.id, role: "OWNER" },
  });

  const contact = await prisma.contact.upsert({
    where: { id: "gray-matters-primary-contact" },
    update: {},
    create: {
      id: "gray-matters-primary-contact",
      organizationId: organization.id,
      userId: client.id,
      name: client.name,
      email: client.email,
      title: client.title,
      isPrimary: true,
    },
  });

  for (const templateName of proposalTemplates) {
    const isLogoRebrand = templateName === "Logo Rebrand";
    await prisma.proposalTemplate.upsert({
      where: { name: templateName },
      update: isLogoRebrand
        ? {
            titlePattern: "Logo Rebrand and Brand Identity Refresh",
            defaultSummary:
              "A premium logo rebrand and compact brand identity refresh for a modern technology organization.",
            defaultObjectives:
              "Create a polished identity system that feels trustworthy, technology-forward, and ready for digital and print use.",
            defaultScope:
              "Discovery, concept direction, logo refinement, production exports, color palette, typography recommendations, and mini brand guide.",
            defaultExclusions:
              "Full website redesign, naming, trademark search, paid font licensing, and extended campaign collateral are excluded unless added by change order.",
            defaultTimeline: "Estimated two to three week delivery after onboarding materials are complete.",
            defaultDeliverables: logoDeliverables,
            defaultPaymentSchedule: [
              { label: "Deposit", paymentType: "DEPOSIT", amountCents: 75000 },
              { label: "Final payment", paymentType: "REMAINING_BALANCE", amountCents: 75000 },
            ],
          }
        : {},
      create: {
        name: templateName,
        serviceCategory: templateName,
        description:
          isLogoRebrand
            ? "A premium logo rebrand and mini brand identity refresh."
            : `Reusable ${templateName} proposal template shell.`,
        titlePattern: isLogoRebrand ? "Logo Rebrand and Brand Identity Refresh" : null,
        defaultSummary: isLogoRebrand
          ? "A premium logo rebrand and compact brand identity refresh for a modern technology organization."
          : null,
        defaultObjectives: isLogoRebrand
          ? "Create a polished identity system that feels trustworthy, technology-forward, and ready for digital and print use."
          : null,
        defaultScope: isLogoRebrand
          ? "Discovery, concept direction, logo refinement, production exports, color palette, typography recommendations, and mini brand guide."
          : null,
        defaultExclusions: isLogoRebrand
          ? "Full website redesign, naming, trademark search, paid font licensing, and extended campaign collateral are excluded unless added by change order."
          : null,
        defaultTimeline: isLogoRebrand
          ? "Estimated two to three week delivery after onboarding materials are complete."
          : null,
        defaultDeliverables: isLogoRebrand ? logoDeliverables : undefined,
        defaultPaymentSchedule: isLogoRebrand
          ? [
              { label: "Deposit", paymentType: "DEPOSIT", amountCents: 75000 },
              { label: "Final payment", paymentType: "REMAINING_BALANCE", amountCents: 75000 },
            ]
          : undefined,
        defaultTerms:
          "Client-facing terms are reviewed and approved before sending. Internal notes remain outside the portal.",
      },
    });
  }

  const logoTemplate = await prisma.proposalTemplate.findUniqueOrThrow({
    where: { name: "Logo Rebrand" },
  });
  const publicToken = "gray-matters-logo-rebrand-seed-token";
  const proposal = await prisma.proposal.upsert({
    where: { proposalNumber: "GCP-2026-0001" },
    update: {
      publicTokenHash: sha256(publicToken),
      publicTokenHint: publicToken.slice(-8),
      tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      isPublic: true,
      sentAt: new Date(),
      status: "SENT",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      version: 1,
      versionLabel: "v1",
    },
    create: {
      organizationId: organization.id,
      primaryContactId: contact.id,
      templateId: logoTemplate.id,
      internalOwnerId: founder.id,
      title: "Logo Rebrand and Brand Identity Refresh",
      proposalNumber: "GCP-2026-0001",
      publicTokenHash: sha256(publicToken),
      publicTokenHint: publicToken.slice(-8),
      tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      isPublic: true,
      sentAt: new Date(),
      executiveSummary:
        "Ghost AI Solutions will refresh the Gray Matters Technology visual identity with a versatile logo system and concise brand guide.",
      objectives:
        "Create a polished identity system that feels trustworthy, technology-forward, and ready for digital and print use.",
      scopeOfWork:
        "Discovery, concept direction, logo refinement, production exports, color palette, typography recommendations, and mini brand guide.",
      exclusions:
        "Full website redesign, naming, trademark search, paid font licensing, and extended campaign collateral are excluded unless added by change order.",
      timeline: "Estimated two to three week delivery after onboarding materials are complete.",
      pricingSummary: "Total investment is $1,500 with a $750 deposit and $750 final payment due upon completion and approval.",
      terms: "Client approval and payment milestones are required before activation and final asset delivery.",
      totalCents: 150000,
      status: "SENT",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      version: 1,
      versionLabel: "v1",
    },
  });

  await prisma.proposalDeliverable.deleteMany({ where: { proposalId: proposal.id } });
  await prisma.proposalDeliverable.createMany({
    data: logoDeliverables.map((name, index) => ({
      proposalId: proposal.id,
      name,
      sortOrder: index + 1,
    })),
  });

  await prisma.paymentScheduleItem.deleteMany({ where: { proposalId: proposal.id } });
  await prisma.paymentScheduleItem.createMany({
    data: [
      {
        organizationId: organization.id,
        proposalId: proposal.id,
        label: "Deposit",
        description: "Deposit due after proposal acceptance.",
        paymentType: "DEPOSIT",
        amountCents: 75000,
        currency: "usd",
        sortOrder: 1,
      },
      {
        organizationId: organization.id,
        proposalId: proposal.id,
        label: "Final payment",
        description: "Final payment due upon completion and approval.",
        paymentType: "REMAINING_BALANCE",
        amountCents: 75000,
        currency: "usd",
        sortOrder: 2,
      },
    ],
  });

  await prisma.proposalSection.deleteMany({ where: { proposalId: proposal.id } });
  await prisma.proposalSection.createMany({
    data: [
      { proposalId: proposal.id, title: "Executive Summary", body: proposal.executiveSummary, sortOrder: 1 },
      { proposalId: proposal.id, title: "Objectives", body: proposal.objectives, sortOrder: 2 },
      { proposalId: proposal.id, title: "Scope of Work", body: proposal.scopeOfWork, sortOrder: 3 },
      { proposalId: proposal.id, title: "Timeline", body: proposal.timeline, sortOrder: 4 },
      { proposalId: proposal.id, title: "Terms", body: proposal.terms, sortOrder: 5 },
    ],
  });

  const project = await prisma.project.upsert({
    where: { id: "gray-matters-logo-rebrand-project" },
    update: {},
    create: {
      id: "gray-matters-logo-rebrand-project",
      organizationId: organization.id,
      proposalId: proposal.id,
      projectOwnerId: founder.id,
      name: "Logo Rebrand and Brand Identity Refresh",
      serviceCategory: "Logo Rebrand",
      currentPhase: "Onboarding",
      status: "ONBOARDING",
      progress: 12,
      contractValueCents: 150000,
      amountPaidCents: 0,
      remainingBalanceCents: 150000,
      clientVisibleSummary:
        "A focused brand identity refresh with logo system, export package, and mini brand guide.",
      portalVisible: true,
    },
  });

  await prisma.milestone.deleteMany({ where: { projectId: project.id } });
  await prisma.milestone.createMany({
    data: [
      { projectId: project.id, name: "Onboarding questionnaire", status: "Waiting on Client" },
      { projectId: project.id, name: "Concept direction", status: "Planned" },
      { projectId: project.id, name: "Logo refinement", status: "Planned" },
      { projectId: project.id, name: "Final asset package", status: "Planned" },
    ],
  });

  const onboardingTemplate = await prisma.onboardingTemplate.upsert({
    where: { name: "Logo Rebrand Onboarding" },
    update: {},
    create: {
      name: "Logo Rebrand Onboarding",
      serviceCategory: "Logo Rebrand",
      instructions: "Provide the materials and preferences Ghost needs to begin the logo refresh.",
    },
  });

  await prisma.onboardingQuestion.deleteMany({ where: { templateId: onboardingTemplate.id } });
  await prisma.onboardingQuestion.createMany({
    data: logoQuestions.map(([fieldKey, prompt, fieldType, required], index) => ({
      templateId: onboardingTemplate.id,
      fieldKey,
      prompt,
      fieldType,
      required,
      sortOrder: index + 1,
    })),
  });

  await prisma.onboardingForm.upsert({
    where: { id: "gray-matters-logo-onboarding" },
    update: {},
    create: {
      id: "gray-matters-logo-onboarding",
      organizationId: organization.id,
      projectId: project.id,
      templateId: onboardingTemplate.id,
      completionPercentage: 0,
    },
  });

  await prisma.notification.create({
    data: {
      organizationId: organization.id,
      userId: client.id,
      type: "onboarding.required",
      title: "Complete brand questionnaire",
      body: "Ghost needs your brand details and source files to begin the logo rebrand.",
      linkTarget: "/projects/gray-matters-logo-rebrand-project",
    },
  });

  await prisma.activityEvent.create({
    data: {
      organizationId: organization.id,
      projectId: project.id,
      type: "project.activated",
      title: "Logo rebrand workspace prepared",
      body: "The client-visible project workspace is ready for onboarding.",
    },
  });

  console.log(`Seeded Gray Matters proposal URL: /p/${publicToken}`);
}

const logoDeliverables = [
  "Primary logo",
  "Secondary logo",
  "Horizontal logo",
  "Stacked logo",
  "Icon mark",
  "Black logo version",
  "White logo version",
  "SVG files",
  "PNG files",
  "PDF files",
  "Color palette",
  "Typography recommendations",
  "Mini brand guide",
  "Social profile versions",
  "Favicon",
];

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for seeding credentials.`);
  }

  return value;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
