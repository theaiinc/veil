import type {
  VeilClassificationLevel,
  VeilDocument,
  VeilPolicy,
  VeilPolicyAction,
  VeilPolicyProvider,
} from "../types/index.js";

/** Used when neither the document nor the provider supplies a policy map. */
export const DEFAULT_POLICY: VeilPolicy = {
  PUBLIC: "allow",
  INTERNAL: "abstract",
  CONFIDENTIAL: "tokenize",
  SECRET: "local-only",
  RESTRICTED: "block",
};

/**
 * Maps the document's effective classification to a permitted action (FR-5).
 * The policy map is resolved in order: document.policy → provider default →
 * built-in DEFAULT_POLICY.
 */
export class DefaultPolicyProvider implements VeilPolicyProvider {
  readonly name = "default-policy";

  constructor(private readonly policy: VeilPolicy = DEFAULT_POLICY) {}

  async evaluate(document: VeilDocument): Promise<VeilPolicyAction> {
    const level = effectiveLevel(document);
    const map = { ...DEFAULT_POLICY, ...this.policy, ...(document.policy ?? {}) };
    return map[level] ?? "review";
  }
}

/** Highest-ranked classification currently on the document. */
export function effectiveLevel(document: VeilDocument): VeilClassificationLevel {
  const order: VeilClassificationLevel[] = [
    "PUBLIC",
    "INTERNAL",
    "CONFIDENTIAL",
    "SECRET",
    "RESTRICTED",
  ];
  let best: VeilClassificationLevel = "PUBLIC";
  for (const c of document.classifications) {
    if (order.indexOf(c.level) > order.indexOf(best)) best = c.level;
  }
  return best;
}
