# Guide How To Use LombokLog v0.1.0

## Instalasi

Belum terbit. Setelah rilis: `npm install lomboklog` atau `cargo add lomboklog`. Sebelum itu, bangun dari repo (lihat `CONTRIBUTING.md`).

## Konsep dasar

1. Sebuah **record** berisi `time`, `level`, `message`, `channel` (bawaan `app`), dan `context` (objek).
2. `formatRecord(record, format)` meredaksi konteks, mengisi placeholder pesan, lalu merender **satu baris**.
3. `Logger` menambahkan jam, level minimum, konteks dasar, dan sink. Sink menulis baris ke tujuan apa pun; inti tidak melakukan I/O.

## Contoh

```ts
import { Logger, ConsoleSink } from "lomboklog";

const log = new Logger({ sink: new ConsoleSink(), format: "json", minLevel: "info" });
log.info("server listening on {port}", { port: 8080 });
log.debug("tidak dicetak");   // di bawah level minimum
```

## Recipes

### Kunci sensitif tambahan

Kunci tambahan menambah daftar bawaan:

```ts
import { redact } from "lomboklog";
JSON.stringify(redact({ nik: "3201", name: "a" }, { redactKeys: ["nik"] }));
// {"nik":"[redacted]","name":"a"}
```

### Logger per subsistem dengan ID permintaan

```ts
const http = new Logger({ sink, clock: () => 0, format: "json" }).child("http").with({ requestId: "r-1" });
http.info("{method} {path} {status}", { method: "GET", path: "/health", status: 200 });
// {"time":"1970-01-01T00:00:00.000Z","level":"info","channel":"http","message":"GET /health 200","context":{"requestId":"r-1","method":"GET","path":"/health","status":200}}
```

### Menulis ke berkas (Rust)

```rust
use lomboklog::{Level, Logger, WriterSink, Format};
let file = std::fs::OpenOptions::new().create(true).append(true).open("app.log")?;
let now = || std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64;
let mut log = Logger::new(WriterSink(file), now).format(Format::Json);
log.log(Level::Info, "started", &[])?;
```

### Format untuk terminal

`format: "line"` menghasilkan `2026-10-07T00:00:00.000Z INFO [app] pesan {"k":1}`; baris baru di pesan ditulis sebagai `\n`.

## Common pitfalls

- Redaksi berbasis **nama kunci**. Jangan menaruh rahasia di teks pesan; taruh di konteks dengan kunci yang jelas (`password`, `token`).
- `{kunci}` hanya diisi dari nilai skalar; objek dan array membiarkan placeholder apa adanya.
- Placeholder di pesan diisi dari konteks yang **sudah** diredaksi, sehingga `{password}` menjadi `[redacted]`.
- Nama channel dibatasi `[A-Za-z0-9_.-]`, 1 sampai 64 karakter.
- `formatTime` hanya menerima milidetik bilangan bulat; `Date.now()` memenuhi syarat ini.
- `author`, `shipping`, dan kunci lain yang memuat `auth` atau `pin` ikut tersamarkan; ini disengaja.

## Lihat juga

README, SPEC_, API_.
