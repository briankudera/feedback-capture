import type { ChangeKind } from "./constants";

/**
 * The full `feedback_request` row shape at the JSON boundary — timestamps as
 * ISO strings.
 */
export type FeedbackRecord = {
  id: string;
  status: string;
  pageUrl: string;
  elementSelector: string;
  sourceFileHint: string | null;
  elementText: string | null;
  componentHint: string | null;
  requestText: string;
  changeKindGuess: ChangeKind;
  screenshotDataUrl: string | null;
  viewport: Record<string, unknown>;
  submittedBy: string;
  submittedAt: string;
  delivered: boolean;
  deliveredAt: string | null;
};

type InsertPayload = {
  pageUrl: string;
  elementSelector: string;
  sourceFileHint?: string | null;
  elementText?: string | null;
  componentHint?: string | null;
  requestText: string;
  changeKindGuess: ChangeKind;
  screenshotDataUrl?: string | null;
  viewport: Record<string, unknown>;
};

/**
 * Repository interface the route-handler factory calls exclusively — never a
 * concrete Drizzle client or host-specific query (REQ-026, REQ-032, REQ-033).
 * `insert` takes `submittedBy` as a separate parameter, never read from
 * `payload`, so deriving it from the request body is structurally impossible
 * (REQ-025, REQ-NR002). The delivered-record delete guard is enforced at the
 * route-handler-factory level, not required inside implementations of this
 * interface (data-model.md §2) — `findById` is what lets the factory read
 * `delivered` before deciding whether to call `delete` (REQ-023, REQ-NR004);
 * it was added while implementing TASK-005, which needs it to enforce that
 * guard without every host re-implementing the check itself.
 */
export interface FeedbackRepository {
  insert(payload: InsertPayload, submittedBy: string): Promise<FeedbackRecord>;
  list(limit: number): Promise<FeedbackRecord[]>;
  findById(id: string): Promise<FeedbackRecord | null>;
  setDelivered(id: string, delivered: boolean): Promise<FeedbackRecord | null>;
  delete(id: string): Promise<boolean>;
}
