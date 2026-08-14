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
    expect(inferRequestedLeadCount("Vega, pull 75 prospects")).toBe(50);
    expect(
      inferLeadLocation(
        "Need 20 HVAC leads in Tyler, Texas and surrounding cities within 40 mile range",
      ),
    ).toBe("Tyler, Texas");
    expect(
      inferLeadCommandQuery("commercial window cleaning and exterior cleaning"),
    ).toContain("property managers");
  });
});
