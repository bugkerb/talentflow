# AI screening harness

The screening core is provider-agnostic. `createScreeningService` accepts a `ScreeningAdapter` and validates both input and output at the boundary with the strict schemas in `src/domain/ai-schemas.ts`.

The prompt contract is versioned as `ai-screening-v1`. Resume text is explicitly treated as untrusted evidence, so prompt-injection content cannot change the screening instructions. The deterministic fixture adapter supports `strong`, `weak`, `missing`, `prompt-injection`, and `malformed` cases without network access or secrets.

Anthropic and OpenRouter adapters implement the same interface. They accept an injected `fetcher` for deterministic tests; production callers may use the default runtime fetch and must supply the API key through environment-backed configuration. Provider failures map to stable `ScreeningError` codes: `PROVIDER_AUTH`, `PROVIDER_RATE_LIMIT`, `PROVIDER_UNAVAILABLE`, or `PROVIDER_ERROR`. Invalid local input maps to `INVALID_INPUT`; invalid provider JSON maps to `MALFORMED_OUTPUT`.

Run the bounded harness with:

```text
npm test -- --run tests/unit/ai
npm run typecheck
```
