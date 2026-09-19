# SuKaRPL Feature Patch V5 — Pengajuan RPL Tabel + Bukti per CPMK

Patch ini dipasang setelah V4 / V4.1.

## Perubahan utama

1. Halaman Pengajuan RPL mahasiswa diubah dari model kartu menjadi tabel.
2. Checklist Mata Kuliah dan CPMK tidak lagi menulis ke database pada setiap klik.
   - Klik/checklist hanya mengubah state lokal di browser.
   - Database baru ditulis saat `Simpan Draft` atau `Kirim Pengajuan`.
   - Satu penyimpanan memakai satu RPC/transaksi database.
3. Setiap CPMK OBE memiliki Bukti Dukung dan Deskripsi sendiri.
4. Satu CPMK dapat memiliki lebih dari satu bukti melalui tombol `+ Bukti`.
5. Mata kuliah Non OBE memiliki bukti pada level mata kuliah.
6. Saat submit:
   - minimal satu MK harus dipilih;
   - setiap MK OBE harus memiliki CPMK;
   - setiap CPMK yang dicentang wajib memiliki minimal satu bukti;
   - setiap MK Non OBE wajib memiliki minimal satu bukti.
7. Bukti model lama dimigrasikan ke struktur baru agar tetap terlihat.
8. Prodi dan Asesor membaca bukti dukung sesuai CPMK.

## Urutan instalasi

### A. WAJIB: jalankan SQL dulu

Supabase -> SQL Editor -> New Query.

Buka dan copy seluruh isi:

`supabase/migrations/202609190003_rpl_supporting_evidence.sql`

Paste -> Run -> pastikan `Success`.

SQL ini membuat:
- `public.supporting_evidences`
- RLS/policy bukti per CPMK
- migrasi data bukti lama
- RPC `public.save_participant_rpl_draft(jsonb, boolean)`

### B. Baru overwrite GitHub

Copy folder `src` dari ZIP ke root repository SuKaRPL dan pilih overwrite/replace.
Commit + push. Tunggu Vercel redeploy.

Tidak ada environment variable baru.

## Perilaku baru mahasiswa

- Checklist MK/CPMK terasa langsung karena hanya state browser.
- Status `Belum disimpan` tampil selama ada perubahan lokal.
- Tombol `Simpan Draft` menyinkronkan seluruh pilihan + bukti sekaligus.
- Tombol `Kirim Pengajuan` menyimpan snapshot terbaru sekaligus submit.
- Browser memberi peringatan bila halaman ditutup saat draft lokal belum disimpan.

## Catatan data lama

Bukti pada tabel lama `evidences` / `claim_evidences` tidak dihapus.
Migration hanya menyalinnya ke `supporting_evidences` agar alur baru dapat membaca data lama.
