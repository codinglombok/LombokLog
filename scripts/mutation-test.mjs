// Mutation check for GP-11: inject a defect into the compiled TypeScript core and require the
// vector runner to fail. Usage (from repo root, after `npm test` built typescript/dist-test):
//   node scripts/mutation-test.mjs
import { cpSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ts = join(root, "typescript");
const tmp = join(ts, ".mut");
const TARGET = "log.js";
const MUTATIONS = [
  ["return a <= b;", "return a < b;", "isEnabled comparison"],
  ['"pin",', "", "default key pin"],
  ["depth > MAX_CONTEXT_DEPTH", "depth >= MAX_CONTEXT_DEPTH", "depth limit off by one"],
  ["MAX_CONTEXT_DEPTH = 16", "MAX_CONTEXT_DEPTH = 1000", "depth limit removed"],
  ["l.includes(k)", "l === k", "substring matching"],
  ["const l = asciiLower(key);", "const l = key;", "case-insensitive keys"],
  ['DEFAULT_MASK = "[redacted]"', 'DEFAULT_MASK = "[REDACTED]"', "mask text"],
  ["/\\{([A-Za-z0-9_.]+)\\}/g", "/\\{([A-Za-z0-9_]+)\\}/g", "dotted placeholder keys"],
  ['typeof v === "boolean" || v === null', 'typeof v === "boolean"', "null interpolation"],
  ["MAX_TIME = 253402300799999", "MAX_TIME = 253402300800000", "time upper bound"],
  ['.replace(/\\r\\n|\\n|\\r/g, "\\\\n")', '.replace(/\\n/g, "\\\\n")', "line CR handling"],
  ["/^[A-Za-z0-9_.-]{1,64}$/", "/^[A-Za-z0-9_.-]{1,65}$/", "channel length"],
  ['let channel = "app";', 'let channel = "main";', "default channel"],
  ["if (hasContext)", "if (true)", "empty context omitted"],
  ["level.toUpperCase()", "level", "line level case"],
  ['prefix === "" ? k : `${prefix}.${k}`', 'prefix === "" ? k : `${prefix}_${k}`', "logfmt flatten separator"],
  ['return s === "" ? "_" : s;', "return s;", "logfmt empty key"],
  ['if (s !== "" && ', "if (", "logfmt empty value quoting"],
  ['out += "\\\\r"', 'out += "\\\\n"', "logfmt CR escape"],
  ["Object.keys(v).length > 0", "true", "logfmt empty object"],
  ['typeof time !== "string" || time === "" || CONTROL.test(time)', 'typeof time !== "string"', "time validation"],
  ["const level = parseLevel(record[\"level\"]);", "const level = record[\"level\"];", "level canonicalisation"],
];

const src = readFileSync(join(ts, "dist-test", "src", TARGET), "utf8");
let survived = 0;
for (const [find, repl, label] of MUTATIONS) {
  const count = src.split(find).length - 1;
  if (count === 0) { console.log(`SKIP     ${label}: pattern not found`); survived++; continue; }
  rmSync(tmp, { recursive: true, force: true });
  cpSync(join(ts, "dist-test"), tmp, { recursive: true });
  writeFileSync(join(tmp, "src", TARGET), src.split(find).join(repl));
  const r = spawnSync(process.execPath, ["--test", join(tmp, "test", "vectors.test.js")], { encoding: "utf8" });
  const killed = r.status !== 0;
  if (!killed) survived++;
  console.log(`${killed ? "KILLED  " : "SURVIVED"} ${label}`);
}
rmSync(tmp, { recursive: true, force: true });
console.log(`\n${MUTATIONS.length - survived}/${MUTATIONS.length} mutants killed`);
process.exit(survived === 0 ? 0 : 1);
