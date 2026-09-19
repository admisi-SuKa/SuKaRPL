-- SuKaRPL payment proof module
-- Run AFTER 202609180001_initial.sql.

create type public.payment_status as enum ('SUBMITTED','VERIFIED','REJECTED');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  payment_date date not null,
  payment_method text not null check (payment_method in ('TRANSFER_BANK','VIRTUAL_ACCOUNT','OTHER')),
  payer_name text not null check (char_length(trim(payer_name)) >= 2),
  proof_url text not null check (proof_url ~* '^https?://'),
  student_note text,
  status public.payment_status not null default 'SUBMITTED',
  verification_note text,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'REJECTED' or nullif(trim(verification_note), '') is not null),
  check (status <> 'VERIFIED' or (verified_by is not null and verified_at is not null))
);

create index idx_payments_participant on public.payments(participant_id);
create index idx_payments_status on public.payments(status, submitted_at desc);

create trigger trg_payments_updated
before update on public.payments
for each row execute function public.set_updated_at();

create or replace function public.validate_payment_application()
returns trigger language plpgsql set search_path = public as $$
declare
  v_participant uuid;
begin
  select ap.participant_id into v_participant
  from public.applications ap
  where ap.id = new.application_id;

  if v_participant is null or v_participant <> new.participant_id then
    raise exception 'Pembayaran harus terkait dengan pengajuan milik peserta yang sama.';
  end if;
  return new;
end;
$$;

create trigger trg_validate_payment_application
before insert or update of application_id, participant_id on public.payments
for each row execute function public.validate_payment_application();

create or replace function public.payment_is_verified(p_application_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.payments p
    where p.application_id = p_application_id and p.status = 'VERIFIED'
  );
$$;

alter table public.payments enable row level security;

grant select, insert, update on table public.payments to authenticated;

create policy payments_read on public.payments for select to authenticated using (
  public.is_participant_application(application_id)
  or public.is_prodi_application(application_id)
);

create policy payments_participant_insert on public.payments for insert to authenticated with check (
  public.is_participant_application(application_id)
  and participant_id = (select id from public.participants where profile_id = public.current_profile_id() limit 1)
  and status = 'SUBMITTED'
  and verified_by is null
  and verified_at is null
  and verification_note is null
);

-- Peserta hanya boleh memperbaiki pembayaran yang sudah ditolak, lalu mengirim ulang.
create policy payments_participant_resubmit on public.payments for update to authenticated using (
  public.is_participant_application(application_id)
  and participant_id = (select id from public.participants where profile_id = public.current_profile_id() limit 1)
  and status = 'REJECTED'
) with check (
  public.is_participant_application(application_id)
  and participant_id = (select id from public.participants where profile_id = public.current_profile_id() limit 1)
  and status = 'SUBMITTED'
  and verified_by is null
  and verified_at is null
  and verification_note is null
);

create policy payments_prodi_update on public.payments for update to authenticated using (
  public.is_prodi_application(application_id)
) with check (
  public.is_prodi_application(application_id)
  and status in ('VERIFIED','REJECTED')
);

-- Pengajuan baru hanya dapat diplot ke asesor setelah bukti pembayaran terverifikasi.
-- Assignment lama tetap dapat dipertahankan/diperbarui agar data migrasi yang sudah berjalan tidak rusak.
drop policy if exists assignments_prodi_insert on public.assessor_assignments;
create policy assignments_prodi_insert on public.assessor_assignments for insert to authenticated with check (
  public.is_prodi_application(application_id)
  and public.payment_is_verified(application_id)
);
