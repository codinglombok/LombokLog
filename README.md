# LombokLog

[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue)](LICENSE-APACHE)

Inti logging terstruktur: delapan level RFC 5424, **redaksi rahasia yang selalu aktif**, interpolasi pesan gaya PSR-3, dan tiga formatter satu baris (JSON, line, logfmt). Tanpa dependensi runtime, tanpa I/O di inti. Hasilnya identik byte-per-byte di setiap port.

Part of the [Lombok Ecosystem](https://github.com/codinglombok).

## Mengapa library ini?

Log adalah tempat rahasia paling mudah bocor: tidak ada yang menulis `log("password: ...")`, tetapi banyak yang menulis `log("login gagal", request.body)` dan kata sandi ikut di dalam objek yang tidak pernah diperiksa. LombokLog menerapkan redaksi berbasis nama kunci **sebelum** record dirender, dan tidak menyediakan saklar untuk mematikannya.

Masalah kedua adalah format yang berbeda antar bahasa. Layanan Rust dan layanan Node yang menulis ke agregator yang sama sering menghasilkan baris yang sedikit berbeda (escape, format angka, urutan kunci). LombokLog menetapkan format keluaran secara normatif dan membuktikannya dengan vector bersama.

Skenario pemakaian:

- **Layanan web dan API**: log akses dan galat dengan konteks terstruktur; header `Authorization` dan cookie tersamarkan otomatis.
- **Alat CLI dan job batch**: format `line` yang mudah dibaca di terminal, format `json` untuk berkas.
- **Serverless dan edge**: inti tanpa dependensi, satu baris per record untuk pengumpul log platform.
- **Perangkat tertanam**: inti Rust `no_std + alloc` dengan `MemorySink` atau sink buatan sendiri.
- **Pipeline observabilitas**: format `logfmt` untuk alat yang membaca pasangan `kunci=nilai`.

Contoh dependen lain di ekosistem Lombok dicantumkan di `docs/map_LombokLog_v0.1.0.md`.

## Fitur

Setiap fitur di bawah ini dicakup vector di `vectors/` dan test TypeScript.

- Level RFC 5424 (`emergency` .. `debug`), `parseLevel` peka-huruf ASCII, `severity`, `isEnabled`.
- `redact`: kunci yang mengandung salah satu dari 19 substring sensitif (ASCII, tanpa beda huruf besar-kecil) diganti `[redacted]`; kunci tambahan menambah, tidak mengganti, daftar bawaan; kedalaman lebih dari 16 menjadi `[truncated]`.
- `interpolate`: placeholder `{kunci}` diisi nilai skalar dari konteks; nilai tidak diekspansi ulang.
- `formatRecord`: format `json`, `line`, `logfmt`; selalu tepat satu baris (baris baru dan karakter kontrol di-escape).
- `formatTime`: milidetik epoch ke ISO 8601 UTC dengan milidetik.
- Format angka dan escape string identik dengan `JSON.stringify` di semua port.
- `Logger` runtime dengan level minimum, jam yang dapat disuntikkan, konteks dasar, dan sink (`MemorySink`, `ConsoleSink`; Rust: `MemorySink`, `WriterSink`).

## Instalasi

Belum terbit di registry. Setelah rilis pertama:

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

## Status port

| Port | Status | Bukti |
|---|---|---|
| Rust (`no_std + alloc`) | YA, lulus vector | `rust/tests/vectors.rs` menjalankan seluruh vector; build `thumbv7em-none-eabi` |
| TypeScript | YA, lulus vector | `typescript/test/vectors.test.ts` menjalankan seluruh vector; ditambah test `Logger` dan fuzz |
| Python, Go, PHP, Java, Kotlin, C#, C/C++, Swift, Perl | BELUM | Tidak ada kode; direncanakan setelah kontrak stabil (lihat `docs/development_ide_LombokLog_v0.1.0.md`) |

Vector: 290 kasus (200 golden berekspektasi tulis tangan, 90 regresi hasil pembangkit).

## Standar yang diimplementasikan

RFC 5424 (nama dan urutan severity), RFC 8259 (keluaran JSON), ISO 8601 / RFC 3339 (stempel waktu). Kontrak keluaran ditentukan oleh `docs/SPEC_LombokLog_v0.1.0.md`.

## Batasan yang diketahui

- Redaksi berbasis nama kunci, bukan isi nilai. Rahasia di dalam teks pesan atau di nilai berkunci netral tidak terdeteksi.
- Pencocokan substring sengaja tumpul: `author` dan `shipping` ikut tersamarkan (`auth`, `pin`).
- Tidak ada rotasi berkas, buffering asinkron, atau pengiriman jaringan; itu tugas sink milik aplikasi.
- Format `logfmt` tidak mencegah kunci konteks yang sama dengan kunci bawaan (`level`, `msg`).
- Hanya Rust dan TypeScript yang memiliki kode.
- Belum ada audit keamanan pihak ketiga. Fuzz bersifat pseudo-fuzz, belum `cargo-fuzz`.

## Ekosistem Lombok

LombokLog tidak bergantung pada library Lombok lain (L0). Library lain dapat memakainya secara opsional; daftar dependen ada di `docs/map_LombokLog_v0.1.0.md`.

## Contributing

Lihat [CONTRIBUTING.md](CONTRIBUTING.md). Untuk melaporkan kerentanan lihat [SECURITY.md](SECURITY.md).

## Lisensi

`Apache-2.0 OR MIT`. Lihat [LICENSE-APACHE](LICENSE-APACHE) dan [LICENSE-MIT](LICENSE-MIT).
