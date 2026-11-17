# TODO — Fitur yang Belum Ada dan Layak Ditambahkan

Daftar kandidat fitur baru berdasarkan audit kode `leaderboard_apps`. Semua bersifat aditif, tidak merusak alur data yang ada, dan mudah diverifikasi manual via server + browser/curl. Urutan berdasarkan risiko rendah dan manfaat tinggi.

## Skor & Pertandingan (`results`)

| # | Fitur | Deskripsi | Pendekatan saran |
|---|-------|-----------|------------------|
| 1 | Jadwal & status pertandingan | Tabel `results` hanya punya skor + winner. Tambah jadwal dan status (`belum dimulai`, `berlangsung`, `selesai`). | Tambah kolom `scheduled_at`, `status` pada `results`; controller `GET/PUT` ikut menampung kolom baru; frontend `renderInput` tampilkan status. |
| 2 | Riwayat perubahan skor | `updateResults` bulk replace tidak menyimpan history. | Tabel `result_history` (id, match_id, sa, sb, winner, changed_at, changed_by); insert dalam transaksi bersama update `results`. |
| 3 | Export/import hasil JSON | `teams` punya export/import, `results` belum. | Tambah endpoint `GET/POST /api/results/:category/export-import` atau reuse payload `results` yang sudah ada. |

## Kategori & Turnamen (`categories`)

| # | Fitur | Deskripsi | Pendekatan saran |
|---|-------|-----------|------------------|
| 4 | Soft delete / arsip kategori | `deleteCategory` hard delete dan diblokir jika masih ada tim. | Tambah kolom `archived` boolean pada `categories`; `getCategories` filter default `archived=0`; endpoint baru `PATCH /api/categories/:key/archive`. |
| 5 | Aturan tie-breaking | Ranking `junior44` hanya poin, belum ada penyeimbang (selisih gol, head-to-head). | Logika `juniorRankMap` / `juniorLeaderboardIds` di `app.js` tambah perhitungan selisih gol dan head-to-head. |
| 6 | Bye untuk jumlah ganjil knockout | `knockout` asume pohon sempurna (2^n); belum ditangani jika count ganjil. | `getMatches` / `generateDefaultTeams` tambah mekanisme bye di babak pertama. |

## Auth & Keamanan (`auth`)

| # | Fitur | Deskripsi | Pendekatan saran |
|---|-------|-----------|------------------|
| 7 | Reset password | Tidak ada alur lupa password. | Endpoint `POST /api/auth/forgot-password` + token reset sementara; frontend form sederhana. |
| 7b | Daftar & cabut sesi aktif | Tabel `sessions` ada tapi tidak ada endpoint manajemen. | `GET /api/auth/sessions` (daftar), `DELETE /api/auth/sessions/:token` (cabut), hanya admin. |
| 8 | Rate limiting login | Tidak ada batasan percobaan login. | Middleware sederhana (in-memory map IP → hit count + waktu) di route `/auth/login`. |
| 9 | CORS | Tidak dikonfigurasi; risiko jika diakses dari domain lain. | Tambah `cors` atau header manual di `backend/server.js`. |
| 10 | Audit log | Tidak ada catatan siapa mengubah data kapan. | Tabel `audit_log` (actor, action, target, created_at); insert di controller mutasi utama. |

## Frontend UX (`app.js`, `index.html`)

| # | Fitur | Deskripsi | Pendekatan saran |
|---|-------|-----------|------------------|
| 11 | Pencarian / filter tim | `renderTeams` menampilkan semua tanpa pencarian. | Input pencarian di `teams` view, filter array `CATEGORIES[cat].teams` sebelum render. |
| 12 | Dark mode toggle | Sidebar gelap tapi body terang; tidak ada toggle. | Toggle class `dark` pada `body`, simpan preferensi `localStorage`, variabel CSS di `css/styles.css`. |
| 13 | Print / PDF leaderboard & juara | Tidak ada opsi cetak. | Tombol Cetak → `window.print()` dengan CSS `@media print` yang menyembunyikan nav/sidebar. |
| 14 | Live stream per pertandingan | Hanya satu URL YouTube global, tidak per match. | Kolom `live_url` per match di `results`; `renderInput` / `renderBracket` tampilkan link video per match. |

## Data & Operasi

| # | Fitur | Deskripsi | Pendekatan saran |
|---|-------|-----------|------------------|
| 15 | Foto/logo tim | `teams` hanya `name`, `p1`, `p2`, `group_name`. | Tambah kolom `photo_url`; frontend input URL + tampilkan di `teamEditor` dan detail tim. |
| 16 | Backup / restore DB | `inspect_db.js` hanya baca; tidak ada export/backup file DB. | Skrip CLI `node backend/tools/backup_db.js` yang copy `data/leaderboard.db` ke file timestamped. |
| 17 | Halaman pengaturan global | `pengaturan` hanya kelola kategori, bukan `settings` key-value. | Tabel di view `pengaturan` untuk edit key-value `settings` (mis. nama event, versi). |
| 18 | Health check endpoint | Tidak ada `/health` atau `/ping`. | `GET /api/health` mengembalikan `{ ok: true, db: 'connected' }` tanpa auth. |

## Prioritas disarankan (mulai dari sini)

1. **Jadwal & status pertandingan** (#1) — aditif, risiko rendah, manfaat langsung.
2. **Soft delete kategori** (#4) — mencegah kehilangan data saat hapus salah.
3. **Pencarian / filter tim** (#11) — UX langsung terasa, kode kecil.
4. **Rate limiting login** (#8) — keamanan dasar, kecil.

## Catatan

- Tidak ada test suite, lint, atau CI di repo. Setiap fitur baru harus diverifikasi manual setelah diimplementasi: nyalakan server (`npm run dev`), coba endpoint via `curl` atau browser di `http://localhost:3000`.
- Jangan menambahkan file ke `modules/` atau `utils/` tanpa permintaan (kosong sengaja).
- `data/` (SQLite + WAL/shm) **tidak** di-`.gitignore`; hati-hati saat commit.