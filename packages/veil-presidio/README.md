# @theaiinc/veil-presidio

[Microsoft Presidio](https://microsoft.github.io/presidio/)-backed PII detector for [Veil](https://www.npmjs.com/package/@theaiinc/veil). Posts document content to a running Presidio **Analyzer** and maps recognized entities (people, emails, phones, locations, credit cards, …) into `VeilEntity` results.

Presidio is a Python service, so this package is a thin HTTP client — you run Presidio yourself (locally via Docker, or anywhere reachable). There is **no silent fallback**: if the service is unreachable or errors, `detect()` throws so you can decide how to proceed.

## Install

```bash
npm install @theaiinc/veil @theaiinc/veil-presidio
```

## Run Presidio locally

```yaml
# docker-compose.yml
services:
  presidio-analyzer:
    image: mcr.microsoft.com/presidio-analyzer:latest
    ports: ["5002:3000"]
  presidio-anonymizer:
    image: mcr.microsoft.com/presidio-anonymizer:latest
    ports: ["5001:3000"]
```

```bash
docker compose up -d   # analyzer on :5002
```

## Usage

```ts
import { Veil } from "@theaiinc/veil";
import { PresidioDetector } from "@theaiinc/veil-presidio";

const veil = new Veil();
veil.registerDetector(
  new PresidioDetector({ analyzerUrl: "http://localhost:5002" }),
);

const result = await veil.process({
  content: "Contact Steve Tran at steve@example.com",
  profile: "public-cloud",
});

result.transformedContent;
// "Contact <person:1> at <email:1>"
```

## Options

```ts
new PresidioDetector({
  analyzerUrl: "http://localhost:5002", // Presidio Analyzer base URL
  language: "en",                       // language passed to /analyze
  scoreThreshold: 0,                    // drop results below this score (0..1)
  timeoutMs: 10_000,                    // request timeout
  fetch: customFetch,                   // injectable fetch (Node 18+ has it built in)
});
```

Runs on Node 18+ (uses the built-in `fetch`); no SDK dependency.

## License

MIT
