import { describe, expect, it } from "vitest";
import type { VeilDocument, VeilEntity } from "../types/index.js";
import { createDocument } from "../document.js";
import { MaskPiiTransformer } from "./mask-pii.js";
import { TokenRehydrator } from "./token-rehydrator.js";
import { RuleAbstractionTransformer } from "./rule-abstraction.js";

function entity(value: string, type: VeilEntity["type"], start: number): VeilEntity {
  return {
    id: `e-${start}`,
    type,
    originalValue: value,
    tokenizedValue: "",
    confidence: 0.9,
    start,
    end: start + value.length,
  };
}

describe("MaskPiiTransformer", () => {
  it("numbers tokens per type independently", async () => {
    const doc = createDocument("Anna and Bob email a@x.com");
    doc.entities = [
      entity("Anna", "person", 0),
      entity("Bob", "person", 9),
      entity("a@x.com", "email", 19),
    ];
    await new MaskPiiTransformer().transform(doc);
    // person counter: 1,2 ; email counter restarts at 1
    expect(doc.mappings).toEqual(
      expect.arrayContaining([
        { token: "<person:1>", originalValue: "Anna" },
        { token: "<person:2>", originalValue: "Bob" },
        { token: "<email:1>", originalValue: "a@x.com" },
      ]),
    );
    expect(doc.content).toBe("<person:1> and <person:2> email <email:1>");
  });

  it("reuses one token for repeated occurrences of the same value", async () => {
    const doc = createDocument("Steve told Steve that Steve agreed");
    doc.entities = [
      entity("Steve", "person", 0),
      entity("Steve", "person", 11),
      entity("Steve", "person", 22),
    ];
    await new MaskPiiTransformer().transform(doc);
    expect(doc.content).toBe("<person:1> told <person:1> that <person:1> agreed");
    expect(doc.mappings).toHaveLength(1);
  });

  it("replaces longest values first so substrings aren't clobbered", async () => {
    const doc = createDocument("Anna Lee met Anna");
    doc.entities = [
      entity("Anna", "person", 13),
      entity("Anna Lee", "person", 0),
    ];
    await new MaskPiiTransformer().transform(doc);
    // "Anna Lee" must not be half-masked into "<person:?> Lee"
    expect(doc.content).toBe("<person:1> met <person:2>");
  });
});

describe("TokenRehydrator", () => {
  it("restores tokens without <x:1> corrupting <x:10>", async () => {
    const doc: VeilDocument = createDocument("placeholder");
    doc.mappings = [
      { token: "<person:1>", originalValue: "Alice" },
      { token: "<person:10>", originalValue: "Zoe" },
    ];
    const out = await new TokenRehydrator().rehydrate(
      doc,
      "<person:10> reports to <person:1>",
    );
    expect(out).toBe("Zoe reports to Alice");
  });
});

describe("RuleAbstractionTransformer", () => {
  it("applies seed dictionary rules", async () => {
    const doc = createDocument("We run Azure Service Bus and Kafka on PostgreSQL");
    await new RuleAbstractionTransformer().transform(doc);
    expect(doc.content).toBe(
      "We run distributed messaging system and event streaming platform on database",
    );
    expect(doc.transformations.some((t) => t.transformer === "rule-abstraction")).toBe(true);
  });

  it("supports custom rules and records nothing when no rule matches", async () => {
    const doc = createDocument("nothing to abstract here");
    await new RuleAbstractionTransformer([
      { match: /widget/gi, replacement: "component" },
    ]).transform(doc);
    expect(doc.content).toBe("nothing to abstract here");
    expect(doc.transformations).toHaveLength(0);
  });
});
