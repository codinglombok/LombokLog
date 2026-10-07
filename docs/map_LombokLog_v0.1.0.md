# Map LombokLog v0.1.0

## 1. Posisi dependensi

L0. Posisi cluster dan nomor katalog mengikuti dokumen induk ekosistem v3.6 (tidak di-commit, ADR-024). Tidak memiliki dependensi Lombok wajib.

## 2. Contoh dependen di ekosistem

Bagian ini satu-satunya tempat nama aplikasi atau framework boleh muncul (ADR-019). Ini ilustrasi, bukan kepemilikan; siapa pun dapat memakai LombokLog.

| Pemakai | Jenis | Status integrasi | Keterangan |
|---|---|---|---|
| LombokClarion v3 | Framework | rencana (F7) | Menggantikan paket log internal v2 (level, redaksi, formatter JSON dan line) |
| LombokSQL | Library L0 | rencana (opsional) | Pencatatan query yang dikompilasi |
| LombokAuth, LombokSecurity | Library | rencana (opsional) | Jejak audit login dan pelanggaran rate limit |
| LombokDocFlow | Aplikasi | rencana | Log pemrosesan dokumen |

Integrasi opsional ke LombokJSON (serializer) dan LombokLocale (pesan galat) belum diimplementasikan; inti memakai serializer JSON internal yang setara.

## 3. Bergantung pada

Tidak ada.

## 4. Jalur kontrak normatif

`docs/SPEC_LombokLog_v0.1.0.md` -> `vectors/lomboklog-vectors-v1.json` (sha256 di SPEC) -> runner `rust/tests/vectors.rs` dan `typescript/test/vectors.test.ts`.

## 5. Peta folder

Lihat `structure_repo_LombokLog_v0.1.0.md`.
