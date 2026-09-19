# SuKaRPL – Fix Mulai Pengajuan RPL

Patch kecil untuk error generik ketika mahasiswa menekan **Mulai Pengajuan RPL**.

Perubahan:
- pembuatan application diverifikasi dari sesi mahasiswa, lalu dibuat server-side;
- aman terhadap double-click / duplicate application;
- kegagalan audit tidak lagi menggagalkan pembuatan application;
- error database ditampilkan di halaman mahasiswa, tidak langsung memunculkan halaman `Terjadi kesalahan`;
- tombol menampilkan status `Membuat pengajuan...` saat proses berlangsung.

## Instalasi
1. Extract ZIP ini.
2. Copy folder `src` ke root repository SuKaRPL.
3. Pilih overwrite/replace untuk file lama.
4. Commit dan push ke GitHub.
5. Tunggu Vercel redeploy.

Tidak ada SQL baru yang perlu dijalankan.

PENTING: Vercel harus tetap memiliki `SUPABASE_SECRET_KEY`, karena action ini berjalan sepenuhnya di server.
