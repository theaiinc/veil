import { describe, expect, it } from "vitest";
import type { VeilDetectionResult, VeilDetector, VeilDocument } from "./index.js";
import { Veil, createId } from "./index.js";

/** Minimal detector that flags a known person name, for round-trip tests. */
class PersonDetector implements VeilDetector {
  readonly name = "test-person";
  constructor(private readonly value: string) {}
  async detect(document: VeilDocument): Promise<VeilDetectionResult> {
    const start = document.content.indexOf(this.value);
    if (start < 0) return { entities: [] };
    return {
      entities: [
        {
          id: createId("ent"),
          type: "person",
          originalValue: this.value,
          tokenizedValue: "",
          confidence: 0.99,
          source: this.name,
          start,
          end: start + this.value.length,
        },
      ],
    };
  }
}

describe("Veil.process", () => {
  it("tokenizes detected PII and rehydration restores it (FR-6, FR-7)", async () => {
    const veil = new Veil();
    veil.registerDetector(new PersonDetector("Steve Tran"));

    const result = await veil.process({
      content: "Please contact Steve Tran about the outage.",
      profile: "public-cloud",
    });

    expect(result.transformedContent).toContain("<person:1>");
    expect(result.transformedContent).not.toContain("Steve Tran");
    expect(result.mappings).toContainEqual({
      token: "<person:1>",
      originalValue: "Steve Tran",
    });

    const aiResponse = "I looked into it; <person:1> should restart the worker.";
    const restored = await veil.rehydrate(result.document, aiResponse);
    expect(restored).toBe("I looked into it; Steve Tran should restart the worker.");
  });

  it("merges manual tags with automatic tags (FR-2)", async () => {
    const veil = new Veil();
    const result = await veil.process({
      content: "https://example.com internal runbook",
      tags: ["proprietary", "architecture"],
    });
    expect(result.tags).toEqual(expect.arrayContaining(["proprietary", "architecture", "url"]));
  });

  it("honors a manual classification override (FR-4)", async () => {
    const veil = new Veil();
    veil.registerDetector(new PersonDetector("Steve Tran"));
    const result = await veil.process({
      content: "Steve Tran is a public figure.",
      classification: "SECRET",
    });
    expect(result.classification).toBe("SECRET");
    // No automatic classification should have been appended.
    const auto = result.document.classifications.filter((c) => !c.manual);
    expect(auto).toHaveLength(0);
  });

  it("records audit entries for each pipeline stage (FR-8)", async () => {
    const veil = new Veil();
    veil.registerDetector(new PersonDetector("Steve Tran"));
    const result = await veil.process({
      content: "Steve Tran reported a bug.",
      profile: "public-cloud",
    });
    const stages = new Set(result.audit.map((a) => a.stage));
    for (const stage of ["tag", "detect", "classify", "policy", "transform"]) {
      expect([...stages]).toContain(stage);
    }
  });

  it("blocks transformation when policy resolves to block (RESTRICTED)", async () => {
    const veil = new Veil();
    const result = await veil.process({
      content: "secret launch codes",
      classification: "RESTRICTED",
      profile: "public-cloud",
    });
    // block halts before transformers; content is untouched.
    expect(result.transformedContent).toBe("secret launch codes");
    expect(result.audit.some((a) => a.stage === "transform" && a.detail?.includes("block"))).toBe(true);
  });

  it("rejects unknown profiles", async () => {
    const veil = new Veil();
    await expect(veil.process({ content: "x", profile: "nope" })).rejects.toThrow(
      /Unknown Veil profile/,
    );
  });
});

describe("Veil.classify", () => {
  it("classifies without mutating content", async () => {
    const veil = new Veil();
    veil.registerDetector(new PersonDetector("Steve Tran"));
    const doc = veil.createDocument("Steve Tran filed a ticket.");
    await veil.classify(doc);
    expect(doc.content).toBe("Steve Tran filed a ticket.");
    expect(doc.classifications.length).toBeGreaterThan(0);
  });
});
