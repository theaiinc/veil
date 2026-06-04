import type { VeilDocument, VeilTag, VeilTagger } from "../types/index.js";

interface KeywordRule {
  tag: string;
  pattern: RegExp;
  confidence: number;
}

/**
 * Heuristic, dependency-free tagger. It does not attempt to be exhaustive — its
 * job is to attach coarse "what is this content" tags (FR-1) that downstream
 * classifiers and policies key off. PII tagging is derived from detected
 * entities rather than keywords.
 */
const RULES: KeywordRule[] = [
  { tag: "source-code", pattern: /\b(function|class|const|let|var|import|=>|public|private)\b|[a-z][A-Za-z0-9]*\([^)]*\)/, confidence: 0.7 },
  { tag: "url", pattern: /https?:\/\/|www\./i, confidence: 0.9 },
  { tag: "financial", pattern: /\b(invoice|payment|credit card|revenue|salary|\$\d|transaction)\b/i, confidence: 0.75 },
  { tag: "secret", pattern: /\b(api[_-]?key|secret|password|token|private[_-]?key|bearer)\b/i, confidence: 0.8 },
  { tag: "customer-data", pattern: /\b(customer|member|subscriber|account holder|loyalty)\b/i, confidence: 0.65 },
];

export class KeywordTagger implements VeilTagger {
  readonly name = "keyword-tagger";

  async tag(document: VeilDocument): Promise<VeilTag[]> {
    const tags: VeilTag[] = [];

    for (const rule of RULES) {
      if (rule.pattern.test(document.content)) {
        tags.push({ name: rule.tag, confidence: rule.confidence, source: this.name });
      }
    }

    // Any detected entity implies PII-bearing content.
    if (document.entities.length > 0) {
      const confidence = Math.max(...document.entities.map((e) => e.confidence));
      tags.push({ name: "pii", confidence, source: this.name });
    }

    return tags;
  }
}
