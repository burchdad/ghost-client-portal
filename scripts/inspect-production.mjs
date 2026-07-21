import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { loadProductionEnv, redactUrl } from "./production-env.mjs";

loadProductionEnv();

const prisma = new PrismaClient({ log: [] });

async function tableExists(table) {
  const rows = await prisma.$queryRawUnsafe(
    "select exists (select 1 from information_schema.tables where table_schema='public' and table_name=$1) as exists",
    table,
  );
  return Boolean(rows[0]?.exists);
}

async function main() {
  const localMigrations = fs
    .readdirSync(path.join(process.cwd(), "prisma", "migrations"))
    .filter((name) => /^\d+_/.test(name));
  const deployed = await prisma.$queryRawUnsafe(
    'select migration_name, finished_at, rolled_back_at, checksum is not null as has_checksum, logs from "_prisma_migrations" order by started_at',
  );
  const deployedNames = new Set(
    deployed.map((migration) => migration.migration_name),
  );
  const pending = localMigrations.filter((name) => !deployedNames.has(name));
  const failed = deployed.filter(
    (migration) => !migration.finished_at && !migration.rolled_back_at,
  );
  const backupTableExists = await tableExists("MigrationConfirmation");
  const backupConfirmations = backupTableExists
    ? await prisma.$queryRawUnsafe(
        'select "migrationName", "backupReference", "backupTimestamp", "operatorLabel", result, "createdAt" from "MigrationConfirmation" order by "createdAt" desc limit 5',
      )
    : [];
  const commit =
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    safeGitCommit();

  console.log(
    JSON.stringify(
      {
        mode: "READ_ONLY",
        databaseTarget: redactUrl(process.env.DATABASE_URL),
        appEnv: process.env.APP_ENV ?? null,
        buildCommit: commit,
        deployedMigrations: deployed.map((migration) => ({
          name: migration.migration_name,
          finished: Boolean(migration.finished_at),
          rolledBack: Boolean(migration.rolled_back_at),
          hasChecksum: Boolean(migration.has_checksum),
        })),
        pendingMigrations: pending,
        failedMigrationCount: failed.length,
        checksumStatus: deployed.every((migration) => migration.has_checksum)
          ? "RECORDED"
          : "MISSING_CHECKSUM",
        schemaDrift:
          "Run `npx prisma migrate status` with DATABASE_URL to inspect drift before deploy.",
        backupConfirmationRecorded: backupConfirmations.length > 0,
        backupConfirmations,
      },
      null,
      2,
    ),
  );
}

function safeGitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Production inspection failed.",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
