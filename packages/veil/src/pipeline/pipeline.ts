import type {
  VeilClassification,
  VeilDocument,
  VeilPolicyAction,
  VeilTag,
} from "../types/index.js";
import type { VeilRegistry } from "../registry/registry.js";
import { audit } from "../util/audit.js";
import { effectiveLevel } from "../builtin/default-policy.js";
import { mergeEntitiesByConfidence } from "./merge.js";

export interface RunResult {
  document: VeilDocument;
  policy: VeilPolicyAction;
}

/**
 * Runs the Veil processing pipeline in PRD order:
 *   taggers → detectors → classifiers → policy engine → transformers.
 * Every stage appends audit entries. The document is mutated in place and also
 * returned. Transformers only run when policy permits transformation; a
 * `block` decision halts before transformation.
 */
export async function runPipeline(
  document: VeilDocument,
  registry: VeilRegistry,
): Promise<RunResult> {
  await tagStage(document, registry);
  await detectStage(document, registry);
  await classifyStage(document, registry);
  const policy = await policyStage(document, registry);

  if (policy !== "block") {
    await transformStage(document, registry);
  } else {
    audit(document, { stage: "transform", detail: "skipped — policy=block" });
  }

  for (const auditor of registry.auditors) {
    await auditor.record(document);
  }

  return { document, policy };
}

async function tagStage(document: VeilDocument, registry: VeilRegistry): Promise<void> {
  for (const tagger of registry.taggers) {
    const tags = await tagger.tag(document);
    mergeTags(document, tags);
    audit(document, {
      stage: "tag",
      plugin: tagger.name,
      tags: tags.map((t) => t.name),
    });
  }
}

async function detectStage(
  document: VeilDocument,
  registry: VeilRegistry,
): Promise<void> {
  const collected = [...document.entities];

  for (const detector of registry.detectors) {
    const result = await detector.detect(document);
    collected.push(...result.entities);
    if (result.tags) mergeTags(document, result.tags);
    audit(document, {
      stage: "detect",
      plugin: detector.name,
      detector: detector.name,
      detail: `${result.entities.length} entities`,
    });
  }

  document.entities = mergeEntitiesByConfidence(collected);

  // PII is implied by the presence of any detected entity (FR-1).
  if (document.entities.length > 0 && !document.tags.some((t) => t.name === "pii")) {
    const confidence = Math.max(...document.entities.map((e) => e.confidence));
    mergeTags(document, [{ name: "pii", confidence, source: "pipeline" }]);
  }
}

async function classifyStage(
  document: VeilDocument,
  registry: VeilRegistry,
): Promise<void> {
  // A manual classification override is honored above all automatic ones (FR-4).
  if (document.classifications.some((c) => c.manual)) {
    audit(document, {
      stage: "classify",
      detail: "manual override present — automatic classification skipped",
      classification: effectiveLevel(document),
    });
    return;
  }

  for (const classifier of registry.classifiers) {
    const result: VeilClassification = await classifier.classify(document);
    document.classifications.push(result);
    audit(document, {
      stage: "classify",
      plugin: classifier.name,
      classification: result.level,
      confidence: result.confidence,
    });
  }
}

async function policyStage(
  document: VeilDocument,
  registry: VeilRegistry,
): Promise<VeilPolicyAction> {
  if (registry.policies.length === 0) return "review";

  // Most restrictive action across providers wins.
  const ranking: VeilPolicyAction[] = [
    "allow",
    "abstract",
    "tokenize",
    "review",
    "local-only",
    "block",
  ];
  let decision: VeilPolicyAction = "allow";

  for (const provider of registry.policies) {
    const action = await provider.evaluate(document);
    if (ranking.indexOf(action) > ranking.indexOf(decision)) decision = action;
    audit(document, {
      stage: "policy",
      plugin: provider.name,
      policy: action,
      classification: effectiveLevel(document),
    });
  }

  return decision;
}

async function transformStage(
  document: VeilDocument,
  registry: VeilRegistry,
): Promise<void> {
  for (const transformer of registry.transformers) {
    await transformer.transform(document);
    audit(document, { stage: "transform", plugin: transformer.name, transformer: transformer.name });
  }
}

/** Merges new tags into the document, keeping the highest confidence per name. */
function mergeTags(document: VeilDocument, incoming: VeilTag[]): void {
  for (const tag of incoming) {
    const existing = document.tags.find((t) => t.name === tag.name);
    if (!existing) {
      document.tags.push(tag);
    } else if (tag.confidence > existing.confidence) {
      existing.confidence = tag.confidence;
      existing.manual = existing.manual || tag.manual;
    }
  }
}
