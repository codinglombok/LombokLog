# Full Summary LombokLog v0.1.0

## Apa ini

Inti logging terstruktur: level RFC 5424, redaksi rahasia yang selalu aktif, interpolasi pesan, dan formatter satu baris JSON, line, dan logfmt yang identik antar bahasa.

## Mengapa dibuat

Rahasia paling sering bocor lewat log karena objek konteks dicatat utuh tanpa diperiksa. Redaksi yang harus diingat untuk diaktifkan akan terlupa. Selain itu layanan dalam bahasa berbeda menghasilkan baris log yang sedikit berbeda untuk data yang sama, sehingga parser di agregator harus menangani banyak variasi.

## Fitur utama

Lihat README (bagian Fitur). Semua fitur dicakup vector.

## Status saat ini

Kode lengkap untuk Rust dan TypeScript; lulus 290 kasus vector; belum terbit di registry; belum memenuhi aturan skor rilis (lihat `TECH_DEBT.md`).

## Contoh pemakai

Lihat README (skenario pemakaian).

## Batasan yang Diketahui

- Redaksi berbasis nama kunci; rahasia di teks pesan atau di kunci netral tidak terdeteksi.
- Pencocokan substring tumpul: `author` dan `shipping` ikut tersamarkan.
- Tidak ada rotasi berkas, buffering asinkron, sampling, atau pengiriman jaringan.
- `logfmt` tidak mencegah kunci konteks yang sama dengan kunci bawaan.
- Format syslog RFC 5424 lengkap (PRI, structured data) belum ada.
- Hanya dua port (Rust, TypeScript); fuzz berupa pseudo-fuzz, belum `cargo-fuzz`; belum audit pihak ketiga; coverage belum diukur.

## Info lanjut

SPEC_, API_, `development_ide_`.

## Gap vs pembanding (U6)

Perbandingan bersifat kualitatif dan berdasarkan pengetahuan umum tentang kategori library; belum diverifikasi fitur demi fitur pada 2026-10-07.

| Pembanding (kategori) | Yang dimiliki pembanding dan belum dimiliki LombokLog | Yang ditawarkan LombokLog |
|---|---|---|
| Logger satu bahasa (pino, winston, tracing, slog, Monolog) | Transport dan rotasi, sampling, span dan trace, integrasi framework, kinerja yang sudah diukur | Kontrak format lintas bahasa dengan vector bersama; redaksi wajib; inti `no_std + alloc`; tanpa dependensi |
| Pustaka redaksi terpisah | Deteksi pola berbasis nilai (nomor kartu, JWT) | Redaksi terpadu di jalur render sehingga tidak dapat terlewat |
