/**
 * Plugin contracts. Every major system in Veil is replaceable; all plugins
 * read and write VeilDocument so they can be composed in any order.
 */

import type {
  VeilClassification,
  VeilDocument,
  VeilEntity,
  VeilPolicyAction,
  VeilTag,
} from "./document.js";

export interface VeilDetectionResult {
  entities: VeilEntity[];
  tags?: VeilTag[];
}

/** A named plugin. The name appears in audit entries and registry diagnostics. */
export interface VeilPlugin {
  readonly name: string;
}

export interface VeilDetector extends VeilPlugin {
  detect(document: VeilDocument): Promise<VeilDetectionResult>;
}

export interface VeilTagger extends VeilPlugin {
  tag(document: VeilDocument): Promise<VeilTag[]>;
}

export interface VeilClassifier extends VeilPlugin {
  classify(document: VeilDocument): Promise<VeilClassification>;
}

export interface VeilTransformer extends VeilPlugin {
  transform(document: VeilDocument): Promise<VeilDocument>;
}

/** Decides, per classification level, what may be done with the content. */
export interface VeilPolicyProvider extends VeilPlugin {
  evaluate(document: VeilDocument): Promise<VeilPolicyAction>;
}

export interface VeilAuditor extends VeilPlugin {
  record(document: VeilDocument): Promise<void>;
}

export interface VeilRehydrator extends VeilPlugin {
  rehydrate(document: VeilDocument, response: string): Promise<string>;
}
