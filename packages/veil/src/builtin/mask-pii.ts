import type {
  VeilDocument,
  VeilEntity,
  VeilTransformer,
} from "../types/index.js";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Tokenizing transformer (FR-6). Each detected entity's original value is
 * replaced with a stable `<type:n>` token; tokens are numbered per entity type
 * and shared across repeats of the same value so rehydration is unambiguous.
 * Populates `entity.tokenizedValue` and `document.mappings`.
 */
export class MaskPiiTransformer implements VeilTransformer {
  readonly name = "mask-pii";

  async transform(document: VeilDocument): Promise<VeilDocument> {
    if (document.entities.length === 0) return document;

    const counters = new Map<string, number>();
    const tokenByValue = new Map<string, string>();
    const affected: string[] = [];

    // Replace longest values first to avoid clobbering substrings.
    const entities = [...document.entities].sort(
      (a, b) => b.originalValue.length - a.originalValue.length,
    );

    let content = document.content;

    for (const entity of entities) {
      const token =
        tokenByValue.get(entity.originalValue) ?? this.allocate(counters, entity);
      tokenByValue.set(entity.originalValue, token);
      entity.tokenizedValue = token;

      const before = content;
      content = content.replace(
        new RegExp(escapeRegExp(entity.originalValue), "g"),
        token,
      );

      if (content !== before) affected.push(entity.id);

      if (!document.mappings.some((m) => m.token === token)) {
        document.mappings.push({ token, originalValue: entity.originalValue });
      }
    }

    document.content = content;
    document.transformations.push({
      transformer: this.name,
      affected,
      timestamp: new Date().toISOString(),
    });

    return document;
  }

  private allocate(counters: Map<string, number>, entity: VeilEntity): string {
    const next = (counters.get(entity.type) ?? 0) + 1;
    counters.set(entity.type, next);
    return `<${entity.type}:${next}>`;
  }
}
