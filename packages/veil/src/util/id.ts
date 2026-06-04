import { randomUUID } from "node:crypto";

/** Generates a stable unique id for documents and entities. */
export function createId(prefix = "veil"): string {
  return `${prefix}_${randomUUID()}`;
}
