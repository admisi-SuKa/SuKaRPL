-- SuKaRPL ADMIN patch
-- Role 'admin' sudah tersedia pada schema utama SuKaRPL.
-- Patch ini menambahkan constraint/index administratif yang dibutuhkan dashboard Admin.

-- Login mahasiswa menggunakan registration_no, sehingga nilainya harus unik jika terisi.
create unique index if not exists uq_participants_registration_no
on public.participants (registration_no)
where registration_no is not null and btrim(registration_no) <> '';

create index if not exists idx_profiles_role_active
on public.profiles(role, active);

create index if not exists idx_participants_created_at
on public.participants(created_at desc);

-- Admin UI melakukan operasi sensitif (create user/reset password/aktivasi akun)
-- hanya melalui server action dengan SUPABASE_SECRET_KEY.
-- Tidak ada policy browser global-admin yang ditambahkan agar RLS tetap ketat.
