const placeholderTerms = [
  "client@example.com",
  "example.com",
  "primary contact",
  "gray matters primary contact",
  "test user",
  "demo user",
  "placeholder",
  "sample",
  "seed",
  "localhost",
];

export type PlaceholderFinding = {
  field: string;
  valueLabel: string;
  reason: string;
};

export function detectPlaceholderValue(
  field: string,
  value: string | null | undefined,
): PlaceholderFinding | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  const matched = placeholderTerms.find(
    (term) => normalized === term || normalized.includes(term),
  );

  if (!matched) {
    return null;
  }

  return {
    field,
    valueLabel: redactForDisplay(value),
    reason: `Known placeholder marker: ${matched}`,
  };
}

export function detectPlaceholders(
  values: Record<string, string | null | undefined>,
) {
  return Object.entries(values)
    .map(([field, value]) => detectPlaceholderValue(field, value))
    .filter((finding): finding is PlaceholderFinding => Boolean(finding));
}

export function assertNoExternalPlaceholderData(
  context: string,
  values: Record<string, string | null | undefined>,
) {
  const findings = detectPlaceholders(values);
  if (findings.length) {
    throw new Error(
      `${context} blocked because placeholder client data is still present.`,
    );
  }
}

export function isDevelopmentTokenHint(hint: string | null | undefined) {
  if (!hint) {
    return false;
  }

  const normalized = hint.toLowerCase();
  return (
    normalized.includes("seed") ||
    normalized.includes("token") ||
    normalized === "ed-token"
  );
}

function redactForDisplay(value: string) {
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }

  return value;
}
