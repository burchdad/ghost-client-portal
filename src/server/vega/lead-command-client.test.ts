import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LeadCommandAuthError,
  inferLeadCommandProvider,
  inferLeadCommandQuery,
  inferLeadLocation,
  inferRequestedLeadCount,
  searchLeadCommandLeads,
} from "./lead-command-client";

describe("Lead Command client", () => {
  it("distinguishes an exhausted market from a provider failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          leads: [],
          message: "No qualified matches in this market.",
        }),
      ),
    );
    const result = await searchLeadCommandLeads("HVAC near Tyler");
    expect(result.report?.errors).toEqual([]);
    expect(result.report?.stopReason).toBe("sources-exhausted");
    expect(result.message).toContain("No qualified matches");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("turns commercial cleaning prompts into real Lead Command local searches", async () => {
    vi.stubEnv("LEAD_COMMAND_BASE_URL", "https://leadgen.test");
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toMatchObject({
          provider: "google-maps",
          location: "Tyler, Texas",
          size: 30,
        });

        return Response.json({
          provider: "google-maps",
          leads: [
            {
              name: "Jordan Lee",
              companyName: "Brookshire Grocery Co.",
              title: "Facilities Manager",
              email: "jordan@example.com",
              phone: "903-555-0100",
              website: "https://example.com",
              niche: "Commercial property",
              score: 91,
              confidence: 82,
              buyerFit: "Commercial exterior maintenance buyer",
              intentSignals: ["local commercial account"],
              signalSummary: "Strong fit for exterior cleaning contract.",
            },
          ],
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchLeadCommandLeads(
      "Naks Exterior Services wants commercial window cleaning and exterior cleaning contracts around Tyler, Texas. Need 30 leads.",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://leadgen.test/api/source/search"),
      expect.objectContaining({
        body: expect.stringContaining("commercial property managers"),
      }),
    );
    expect(result).toMatchObject({
      provider: "google-maps",
      source: "lead_command:google-maps",
      leads: [
        {
          company: "Brookshire Grocery Co.",
          contactName: "Jordan Lee",
          status: "READY_FOR_OUTREACH",
          intentScore: 91,
        },
      ],
    });
  });

  it("routes Facebook business-location requests to the Facebook discovery lane", async () => {
    vi.stubEnv("LEAD_COMMAND_BASE_URL", "https://leadgen.test");
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          provider: "facebook-business",
          location: "Tyler, Texas",
          size: 20,
        });

        return Response.json({
          provider: "facebook-business",
          leads: [
            {
              companyName: "Tyler Commercial Cleaning",
              phone: "903-555-0110",
              website: "https://tylercommercial.example",
              sourceUrl: "https://www.facebook.com/tylercommercialcleaning/",
              niche: "Commercial cleaning",
              score: 88,
              signalSummary:
                "Facebook business Page corroborated by Google Maps.",
            },
          ],
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchLeadCommandLeads(
      "Vega, find 20 Facebook business location leads near Tyler, Texas",
    );

    expect(result).toMatchObject({
      provider: "facebook-business",
      source: "lead_command:facebook-business",
      leads: [
        {
          company: "Tyler Commercial Cleaning",
          phone: "903-555-0110",
          website: "https://tylercommercial.example",
        },
      ],
    });
    expect(result.leads[0].notes).toContain(
      "Source profile: https://www.facebook.com/tylercommercialcleaning/",
    );
  });

  it("keeps phone-only records qualified instead of marking them email-ready", async () => {
    vi.stubEnv("LEAD_COMMAND_BASE_URL", "https://leadgen.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          provider: "google-maps",
          reviewLeads: [
            {
              companyName: "Tyler Office Plaza",
              phone: "903-555-0200",
              website: "https://office.example.com",
              niche: "Office buildings",
              score: 74,
            },
          ],
        }),
      ),
    );

    const result = await searchLeadCommandLeads(
      "need 10 window cleaning leads near Tyler, Texas",
    );

    expect(result.leads[0]).toMatchObject({
      company: "Tyler Office Plaza",
      email: null,
      phone: "903-555-0200",
      status: "QUALIFIED",
      nextStep: "Create phone-assist task; email needs enrichment.",
    });
    expect(result.leads[0].website).toBe("https://office.example.com");
  });

  it("keeps source profile URLs in evidence notes instead of treating them as company websites", async () => {
    vi.stubEnv("LEAD_COMMAND_BASE_URL", "https://leadgen.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          provider: "google-maps",
          reviewLeads: [
            {
              companyName: "No Site HVAC",
              phone: "903-555-0300",
              sourceUrl: "https://maps.google.com/no-site-hvac",
              niche: "HVAC contractor",
              score: 82,
            },
          ],
        }),
      ),
    );

    const result = await searchLeadCommandLeads(
      "need 10 HVAC leads near Tyler, Texas",
    );

    expect(result.leads[0]).toMatchObject({
      company: "No Site HVAC",
      website: null,
      phone: "903-555-0300",
    });
    expect(result.leads[0].notes).toContain(
      "Source profile: https://maps.google.com/no-site-hvac",
    );
  });

  it("classifies Lead Command authorization failures", async () => {
    vi.stubEnv("LEAD_COMMAND_BASE_URL", "https://leadgen.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
          }),
      ),
    );

    await expect(
      searchLeadCommandLeads("Tyler HVAC companies that need websites"),
    ).rejects.toBeInstanceOf(LeadCommandAuthError);
  });

  it("infers provider, location, count, and buyer query from natural language", () => {
    expect(
      inferLeadCommandProvider(
        "Need 20 commercial window cleaning leads in Tyler, Texas",
      ),
    ).toBe("google-maps");
    expect(
      inferLeadCommandProvider(
        "Need 20 founder decision makers for a B2B service campaign",
      ),
    ).toBe("apollo");
    expect(
      inferLeadCommandProvider(
        "Find Facebook business locations for HVAC companies near Tyler",
      ),
    ).toBe("facebook-business");
    expect(inferRequestedLeadCount("Vega, pull 75 prospects")).toBe(75);
    expect(
      inferRequestedLeadCount("Find businesses within 20 miles of Tyler"),
    ).toBe(50);
    expect(
      inferRequestedLeadCount("Find 100 leads within 20 miles of Tyler"),
    ).toBe(100);
    expect(
      inferLeadLocation(
        "Need 20 HVAC leads in Tyler, Texas and surrounding cities within 40 mile range",
      ),
    ).toBe("Tyler, Texas");
    expect(
      inferLeadCommandQuery("commercial window cleaning and exterior cleaning"),
    ).toContain("property managers");
  });

  it.each([50, 100])(
    "fills %i call-ready results across pages after excluding existing leads",
    async (count) => {
      const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        expect(body.location).toBe("Tyler, Texas");
        expect(body.workspaceSlug).toBe("ghost-ai-solutions");
        expect(body.mode).toBe("call-ready");
        const page = Number(body.scrollToken || 0) / 20;
        return Response.json({
          scrollToken: String((page + 1) * 20),
          reviewLeads: Array.from({ length: 20 }, (_, i) => ({
            companyName: `Business ${page * 20 + i}`,
            phone: `903555${String(page * 20 + i).padStart(4, "0")}`,
            score: 75,
          })),
        });
      });
      vi.stubGlobal("fetch", fetchMock);
      const result = await searchLeadCommandLeads(
        "HVAC businesses near Tyler, Texas",
        {
          count,
          callReady: true,
          workspaceSlug: "ghost-ai-solutions",
          existing: Array.from({ length: 20 }, (_, i) => ({
            company: `Business ${i}`,
            email: null,
            phone: null,
            website: null,
          })),
        },
      );
      expect(result.leads).toHaveLength(count);
      expect(result.leads[0].company).toBe("Business 20");
      expect(
        result.leads.every(
          (lead) => !lead.email && lead.status === "QUALIFIED",
        ),
      ).toBe(true);
      expect(result.report?.duplicates).toBe(20);
      expect(result.report?.stopReason).toBe("target-reached");
    },
  );

  it("deduplicates across sources, preserves the market, and reports a shortfall", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        expect(body.location).toBe("Tyler, Texas");
        if (body.provider === "apollo")
          return new Response("unavailable", { status: 503 });
        return Response.json({
          leads: [{ companyName: "Example HVAC", phone: "9035550100" }],
        });
      }),
    );
    const result = await searchLeadCommandLeads("HVAC near Tyler, Texas", {
      count: 50,
      multiSource: true,
      callReady: true,
    });
    expect(result.leads).toHaveLength(1);
    expect(result.report?.duplicates).toBe(1);
    expect(result.report?.errors).toHaveLength(1);
    expect(result.report?.stopReason).toBe("source-limited");
  });

  it("enriches locally sourced company leads with confident Apollo contact matches", async () => {
    const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (body.provider === "google-maps") {
        return Response.json({
          leads: [
            {
              companyName: "Example HVAC",
              phone: "9035550100",
              website: "https://examplehvac.com",
              source: "Google Maps via SerpAPI",
              score: 81,
            },
          ],
        });
      }
      if (body.provider === "apollo") {
        expect(body.query).toContain("Example HVAC");
        return Response.json({
          leads: [
            {
              name: "Alex Rivera",
              companyName: "Example HVAC LLC",
              title: "Owner",
              email: "alex@examplehvac.com",
              website: "https://examplehvac.com",
              source: "Apollo",
              score: 93,
            },
          ],
        });
      }
      return Response.json({ leads: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchLeadCommandLeads("HVAC near Tyler, Texas", {
      count: 1,
      multiSource: true,
      callReady: true,
    });

    expect(result.source).toBe("lead_command:google-maps+apollo");
    expect(result.report?.enrichment).toMatchObject({
      provider: "apollo",
      attempted: 1,
      matched: 1,
      noMatch: 0,
    });
    expect(result.leads[0]).toMatchObject({
      company: "Example HVAC",
      contactName: "Alex Rivera",
      title: "Owner",
      email: "alex@examplehvac.com",
      status: "READY_FOR_OUTREACH",
      intentScore: 93,
      source: "lead_command:google-maps:Google Maps via SerpAPI+apollo-enriched",
      nextStep:
        "Review Apollo-enriched contact data and draft first-touch outreach.",
    });
  });

  it("does not merge Apollo people when the company identity is unclear", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        if (body.provider === "google-maps") {
          return Response.json({
            leads: [
              {
                companyName: "Example HVAC",
                phone: "9035550100",
                website: "https://examplehvac.com",
              },
            ],
          });
        }
        if (body.provider === "apollo") {
          return Response.json({
            leads: [
              {
                name: "Casey Morgan",
                companyName: "Different Plumbing",
                email: "casey@different.example",
              },
            ],
          });
        }
        return Response.json({ leads: [] });
      }),
    );

    const result = await searchLeadCommandLeads("HVAC near Tyler, Texas", {
      count: 1,
      multiSource: true,
      callReady: true,
    });

    expect(result.report?.enrichment).toMatchObject({
      attempted: 1,
      matched: 0,
      noMatch: 1,
    });
    expect(result.leads[0]).toMatchObject({
      company: "Example HVAC",
      contactName: null,
      email: null,
      status: "QUALIFIED",
    });
  });

  it("stops repeated cursors and rejects mock data and unusable phone numbers", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        scrollToken: "20",
        leads: [{ companyName: "No Phone", phone: "123" }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await searchLeadCommandLeads("HVAC near Tyler", {
      callReady: true,
    });
    expect(result.leads).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          dryRun: true,
          leads: [{ companyName: "Sample", phone: "9035550100" }],
        }),
      ),
    );
    expect((await searchLeadCommandLeads("HVAC near Tyler")).leads).toEqual([]);
  });

  it("enforces the page budget even when a provider never exhausts", async () => {
    let page = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ leads: [], scrollToken: String(++page) }),
      ),
    );
    const result = await searchLeadCommandLeads("founders in Texas", {
      count: 100,
    });
    expect(result.report?.batches).toBe(12);
    expect(result.report?.stopReason).toBe("request-budget-reached");
  });

  it("can include an existing business without returning it twice", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          leads: [
            { companyName: "Example", phone: "9035550100" },
            { companyName: "Example LLC", phone: "+1 903-555-0100" },
          ],
        }),
      ),
    );
    const result = await searchLeadCommandLeads("HVAC near Tyler", {
      includeExisting: true,
      existing: [
        { company: "Example", email: null, phone: null, website: null },
      ],
    });
    expect(result.leads).toHaveLength(1);
  });
});
