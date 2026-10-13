# Guide How To Use LombokLog v0.1.0

## Installation

Not published yet. After the release: `npm install lomboklog` or `cargo add lomboklog`. Until then, build from the repository (see `CONTRIBUTING.md`).

## Basic concepts

1. A **record** contains `time`, `level`, `message`, `channel` (default `app`) and `context` (an object).
2. `formatRecord(record, format)` redacts the context, fills in the message placeholders, and then renders **one line**.
3. `Logger` adds a clock, a minimum level, a base context and a sink. A sink writes the line to any destination; the core performs no I/O.

## Example

```ts
import { Logger, ConsoleSink } from "lomboklog";

const log = new Logger({ sink: new ConsoleSink(), format: "json", minLevel: "info" });
log.info("server listening on {port}", { port: 8080 });
log.debug("not printed");   // below the minimum level
```

## Recipes

### Additional sensitive keys

Extra keys add to the built-in list:

```ts
import { redact } from "lomboklog";
JSON.stringify(redact({ nik: "3201", name: "a" }, { redactKeys: ["nik"] }));
// {"nik":"[redacted]","name":"a"}
```

### A logger per subsystem with a request ID

```ts
const http = new Logger({ sink, clock: () => 0, format: "json" }).child("http").with({ requestId: "r-1" });
http.info("{method} {path} {status}", { method: "GET", path: "/health", status: 200 });
// {"time":"1970-01-01T00:00:00.000Z","level":"info","channel":"http","message":"GET /health 200","context":{"requestId":"r-1","method":"GET","path":"/health","status":200}}
```

### Writing to a file (Rust)

```rust
use lomboklog::{Level, Logger, WriterSink, Format};
let file = std::fs::OpenOptions::new().create(true).append(true).open("app.log")?;
let now = || std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64;
let mut log = Logger::new(WriterSink(file), now).format(Format::Json);
log.log(Level::Info, "started", &[])?;
```

### A format for the terminal

`format: "line"` produces `2026-10-07T00:00:00.000Z INFO [app] message {"k":1}`; newlines in the message are written as `\n`.

## Common pitfalls

- Redaction is based on **key names**. Do not put secrets in the message text; put them in the context under a clear key (`password`, `token`).
- `{key}` is only filled from scalar values; objects and arrays leave the placeholder unchanged.
- Placeholders in the message are filled from the **already redacted** context, so `{password}` becomes `[redacted]`.
- Channel names are limited to `[A-Za-z0-9_.-]`, 1 to 64 characters.
- `formatTime` only accepts integer milliseconds; `Date.now()` satisfies this.
- `author`, `shipping` and other keys containing `auth` or `pin` are also masked; this is intentional.

## See also

README, SPEC_, API_.
