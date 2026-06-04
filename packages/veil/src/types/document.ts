/**
 * Core artifact types. Per the Veil PRD, no component operates directly on raw
 * strings — every stage of the pipeline reads from and writes to a VeilDocument.
 */

export type VeilClassificationLevel =
  | "PUBLIC"
  | "INTERNAL"
  | "CONFIDENTIAL"
  | "SECRET"
  | "RESTRICTED";

export type VeilEntityType =
  | "person"
  | "organization"
  | "email"
  | "phone"
  | "address"
  | "url"
  | "api-key"
  | "database"
  | "service"
  | "repository"
  | "custom";

/** Action a policy may mandate for a given classification level. */
export type VeilPolicyAction =
  | "allow"
  | "abstract"
  | "tokenize"
  | "local-only"
  | "block"
  | "review";

export interface VeilEntity {
  id: string;
  type: VeilEntityType;
  originalValue: string;
  /** Stable token that replaces originalValue in transformed content, e.g. `<person:1>`. */
  tokenizedValue: string;
  confidence: number;
  /** Identifier of the detector that produced this entity, e.g. "regex", "presidio". */
  source?: string;
  /** Character offsets into VeilDocument.content, when known. Enables confidence merging. */
  start?: number;
  end?: number;
}

export interface VeilMapping {
  token: string;
  originalValue: string;
}

/** A descriptor of what content is, e.g. "pii", "source-code". */
export interface VeilTag {
  name: string;
  confidence: number;
  /** Whether the tag was supplied manually by a developer (FR-2). */
  manual?: boolean;
  source?: string;
}

export interface VeilClassification {
  level: VeilClassificationLevel;
  confidence: number;
  /** Whether the level was set by a manual override (FR-4). */
  manual?: boolean;
  source?: string;
}

export interface VeilTransformation {
  /** Name of the transformer that ran, e.g. "mask-pii". */
  transformer: string;
  /** Entity ids / token names affected by this transformation. */
  affected: string[];
  timestamp: string;
}

export interface VeilAuditEntry {
  timestamp: string;
  /** Pipeline stage, e.g. "tag", "detect", "classify", "policy", "transform". */
  stage: string;
  /** Plugin that produced the entry, when applicable. */
  plugin?: string;
  classification?: VeilClassificationLevel;
  tags?: string[];
  policy?: VeilPolicyAction;
  detector?: string;
  transformer?: string;
  confidence?: number;
  detail?: string;
}

/** Maps each classification level to the action policy permits for it. */
export type VeilPolicy = Partial<Record<VeilClassificationLevel, VeilPolicyAction>>;

export interface VeilDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  tags: VeilTag[];
  classifications: VeilClassification[];
  entities: VeilEntity[];
  mappings: VeilMapping[];
  transformations: VeilTransformation[];
  audits: VeilAuditEntry[];
  policy?: VeilPolicy;
}
