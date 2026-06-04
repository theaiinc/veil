import { describe, expect, it, vi } from "vitest";
import { createDocument } from "@theaiinc/veil";
import { PresidioDetector } from "./index.js";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => body,
  } as unknown as Response;
}

describe("PresidioDetector", () => {
  it("maps analyzer results to VeilEntity with original values", async () => {
    const content = "Contact Steve Tran at steve@example.com";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([
        { entity_type: "PERSON", start: 8, end: 18, score: 0.85 },
        { entity_type: "EMAIL_ADDRESS", start: 22, end: 39, score: 0.99 },
      ]),
    );

    const detector = new PresidioDetector({ fetch: fetchMock });
    const { entities } = await detector.detect(createDocument(content));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(entities).toHaveLength(2);
    expect(entities[0]).toMatchObject({
      type: "person",
      originalValue: "Steve Tran",
      source: "presidio",
    });
    expect(entities[1]).toMatchObject({
      type: "email",
      originalValue: "steve@example.com",
    });
  });

  it("applies the score threshold", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([{ entity_type: "PERSON", start: 0, end: 3, score: 0.2 }]),
    );
    const detector = new PresidioDetector({ fetch: fetchMock, scoreThreshold: 0.5 });
    const { entities } = await detector.detect(createDocument("Bob"));
    expect(entities).toHaveLength(0);
  });

  it("throws a clear error when the service is unreachable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const detector = new PresidioDetector({ fetch: fetchMock });
    await expect(detector.detect(createDocument("x"))).rejects.toThrow(
      /Presidio analyze request .* failed: ECONNREFUSED/,
    );
  });

  it("throws on a non-OK HTTP response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null, false, 500));
    const detector = new PresidioDetector({ fetch: fetchMock });
    await expect(detector.detect(createDocument("x"))).rejects.toThrow(/500/);
  });
});
