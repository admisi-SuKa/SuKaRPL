# SuKaRPL Feature Patch V4

Patch ini melanjutkan V3 dan tidak membutuhkan SQL/migration baru.

## Perubahan

### 1. Foto calon mahasiswa
Foto ditampilkan pada halaman utama mahasiswa, daftar/detail calon mahasiswa Admin, tabel Semua Pengguna, dashboard/detail peserta Prodi, serta dashboard/detail peserta Asesor.

Urutan fallback:
1. `link_foto` / `link_poto` dari `legacy_payload` jika tersedia.
2. `https://servdev2.admisi.uin-suka.ac.id/storage/foto/{nomor_pendaftar}.png`
3. `https://servdev2.admisi.uin-suka.ac.id/storage/foto/{nomor_pendaftar}.jpg`
4. Ikon orang bila semua sumber gagal.

Base URL bisa dioverride secara opsional dengan environment variable:

```env
NEXT_PUBLIC_ADMISI_PHOTO_BASE_URL=https://servdev2.admisi.uin-suka.ac.id/storage/foto
```

### 2. Administrator > Semua Pengguna
Tampilan diubah menjadi tabel, bukan kartu.

Kolom:
- Foto
- Nama Pengguna
- Role
- Identitas
- Program Studi
- Email Internal
- Status
- Password Baru
- Aksi

Klik `Edit` pada sebuah baris. Nama, email, status, dan password dapat diedit langsung pada baris tersebut. Password lama tidak pernah ditampilkan. Kosongkan Password Baru jika tidak ingin menggantinya. Password baru minimal 10 karakter.

### 3. Menu Akun Prodi dihapus
Menu `Akun Prodi` di sidebar Administrator dihapus karena akun Prodi sudah dikelola di `Semua Pengguna`.

URL lama `/admin/prodi` tetap aman: otomatis diarahkan ke `/admin/pengguna`.

### 4. Import tetap tersedia
Menu Import calon mahasiswa dari XLSX/XLS/CSV tetap tersedia seperti V3.

## Pemasangan
1. Extract ZIP ke root repository SuKaRPL dan overwrite file lama.
2. Commit + push ke GitHub.
3. Tunggu Vercel build/deploy.
4. Tidak perlu menjalankan SQL Supabase baru.

Jika ingin memakai base URL foto eksplisit di Vercel, tambahkan `NEXT_PUBLIC_ADMISI_PHOTO_BASE_URL`. Ini opsional karena aplikasi sudah memiliki default URL.
