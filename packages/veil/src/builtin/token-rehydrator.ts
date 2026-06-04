import type {
  VeilDocument,
  VeilRehydrator,
} from "../types/index.js";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Restores original values in an AI response by reversing the document's token
 * mappings (FR-7). Longer tokens are replaced first so e.g. `<person:10>` is not
 * partially matched by `<person:1>`.
 */
export class TokenRehydrator implements VeilRehydrator {
  readonly name = "token-rehydrator";

  async rehydrate(document: VeilDocument, response: string): Promise<string> {
    const mappings = [...document.mappings].sort(
      (a, b) => b.token.length - a.token.length,
    );

    let output = response;
    for (const { token, originalValue } of mappings) {
      output = output.replace(new RegExp(escapeRegExp(token), "g"), originalValue);
    }
    return output;
  }
}
