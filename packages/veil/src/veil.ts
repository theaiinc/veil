import type {
  VeilAuditEntry,
  VeilAuditor,
  VeilClassifier,
  VeilCreateOptions,
  VeilDetector,
  VeilDocument,
  VeilPolicyProvider,
  VeilProcessOptions,
  VeilProcessResult,
  VeilRehydrator,
  VeilTagger,
  VeilTransformer,
} from "./types/index.js";
import { VeilRegistry } from "./registry/registry.js";
import { createDocument } from "./document.js";
import { runPipeline } from "./pipeline/pipeline.js";
import { effectiveLevel } from "./builtin/default-policy.js";
import { audit } from "./util/audit.js";
import { isProfileName, PROFILES } from "./profiles/profiles.js";
import {
  KeywordTagger,
  MaskPiiTransformer,
  MemoryAuditor,
  RuleAbstractionTransformer,
  RuleClassifier,
  DefaultPolicyProvider,
  TokenRehydrator,
} from "./builtin/index.js";

/**
 * Top-level Veil facade. Holds a default registry seeded with the built-in
 * plugins; providers (detectors) are registered by the application. Profiles
 * supply an alternative registry while reusing whatever detectors have been
 * registered (Success Criteria #3, #5).
 */
export class Veil {
  private readonly registry: VeilRegistry;

  constructor(registry?: VeilRegistry) {
    this.registry = registry ?? Veil.defaultRegistry();
  }

  /** A registry wired with every built-in plugin except detectors. */
  static defaultRegistry(): VeilRegistry {
    return new VeilRegistry()
      .registerTagger(new KeywordTagger())
      .registerClassifier(new RuleClassifier())
      .registerPolicy(new DefaultPolicyProvider())
      .registerTransformer(new MaskPiiTransformer())
      .registerTransformer(new RuleAbstractionTransformer())
      .registerRehydrator(new TokenRehydrator())
      .registerAuditor(new MemoryAuditor());
  }

  createDocument(content: string, options?: VeilCreateOptions): VeilDocument {
    return createDocument(content, options);
  }

  /** Runs tagging, detection, and classification, leaving content untouched. */
  async classify(document: VeilDocument, options: { classification?: VeilProcessOptions["classification"] } = {}): Promise<VeilDocument> {
    if (options.classification) {
      document.classifications.unshift({
        level: options.classification,
        confidence: 1,
        manual: true,
        source: "manual",
      });
    }
    const detectOnly = this.registry.clone();
    detectOnly.transformers.length = 0; // classify must not mutate content
    await runPipeline(document, detectOnly);
    return document;
  }

  /** Runs the full pipeline including transformers. */
  async transform(document: VeilDocument): Promise<VeilDocument> {
    const { document: out } = await runPipeline(document, this.registry);
    return out;
  }

  /** Restores original values in an AI response (FR-7). */
  async rehydrate(document: VeilDocument, response: string): Promise<string> {
    let output = response;
    for (const rehydrator of this.registry.rehydrators) {
      output = await rehydrator.rehydrate(document, output);
    }
    audit(document, { stage: "rehydrate", detail: "response rehydrated" });
    return output;
  }

  /** One-shot: create → classify → transform → return safe context + mappings. */
  async process(options: VeilProcessOptions): Promise<VeilProcessResult> {
    const registry = this.resolveRegistry(options.profile);
    const document = createDocument(options.content, options);

    await runPipeline(document, registry);

    return {
      document,
      transformedContent: document.content,
      mappings: document.mappings,
      classification: effectiveLevel(document),
      tags: document.tags.map((t) => t.name),
      audit: document.audits,
    };
  }

  /** Builds the registry for a run: a profile's registry plus user detectors. */
  private resolveRegistry(profile?: string): VeilRegistry {
    if (!profile) return this.registry;
    if (!isProfileName(profile)) {
      throw new Error(`Unknown Veil profile: "${profile}"`);
    }
    const built = PROFILES[profile]();
    for (const detector of this.registry.detectors) built.registerDetector(detector);
    return built;
  }

  registerDetector(detector: VeilDetector): this {
    this.registry.registerDetector(detector);
    return this;
  }
  registerTagger(tagger: VeilTagger): this {
    this.registry.registerTagger(tagger);
    return this;
  }
  registerClassifier(classifier: VeilClassifier): this {
    this.registry.registerClassifier(classifier);
    return this;
  }
  registerTransformer(transformer: VeilTransformer): this {
    this.registry.registerTransformer(transformer);
    return this;
  }
  registerPolicy(policy: VeilPolicyProvider): this {
    this.registry.registerPolicy(policy);
    return this;
  }
  registerAuditor(auditor: VeilAuditor): this {
    this.registry.registerAuditor(auditor);
    return this;
  }
  registerRehydrator(rehydrator: VeilRehydrator): this {
    this.registry.registerRehydrator(rehydrator);
    return this;
  }

  /** Audit entries collected by the first in-memory auditor, if present. */
  auditLog(): readonly VeilAuditEntry[] {
    const auditor = this.registry.auditors.find((a) => a instanceof MemoryAuditor);
    return auditor instanceof MemoryAuditor ? auditor.entries() : [];
  }
}

/** Convenience singleton mirroring the PRD's `Veil.process(...)` examples. */
export const veil = new Veil();
