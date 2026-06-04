# Veil

Provider-agnostic data protection, classification, abstraction, transformation, and rehydration framework for AI-enabled applications. Veil turns sensitive content into AI-safe representations while preserving semantic meaning and the ability to restore context after AI processing.

## Packages

| Package | Description |
| --- | --- |
| [`@theaiinc/veil`](packages/veil) | Core framework: `VeilDocument`, plugin registry, processing pipeline, built-in tagger/classifier/policy/tokenizer/rehydrator/auditor, profiles, and the `Veil` facade. |
| [`@theaiinc/veil-regex`](packages/veil-regex) | Offline regex detector — email, phone, URL, credit card (Luhn-validated), API keys. |
| [`@theaiinc/veil-presidio`](packages/veil-presidio) | HTTP client detector for a running [Microsoft Presidio](https://microsoft.github.io/presidio/) Analyzer. |

## Quick start

```ts
import { Veil } from "@theaiinc/veil";
import { RegexDetector } from "@theaiinc/veil-regex";

const veil = new Veil();
veil.registerDetector(new RegexDetector());

const result = await veil.process({
  content: "Email jane@example.com about the billing issue.",
  profile: "public-cloud",
});

result.transformedContent; // "Email <email:1> about the billing issue."
result.mappings;           // [{ token: "<email:1>", originalValue: "jane@example.com" }]
result.classification;     // "CONFIDENTIAL"

// After the external AI responds, restore context:
const restored = await veil.rehydrate(result.document, aiResponse);
```

## Pipeline

```
Raw content → VeilDocument → taggers → detectors → classifiers
→ policy engine → transformers → safe context → external AI
→ response → rehydrators → final output
```

Every stage reads and writes a `VeilDocument`; no component operates on raw strings. Each stage appends audit entries.

## Profiles

- **public-cloud** — masks PII, abstracts domain terms, allows external AI.
- **enterprise** — stricter: tokenizes from `INTERNAL` upward.
- **air-gapped** — everything `local-only`; nothing leaves the boundary.

## Development

```bash
pnpm install
pnpm build       # nx run-many -t build  (tsup → dual ESM + CJS + d.ts)
pnpm test        # nx run-many -t test   (vitest)
pnpm typecheck   # nx run-many -t typecheck
```

### Running Presidio locally

```bash
docker compose up -d   # analyzer on :5002, anonymizer on :5001
```

```ts
import { PresidioDetector } from "@theaiinc/veil-presidio";
veil.registerDetector(new PresidioDetector({ analyzerUrl: "http://localhost:5002" }));
```

## Scope (V1)

Implemented: artifact-based architecture, plugin framework, automatic + manual tagging, automatic + manual classification, policy engine, entity tokenization, rehydration, audit logging, transformer framework (incl. a thin rule-based abstraction default), profiles, regex + Presidio providers.

Deferred: dashboards, database persistence, workflow/agent orchestration, LLM routing, spaCy/Azure/AWS/GCP providers, and LLM-backed abstraction.
