export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns a 400-shaped rejection reason when the request's Content-Type is
 * not JSON, or `null` when it is fine to proceed. Framework-agnostic:
 * callers translate the reason into their own response type.
 */
export function requireJsonContentType(request: Request): string | null {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("application/json") ? null : "Content-Type must be application/json";
}
