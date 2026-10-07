# Changelog

Semua perubahan penting dicatat di sini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/); entri terbaru di depan. Versi mengikuti [SemVer](https://semver.org/).

## [0.1.0] - 2026-10-07

### Added
- Delapan level RFC 5424 dengan `parseLevel`, `severity`, `isEnabled`.
- Redaksi rahasia berbasis nama kunci (19 substring bawaan, kunci tambahan, mask, batas kedalaman 16).
- Interpolasi pesan `{kunci}` gaya PSR-3.
- Formatter satu baris `json`, `line`, dan `logfmt`; `formatTime` ISO 8601 UTC.
- `Logger` runtime dengan level minimum, jam yang dapat disuntikkan, konteks dasar, `child`, dan sink.
- Port Rust (`no_std + alloc`, tanpa dependensi, titik masuk dinamis `call`) dan port TypeScript (tanpa dependensi runtime).
- Vector bersama 290 kasus (200 golden berekspektasi tulis tangan, 90 regresi hasil pembangkit), dijalankan oleh runner Rust dan TypeScript.
- Pseudo-fuzz dan skrip uji mutasi (22 mutan).

### Security
- Redaksi selalu aktif sebelum interpolasi dan render; tidak dapat dimatikan.
- Satu record selalu tepat satu baris (mencegah pemalsuan baris log).
- Batas kedalaman konteks 16 dan batas parser JSON 512.
