# API LombokLog v0.1.0

Normative semantics are in `SPEC_LombokLog_v0.1.0.md`; this document only lists the interfaces that are actually exported.

## 1. TypeScript (package `lomboklog`)

Stability: 0.x, may change in minor releases.

### Core (pure)

| Symbol | Signature | Notes |
|---|---|---|
| `parseLevel` | `(level: unknown) => Level` | Canonical name; ASCII case-insensitive. Since 0.1.0 |
| `severity` | `(level: unknown) => number` | 0..7 |
| `isEnabled` | `(level: unknown, minLevel: unknown) => boolean` | |
| `interpolate` | `(message: unknown, context?: unknown) => string` | `{key}` placeholders |
| `redact` | `(context: unknown, options?: RedactOptions) => JsonObject` | |
| `formatTime` | `(epochMillis: unknown) => string` | ISO 8601 UTC |
| `formatRecord` | `(record: unknown, format: unknown, options?: RedactOptions) => string` | Single line |
| `RedactOptions` | `{ redactKeys?: string[]; mask?: string }` | |
| `LogRecord` | `{ time; level; message; channel?; context? }` | |
| `LEVELS`, `FORMATS`, `DEFAULT_SENSITIVE_KEYS`, `DEFAULT_MASK`, `MAX_CONTEXT_DEPTH` | constants | |
| `Level`, `Format`, `Json`, `JsonObject` | types | |
| `LombokLogError` | `extends Error`; `code: ErrorCode`, `messageId: string` | Codes: SPEC section 10 |

### Runtime

| Symbol | Notes |
|---|---|
| `Logger` | `new Logger({ sink, channel?, minLevel?, format?, clock?, redactKeys?, mask?, context? })`; the methods `log(level, message, context?)` and `emergency` .. `debug` return the line, or `null` when below the minimum level; `child(channel)`; `with(context)` |
| `Sink` | `{ write(line: string, level: Level): void }` |
| `MemorySink` | Stores lines in `lines` |
| `ConsoleSink` | `console.error` for `error` and more severe levels, `console.log` otherwise |

## 2. Rust (crate `lomboklog`)

Feature: `std` (default). Without `std`, the crate is `no_std + alloc`.

| Symbol | Notes |
|---|---|
| `Level` (enum), `LEVELS`, `parse_level(&str)`, `Level::severity`, `Level::is_at_least`, `is_enabled(&str, &str)` | Levels |
| `RedactOptions { extra_keys, mask }`, `RedactOptions::from_value`, `redact(&Value, &RedactOptions)` | Redaction |
| `interpolate(&str, Option<&Value>)` | Interpolation |
| `format_time(f64)` | Time |
| `Format` (`Json`, `Line`, `Logfmt`), `Format::parse`, `format_record(&Value, Format, &RedactOptions)` | Rendering |
| `call(fn: &str, args: &[Value]) -> Result<Value, Error>` | Dynamic entry point following the vector convention |
| `json::Value`, `parse_json`, `json::js_number` | Internal JSON; output equivalent to `JSON.stringify` |
| `Logger<S: Sink, C: Fn() -> u64>` | `new(sink, clock)`, `channel`, `min_level`, `format`, `options`, `with(key, value)`, `log(level, message, &[(&str, Value)])` |
| `Sink`, `MemorySink`, `WriterSink<W: std::io::Write>` (std) | Sinks |
| `Error { code, message }` | `message_id()`; `Display`; `std::error::Error` with `std` |

## 3. Other ports

None yet.

## 4. Cross-language compatibility

For the same input, the TypeScript and Rust core functions produce identical text on all vectors (290 cases).
