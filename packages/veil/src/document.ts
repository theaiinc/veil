import type { VeilCreateOptions, VeilDocument, VeilTag } from "./types/index.js";
import { createId } from "./util/id.js";

/**
 * Creates a fresh VeilDocument from raw content. Manual tags and a manual
 * classification override may be supplied up front; they are merged with the
 * automatic results during processing.
 */
export function createDocument(
  content: string,
  options: VeilCreateOptions = {},
): VeilDocument {
  const tags: VeilTag[] = (options.tags ?? []).map((name) => ({
    name,
    confidence: 1,
    manual: true,
    source: "manual",
  }));

  return {
    id: createId("doc"),
    content,
    metadata: { ...(options.metadata ?? {}) },
    tags,
    classifications: options.classification
      ? [
          {
            level: options.classification,
            confidence: 1,
            manual: true,
            source: "manual",
          },
        ]
      : [],
    entities: [],
    mappings: [],
    transformations: [],
    audits: [],
    policy: options.policy,
  };
}
