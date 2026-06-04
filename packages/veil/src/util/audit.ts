import type { VeilAuditEntry, VeilDocument } from "../types/index.js";

/** Appends a timestamped audit entry to the document (FR-8). */
export function audit(
  document: VeilDocument,
  entry: Omit<VeilAuditEntry, "timestamp">,
): void {
  document.audits.push({ timestamp: new Date().toISOString(), ...entry });
}
