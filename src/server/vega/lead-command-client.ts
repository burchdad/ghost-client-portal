import { leadIdentityTokens, type LeadIdentity } from "./lead-identity";

type LeadCommandProvider =
  "pdl" | "apollo" | "ghost-lead-agent" | "google-maps" | "facebook-business";

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
  confidence?: number | string;
  buyerFit?: string;
  intentSignals?: string[];
  signalSummary?: string;
};

type LeadCommandSearchResponse = {
  provider?: LeadCommandProvider;
  dryRun?: boolean;
  total?: number;
  scrollToken?: string | null;
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
  report?: {
    requested: number;
    batches: number;
    duplicates: number;
    missingPhone: number;
    skipped: Record<string, number>;
    errors: string[];
    stopReason: string;
    enrichment?: {
      provider: "apollo";
      attempted: number;
      matched: number;
      noMatch: number;
      errors: string[];
    };
  };
};

export class LeadCommandAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadCommandAuthError";
  }
}

export async function searchLeadCommandLeads(
  prompt: string,
  options: {
    count?: number;
    callReady?: boolean;
    workspaceSlug?: string;
    existing?: LeadIdentity[];
    includeExisting?: boolean;
    multiSource?: boolean;
  } = {},
): Promise<LeadCommandSearchResult> {
  const provider = inferLeadCommandProvider(prompt);
  const size = Math.min(
    100,
    Math.max(1, Math.floor(options.count || inferRequestedLeadCount(prompt))),
  );
  const location = inferLeadLocation(prompt);
  if (
    options.callReady &&
    location === "United States" &&
    !/united states|nationwide|\busa\b|\bu\.s\./i.test(prompt)
  ) {
    throw new Error(
      "Specify the city, state, or territory for this calling list.",
    );
  }
  const query = inferLeadCommandQuery(prompt);
  const providers = options.multiSource
    ? Array.from(new Set<LeadCommandProvider>([provider, "apollo", "pdl"]))
    : [provider];
  const seen = new Set(
    (options.includeExisting ? [] : options.existing || []).flatMap(
      leadIdentityTokens,
    ),
  );
  const leads: PortalVegaLeadInput[] = [];
  const contributingSources = new Set<LeadCommandProvider>();
  const sourceNotes: string[] = [];
  const report: NonNullable<LeadCommandSearchResult["report"]> = {
    requested: size,
    batches: 0,
    duplicates: 0,
    missingPhone: 0,
    skipped: {} as Record<string, number>,
    errors: [] as string[],
    stopReason: "sources-exhausted",
  };
  const deadline = Date.now() + 210_000;
  for (const source of providers) {
    let scrollToken: string | undefined;
    const cursors = new Set<string>();
    do {
      if (report.batches >= 12 || Date.now() >= deadline) {
        report.stopReason = "request-budget-reached";
        break;
      }
      report.batches++;
      let response: LeadCommandSearchResponse;
      try {
        response = await fetchLeadCommandSearch({
          provider: source,
          query,
          location,
          size,
          scrollToken,
          mode: options.callReady ? "call-ready" : undefined,
          workspaceSlug: options.workspaceSlug,
        });
      } catch (error) {
        if (error instanceof LeadCommandAuthError) throw error;
        report.errors.push(
          `${source}: ${error instanceof Error ? error.message : "Source unavailable"}`,
        );
        break;
      }
      if (response.dryRun) {
        report.errors.push(
          `${source}: Live source is not configured; sample data was rejected.`,
        );
        break;
      }
      for (const [reason, count] of Object.entries(
        response.diagnostics?.skipped || {},
      ))
        report.skipped[reason] = (report.skipped[reason] || 0) + count;
      for (const raw of [
        ...(response.leads || []),
        ...(response.reviewLeads || []),
      ]) {
        const lead = mapLeadCommandLead(raw, source, prompt);
        if (!lead) continue;
        if (
          options.callReady &&
          !/^\d{10,15}$/.test((lead.phone || "").replace(/\D/g, ""))
        ) {
          report.missingPhone++;
          continue;
        }
        const tokens = leadIdentityTokens(lead);
        if (tokens.some((token) => seen.has(token))) {
          report.duplicates++;
          continue;
        }
        tokens.forEach((token) => seen.add(token));
        leads.push(lead);
        contributingSources.add(source);
        if (leads.length >= size) break;
      }
      if (
        response.message &&
        !(response.leads?.length || response.reviewLeads?.length)
      ) {
        const details = `${source}: ${response.message}`;
        if (
          /not configured|returned [45]\d{2}|failed|error|quota|exceeded|unauthorized/i.test(
            response.message,
          )
        )
          report.errors.push(details);
        else sourceNotes.push(details);
      }
      const next = response.scrollToken;
      if (!next || cursors.has(next)) break;
      cursors.add(next);
      scrollToken = next;
    } while (leads.length < size);
    if (leads.length >= size || report.stopReason === "request-budget-reached")
      break;
  }
  const apolloAlreadyFailed = report.errors.some((error) =>
    error.startsWith("apollo:"),
  );
  if (options.multiSource && leads.length && !apolloAlreadyFailed) {
    const enrichment = await enrichCompanyLeadsWithApollo({
      leads,
      prompt,
      location,
    });
    if (enrichment.matched) contributingSources.add("apollo");
    if (enrichment.errors.length) report.errors.push(...enrichment.errors);
    report.enrichment = enrichment;
  }
  if (leads.length >= size) report.stopReason = "target-reached";
  else if (
    report.errors.length &&
    report.stopReason !== "request-budget-reached"
  )
    report.stopReason = "source-limited";
  const skippedSummary = Object.entries({
    ...report.skipped,
    "missing-usable-phone":
      (report.skipped["missing-usable-phone"] || 0) + report.missingPhone,
  })
    .filter(([, count]) => count > 0)
    .map(([reason, count]) => `${count} ${reason.replaceAll("-", " ")}`)
    .join(", ");
  const enrichmentSummary = report.enrichment
    ? ` Apollo enrichment matched ${report.enrichment.matched}/${report.enrichment.attempted} company leads${report.enrichment.noMatch ? `; ${report.enrichment.noMatch} had no confident person match` : ""}.`
    : "";
  const message = `Requested ${size}, returned ${leads.length}. ${report.duplicates} duplicates excluded.${skippedSummary ? ` Excluded: ${skippedSummary}.` : ""} ${report.stopReason.replaceAll("-", " ")}.${enrichmentSummary}${report.errors.length ? ` ${report.errors.join(" ")}` : ""}${sourceNotes.length ? ` ${sourceNotes.join(" ")}` : ""}`;

  return {
    provider,
    source: `lead_command:${contributingSources.size ? [...contributingSources].join("+") : provider}`,
    message,
    leads,
    report,
  };
}

async function enrichCompanyLeadsWithApollo(input: {
  leads: PortalVegaLeadInput[];
  prompt: string;
  location: string;
}) {
  const targets = input.leads
    .filter(
      (lead) =>
        !lead.email ||
        !lead.contactName ||
        lead.title === "Decision-maker not identified",
    )
    .slice(0, 20);
  const enrichment = {
    provider: "apollo" as const,
    attempted: targets.length,
    matched: 0,
    noMatch: 0,
    errors: [] as string[],
  };

  for (const lead of targets) {
    let response: LeadCommandSearchResponse;
    try {
      response = await fetchLeadCommandSearch({
        provider: "apollo",
        query: buildApolloEnrichmentQuery(lead, input.prompt),
        location: input.location,
        size: 3,
      });
    } catch (error) {
      enrichment.errors.push(
        `apollo-enrichment: ${error instanceof Error ? error.message : "Apollo enrichment unavailable"}`,
      );
      continue;
    }

    if (response.dryRun) {
      enrichment.errors.push(
        "apollo-enrichment: Live Apollo source is not configured; sample data was rejected.",
      );
      continue;
    }

    const rawCandidates = [
      ...(response.leads || []),
      ...(response.reviewLeads || []),
    ];
    const match = rawCandidates.find((candidate) =>
      isApolloCompanyMatch(candidate, lead),
    );
    if (!match) {
      enrichment.noMatch++;
      continue;
    }

    const enriched = mapLeadCommandLead(match, "apollo", input.prompt);
    if (!enriched) {
      enrichment.noMatch++;
      continue;
    }

    mergeApolloEnrichment(lead, enriched);
    enrichment.matched++;
  }

  return enrichment;
}

function buildApolloEnrichmentQuery(
  lead: PortalVegaLeadInput,
  prompt: string,
) {
  const domain = extractHostname(lead.website);
  return [
    "owner founder president CEO operations manager decision maker",
    `at ${lead.company}`,
    domain ? `domain ${domain}` : null,
    `for this Vega request: ${prompt}`,
  ]
    .filter(Boolean)
    .join(" ");
}

function isApolloCompanyMatch(
  candidate: LeadCommandLead,
  lead: PortalVegaLeadInput,
) {
  const candidateCompany = candidate.companyName || candidate.name;
  if (candidateCompany && companiesLookRelated(candidateCompany, lead.company))
    return true;

  const leadHost = extractHostname(lead.website);
  const candidateHost = extractHostname(candidate.website);
  return Boolean(leadHost && candidateHost && leadHost === candidateHost);
}

function companiesLookRelated(left: string, right: string) {
  const leftKey = normalizeCompanyForMatch(left);
  const rightKey = normalizeCompanyForMatch(right);
  if (!leftKey || !rightKey) return false;
  if (leftKey === rightKey) return true;
  const leftWords = new Set(leftKey.split(" ").filter((word) => word.length > 2));
  const rightWords = rightKey.split(" ").filter((word) => word.length > 2);
  if (!leftWords.size || !rightWords.length) return false;
  const shared = rightWords.filter((word) => leftWords.has(word)).length;
  return shared >= Math.min(2, rightWords.length);
}

function normalizeCompanyForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(?:llc|inc|co|company|corp|corporation|limited|the|air|a\/c|ac|hvac)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function extractHostname(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function mergeApolloEnrichment(
  lead: PortalVegaLeadInput,
  enrichment: PortalVegaLeadInput,
) {
  const originalSource = lead.source;
  lead.contactName = lead.contactName || enrichment.contactName;
  lead.title =
    !lead.title || lead.title === "Decision-maker not identified"
      ? enrichment.title
      : lead.title;
  lead.email = lead.email || enrichment.email;
  lead.phone = lead.phone || enrichment.phone;
  lead.website = lead.website || enrichment.website;
  lead.intentScore = Math.max(lead.intentScore, enrichment.intentScore);
  lead.source = originalSource.includes("apollo")
    ? originalSource
    : `${originalSource}+apollo-enriched`;
  lead.status = lead.email ? "READY_FOR_OUTREACH" : lead.status;
  lead.notes = [lead.notes, enrichment.notes ? `Apollo enrichment:\n${enrichment.notes}` : null]
    .filter(Boolean)
    .join("\n\n");
  lead.nextStep = lead.email
    ? "Review Apollo-enriched contact data and draft first-touch outreach."
    : lead.nextStep;
}

async function fetchLeadCommandSearch(input: {
  provider: LeadCommandProvider;
  query: string;
  location: string;
  size: number;
  scrollToken?: string;
  mode?: "call-ready";
  workspaceSlug?: string;
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
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new LeadCommandAuthError(
        "Lead Command rejected the portal request. Set a valid LEAD_COMMAND_ACCESS_KEY in Vercel production that matches the Lead Command source API.",
      );
    }

    throw new Error(
      `Lead Command search failed (${response.status}): ${body.slice(0, 220)}`,
    );
  }

  return (await response.json()) as LeadCommandSearchResponse;
}

export function inferLeadCommandProvider(prompt: string): LeadCommandProvider {
  const normalized = prompt.toLowerCase();
  if (/\bapollo\b/.test(normalized)) return "apollo";
  if (/\bpdl\b|people data labs/.test(normalized)) return "pdl";

  if (
    normalized.includes("facebook") ||
    normalized.includes("fb page") ||
    normalized.includes("meta business")
  ) {
    return "facebook-business";
  }

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
  const match =
    prompt.match(
      /\b(?:need|pull|find|get|source)\s+(\d{1,3})\s+(?!miles?\b|km\b)/i,
    ) ||
    prompt.match(
      /\b(\d{1,3})\s+(?:leads?|prospects?|results?|businesses|companies|contacts?)\b/i,
    );
  const parsed = match ? Number(match[1]) : 50;

  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(parsed, 100));
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
  const website = lead.website?.trim() || null;
  const score = Math.round(lead.score ?? 0);
  const source = lead.source
    ? `lead_command:${provider}:${lead.source}`
    : `lead_command:${provider}`;
  const notes = [
    lead.signalSummary,
    lead.buyerFit ? `Buyer fit: ${lead.buyerFit}` : null,
    lead.sourceUrl ? `Source profile: ${lead.sourceUrl}` : null,
    website ? `Company website: ${website}` : null,
    phone
      ? `Business phone: ${phone}; direct decision-maker number not verified.`
      : null,
    lead.location ? `Business location: ${lead.location}` : null,
    email ? `Source email (verify before sending): ${email}` : null,
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
    contactName:
      lead.name && lead.name !== company && !/^Team at /i.test(lead.name)
        ? lead.name
        : null,
    title:
      lead.title === "Owner or Growth Operator"
        ? "Decision-maker not identified"
        : (lead.title ?? null),
    email,
    phone,
    website,
    segment: lead.niche ?? "Qualified prospects",
    status: email
      ? "READY_FOR_OUTREACH"
      : phone || website
        ? "QUALIFIED"
        : "NEW",
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

function cleanLocation(value: string) {
  return value
    .replace(
      /\b(?:surrounding cities|within \d+\s*mile range|score \d+)\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .replace(/,+/g, ",")
    .trim()
    .replace(/,$/, "");
}
