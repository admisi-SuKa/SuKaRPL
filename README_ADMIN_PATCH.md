# SuKaRPL — Patch Role ADMIN

Patch ini menambahkan role ADMIN terpisah dari Prodi.

## Fitur

- Login Admin: email + password.
- Dashboard Admin global.
- Kelola calon mahasiswa: tambah, edit, aktif/nonaktif, reset password.
- Kelola akun Prodi: reset password manual/otomatis, aktif/nonaktif.
- Audit log aktivitas administratif.
- Admin tidak mendapat UI untuk mengubah nilai asesor atau keputusan yudisium.
- Operasi sensitif Auth dijalankan server-side dengan `SUPABASE_SECRET_KEY`.

## Pemasangan

1. Jalankan `supabase/migrations/202609190002_admin_role.sql` di Supabase SQL Editor.
2. Overwrite seluruh file patch ke root repository GitHub SuKaRPL lalu commit/push.
3. Redeploy Vercel.
4. Buat akun Admin dengan `scripts/provision-admin.mjs`.

## Membuat akun Admin

File default: `config/admin-auth-template.json`

```json
{
  "full_name": "Administrator SuKaRPL",
  "email": "admin@uin-suka.ac.id"
}
```

Anda boleh mengganti email sebelum provisioning.

Di komputer yang memiliki `.env.local` dan package `@supabase/supabase-js`, jalankan:

```bash
node --env-file=.env.local scripts/provision-admin.mjs
```

Hasilnya adalah `admin-temp-credentials.csv`. Password sementara hanya ada di file tersebut dan tidak boleh di-upload ke GitHub.

Login aplikasi: tab **Admin** → Email Admin + password sementara.
