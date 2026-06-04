import { describe, expect, it } from "vitest";
import type { VeilEntity } from "../types/index.js";
import { mergeEntitiesByConfidence } from "./merge.js";

function entity(partial: Partial<VeilEntity>): VeilEntity {
  return {
    id: partial.id ?? "e",
    type: partial.type ?? "person",
    originalValue: partial.originalValue ?? "x",
    tokenizedValue: "",
    confidence: partial.confidence ?? 0.5,
    start: partial.start,
    end: partial.end,
    source: partial.source,
  };
}

describe("mergeEntitiesByConfidence", () => {
  it("keeps the highest-confidence entity for overlapping spans", () => {
    const merged = mergeEntitiesByConfidence([
      entity({ id: "low", confidence: 0.6, start: 0, end: 10 }),
      entity({ id: "high", confidence: 0.95, start: 2, end: 8 }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.id).toBe("high");
  });

  it("keeps non-overlapping entities", () => {
    const merged = mergeEntitiesByConfidence([
      entity({ id: "a", start: 0, end: 5 }),
      entity({ id: "b", start: 10, end: 15 }),
    ]);
    expect(merged.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("dedupes same value+type when offsets are absent", () => {
    const merged = mergeEntitiesByConfidence([
      entity({ id: "a", confidence: 0.5, originalValue: "Steve" }),
      entity({ id: "b", confidence: 0.9, originalValue: "Steve" }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.id).toBe("b");
  });
});
