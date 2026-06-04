import type { VeilEntity } from "../types/index.js";

function overlaps(a: VeilEntity, b: VeilEntity): boolean {
  if (
    a.start === undefined ||
    a.end === undefined ||
    b.start === undefined ||
    b.end === undefined
  ) {
    // Without offsets, treat same value+type as the same span.
    return a.type === b.type && a.originalValue === b.originalValue;
  }
  return a.start < b.end && b.start < a.end;
}

/**
 * Aggregates entities contributed by multiple detectors, merging overlapping
 * detections so the highest-confidence result wins for a given span (PRD:
 * "Results are merged by confidence"). Non-overlapping entities are all kept.
 */
export function mergeEntitiesByConfidence(entities: VeilEntity[]): VeilEntity[] {
  const sorted = [...entities].sort((a, b) => b.confidence - a.confidence);
  const kept: VeilEntity[] = [];

  for (const entity of sorted) {
    if (!kept.some((k) => overlaps(k, entity))) {
      kept.push(entity);
    }
  }

  // Restore document order for stable, predictable output.
  return kept.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
}
