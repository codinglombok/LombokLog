# Kebijakan Keamanan

## Versi yang didukung

| Versi | Dukungan |
|---|---|
| 0.1.x | Perbaikan keamanan |

## Melaporkan kerentanan

Gunakan **GitHub Private Vulnerability Reporting** pada repo ini (tab Security, "Report a vulnerability"). Jangan membuka issue publik untuk kerentanan.

- Respons awal: paling lama 48 jam.
- Perbaikan untuk temuan kritis: target 7 hari.
- Pengungkapan dikoordinasikan dengan pelapor.

## Cakupan

Dalam cakupan: formatter dan redaksi (`redact`, `formatRecord`, `interpolate`), khususnya cara apa pun agar nilai di bawah kunci sensitif lolos ke keluaran, satu record menghasilkan lebih dari satu baris, atau masukan menyebabkan panic, crash, atau waktu eksekusi tak terbatas.

Di luar cakupan: handler I/O milik aplikasi (berkas, jaringan), rotasi berkas, dan pengiriman log ke layanan eksternal.

## Model ancaman ringkas

Lihat bagian Keamanan pada `docs/SPEC_LombokLog_v0.1.0.md`.
