/** Public API option/result shapes for the top-level Veil facade. */

import type {
  VeilAuditEntry,
  VeilClassificationLevel,
  VeilDocument,
  VeilMapping,
  VeilPolicy,
} from "./document.js";

export interface VeilCreateOptions {
  /** Manual tags merged with automatic tags (FR-2). */
  tags?: string[];
  /** Arbitrary metadata attached to the document. */
  metadata?: Record<string, unknown>;
  /** Manual classification override (FR-4). */
  classification?: VeilClassificationLevel;
  policy?: VeilPolicy;
}

export interface VeilProcessOptions extends VeilCreateOptions {
  content: string;
  /** Named profile assembling detectors, transformers, and policy. */
  profile?: string;
}

export interface VeilProcessResult {
  document: VeilDocument;
  /** Content after transformers ran — safe to send to an external AI. */
  transformedContent: string;
  mappings: VeilMapping[];
  classification: VeilClassificationLevel;
  tags: string[];
  audit: VeilAuditEntry[];
}
