-- SuKaRPL: verifikasi pembayaran dipindahkan dari Prodi ke Administrator.
-- Jalankan SETELAH 202609190001_payments.sql dan 202609190002_admin_role.sql.
--
-- Administrator memverifikasi/menolak pembayaran melalui server action
-- (src/app/admin/actions.ts) memakai SUPABASE_SECRET_KEY, sehingga tidak
-- memerlukan policy RLS tambahan. Policy lama yang mengizinkan Prodi
-- mengubah status pembayaran dicabut agar Prodi tidak dapat memverifikasi
-- walau memanggil API Supabase secara langsung.

drop policy if exists payments_prodi_update on public.payments;

-- Prodi tetap dapat MEMBACA status pembayaran peserta programnya
-- (policy payments_read) dan plotting asesor tetap mensyaratkan
-- payments.status = 'VERIFIED' (policy assignments_prodi_insert).
