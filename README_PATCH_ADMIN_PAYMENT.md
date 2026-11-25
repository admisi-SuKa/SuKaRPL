# SuKaRPL Patch — Verifikasi Pembayaran oleh Administrator

Sebelumnya Prodi yang memverifikasi/menolak bukti pembayaran. Patch ini memindahkan kewenangan tersebut ke **Administrator**.

## Perubahan

| Area | Perubahan |
|---|---|
| Admin | Menu baru **Pembayaran** (`/admin/pembayaran`): daftar seluruh pengajuan lintas program studi, filter status, tombol **Verifikasi Pembayaran** dan **Tolak** (catatan wajib). Aksi dicatat pada Audit Log (`VERIFY_PAYMENT`, `REJECT_PAYMENT`). |
| Admin Dashboard | Kartu *Verifikasi Pembayaran* dan kotak *Pembayaran menunggu verifikasi* menjadi tautan ke halaman baru. |
| Prodi | `verifyPaymentAction` dan `rejectPaymentAction` dihapus. Halaman **Pembayaran** Prodi menjadi **Status Pembayaran** (hanya-lihat). Pesan plotting menyebut verifikasi Administrator. |
| Mahasiswa | Teks diperbarui: bukti diperiksa **Admin**, catatan penolakan berlabel **Catatan Admin**. |
| Database | Migration `202609250001_admin_payment_verification.sql` mencabut policy `payments_prodi_update`. |

Alur tidak berubah di bagian lain: plotting asesor oleh Prodi tetap baru terbuka setelah `payments.status = 'VERIFIED'`.

## Instalasi

1. Supabase → SQL Editor → New Query. Paste seluruh isi `supabase/migrations/202609250001_admin_payment_verification.sql` → Run.
2. Copy folder `src` dan `supabase` dari ZIP ke root repository SuKaRPL (overwrite).
3. Commit + push. Tunggu Vercel redeploy. Tidak ada environment variable baru; `SUPABASE_SECRET_KEY` sudah dipakai fitur Admin lain.

## Catatan

- Pembayaran yang sudah berstatus VERIFIED/REJECTED sebelum patch tidak berubah.
- Pembayaran yang masih *Menunggu Verifikasi* kini hanya dapat diproses Administrator.
- Pastikan ada minimal satu akun Admin aktif sebelum patch dipasang (Admin dibuat lewat `scripts/provision-admin.mjs`).
