//! LombokLog core (Rust reference, `no_std + alloc`, zero dependencies).
//!
//! RFC 5424 levels, secret redaction, PSR-3 style interpolation and single-line JSON, line and
//! logfmt formatters. Output is byte-identical to the other ports for every vector in
//! `vectors/lomboklog-vectors-v1.json`; the normative contract is `docs/SPEC_LombokLog_v0.1.0.md`.
#![cfg_attr(not(feature = "std"), no_std)]
#![forbid(unsafe_code)]

extern crate alloc;

pub mod json;
mod logger;

pub use json::{parse_json, Value};
#[cfg(feature = "std")]
pub use logger::WriterSink;
pub use logger::{Logger, MemorySink, Sink};

use alloc::format;
use alloc::string::{String, ToString};
use alloc::vec::Vec;

/// Containers nested deeper than this inside a context are replaced by `"[truncated]"`.
pub const MAX_CONTEXT_DEPTH: usize = 16;
/// Default replacement for sensitive values.
pub const DEFAULT_MASK: &str = "[redacted]";
/// Key substrings that mark a value as sensitive (ASCII case-insensitive).
pub const DEFAULT_SENSITIVE_KEYS: [&str; 19] = [
    "password",
    "passwd",
    "secret",
    "token",
    "authorization",
    "auth",
    "credential",
    "api_key",
    "apikey",
    "private_key",
    "access_key",
    "session",
    "cookie",
    "csrf",
    "signature",
    "card_number",
    "cvv",
    "ssn",
    "pin",
];
const MAX_TIME: f64 = 253402300799999.0;

/// Error with a canonical `code` (contract) and an English message (not normative).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Error {
    pub code: &'static str,
    pub message: String,
}

impl Error {
    fn new(code: &'static str, message: &str) -> Self {
        Error {
            code,
            message: message.to_string(),
        }
    }
    /// Stable message id for translation through LombokLocale.
    pub fn message_id(&self) -> String {
        format!("lomboklog.error.{}", self.code)
    }
}

#[cfg(feature = "std")]
impl std::error::Error for Error {}

impl core::fmt::Display for Error {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

pub type Result<T> = core::result::Result<T, Error>;

/// The eight RFC 5424 severities, most severe first.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Level {
    Emergency = 0,
    Alert = 1,
    Critical = 2,
    Error = 3,
    Warning = 4,
    Notice = 5,
    Info = 6,
    Debug = 7,
}

/// All levels in severity order.
pub const LEVELS: [Level; 8] = [
    Level::Emergency,
    Level::Alert,
    Level::Critical,
    Level::Error,
    Level::Warning,
    Level::Notice,
    Level::Info,
    Level::Debug,
];

impl Level {
    /// Canonical lowercase name.
    pub fn as_str(self) -> &'static str {
        match self {
            Level::Emergency => "emergency",
            Level::Alert => "alert",
            Level::Critical => "critical",
            Level::Error => "error",
            Level::Warning => "warning",
            Level::Notice => "notice",
            Level::Info => "info",
            Level::Debug => "debug",
        }
    }
    /// RFC 5424 numeric severity (0 = emergency .. 7 = debug).
    pub fn severity(self) -> u8 {
        self as u8
    }
    /// True when `self` is at least as severe as `min`.
    pub fn is_at_least(self, min: Level) -> bool {
        self.severity() <= min.severity()
    }
}

/// Canonical level from a name; ASCII case-insensitive.
pub fn parse_level(s: &str) -> Result<Level> {
    let l = s.to_ascii_lowercase();
    LEVELS
        .iter()
        .copied()
        .find(|v| v.as_str() == l)
        .ok_or_else(|| Error::new("invalid_level", "unknown level"))
}

/// True when `level` is at least as severe as `min_level`.
pub fn is_enabled(level: &str, min_level: &str) -> Result<bool> {
    let a = parse_level(level)?;
    let b = parse_level(min_level)?;
    Ok(a.is_at_least(b))
}

/// Redaction settings. Extra keys are added to [`DEFAULT_SENSITIVE_KEYS`], never replacing them.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RedactOptions {
    pub extra_keys: Vec<String>,
    pub mask: String,
}

impl Default for RedactOptions {
    fn default() -> Self {
        RedactOptions {
            extra_keys: Vec::new(),
            mask: DEFAULT_MASK.to_string(),
        }
    }
}

impl RedactOptions {
    /// Build from the JSON options object of the contract (`redactKeys`, `mask`).
    pub fn from_value(v: Option<&Value>) -> Result<RedactOptions> {
        let mut o = RedactOptions::default();
        let v = match v {
            None | Some(Value::Null) => return Ok(o),
            Some(v) => v,
        };
        if v.as_obj().is_none() {
            return Err(Error::new("invalid_option", "options must be an object"));
        }
        if let Some(k) = v.get("redactKeys") {
            let arr = k.as_arr().ok_or_else(|| {
                Error::new("invalid_option", "redactKeys must be an array of strings")
            })?;
            for item in arr {
                match item {
                    Value::Str(s) if !s.is_empty() => o.extra_keys.push(s.clone()),
                    _ => {
                        return Err(Error::new(
                            "invalid_option",
                            "redactKeys entries must be non-empty strings",
                        ))
                    }
                }
            }
        }
        if let Some(m) = v.get("mask") {
            match m {
                Value::Str(s) => o.mask = s.clone(),
                _ => return Err(Error::new("invalid_option", "mask must be a string")),
            }
        }
        Ok(o)
    }
    fn validate(&self) -> Result<()> {
        if self.extra_keys.iter().any(|k| k.is_empty()) {
            return Err(Error::new(
                "invalid_option",
                "redactKeys entries must be non-empty strings",
            ));
        }
        Ok(())
    }
    fn is_sensitive(&self, key: &str) -> bool {
        let l = key.to_ascii_lowercase();
        DEFAULT_SENSITIVE_KEYS.iter().any(|k| l.contains(k))
            || self
                .extra_keys
                .iter()
                .any(|k| l.contains(k.to_ascii_lowercase().as_str()))
    }
}

fn redact_value(v: &Value, depth: usize, o: &RedactOptions) -> Value {
    match v {
        Value::Arr(a) => {
            if depth > MAX_CONTEXT_DEPTH {
                return Value::Str("[truncated]".to_string());
            }
            Value::Arr(a.iter().map(|x| redact_value(x, depth + 1, o)).collect())
        }
        Value::Obj(_) => {
            if depth > MAX_CONTEXT_DEPTH {
                return Value::Str("[truncated]".to_string());
            }
            let mut out = Vec::new();
            for (k, x) in v.js_entries() {
                let nv = if o.is_sensitive(k) {
                    Value::Str(o.mask.clone())
                } else {
                    redact_value(x, depth + 1, o)
                };
                out.push((k.clone(), nv));
            }
            Value::Obj(out)
        }
        other => other.clone(),
    }
}

/// Mask every value whose object key contains a sensitive substring. `context` must be an object.
pub fn redact(context: &Value, options: &RedactOptions) -> Result<Value> {
    options.validate()?;
    if context.as_obj().is_none() {
        return Err(Error::new("invalid_record", "context must be an object"));
    }
    Ok(redact_value(context, 0, options))
}

fn is_key_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_' || c == '.'
}

/// Replace `{key}` placeholders with scalar context values (PSR-3 style).
pub fn interpolate(message: &str, context: Option<&Value>) -> Result<String> {
    let ctx = match context {
        None => return Ok(message.to_string()),
        Some(c) if c.as_obj().is_some() => c,
        Some(_) => return Err(Error::new("invalid_record", "context must be an object")),
    };
    let chars: Vec<char> = message.chars().collect();
    let mut out = String::with_capacity(message.len());
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '{' {
            let mut j = i + 1;
            while j < chars.len() && is_key_char(chars[j]) {
                j += 1;
            }
            if j > i + 1 && j < chars.len() && chars[j] == '}' {
                let key: String = chars[i + 1..j].iter().collect();
                let rep = match ctx.get(&key) {
                    Some(Value::Str(s)) => Some(s.clone()),
                    Some(Value::Num(n)) => Some(json::js_number(*n)),
                    Some(Value::Bool(b)) => Some(if *b { "true" } else { "false" }.to_string()),
                    Some(Value::Null) => Some("null".to_string()),
                    _ => None,
                };
                match rep {
                    Some(r) => out.push_str(&r),
                    None => out.extend(chars[i..=j].iter()),
                }
                i = j + 1;
                continue;
            }
        }
        out.push(chars[i]);
        i += 1;
    }
    Ok(out)
}

/// ISO 8601 UTC timestamp with milliseconds (`1970-01-01T00:00:00.000Z`) for epoch milliseconds
/// in `0..=253402300799999`.
pub fn format_time(epoch_millis: f64) -> Result<String> {
    if !(epoch_millis.is_finite()
        && (0.0..=MAX_TIME).contains(&epoch_millis)
        && epoch_millis == (epoch_millis as u64) as f64)
    {
        return Err(Error::new(
            "invalid_time",
            "time must be an integer in 0..253402300799999",
        ));
    }
    let ms = epoch_millis as u64;
    let days = (ms / 86_400_000) as i64;
    let rem = ms % 86_400_000;
    // civil_from_days (H. Hinnant), valid for the whole range above.
    let z = days + 719_468;
    let era = z / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + if m <= 2 { 1 } else { 0 };
    Ok(format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        y,
        m,
        d,
        rem / 3_600_000,
        (rem / 60_000) % 60,
        (rem / 1000) % 60,
        rem % 1000
    ))
}

/// Output format of [`format_record`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Format {
    Json,
    Line,
    Logfmt,
}

impl Format {
    pub fn parse(s: &str) -> Result<Format> {
        match s {
            "json" => Ok(Format::Json),
            "line" => Ok(Format::Line),
            "logfmt" => Ok(Format::Logfmt),
            _ => Err(Error::new("invalid_format", "unknown format")),
        }
    }
}

fn is_control(c: char) -> bool {
    (c as u32) < 0x20 || c as u32 == 0x7f
}

fn push_hex4(out: &mut String, c: char) {
    out.push_str(&format!("\\u{:04x}", c as u32));
}

fn line_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut it = s.chars().peekable();
    while let Some(c) = it.next() {
        match c {
            '\r' => {
                if it.peek() == Some(&'\n') {
                    it.next();
                }
                out.push_str("\\n");
            }
            '\n' => out.push_str("\\n"),
            c if is_control(c) => push_hex4(&mut out, c),
            c => out.push(c),
        }
    }
    out
}

fn logfmt_key(k: &str) -> String {
    let s: String = k
        .chars()
        .map(|c| {
            if c == ' ' || c == '=' || c == '"' || is_control(c) {
                '_'
            } else {
                c
            }
        })
        .collect();
    if s.is_empty() {
        "_".to_string()
    } else {
        s
    }
}

fn logfmt_value(s: &str) -> String {
    let needs = s.is_empty()
        || s.chars()
            .any(|c| c == ' ' || c == '=' || c == '"' || c == '\\' || is_control(c));
    if !needs {
        return s.to_string();
    }
    let mut out = String::from("\"");
    for c in s.chars() {
        match c {
            '\\' => out.push_str("\\\\"),
            '"' => out.push_str("\\\""),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if is_control(c) => push_hex4(&mut out, c),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

fn scalar_text(v: &Value) -> String {
    match v {
        Value::Str(s) => s.clone(),
        other => other.to_json(),
    }
}

fn flatten(prefix: &str, v: &Value, out: &mut Vec<String>) {
    if let Value::Obj(m) = v {
        if !m.is_empty() {
            for (k, x) in v.js_entries() {
                let p = if prefix.is_empty() {
                    k.clone()
                } else {
                    format!("{}.{}", prefix, k)
                };
                flatten(&p, x, out);
            }
            return;
        }
    }
    out.push(format!(
        "{}={}",
        logfmt_key(prefix),
        logfmt_value(&scalar_text(v))
    ));
}

fn valid_channel(c: &str) -> bool {
    !c.is_empty()
        && c.len() <= 64
        && c.bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'.' || b == b'-')
}

/// Validate, redact, interpolate and render one record (a JSON object with `time`, `level`,
/// `message` and optional `channel` and `context`) as exactly one line.
pub fn format_record(record: &Value, format: Format, options: &RedactOptions) -> Result<String> {
    options.validate()?;
    if record.as_obj().is_none() {
        return Err(Error::new("invalid_record", "record must be an object"));
    }
    let level = match record.get("level") {
        Some(Value::Str(s)) => parse_level(s)?,
        _ => return Err(Error::new("invalid_level", "level must be a string")),
    };
    let time = match record.get("time") {
        Some(Value::Str(t)) if !t.is_empty() && !t.chars().any(is_control) => t.clone(),
        _ => {
            return Err(Error::new(
                "invalid_record",
                "time must be a non-empty string without control characters",
            ))
        }
    };
    let message = match record.get("message") {
        Some(Value::Str(m)) => m.clone(),
        _ => return Err(Error::new("invalid_record", "message must be a string")),
    };
    let channel = match record.get("channel") {
        None => "app".to_string(),
        Some(Value::Str(c)) if valid_channel(c) => c.clone(),
        Some(_) => {
            return Err(Error::new(
                "invalid_channel",
                "channel must match ^[A-Za-z0-9_.-]{1,64}$",
            ))
        }
    };
    let context = match record.get("context") {
        None => Value::Obj(Vec::new()),
        Some(c) if c.as_obj().is_some() => redact_value(c, 0, options),
        Some(_) => return Err(Error::new("invalid_record", "context must be an object")),
    };
    let msg = interpolate(&message, Some(&context))?;
    let has_context = matches!(&context, Value::Obj(m) if !m.is_empty());
    Ok(match format {
        Format::Json => {
            let mut p = Value::Obj(Vec::new());
            p.set("time", Value::Str(time));
            p.set("level", Value::Str(level.as_str().to_string()));
            p.set("channel", Value::Str(channel));
            p.set("message", Value::Str(msg));
            if has_context {
                p.set("context", context);
            }
            p.to_json()
        }
        Format::Line => {
            let mut s = format!(
                "{} {} [{}] {}",
                time,
                level.as_str().to_ascii_uppercase(),
                channel,
                line_escape(&msg)
            );
            if has_context {
                s.push(' ');
                s.push_str(&context.to_json());
            }
            s
        }
        Format::Logfmt => {
            let mut parts = Vec::new();
            parts.push(format!("time={}", logfmt_value(&time)));
            parts.push(format!("level={}", level.as_str()));
            parts.push(format!("channel={}", channel));
            parts.push(format!("msg={}", logfmt_value(&msg)));
            for (k, x) in context.js_entries() {
                flatten(k, x, &mut parts);
            }
            parts.join(" ")
        }
    })
}

/// Dynamic entry point with the contract's JSON calling convention (`fn`, `args`), used by the
/// vector runner and by FFI or script hosts. Unknown `fn` yields `invalid_option`.
pub fn call(func: &str, args: &[Value]) -> Result<Value> {
    let arg = |i: usize| args.get(i);
    let level_arg = |i: usize| -> Result<Level> {
        match arg(i) {
            Some(Value::Str(s)) => parse_level(s),
            _ => Err(Error::new("invalid_level", "level must be a string")),
        }
    };
    match func {
        "parseLevel" => Ok(Value::Str(level_arg(0)?.as_str().to_string())),
        "severity" => Ok(Value::Num(level_arg(0)?.severity() as f64)),
        "isEnabled" => {
            let a = level_arg(0)?;
            let b = level_arg(1)?;
            Ok(Value::Bool(a.is_at_least(b)))
        }
        "interpolate" => {
            let m = match arg(0) {
                Some(Value::Str(s)) => s,
                _ => return Err(Error::new("invalid_record", "message must be a string")),
            };
            Ok(Value::Str(interpolate(m, arg(1))?))
        }
        "redact" => {
            let o = RedactOptions::from_value(arg(1))?;
            redact(arg(0).unwrap_or(&Value::Null), &o)
        }
        "formatTime" => match arg(0) {
            Some(Value::Num(n)) => Ok(Value::Str(format_time(*n)?)),
            _ => Err(Error::new("invalid_time", "time must be a number")),
        },
        "formatRecord" => {
            let f = match arg(1) {
                Some(Value::Str(s)) => Format::parse(s)?,
                _ => return Err(Error::new("invalid_format", "format must be a string")),
            };
            let o = RedactOptions::from_value(arg(2))?;
            Ok(Value::Str(format_record(
                arg(0).unwrap_or(&Value::Null),
                f,
                &o,
            )?))
        }
        _ => Err(Error::new("invalid_option", "unknown function")),
    }
}
