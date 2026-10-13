# LombokLog

[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue)](LICENSE-APACHE)

A structured logging core: eight RFC 5424 levels, **always-on secret redaction**, PSR-3 style message interpolation, and three single-line formatters (JSON, line, logfmt). No runtime dependencies and no I/O in the core. The output is byte-identical across language ports.

Part of the [Lombok Ecosystem](https://github.com/codinglombok).

## Why this library?

Logs are where secrets leak most easily: nobody writes `log("password: ...")`, but many people write `log("login failed", request.body)` and the password rides along inside an object that is never inspected. LombokLog applies key-name based redaction **before** the record is rendered, and provides no switch to turn it off.

The second problem is format drift between languages. A Rust service and a Node service that write to the same aggregator often produce slightly different lines (escaping, number format, key order). LombokLog defines the output format normatively and proves it with shared vectors.

Usage scenarios:

- **Web services and APIs**: access and error logs with structured context; `Authorization` headers and cookies are masked automatically.
- **CLI tools and batch jobs**: a `line` format that is easy to read in a terminal, a `json` format for files.
- **Serverless and edge**: a dependency-free core, one line per record for the platform log collector.
- **Embedded devices**: a `no_std + alloc` Rust core with `MemorySink` or a custom sink.
- **Observability pipelines**: a `logfmt` format for tools that read `key=value` pairs.

Other dependents in the Lombok Ecosystem are listed in `docs/map_LombokLog_v0.1.0.md`.

## Features

Every feature below is covered by vectors in `vectors/` and by TypeScript tests.

- RFC 5424 levels (`emergency` .. `debug`), `parseLevel` with ASCII case folding, `severity`, `isEnabled`.
- `redact`: a key that contains any of 19 sensitive substrings (ASCII, case-insensitive) is replaced by `[redacted]`; extra keys add to, and never replace, the built-in list; depth beyond 16 becomes `[truncated]`.
- `interpolate`: `{key}` placeholders are filled with scalar values from the context; values are never re-expanded.
- `formatRecord`: `json`, `line` and `logfmt` formats; always exactly one line (newlines and control characters are escaped).
- `formatTime`: epoch milliseconds to ISO 8601 UTC with milliseconds.
- Number formatting and string escaping are identical to `JSON.stringify` in every port.
- A runtime `Logger` with a minimum level, an injectable clock, base context and sinks (`MemorySink`, `ConsoleSink`; Rust: `MemorySink`, `WriterSink`).

## Installation

Not published to any registry yet. After the first release:

```bash
npm install lomboklog      # TypeScript / JavaScript
cargo add lomboklog        # Rust
```

## Quick Start

### TypeScript

```ts
import { Logger, MemorySink, formatRecord } from "lomboklog";

const sink = new MemorySink();
const log = new Logger({ sink, format: "line", minLevel: "info", clock: () => 1791331200000 });

log.warning("login failed for {user}", { user: "ana", password: "hunter2" });
// 2026-10-07T00:00:00.000Z WARNING [app] login failed for ana {"user":"ana","password":"[redacted]"}

formatRecord({ time: "2026-10-07T00:00:00.000Z", level: "info", message: "ok", context: { ms: 12 } }, "logfmt");
// time=2026-10-07T00:00:00.000Z level=info channel=app msg=ok ms=12
```

### Rust

```rust
use lomboklog::{format_record, parse_json, Format, RedactOptions};

let rec = parse_json(r#"{"time":"2026-10-07T00:00:00.000Z","level":"error","message":"db down","context":{"token":"t"}}"#).unwrap();
let line = format_record(&rec, Format::Json, &RedactOptions::default()).unwrap();
assert_eq!(line, r#"{"time":"2026-10-07T00:00:00.000Z","level":"error","channel":"app","message":"db down","context":{"token":"[redacted]"}}"#);
```

## Port status

| Port | Status | Evidence |
|---|---|---|
| Rust (`no_std + alloc`) | YES, passes the vectors | `rust/tests/vectors.rs` runs every vector; `thumbv7em-none-eabi` build |
| TypeScript | YES, passes the vectors | `typescript/test/vectors.test.ts` runs every vector, plus `Logger` and fuzz tests |
| Python, Go, PHP, Java, Kotlin, C#, C/C++, Swift, Perl | NOT YET | No code; planned once the contract is stable (see `docs/development_ide_LombokLog_v0.1.0.md`) |

Vectors: 290 cases (200 golden cases with hand-written expectations, 90 generated regression cases).

## Standards implemented

RFC 5424 (severity names and order), RFC 8259 (JSON output), ISO 8601 / RFC 3339 (timestamps). The output contract is defined by `docs/SPEC_LombokLog_v0.1.0.md`.

## Known limitations

- Redaction is based on key names, not on value content. Secrets inside message text or under neutrally named keys are not detected.
- Substring matching is deliberately blunt: `author` and `shipping` are also masked (`auth`, `pin`).
- There is no file rotation, asynchronous buffering or network delivery; that is the job of an application-owned sink.
- The `logfmt` format does not prevent a context key from colliding with a built-in key (`level`, `msg`).
- Only Rust and TypeScript have code.
- No third-party security audit yet. Fuzzing is pseudo-fuzzing, not `cargo-fuzz`.

## Lombok Ecosystem

LombokLog has no required dependency on other Lombok libraries (L0). Other libraries may use it optionally; the dependents are listed in `docs/map_LombokLog_v0.1.0.md`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

`Apache-2.0 OR MIT`. See [LICENSE-APACHE](LICENSE-APACHE) and [LICENSE-MIT](LICENSE-MIT).
