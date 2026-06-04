# @theaiinc/veil-regex

Offline, dependency-free regex detector for [Veil](https://www.npmjs.com/package/@theaiinc/veil). Detects structured PII and secrets with zero network calls.

Detects:

- **Email** addresses
- **URLs**
- **Phone** numbers
- **Credit cards** (validated with the Luhn checksum to cut false positives)
- **API keys** (common shapes — `sk-…`, `AKIA…`, `ghp_…`, `AIza…`)

## Install

```bash
npm install @theaiinc/veil @theaiinc/veil-regex
```

## Usage

```ts
import { Veil } from "@theaiinc/veil";
import { RegexDetector } from "@theaiinc/veil-regex";

const veil = new Veil();
veil.registerDetector(new RegexDetector());

const result = await veil.process({
  content: "Reach me at jane@example.com or token sk-ABCDEF0123456789abcd",
  profile: "public-cloud",
});

result.transformedContent;
// "Reach me at <email:1> or token <api-key:1>"
```

Each match is returned as a `VeilEntity` with `source: "regex"`, a confidence score, and character offsets so the core pipeline can merge it with results from other detectors.

## Custom patterns

Pass your own pattern set (replacing or extending the defaults):

```ts
import { RegexDetector, DEFAULT_PATTERNS } from "@theaiinc/veil-regex";

const detector = new RegexDetector([
  ...DEFAULT_PATTERNS,
  {
    name: "employee-id",
    type: "custom",
    pattern: /\bEMP-\d{6}\b/g,   // the `g` flag is required
    confidence: 0.9,
  },
]);
```

`luhnValid(value)` is also exported if you want the credit-card checksum on its own.

## License

MIT
