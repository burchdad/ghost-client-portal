import { describe, expect, it } from "vitest";
import { buildVegaSnapshot, deduplicateVegaLeads } from "./service";

describe("Vega client intelligence", () => {
  it("builds positioning, competitor, lead, and engagement signals from portal data", () => {
    const snapshot = buildVegaSnapshot({
      projects: [
        {
          id: "project_1",
          name: "AI Search Growth Program",
          serviceCategory: "SEO AEO GEO",
          currentPhase: "Generative positioning",
          progress: 20,
          clientVisibleSummary:
            "Improve search visibility, answer engine readiness, and LLM discovery.",
          updatedAt: new Date(),
          phases: [{ status: "In Progress", progress: 40 }],
          milestones: [{ status: "Waiting", dueAt: null, plannedDate: null }],
          clientActions: [
            {
              title: "Approve competitor set",
              description: "Confirm the first competitor cohort for Vega.",
              status: "PENDING",
              priority: "HIGH",
              dueAt: null,
            },
          ],
        },
      ],
      responses: [
        {
          fieldKey: "competitors",
          value: "Example Competitor, Search Rival",
        },
      ],
      activity: [
        {
          title: "Proposal accepted",
          body: "Client accepted the Vega launch proposal.",
          type: "proposal.accepted",
        },
      ],
    });

    expect(snapshot.summary.activeProjects).toBe(1);
    expect(snapshot.summary.capturedCompetitors).toBe(2);
    expect(snapshot.leads.map((lead) => lead.name)).toContain(
      "AI Search Growth Program opportunity",
    );
    expect(snapshot.leadRecords[0]).toMatchObject({
      company: "AI Search Growth Program",
      emailStatus: "Needs enrichment",
    });
    expect(snapshot.leadLists.map((list) => list.name)).toContain(
      "Qualified prospects",
    );
    expect(
      snapshot.outreachSequences.map((sequence) => sequence.name),
    ).toContain("Intro value email");
    expect(snapshot.queryPresets.map((preset) => preset.label)).toContain(
      "Find local buyers",
    );
    expect(snapshot.queryPresets.map((preset) => preset.label)).toContain(
      "Find Facebook locations",
    );
    expect(snapshot.competitors.map((competitor) => competitor.name)).toEqual([
      "Example Competitor",
      "Search Rival",
    ]);
    expect(snapshot.positioning.map((item) => item.status)).toContain(
      "Active signal",
    );
    expect(snapshot.engagement.map((item) => item.title)).toContain(
      "Approve competitor set",
    );
  });

  it("keeps real client lead contact paths and source evidence in the portal snapshot", () => {
    const snapshot = buildVegaSnapshot({
      projects: [],
      responses: [],
      activity: [],
      storedLeads: [
        {
          id: "lead_1",
          queryId: "query_1",
          company: "Ranch HVAC Services",
          contact: "Team at Ranch HVAC Services",
          title: "Owner or Growth Operator",
          segment: "HVAC contractor",
          stage: "QUALIFIED",
          intentScore: 87,
          emailStatus: "Email blocked until verified",
          email: null,
          phone: "(903) 555-0199",
          website: "https://ranchhvac.example",
          source: "lead_command:google-maps:Google Maps via SerpAPI",
          sourceEvidence: [
            "Primary source: google-maps · Google Maps via SerpAPI",
            "Phone path captured",
            "Company website captured",
          ],
          sourceConfidence: "Single source + context",
          notes: "Google Maps business matched search intent.",
          nextStep: "Create phone-assist task; email needs enrichment.",
        },
      ],
      useGeneratedLeadFallback: false,
    });

    expect(snapshot.leadRecords[0]).toMatchObject({
      phone: "(903) 555-0199",
      website: "https://ranchhvac.example",
      emailStatus: "Email blocked until verified",
      sourceConfidence: "Single source + context",
    });
    expect(snapshot.leadRecords[0].sourceEvidence).toContain(
      "Company website captured",
    );
  });

  it("deduplicates leads across prior requests and within a new batch", () => {
    const existing = [
      {
        company: "Ranch HVAC Services LLC",
        email: null,
        phone: "(903) 555-0199",
        website: "https://www.ranchhvac.example",
      },
    ];
    const candidates = [
      {
        company: "Ranch HVAC Services",
        email: "owner@ranchhvac.example",
        phone: "903-555-0199",
        website: "https://ranchhvac.example/about",
      },
      {
        company: "Fresh Air Mechanical",
        email: "hello@freshair.example",
        phone: "903-555-0101",
        website: "https://freshair.example",
      },
      {
        company: "Fresh Air Mechanical Inc.",
        email: "hello@freshair.example",
        phone: "903-555-0101",
        website: "https://freshair.example/contact",
      },
    ];

    expect(deduplicateVegaLeads(candidates, existing)).toEqual([candidates[1]]);
  });
});
