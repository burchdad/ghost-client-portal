import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { loadProductionEnv, redactUrl } from "./production-env.mjs";

loadProductionEnv();

const targetMigration =
  process.env.PRODUCTION_MIGRATION_NAME ??
  "20260721040000_phase_4_6_launch_execution";
const requiredConfirmations = {
  "20260721040000_phase_4_6_launch_execution":
    "APPLY PHASE 4.6 PRODUCTION MIGRATION",
  "20260721050000_test_client_lifecycle":
    "APPLY TEST CLIENT LIFECYCLE PRODUCTION MIGRATION",
};
const requiredConfirmation = requiredConfirmations[targetMigration];

if (!requiredConfirmation) {
  throw new Error(
    `No production confirmation phrase is configured for ${targetMigration}.`,
  );
}

function requireValue(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

if (process.env.APP_ENV !== "production") {
  throw new Error("APP_ENV=production is required for production migration.");
}

if (process.env.APPLY_PRODUCTION_MIGRATION !== "YES") {
  throw new Error("APPLY_PRODUCTION_MIGRATION=YES is required.");
}

if (process.env.PRODUCTION_MIGRATION_CONFIRMATION !== requiredConfirmation) {
  throw new Error(
    `PRODUCTION_MIGRATION_CONFIRMATION must equal "${requiredConfirmation}".`,
  );
}

const backupReference = requireValue("PRODUCTION_BACKUP_REFERENCE");
const backupTimestamp = requireValue("PRODUCTION_BACKUP_TIMESTAMP");
const operatorLabel = requireValue("PRODUCTION_MIGRATION_OPERATOR");

console.log(
  `Production migration target: ${redactUrl(process.env.DATABASE_URL)}`,
);
console.log(`Migration: ${targetMigration}`);
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const execOptions = {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
};
console.log("Running preflight migrate status...");
runMigrationStatusPreflight(npx);

console.log("Applying Prisma migrations...");
execFileSync(npx, ["prisma", "migrate", "deploy"], execOptions);

console.log("Running post-migration validation...");
execFileSync(npx, ["prisma", "validate"], execOptions);

const prisma = new PrismaClient({ log: [] });
try {
  await prisma.migrationConfirmation.create({
    data: {
      migrationName: targetMigration,
      backupReference,
      backupTimestamp: new Date(backupTimestamp),
      operatorLabel,
      environment: "production",
      confirmationPhraseHash: crypto
        .createHash("sha256")
        .update(process.env.PRODUCTION_MIGRATION_CONFIRMATION)
        .digest("hex"),
      result: "APPLIED",
      notes: process.env.PRODUCTION_MIGRATION_NOTES ?? null,
    },
  });
  console.log("Migration confirmation audit recorded.");
} finally {
  await prisma.$disconnect();
}

function runMigrationStatusPreflight(npxCommand) {
  const statusOptions = {
    env: process.env,
    shell: process.platform === "win32",
    encoding: "utf8",
  };
  try {
    const output = execFileSync(
      npxCommand,
      ["prisma", "migrate", "status"],
      statusOptions,
    );
    console.log(output.trim());
    return;
  } catch (error) {
    const output = [
      error.stdout?.toString?.() ?? "",
      error.stderr?.toString?.() ?? "",
    ].join("\n");
    if (/Following migration(?:s)? have not yet been applied/i.test(output)) {
      console.log(output.trim());
      return;
    }

    throw error;
  }
}
