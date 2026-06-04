import type { VeilAuditEntry, VeilAuditor, VeilDocument } from "../types/index.js";

/**
 * Default auditor. Audit entries are accumulated on the document throughout the
 * pipeline; this auditor mirrors them into an in-memory log so they can be
 * inspected independently of the document (FR-8). Persistence is out of scope
 * for V1 — a future auditor plugin can write elsewhere.
 */
export class MemoryAuditor implements VeilAuditor {
  readonly name = "memory-auditor";
  private readonly log: VeilAuditEntry[] = [];

  async record(document: VeilDocument): Promise<void> {
    this.log.push(...document.audits);
  }

  entries(): readonly VeilAuditEntry[] {
    return this.log;
  }
}
