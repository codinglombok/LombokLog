import { test } from "node:test";
import assert from "node:assert/strict";
import { Logger, MemorySink, LombokLogError, formatRecord, redact } from "../src/index.js";

const fixed = (): number => 1791331200000; // 2026-10-07T00:00:00.000Z

test("Logger filters below the minimum level and renders the rest", () => {
  const sink = new MemorySink();
  const log = new Logger({ sink, minLevel: "warning", clock: fixed, format: "line" });
  assert.equal(log.info("hidden"), null);
  assert.equal(log.error("disk {pct} full", { pct: 91 }), '2026-10-07T00:00:00.000Z ERROR [app] disk 91 full {"pct":91}');
  assert.deepEqual(sink.lines, ['2026-10-07T00:00:00.000Z ERROR [app] disk 91 full {"pct":91}']);
});

test("Logger.with merges base context; call-site context wins; redaction always applies", () => {
  const sink = new MemorySink();
  const log = new Logger({ sink, clock: fixed }).with({ requestId: "r1", user: "a" });
  log.info("x", { user: "b", password: "p" });
  assert.equal(sink.lines[0], '{"time":"2026-10-07T00:00:00.000Z","level":"info","channel":"app","message":"x","context":{"requestId":"r1","user":"b","password":"[redacted]"}}');
});

test("Logger.child changes only the channel", () => {
  const sink = new MemorySink();
  const log = new Logger({ sink, clock: fixed, format: "logfmt" }).child("db");
  log.debug("q");
  assert.equal(sink.lines[0], "time=2026-10-07T00:00:00.000Z level=debug channel=db msg=q");
});

test("Logger rejects an invalid channel or format at construction", () => {
  assert.throws(() => new Logger({ sink: new MemorySink(), channel: "bad channel" }), (e: unknown) => e instanceof LombokLogError && e.code === "invalid_channel");
  assert.throws(() => new Logger({ sink: new MemorySink(), format: "xml" as never }), (e: unknown) => e instanceof LombokLogError && e.code === "invalid_format");
  assert.throws(() => new Logger({ sink: new MemorySink(), minLevel: "trace" }), (e: unknown) => e instanceof LombokLogError && e.code === "invalid_level");
});

test("every level method exists and maps to its level", () => {
  const sink = new MemorySink();
  const log = new Logger({ sink, clock: fixed, format: "logfmt" });
  for (const l of ["emergency", "alert", "critical", "error", "warning", "notice", "info", "debug"] as const) log[l]("m");
  assert.deepEqual(sink.lines.map((s) => s.split(" ")[1]), ["level=emergency", "level=alert", "level=critical", "level=error", "level=warning", "level=notice", "level=info", "level=debug"]);
});

test("errors carry a messageId", () => {
  try {
    redact(null);
    assert.fail("expected throw");
  } catch (e) {
    assert.ok(e instanceof LombokLogError);
    assert.equal(e.messageId, "lomboklog.error.invalid_record");
  }
});

// Pseudo-fuzz: random JSON-ish records never throw anything but LombokLogError and every
// successful rendering is exactly one line.
test("fuzz: single-line invariant and no foreign exceptions", () => {
  let seed = 7;
  const rnd = (): number => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const chars = ["a", " ", "\n", "\r", "\u2028", '"', "\\", "=", "{", "}", "\u0000", "\u001b", "\u00e9", "\u{1F600}"];
  const str = (): string => Array.from({ length: Math.floor(rnd() * 8) }, () => chars[Math.floor(rnd() * chars.length)]).join("");
  const val = (d: number): unknown => {
    const r = rnd();
    if (d < 4 && r < 0.2) return Object.fromEntries(Array.from({ length: 3 }, () => [str(), val(d + 1)]));
    if (d < 4 && r < 0.3) return [val(d + 1), val(d + 1)];
    if (r < 0.6) return str();
    if (r < 0.8) return (rnd() - 0.5) * 1e6;
    return r < 0.9 ? null : true;
  };
  for (let i = 0; i < 3000; i++) {
    const rec = { time: rnd() < 0.9 ? "2026-01-01T00:00:00.000Z" : str(), level: rnd() < 0.9 ? "info" : str(), message: str(), channel: rnd() < 0.8 ? undefined : str(), context: rnd() < 0.9 ? val(0) : str() };
    try {
      const line = formatRecord(rec, ["json", "line", "logfmt"][i % 3]);
      assert.ok(!/[\n\r]/.test(line), JSON.stringify(line));
    } catch (e) {
      assert.ok(e instanceof LombokLogError, String(e));
    }
  }
});
