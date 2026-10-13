# Security Policy

## Supported versions

| Version | Support |
|---|---|
| 0.1.x | Security fixes |

## Reporting a vulnerability

Use **GitHub Private Vulnerability Reporting** on this repository (Security tab, "Report a vulnerability"). Do not open a public issue for a vulnerability.

- Initial response: within 48 hours.
- Fix for critical findings: 7 days (target).
- Disclosure is coordinated with the reporter.

## Scope

In scope: the formatter and redaction (`redact`, `formatRecord`, `interpolate`), in particular any way for a value under a sensitive key to reach the output, for one record to produce more than one line, or for an input to cause a panic, a crash or unbounded execution time.

Out of scope: application-owned I/O handlers (files, network), file rotation, and shipping logs to external services.

## Short threat model

See the Security section of `docs/SPEC_LombokLog_v0.1.0.md`.
