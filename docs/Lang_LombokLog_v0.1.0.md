# Lang LombokLog v0.1.0

## 1. i18n level

Level **E** (error messages and documentation only). The library does not translate log content; log text belongs to the application. The source language of all messages and documentation is English.

## 2. Message ID catalog (normative)

Format `lomboklog.<kind>.<code>`. Catalog files: `locales/<bcp47>/lomboklog.json`, one file for all ports.

| ID | Source text (en) | Error code |
|---|---|---|
| `lomboklog.error.invalid_level` | The log level is not one of the eight RFC 5424 severities. | `invalid_level` |
| `lomboklog.error.invalid_format` | The output format is not supported. | `invalid_format` |
| `lomboklog.error.invalid_record` | The log record or its context has an invalid shape. | `invalid_record` |
| `lomboklog.error.invalid_channel` | The channel name must be 1 to 64 characters of letters, digits, '_', '.' or '-'. | `invalid_channel` |
| `lomboklog.error.invalid_time` | The timestamp must be an integer number of milliseconds between 0 and 253402300799999. | `invalid_time` |
| `lomboklog.error.invalid_option` | A redaction option is invalid. | `invalid_option` |

An error carries `code` (contract, the same in all ports) and `messageId`. The `message` field of the error object is in English and is not normative.

## 3. Current coverage

Core-20: 2 of 20 (`en`, `id`). Nusantara pack: 0 of 6. No other languages yet. Catalogs for additional languages must be reviewed by a native speaker before they are accepted.

## 4. How to add a language

1. Copy `locales/en/lomboklog.json` to `locales/<bcp47>/lomboklog.json`.
2. Translate the values; keys are not changed.
3. Ask a native speaker to review, then open a pull request.

## 5. Dependency on LombokLocale

None in 0.1.0. A consumer that uses LombokLocale can resolve `messageId` against the catalogs above.
