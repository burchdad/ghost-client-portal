import { describe, expect, it } from "vitest";
import { buildVegaSnapshot } from "./service";

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
});
