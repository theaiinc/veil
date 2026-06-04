import type {
  VeilDetectionResult,
  VeilDetector,
  VeilDocument,
  VeilEntity,
} from "@theaiinc/veil";
import { createId } from "@theaiinc/veil";
import { DEFAULT_PATTERNS, type RegexPattern } from "./patterns.js";

/**
 * Dependency-free, fully offline detector for structured PII and secrets:
 * email, phone, URL, credit card (Luhn-validated), and common API-key shapes.
 * Each match is returned with character offsets so the core pipeline can merge
 * it with other detectors by confidence.
 */
export class RegexDetector implements VeilDetector {
  readonly name = "regex";

  constructor(private readonly patterns: RegexPattern[] = DEFAULT_PATTERNS) {}

  async detect(document: VeilDocument): Promise<VeilDetectionResult> {
    const entities: VeilEntity[] = [];

    for (const spec of this.patterns) {
      // Reset lastIndex defensively in case a shared RegExp is reused.
      spec.pattern.lastIndex = 0;
      for (const match of document.content.matchAll(spec.pattern)) {
        const value = match[0];
        if (spec.validate && !spec.validate(value)) continue;
        const start = match.index ?? 0;
        entities.push({
          id: createId("ent"),
          type: spec.type,
          originalValue: value,
          tokenizedValue: "",
          confidence: spec.confidence,
          source: this.name,
          start,
          end: start + value.length,
        });
      }
    }

    return { entities };
  }
}
