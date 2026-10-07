// Runtime convenience on top of the pure core: a clock, a minimum level and a sink.
import { formatRecord, formatTime, isEnabled, parseLevel, type Format, type JsonObject, type Level } from "./log.js";

/** Receives each rendered line. Implementations own all I/O. */
export interface Sink {
  write(line: string, level: Level): void;
}

/** Keeps lines in memory; useful for tests. */
export class MemorySink implements Sink {
  readonly lines: string[] = [];
  write(line: string): void {
    this.lines.push(line);
  }
}

/** Writes to `console.error` for error and more severe, `console.log` otherwise. */
export class ConsoleSink implements Sink {
  write(line: string, level: Level): void {
    const c = (globalThis as { console?: { log(s: string): void; error(s: string): void } }).console;
    if (!c) return;
    if (isEnabled(level, "error")) c.error(line);
    else c.log(line);
  }
}

export interface LoggerOptions {
  sink: Sink;
  channel?: string;
  minLevel?: string;
  format?: Format;
  /** Epoch milliseconds; defaults to `Date.now`. */
  clock?: () => number;
  redactKeys?: string[];
  mask?: string;
  context?: JsonObject;
}

export class Logger {
  private readonly o: Required<Omit<LoggerOptions, "redactKeys" | "mask">> & Pick<LoggerOptions, "redactKeys" | "mask">;

  constructor(options: LoggerOptions) {
    this.o = {
      sink: options.sink,
      channel: options.channel ?? "app",
      minLevel: parseLevel(options.minLevel ?? "debug"),
      format: options.format ?? "json",
      clock: options.clock ?? (() => Date.now()),
      context: options.context ?? {},
      redactKeys: options.redactKeys,
      mask: options.mask,
    };
    // Validate channel, format and options once, up front.
    formatRecord({ time: "1970-01-01T00:00:00.000Z", level: "debug", message: "", channel: this.o.channel }, this.o.format, this.redactOptions());
  }

  private redactOptions(): { redactKeys?: string[]; mask?: string } {
    const r: { redactKeys?: string[]; mask?: string } = {};
    if (this.o.redactKeys !== undefined) r.redactKeys = this.o.redactKeys;
    if (this.o.mask !== undefined) r.mask = this.o.mask;
    return r;
  }

  /** Same configuration, different channel. */
  child(channel: string): Logger {
    return new Logger({ ...this.o, channel });
  }

  /** Same configuration with extra base context (call-site context still wins). */
  with(context: JsonObject): Logger {
    return new Logger({ ...this.o, context: { ...this.o.context, ...context } });
  }

  /** Returns the rendered line, or `null` when the level is below the minimum. */
  log(level: string, message: string, context?: JsonObject): string | null {
    const l = parseLevel(level);
    if (!isEnabled(l, this.o.minLevel)) return null;
    const line = formatRecord(
      { time: formatTime(this.o.clock()), level: l, channel: this.o.channel, message, context: { ...this.o.context, ...(context ?? {}) } },
      this.o.format,
      this.redactOptions(),
    );
    this.o.sink.write(line, l);
    return line;
  }

  emergency(m: string, c?: JsonObject): string | null { return this.log("emergency", m, c); }
  alert(m: string, c?: JsonObject): string | null { return this.log("alert", m, c); }
  critical(m: string, c?: JsonObject): string | null { return this.log("critical", m, c); }
  error(m: string, c?: JsonObject): string | null { return this.log("error", m, c); }
  warning(m: string, c?: JsonObject): string | null { return this.log("warning", m, c); }
  notice(m: string, c?: JsonObject): string | null { return this.log("notice", m, c); }
  info(m: string, c?: JsonObject): string | null { return this.log("info", m, c); }
  debug(m: string, c?: JsonObject): string | null { return this.log("debug", m, c); }
}
