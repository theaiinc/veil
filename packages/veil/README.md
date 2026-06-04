# @theaiinc/veil

Provider-agnostic data protection, classification, abstraction, transformation, and rehydration framework for AI-enabled applications.

Veil turns sensitive content into AI-safe representations while preserving semantic meaning — and lets you restore the original context after the AI responds. Send a problem to an external model without leaking PII, source code, internal architecture, or customer data.

```bash
npm install @theaiinc/veil
# add at least one detector provider:
npm install @theaiinc/veil-regex
```

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

// After the external AI replies, restore the original values:
const restored = await veil.rehydrate(result.document, aiResponse);
```

## How it works

Everything operates on a `VeilDocument` — no stage ever touches a raw string. The pipeline runs in a fixed order and audits every step:

```
raw content → VeilDocument → taggers → detectors → classifiers
→ policy engine → transformers → safe context → external AI
→ response → rehydrators → final output
```

- **Taggers** describe *what* the content is (`pii`, `source-code`, `financial`, …).
- **Detectors** find entities (people, emails, secrets) and contribute them with confidence scores; overlapping detections are merged, highest confidence wins.
- **Classifiers** assign a sensitivity level: `PUBLIC | INTERNAL | CONFIDENTIAL | SECRET | RESTRICTED`.
- **Policy engine** maps the level to an action: `allow | abstract | tokenize | local-only | block | review`.
- **Transformers** produce the safe context — e.g. `mask-pii` replaces `Steve Tran` with `<person:1>`.
- **Rehydrators** reverse the tokens in the model's response.

## Public API

```ts
const veil = new Veil();

veil.createDocument(content, options?);     // build a VeilDocument
await veil.classify(document, options?);    // tag + detect + classify (no mutation)
await veil.transform(document);             // run the full pipeline incl. transformers
await veil.rehydrate(document, response);   // restore original values
await veil.process({ content, profile });   // one-shot → VeilProcessResult
```

`process()` returns `{ document, transformedContent, mappings, classification, tags, audit }`.

### Manual overrides

```ts
// Manual tags merge with automatic ones; manual classification overrides automatic.
await veil.process({
  content,
  tags: ["proprietary", "architecture"],
  classification: "SECRET",
});
```

## Profiles

| Profile | Behavior |
| --- | --- |
| `public-cloud` | Mask PII, abstract domain terms, allow external AI. |
| `enterprise` | Stricter — tokenize from `INTERNAL` upward. |
| `air-gapped` | Everything `local-only`; nothing leaves the boundary. |

## Plugins

Every system is replaceable. Register your own:

```ts
veil.registerDetector(myDetector);
veil.registerTagger(myTagger);
veil.registerClassifier(myClassifier);
veil.registerTransformer(myTransformer);
veil.registerPolicy(myPolicyProvider);
veil.registerAuditor(myAuditor);
veil.registerRehydrator(myRehydrator);
```

Implement the matching interface (`VeilDetector`, `VeilTransformer`, …) — all exported from this package.

## Providers

- [`@theaiinc/veil-regex`](https://www.npmjs.com/package/@theaiinc/veil-regex) — offline regex detector (email, phone, URL, credit card, API keys).
- [`@theaiinc/veil-presidio`](https://www.npmjs.com/package/@theaiinc/veil-presidio) — Microsoft Presidio-backed detector.

## Scope (0.1.0)

Implemented: artifact-based architecture, plugin framework, automatic + manual tagging, automatic + manual classification, policy engine, entity tokenization, rehydration, audit logging, transformer framework (including a thin rule-based abstraction default), profiles.

Not yet included: LLM-backed abstraction, spaCy/Azure/AWS/GCP providers, dashboards, persistence, and orchestration.

## License

MIT
