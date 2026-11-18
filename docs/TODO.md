# TODO — Fitur yang Belum Ada dan Layak Ditambahkan

Daftar kandidat fitur baru berdasarkan audit kode `leaderboard_apps`. Semua bersifat aditif, tidak merusak alur data yang ada, dan mudah diverifikasi manual via server + browser/curl. Urutan berdasarkan risiko rendah dan manfaat tinggi.

## Skor & Pertandingan (`results`)

| # | Fitur | Deskripsi | Pendekatan saran | Status |
|---|-------|-----------|------------------|--------|
| 1 | Jadwal & status pertandingan | Tabel `results` hanya punya skor + winner. Kini ada jadwal dan status (`belum`, `berlangsung`, `selesai`). | Kolom `scheduled_at`, `status` pada `results`; controller `GET/PUT` menampung kolom baru; `renderInput` menampilkan status + input jadwal. | ✅ |
| 2 | Riwayat perubahan skor | `updateResults` bulk replace kini mencatat riwayat. | Tabel `result_history` diisi di dalam transaksi yang sama, hanya saat nilai benar-benar berubah. | ✅ |
| 3 | Export/import hasil JSON | Tombol Export/Import JSON di view "Input Hasil" (admin). | Reuse payload `results`; tidak perlu endpoint baru. | ✅ |

**Selesai — detail implementasi:**

- Kolom `results.scheduled_at` (TEXT) dan `results.status` (TEXT: `belum` | `berlangsung` | `selesai`); DB lama dimigrasi lewat `ALTER TABLE` di `backend/config/db.js` (`migrateResultsColumns`).
- Tabel `result_history` (+ index `idx_result_history_cat_match`) menyimpan `category, match_id, a, b, sa, sb, winner, scheduled_at, status, changed_by, changed_at`.
- `updateResults` membandingkan nilai lama vs baru per match dan hanya menulis riwayat bila ada perubahan nyata; `changed_by` diambil dari `req.user.username`. Karena `saveState()` mengirim seluruh kategori setiap 300 ms, penulisan identik tidak menambah baris riwayat.
- Endpoint baru: `GET /api/results/history?category=<key>&match=<matchId>` (butuh admin) — maksimum 100 baris bila `match` diisi, 200 baris bila tidak.
- Frontend: tiap match card punya select Status, input Jadwal (`datetime-local`), dan tombol Riwayat (modal Bootstrap `#historyModal`); tombol Export/Import JSON ada di header view "Input Hasil". Select/input dinonaktifkan dan tombol disembunyikan untuk non-admin.
**Batch 2 — selesai:**
- Kolom `categories.archived` (INTEGER, default 0) + migrasi idempoten; `getCategories` filter default `archived=0`, dukung `?archived=1`.
- Endpoint `PATCH /api/categories/:key/archive` (admin) untuk arsip/pulihkan.
- Frontend: tombol "Arsip"/"Pulihkan" di tabel Pengaturan + toggle "Tampilkan kategori terarsip"; tombol "Arsipkan" di modal kategori.
- Rate limiting login: 5 percobaan gagal per IP per 15 menit → HTTP 429; counter reset saat login sukses.
- Pencarian tim: input `#teamSearch` di view Data Tim, filter nama/peserta sebelum render (index asli tetap dipakai untuk edit/hapus).
**Batch 3 — selesai:**
- Tabel `audit_log` (+ index `idx_audit_log_created`) + helper `db.logAudit`; insert di mutasi kategori/tim/hasil/settings/auth; endpoint `GET /api/audit` (admin).
- Tie-breaking double_elimination: setelah poin, selisih gol, menang, tambah head-to-head (pemenang langsung menang tie-break).
- Knockout jumlah ganjil: babak pertama otomatis bye untuk tim terakhir; badge AUTO BYE + winner auto.
**Batch 4 — selesai:**
- CORS opt-in: middleware di `backend/server.js` aktif hanya bila `CORS_ORIGIN` di-set; header `Access-Control-Allow-*` + preflight `OPTIONS` 204.
- Foto/logo tim: kolom `teams.photo_url` + migrasi idempoten; `getTeams`/`updateTeams` bawa field `photo`; frontend input URL di kartu tim, thumbnail di detail tim, mapping di import/export JSON.
- Print: tombol Cetak di view Juara → `window.print()`; blok `@media print` di `css/styles.css` menyembunyikan sidebar/nav/tombol.
- Backup DB: `backend/tools/backup_db.js` (better-sqlite3 `db.backup`) + npm script `npm run backup` → `data/backups/leaderboard_<timestamp>.db`.
- Perbaikan: `API.me()` ditambahkan di `js/api.js` (dipakai `init()`; sebelumnya token admin hilang setiap reload).
**Batch 5 — selesai:**
- Reset password (#7): kolom `users.reset_token` + `users.reset_token_expires` (+ migrasi idempoten `migrateResetTokenColumns`); endpoint publik `POST /api/auth/forgot-password` (buat token 32 byte, berlaku 1 jam, dikembalikan di respons karena tanpa email) dan `POST /api/auth/reset-password` (token sekali pakai; ganti `password_hash` + `salt`, hapus token, dan hapus semua sesi user tersebut).
- Audit: `auth.forgot_password` dan `auth.reset_password` tercatat di `audit_log`.
- Frontend: modal `#resetPasswordBackdrop` 2 langkah (username → token + password baru), dibuka lewat link "Lupa password?" di modal login; `openResetPasswordModal` menutup modal login dulu; `API.forgotPassword` / `API.resetPassword` di `js/api.js`.
**Batch 6 — selesai:**
- Manajemen sesi (#7b): `GET /api/auth/sessions` + `DELETE /api/auth/sessions/:token` (admin); kartu "Sesi Aktif" di view Pengaturan dengan badge "sesi ini" dan tombol Cabut (mencabut sesi sendiri = logout). Audit `auth.revoke_session`.
- Halaman pengaturan global (#17): tabel editor key-value `settings` di view Pengaturan + endpoint `DELETE /api/settings/:key` (admin); `GET /api/settings` tetap publik, tulis hanya admin. Value di-`JSON.parse` saat disimpan bila valid (objek/angka/bool tetap bertipe), non-admin hanya melihat.

| # | Fitur | Deskripsi | Pendekatan saran |
|---|-------|-----------|------------------|
| 4 | Soft delete / arsip kategori ✅ | `deleteCategory` hard delete dan diblokir jika masih ada tim. | Tambah kolom `archived` boolean pada `categories`; `getCategories` filter default `archived=0`; endpoint baru `PATCH /api/categories/:key/archive`. |
| 5 | Aturan tie-breaking ✅ | Ranking `double_elimination` hanya poin, belum ada penyeimbang (selisih gol, head-to-head). | Logika `doubleEliminationRankMap` / `doubleEliminationLeaderboardIds` di `app.js` tambah perhitungan selisih gol dan head-to-head. |
| 6 | Bye untuk jumlah ganjil knockout ✅ | `knockout` asume pohon sempurna (2^n); belum ditangani jika count ganjil. | `getMatches` / `generateDefaultTeams` tambah mekanisme bye di babak pertama. |

## Auth & Keamanan (`auth`)

| # | Fitur | Deskripsi | Pendekatan saran |
|---|-------|-----------|------------------|
| 7 | Reset password ✅ | Tidak ada alur lupa password. | Endpoint `POST /api/auth/forgot-password` + token reset sementara; frontend form sederhana. |
| 10 | Audit log ✅ | Tidak ada catatan siapa mengubah data kapan. | Tabel `audit_log` (actor, action, target, created_at); insert di controller mutasi utama. |
| 8 | Rate limiting login ✅ | Tidak ada batasan percobaan login. | Middleware sederhana (in-memory map IP → hit count + waktu) di route `/auth/login`. |
| 9 | CORS ✅ | Tidak dikonfigurasi; risiko jika diakses dari domain lain. | Tambah `cors` atau header manual di `backend/server.js`. |

## Frontend UX (`app.js`, `index.html`)

| # | Fitur | Deskripsi | Pendekatan saran |
|---|-------|-----------|------------------|
| 11 | Pencarian / filter tim ✅ | `renderTeams` menampilkan semua tanpa pencarian. | Input pencarian di `teams` view, filter array `CATEGORIES[cat].teams` sebelum render. |
| 12 | Dark mode toggle | Sidebar gelap tapi body terang; tidak ada toggle. | Toggle class `dark` pada `body`, simpan preferensi `localStorage`, variabel CSS di `css/styles.css`. |
| 13 | Print / PDF leaderboard & juara ✅ | Tidak ada opsi cetak. | Tombol Cetak → `window.print()` dengan CSS `@media print` yang menyembunyikan nav/sidebar. |
| 14 | Live stream per pertandingan | Hanya satu URL YouTube global, tidak per match. | Kolom `live_url` per match di `results`; `renderInput` / `renderBracket` tampilkan link video per match. |

## Data & Operasi

| # | Fitur | Deskripsi | Pendekatan saran |
|---|-------|-----------|------------------|
| 15 | Foto/logo tim ✅ | `teams` hanya `name`, `p1`, `p2`, `group_name`. | Tambah kolom `photo_url`; frontend input URL + tampilkan di `teamEditor` dan detail tim. |
| 16 | Backup / restore DB ✅ | `inspect_db.js` hanya baca; tidak ada export/backup file DB. | Skrip CLI `node backend/tools/backup_db.js` yang copy `data/leaderboard.db` ke file timestamped. |
| 17 | Halaman pengaturan global ✅ | `pengaturan` hanya kelola kategori, bukan `settings` key-value. | Tabel di view `pengaturan` untuk edit key-value `settings` (mis. nama event, versi). |
| 18 | Health check endpoint ✅ | Tidak ada `/health` atau `/ping`. | `GET /api/health` mengembalikan `{ ok: true, db: 'connected' }` tanpa auth. |

## Prioritas disarankan (mulai dari sini)

1. **Live stream per pertandingan** (#14).
2. **Dark mode toggle** (#12) — opsional, UI sudah default gelap.
3. Menambah test otomatis (belum ada test suite).

## Catatan

- Tidak ada test suite, lint, atau CI di repo. Setiap fitur baru harus diverifikasi manual setelah diimplementasi: nyalakan server (`npm run dev`), coba endpoint via `curl` atau browser di `http://localhost:3000`.
- Jangan menambahkan file ke `modules/` atau `utils/` tanpa permintaan (kosong sengaja).
- `data/` (SQLite + WAL/shm) **tidak** di-`.gitignore`; hati-hati saat commit.