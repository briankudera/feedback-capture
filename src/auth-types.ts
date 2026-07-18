/**
 * Server-side authorization result. `submittedBy` SHALL be present whenever
 * `authorized` is `true` — it is the only identity value a factory-produced
 * create handler may persist. No role-rank field: hosts with no role concept
 * (e.g. a binary allowlist) are fully expressible.
 */
export type ViewerResolution = { authorized: boolean; submittedBy?: string } | null;

/**
 * Server-side authorization check the route-handler factory calls per
 * request. The package defines this type only — it ships no concrete
 * implementation for any host.
 */
export type ResolveViewer = (request: Request) => Promise<ViewerResolution>;

/**
 * Client capability-probe response shape, modeled on GGB's `/api/admin/me`.
 * Contains no session token material, email, username, or internal user
 * identifier — only a rendering decision.
 */
export type CapabilityProbeResponse = {
  isAdmin: boolean;
  role: string | null;
};
