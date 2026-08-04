type LeadCommandProvider = "pdl" | "apollo" | "ghost-lead-agent" | "google-maps";

export type PortalVegaLeadInput = {
  company: string;
  contactName: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  segment: string;
  status: string;
  intentScore: number;
  source: string;
  notes: string | null;
  nextStep: string | null;
};

type LeadCommandLead = {
  id?: string;
  name?: string;
  companyName?: string;
  title?: string;
  email?: string;
  phone?: string;
  niche?: string;
  location?: string;
  source?: string;
  website?: string;
  sourceUrl?: string;
  score?: number;
  confidence?: number;
  buyerFit?: string;
  intentSignals?: string[];
  signalSummary?: string;
};

type LeadCommandSearchResponse = {
  provider?: LeadCommandProvider;
  dryRun?: boolean;
  total?: number;
  message?: string;
  leads?: LeadCommandLead[];
  reviewLeads?: LeadCommandLead[];
  diagnostics?: {
    skipped?: Record<string, number>;
    errors?: string[];
  };
};

export type LeadCommandSearchResult = {
  provider: LeadCommandProvider;
  source: string;
  message: string;
  leads: PortalVegaLeadInput[];
};

export async function searchLeadCommandLeads(
  prompt: string,
): Promise<LeadCommandSearchResult> {
  const provider = inferLeadCommandProvider(prompt);
  const size = inferRequestedLeadCount(prompt);
  const location = inferLeadLocation(prompt);
  const query = inferLeadCommandQuery(prompt);
  const response = await fetchLeadCommandSearch({
    provider,
    query,
    location,
    size,
  });
  const rawLeads = [
    ...(response.leads ?? []),
    ...(response.reviewLeads ?? []),
  ].slice(0, size);
  const leads = rawLeads
    .map((lead) => mapLeadCommandLead(lead, provider, prompt))
    .filter((lead): lead is PortalVegaLeadInput => Boolean(lead));
  const diagnosticSummary = summarizeDiagnostics(response);
  const message =
    response.message ??
    diagnosticSummary ??
    `Lead Command returned ${leads.length} ${provider} records.`;

  return {
    provider,
    source: `lead_command:${provider}`,
    message,
    leads,
  };
}

async function fetchLeadCommandSearch(input: {
  provider: LeadCommandProvider;
  query: string;
  location: string;
  size: number;
}) {
  const baseUrl =
    process.env.LEAD_COMMAND_BASE_URL ?? "https://leadgen.ghostai.solutions";
  const url = new URL("/api/source/search", baseUrl);
  const secret =
    process.env.LEAD_COMMAND_ACCESS_KEY ??
    process.env.LEAD_INTAKE_SECRET ??
    process.env.CRON_SECRET;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Lead Command search failed (${response.status}): ${body.slice(0, 220)}`,
    );
  }

  return (await response.json()) as LeadCommandSearchResponse;
}

export function inferLeadCommandProvider(prompt: string): LeadCommandProvider {
  const normalized = prompt.toLowerCase();
  const localSignals = [
    "near",
    "around",
    "within",
    "tyler",
    "dallas",
    "texas",
    "hvac",
    "roof",
    "window cleaning",
    "exterior cleaning",
    "detailing",
    "commercial cleaning",
    "contractor",
    "restaurant",
    "dealership",
    "office building",
  ];

  if (localSignals.some((signal) => normalized.includes(signal))) {
    return "google-maps";
  }

  if (
    normalized.includes("apollo") ||
    normalized.includes("founder") ||
    normalized.includes("ceo") ||
    normalized.includes("decision maker") ||
    normalized.includes("sales manager")
  ) {
    return "apollo";
  }

  return "pdl";
}

export function inferRequestedLeadCount(prompt: string) {
  const match = prompt.match(/\b(?:need|pull|find|get|source)?\s*(\d{1,3})\b/i);
  const parsed = match ? Number(match[1]) : 10;

  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(parsed, 50));
}

export function inferLeadLocation(prompt: string) {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  const patterns = [
    /\b(?:near|around|in)\s+([^.;]+?)(?:\s+(?:and|within|score|for)\b|[.;]|$)/i,
    /\bbetween\s+([^.;]+?)(?:\s+score\b|[.;]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return cleanLocation(match[1]);
    }
  }

  if (/tyler/i.test(prompt)) return "Tyler, Texas";
  if (/dallas/i.test(prompt)) return "Dallas, Texas";
  if (/texas/i.test(prompt)) return "Texas";
  return "United States";
}

export function inferLeadCommandQuery(prompt: string) {
  const normalized = prompt.toLowerCase();

  if (
    normalized.includes("window cleaning") ||
    normalized.includes("exterior cleaning")
  ) {
    return [
      "commercial property managers",
      "storefronts",
      "medical offices",
      "banks",
      "restaurants",
      "dealerships",
      "gyms",
      "office buildings",
      "churches",
      "apartment complexes",
    ].join(", ");
  }

  if (normalized.includes("hvac")) {
    return "local HVAC companies owners operators office managers";
  }

  if (normalized.includes("roof")) {
    return "local roofing companies owners operators office managers";
  }

  if (normalized.includes("detailing")) {
    return "dealerships fleets property managers commercial vehicle operators";
  }

  return prompt;
}

function mapLeadCommandLead(
  lead: LeadCommandLead,
  provider: LeadCommandProvider,
  prompt: string,
): PortalVegaLeadInput | null {
  const company = lead.companyName ?? lead.name;
  if (!company) return null;

  const email = lead.email?.trim() || null;
  const phone = lead.phone?.trim() || null;
  const website = lead.website ?? lead.sourceUrl ?? null;
  const score = Math.round(lead.score ?? 0);
  const source = lead.source
    ? `lead_command:${provider}:${lead.source}`
    : `lead_command:${provider}`;
  const notes = [
    lead.signalSummary,
    lead.buyerFit ? `Buyer fit: ${lead.buyerFit}` : null,
    typeof lead.confidence === "number"
      ? `Source confidence: ${lead.confidence}`
      : null,
    lead.intentSignals?.length
      ? `Signals: ${lead.intentSignals.join("; ")}`
      : null,
    `Original Vega request: ${prompt}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    company,
    contactName: lead.name && lead.name !== company ? lead.name : null,
    title: lead.title ?? null,
    email,
    phone,
    website,
    segment: lead.niche ?? "Qualified prospects",
    status: email ? "READY_FOR_OUTREACH" : phone || website ? "QUALIFIED" : "NEW",
    intentScore: score,
    source,
    notes,
    nextStep: email
      ? "Review and draft first-touch outreach from Lead Command source data."
      : phone
        ? "Create phone-assist task; email needs enrichment."
        : website
          ? "Research owner or verified email from company website."
          : "Enrich contact path before outreach.",
  };
}

function summarizeDiagnostics(response: LeadCommandSearchResponse) {
  const skipped = response.diagnostics?.skipped;
  const errors = response.diagnostics?.errors;
  const skippedSummary = skipped
    ? Object.entries(skipped)
        .filter(([, count]) => count > 0)
        .map(([reason, count]) => `${reason} ${count}`)
        .join(", ")
    : "";
  const errorSummary = errors?.length ? `errors: ${errors.join("; ")}` : "";

  return [skippedSummary, errorSummary].filter(Boolean).join(" | ");
}

function cleanLocation(value: string) {
  return value
    .replace(/\b(?:surrounding cities|within \d+\s*mile range|score \d+)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/,+/g, ",")
    .trim()
    .replace(/,$/, "");
}
