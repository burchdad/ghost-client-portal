export type AppEnvironment =
  "local" | "development" | "preview" | "staging" | "production" | "test";
export type StripeMode = "live" | "test" | "unknown";

const placeholderSecrets = new Set([
  "replace-with-at-least-32-random-characters",
  "sk_test_placeholder",
  "sk_live_placeholder",
  "whsec_placeholder",
  "pk_test_placeholder",
  "pk_live_placeholder",
  "placeholder",
]);

export function getAppEnvironment(): AppEnvironment {
  const explicit = process.env.APP_ENV?.toLowerCase();
  if (isAppEnvironment(explicit)) {
    return explicit;
  }

  if (process.env.VERCEL_ENV === "production") {
    return "production";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return "preview";
  }

  if (process.env.NODE_ENV === "test") {
    return "test";
  }

  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  return "development";
}

export function isProductionLike(environment = getAppEnvironment()) {
  return environment === "production";
}

export function isSafeFixtureEnvironment(environment = getAppEnvironment()) {
  return (
    environment === "local" ||
    environment === "development" ||
    environment === "test"
  );
}

export function getStripeModeFromSecretKey(
  secretKey: string | undefined | null,
): StripeMode {
  if (!secretKey) {
    return "unknown";
  }

  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }

  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }

  return "unknown";
}

export function validateStripeEnvironment(input: {
  secretKey?: string | null;
  publishableKey?: string | null;
  webhookSecret?: string | null;
  environment?: AppEnvironment;
}) {
  const environment = input.environment ?? getAppEnvironment();
  const secretMode = getStripeModeFromSecretKey(input.secretKey);
  const publishableMode = getStripePublishableMode(input.publishableKey);

  if (!input.secretKey) {
    return {
      ok: true as const,
      environment,
      stripeMode: "unknown" as StripeMode,
    };
  }

  if (secretMode === "unknown") {
    throw new Error("Stripe secret key must be a recognized test or live key.");
  }

  if (publishableMode !== "unknown" && publishableMode !== secretMode) {
    throw new Error(
      "Stripe publishable key mode must match the Stripe secret key mode.",
    );
  }

  const allowProductionTest =
    process.env.ALLOW_STRIPE_TEST_IN_PRODUCTION === "true";
  if (
    environment === "production" &&
    secretMode === "test" &&
    !allowProductionTest
  ) {
    throw new Error(
      "Production cannot use Stripe test keys without ALLOW_STRIPE_TEST_IN_PRODUCTION=true.",
    );
  }

  if (environment !== "production" && secretMode === "live") {
    throw new Error("Non-production environments cannot use Stripe live keys.");
  }

  return { ok: true as const, environment, stripeMode: secretMode };
}

export function validateRuntimeEnvironment(input: {
  environment?: AppEnvironment;
  appUrl?: string | null;
  databaseUrl?: string | null;
  authSecret?: string | null;
  stripeSecretKey?: string | null;
  stripePublishableKey?: string | null;
  stripeWebhookSecret?: string | null;
  emailFrom?: string | null;
  requireProductionSecrets?: boolean;
}) {
  const environment = input.environment ?? getAppEnvironment();
  const findings: {
    status: "READY" | "WARNING" | "BLOCKED";
    message: string;
  }[] = [];
  const appUrl = input.appUrl ?? process.env.NEXT_PUBLIC_APP_URL;

  try {
    validateStripeEnvironment({
      environment,
      secretKey: input.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY,
      publishableKey:
        input.stripePublishableKey ??
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      webhookSecret:
        input.stripeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET,
    });
    findings.push({
      status: "READY",
      message: "Stripe key mode matches the application environment.",
    });
  } catch (error) {
    findings.push({
      status: "BLOCKED",
      message:
        error instanceof Error
          ? error.message
          : "Stripe environment is invalid.",
    });
  }

  if (!appUrl) {
    findings.push({
      status: "BLOCKED",
      message: "NEXT_PUBLIC_APP_URL is required.",
    });
  } else if (environment === "production" && isLocalUrl(appUrl)) {
    findings.push({
      status: "BLOCKED",
      message: "Production cannot use a localhost application URL.",
    });
  } else {
    findings.push({
      status: "READY",
      message: "Application URL is configured.",
    });
  }

  const productionRequired =
    environment === "production" || input.requireProductionSecrets;
  if (productionRequired) {
    const required = [
      ["DATABASE_URL", input.databaseUrl ?? process.env.DATABASE_URL],
      ["AUTH_SECRET", input.authSecret ?? process.env.AUTH_SECRET],
      [
        "STRIPE_SECRET_KEY",
        input.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY,
      ],
      [
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        input.stripePublishableKey ??
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      ],
      [
        "STRIPE_WEBHOOK_SECRET",
        input.stripeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET,
      ],
      ["EMAIL_FROM", input.emailFrom ?? process.env.EMAIL_FROM],
    ] as const;

    for (const [name, value] of required) {
      if (!value) {
        findings.push({
          status: "BLOCKED",
          message: `${name} is required in production.`,
        });
      } else if (isPlaceholderSecret(value)) {
        findings.push({
          status: "BLOCKED",
          message: `${name} is set to a known placeholder value.`,
        });
      }
    }
  }

  return {
    environment,
    status: findings.some((finding) => finding.status === "BLOCKED")
      ? ("BLOCKED" as const)
      : findings.some((finding) => finding.status === "WARNING")
        ? ("WARNING" as const)
        : ("READY" as const),
    findings,
  };
}

export function assertStripeLivemodeMatchesEnvironment(
  livemode: boolean,
  environment = getAppEnvironment(),
) {
  const expectedLive = environment === "production";
  const allowProductionTest =
    process.env.ALLOW_STRIPE_TEST_IN_PRODUCTION === "true";

  if (environment === "production" && !livemode && allowProductionTest) {
    return;
  }

  if (livemode !== expectedLive) {
    throw new Error(
      "Stripe event livemode does not match the configured application environment.",
    );
  }
}

function getStripePublishableMode(key: string | undefined | null): StripeMode {
  if (!key) {
    return "unknown";
  }

  if (key.startsWith("pk_live_")) {
    return "live";
  }

  if (key.startsWith("pk_test_")) {
    return "test";
  }

  return "unknown";
}

function isAppEnvironment(value: string | undefined): value is AppEnvironment {
  return (
    value === "local" ||
    value === "development" ||
    value === "preview" ||
    value === "staging" ||
    value === "production" ||
    value === "test"
  );
}

function isLocalUrl(value: string) {
  return (
    value.includes("localhost") ||
    value.includes("127.0.0.1") ||
    value.includes("::1")
  );
}

function isPlaceholderSecret(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    placeholderSecrets.has(normalized) || normalized.includes("placeholder")
  );
}
