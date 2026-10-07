//! Runtime convenience on top of the pure core: a clock, a minimum level and a sink.

use crate::{format_record, format_time, Format, Level, RedactOptions, Result, Value};
use alloc::string::{String, ToString};
use alloc::vec::Vec;

/// Receives each rendered line. Implementations own all I/O.
pub trait Sink {
    fn write(&mut self, line: &str, level: Level);
}

/// Keeps lines in memory; useful for tests and `no_std` targets.
#[derive(Debug, Default, Clone)]
pub struct MemorySink {
    pub lines: Vec<String>,
}

impl Sink for MemorySink {
    fn write(&mut self, line: &str, _level: Level) {
        self.lines.push(line.to_string());
    }
}

/// Writes each line plus `\n` to any `std::io::Write` (a file, `stderr`, a socket).
/// Write errors are ignored: logging must not take the process down.
#[cfg(feature = "std")]
pub struct WriterSink<W: std::io::Write>(pub W);

#[cfg(feature = "std")]
impl<W: std::io::Write> Sink for WriterSink<W> {
    fn write(&mut self, line: &str, _level: Level) {
        let _ = self.0.write_all(line.as_bytes());
        let _ = self.0.write_all(b"\n");
    }
}

/// A configured logger. The clock returns epoch milliseconds.
pub struct Logger<S: Sink, C: Fn() -> u64> {
    pub sink: S,
    clock: C,
    channel: String,
    min_level: Level,
    format: Format,
    options: RedactOptions,
    context: Vec<(String, Value)>,
}

impl<S: Sink, C: Fn() -> u64> Logger<S, C> {
    /// New logger on channel `app`, minimum level `debug`, JSON format, default redaction.
    pub fn new(sink: S, clock: C) -> Self {
        Logger {
            sink,
            clock,
            channel: "app".to_string(),
            min_level: Level::Debug,
            format: Format::Json,
            options: RedactOptions::default(),
            context: Vec::new(),
        }
    }
    pub fn channel(mut self, channel: &str) -> Self {
        self.channel = channel.to_string();
        self
    }
    pub fn min_level(mut self, level: Level) -> Self {
        self.min_level = level;
        self
    }
    pub fn format(mut self, format: Format) -> Self {
        self.format = format;
        self
    }
    pub fn options(mut self, options: RedactOptions) -> Self {
        self.options = options;
        self
    }
    /// Add base context (call-site context with the same key wins).
    pub fn with(mut self, key: &str, value: Value) -> Self {
        let mut o = Value::Obj(core::mem::take(&mut self.context));
        o.set(key, value);
        if let Value::Obj(m) = o {
            self.context = m;
        }
        self
    }

    /// Render and write one record. Returns `Ok(None)` when the level is below the minimum.
    pub fn log(
        &mut self,
        level: Level,
        message: &str,
        context: &[(&str, Value)],
    ) -> Result<Option<String>> {
        if !level.is_at_least(self.min_level) {
            return Ok(None);
        }
        let mut ctx = Value::Obj(self.context.clone());
        for (k, v) in context {
            ctx.set(k, v.clone());
        }
        let mut rec = Value::Obj(Vec::new());
        rec.set("time", Value::Str(format_time((self.clock)() as f64)?));
        rec.set("level", Value::Str(level.as_str().to_string()));
        rec.set("channel", Value::Str(self.channel.clone()));
        rec.set("message", Value::Str(message.to_string()));
        rec.set("context", ctx);
        let line = format_record(&rec, self.format, &self.options)?;
        self.sink.write(&line, level);
        Ok(Some(line))
    }
}
