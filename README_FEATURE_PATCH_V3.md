# SuKaRPL Feature Patch V3

Patch ini menambahkan:

1. **Sidebar desktop dapat di-collapse/hide**
   - Tombol ada di header desktop.
   - Preferensi tersimpan di localStorage.
   - Saat collapse, sidebar menjadi mode ikon agar area kerja lebih luas.

2. **Edit Asesor dari Prodi**
   - Edit nama, NIP, email internal.
   - Ubah/reset password asesor (opsional, minimal 10 karakter).
   - Aktif/nonaktif asesor tetap tersedia.

3. **Yudisium + total SKS rekognisi**
   - Saat Prodi memilih YA/TIDAK, total mata kuliah dan total SKS direkognisi dihitung langsung.
   - Ditampilkan nilai Asesor 1, Asesor 2, dan rerata 2 asesor.
   - Konfirmasi finalisasi menyebut total SKS yang akan direkognisi.

4. **PDF Berita Acara**
   - Tetap menampilkan total SKS direkognisi.
   - Setiap mata kuliah menampilkan Nilai Hasil Rekognisi = rerata dua asesor.

5. **Admin > Pengguna**
   - Semua role ditampilkan: Mahasiswa, Asesor, Prodi, Admin.
   - Edit nama, email internal, status aktif, dan password baru.
   - Admin tidak dapat menonaktifkan akun dirinya sendiri.

6. **Admin > Import**
   - Mendukung `.xlsx`, `.xls`, `.csv`.
   - Format sesuai data Admisi/RPL.
   - Kolom wajib: `nomor_pendaftar`, `nomor_peserta`, `nama_lengkap`, `email`, `pilihan_1`.
   - Mapping tambahan: `tgl_lahir`, `nohp/telp`, `jenis_kelamin`, `nama_pt`, `asal_jurusan`, `tahun_ijazah/tahun_lulus`.
   - Semua kolom lain (termasuk `data_khusus`) tetap disimpan di `participants.legacy_payload`.
   - Duplicate nomor pendaftaran/nomor peserta dilewati, tidak ditimpa otomatis.
   - Password sementara user yang berhasil dibuat dapat didownload sebagai CSV.

## Pemasangan GitHub

Extract ZIP patch ke root repository SuKaRPL lalu overwrite file lama. Commit dan push ke `main`.

Patch ini **tidak memerlukan SQL baru** karena menggunakan tabel/kolom yang sudah ada pada schema SuKaRPL.

Dependency baru:

```json
"xlsx": "0.18.5"
```

Vercel akan menginstall dependency tersebut pada deployment berikutnya.

## Environment

Tetap membutuhkan:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL`

`SUPABASE_SECRET_KEY` diperlukan untuk operasi Auth oleh Admin/Prodi (membuat user, edit email, reset password, import user).
