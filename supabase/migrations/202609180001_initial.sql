-- SuKaRPL initial schema
-- Run in Supabase SQL Editor or with `supabase db push`.

create extension if not exists pgcrypto;

create type public.app_role as enum ('participant','prodi','assessor','admin');
create type public.application_status as enum ('DRAFT','SUBMITTED','RETURNED','ASSESSMENT','YUDISIUM','FINAL');
create type public.assessment_type as enum ('OBE','NON_OBE');
create type public.yudisium_result as enum ('YA','TIDAK');
create type public.recognition_response_type as enum ('SETUJU','TIDAK_SETUJU');

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  degree text not null default 'Magister',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.app_role not null,
  full_name text not null,
  email text,
  program_id uuid references public.programs(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_settings (
  program_id uuid primary key references public.programs(id) on delete cascade,
  head_name text,
  head_nip text,
  updated_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete restrict,
  participant_no text not null unique,
  registration_no text,
  full_name text not null,
  birth_place text,
  birth_date date,
  gender text,
  email text,
  phone text,
  education_level text,
  previous_institution text,
  previous_program text,
  graduation_year integer,
  photo_url text,
  legacy_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assessors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete restrict,
  nip text not null,
  full_name text not null,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, nip)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  code text not null,
  name text not null,
  credits numeric(4,1) not null check (credits > 0 and credits <= 20),
  assessment_type public.assessment_type not null default 'OBE',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, code)
);

create table public.cpmks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  code text not null,
  sort_order integer not null default 1,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, code)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.participants(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete restrict,
  status public.application_status not null default 'DRAFT',
  return_note text,
  submitted_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_claims (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(application_id, course_id)
);

-- CPMK yang secara eksplisit diajukan peserta untuk setiap mata kuliah OBE.
-- Untuk NON_OBE tabel ini tidak digunakan.
create table public.course_claim_cpmks (
  course_claim_id uuid not null references public.course_claims(id) on delete cascade,
  cpmk_id uuid not null references public.cpmks(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(course_claim_id, cpmk_id)
);

create table public.evidence_types (
  id text primary key,
  sort_order integer not null,
  title text not null,
  active boolean not null default true
);

create table public.evidences (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  evidence_type_id text not null references public.evidence_types(id) on delete restrict,
  title text not null,
  url text not null check (url ~* '^https?://'),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.claim_evidences (
  course_claim_id uuid not null references public.course_claims(id) on delete cascade,
  evidence_id uuid not null references public.evidences(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(course_claim_id, evidence_id)
);

create table public.assessor_assignments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,
  assessor1_id uuid not null references public.assessors(id) on delete restrict,
  assessor2_id uuid not null references public.assessors(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (assessor1_id <> assessor2_id)
);

create table public.assessor_scores (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  course_claim_id uuid not null references public.course_claims(id) on delete cascade,
  assessor_id uuid not null references public.assessors(id) on delete cascade,
  assessment_type public.assessment_type not null,
  cpmk_id uuid references public.cpmks(id) on delete cascade,
  score_scope text not null,
  v boolean not null default false,
  a boolean not null default false,
  t boolean not null default false,
  m boolean not null default false,
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(assessor_id, course_claim_id, score_scope)
);

create table public.yudisium_decisions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  course_claim_id uuid not null unique references public.course_claims(id) on delete cascade,
  result public.yudisium_result not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','FINAL','CANCELLED_FINAL')),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recognition_responses (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  response public.recognition_response_type not null,
  note text,
  responded_at timestamptz not null default now(),
  check (response = 'SETUJU' or nullif(trim(note), '') is not null)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  program_id uuid references public.programs(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_profiles_program_role on public.profiles(program_id, role);
create index idx_participants_program on public.participants(program_id);
create index idx_courses_program on public.courses(program_id, active);
create index idx_claims_application on public.course_claims(application_id);
create index idx_claim_cpmks_claim on public.course_claim_cpmks(course_claim_id);
create index idx_claim_cpmks_cpmk on public.course_claim_cpmks(cpmk_id);
create index idx_evidences_application on public.evidences(application_id);
create index idx_scores_application on public.assessor_scores(application_id, assessor_id);
create index idx_audit_program_created on public.audit_logs(program_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['programs','profiles','program_settings','participants','assessors','courses','cpmks','applications','evidences','assessor_assignments','assessor_scores','yudisium_decisions']
  loop
    execute format('create trigger trg_%I_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = auth.uid() and active = true limit 1;
$$;

create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where user_id = auth.uid() and active = true limit 1;
$$;

create or replace function public.current_program_id()
returns uuid language sql stable security definer set search_path = public as $$
  select program_id from public.profiles where user_id = auth.uid() and active = true limit 1;
$$;

create or replace function public.is_participant_application(p_application_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.applications ap
    join public.participants p on p.id = ap.participant_id
    where ap.id = p_application_id and p.profile_id = public.current_profile_id()
  );
$$;

create or replace function public.is_prodi_application(p_application_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() in ('prodi','admin') and exists (
    select 1 from public.applications ap
    where ap.id = p_application_id and ap.program_id = public.current_program_id()
  );
$$;

create or replace function public.is_assigned_application(p_application_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.assessor_assignments aa
    join public.assessors a on a.id in (aa.assessor1_id, aa.assessor2_id)
    where aa.application_id = p_application_id and a.profile_id = public.current_profile_id() and a.active = true
  );
$$;

create or replace function public.application_is_editable(p_application_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications ap
    where ap.id = p_application_id and ap.status in ('DRAFT','RETURNED')
  );
$$;

-- Cross-table integrity guards. RLS controls who may write; these triggers also
-- ensure related rows belong to the same application/program even for server-side writes.
create or replace function public.validate_application_program()
returns trigger language plpgsql set search_path = public as $$
declare participant_program uuid;
begin
  select p.program_id into participant_program from public.participants p where p.id = new.participant_id;
  if participant_program is null or participant_program <> new.program_id then
    raise exception 'Program aplikasi harus sama dengan program peserta.';
  end if;
  return new;
end;
$$;
create trigger trg_validate_application_program
before insert or update of participant_id, program_id on public.applications
for each row execute function public.validate_application_program();

create or replace function public.validate_course_claim_program()
returns trigger language plpgsql set search_path = public as $$
declare app_program uuid; course_program uuid; course_active boolean;
begin
  select ap.program_id into app_program from public.applications ap where ap.id = new.application_id;
  select c.program_id, c.active into course_program, course_active from public.courses c where c.id = new.course_id;
  if app_program is null or course_program is null or app_program <> course_program or not course_active then
    raise exception 'Mata kuliah tidak valid untuk program aplikasi ini.';
  end if;
  return new;
end;
$$;
create trigger trg_validate_course_claim_program
before insert or update of application_id, course_id on public.course_claims
for each row execute function public.validate_course_claim_program();

create or replace function public.validate_course_claim_cpmk()
returns trigger language plpgsql set search_path = public as $$
declare
  claim_course uuid;
  claim_mode public.assessment_type;
  cpmk_course uuid;
  cpmk_active boolean;
begin
  select cc.course_id, c.assessment_type into claim_course, claim_mode
  from public.course_claims cc
  join public.courses c on c.id = cc.course_id
  where cc.id = new.course_claim_id;

  select cp.course_id, cp.active into cpmk_course, cpmk_active
  from public.cpmks cp where cp.id = new.cpmk_id;

  if claim_course is null or claim_mode <> 'OBE' then
    raise exception 'Checklist CPMK hanya berlaku untuk mata kuliah OBE.';
  end if;
  if cpmk_course is null or cpmk_course <> claim_course or not cpmk_active then
    raise exception 'CPMK tidak sesuai dengan mata kuliah yang diajukan.';
  end if;
  return new;
end;
$$;
create trigger trg_validate_course_claim_cpmk
before insert or update on public.course_claim_cpmks
for each row execute function public.validate_course_claim_cpmk();

create or replace function public.validate_assessor_assignment()
returns trigger language plpgsql set search_path = public as $$
declare app_program uuid; a1_program uuid; a2_program uuid; a1_active boolean; a2_active boolean;
begin
  select ap.program_id into app_program from public.applications ap where ap.id = new.application_id;
  select a.program_id, a.active into a1_program, a1_active from public.assessors a where a.id = new.assessor1_id;
  select a.program_id, a.active into a2_program, a2_active from public.assessors a where a.id = new.assessor2_id;
  if new.assessor1_id = new.assessor2_id then
    raise exception 'Asesor 1 dan Asesor 2 harus berbeda.';
  end if;
  if app_program is null or a1_program <> app_program or a2_program <> app_program or not a1_active or not a2_active then
    raise exception 'Kedua asesor harus aktif dan berasal dari program studi yang sama dengan peserta.';
  end if;
  return new;
end;
$$;
create trigger trg_validate_assessor_assignment
before insert or update of application_id, assessor1_id, assessor2_id on public.assessor_assignments
for each row execute function public.validate_assessor_assignment();

create or replace function public.validate_assessor_score()
returns trigger language plpgsql set search_path = public as $$
declare
  claim_app uuid;
  claim_course uuid;
  assessor_allowed boolean;
  course_mode public.assessment_type;
  cpmk_course uuid;
begin
  select cc.application_id, cc.course_id into claim_app, claim_course
  from public.course_claims cc where cc.id = new.course_claim_id;
  if claim_app is null or claim_app <> new.application_id then
    raise exception 'Claim nilai tidak berasal dari aplikasi yang sama.';
  end if;

  select exists (
    select 1 from public.assessor_assignments aa
    where aa.application_id = new.application_id
      and new.assessor_id in (aa.assessor1_id, aa.assessor2_id)
  ) into assessor_allowed;
  if not assessor_allowed then
    raise exception 'Asesor tidak ditugaskan pada aplikasi ini.';
  end if;

  select c.assessment_type into course_mode from public.courses c where c.id = claim_course;
  if course_mode is null or course_mode <> new.assessment_type then
    raise exception 'Mode penilaian tidak sesuai dengan mata kuliah.';
  end if;

  if course_mode = 'OBE' then
    if new.cpmk_id is null then
      raise exception 'CPMK wajib untuk mata kuliah OBE.';
    end if;
    select c.course_id into cpmk_course from public.cpmks c where c.id = new.cpmk_id and c.active = true;
    if cpmk_course is null or cpmk_course <> claim_course then
      raise exception 'CPMK tidak sesuai dengan mata kuliah.';
    end if;
    if not exists (
      select 1 from public.course_claim_cpmks ccc
      where ccc.course_claim_id = new.course_claim_id and ccc.cpmk_id = new.cpmk_id
    ) then
      raise exception 'CPMK ini tidak dicentang/diajukan oleh peserta.';
    end if;
    new.score_scope := new.cpmk_id::text;
  else
    if new.cpmk_id is not null then
      raise exception 'CPMK harus kosong untuk mata kuliah NON OBE.';
    end if;
    new.score_scope := 'COURSE';
  end if;
  return new;
end;
$$;
create trigger trg_validate_assessor_score
before insert or update on public.assessor_scores
for each row execute function public.validate_assessor_score();

create or replace function public.validate_yudisium_decision()
returns trigger language plpgsql set search_path = public as $$
declare claim_app uuid;
begin
  select cc.application_id into claim_app from public.course_claims cc where cc.id = new.course_claim_id;
  if claim_app is null or claim_app <> new.application_id then
    raise exception 'Keputusan yudisium tidak sesuai dengan aplikasi.';
  end if;
  return new;
end;
$$;
create trigger trg_validate_yudisium_decision
before insert or update of application_id, course_claim_id on public.yudisium_decisions
for each row execute function public.validate_yudisium_decision();

create or replace function public.validate_recognition_response()
returns trigger language plpgsql set search_path = public as $$
declare app_participant uuid; app_status public.application_status;
begin
  select ap.participant_id, ap.status into app_participant, app_status
  from public.applications ap where ap.id = new.application_id;
  if app_participant is null or app_participant <> new.participant_id or app_status <> 'FINAL' then
    raise exception 'Tanggapan hasil rekognisi hanya boleh untuk aplikasi final milik peserta.';
  end if;
  return new;
end;
$$;
create trigger trg_validate_recognition_response
before insert or update of application_id, participant_id on public.recognition_responses
for each row execute function public.validate_recognition_response();

-- Master evidence types retained from the legacy application.
insert into public.evidence_types(id, sort_order, title) values
('riwayat_pekerjaan',1,'Daftar Riwayat Pekerjaan'),
('buku_harian',2,'Buku Harian / Catatan Harian'),
('dokumentasi_pekerjaan',3,'Dokumentasi Pekerjaan'),
('lembar_tugas',4,'Lembar Tugas / Lembar Kerja'),
('dokumen_analisis',5,'Dokumen Analisis / Perancangan'),
('logbook',6,'Logbook'),
('sertifikat_kompetensi',7,'Sertifikat Kompetensi'),
('sertifikat_pengoperasian',8,'Sertifikat Pengoperasian / Lisensi'),
('sertifikat_pelatihan',9,'Sertifikat Pelatihan'),
('referensi_verifikasi',10,'Referensi / Verifikasi Pihak Ketiga'),
('asosiasi_profesi',11,'Keanggotaan Asosiasi Profesi'),
('penghargaan',12,'Penghargaan Instansi / Industri'),
('penilaian_kinerja',13,'Penilaian Kinerja')
on conflict (id) do update set title = excluded.title, sort_order = excluded.sort_order;

-- RLS ------------------------------------------------------------------------
alter table public.programs enable row level security;
alter table public.profiles enable row level security;
alter table public.program_settings enable row level security;
alter table public.participants enable row level security;
alter table public.assessors enable row level security;
alter table public.courses enable row level security;
alter table public.cpmks enable row level security;
alter table public.applications enable row level security;
alter table public.course_claims enable row level security;
alter table public.course_claim_cpmks enable row level security;
alter table public.evidence_types enable row level security;
alter table public.evidences enable row level security;
alter table public.claim_evidences enable row level security;
alter table public.assessor_assignments enable row level security;
alter table public.assessor_scores enable row level security;
alter table public.yudisium_decisions enable row level security;
alter table public.recognition_responses enable row level security;
alter table public.audit_logs enable row level security;

create policy programs_read on public.programs for select to authenticated using (true);
create policy evidence_types_read on public.evidence_types for select to authenticated using (active = true);

create policy profiles_self_read on public.profiles for select to authenticated using (user_id = auth.uid());
create policy profiles_prodi_read on public.profiles for select to authenticated using (
  public.current_role() in ('prodi','admin') and program_id = public.current_program_id()
);

create policy settings_read on public.program_settings for select to authenticated using (program_id = public.current_program_id());
create policy settings_insert on public.program_settings for insert to authenticated with check (
  public.current_role() in ('prodi','admin') and program_id = public.current_program_id()
);
create policy settings_update on public.program_settings for update to authenticated using (
  public.current_role() in ('prodi','admin') and program_id = public.current_program_id()
) with check (program_id = public.current_program_id());

create policy participant_self_read on public.participants for select to authenticated using (profile_id = public.current_profile_id());
create policy participant_prodi_read on public.participants for select to authenticated using (
  public.current_role() in ('prodi','admin') and program_id = public.current_program_id()
);
create policy participant_assessor_read on public.participants for select to authenticated using (
  public.current_role() = 'assessor' and exists (
    select 1 from public.applications ap where ap.participant_id = participants.id and public.is_assigned_application(ap.id)
  )
);

create policy assessor_self_read on public.assessors for select to authenticated using (profile_id = public.current_profile_id());
create policy assessor_assignment_visibility on public.assessors for select to authenticated using (
  exists (
    select 1 from public.assessor_assignments aa
    where assessors.id in (aa.assessor1_id, aa.assessor2_id)
      and (public.is_participant_application(aa.application_id) or public.is_assigned_application(aa.application_id))
  )
);
create policy assessor_prodi_read on public.assessors for select to authenticated using (
  public.current_role() in ('prodi','admin') and program_id = public.current_program_id()
);
create policy assessor_prodi_update on public.assessors for update to authenticated using (
  public.current_role() in ('prodi','admin') and program_id = public.current_program_id()
) with check (program_id = public.current_program_id());

create policy courses_read on public.courses for select to authenticated using (program_id = public.current_program_id());
create policy courses_prodi_insert on public.courses for insert to authenticated with check (
  public.current_role() in ('prodi','admin') and program_id = public.current_program_id()
);
create policy courses_prodi_update on public.courses for update to authenticated using (
  public.current_role() in ('prodi','admin') and program_id = public.current_program_id()
) with check (program_id = public.current_program_id());
create policy courses_prodi_delete on public.courses for delete to authenticated using (
  public.current_role() in ('prodi','admin') and program_id = public.current_program_id()
);

create policy cpmks_read on public.cpmks for select to authenticated using (
  exists (select 1 from public.courses c where c.id = cpmks.course_id and c.program_id = public.current_program_id())
);
create policy cpmks_prodi_insert on public.cpmks for insert to authenticated with check (
  public.current_role() in ('prodi','admin') and exists (select 1 from public.courses c where c.id = cpmks.course_id and c.program_id = public.current_program_id())
);
create policy cpmks_prodi_update on public.cpmks for update to authenticated using (
  public.current_role() in ('prodi','admin') and exists (select 1 from public.courses c where c.id = cpmks.course_id and c.program_id = public.current_program_id())
);
create policy cpmks_prodi_delete on public.cpmks for delete to authenticated using (
  public.current_role() in ('prodi','admin') and exists (select 1 from public.courses c where c.id = cpmks.course_id and c.program_id = public.current_program_id())
);

create policy applications_read on public.applications for select to authenticated using (
  public.is_participant_application(id) or public.is_prodi_application(id) or public.is_assigned_application(id)
);
create policy applications_participant_insert on public.applications for insert to authenticated with check (
  status = 'DRAFT'
  and exists (select 1 from public.participants p where p.id = participant_id and p.profile_id = public.current_profile_id() and p.program_id = program_id)
);
create policy applications_participant_update on public.applications for update to authenticated using (
  public.is_participant_application(id) and status in ('DRAFT','RETURNED')
) with check (
  public.is_participant_application(id) and status in ('DRAFT','RETURNED','SUBMITTED')
);
create policy applications_prodi_update on public.applications for update to authenticated using (public.is_prodi_application(id)) with check (program_id = public.current_program_id());

create policy claims_read on public.course_claims for select to authenticated using (
  public.is_participant_application(application_id) or public.is_prodi_application(application_id) or public.is_assigned_application(application_id)
);
create policy claims_participant_insert on public.course_claims for insert to authenticated with check (
  public.is_participant_application(application_id) and public.application_is_editable(application_id)
  and exists (select 1 from public.courses c join public.applications ap on ap.id = application_id where c.id = course_id and c.program_id = ap.program_id and c.active)
);
create policy claims_participant_delete on public.course_claims for delete to authenticated using (
  public.is_participant_application(application_id) and public.application_is_editable(application_id)
);

create policy claim_cpmks_read on public.course_claim_cpmks for select to authenticated using (
  exists (select 1 from public.course_claims cc where cc.id = course_claim_id and (
    public.is_participant_application(cc.application_id) or public.is_prodi_application(cc.application_id) or public.is_assigned_application(cc.application_id)
  ))
);
create policy claim_cpmks_participant_insert on public.course_claim_cpmks for insert to authenticated with check (
  exists (select 1 from public.course_claims cc where cc.id = course_claim_id and public.is_participant_application(cc.application_id) and public.application_is_editable(cc.application_id))
);
create policy claim_cpmks_participant_delete on public.course_claim_cpmks for delete to authenticated using (
  exists (select 1 from public.course_claims cc where cc.id = course_claim_id and public.is_participant_application(cc.application_id) and public.application_is_editable(cc.application_id))
);

create policy evidences_read on public.evidences for select to authenticated using (
  public.is_participant_application(application_id) or public.is_prodi_application(application_id) or public.is_assigned_application(application_id)
);
create policy evidences_participant_insert on public.evidences for insert to authenticated with check (
  public.is_participant_application(application_id) and public.application_is_editable(application_id)
);
create policy evidences_participant_update on public.evidences for update to authenticated using (
  public.is_participant_application(application_id) and public.application_is_editable(application_id)
) with check (public.is_participant_application(application_id));
create policy evidences_participant_delete on public.evidences for delete to authenticated using (
  public.is_participant_application(application_id) and public.application_is_editable(application_id)
);

create policy claim_evidences_read on public.claim_evidences for select to authenticated using (
  exists (select 1 from public.course_claims cc where cc.id = course_claim_id and (
    public.is_participant_application(cc.application_id) or public.is_prodi_application(cc.application_id) or public.is_assigned_application(cc.application_id)
  ))
);
create policy claim_evidences_participant_insert on public.claim_evidences for insert to authenticated with check (
  exists (select 1 from public.course_claims cc where cc.id = course_claim_id and public.is_participant_application(cc.application_id) and public.application_is_editable(cc.application_id))
  and exists (select 1 from public.evidences e join public.course_claims cc on cc.id = course_claim_id where e.id = evidence_id and e.application_id = cc.application_id)
);
create policy claim_evidences_participant_delete on public.claim_evidences for delete to authenticated using (
  exists (select 1 from public.course_claims cc where cc.id = course_claim_id and public.is_participant_application(cc.application_id) and public.application_is_editable(cc.application_id))
);

create policy assignments_read on public.assessor_assignments for select to authenticated using (
  public.is_participant_application(application_id) or public.is_prodi_application(application_id) or public.is_assigned_application(application_id)
);
create policy assignments_prodi_insert on public.assessor_assignments for insert to authenticated with check (public.is_prodi_application(application_id));
create policy assignments_prodi_update on public.assessor_assignments for update to authenticated using (public.is_prodi_application(application_id)) with check (public.is_prodi_application(application_id));
create policy assignments_prodi_delete on public.assessor_assignments for delete to authenticated using (public.is_prodi_application(application_id));

create policy scores_read on public.assessor_scores for select to authenticated using (
  public.is_prodi_application(application_id) or public.is_assigned_application(application_id)
  or (public.is_participant_application(application_id) and exists (select 1 from public.applications ap where ap.id = application_id and ap.status = 'FINAL'))
);
create policy scores_assessor_insert on public.assessor_scores for insert to authenticated with check (
  public.current_role() = 'assessor' and public.is_assigned_application(application_id)
  and assessor_id = (select id from public.assessors where profile_id = public.current_profile_id() limit 1)
  and exists (select 1 from public.applications ap where ap.id = application_id and ap.status <> 'FINAL')
);
create policy scores_assessor_update on public.assessor_scores for update to authenticated using (
  public.current_role() = 'assessor' and public.is_assigned_application(application_id)
  and assessor_id = (select id from public.assessors where profile_id = public.current_profile_id() limit 1)
  and exists (select 1 from public.applications ap where ap.id = application_id and ap.status <> 'FINAL')
) with check (
  assessor_id = (select id from public.assessors where profile_id = public.current_profile_id() limit 1)
  and exists (select 1 from public.applications ap where ap.id = application_id and ap.status <> 'FINAL')
);

create policy yudisium_read on public.yudisium_decisions for select to authenticated using (
  public.is_prodi_application(application_id) or public.is_assigned_application(application_id)
  or (public.is_participant_application(application_id) and status = 'FINAL')
);
create policy yudisium_prodi_insert on public.yudisium_decisions for insert to authenticated with check (public.is_prodi_application(application_id));
create policy yudisium_prodi_update on public.yudisium_decisions for update to authenticated using (public.is_prodi_application(application_id)) with check (public.is_prodi_application(application_id));
create policy yudisium_prodi_delete on public.yudisium_decisions for delete to authenticated using (public.is_prodi_application(application_id));

create policy responses_read on public.recognition_responses for select to authenticated using (
  public.is_prodi_application(application_id) or (participant_id = (select id from public.participants where profile_id = public.current_profile_id() limit 1))
);
create policy responses_participant_insert on public.recognition_responses for insert to authenticated with check (
  participant_id = (select id from public.participants where profile_id = public.current_profile_id() limit 1)
  and public.is_participant_application(application_id)
  and exists (select 1 from public.applications ap where ap.id = application_id and ap.status = 'FINAL')
);

create policy audit_insert on public.audit_logs for insert to authenticated with check (actor_user_id = auth.uid() and program_id = public.current_program_id());
create policy audit_actor_read on public.audit_logs for select to authenticated using (actor_user_id = auth.uid());
create policy audit_prodi_read on public.audit_logs for select to authenticated using (
  public.current_role() in ('prodi','admin') and program_id = public.current_program_id()
);

-- Keep profiles immutable to normal users. User provisioning is performed with the secret key.
revoke all on table public.profiles from anon;

-- Atomic workflow operations used by Prodi server actions. These are SECURITY DEFINER
-- but perform explicit role/program checks before bypassing RLS for the transaction.
create or replace function public.return_rpl_application(p_application_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_program uuid;
  v_status public.application_status;
begin
  select ap.program_id, ap.status into v_program, v_status
  from public.applications ap where ap.id = p_application_id for update;

  if v_program is null or public.current_role() not in ('prodi','admin') or v_program <> public.current_program_id() then
    raise exception 'Aplikasi tidak ditemukan atau tidak dapat diakses.';
  end if;
  if v_status not in ('SUBMITTED','ASSESSMENT','YUDISIUM','RETURNED') then
    raise exception 'Status aplikasi tidak dapat dikembalikan untuk revisi.';
  end if;
  if nullif(trim(p_note), '') is null then
    raise exception 'Catatan revisi wajib diisi.';
  end if;

  -- A revision can change evidence, so prior assessment and yudisium are invalidated.
  delete from public.assessor_scores where application_id = p_application_id;
  delete from public.yudisium_decisions where application_id = p_application_id;
  update public.applications
     set status = 'RETURNED', return_note = trim(p_note), finalized_at = null
   where id = p_application_id;
end;
$$;

create or replace function public.finalize_rpl_application(p_application_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_program uuid;
  v_status public.application_status;
  v_now timestamptz := now();
  v_assessor1 uuid;
  v_assessor2 uuid;
  v_expected integer;
  v_filled integer;
  r record;
begin
  select ap.program_id, ap.status into v_program, v_status
  from public.applications ap where ap.id = p_application_id for update;

  if v_program is null or public.current_role() not in ('prodi','admin') or v_program <> public.current_program_id() then
    raise exception 'Aplikasi tidak ditemukan atau tidak dapat diakses.';
  end if;
  if v_status not in ('ASSESSMENT','YUDISIUM') then
    raise exception 'Status aplikasi belum siap untuk finalisasi.';
  end if;
  if exists (
    select 1 from public.course_claims cc
    where cc.application_id = p_application_id
      and not exists (
        select 1 from public.yudisium_decisions yd
        where yd.course_claim_id = cc.id and yd.status = 'DRAFT'
      )
  ) then
    raise exception 'Keputusan yudisium belum lengkap.';
  end if;

  select aa.assessor1_id, aa.assessor2_id into v_assessor1, v_assessor2
  from public.assessor_assignments aa where aa.application_id = p_application_id;
  if v_assessor1 is null or v_assessor2 is null then
    raise exception 'Dua asesor belum diplot.';
  end if;

  for r in
    select cc.id as claim_id, c.id as course_id, c.assessment_type
    from public.course_claims cc
    join public.courses c on c.id = cc.course_id
    where cc.application_id = p_application_id
  loop
    if r.assessment_type = 'OBE' then
      select count(*)::integer into v_expected
      from public.course_claim_cpmks ccc
      where ccc.course_claim_id = r.claim_id;
      if v_expected = 0 then raise exception 'Peserta belum memilih CPMK untuk mata kuliah OBE.'; end if;
    else
      v_expected := 1;
    end if;

    select count(*)::integer into v_filled from public.assessor_scores s
    where s.application_id = p_application_id and s.course_claim_id = r.claim_id
      and s.assessor_id = v_assessor1 and s.score is not null;
    if v_filled < v_expected then raise exception 'Nilai Asesor 1 belum lengkap.'; end if;

    select count(*)::integer into v_filled from public.assessor_scores s
    where s.application_id = p_application_id and s.course_claim_id = r.claim_id
      and s.assessor_id = v_assessor2 and s.score is not null;
    if v_filled < v_expected then raise exception 'Nilai Asesor 2 belum lengkap.'; end if;
  end loop;

  update public.yudisium_decisions
     set status = 'FINAL', finalized_at = v_now
   where application_id = p_application_id and status = 'DRAFT';
  update public.applications
     set status = 'FINAL', finalized_at = v_now
   where id = p_application_id;
end;
$$;

create or replace function public.reopen_rpl_application(p_application_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_program uuid;
  v_status public.application_status;
begin
  select ap.program_id, ap.status into v_program, v_status
  from public.applications ap where ap.id = p_application_id for update;

  if v_program is null or public.current_role() not in ('prodi','admin') or v_program <> public.current_program_id() then
    raise exception 'Aplikasi tidak ditemukan atau tidak dapat diakses.';
  end if;
  if v_status <> 'FINAL' then
    raise exception 'Hasil belum final.';
  end if;
  if exists (select 1 from public.recognition_responses rr where rr.application_id = p_application_id) then
    raise exception 'Finalisasi tidak dapat dibatalkan setelah peserta memberi tanggapan.';
  end if;

  update public.yudisium_decisions
     set status = 'DRAFT', finalized_at = null
   where application_id = p_application_id and status = 'FINAL';
  update public.applications
     set status = 'YUDISIUM', finalized_at = null
   where id = p_application_id;
end;
$$;

revoke execute on function public.return_rpl_application(uuid, text) from public, anon;
revoke execute on function public.finalize_rpl_application(uuid) from public, anon;
revoke execute on function public.reopen_rpl_application(uuid) from public, anon;
grant execute on function public.return_rpl_application(uuid, text) to authenticated;
grant execute on function public.finalize_rpl_application(uuid) to authenticated;
grant execute on function public.reopen_rpl_application(uuid) to authenticated;
