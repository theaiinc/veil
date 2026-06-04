import type {
  VeilDetectionResult,
  VeilDetector,
  VeilDocument,
  VeilEntity,
} from "@theaiinc/veil";
import { createId } from "@theaiinc/veil";
import { mapPresidioType } from "./entity-map.js";

export interface PresidioDetectorOptions {
  /** Base URL of the Presidio Analyzer service. */
  analyzerUrl?: string;
  /** Language passed to the analyzer. */
  language?: string;
  /** Drop results below this score (Presidio scores are 0..1). */
  scoreThreshold?: number;
  /** Override for the request timeout in milliseconds. */
  timeoutMs?: number;
  /** Injectable fetch, primarily for testing. Defaults to global fetch. */
  fetch?: typeof fetch;
}

/** Shape of a single result from Presidio Analyzer's `/analyze` endpoint. */
interface PresidioResult {
  entity_type: string;
  start: number;
  end: number;
  score: number;
}

const DEFAULT_ANALYZER_URL = "http://localhost:5002";

/**
 * Detector backed by a running Microsoft Presidio Analyzer service. Posts the
 * document content to `/analyze` and maps each recognized span to a VeilEntity.
 * No silent fallback: if the service is unreachable or returns an error, this
 * throws so the caller can decide how to proceed. Use docker-compose at the
 * repo root to run Presidio locally.
 */
export class PresidioDetector implements VeilDetector {
  readonly name = "presidio";
  private readonly analyzerUrl: string;
  private readonly language: string;
  private readonly scoreThreshold: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: PresidioDetectorOptions = {}) {
    this.analyzerUrl = (options.analyzerUrl ?? DEFAULT_ANALYZER_URL).replace(/\/$/, "");
    this.language = options.language ?? "en";
    this.scoreThreshold = options.scoreThreshold ?? 0;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    const f = options.fetch ?? globalThis.fetch;
    if (!f) {
      throw new Error(
        "No fetch implementation available. Use Node 18+ or pass options.fetch.",
      );
    }
    this.fetchImpl = f;
  }

  async detect(document: VeilDocument): Promise<VeilDetectionResult> {
    const results = await this.analyze(document.content);
    const entities: VeilEntity[] = results
      .filter((r) => r.score >= this.scoreThreshold)
      .map((r) => ({
        id: createId("ent"),
        type: mapPresidioType(r.entity_type),
        originalValue: document.content.slice(r.start, r.end),
        tokenizedValue: "",
        confidence: r.score,
        source: this.name,
        start: r.start,
        end: r.end,
      }));

    return { entities };
  }

  private async analyze(text: string): Promise<PresidioResult[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.analyzerUrl}/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, language: this.language }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Presidio analyzer responded ${response.status} ${response.statusText}`,
        );
      }
      return (await response.json()) as PresidioResult[];
    } catch (error) {
      throw new Error(
        `Presidio analyze request to ${this.analyzerUrl} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
