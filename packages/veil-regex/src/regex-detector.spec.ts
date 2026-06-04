import { describe, expect, it } from "vitest";
import { createDocument } from "@theaiinc/veil";
import { RegexDetector, luhnValid } from "./index.js";

const detector = new RegexDetector();

async function typesFor(content: string): Promise<string[]> {
  const { entities } = await detector.detect(createDocument(content));
  return entities.map((e) => e.originalValue);
}

describe("RegexDetector", () => {
  it("detects email addresses", async () => {
    expect(await typesFor("ping me at jane.doe@example.com please")).toContain(
      "jane.doe@example.com",
    );
  });

  it("detects URLs", async () => {
    expect(await typesFor("see https://example.com/path?x=1")).toContain(
      "https://example.com/path?x=1",
    );
  });

  it("detects API keys", async () => {
    const values = await typesFor("token sk-abcdef0123456789ABCDEF here");
    expect(values.some((v) => v.startsWith("sk-"))).toBe(true);
  });

  it("detects a valid credit card and rejects an invalid one", async () => {
    const valid = await detector.detect(createDocument("card 4111 1111 1111 1111"));
    expect(valid.entities.some((e) => e.type === "custom")).toBe(true);

    const invalid = await detector.detect(createDocument("card 4111 1111 1111 1112"));
    expect(invalid.entities.some((e) => e.originalValue.includes("1112"))).toBe(false);
  });

  it("returns character offsets for each match", async () => {
    const { entities } = await detector.detect(
      createDocument("a@b.com"),
    );
    expect(entities[0]).toMatchObject({ start: 0, end: 7, source: "regex" });
  });
});

describe("luhnValid", () => {
  it("accepts a known-good number and rejects a bad one", () => {
    expect(luhnValid("4111111111111111")).toBe(true);
    expect(luhnValid("4111111111111112")).toBe(false);
    expect(luhnValid("not-a-card")).toBe(false);
  });
});
