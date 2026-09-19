SuKaRPL PATCH LOGIN + LOGO V2
=============================

Perubahan:
1. Mahasiswa login menggunakan Nomor Pendaftaran + password.
2. Asesor login menggunakan NIP + password.
3. Prodi login menggunakan dropdown Program Studi + password.
4. Email Supabase tetap hanya dipakai secara internal/teknis dan tidak ditampilkan pada form login.
5. Posisi Bootstrap Icons pada field login diperbaiki agar tidak menabrak teks/placeholder.
6. Logo utama, favicon, Apple Touch Icon, dan PWA icon menggunakan logo RPL hijau-oranye terbaru.
7. Cache service worker dinaikkan ke sukarpl-shell-v2 agar aset ikon lama dibuang.

Cara pasang:
- Extract ZIP ini pada root repository SuKaRPL.
- Izinkan overwrite/replace semua file.
- Commit + push ke branch main.
- Vercel akan redeploy otomatis.

Environment variable yang dibutuhkan di Vercel:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
NEXT_PUBLIC_APP_URL

Catatan penting:
SUPABASE_SECRET_KEY harus tersedia karena login Nomor Pendaftaran/NIP/Prodi melakukan lookup server-side ke tabel Supabase sebelum autentikasi password.

Jika favicon masih tampak lama setelah deployment:
- hard refresh browser,
- tutup dan buka ulang tab,
- untuk PWA yang sudah pernah di-install, tutup aplikasi lalu buka kembali; bila perlu remove lalu Add to Home Screen lagi.
