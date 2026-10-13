# Map LombokLog v0.1.0

## 1. Dependency position

L0. The cluster position and catalog number follow the ecosystem parent document v3.6 (not committed, ADR-024). No required Lombok dependencies.

## 2. Example dependents in the ecosystem

This section is the only place where application or framework names may appear (ADR-019). It is an illustration, not ownership; anyone can use LombokLog.

| Dependent | Kind | Integration status | Notes |
|---|---|---|---|
| LombokClarion v3 | Framework | planned (F7) | Replaces the internal v2 log package (levels, redaction, JSON and line formatters) |
| LombokSQL | L0 library | planned (optional) | Logging of compiled queries |
| LombokAuth, LombokSecurity | Libraries | planned (optional) | Audit trail of logins and rate-limit violations |
| LombokDocFlow | Application | planned | Document-processing logs |

Optional integration with LombokJSON (serializer) and LombokLocale (error messages) is not implemented; the core uses an equivalent internal JSON serializer.

## 3. Depends on

Nothing.

## 4. Normative contract path

`docs/SPEC_LombokLog_v0.1.0.md` -> `vectors/lomboklog-vectors-v1.json` (sha256 in SPEC) -> runners `rust/tests/vectors.rs` and `typescript/test/vectors.test.ts`.

## 5. Folder map

See `structure_repo_LombokLog_v0.1.0.md`.
