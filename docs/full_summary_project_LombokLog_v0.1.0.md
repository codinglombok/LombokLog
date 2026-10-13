# Full Summary LombokLog v0.1.0

## What it is

A structured logging core: RFC 5424 levels, always-on secret redaction, message interpolation, and single-line JSON, line and logfmt formatters that are identical across languages.

## Why it exists

Secrets leak most often through logs because a context object is logged whole without being inspected. Redaction that has to be remembered and switched on gets forgotten. In addition, services in different languages produce slightly different log lines for the same data, so parsers in the aggregator have to handle many variations.

## Main features

See the README (Features section). All features are covered by vectors.

## Current status

Complete code for Rust and TypeScript; passes 290 vector cases; not yet published to any registry; does not yet meet the release score rule (see `TECH_DEBT.md`).

## Example users

See the README (usage scenarios).

## Known Limitations

- Redaction is based on key names; secrets in message text or under neutral keys are not detected.
- Substring matching is blunt: `author` and `shipping` are also masked.
- No file rotation, asynchronous buffering, sampling or network delivery.
- `logfmt` does not prevent a context key from colliding with a built-in key.
- The full RFC 5424 syslog format (PRI, structured data) is not available yet.
- Only two ports (Rust, TypeScript); fuzzing is pseudo-fuzzing, not `cargo-fuzz`; no third-party audit; coverage not measured yet.

## More information

`SPEC_`, `API_`, `development_ide_`.

## Gap vs comparators (U6)

The comparison is qualitative and based on general knowledge of each category of library; it has not been verified feature by feature on 2026-10-07.

| Comparator (category) | What the comparator has that LombokLog does not | What LombokLog offers |
|---|---|---|
| Single-language loggers (pino, winston, tracing, slog, Monolog) | Transports and rotation, sampling, spans and traces, framework integration, measured performance | A cross-language format contract with shared vectors; mandatory redaction; a `no_std + alloc` core; no dependencies |
| Standalone redaction libraries | Value-based pattern detection (card numbers, JWTs) | Redaction integrated into the render path so it cannot be skipped |
