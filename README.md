# SuKaRPL

Portal Rekognisi Pembelajaran Lampau berbasis **Next.js 16 + TypeScript + Tailwind CSS + Bootstrap Icons + Supabase + Vercel + PWA**.

Aplikasi ini merupakan rancangan ulang dari Portal RPL berbasis Google Apps Script. Mahasiswa **tidak mengunggah DOCX/PDF**. Mahasiswa memilih mata kuliah, mencentang CPMK yang diajukan untuk mata kuliah OBE, lalu menambahkan bukti berbentuk **URL/link**; satu bukti dapat dipakai untuk beberapa mata kuliah.

## Fitur utama

### Mahasiswa
- Login akun individual.
- Dashboard data diri dan progres pengajuan.
- Memilih mata kuliah yang diajukan untuk RPL.
- Untuk MK OBE, mencentang CPMK yang ingin direkognisi.
- Menambah, mengedit, dan menghapus bukti berupa URL.
- Menghubungkan satu bukti ke satu atau beberapa mata kuliah.
- Submit pengajuan dengan validasi bahwa setiap MK memiliki minimal satu bukti dan setiap MK OBE memiliki minimal satu CPMK terpilih.
- Melihat hasil yudisium final, total SKS direkognisi, tim asesor, dan Berita Acara PDF.
- Mengirim tanggapan **Setuju / Tidak Setuju** satu kali.

### Program Studi
- Dashboard peserta dan status workflow.
- Melihat detail mata kuliah serta seluruh bukti URL peserta.
- Mengembalikan pengajuan untuk revisi.
- Master Mata Kuliah dan mode **OBE / Non OBE**.
- Master CPMK untuk mata kuliah OBE.
- Membuat akun asesor individual.
- Plotting **Asesor 1 + Asesor 2**.
- Yudisium YA/TIDAK per mata kuliah.
- Validasi kelengkapan nilai kedua asesor sebelum finalisasi.
- Membatalkan finalisasi selama mahasiswa belum mengirim tanggapan.
- Berita Acara PDF otomatis berdasarkan snapshot FINAL.

### Asesor
- Hanya melihat peserta yang diplot kepadanya.
- Membuka bukti mahasiswa langsung dari URL.
- Penilaian OBE per CPMK atau Non OBE per mata kuliah.
- VATM (V/A/T/M), nilai 0–100, dan catatan.
- Nilai terkunci ketika hasil sudah FINAL.

### UI / PWA
- Mobile-first.
- Desktop memakai sidebar; HP memakai bottom navigation.
- Login desktop split-screen dengan gambar UIN pada sisi kiri:
  `https://link.uin-suka.ac.id/theme/web/slide/s-uin2.jpg`
- Bootstrap Icons sebagai icon library.
- PWA manifest, icon 192/512, Apple Touch Icon, dan service worker.
- Service worker **tidak menyimpan data asesmen atau API sensitif** ke cache.

---

## 1. Persyaratan

- Node.js 22+
- Akun GitHub
- Project Supabase
- Akun Vercel

## 2. Buat database Supabase

Buat project baru di Supabase, kemudian buka **SQL Editor** dan jalankan seluruh isi:

```text
supabase/migrations/202609180001_initial.sql
```

Migration membuat:

- `programs`
- `profiles`
- `program_settings`
- `participants`
- `assessors`
- `courses`
- `cpmks`
- `course_claim_cpmks` (CPMK yang dicentang mahasiswa pada setiap MK OBE)
- `applications`
- `course_claims`
- `evidence_types`
- `evidences`
- `claim_evidences`
- `assessor_assignments`
- `assessor_scores`
- `yudisium_decisions`
- `recognition_responses`
- `audit_logs`
- Row Level Security policies

13 jenis bukti RPL dari aplikasi lama otomatis dibuat oleh migration.

## 3. Environment variables

Salin `.env.example` menjadi `.env.local`:

```bash
cp .env.example .env.local
```

Isi:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true
```

> `SUPABASE_SECRET_KEY` adalah secret server. **Jangan** memakai prefix `NEXT_PUBLIC_` dan jangan commit `.env.local` ke GitHub.

## 4. Install

```bash
npm install
```

## 5. Buat data demo

Setelah migration berhasil:

```bash
npm run seed:demo
```

Akun demo:

| Role | Email | Password |
|---|---|---|
| Mahasiswa | `mahasiswa@sukarpl.local` | `DemoRPL!2026` |
| Prodi | `prodi@sukarpl.local` | `DemoRPL!2026` |
| Asesor 1 | `asesor1@sukarpl.local` | `DemoRPL!2026` |
| Asesor 2 | `asesor2@sukarpl.local` | `DemoRPL!2026` |

Ganti/hapus seluruh akun demo sebelum produksi.

## 6. Jalankan lokal

```bash
npm run dev
```

Buka `http://localhost:3000`.

## 7. Build check

```bash
npm run lint
npm run build
```

## 8. GitHub

Contoh:

```bash
git init
git add .
git commit -m "Initial SuKaRPL"
git branch -M main
git remote add origin https://github.com/USERNAME/sukarpl.git
git push -u origin main
```

Workflow `.github/workflows/ci.yml` sudah tersedia untuk lint + build.

## 9. Deploy Vercel

1. Import repository GitHub ke Vercel.
2. Framework akan terdeteksi sebagai Next.js.
3. Tambahkan Environment Variables yang sama seperti `.env.local`.
4. Ubah `NEXT_PUBLIC_APP_URL` menjadi domain produksi, misalnya `https://rpl.uin-suka.ac.id`.
5. Deploy.

Vercel memberikan Preview Deployment untuk branch/pull request dan Production Deployment untuk branch utama.

## 10. Supabase Auth

Aplikasi memakai akun individual email/password. Tidak ada lagi satu password bersama untuk semua Prodi/Asesor.

Pembuatan akun asesor dari dashboard Prodi memakai `SUPABASE_SECRET_KEY` **hanya di server action**. Secret tersebut tidak pernah dikirim ke browser.

Untuk data mahasiswa produksi, buat akun Supabase Auth dan baris `profiles` + `participants` melalui proses import/registrasi admisi Anda.

## 11. Alur workflow

```text
Mahasiswa
  DRAFT
    ↓ submit
  SUBMITTED
    ↓ plotting 2 asesor
  ASSESSMENT
    ↓ yudisium
  YUDISIUM
    ↓ finalisasi
  FINAL
    ↓
Hasil + PDF + tanggapan mahasiswa
```

Jika Prodi meminta perbaikan:

```text
SUBMITTED / ASSESSMENT / YUDISIUM
          ↓
       RETURNED
          ↓ mahasiswa revisi
       SUBMITTED
```

## 12. Bukti URL

Validasi server menerima URL `http://` atau `https://`. UI membuka bukti dengan:

```html
rel="noopener noreferrer"
```

SuKaRPL **tidak melakukan server-side fetch** ke URL bukti, sehingga link yang dikirim mahasiswa tidak digunakan sebagai target request backend (mengurangi risiko SSRF).

## 13. PWA

Next.js manifest berada di:

```text
src/app/manifest.ts
```

Service worker:

```text
public/sw.js
```

PWA aktif pada production/HTTPS. Service worker hanya cache aset statis dan fallback offline. Data pengajuan/nilai/yudisium selalu membutuhkan koneksi online.

## 14. Berita Acara PDF

Endpoint:

```text
/api/berita-acara/{application_id}
```

PDF hanya tersedia jika status aplikasi `FINAL`. Isinya dihasilkan dari data final di database, sehingga tidak membutuhkan upload Berita Acara manual.

## 15. Catatan produksi

Sebelum go-live:

- Hapus akun demo.
- Gunakan domain resmi dan HTTPS.
- Aktifkan proteksi branch `main` di GitHub.
- Simpan secret hanya di Vercel/Supabase.
- Uji RLS memakai akun ketiga role.
- Aktifkan backup/PITR Supabase sesuai kebutuhan institusi.
- Tambahkan rate limiting / CAPTCHA jika login publik menerima serangan brute force.
- Pastikan kebijakan akses link Google Drive/OneDrive peserta sesuai kebijakan universitas.
- Lakukan UAT pada HP 360, 375, 390, 430 px; tablet; dan desktop.

