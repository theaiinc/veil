import type { VeilPolicy } from "../types/index.js";
import { VeilRegistry } from "../registry/registry.js";
import {
  DefaultPolicyProvider,
  KeywordTagger,
  MaskPiiTransformer,
  MemoryAuditor,
  RuleAbstractionTransformer,
  RuleClassifier,
  TokenRehydrator,
} from "../builtin/index.js";

export type ProfileName = "public-cloud" | "enterprise" | "air-gapped";

/** Builds a base registry wired with the built-in plugins and a policy map. */
function baseRegistry(policy: VeilPolicy): VeilRegistry {
  return new VeilRegistry()
    .registerTagger(new KeywordTagger())
    .registerClassifier(new RuleClassifier())
    .registerPolicy(new DefaultPolicyProvider(policy))
    .registerTransformer(new MaskPiiTransformer())
    .registerTransformer(new RuleAbstractionTransformer())
    .registerRehydrator(new TokenRehydrator())
    .registerAuditor(new MemoryAuditor());
}

/**
 * Predefined configurations. Detectors are intentionally not baked in — they
 * live in provider packages (@theaiinc/veil-regex, @theaiinc/veil-presidio) and
 * are merged in by the Veil facade from whatever the caller has registered.
 */
export const PROFILES: Record<ProfileName, () => VeilRegistry> = {
  // Allows external AI: mask PII, abstract domain terms, restrict secrets.
  "public-cloud": () =>
    baseRegistry({
      PUBLIC: "allow",
      INTERNAL: "abstract",
      CONFIDENTIAL: "tokenize",
      SECRET: "local-only",
      RESTRICTED: "block",
    }),

  // External AI with stricter controls: tokenize from INTERNAL up.
  enterprise: () =>
    baseRegistry({
      PUBLIC: "allow",
      INTERNAL: "tokenize",
      CONFIDENTIAL: "tokenize",
      SECRET: "local-only",
      RESTRICTED: "block",
    }),

  // Disallows external AI entirely: nothing leaves the boundary.
  "air-gapped": () =>
    baseRegistry({
      PUBLIC: "local-only",
      INTERNAL: "local-only",
      CONFIDENTIAL: "local-only",
      SECRET: "local-only",
      RESTRICTED: "block",
    }),
};

export function isProfileName(value: string): value is ProfileName {
  return value in PROFILES;
}
