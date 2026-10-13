# Changelog LombokLog (summary)

The newest entry comes first. Details are in `CHANGELOG.md`.

## 0.1.0 - 2026-10-07

### Added
- RFC 5424 levels, redaction, interpolation, `json`/`line`/`logfmt` formatters, `formatTime`.
- `Logger` and sinks.
- Rust `no_std + alloc` port and TypeScript port.
- 290 vectors; runners in both ports; fuzzing and mutation testing.

### Security
- Redaction is always applied before interpolation and rendering; it cannot be turned off.
- One record is always exactly one line (prevents log-line forgery).
- Context depth limit of 16 and JSON parser limit of 512.
