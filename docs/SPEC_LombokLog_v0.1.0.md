# SPEC LombokLog v0.1.0

This document is the normative cross-language contract. Every language port MUST produce byte-identical output for all specified inputs. Deviations from this specification are bugs.

The key words MUST, MUST NOT, SHOULD and MAY are to be interpreted as in RFC 2119 and RFC 8174.

| Attribute | Value |
|---|---|
| Contract version | 0.1.0 |
| Review date of reference standards | 2026-10-07 |
| Vectors | `vectors/lomboklog-vectors-v1.json` |
| Vector SHA-256 | `fa679022004b8d05f6ca234b8e3f28af129d8c9acb77a5dc168a72f9de1fccc0` |

## 0. Reference standards (U2)

| Reference | Version | Use |
|---|---|---|
| RFC 5424 | March 2009 | Names and order of the eight severities |
| RFC 8259 | December 2017 | JSON output |
| ECMA-262 | 2024 | `Number::toString` and `JSON.stringify` as the reference for number format, string escaping and property order |
| RFC 3339 / ISO 8601 | 2002 / 2019 | `formatTime` timestamps |
| RFC 2119, RFC 8174 | 1997, 2017 | Normative key words |

## 1. Vectors

The vector file contains `{ format, specVersion, note, groups }`. Each case contains `name`, `fn`, `args` (an array of JSON arguments) and `expect` of the form `{ "result": value }` or `{ "error": code }`. Every claimed port MUST run all cases by calling the function `fn` (section 2) with `args`. A string result MUST be identical byte for byte; an object result MUST be structurally equal. The SHA-256 hash of the file MUST equal the one in the attribute table.

## 2. Interface

All functions MUST be pure: no I/O, no global state, no clock and no randomness.

| `fn` | Arguments | Result |
|---|---|---|
| `parseLevel` | `level` | canonical level name |
| `severity` | `level` | integer 0..7 |
| `isEnabled` | `level`, `minLevel` | boolean |
| `interpolate` | `message`, `context?` | string |
| `redact` | `context`, `options?` | object |
| `formatTime` | `epochMillis` | string |
| `formatRecord` | `record`, `format`, `options?` | single-line string |

A port MAY provide additional interfaces (a logger, sinks), but the text they produce MUST come from `formatRecord`.

## 3. Levels

The valid levels, from most to least severe: `emergency` (0), `alert` (1), `critical` (2), `error` (3), `warning` (4), `notice` (5), `info` (6), `debug` (7). `parseLevel` accepts a string equal to one of the names after **ASCII** case folding (`A`-`Z` become `a`-`z`; other characters are not folded). Aliases (`warn`, `fatal`, `trace`) and whitespace MUST be rejected with `invalid_level`; a non-string argument is also `invalid_level`. `isEnabled(a, b)` is `severity(a) <= severity(b)`; `a` is validated first.

## 4. Redaction

Options: an object with `redactKeys` (a non-empty array of strings) and `mask` (a string, default `[redacted]`). Absent or `null` `options` means the defaults; any other shape MUST be `invalid_option`. Options are validated before the context.

The built-in list of sensitive substrings (order is not significant): `password`, `passwd`, `secret`, `token`, `authorization`, `auth`, `credential`, `api_key`, `apikey`, `private_key`, `access_key`, `session`, `cookie`, `csrf`, `signature`, `card_number`, `cvv`, `ssn`, `pin`. `redactKeys` are added after ASCII folding; the built-in list MUST NOT be reducible.

An object key is sensitive if the ASCII-folded key contains any of the substrings. The value under a sensitive key (including objects and arrays) MUST be replaced entirely by `mask`. Arrays are traversed; array elements are not keys. Traversal uses depth: the top-level context has depth 0 and every child container adds 1; a container (object or array) with depth greater than 16 MUST be replaced by the string `[truncated]`. Scalars are unchanged. A `context` that is not an object MUST be `invalid_record`.

## 5. Interpolation

A placeholder is `{` + one or more characters from `[A-Za-z0-9_.]` + `}`, scanned left to right without overlap (equivalent to the global regex `\{([A-Za-z0-9_.]+)\}`). The key is looked up as is (a dot is not a path). If the key exists and its value is a string: it is replaced by that string; a number: the number text (section 8); a boolean: `true`/`false`; `null`: `null`. A missing key, an object or an array: the placeholder is left unchanged. The result of a replacement MUST NOT be scanned again. Without a context, the message is returned as is. A `message` that is not a string, or a context that is not an object (including `null`), MUST be `invalid_record`.

## 6. Time

`formatTime(ms)`: `ms` MUST be an integer in 0..253402300799999 (otherwise `invalid_time`). The output is `YYYY-MM-DDTHH:MM:SS.mmmZ` in the proleptic Gregorian calendar in UTC, equivalent to `Date.prototype.toISOString`.

## 7. Records and formats

Validation order: `format` (`json`, `line`, `logfmt`, case-sensitive; anything else, or a non-string: `invalid_format`), options (section 4), `record` an object (`invalid_record`), `level` (section 3; missing or not a string: `invalid_level`), `time` a non-empty string without the characters U+0000..U+001F and U+007F (`invalid_record`), `message` a string (`invalid_record`), `channel` optional (default `app`; MUST match `^[A-Za-z0-9_.-]{1,64}$`, and `null` is rejected: `invalid_channel`), `context` an optional object (`invalid_record`). Other keys are ignored.

Then the context is redacted (section 4), the message is interpolated with the **already redacted** context, and the level is written in canonical form. A context is considered empty if it has no keys.

| Format | Output |
|---|---|
| `json` | A compact JSON object with the keys in the order `time`, `level`, `channel`, `message`, then `context` only if it is not empty |
| `line` | `time + " " + LEVEL + " [" + channel + "] " + esc(message)`, followed by `" " + JSON(context)` if it is not empty. `LEVEL` is uppercase. `esc`: `\r\n`, `\n` and `\r` each become the two characters `\n`; other characters U+0000..U+001F and U+007F become `\u` + 4 lowercase hexadecimal digits |
| `logfmt` | pairs separated by one space: `time=`, `level=`, `channel=`, `msg=`, then the flattened context |

logfmt flattening: a non-empty object is expanded with keys `parent.child` (property order in section 8); an empty object is written `{}`; an array is written as compact JSON; a scalar as text (a string as is, anything else as JSON). Keys: every space, `=`, `"` and character U+0000..U+001F, U+007F is replaced by `_`; an empty key becomes `_`. Values are written without quotes unless they are empty or contain a space, `=`, `"`, `\` or a control character as above; quoted values use the escapes `\\`, `\"`, `\n`, `\r`, `\t` and `\u00xx` for other control characters. The `time` value follows the same value rules.

Every output of `formatRecord` MUST NOT contain U+000A or U+000D.

## 8. JSON serialization

Compact JSON MUST be equivalent to ECMA-262 `JSON.stringify`: strings are escaped as `\"`, `\\`, `\b`, `\f`, `\n`, `\r`, `\t`, other control characters as `\u00xx` (lowercase), and all other characters, including `/` and non-ASCII, are written as is. Numbers: `Number::toString` (for example `1e+21`, `1e-7`, `100000000000000000000`, `0.000001`, and `-0` becomes `0`). Object property order: array-index keys (canonical integer strings 0..4294967294) in ascending order first, then the other keys in insertion order. Duplicate keys in input JSON use the last value at the position of the first occurrence.

## 9. Security

- Redaction MUST be applied before interpolation and before rendering; there is no option to turn it off.
- One record MUST become exactly one line (section 7), so that an input cannot forge another record.
- Context traversal MUST be limited to depth 16; a port that accepts JSON text MUST limit the parser depth (Rust port: 512).
- Any input MUST produce a result or an error with a `code` from section 10; a panic or any other exception is a bug.

## 10. Errors

| `code` | Condition | `messageId` |
|---|---|---|
| `invalid_level` | unknown level or not a string | `lomboklog.error.invalid_level` |
| `invalid_format` | unknown format | `lomboklog.error.invalid_format` |
| `invalid_record` | invalid record, `time`, `message` or `context` | `lomboklog.error.invalid_record` |
| `invalid_channel` | channel does not match the pattern | `lomboklog.error.invalid_channel` |
| `invalid_time` | `formatTime` out of range or not an integer | `lomboklog.error.invalid_time` |
| `invalid_option` | invalid redaction option | `lomboklog.error.invalid_option` |

When several errors apply, the one reported is the first in the validation order of section 7.

## 11. Non-goals (0.1.0)

File rotation, buffering, network delivery, sampling, the full RFC 5424 syslog format (PRI header, structured data), secret detection based on value content, and local-time-zone timestamps.

## 12. Contract change history

| Version | Change |
|---|---|
| 0.1.0 | Initial contract |
