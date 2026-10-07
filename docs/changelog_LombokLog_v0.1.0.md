# Changelog LombokLog (ringkasan)

Entri terbaru di depan. Rincian ada di `CHANGELOG.md`.

## 0.1.0 - 2026-10-07

### Added
- Level RFC 5424, redaksi, interpolasi, formatter `json`/`line`/`logfmt`, `formatTime`.
- `Logger` dan sink.
- Port Rust `no_std + alloc` dan port TypeScript.
- Vector 290 kasus; runner di kedua port; fuzz, uji mutasi.

### Security
- Redaksi selalu aktif sebelum interpolasi dan render; tidak dapat dimatikan.
- Satu record selalu tepat satu baris (mencegah pemalsuan baris log).
- Batas kedalaman konteks 16 dan batas parser JSON 512.
