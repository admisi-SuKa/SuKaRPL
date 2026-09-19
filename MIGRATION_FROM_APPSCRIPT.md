# Mapping Apps Script → SuKaRPL

| Aplikasi lama | SuKaRPL |
|---|---|
| `Data_Master` | `participants` + `profiles` |
| `RPL_Asesors` | `assessors` + Supabase Auth |
| `RPL_Assignments` | `assessor_assignments` |
| `RPL_Courses` | `courses` |
| `RPL_CPMK` | `cpmks` |
| `RPL_Course_Mode` | `courses.assessment_type` |
| `RPL_Nilai_Asesor` | `assessor_scores` |
| `RPL_Yudisium` | `yudisium_decisions` |
| `RPL_Rekognisi_Response` | `recognition_responses` |
| `RPL_Prodi_Settings` | `program_settings` |
| `RPL_Uploads` | dihapus; diganti `evidences` URL |
| `RPL_Templates` | dihapus dari workflow utama |
| `RPL_BeritaAcara` upload | dihapus; PDF dibentuk otomatis |
| `data_khusus` JSON/link | dinormalisasi ke `evidences` |
| token HMAC custom | Supabase Auth cookie session |
| role check Apps Script | Supabase Auth + PostgreSQL RLS |
| Google Drive upload | link eksternal yang dimasukkan mahasiswa |

## Perubahan business process

Aplikasi lama berorientasi dokumen/form upload. SuKaRPL berorientasi data terstruktur:

```text
Pilih MK → Tambah Bukti Link → Hubungkan Bukti ↔ MK → Submit
→ 2 Asesor → VATM/Nilai → Yudisium → PDF otomatis → Tanggapan mahasiswa
```

Satu evidence dapat dipakai untuk beberapa mata kuliah melalui tabel junction `claim_evidences`.
