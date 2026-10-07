// Generates vectors/lomboklog-vectors-v1.json.
// Group "golden": expectations are WRITTEN BY HAND (and checked against the TypeScript port at
// generation time; a disagreement aborts generation so that either the code or the expectation is
// fixed deliberately).
// Group "generated-regression": seeded pseudo-random records whose expectations come from the
// TypeScript port and are cross-checked by the independent Rust port.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import * as lib from "../typescript/dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FNS = ["parseLevel", "severity", "isEnabled", "interpolate", "redact", "formatRecord", "formatTime"];

function run(fn, args) {
  try {
    return { result: lib[fn](...args) };
  } catch (err) {
    if (!(err instanceof lib.LombokLogError)) throw err;
    return { error: err.code };
  }
}

const golden = [];
function g(name, fn, args, expect) {
  if (!FNS.includes(fn)) throw new Error(fn);
  const got = run(fn, args);
  if (!isDeepStrictEqual(got, expect)) {
    throw new Error(`golden mismatch in "${name}"\n  expected ${JSON.stringify(expect)}\n  got      ${JSON.stringify(got)}`);
  }
  golden.push({ name, fn, args, expect });
}
const ok = (result) => ({ result });
const err = (error) => ({ error });

// ---------------------------------------------------------------- levels
const LV = ["emergency", "alert", "critical", "error", "warning", "notice", "info", "debug"];
LV.forEach((l, i) => {
  g(`parseLevel ${l}`, "parseLevel", [l], ok(l));
  g(`severity ${l}`, "severity", [l], ok(i));
});
g("parseLevel upper case", "parseLevel", ["WARNING"], ok("warning"));
g("parseLevel mixed case", "parseLevel", ["Info"], ok("info"));
g("parseLevel alias warn rejected", "parseLevel", ["warn"], err("invalid_level"));
g("parseLevel alias fatal rejected", "parseLevel", ["fatal"], err("invalid_level"));
g("parseLevel empty", "parseLevel", [""], err("invalid_level"));
g("parseLevel padded", "parseLevel", [" info"], err("invalid_level"));
g("parseLevel number", "parseLevel", [3], err("invalid_level"));
g("parseLevel null", "parseLevel", [null], err("invalid_level"));
g("parseLevel non-ASCII case fold not applied", "parseLevel", ["\u0130NFO"], err("invalid_level"));
g("severity unknown", "severity", ["trace"], err("invalid_level"));
for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) g(`isEnabled ${LV[a]} min ${LV[b]}`, "isEnabled", [LV[a], LV[b]], ok(a <= b));
g("isEnabled bad level", "isEnabled", ["x", "info"], err("invalid_level"));
g("isEnabled bad minimum", "isEnabled", ["info", "x"], err("invalid_level"));

// ---------------------------------------------------------------- interpolate
g("interpolate string", "interpolate", ["user {name} logged in", { name: "ana" }], ok("user ana logged in"));
g("interpolate integer", "interpolate", ["took {ms} ms", { ms: 42 }], ok("took 42 ms"));
g("interpolate fraction", "interpolate", ["ratio {r}", { r: 0.5 }], ok("ratio 0.5"));
g("interpolate negative", "interpolate", ["{n}", { n: -3 }], ok("-3"));
g("interpolate large number uses exponent", "interpolate", ["{n}", { n: 1e21 }], ok("1e+21"));
g("interpolate small number uses exponent", "interpolate", ["{n}", { n: 1e-7 }], ok("1e-7"));
g("interpolate 1e20 is plain", "interpolate", ["{n}", { n: 1e20 }], ok("100000000000000000000"));
g("interpolate 0.000001 is plain", "interpolate", ["{n}", { n: 0.000001 }], ok("0.000001"));
g("interpolate booleans", "interpolate", ["{a}/{b}", { a: true, b: false }], ok("true/false"));
g("interpolate null", "interpolate", ["v={v}", { v: null }], ok("v=null"));
g("interpolate missing key kept", "interpolate", ["hi {who}", {}], ok("hi {who}"));
g("interpolate object kept", "interpolate", ["{o}", { o: { a: 1 } }], ok("{o}"));
g("interpolate array kept", "interpolate", ["{a}", { a: [1] }], ok("{a}"));
g("interpolate dotted key is literal", "interpolate", ["{a.b}", { "a.b": "x", a: { b: "y" } }], ok("x"));
g("interpolate invalid key characters", "interpolate", ["{a b} {a-b}", { "a b": 1, "a-b": 2 }], ok("{a b} {a-b}"));
g("interpolate empty braces", "interpolate", ["{}", { "": 1 }], ok("{}"));
g("interpolate nested braces", "interpolate", ["{{x}}", { x: "1" }], ok("{1}"));
g("interpolate repeated", "interpolate", ["{x}{x}{x}", { x: "ab" }], ok("ababab"));
g("interpolate unterminated", "interpolate", ["{x", { x: 1 }], ok("{x"));
g("interpolate value with braces not re-expanded", "interpolate", ["{a}", { a: "{b}", b: "no" }], ok("{b}"));
g("interpolate unicode value", "interpolate", ["{s}", { s: "kopi \u2615 \u{1F600}" }], ok("kopi \u2615 \u{1F600}"));
g("interpolate without context", "interpolate", ["plain {x}"], ok("plain {x}"));
g("interpolate non-string message", "interpolate", [1, {}], err("invalid_record"));
g("interpolate array context", "interpolate", ["{0}", ["a"]], err("invalid_record"));
g("interpolate numeric key", "interpolate", ["{0}", { 0: "zero" }], ok("zero"));

// ---------------------------------------------------------------- redact
g("redact password", "redact", [{ user: "ana", password: "p" }], ok({ user: "ana", password: "[redacted]" }));
g("redact case-insensitive", "redact", [{ PassWord: "p", API_KEY: "k" }], ok({ PassWord: "[redacted]", API_KEY: "[redacted]" }));
g("redact substring", "redact", [{ db_password_hash: "x", refresh_token_id: 1 }], ok({ db_password_hash: "[redacted]", refresh_token_id: "[redacted]" }));
g("redact masks objects whole", "redact", [{ credentials: { user: "a", pw: "b" } }], ok({ credentials: "[redacted]" }));
g("redact nested", "redact", [{ req: { headers: { Authorization: "Bearer x", accept: "*/*" } } }], ok({ req: { headers: { Authorization: "[redacted]", accept: "*/*" } } }));
g("redact inside arrays", "redact", [{ users: [{ name: "a", secret: 1 }, { name: "b" }] }], ok({ users: [{ name: "a", secret: "[redacted]" }, { name: "b" }] }));
g("redact array values are not keys", "redact", [{ list: ["password", "token"] }], ok({ list: ["password", "token"] }));
g("redact over-redaction is intended", "redact", [{ author: "ana", shipping: "x" }], ok({ author: "[redacted]", shipping: "[redacted]" }));
g("redact extra keys", "redact", [{ nik: "123", name: "a" }, { redactKeys: ["NIK"] }], ok({ nik: "[redacted]", name: "a" }));
g("redact extra keys keep defaults", "redact", [{ nik: "1", password: "2" }, { redactKeys: ["nik"] }], ok({ nik: "[redacted]", password: "[redacted]" }));
g("redact custom mask", "redact", [{ token: "t" }, { mask: "***" }], ok({ token: "***" }));
g("redact null and numbers kept", "redact", [{ a: null, b: 1, c: true }], ok({ a: null, b: 1, c: true }));
g("redact empty", "redact", [{}], ok({}));
g("redact non-ASCII key not folded", "redact", [{ "PASSWORD\u0130": "x", "pa\u017fsword": "y" }], ok({ "PASSWORD\u0130": "[redacted]", "pa\u017fsword": "y" }));
g("redact context not object", "redact", [[1]], err("invalid_record"));
g("redact null context", "redact", [null], err("invalid_record"));
g("redact empty extra key rejected", "redact", [{}, { redactKeys: [""] }], err("invalid_option"));
g("redact extra keys not array", "redact", [{}, { redactKeys: "nik" }], err("invalid_option"));
g("redact mask not string", "redact", [{}, { mask: 1 }], err("invalid_option"));
g("redact options not object", "redact", [{}, "x"], err("invalid_option"));
let deep = { leaf: 1 };
for (let i = 0; i < 17; i++) deep = { d: deep };
let deepExpect = "[truncated]";
for (let i = 0; i < 17; i++) deepExpect = { d: deepExpect };
g("redact truncates beyond depth 16", "redact", [deep], ok(deepExpect));
let sixteen = { leaf: 1 };
for (let i = 0; i < 15; i++) sixteen = { d: sixteen };
g("redact depth 16 kept", "redact", [sixteen], ok(sixteen));
g("redact numeric keys ordered like ECMAScript", "redact", [{ b: 1, 2: "x", 1: "y", a: 2 }], ok({ 1: "y", 2: "x", b: 1, a: 2 }));

// ---------------------------------------------------------------- formatTime
g("formatTime epoch", "formatTime", [0], ok("1970-01-01T00:00:00.000Z"));
g("formatTime ms", "formatTime", [1], ok("1970-01-01T00:00:00.001Z"));
g("formatTime 2026", "formatTime", [1791331200000], ok("2026-10-07T00:00:00.000Z"));
g("formatTime leap day", "formatTime", [951782400000], ok("2000-02-29T00:00:00.000Z"));
g("formatTime 1900-free century", "formatTime", [4107542399999], ok("2100-02-28T23:59:59.999Z"));
g("formatTime 2100-03-01", "formatTime", [4107542400000], ok("2100-03-01T00:00:00.000Z"));
g("formatTime max", "formatTime", [253402300799999], ok("9999-12-31T23:59:59.999Z"));
g("formatTime over max", "formatTime", [253402300800000], err("invalid_time"));
g("formatTime negative", "formatTime", [-1], err("invalid_time"));
g("formatTime fraction", "formatTime", [1.5], err("invalid_time"));
g("formatTime string", "formatTime", ["0"], err("invalid_time"));

// ---------------------------------------------------------------- formatRecord
const T = "2026-10-07T01:02:03.004Z";
const R = (extra = {}) => ({ time: T, level: "info", message: "hello", ...extra });
g("json minimal", "formatRecord", [R(), "json"], ok(`{"time":"${T}","level":"info","channel":"app","message":"hello"}`));
g("json channel and context", "formatRecord", [R({ channel: "http", context: { status: 200, path: "/a" } }), "json"], ok(`{"time":"${T}","level":"info","channel":"http","message":"hello","context":{"status":200,"path":"/a"}}`));
g("json level canonicalised", "formatRecord", [R({ level: "ERROR" }), "json"], ok(`{"time":"${T}","level":"error","channel":"app","message":"hello"}`));
g("json empty context omitted", "formatRecord", [R({ context: {} }), "json"], ok(`{"time":"${T}","level":"info","channel":"app","message":"hello"}`));
g("json redacts and interpolates redacted value", "formatRecord", [R({ message: "login {user} pw={password}", context: { user: "ana", password: "s3cret" } }), "json"], ok(`{"time":"${T}","level":"info","channel":"app","message":"login ana pw=[redacted]","context":{"user":"ana","password":"[redacted]"}}`));
g("json escapes newline and quotes", "formatRecord", [R({ message: 'a\n"b"\\' }), "json"], ok(`{"time":"${T}","level":"info","channel":"app","message":"a\\n\\"b\\"\\\\"}`));
g("json escapes control characters", "formatRecord", [R({ message: "\u0000\u0008\u000c\u001b\u007f" }), "json"], ok(`{"time":"${T}","level":"info","channel":"app","message":"\\u0000\\b\\f\\u001b\u007f"}`));
g("json keeps non-ASCII and slash", "formatRecord", [R({ message: "caf\u00e9 /x \u{1F600}" }), "json"], ok(`{"time":"${T}","level":"info","channel":"app","message":"caf\u00e9 /x \u{1F600}"}`));
g("json number formatting", "formatRecord", [R({ context: { a: 1.0, b: 1e21, c: -0.0001, d: 1e-7, e: 123456789012 } }), "json"], ok(`{"time":"${T}","level":"info","channel":"app","message":"hello","context":{"a":1,"b":1e+21,"c":-0.0001,"d":1e-7,"e":123456789012}}`));
g("json custom redact options", "formatRecord", [R({ context: { nik: "1" } }), "json", { redactKeys: ["nik"], mask: "-" }], ok(`{"time":"${T}","level":"info","channel":"app","message":"hello","context":{"nik":"-"}}`));
g("line minimal", "formatRecord", [R(), "line"], ok(`${T} INFO [app] hello`));
g("line with context", "formatRecord", [R({ level: "warning", channel: "db", context: { ms: 1500 } }), "line"], ok(`${T} WARNING [db] hello {"ms":1500}`));
g("line escapes newlines", "formatRecord", [R({ message: "a\r\nb\nc\rd" }), "line"], ok(`${T} INFO [app] a\\nb\\nc\\nd`));
g("line escapes other controls", "formatRecord", [R({ message: "tab\there \u001b[31mred" }), "line"], ok(`${T} INFO [app] tab\\u0009here \\u001b[31mred`));
g("line escapes DEL", "formatRecord", [R({ message: "x\u007fy" }), "line"], ok(`${T} INFO [app] x\\u007fy`));
g("line context redacted", "formatRecord", [R({ context: { cookie: "c", n: [1, 2] } }), "line"], ok(`${T} INFO [app] hello {"cookie":"[redacted]","n":[1,2]}`));
g("logfmt minimal", "formatRecord", [R(), "logfmt"], ok(`time=${T} level=info channel=app msg=hello`));
g("logfmt quoting", "formatRecord", [R({ message: "hello world", context: { a: "x=y", b: 'say "hi"', c: "", d: "back\\slash" } }), "logfmt"], ok(`time=${T} level=info channel=app msg="hello world" a="x=y" b="say \\"hi\\"" c="" d="back\\\\slash"`));
g("logfmt scalars", "formatRecord", [R({ context: { n: 1.5, t: true, z: null } }), "logfmt"], ok(`time=${T} level=info channel=app msg=hello n=1.5 t=true z=null`));
g("logfmt nested flattened", "formatRecord", [R({ context: { http: { status: 404, req: { method: "GET" } } } }), "logfmt"], ok(`time=${T} level=info channel=app msg=hello http.status=404 http.req.method=GET`));
g("logfmt arrays as JSON", "formatRecord", [R({ context: { ids: [1, 2], tags: ["a"] } }), "logfmt"], ok(`time=${T} level=info channel=app msg=hello ids=[1,2] tags="[\\"a\\"]"`));
g("logfmt empty containers", "formatRecord", [R({ context: { o: {}, a: [] } }), "logfmt"], ok(`time=${T} level=info channel=app msg=hello o={} a=[]`));
g("logfmt key sanitizing", "formatRecord", [R({ context: { "a b": 1, "c=d": 2, 'e"': 3, "": 4 } }), "logfmt"], ok(`time=${T} level=info channel=app msg=hello a_b=1 c_d=2 e_=3 _=4`));
g("logfmt control characters in values", "formatRecord", [R({ message: "l1\nl2\tx\u0001" }), "logfmt"], ok(`time=${T} level=info channel=app msg="l1\\nl2\\tx\\u0001"`));
g("logfmt carriage return", "formatRecord", [R({ message: "a\rb" }), "logfmt"], ok(`time=${T} level=info channel=app msg="a\\rb"`));
g("logfmt non-ASCII bare", "formatRecord", [R({ message: "caf\u00e9" }), "logfmt"], ok(`time=${T} level=info channel=app msg=caf\u00e9`));
g("logfmt redaction", "formatRecord", [R({ context: { user: { password: "x", id: 7 } } }), "logfmt"], ok(`time=${T} level=info channel=app msg=hello user.password=[redacted] user.id=7`));
g("logfmt numeric keys first", "formatRecord", [R({ context: { z: 1, 10: 2, 9: 3 } }), "logfmt"], ok(`time=${T} level=info channel=app msg=hello 9=3 10=2 z=1`));
g("error unknown format", "formatRecord", [R(), "xml"], err("invalid_format"));
g("error format before record", "formatRecord", [null, "yaml"], err("invalid_format"));
g("error format not string", "formatRecord", [R(), 1], err("invalid_format"));
g("error record not object", "formatRecord", ["x", "json"], err("invalid_record"));
g("error bad level", "formatRecord", [R({ level: "trace" }), "json"], err("invalid_level"));
g("error missing level", "formatRecord", [{ time: T, message: "m" }, "json"], err("invalid_level"));
g("error missing time", "formatRecord", [{ level: "info", message: "m" }, "json"], err("invalid_record"));
g("error empty time", "formatRecord", [R({ time: "" }), "json"], err("invalid_record"));
g("error time with newline", "formatRecord", [R({ time: "2026\n" }), "line"], err("invalid_record"));
g("error time not string", "formatRecord", [R({ time: 0 }), "json"], err("invalid_record"));
g("error missing message", "formatRecord", [{ time: T, level: "info" }, "json"], err("invalid_record"));
g("error bad channel space", "formatRecord", [R({ channel: "a b" }), "json"], err("invalid_channel"));
g("error empty channel", "formatRecord", [R({ channel: "" }), "json"], err("invalid_channel"));
g("error channel too long", "formatRecord", [R({ channel: "c".repeat(65) }), "json"], err("invalid_channel"));
g("channel 64 chars accepted", "formatRecord", [R({ channel: "c".repeat(64) }), "line"], ok(`${T} INFO [${"c".repeat(64)}] hello`));
g("error channel null", "formatRecord", [R({ channel: null }), "json"], err("invalid_channel"));
g("error context array", "formatRecord", [R({ context: [1] }), "json"], err("invalid_record"));
g("error context null", "formatRecord", [R({ context: null }), "json"], err("invalid_record"));
g("error level checked before time", "formatRecord", [{ level: "x" }, "json"], err("invalid_level"));
g("error options checked before record", "formatRecord", [null, "json", { mask: 5 }], err("invalid_option"));
g("unknown record keys ignored", "formatRecord", [R({ extra: 1 }), "line"], ok(`${T} INFO [app] hello`));

// ---------------------------------------------------------------- generated regression
let seed = 0x1234abcd;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const KEYS = ["user", "password", "id", "ms", "path", "Token", "nested", "list", "note", "api_key", "x y", "q=1", "9", "msg"];
const STR = ["ok", "a b", "x=y", 'q"t', "line\nbreak", "", "caf\u00e9", "{user}", "back\\", "tab\t"];
function genValue(d) {
  const r = rnd();
  if (d < 3 && r < 0.15) { const o = {}; const n = Math.floor(rnd() * 3); for (let i = 0; i < n; i++) o[pick(KEYS)] = genValue(d + 1); return o; }
  if (d < 3 && r < 0.25) return Array.from({ length: Math.floor(rnd() * 3) }, () => genValue(d + 1));
  if (r < 0.55) return pick(STR);
  if (r < 0.75) return pick([0, 1, -7, 3.25, 1e21, 1e-7, 123456]);
  if (r < 0.85) return rnd() < 0.5;
  return null;
}
const generated = [];
for (let i = 0; i < 90; i++) {
  const ctx = {};
  const n = Math.floor(rnd() * 4);
  for (let k = 0; k < n; k++) ctx[pick(KEYS)] = genValue(0);
  const rec = { time: T, level: pick([...LV, "INFO", "Warning"]), message: pick(["m {user} {ms}", "plain", "multi\nline {id}", "{password}", "q\"uote"]), context: ctx };
  if (rnd() < 0.3) rec.channel = pick(["http", "db.pool", "job-1"]);
  const fmt = ["json", "line", "logfmt"][i % 3];
  const args = [JSON.parse(JSON.stringify(rec)), fmt];
  generated.push({ name: `generated ${String(i + 1).padStart(3, "0")} ${fmt}`, fn: "formatRecord", args, expect: run("formatRecord", args) });
}

const doc = {
  format: "lomboklog-vectors-v1",
  specVersion: "0.1.0",
  note: "Normative cross-language vectors. Each case calls `fn` with `args`; `expect` is {result} or {error: code}.",
  groups: [
    { name: "golden", cases: golden },
    { name: "generated-regression", cases: generated },
  ],
};
// ASCII-only file: non-ASCII characters are written as JSON \u escapes (UTF-16 code units).
const ascii = JSON.stringify(doc, null, 1).replace(/[\u0080-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
writeFileSync(join(root, "vectors", "lomboklog-vectors-v1.json"), ascii + "\n");
const sha = createHash("sha256").update(readFileSync(join(root, "vectors", "lomboklog-vectors-v1.json"))).digest("hex");
console.log(`golden=${golden.length} generated=${generated.length} total=${golden.length + generated.length} sha256=${sha}`);
