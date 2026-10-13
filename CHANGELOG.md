# Changelog

All notable changes are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/); the newest entry comes first. Versions follow [SemVer](https://semver.org/).

## [0.1.0] - 2026-10-07

### Added
- Eight RFC 5424 levels with `parseLevel`, `severity` and `isEnabled`.
- Key-name based secret redaction (19 built-in substrings, extra keys, mask, depth limit of 16).
- PSR-3 style `{key}` message interpolation.
- Single-line `json`, `line` and `logfmt` formatters; `formatTime` in ISO 8601 UTC.
- A runtime `Logger` with a minimum level, an injectable clock, base context, `child` and sinks.
- Rust port (`no_std + alloc`, no dependencies, dynamic entry point `call`) and TypeScript port (no runtime dependencies).
- Shared vectors of 290 cases (200 golden cases with hand-written expectations, 90 generated regression cases), executed by the Rust and TypeScript runners.
- Pseudo-fuzzing and a mutation-testing script (22 mutants).

### Security
- Redaction is always applied before interpolation and rendering; it cannot be turned off.
- One record is always exactly one line (prevents log-line forgery).
- Context depth limit of 16 and JSON parser limit of 512.
