# Lang LombokLog v0.1.0

## 1. Tingkat i18n

Tingkat **E** (pesan error dan dokumentasi saja). Library tidak menerjemahkan isi log; teks log adalah milik aplikasi.

## 2. Katalog ID pesan (normatif)

Format `lomboklog.<jenis>.<kode>`. Berkas katalog: `locales/<bcp47>/lomboklog.json`, satu berkas untuk semua port.

| ID | Teks sumber (en) | Kode galat |
|---|---|---|
| `lomboklog.error.invalid_level` | The log level is not one of the eight RFC 5424 severities. | `invalid_level` |
| `lomboklog.error.invalid_format` | The output format is not supported. | `invalid_format` |
| `lomboklog.error.invalid_record` | The log record or its context has an invalid shape. | `invalid_record` |
| `lomboklog.error.invalid_channel` | The channel name must be 1 to 64 characters of letters, digits, '_', '.' or '-'. | `invalid_channel` |
| `lomboklog.error.invalid_time` | The timestamp must be an integer number of milliseconds between 0 and 253402300799999. | `invalid_time` |
| `lomboklog.error.invalid_option` | A redaction option is invalid. | `invalid_option` |

Galat membawa `code` (kontrak, sama di semua port) dan `messageId`. Pesan `message` di objek galat berbahasa Inggris dan tidak bersifat normatif.

## 3. Cakupan saat ini

Core-20: 2 dari 20 (`en`, `id`). Paket Nusantara: 0 dari 6. Bahasa lain belum ada. Katalog bahasa tambahan harus ditinjau penutur asli sebelum diterima.

## 4. Cara menambah bahasa

1. Salin `locales/en/lomboklog.json` ke `locales/<bcp47>/lomboklog.json`.
2. Terjemahkan nilai; kunci tidak diubah.
3. Minta tinjauan penutur asli, lalu ajukan PR.

## 5. Ketergantungan LombokLocale

Tidak ada pada 0.1.0. Konsumen yang memakai LombokLocale dapat me-resolve `messageId` terhadap katalog di atas.
