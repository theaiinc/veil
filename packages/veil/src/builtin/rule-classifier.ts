import type {
  VeilClassification,
  VeilClassificationLevel,
  VeilClassifier,
  VeilDocument,
} from "../types/index.js";

const LEVEL_ORDER: VeilClassificationLevel[] = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "SECRET",
  "RESTRICTED",
];

/** Tag → minimum classification level it implies. */
const TAG_LEVELS: Record<string, VeilClassificationLevel> = {
  public: "PUBLIC",
  secret: "SECRET",
  "api-key": "SECRET",
  proprietary: "CONFIDENTIAL",
  "source-code": "CONFIDENTIAL",
  architecture: "CONFIDENTIAL",
  "customer-data": "CONFIDENTIAL",
  financial: "CONFIDENTIAL",
  pii: "CONFIDENTIAL",
  url: "INTERNAL",
};

function rank(level: VeilClassificationLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

/**
 * Derives a sensitivity level from the document's tags (FR-3). The highest level
 * implied by any tag wins. A manual classification override is honored by the
 * pipeline before this runs, so this classifier only handles the automatic case.
 */
export class RuleClassifier implements VeilClassifier {
  readonly name = "rule-classifier";

  async classify(document: VeilDocument): Promise<VeilClassification> {
    let level: VeilClassificationLevel = "PUBLIC";
    let confidence = 0.5;

    for (const tag of document.tags) {
      const implied = TAG_LEVELS[tag.name];
      if (implied && rank(implied) > rank(level)) {
        level = implied;
        confidence = Math.max(confidence, tag.confidence);
      }
    }

    // Content with no signal at all defaults to INTERNAL — safer than PUBLIC.
    if (level === "PUBLIC" && document.tags.length > 0) {
      level = "INTERNAL";
    }

    return { level, confidence, source: this.name };
  }
}
