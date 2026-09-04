import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/auth/guards", () => ({
  requireClientWorkspace: async () => ({
    organization: { id: "qa-only", name: "QA Calling Team" },
  }),
}));
vi.mock("@/app/(client)/vega/actions", () => ({
  createVegaLeadQueryAction: async () => {},
  updateVegaLeadStatusAction: async () => {},
}));
vi.mock("@/server/vega/service", async (original) => {
  const actual = await original<typeof import("./service")>();
  return {
    ...actual,
    getClientVegaData: async () => ({
      snapshot: actual.buildVegaSnapshot({
        projects: [],
        responses: [],
        activity: [],
        useGeneratedLeadFallback: false,
        storedLeads: [
          {
            id: "qa-lead",
            queryId: "original-query",
            company: "Example Commercial Services",
            contact: "Contact pending",
            title: "Decision-maker not identified",
            segment: "HVAC",
            stage: "QUALIFIED",
            intentScore: 74,
            emailStatus: "Email blocked until verified",
            email: null,
            phone: "903-555-0100",
            website: "https://example.com",
            source: "Google Maps via SerpAPI",
            sourceEvidence: ["Google Maps business listing"],
            sourceConfidence: "Single source",
            notes: "Business location: Tyler, Texas",
            nextStep:
              "Call the business and ask for the person handling operations.",
          },
        ],
        queries: [
          {
            id: "qa-query",
            prompt: "HVAC businesses near Tyler, Texas",
            status: "PARTIAL",
            resultCount: 1,
            requestedCount: 50,
            fulfillmentRate: 2,
            source: "Google Maps",
            guidance:
              "Requested 50, returned 1. Source exhausted. No duplicate contacts created.",
            createdAt: new Date("2026-09-04T12:00:00Z"),
            leadIds: ["qa-lead"],
          },
        ],
      }),
    }),
  };
});
import VegaPage from "@/app/(client)/vega/page";

describe("Vega calling form", () => {
  it("renders result counts, safe defaults, real contact paths and reused query membership", async () => {
    const markup = renderToStaticMarkup(
      await VegaPage({ searchParams: Promise.resolve({}) }),
    );
    expect(markup).toContain('value="50" selected=""');
    expect(markup).toContain('value="100"');
    expect(markup).toContain('name="callReady" checked=""');
    expect(markup).not.toContain('name="includeExisting" checked=""');
    expect(markup).toContain('href="tel:903-555-0100"');
    expect(markup).toContain('href="https://example.com"');
    expect(markup).toContain("Tyler, Texas");
    expect(markup).toContain("Example Commercial Services");
    if (process.env.VEGA_QA_HTML) {
      const cssDir = join(process.cwd(), ".next/static/css");
      const css = readdirSync(cssDir)
        .filter((name) => name.endsWith(".css"))
        .map((name) => readFileSync(join(cssDir, name), "utf8"))
        .join("\n");
      mkdirSync(process.env.VEGA_QA_HTML, { recursive: true });
      writeFileSync(
        join(process.env.VEGA_QA_HTML, "vega.html"),
        `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main class="mx-auto max-w-7xl p-4">${markup}</main></body></html>`,
      );
    }
  });
});
