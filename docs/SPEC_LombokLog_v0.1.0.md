# SPEC LombokLog v0.1.0

This document is the normative cross-language contract. Every language port MUST produce byte-identical output for all specified inputs. Deviations from this specification are bugs.

Key words MUST, MUST NOT, SHOULD and MAY are interpreted as in RFC 2119 and RFC 8174.

| Atribut | Nilai |
|---|---|
| Versi kontrak | 0.1.0 |
| Tanggal tinjauan standar acuan | 2026-10-07 |
| Vector | `vectors/lomboklog-vectors-v1.json` |
| SHA-256 vector | `fa679022004b8d05f6ca234b8e3f28af129d8c9acb77a5dc168a72f9de1fccc0` |

## 0. Standar acuan (U2)

| Acuan | Versi | Pemakaian |
|---|---|---|
| RFC 5424 | Maret 2009 | Nama dan urutan delapan severity |
| RFC 8259 | Desember 2017 | Keluaran JSON |
| ECMA-262 | 2024 | `Number::toString` dan `JSON.stringify` sebagai acuan format angka, escape string, dan urutan properti |
| RFC 3339 / ISO 8601 | 2002 / 2019 | Stempel waktu `formatTime` |
| RFC 2119, RFC 8174 | 1997, 2017 | Kata kunci normatif |

## 1. Vector

Berkas vector memuat `{ format, specVersion, note, groups }`. Setiap kasus memuat `name`, `fn`, `args` (array argumen JSON), dan `expect` berbentuk `{ "result": nilai }` atau `{ "error": code }`. Setiap port yang diklaim MUST menjalankan seluruh kasus dengan memanggil fungsi `fn` (bagian 2) dengan `args`. Hasil string MUST sama persis byte demi byte; hasil objek MUST sama secara struktural. Hash SHA-256 berkas MUST sama dengan tabel atribut.

## 2. Antarmuka

Semua fungsi MUST murni: tidak ada I/O, keadaan global, jam, atau keacakan.

| `fn` | Argumen | Hasil |
|---|---|---|
| `parseLevel` | `level` | nama level kanonik |
| `severity` | `level` | bilangan bulat 0..7 |
| `isEnabled` | `level`, `minLevel` | boolean |
| `interpolate` | `message`, `context?` | string |
| `redact` | `context`, `options?` | objek |
| `formatTime` | `epochMillis` | string |
| `formatRecord` | `record`, `format`, `options?` | string satu baris |

Port MAY menyediakan antarmuka tambahan (logger, sink), tetapi teks yang dihasilkannya MUST berasal dari `formatRecord`.

## 3. Level

Level sah, berurutan dari paling parah: `emergency` (0), `alert` (1), `critical` (2), `error` (3), `warning` (4), `notice` (5), `info` (6), `debug` (7). `parseLevel` menerima string yang sama dengan salah satu nama setelah pelipatan huruf **ASCII** (`A`-`Z` menjadi `a`-`z`; karakter lain tidak dilipat). Alias (`warn`, `fatal`, `trace`) dan spasi MUST ditolak dengan `invalid_level`; argumen bukan string juga `invalid_level`. `isEnabled(a, b)` bernilai `severity(a) <= severity(b)`; `a` divalidasi lebih dulu.

## 4. Redaksi

Opsi: objek dengan `redactKeys` (array string tidak kosong) dan `mask` (string, bawaan `[redacted]`). `options` yang tidak ada atau `null` berarti bawaan; bentuk lain MUST `invalid_option`. Opsi divalidasi sebelum konteks.

Daftar substring sensitif bawaan (urutan tidak berarti): `password`, `passwd`, `secret`, `token`, `authorization`, `auth`, `credential`, `api_key`, `apikey`, `private_key`, `access_key`, `session`, `cookie`, `csrf`, `signature`, `card_number`, `cvv`, `ssn`, `pin`. `redactKeys` ditambahkan setelah pelipatan ASCII; daftar bawaan MUST tidak dapat dikurangi.

Sebuah kunci objek sensitif bila pelipatan ASCII kunci memuat salah satu substring. Nilai di bawah kunci sensitif (termasuk objek dan array) MUST diganti `mask` utuh. Array ditelusuri; elemen array bukan kunci. Penelusuran memakai kedalaman: konteks tingkat atas berkedalaman 0, setiap anak kontainer bertambah 1; kontainer (objek atau array) dengan kedalaman lebih dari 16 MUST diganti string `[truncated]`. Skalar tidak berubah. `context` yang bukan objek MUST `invalid_record`.

## 5. Interpolasi

Placeholder adalah `{` + satu atau lebih karakter `[A-Za-z0-9_.]` + `}`, dipindai dari kiri ke kanan tanpa tumpang tindih (setara regex global `\{([A-Za-z0-9_.]+)\}`). Kunci dicari apa adanya (titik bukan jalur). Bila kunci ada dan nilainya string: diganti string itu; angka: teks angka (bagian 8); boolean: `true`/`false`; `null`: `null`. Kunci tidak ada, objek, atau array: placeholder dibiarkan. Hasil penggantian MUST tidak dipindai ulang. Tanpa konteks, pesan dikembalikan apa adanya. `message` bukan string atau konteks bukan objek (termasuk `null`) MUST `invalid_record`.

## 6. Waktu

`formatTime(ms)`: `ms` MUST bilangan bulat 0..253402300799999 (selain itu `invalid_time`). Keluaran `YYYY-MM-DDTHH:MM:SS.mmmZ` dalam kalender Gregorian proleptik UTC, setara `Date.prototype.toISOString`.

## 7. Record dan format

Urutan validasi: `format` (`json`, `line`, `logfmt`, peka huruf; selain itu atau bukan string: `invalid_format`), opsi (bagian 4), `record` objek (`invalid_record`), `level` (bagian 3; hilang atau bukan string: `invalid_level`), `time` string tidak kosong tanpa karakter U+0000..U+001F dan U+007F (`invalid_record`), `message` string (`invalid_record`), `channel` opsional (bawaan `app`; MUST cocok `^[A-Za-z0-9_.-]{1,64}$`, termasuk `null` ditolak: `invalid_channel`), `context` opsional objek (`invalid_record`). Kunci lain diabaikan.

Lalu konteks diredaksi (bagian 4), pesan diinterpolasi dengan konteks yang **sudah** diredaksi, dan level ditulis kanonik. Konteks dianggap kosong bila tidak ada kunci.

| Format | Keluaran |
|---|---|
| `json` | JSON ringkas objek dengan kunci berurutan `time`, `level`, `channel`, `message`, lalu `context` hanya bila tidak kosong |
| `line` | `time + " " + LEVEL + " [" + channel + "] " + esc(pesan)`, ditambah `" " + JSON(context)` bila tidak kosong. `LEVEL` huruf besar. `esc`: `\r\n`, `\n`, `\r` menjadi dua karakter `\n`; karakter lain U+0000..U+001F dan U+007F menjadi `\u` + 4 digit heksadesimal huruf kecil |
| `logfmt` | pasangan dipisah satu spasi: `time=`, `level=`, `channel=`, `msg=`, lalu konteks yang diratakan |

Perataan logfmt: objek tidak kosong diturunkan dengan kunci `induk.anak` (urutan properti bagian 8); objek kosong ditulis `{}`; array ditulis sebagai JSON ringkas; skalar sebagai teks (string apa adanya, lainnya JSON). Kunci: setiap spasi, `=`, `"`, dan karakter U+0000..U+001F, U+007F diganti `_`; kunci kosong menjadi `_`. Nilai ditulis tanpa kutip kecuali kosong atau memuat spasi, `=`, `"`, `\`, atau karakter kontrol di atas; nilai berkutip memakai escape `\\`, `\"`, `\n`, `\r`, `\t`, dan `\u00xx` untuk kontrol lain. Nilai `time` memakai aturan nilai yang sama.

Setiap keluaran `formatRecord` MUST tidak memuat U+000A atau U+000D.

## 8. Serialisasi JSON

JSON ringkas MUST setara `JSON.stringify` ECMA-262: string di-escape `\"`, `\\`, `\b`, `\f`, `\n`, `\r`, `\t`, kontrol lain `\u00xx` (huruf kecil), karakter lain termasuk `/` dan non-ASCII apa adanya. Angka: `Number::toString` (misalnya `1e+21`, `1e-7`, `100000000000000000000`, `0.000001`, `-0` menjadi `0`). Urutan properti objek: kunci indeks array (string bilangan bulat kanonik 0..4294967294) menaik lebih dulu, lalu kunci lain menurut urutan penyisipan. Kunci duplikat pada JSON masukan memakai nilai terakhir pada posisi kemunculan pertama.

## 9. Keamanan

- Redaksi MUST diterapkan sebelum interpolasi dan sebelum render; tidak ada opsi untuk mematikannya.
- Satu record MUST menjadi tepat satu baris (bagian 7), sehingga masukan tidak dapat memalsukan record lain.
- Penelusuran konteks MUST dibatasi kedalaman 16; port yang menerima teks JSON MUST membatasi kedalaman parser (port Rust: 512).
- Masukan apa pun MUST menghasilkan hasil atau galat dengan `code` pada bagian 10; panic atau pengecualian lain adalah bug.

## 10. Galat

| `code` | Kondisi | `messageId` |
|---|---|---|
| `invalid_level` | level tidak dikenal atau bukan string | `lomboklog.error.invalid_level` |
| `invalid_format` | format tidak dikenal | `lomboklog.error.invalid_format` |
| `invalid_record` | record, `time`, `message`, atau `context` tidak sah | `lomboklog.error.invalid_record` |
| `invalid_channel` | channel tidak cocok pola | `lomboklog.error.invalid_channel` |
| `invalid_time` | `formatTime` di luar rentang atau bukan bilangan bulat | `lomboklog.error.invalid_time` |
| `invalid_option` | opsi redaksi tidak sah | `lomboklog.error.invalid_option` |

Bila beberapa galat berlaku, yang dilaporkan adalah yang pertama menurut urutan validasi bagian 7.

## 11. Non-goals (0.1.0)

Rotasi berkas, buffering, pengiriman jaringan, sampling, format syslog RFC 5424 lengkap (header PRI, structured data), deteksi rahasia berbasis isi nilai, dan stempel waktu zona lokal.

## 12. Riwayat perubahan kontrak

| Versi | Perubahan |
|---|---|
| 0.1.0 | Kontrak awal |
