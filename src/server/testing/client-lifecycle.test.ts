import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getConfiguredTestClient,
  invitationEmail,
  proposalEmail,
} from "./client-lifecycle";

describe("client lifecycle test configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires a dedicated test client email", () => {
    vi.stubEnv("PORTAL_TEST_CLIENT_EMAIL", "");

    expect(() => getConfiguredTestClient()).toThrow(/PORTAL_TEST_CLIENT_EMAIL/);
  });

  it("rejects placeholder test client emails", () => {
    vi.stubEnv("PORTAL_TEST_CLIENT_EMAIL", "client@example.com");

    expect(() => getConfiguredTestClient()).toThrow(/example\.com/);
  });

  it("normalizes the configured test client and uses it in email previews", () => {
    vi.stubEnv("PORTAL_TEST_CLIENT_EMAIL", " TestClient@GhostAI.Solutions ");
    vi.stubEnv("PORTAL_TEST_CLIENT_NAME", "Portal Tester");
    vi.stubEnv("PORTAL_TEST_CLIENT_TITLE", "QA Client");
    vi.stubEnv("PORTAL_TEST_ORGANIZATION_NAME", "Ghost Portal Test Org");

    expect(getConfiguredTestClient()).toEqual({
      email: "testclient@ghostai.solutions",
      name: "Portal Tester",
      title: "QA Client",
      organizationName: "Ghost Portal Test Org",
    });
    expect(
      proposalEmail({
        url: "https://clientportal.ghostai.solutions/p/token",
        testRunId: "run_1",
      }).html,
    ).toContain("Hi Portal Tester");
    expect(
      invitationEmail({
        url: "https://clientportal.ghostai.solutions/invite/token",
        testRunId: "run_1",
      }).html,
    ).toContain("Hi Portal Tester");
  });
});
