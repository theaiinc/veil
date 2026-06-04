import { describe, expect, it } from "vitest";
import { createDocument } from "../document.js";
import { RuleClassifier } from "./rule-classifier.js";
import { DefaultPolicyProvider, effectiveLevel } from "./default-policy.js";

describe("RuleClassifier", () => {
  it("picks the highest level implied by any tag", async () => {
    const doc = createDocument("x");
    doc.tags = [
      { name: "url", confidence: 0.9 }, // INTERNAL
      { name: "secret", confidence: 0.8 }, // SECRET
      { name: "customer-data", confidence: 0.7 }, // CONFIDENTIAL
    ];
    const result = await new RuleClassifier().classify(doc);
    expect(result.level).toBe("SECRET");
  });

  it("defaults tagged-but-unmapped content to INTERNAL, not PUBLIC", async () => {
    const doc = createDocument("x");
    doc.tags = [{ name: "misc", confidence: 0.5 }];
    expect((await new RuleClassifier().classify(doc)).level).toBe("INTERNAL");
  });
});

describe("DefaultPolicyProvider", () => {
  it("maps the effective classification to its action", async () => {
    const doc = createDocument("x");
    doc.classifications = [{ level: "SECRET", confidence: 1 }];
    expect(await new DefaultPolicyProvider().evaluate(doc)).toBe("local-only");
  });

  it("lets a document-level policy override the default map", async () => {
    const doc = createDocument("x");
    doc.classifications = [{ level: "CONFIDENTIAL", confidence: 1 }];
    doc.policy = { CONFIDENTIAL: "block" };
    expect(await new DefaultPolicyProvider().evaluate(doc)).toBe("block");
  });

  it("effectiveLevel returns the most sensitive classification present", () => {
    const doc = createDocument("x");
    doc.classifications = [
      { level: "INTERNAL", confidence: 1 },
      { level: "RESTRICTED", confidence: 1 },
      { level: "PUBLIC", confidence: 1 },
    ];
    expect(effectiveLevel(doc)).toBe("RESTRICTED");
  });
});
