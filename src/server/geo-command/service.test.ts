import { describe, expect, it, vi } from "vitest";
import { parseClientIdMap, resolveGeoClientId } from "./service";

describe("G.E.O. command bridge", () => {
  it("parses JSON and comma-separated client maps", () => {
    expect(
      parseClientIdMap('{"design-haven-build":"client-design"}'),
    ).toMatchObject({ "design-haven-build": "client-design" });

    expect(
      parseClientIdMap("ghost-ai-solutions:client-ghost, custom:client-custom"),
    ).toMatchObject({
      "ghost-ai-solutions": "client-ghost",
      custom: "client-custom",
    });
  });

  it("resolves known production organizations and env overrides", () => {
    expect(
      resolveGeoClientId({
        id: "org_design",
        slug: "design-haven-build",
        name: "Design Haven Build",
      }),
    ).toBe("client-mrs5c8j2-770849");

    vi.stubEnv("GEO_CLIENT_ID_MAP", '{"org_design":"client-override"}');
    expect(
      resolveGeoClientId({
        id: "org_design",
        slug: "design-haven-build",
        name: "Design Haven Build",
      }),
    ).toBe("client-override");
    vi.unstubAllEnvs();
  });
});
