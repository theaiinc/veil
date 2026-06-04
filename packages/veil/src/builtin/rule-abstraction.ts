import type { VeilDocument, VeilTransformer } from "../types/index.js";

export interface AbstractionRule {
  /** Literal phrase or pattern to abstract away. */
  match: string | RegExp;
  /** Generic replacement that preserves intent without proprietary detail. */
  replacement: string;
}

/**
 * Thin, dictionary-driven abstraction transformer. This is intentionally
 * minimal: the real deliverable is the pluggable {@link VeilTransformer}
 * contract. Production abstraction (rewriting "MembershipTierPromotionWorker
 * crashes..." into a generic description) is expected to be supplied by a future
 * LLM-backed plugin — no external/LLM calls are made in V1.
 *
 * Rules are applied in order; callers extend the seed map via the constructor.
 */
export const SEED_ABSTRACTION_RULES: AbstractionRule[] = [
  { match: /Azure Service Bus/gi, replacement: "distributed messaging system" },
  { match: /Amazon SQS|AWS SQS/gi, replacement: "distributed messaging system" },
  { match: /Kafka/gi, replacement: "event streaming platform" },
  { match: /PostgreSQL|Postgres|MySQL|MongoDB/gi, replacement: "database" },
];

export class RuleAbstractionTransformer implements VeilTransformer {
  readonly name = "rule-abstraction";

  constructor(
    private readonly rules: AbstractionRule[] = SEED_ABSTRACTION_RULES,
  ) {}

  async transform(document: VeilDocument): Promise<VeilDocument> {
    let content = document.content;
    const affected: string[] = [];

    for (const rule of this.rules) {
      const pattern =
        rule.match instanceof RegExp
          ? rule.match
          : new RegExp(rule.match.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      const before = content;
      content = content.replace(pattern, rule.replacement);
      if (content !== before) affected.push(rule.replacement);
    }

    if (affected.length > 0) {
      document.content = content;
      document.transformations.push({
        transformer: this.name,
        affected,
        timestamp: new Date().toISOString(),
      });
    }

    return document;
  }
}
