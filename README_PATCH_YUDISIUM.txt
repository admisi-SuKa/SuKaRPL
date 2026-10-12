PATCH YUDISIUM — SuKaRPL
=========================

Masalah:
  Peringatan "Nilai dari kedua asesor belum lengkap untuk seluruh mata kuliah."
  meskipun seluruh CPMK yang dipilih mahasiswa sudah dinilai.

Penyebab:
  Finalisasi pada Next.js membandingkan jumlah nilai dengan SELURUH CPMK AKTIF
  di mata kuliah. Seharusnya hanya CPMK yang benar-benar DIPILIH mahasiswa.
  Fungsi SQL finalize_rpl_application sudah menghitung CPMK pilihan tersebut.

Perbaikan:
  1. Validasi menghitung scope nilai OBE dari course_claim_cpmks, bukan seluruh cpmks.
  2. Nilai asesor diverifikasi per CPMK/scope, bukan hanya jumlah baris.
  3. Pesan kesalahan menyebut mata kuliah, asesor, dan kode CPMK yang kurang.
  4. Halaman yudisium menampilkan status lengkap/belum lengkap per asesor.
  5. Rerata nilai hanya memperhitungkan scope CPMK yang benar-benar diajukan.

Cara pasang:
  - Ekstrak ZIP patch di root repositori SuKaRPL Anda (menimpa tiga file lama,
    plus menambahkan src/lib/yudisium-validation.ts).
  - Commit, push ke GitHub, dan deploy ulang di Vercel.
  - Tidak perlu migrasi SQL, reset database, atau menghapus nilai.

Catatan penting:
  - Jika memang ada nilai yang belum diisi/disimpan oleh asesor, aplikasi TETAP
    menolak finalisasi. Gunakan pesan baru untuk melihat CPMK yang masih kosong.
  - Jika ada mata kuliah lama yang masih diajukan peserta, mata kuliah tersebut
    masih diproses. Jangan menghapus nilai atau klaim langsung dari database.
  - Fitur "Simpan Draft" tetap bisa digunakan sebelum nilai lengkap.
