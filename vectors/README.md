# Vectors

`lomboklog-vectors-v1.json` adalah kontrak uji lintas bahasa untuk LombokLog.

- SHA-256: `fa679022004b8d05f6ca234b8e3f28af129d8c9acb77a5dc168a72f9de1fccc0` (harus sama dengan `docs/SPEC_LombokLog_v0.1.0.md`).
- Dibangkitkan oleh `scripts/gen-vectors.mjs`. Grup `golden`: ekspektasi ditulis tangan dan dicocokkan dengan port TypeScript saat pembangkitan (ketidakcocokan menggagalkan pembangkitan). Grup `generated-regression`: record acak berbenih, ekspektasi dari port TypeScript dan dikonfirmasi port Rust.
- Setiap kasus memanggil fungsi `fn` dengan `args`; `expect` berbentuk `{ "result": ... }` atau `{ "error": code }`.
- Setiap port yang diklaim MUST menjalankan seluruh kasus.
- Jumlah: 290 kasus (200 golden berekspektasi tulis tangan, 90 regresi hasil pembangkit).
