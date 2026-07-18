import { describe, expect, it } from "vitest";
import type { CapabilityProbeResponse, ResolveViewer, ViewerResolution } from "../auth-types.js";

function acceptsResolveViewer(_fn: ResolveViewer): void {}

describe("auth-types", () => {
  it("accepts an authorized result carrying submittedBy", () => {
    const authorized: ResolveViewer = async () => ({ authorized: true, submittedBy: "user-1" });
    acceptsResolveViewer(authorized);
    expect(true).toBe(true);
  });

  it("accepts unauthorized results (false or null) with no submittedBy required", () => {
    const unauthorized: ResolveViewer = async () => ({ authorized: false });
    const nullResult: ResolveViewer = async () => null;
    acceptsResolveViewer(unauthorized);
    acceptsResolveViewer(nullResult);
    expect(true).toBe(true);
  });

  it("CapabilityProbeResponse has exactly isAdmin and role — no extra identity field compiles", () => {
    const probe: CapabilityProbeResponse = { isAdmin: true, role: null };
    expect(probe.isAdmin).toBe(true);

    // @ts-expect-error email is not part of CapabilityProbeResponse (REQ-NR003)
    const withEmail: CapabilityProbeResponse = { isAdmin: true, role: null, email: "x@y.com" };
    void withEmail;
  });

  it("no role-rank-shaped field type-checks as part of ViewerResolution", () => {
    // @ts-expect-error roleRank is not part of the authorization result shape
    const withRoleRank: ViewerResolution = { authorized: true, submittedBy: "u1", roleRank: 3 };
    void withRoleRank;
  });
});
