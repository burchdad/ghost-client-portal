import { PrismaClient } from "@prisma/client";
import { loadProductionEnv, redactUrl } from "./production-env.mjs";

loadProductionEnv();

const canonicalTitleByRole = {
  FOUNDER: "Founder",
  ADMINISTRATOR: "Administrator",
  ACCOUNT_MANAGER: "Account Manager",
  PROJECT_MANAGER: "Project Manager",
  BILLING_MANAGER: "Billing Manager",
  SUPPORT_AGENT: "Support Agent",
};

const canonicalRoleByTitle = Object.fromEntries(
  Object.entries(canonicalTitleByRole).map(([role, title]) => [
    title.toLowerCase(),
    role,
  ]),
);

const apply = process.env.APPLY_INTERNAL_USER_ROLE_SYNC === "YES";
const prisma = new PrismaClient({ log: [] });

async function main() {
  const users = await prisma.user.findMany({
    where: {
      internalRole: { not: null },
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      title: true,
      internalRole: true,
    },
    orderBy: { email: "asc" },
  });

  const changes = users
    .map((user) => {
      const titleRole = user.title
        ? canonicalRoleByTitle[user.title.trim().toLowerCase()]
        : null;
      const nextRole = titleRole ?? user.internalRole;
      const nextTitle = canonicalTitleByRole[nextRole];

      if (nextRole === user.internalRole && nextTitle === user.title) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        previous: {
          title: user.title,
          internalRole: user.internalRole,
        },
        next: {
          title: nextTitle,
          internalRole: nextRole,
        },
      };
    })
    .filter(Boolean);

  if (apply) {
    for (const change of changes) {
      await prisma.user.update({
        where: { id: change.id },
        data: change.next,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? "APPLIED" : "DRY_RUN",
        databaseTarget: redactUrl(process.env.DATABASE_URL),
        scannedInternalUsers: users.length,
        changedUsers: changes.length,
        changes,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Internal user role sync failed.",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
