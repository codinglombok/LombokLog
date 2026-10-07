// LombokLog core (TypeScript port). Normative behaviour: docs/SPEC_LombokLog_v0.1.0.md.
// Pure functions only; the Logger class in logger.ts adds clock and sink plumbing on top.

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
export type JsonObject = { [k: string]: Json };

export type ErrorCode = "invalid_level" | "invalid_format" | "invalid_record" | "invalid_channel" | "invalid_time" | "invalid_option";

export class LombokLogError extends Error {
  readonly code: ErrorCode;
  readonly messageId: string;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "LombokLogError";
    this.code = code;
    this.messageId = `lomboklog.error.${code}`;
  }
}

const fail = (code: ErrorCode, message: string): never => {
  throw new LombokLogError(code, message);
};

/** The eight RFC 5424 severities, most severe first. */
export const LEVELS = ["emergency", "alert", "critical", "error", "warning", "notice", "info", "debug"] as const;
export type Level = (typeof LEVELS)[number];

export const DEFAULT_SENSITIVE_KEYS: readonly string[] = [
  "password", "passwd", "secret", "token", "authorization", "auth", "credential", "api_key", "apikey",
  "private_key", "access_key", "session", "cookie", "csrf", "signature", "card_number", "cvv", "ssn", "pin",
];
export const DEFAULT_MASK = "[redacted]";
export const MAX_CONTEXT_DEPTH = 16;
export const FORMATS = ["json", "line", "logfmt"] as const;
export type Format = (typeof FORMATS)[number];

const isObject = (v: unknown): v is JsonObject => typeof v === "object" && v !== null && !Array.isArray(v);
const has = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);
const asciiLower = (s: string): string => s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));

/** Canonical level name; ASCII case-insensitive. */
export function parseLevel(level: unknown): Level {
  if (typeof level !== "string") return fail("invalid_level", "level must be a string");
  const l = asciiLower(level);
  for (const name of LEVELS) if (name === l) return name;
  return fail("invalid_level", `unknown level: ${level}`);
}

/** RFC 5424 numeric severity: 0 (emergency) .. 7 (debug). */
export function severity(level: unknown): number {
  return LEVELS.indexOf(parseLevel(level));
}

/** True when `level` is at least as severe as `minLevel`. */
export function isEnabled(level: unknown, minLevel: unknown): boolean {
  const a = severity(level);
  const b = severity(minLevel);
  return a <= b;
}

export interface RedactOptions {
  /** Additional sensitive key substrings (added to the defaults, never replacing them). */
  redactKeys?: string[];
  /** Replacement text, default `[redacted]`. */
  mask?: string;
}

interface Resolved {
  keys: string[];
  mask: string;
}

function resolveOptions(options: unknown): Resolved {
  if (options === undefined || options === null) return { keys: [...DEFAULT_SENSITIVE_KEYS], mask: DEFAULT_MASK };
  if (!isObject(options)) return fail("invalid_option", "options must be an object");
  const keys = [...DEFAULT_SENSITIVE_KEYS];
  const extra = options["redactKeys"];
  if (extra !== undefined) {
    if (!Array.isArray(extra)) return fail("invalid_option", "redactKeys must be an array of strings");
    for (const k of extra) {
      if (typeof k !== "string" || k === "") return fail("invalid_option", "redactKeys entries must be non-empty strings");
      keys.push(asciiLower(k));
    }
  }
  const mask = options["mask"];
  if (mask !== undefined && typeof mask !== "string") return fail("invalid_option", "mask must be a string");
  return { keys, mask: mask ?? DEFAULT_MASK };
}

function isSensitive(key: string, keys: string[]): boolean {
  const l = asciiLower(key);
  for (const k of keys) if (l.includes(k)) return true;
  return false;
}

function redactValue(v: Json, depth: number, o: Resolved): Json {
  if (Array.isArray(v)) {
    if (depth > MAX_CONTEXT_DEPTH) return "[truncated]";
    return v.map((x) => redactValue(x, depth + 1, o));
  }
  if (isObject(v)) {
    if (depth > MAX_CONTEXT_DEPTH) return "[truncated]";
    const out: JsonObject = {};
    for (const k of Object.keys(v)) out[k] = isSensitive(k, o.keys) ? o.mask : redactValue(v[k] as Json, depth + 1, o);
    return out;
  }
  return v;
}

/** Mask every value whose object key contains a sensitive substring (ASCII case-insensitive). */
export function redact(context: unknown, options?: RedactOptions): JsonObject {
  const o = resolveOptions(options);
  if (!isObject(context)) return fail("invalid_record", "context must be an object");
  return redactValue(context, 0, o) as JsonObject;
}

const PLACEHOLDER = /\{([A-Za-z0-9_.]+)\}/g;

/** Replace `{key}` placeholders with scalar context values (PSR-3 style). */
export function interpolate(message: unknown, context: unknown): string {
  if (typeof message !== "string") return fail("invalid_record", "message must be a string");
  if (context === undefined) return message;
  if (!isObject(context)) return fail("invalid_record", "context must be an object");
  return message.replace(PLACEHOLDER, (whole, key: string) => {
    if (!has(context, key)) return whole;
    const v = context[key];
    if (typeof v === "string") return v;
    if (typeof v === "number") return JSON.stringify(v);
    if (typeof v === "boolean" || v === null) return String(v);
    return whole;
  });
}

const MAX_TIME = 253402300799999;

/** ISO 8601 UTC timestamp with milliseconds for epoch milliseconds 0..253402300799999. */
export function formatTime(epochMillis: unknown): string {
  if (typeof epochMillis !== "number" || !Number.isInteger(epochMillis) || epochMillis < 0 || epochMillis > MAX_TIME) {
    return fail("invalid_time", "time must be an integer in 0..253402300799999");
  }
  return new Date(epochMillis).toISOString();
}

export interface LogRecord {
  time: string;
  level: string;
  message: string;
  channel?: string;
  context?: JsonObject;
}

const CHANNEL = /^[A-Za-z0-9_.-]{1,64}$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;

const hex4 = (c: number): string => "\\u" + c.toString(16).padStart(4, "0");

function lineEscape(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\r\n|\n|\r/g, "\\n").replace(/[\u0000-\u001f\u007f]/g, (c) => hex4(c.charCodeAt(0)));
}

function logfmtKey(k: string): string {
  // eslint-disable-next-line no-control-regex
  const s = k.replace(/[ ="\u0000-\u001f\u007f]/g, "_");
  return s === "" ? "_" : s;
}

function logfmtValue(s: string): string {
  // eslint-disable-next-line no-control-regex
  if (s !== "" && !/[ ="\\\u0000-\u001f\u007f]/.test(s)) return s;
  let out = '"';
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (ch === "\\") out += "\\\\";
    else if (ch === '"') out += '\\"';
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (c < 0x20 || c === 0x7f) out += hex4(c);
    else out += ch;
  }
  return out + '"';
}

function scalarText(v: Json): string {
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

function flatten(prefix: string, v: Json, out: string[]): void {
  if (isObject(v) && Object.keys(v).length > 0) {
    for (const k of Object.keys(v)) flatten(prefix === "" ? k : `${prefix}.${k}`, v[k] as Json, out);
    return;
  }
  out.push(`${logfmtKey(prefix)}=${logfmtValue(scalarText(v))}`);
}

/**
 * Validate, redact, interpolate and render one record as a single line.
 * Order: format, options, record fields (level, time, message, channel, context).
 */
export function formatRecord(record: unknown, format: unknown, options?: RedactOptions): string {
  if (typeof format !== "string" || !(FORMATS as readonly string[]).includes(format)) return fail("invalid_format", `unknown format: ${String(format)}`);
  const o = resolveOptions(options);
  if (!isObject(record)) return fail("invalid_record", "record must be an object");
  const level = parseLevel(record["level"]);
  const time = record["time"];
  if (typeof time !== "string" || time === "" || CONTROL.test(time)) return fail("invalid_record", "time must be a non-empty string without control characters");
  const message = record["message"];
  if (typeof message !== "string") return fail("invalid_record", "message must be a string");
  let channel = "app";
  if (has(record, "channel") && record["channel"] !== undefined) {
    const c = record["channel"];
    if (typeof c !== "string" || !CHANNEL.test(c)) return fail("invalid_channel", "channel must match ^[A-Za-z0-9_.-]{1,64}$");
    channel = c;
  }
  let context: JsonObject = {};
  if (has(record, "context") && record["context"] !== undefined) {
    if (!isObject(record["context"])) return fail("invalid_record", "context must be an object");
    context = redactValue(record["context"], 0, o) as JsonObject;
  }
  const msg = interpolate(message, context);
  const hasContext = Object.keys(context).length > 0;
  if (format === "json") {
    const payload: JsonObject = { time, level, channel, message: msg };
    if (hasContext) payload["context"] = context;
    return JSON.stringify(payload);
  }
  if (format === "line") {
    return `${time} ${level.toUpperCase()} [${channel}] ${lineEscape(msg)}${hasContext ? " " + JSON.stringify(context) : ""}`;
  }
  const parts = [`time=${logfmtValue(time)}`, `level=${level}`, `channel=${channel}`, `msg=${logfmtValue(msg)}`];
  for (const k of Object.keys(context)) flatten(k, context[k] as Json, parts);
  return parts.join(" ");
}
