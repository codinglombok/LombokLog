# Development IDE LombokLog v0.1.0

## 1. Roadmap

| Versi | Isi |
|---|---|
| 0.1.1 | Tutup syarat rilis: CI dijalankan, `doctor docs/privacy/style`, coverage diukur, target `cargo-fuzz` |
| 0.2.0 | Format syslog RFC 5424 dan GELF; sink berkas dengan rotasi (std); port Python, Go, PHP |
| 0.3.0 | Redaksi berbasis pola nilai opsional (nomor kartu dengan Luhn, JWT); sampling; integrasi LombokLocale |

## 2. Deferred scope

Lihat SPEC bagian Non-goals dan README (Batasan).

## 3. Prinsip desain kontributor

- Kontrak dulu, test dulu; semua port lulus vector yang sama.
- Tidak ada dependensi runtime; dev-dependency dicatat.
- Fungsi inti murni: jam, keacakan, dan I/O dipasok pemanggil.
- Setiap baris keluaran tetap satu baris apa pun masukannya.
- Daftar kunci sensitif hanya bertambah, tidak pernah berkurang lewat opsi.

## 4. Cara berkontribusi

Lihat `CONTRIBUTING.md`.

## 5. Pertanyaan terbuka

- Apakah pencocokan kunci sebaiknya berbasis token (`pin` tidak cocok dengan `shipping`) dengan risiko kebocoran yang lebih besar?
- Apakah `logfmt` perlu awalan untuk kunci konteks (`ctx.`) agar tidak bertabrakan dengan kunci bawaan?
