# Development IDE LombokLog v0.1.0

## 1. Roadmap

| Version | Content |
|---|---|
| 0.1.1 | Close the release conditions: CI run, `doctor docs/privacy/style`, coverage measured, a `cargo-fuzz` target |
| 0.2.0 | RFC 5424 syslog and GELF formats; a file sink with rotation (std); Python, Go and PHP ports |
| 0.3.0 | Optional value-pattern redaction (card numbers with Luhn, JWTs); sampling; LombokLocale integration |

## 2. Deferred scope

See the Non-goals section of the SPEC and the README (Known limitations).

## 3. Design principles for contributors

- Contract first, tests first; all ports pass the same vectors.
- No runtime dependencies; dev dependencies are recorded.
- Core functions are pure: the clock, randomness and I/O are supplied by the caller.
- Every output line stays one line whatever the input.
- The list of sensitive keys only grows; it never shrinks through options.
- English is the default language for all documents, code comments and messages.

## 4. How to contribute

See `CONTRIBUTING.md`.

## 5. Open questions

- Should key matching be token-based (so that `pin` does not match `shipping`), at the cost of a greater risk of leaks?
- Does `logfmt` need a prefix for context keys (`ctx.`) so that they do not collide with built-in keys?
