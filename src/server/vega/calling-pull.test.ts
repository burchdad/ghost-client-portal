import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), search: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("./lead-command-client", async (original) => ({
  ...(await original<typeof import("./lead-command-client")>()),
  searchLeadCommandLeads: mocks.search,
}));
import { createVegaLeadQuery } from "./service";

const lead = {
  company: "Example HVAC",
  email: null,
  phone: "9035550100",
  website: null,
  contactName: null,
  title: null,
  status: "QUALIFIED",
  segment: "HVAC",
  intentScore: 70,
  source: "google-maps",
  notes: null,
  nextStep: "Call business",
};

describe("tenant-scoped calling pull persistence", () => {
  let db: ReturnType<typeof makeDb>;
  function makeDb() {
    const client = {
      organization: {
        findUniqueOrThrow: vi.fn(async () => ({ slug: "client-a" })),
      },
      vegaLead: {
        findMany: vi.fn(
          async (query: { where: { organizationId: string } }) => {
            expect(query.where.organizationId).toBe("org-a");
            return [] as (typeof lead & { id: string })[];
          },
        ),
        create: vi.fn(async ({ data }) => ({ ...data, id: "lead-new" })),
      },
      vegaLeadQuery: {
        create: vi.fn(async ({ data }) => ({ ...data, id: "query-new" })),
      },
      vegaLeadQueryResult: { createMany: vi.fn(async () => ({ count: 1 })) },
      activityEvent: { create: vi.fn() },
      auditLog: { create: vi.fn() },
      $executeRaw: vi.fn(),
      $transaction: vi.fn(),
    };
    client.$transaction.mockImplementation(async (fn) => fn(client));
    return client;
  }
  beforeEach(() => {
    db = makeDb();
    mocks.getDb.mockReturnValue(db);
    mocks.search.mockResolvedValue({
      provider: "google-maps",
      source: "lead_command:google-maps",
      message: "Requested 50, returned 1",
      leads: [lead],
      report: { errors: [], stopReason: "sources-exhausted" },
    });
  });

  it("passes only this tenant's history to sourcing and persists target and source report", async () => {
    const result = await createVegaLeadQuery({
      organizationId: "org-a",
      requestedById: "rep-a",
      prompt: "HVAC near Tyler",
      count: 50,
    });
    expect(mocks.search).toHaveBeenCalledWith(
      "HVAC near Tyler",
      expect.objectContaining({
        workspaceSlug: "client-a",
        count: 50,
        callReady: true,
        existing: [],
      }),
    );
    for (const [query] of db.vegaLead.findMany.mock.calls)
      expect(query).toMatchObject({ where: { organizationId: "org-a" } });
    expect(db.$executeRaw).toHaveBeenCalled();
    expect(db.vegaLead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: "org-a" }),
      }),
    );
    expect(result).toMatchObject({
      requestedCount: 50,
      resultCount: 1,
      status: "PARTIAL",
    });
  });

  it("includes an existing lead by reference without duplicating or moving the original record", async () => {
    db.vegaLead.findMany.mockResolvedValue([{ ...lead, id: "old-lead" }]);
    const result = await createVegaLeadQuery({
      organizationId: "org-a",
      requestedById: "rep-a",
      prompt: "HVAC near Tyler",
      count: 50,
      includeExisting: true,
    });
    expect(db.vegaLead.create).not.toHaveBeenCalled();
    expect(db.vegaLeadQueryResult.createMany).toHaveBeenCalledWith({
      data: [{ queryId: "query-new", leadId: "old-lead" }],
    });
    expect(result.resultCount).toBe(1);
  });

  it("rechecks duplicates after sourcing to protect simultaneous pulls", async () => {
    db.vegaLead.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...lead, id: "other-pull" }]);
    const result = await createVegaLeadQuery({
      organizationId: "org-a",
      requestedById: "rep-a",
      prompt: "HVAC near Tyler",
      count: 50,
    });
    expect(db.vegaLead.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({ resultCount: 0, status: "NO_NEW_LEADS" });
  });
});
