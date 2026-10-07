import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Logger, MemorySink, formatRecord, interpolate, redact } from "../src/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (p: string): string => readFileSync(join(root, p), "utf8");

test("README quick-start output is exactly what the library produces", () => {
  const sink = new MemorySink();
  const log = new Logger({ sink, format: "line", minLevel: "info", clock: () => 1791331200000 });
  const a = log.warning("login failed for {user}", { user: "ana", password: "hunter2" });
  assert.equal(a, '2026-10-07T00:00:00.000Z WARNING [app] login failed for ana {"user":"ana","password":"[redacted]"}');
  const b = formatRecord({ time: "2026-10-07T00:00:00.000Z", level: "info", message: "ok", context: { ms: 12 } }, "logfmt");
  assert.equal(b, "time=2026-10-07T00:00:00.000Z level=info channel=app msg=ok ms=12");
  const readme = read("README.md");
  assert.ok(readme.includes(a!) && readme.includes(b));
  const rust = formatRecord({ time: "2026-10-07T00:00:00.000Z", level: "error", message: "db down", context: { token: "t" } }, "json");
  assert.ok(readme.includes(rust), "Rust example line matches the TS port");
});

test("guide recipes behave as documented", () => {
  const g = read("docs/guide_how_to_use_LombokLog_v0.1.0.md");
  const r1 = JSON.stringify(redact({ nik: "3201", name: "a" }, { redactKeys: ["nik"] }));
  assert.equal(r1, '{"nik":"[redacted]","name":"a"}');
  assert.ok(g.includes(r1));
  const sink = new MemorySink();
  const log = new Logger({ sink, clock: () => 0, format: "json" }).child("http").with({ requestId: "r-1" });
  const line = log.info("{method} {path} {status}", { method: "GET", path: "/health", status: 200 });
  assert.equal(line, '{"time":"1970-01-01T00:00:00.000Z","level":"info","channel":"http","message":"GET /health 200","context":{"requestId":"r-1","method":"GET","path":"/health","status":200}}');
  assert.ok(g.includes(line!));
  assert.equal(interpolate("{a}", { a: "{b}", b: "x" }), "{b}");
});
