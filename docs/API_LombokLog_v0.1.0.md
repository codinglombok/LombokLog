# API LombokLog v0.1.0

Semantik normatif ada di `SPEC_LombokLog_v0.1.0.md`; dokumen ini hanya mendaftar antarmuka yang benar-benar diekspor.

## 1. TypeScript (paket `lomboklog`)

Stabilitas: 0.x, dapat berubah pada rilis minor.

### Inti (murni)

| Simbol | Tanda tangan | Keterangan |
|---|---|---|
| `parseLevel` | `(level: unknown) => Level` | Nama kanonik; ASCII case-insensitive. Sejak 0.1.0 |
| `severity` | `(level: unknown) => number` | 0..7 |
| `isEnabled` | `(level: unknown, minLevel: unknown) => boolean` | |
| `interpolate` | `(message: unknown, context?: unknown) => string` | Placeholder `{kunci}` |
| `redact` | `(context: unknown, options?: RedactOptions) => JsonObject` | |
| `formatTime` | `(epochMillis: unknown) => string` | ISO 8601 UTC |
| `formatRecord` | `(record: unknown, format: unknown, options?: RedactOptions) => string` | Satu baris |
| `RedactOptions` | `{ redactKeys?: string[]; mask?: string }` | |
| `LogRecord` | `{ time; level; message; channel?; context? }` | |
| `LEVELS`, `FORMATS`, `DEFAULT_SENSITIVE_KEYS`, `DEFAULT_MASK`, `MAX_CONTEXT_DEPTH` | konstanta | |
| `Level`, `Format`, `Json`, `JsonObject` | tipe | |
| `LombokLogError` | `extends Error`; `code: ErrorCode`, `messageId: string` | Kode: SPEC bagian 10 |

### Runtime

| Simbol | Keterangan |
|---|---|
| `Logger` | `new Logger({ sink, channel?, minLevel?, format?, clock?, redactKeys?, mask?, context? })`; metode `log(level, message, context?)` dan `emergency` .. `debug` mengembalikan baris atau `null` bila di bawah level minimum; `child(channel)`; `with(context)` |
| `Sink` | `{ write(line: string, level: Level): void }` |
| `MemorySink` | Menyimpan baris di `lines` |
| `ConsoleSink` | `console.error` untuk `error` dan lebih parah, selain itu `console.log` |

## 2. Rust (crate `lomboklog`)

Fitur: `std` (bawaan). Tanpa `std`, crate bersifat `no_std + alloc`.

| Simbol | Keterangan |
|---|---|
| `Level` (enum), `LEVELS`, `parse_level(&str)`, `Level::severity`, `Level::is_at_least`, `is_enabled(&str, &str)` | Level |
| `RedactOptions { extra_keys, mask }`, `RedactOptions::from_value`, `redact(&Value, &RedactOptions)` | Redaksi |
| `interpolate(&str, Option<&Value>)` | Interpolasi |
| `format_time(f64)` | Waktu |
| `Format` (`Json`, `Line`, `Logfmt`), `Format::parse`, `format_record(&Value, Format, &RedactOptions)` | Render |
| `call(fn: &str, args: &[Value]) -> Result<Value, Error>` | Titik masuk dinamis dengan konvensi vector |
| `json::Value`, `parse_json`, `json::js_number` | JSON internal, keluaran setara `JSON.stringify` |
| `Logger<S: Sink, C: Fn() -> u64>` | `new(sink, clock)`, `channel`, `min_level`, `format`, `options`, `with(key, value)`, `log(level, message, &[(&str, Value)])` |
| `Sink`, `MemorySink`, `WriterSink<W: std::io::Write>` (std) | Sink |
| `Error { code, message }` | `message_id()`; `Display`; `std::error::Error` dengan `std` |

## 3. Port lain

Belum ada.

## 4. Kompatibilitas lintas bahasa

Untuk masukan yang sama, fungsi inti TypeScript dan Rust menghasilkan teks identik pada seluruh vector (290 kasus).
