import type {
  VeilAuditor,
  VeilClassifier,
  VeilDetector,
  VeilPolicyProvider,
  VeilRehydrator,
  VeilTagger,
  VeilTransformer,
} from "../types/index.js";

/**
 * Holds the registered plugins that the pipeline runs. Each Veil instance owns
 * a default registry; `process()` may receive an override registry built by a
 * profile. New providers are added without touching the pipeline (Success
 * Criteria #3).
 */
export class VeilRegistry {
  readonly detectors: VeilDetector[] = [];
  readonly taggers: VeilTagger[] = [];
  readonly classifiers: VeilClassifier[] = [];
  readonly transformers: VeilTransformer[] = [];
  readonly policies: VeilPolicyProvider[] = [];
  readonly auditors: VeilAuditor[] = [];
  readonly rehydrators: VeilRehydrator[] = [];

  registerDetector(detector: VeilDetector): this {
    this.detectors.push(detector);
    return this;
  }

  registerTagger(tagger: VeilTagger): this {
    this.taggers.push(tagger);
    return this;
  }

  registerClassifier(classifier: VeilClassifier): this {
    this.classifiers.push(classifier);
    return this;
  }

  registerTransformer(transformer: VeilTransformer): this {
    this.transformers.push(transformer);
    return this;
  }

  registerPolicy(policy: VeilPolicyProvider): this {
    this.policies.push(policy);
    return this;
  }

  registerAuditor(auditor: VeilAuditor): this {
    this.auditors.push(auditor);
    return this;
  }

  registerRehydrator(rehydrator: VeilRehydrator): this {
    this.rehydrators.push(rehydrator);
    return this;
  }

  /** Produces an independent copy so profiles can extend without side effects. */
  clone(): VeilRegistry {
    const copy = new VeilRegistry();
    copy.detectors.push(...this.detectors);
    copy.taggers.push(...this.taggers);
    copy.classifiers.push(...this.classifiers);
    copy.transformers.push(...this.transformers);
    copy.policies.push(...this.policies);
    copy.auditors.push(...this.auditors);
    copy.rehydrators.push(...this.rehydrators);
    return copy;
  }
}
