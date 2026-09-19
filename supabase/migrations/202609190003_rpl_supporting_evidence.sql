-- SuKaRPL V5
-- Bukti dukung per CPMK + penyimpanan draft RPL secara batch.
-- Jalankan SETELAH migration admin/payment yang sebelumnya sudah berhasil.

begin;

create table if not exists public.supporting_evidences (
  id uuid primary key default gen_random_uuid(),
  course_claim_id uuid not null references public.course_claims(id) on delete cascade,
  cpmk_id uuid references public.cpmks(id) on delete restrict,
  url text not null check (url ~* '^https?://'),
  description text,
  source_evidence_id uuid references public.evidences(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supporting_evidences_selected_cpmk_fk
    foreign key (course_claim_id, cpmk_id)
    references public.course_claim_cpmks(course_claim_id, cpmk_id)
    on delete cascade
);

create index if not exists idx_supporting_evidences_claim
  on public.supporting_evidences(course_claim_id);
create index if not exists idx_supporting_evidences_cpmk
  on public.supporting_evidences(cpmk_id);
create unique index if not exists ux_supporting_evidence_legacy_obe
  on public.supporting_evidences(course_claim_id, cpmk_id, source_evidence_id)
  where source_evidence_id is not null and cpmk_id is not null;
create unique index if not exists ux_supporting_evidence_legacy_nonobe
  on public.supporting_evidences(course_claim_id, source_evidence_id)
  where source_evidence_id is not null and cpmk_id is null;

create or replace function public.validate_supporting_evidence()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_mode public.assessment_type;
  v_course_id uuid;
begin
  select c.assessment_type, cc.course_id
    into v_mode, v_course_id
  from public.course_claims cc
  join public.courses c on c.id = cc.course_id
  where cc.id = new.course_claim_id;

  if v_mode is null then
    raise exception 'Mata kuliah pengajuan tidak ditemukan.';
  end if;

  if v_mode = 'OBE' then
    if new.cpmk_id is null then
      raise exception 'Bukti mata kuliah OBE wajib terhubung ke CPMK.';
    end if;
    if not exists (
      select 1
      from public.course_claim_cpmks ccc
      where ccc.course_claim_id = new.course_claim_id
        and ccc.cpmk_id = new.cpmk_id
    ) then
      raise exception 'Bukti hanya dapat ditambahkan pada CPMK yang dicentang.';
    end if;
  else
    if new.cpmk_id is not null then
      raise exception 'Bukti mata kuliah Non OBE tidak menggunakan CPMK.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_supporting_evidence on public.supporting_evidences;
create trigger trg_validate_supporting_evidence
before insert or update of course_claim_id, cpmk_id
on public.supporting_evidences
for each row execute function public.validate_supporting_evidence();

drop trigger if exists trg_supporting_evidences_updated on public.supporting_evidences;
create trigger trg_supporting_evidences_updated
before update on public.supporting_evidences
for each row execute function public.set_updated_at();

alter table public.supporting_evidences enable row level security;

drop policy if exists supporting_evidences_read on public.supporting_evidences;
create policy supporting_evidences_read
on public.supporting_evidences for select to authenticated
using (
  exists (
    select 1 from public.course_claims cc
    where cc.id = course_claim_id
      and (
        public.is_participant_application(cc.application_id)
        or public.is_prodi_application(cc.application_id)
        or public.is_assigned_application(cc.application_id)
      )
  )
);

drop policy if exists supporting_evidences_participant_insert on public.supporting_evidences;
create policy supporting_evidences_participant_insert
on public.supporting_evidences for insert to authenticated
with check (
  exists (
    select 1 from public.course_claims cc
    where cc.id = course_claim_id
      and public.is_participant_application(cc.application_id)
      and public.application_is_editable(cc.application_id)
  )
);

drop policy if exists supporting_evidences_participant_update on public.supporting_evidences;
create policy supporting_evidences_participant_update
on public.supporting_evidences for update to authenticated
using (
  exists (
    select 1 from public.course_claims cc
    where cc.id = course_claim_id
      and public.is_participant_application(cc.application_id)
      and public.application_is_editable(cc.application_id)
  )
)
with check (
  exists (
    select 1 from public.course_claims cc
    where cc.id = course_claim_id
      and public.is_participant_application(cc.application_id)
      and public.application_is_editable(cc.application_id)
  )
);

drop policy if exists supporting_evidences_participant_delete on public.supporting_evidences;
create policy supporting_evidences_participant_delete
on public.supporting_evidences for delete to authenticated
using (
  exists (
    select 1 from public.course_claims cc
    where cc.id = course_claim_id
      and public.is_participant_application(cc.application_id)
      and public.application_is_editable(cc.application_id)
  )
);

grant select, insert, update, delete on public.supporting_evidences to authenticated;

-- Migrasikan bukti model lama agar data lama tetap terlihat pada tampilan baru.
-- Untuk OBE, satu bukti mata kuliah diwariskan ke setiap CPMK yang dahulu dicentang.
insert into public.supporting_evidences (
  course_claim_id, cpmk_id, url, description, source_evidence_id
)
select
  ce.course_claim_id,
  ccc.cpmk_id,
  e.url,
  nullif(trim(concat_ws(' — ', nullif(e.title, ''), nullif(e.description, ''))), ''),
  e.id
from public.claim_evidences ce
join public.evidences e on e.id = ce.evidence_id
join public.course_claims cc on cc.id = ce.course_claim_id
join public.courses c on c.id = cc.course_id and c.assessment_type = 'OBE'
join public.course_claim_cpmks ccc on ccc.course_claim_id = ce.course_claim_id
where not exists (
  select 1
  from public.supporting_evidences se
  where se.course_claim_id = ce.course_claim_id
    and se.cpmk_id = ccc.cpmk_id
    and se.source_evidence_id = e.id
);

-- Untuk Non OBE, bukti tetap berada pada level mata kuliah.
insert into public.supporting_evidences (
  course_claim_id, cpmk_id, url, description, source_evidence_id
)
select
  ce.course_claim_id,
  null,
  e.url,
  nullif(trim(concat_ws(' — ', nullif(e.title, ''), nullif(e.description, ''))), ''),
  e.id
from public.claim_evidences ce
join public.evidences e on e.id = ce.evidence_id
join public.course_claims cc on cc.id = ce.course_claim_id
join public.courses c on c.id = cc.course_id and c.assessment_type = 'NON_OBE'
where not exists (
  select 1
  from public.supporting_evidences se
  where se.course_claim_id = ce.course_claim_id
    and se.cpmk_id is null
    and se.source_evidence_id = e.id
);

-- Satu RPC = satu transaksi database. Checkbox dan input di browser tidak menulis
-- ke database sampai peserta menekan Simpan Draft atau Kirim Pengajuan.
create or replace function public.save_participant_rpl_draft(
  p_payload jsonb,
  p_submit boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_participant_id uuid;
  v_application_id uuid;
  v_program_id uuid;
  v_status public.application_status;
  v_course_json jsonb;
  v_cpmk_json jsonb;
  v_evidence_json jsonb;
  v_course_id uuid;
  v_cpmk_id uuid;
  v_claim_id uuid;
  v_mode public.assessment_type;
  v_url text;
  v_description text;
  v_course_count integer := 0;
  v_cpmk_count integer := 0;
  v_evidence_count integer := 0;
begin
  if auth.uid() is null or public.current_role() <> 'participant' then
    raise exception 'Akses hanya untuk peserta.';
  end if;

  if jsonb_typeof(coalesce(p_payload->'courses', '[]'::jsonb)) <> 'array' then
    raise exception 'Format draft RPL tidak valid.';
  end if;

  v_profile_id := public.current_profile_id();

  select p.id, ap.id, ap.program_id, ap.status
    into v_participant_id, v_application_id, v_program_id, v_status
  from public.participants p
  join public.applications ap on ap.participant_id = p.id
  where p.profile_id = v_profile_id
  for update of ap;

  if v_application_id is null then
    raise exception 'Pengajuan RPL belum dibuat.';
  end if;
  if v_status not in ('DRAFT','RETURNED') then
    raise exception 'Pengajuan sudah dikunci dan tidak dapat diubah.';
  end if;

  -- Hapus mata kuliah yang tidak lagi dipilih. Relasi CPMK/bukti turunannya ikut terhapus.
  delete from public.course_claims cc
  where cc.application_id = v_application_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_payload->'courses', '[]'::jsonb)) x
      where nullif(x.value->>'courseId','')::uuid = cc.course_id
    );

  for v_course_json in
    select value from jsonb_array_elements(coalesce(p_payload->'courses', '[]'::jsonb))
  loop
    v_course_id := nullif(v_course_json->>'courseId','')::uuid;
    if v_course_id is null then
      raise exception 'ID mata kuliah tidak valid.';
    end if;

    select c.assessment_type
      into v_mode
    from public.courses c
    where c.id = v_course_id
      and c.program_id = v_program_id
      and c.active = true;

    if v_mode is null then
      raise exception 'Mata kuliah tidak valid untuk program peserta.';
    end if;

    insert into public.course_claims(application_id, course_id)
    values (v_application_id, v_course_id)
    on conflict (application_id, course_id) do nothing;

    select cc.id into v_claim_id
    from public.course_claims cc
    where cc.application_id = v_application_id
      and cc.course_id = v_course_id;

    if v_mode = 'OBE' then
      if jsonb_typeof(coalesce(v_course_json->'cpmks', '[]'::jsonb)) <> 'array' then
        raise exception 'Format CPMK tidak valid.';
      end if;

      -- Hapus CPMK yang dilepas dari draft. Bukti CPMK ikut terhapus via FK.
      delete from public.course_claim_cpmks ccc
      where ccc.course_claim_id = v_claim_id
        and not exists (
          select 1
          from jsonb_array_elements(coalesce(v_course_json->'cpmks', '[]'::jsonb)) x
          where nullif(x.value->>'cpmkId','')::uuid = ccc.cpmk_id
        );

      -- Bersihkan bukti level mata kuliah bila MK pernah berganti mode.
      delete from public.supporting_evidences
      where course_claim_id = v_claim_id and cpmk_id is null;

      for v_cpmk_json in
        select value from jsonb_array_elements(coalesce(v_course_json->'cpmks', '[]'::jsonb))
      loop
        v_cpmk_id := nullif(v_cpmk_json->>'cpmkId','')::uuid;
        if v_cpmk_id is null or not exists (
          select 1 from public.cpmks cp
          where cp.id = v_cpmk_id
            and cp.course_id = v_course_id
            and cp.active = true
        ) then
          raise exception 'CPMK tidak valid untuk mata kuliah yang dipilih.';
        end if;

        insert into public.course_claim_cpmks(course_claim_id, cpmk_id)
        values (v_claim_id, v_cpmk_id)
        on conflict (course_claim_id, cpmk_id) do nothing;

        -- Draft dikirim sebagai snapshot: bukti CPMK diganti dengan isi terbaru dari form.
        delete from public.supporting_evidences
        where course_claim_id = v_claim_id and cpmk_id = v_cpmk_id;

        if jsonb_typeof(coalesce(v_cpmk_json->'evidences', '[]'::jsonb)) <> 'array' then
          raise exception 'Format bukti dukung tidak valid.';
        end if;

        for v_evidence_json in
          select value from jsonb_array_elements(coalesce(v_cpmk_json->'evidences', '[]'::jsonb))
        loop
          v_url := trim(coalesce(v_evidence_json->>'url',''));
          v_description := nullif(trim(coalesce(v_evidence_json->>'description','')), '');
          if v_url = '' or v_url !~* '^https?://' then
            raise exception 'Bukti dukung wajib berupa link http/https yang valid.';
          end if;
          if length(coalesce(v_description,'')) > 1500 then
            raise exception 'Deskripsi bukti maksimal 1500 karakter.';
          end if;

          insert into public.supporting_evidences(course_claim_id, cpmk_id, url, description)
          values (v_claim_id, v_cpmk_id, v_url, v_description);
        end loop;
      end loop;
    else
      -- Non OBE tidak memiliki checklist CPMK.
      delete from public.course_claim_cpmks where course_claim_id = v_claim_id;
      delete from public.supporting_evidences
      where course_claim_id = v_claim_id and cpmk_id is null;

      if jsonb_typeof(coalesce(v_course_json->'evidences', '[]'::jsonb)) <> 'array' then
        raise exception 'Format bukti dukung tidak valid.';
      end if;

      for v_evidence_json in
        select value from jsonb_array_elements(coalesce(v_course_json->'evidences', '[]'::jsonb))
      loop
        v_url := trim(coalesce(v_evidence_json->>'url',''));
        v_description := nullif(trim(coalesce(v_evidence_json->>'description','')), '');
        if v_url = '' or v_url !~* '^https?://' then
          raise exception 'Bukti dukung wajib berupa link http/https yang valid.';
        end if;
        if length(coalesce(v_description,'')) > 1500 then
          raise exception 'Deskripsi bukti maksimal 1500 karakter.';
        end if;

        insert into public.supporting_evidences(course_claim_id, cpmk_id, url, description)
        values (v_claim_id, null, v_url, v_description);
      end loop;
    end if;
  end loop;

  select count(*)::integer into v_course_count
  from public.course_claims where application_id = v_application_id;

  select count(*)::integer into v_cpmk_count
  from public.course_claim_cpmks ccc
  join public.course_claims cc on cc.id = ccc.course_claim_id
  where cc.application_id = v_application_id;

  select count(*)::integer into v_evidence_count
  from public.supporting_evidences se
  join public.course_claims cc on cc.id = se.course_claim_id
  where cc.application_id = v_application_id;

  if p_submit then
    if v_course_count = 0 then
      raise exception 'Pilih minimal satu mata kuliah.';
    end if;

    if exists (
      select 1
      from public.course_claims cc
      join public.courses c on c.id = cc.course_id
      where cc.application_id = v_application_id
        and c.assessment_type = 'OBE'
        and not exists (
          select 1 from public.course_claim_cpmks ccc
          where ccc.course_claim_id = cc.id
        )
    ) then
      raise exception 'Setiap mata kuliah OBE wajib memiliki minimal satu CPMK yang dicentang.';
    end if;

    if exists (
      select 1
      from public.course_claim_cpmks ccc
      join public.course_claims cc on cc.id = ccc.course_claim_id
      where cc.application_id = v_application_id
        and not exists (
          select 1 from public.supporting_evidences se
          where se.course_claim_id = ccc.course_claim_id
            and se.cpmk_id = ccc.cpmk_id
        )
    ) then
      raise exception 'Setiap CPMK yang dicentang wajib memiliki minimal satu bukti dukung.';
    end if;

    if exists (
      select 1
      from public.course_claims cc
      join public.courses c on c.id = cc.course_id
      where cc.application_id = v_application_id
        and c.assessment_type = 'NON_OBE'
        and not exists (
          select 1 from public.supporting_evidences se
          where se.course_claim_id = cc.id and se.cpmk_id is null
        )
    ) then
      raise exception 'Setiap mata kuliah Non OBE wajib memiliki minimal satu bukti dukung.';
    end if;

    update public.applications
    set status = 'SUBMITTED', submitted_at = now(), return_note = null
    where id = v_application_id;
  end if;

  insert into public.audit_logs(
    actor_user_id, program_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(),
    v_program_id,
    case when p_submit then 'SUBMIT_RPL_DRAFT_BATCH' else 'SAVE_RPL_DRAFT_BATCH' end,
    'application',
    v_application_id::text,
    jsonb_build_object(
      'course_count', v_course_count,
      'cpmk_count', v_cpmk_count,
      'evidence_count', v_evidence_count
    )
  );

  return jsonb_build_object(
    'ok', true,
    'submitted', p_submit,
    'course_count', v_course_count,
    'cpmk_count', v_cpmk_count,
    'evidence_count', v_evidence_count
  );
end;
$$;

grant execute on function public.save_participant_rpl_draft(jsonb, boolean) to authenticated;

commit;
