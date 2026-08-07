import type { Organization } from "@prisma/client";

const DEFAULT_GEO_BASE_URL = "https://geo.ghostai.solutions";

const defaultClientIdByOrganization: Record<string, string> = {
  "design-haven-build": "client-mrs5c8j2-770849",
  "ghost-ai-solutions": "client-mplijcy9-461cad",
};

export type GeoCommandConnectionStatus =
  | "connected"
  | "unconfigured"
  | "unmapped"
  | "unavailable";

export type GeoApprovalItem = {
  id: string;
  title: string;
  clientId: string | null;
  clientName: string;
  provider: string;
  approvalType: string;
  status: string;
  statusLabel: string;
  riskLevel: string;
  operationLabel: string;
  liveMutationEnabled: boolean;
  requiresClientApproval: boolean;
  requiresOperatorApproval: boolean;
  oneByOneRequired: boolean;
  target?: {
    locationName?: string | null;
    locationTitle?: string | null;
    mapsUri?: string | null;
  };
  summary: string;
  proposedPayload: Record<string, unknown>;
  findings: { id: string; severity: string; title: string }[];
  requiredApprovals: string[];
  nextStep: string;
  boundary: string;
};

export type GeoApprovalCenter = {
  success: boolean;
  clientSafe: boolean;
  status: string;
  approvals: GeoApprovalItem[];
  clientQueue: GeoApprovalItem[];
  operatorQueue: GeoApprovalItem[];
  completed: GeoApprovalItem[];
  summary: {
    total: number;
    clientPending: number;
    operatorPending: number;
    batchEligible: number;
    oneByOneRequired: number;
    gbpWriteRequests: number;
    approved: number;
    rejected: number;
  };
  boundary: string;
};

export type GeoApprovalSync =
  | {
      status: "connected";
      baseUrl: string;
      clientId: string;
      center: GeoApprovalCenter;
    }
  | {
      status: Exclude<GeoCommandConnectionStatus, "connected">;
      baseUrl: string;
      clientId: string | null;
      message: string;
    };

export function getGeoCommandBaseUrl() {
  return normalizeBaseUrl(process.env.GEO_COMMAND_BASE_URL) || DEFAULT_GEO_BASE_URL;
}

export function getGeoCommandToken() {
  return (
    process.env.GEO_COMMAND_API_TOKEN ||
    process.env.GEO_ADMIN_TOKEN ||
    process.env.ADMIN_API_TOKEN ||
    process.env.OPERATOR_API_TOKEN ||
    ""
  ).trim();
}

export function resolveGeoClientId(
  organization: Pick<Organization, "id" | "slug" | "name">,
) {
  const envMap = parseClientIdMap(process.env.GEO_CLIENT_ID_MAP);
  return (
    envMap[organization.id] ||
    envMap[organization.slug] ||
    envMap[organization.name] ||
    defaultClientIdByOrganization[organization.slug] ||
    null
  );
}

export async function getGeoApprovalSync(
  organization: Pick<Organization, "id" | "slug" | "name">,
): Promise<GeoApprovalSync> {
  const baseUrl = getGeoCommandBaseUrl();
  const token = getGeoCommandToken();
  const clientId = resolveGeoClientId(organization);

  if (!token) {
    return {
      status: "unconfigured",
      baseUrl,
      clientId,
      message:
        "The monthly portal needs a server-side GEO_COMMAND_API_TOKEN, GEO_ADMIN_TOKEN, ADMIN_API_TOKEN, or OPERATOR_API_TOKEN before it can sync G.E.O. approvals.",
    };
  }

  if (!clientId) {
    return {
      status: "unmapped",
      baseUrl,
      clientId,
      message:
        "This organization is not mapped to a G.E.O. client yet. Add it to GEO_CLIENT_ID_MAP to enable live approval sync.",
    };
  }

  try {
    const center = await fetchGeoApprovalCenter({ baseUrl, token, clientId });
    return { status: "connected", baseUrl, clientId, center };
  } catch (error) {
    return {
      status: "unavailable",
      baseUrl,
      clientId,
      message:
        error instanceof Error
          ? error.message
          : "G.E.O. approval sync is temporarily unavailable.",
    };
  }
}

export async function fetchGeoApprovalCenter(input: {
  baseUrl?: string;
  token?: string;
  clientId: string;
}) {
  const baseUrl = input.baseUrl ?? getGeoCommandBaseUrl();
  const token = input.token ?? getGeoCommandToken();
  const url = new URL("/api/approval-center", baseUrl);
  url.searchParams.set("clientId", input.clientId);
  url.searchParams.set("clientSafe", "true");

  const response = await geoFetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`G.E.O. approval sync failed with HTTP ${response.status}.`);
  }

  return (await response.json()) as GeoApprovalCenter;
}

export async function submitGeoApprovalDecision(input: {
  organization: Pick<Organization, "id" | "slug" | "name">;
  approvalId: string;
  decisionAction: "client_approve" | "client_request_changes" | "client_reject";
  note?: string;
  actorEmail: string;
  actorName: string;
}) {
  const baseUrl = getGeoCommandBaseUrl();
  const token = getGeoCommandToken();
  const clientId = resolveGeoClientId(input.organization);

  if (!token) {
    throw new Error("G.E.O. server token is not configured for the client portal.");
  }

  if (!clientId) {
    throw new Error("This portal organization is not mapped to a G.E.O. client.");
  }

  const url = new URL("/api/approval-center", baseUrl);
  const response = await geoFetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      approvalId: input.approvalId,
      action: input.decisionAction,
      note: input.note ?? "",
      clientId,
      delegatedClientPortal: true,
      actorEmail: input.actorEmail,
      actorName: input.actorName,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload.error === "string"
        ? payload.error
        : `G.E.O. approval decision failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

export function parseClientIdMap(raw: string | undefined) {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [key.trim(), String(value || "").trim()])
        .filter(([key, value]) => key && value),
    );
  } catch {
    return Object.fromEntries(
      raw
        .split(",")
        .map((entry) => entry.split(":"))
        .map(([key, value]) => [String(key || "").trim(), String(value || "").trim()])
        .filter(([key, value]) => key && value),
    );
  }
}

function normalizeBaseUrl(value: string | undefined) {
  if (!value) return "";
  return value.trim().replace(/\/+$/, "");
}

async function geoFetch(url: URL, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
