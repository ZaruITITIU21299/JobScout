-- Phase 4: core pipeline (module 2) — access rules, triggers, functions, CV storage.
-- Apply once in the Supabase SQL Editor (production project), after the two baseline migrations.

begin;

-- =========================================================
-- 1. Privileges: deny by default, then grant only what Phase 4 needs.
--    RLS decides which rows; grants decide which tables/columns the API can touch at all.
--    Column-level UPDATE/INSERT grants stop users from writing server-owned columns
--    (e.g. job_cards.user_id, resume_versions.skills).
-- =========================================================

revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Future objects created by the postgres role are not exposed automatically either.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

grant select, update (display_name, headline, location, desired_position) on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.user_stats to authenticated;

grant select on public.companies to authenticated;
grant select on public.job_postings to authenticated;
-- job cards are created only through public.create_job_card (needs cross-user deduplication)
grant select, delete on public.job_cards to authenticated;
grant update (company_name, position, applied_at, stage, sort_order) on public.job_cards to authenticated;
grant select on public.card_stage_history to authenticated;

grant select, insert, delete on public.resumes to authenticated;
grant update (title) on public.resumes to authenticated;
grant select, delete on public.resume_versions to authenticated;
grant insert (resume_id, version_no, storage_path, file_name, mime_type, file_size_bytes, llm_consent, consented_at)
  on public.resume_versions to authenticated;

-- read-only for the dashboard warning count; written by server code in later phases
grant select on public.jd_skill_extractions to authenticated;
grant select on public.scam_assessments to authenticated;
grant select on public.latest_scam_assessments to authenticated;

-- =========================================================
-- 2. RLS policies (RLS is already enabled on every table)
-- =========================================================

create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy user_roles_select_own on public.user_roles
  for select to authenticated using ((select auth.uid()) = user_id);

create policy user_stats_select_own on public.user_stats
  for select to authenticated using ((select auth.uid()) = user_id);

-- companies hold no personal data and are shared targets for flags and the blacklist
create policy companies_select_all on public.companies
  for select to authenticated using (true);

-- a shared posting is visible only to users who track it on their own board
create policy job_postings_select_tracked on public.job_postings
  for select to authenticated using (
    exists (
      select 1 from public.job_cards c
      where c.job_posting_id = job_postings.id and c.user_id = (select auth.uid())
    )
  );

create policy job_cards_select_own on public.job_cards
  for select to authenticated using ((select auth.uid()) = user_id);
create policy job_cards_update_own on public.job_cards
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy job_cards_delete_own on public.job_cards
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy card_stage_history_select_own on public.card_stage_history
  for select to authenticated using (
    exists (
      select 1 from public.job_cards c
      where c.id = card_stage_history.job_card_id and c.user_id = (select auth.uid())
    )
  );

create policy resumes_select_own on public.resumes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy resumes_insert_own on public.resumes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy resumes_update_own on public.resumes
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy resumes_delete_own on public.resumes
  for delete to authenticated using ((select auth.uid()) = user_id);
create index resumes_user_idx on public.resumes (user_id, created_at);

create policy resume_versions_select_own on public.resume_versions
  for select to authenticated using (
    exists (select 1 from public.resumes r where r.id = resume_versions.resume_id and r.user_id = (select auth.uid()))
  );
create policy resume_versions_insert_own on public.resume_versions
  for insert to authenticated with check (
    exists (select 1 from public.resumes r where r.id = resume_versions.resume_id and r.user_id = (select auth.uid()))
    -- the file must live in the owner's own storage folder
    and storage_path like (select auth.uid())::text || '/' || resume_id::text || '/%'
  );
create policy resume_versions_delete_own on public.resume_versions
  for delete to authenticated using (
    exists (select 1 from public.resumes r where r.id = resume_versions.resume_id and r.user_id = (select auth.uid()))
  );

create policy jd_skill_extractions_select_tracked on public.jd_skill_extractions
  for select to authenticated using (
    exists (
      select 1 from public.job_cards c
      where c.job_posting_id = jd_skill_extractions.job_posting_id and c.user_id = (select auth.uid())
    )
  );

create policy scam_assessments_select_tracked on public.scam_assessments
  for select to authenticated using (
    exists (
      select 1 from public.job_cards c
      where c.job_posting_id = scam_assessments.job_posting_id and c.user_id = (select auth.uid())
    )
  );

-- =========================================================
-- 3. Trigger functions (private schema: not reachable through the API)
-- =========================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger resumes_set_updated_at before update on public.resumes
  for each row execute function private.set_updated_at();
create trigger job_cards_set_updated_at before update on public.job_cards
  for each row execute function private.set_updated_at();

-- every new auth user gets a profile, the default role, and a stats row
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.user_roles (user_id) values (new.id) on conflict do nothing;
  insert into public.user_stats (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- users who signed up before this migration
insert into public.profiles (user_id) select id from auth.users on conflict do nothing;
insert into public.user_roles (user_id) select id from auth.users on conflict do nothing;
insert into public.user_stats (user_id) select id from auth.users on conflict do nothing;

-- stage history feeds the dashboard; users cannot insert it directly, so the trigger is security definer
create or replace function private.record_stage_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.card_stage_history (job_card_id, from_stage, to_stage)
    values (new.id, null, new.stage);
  elsif new.stage is distinct from old.stage then
    insert into public.card_stage_history (job_card_id, from_stage, to_stage)
    values (new.id, old.stage, new.stage);
  end if;
  return new;
end;
$$;

create trigger job_cards_record_stage_change after insert or update of stage on public.job_cards
  for each row execute function private.record_stage_change();

-- =========================================================
-- 4. API functions
-- =========================================================

-- Creates a job card. Security definer because deduplicating companies and postings must see
-- rows created by other users (RLS hides them). Identity always comes from auth.uid(), never
-- from arguments, and the function returns only the new card id.
create or replace function public.create_job_card(
  p_company_name text,
  p_position     text,
  p_jd_text      text,
  p_applied_at   date,
  p_source_url   text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user         uuid := auth.uid();
  v_company_name text := btrim(regexp_replace(coalesce(p_company_name, ''), '\s+', ' ', 'g'));
  v_position     text := btrim(regexp_replace(coalesce(p_position, ''), '\s+', ' ', 'g'));
  v_jd_text      text := btrim(coalesce(p_jd_text, ''));
  v_source_url   text := nullif(btrim(coalesce(p_source_url, '')), '');
  v_hash         text;
  v_company_id   uuid;
  v_posting_id   uuid;
  v_sort_order   integer;
  v_card_id      uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if char_length(v_company_name) not between 1 and 200 then
    raise exception 'invalid company name' using errcode = '22023';
  end if;
  if char_length(v_position) not between 1 and 200 then
    raise exception 'invalid position' using errcode = '22023';
  end if;
  -- PROPOSED limit, mirrored in src/lib/config.ts (JD_TEXT_MAX_LENGTH)
  if char_length(v_jd_text) not between 1 and 20000 then
    raise exception 'invalid job description' using errcode = '22023';
  end if;
  if v_source_url is not null and v_source_url !~* '^https?://' then
    raise exception 'invalid source url' using errcode = '22023';
  end if;
  if p_applied_at is null then
    raise exception 'invalid application date' using errcode = '22023';
  end if;

  -- deduplication key: SHA-256 of the lowercased JD text with whitespace collapsed (NFR-9a)
  v_hash := encode(sha256(convert_to(lower(regexp_replace(v_jd_text, '\s+', ' ', 'g')), 'UTF8')), 'hex');

  insert into public.companies (name, normalized_name)
  values (v_company_name, lower(v_company_name))
  on conflict (normalized_name) do update set name = public.companies.name
  returning id into v_company_id;

  insert into public.job_postings (company_id, title, source_url, jd_text, content_hash, created_by)
  values (v_company_id, v_position, v_source_url, v_jd_text, v_hash, v_user)
  on conflict (content_hash) do update set content_hash = excluded.content_hash
  returning id into v_posting_id;

  select coalesce(max(sort_order), -1) + 1 into v_sort_order
  from public.job_cards
  where user_id = v_user and stage = 'saved';

  -- unique (user_id, job_posting_id) raises 23505 if the user already tracks this JD
  insert into public.job_cards (user_id, job_posting_id, company_name, position, applied_at, stage, sort_order)
  values (v_user, v_posting_id, v_company_name, v_position, p_applied_at, 'saved', v_sort_order)
  returning id into v_card_id;

  return v_card_id;
end;
$$;

revoke all on function public.create_job_card(text, text, text, date, text) from public, anon;
grant execute on function public.create_job_card(text, text, text, date, text) to authenticated;

-- Moves a card to a stage and position, renumbering that column in one transaction.
-- Security invoker: RLS and the column grants above still apply.
create or replace function public.move_job_card(
  p_card_id  uuid,
  p_to_stage text,
  p_to_index integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_count integer;
  v_index integer;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_to_stage not in ('saved', 'applied', 'interview', 'offer', 'rejected') then
    raise exception 'invalid stage' using errcode = '22023';
  end if;

  perform 1 from public.job_cards where id = p_card_id and user_id = v_user for update;
  if not found then
    raise exception 'card not found' using errcode = 'P0002';
  end if;

  select count(*) into v_count
  from public.job_cards
  where user_id = v_user and stage = p_to_stage and id <> p_card_id;

  v_index := greatest(0, least(coalesce(p_to_index, v_count), v_count));

  with ordered as (
    select id, (row_number() over (order by sort_order, created_at, id) - 1)::integer as rn
    from public.job_cards
    where user_id = v_user and stage = p_to_stage and id <> p_card_id
  )
  update public.job_cards c
  set sort_order = case when o.rn >= v_index then o.rn + 1 else o.rn end
  from ordered o
  where c.id = o.id;

  update public.job_cards
  set stage = p_to_stage, sort_order = v_index
  where id = p_card_id;
end;
$$;

revoke all on function public.move_job_card(uuid, text, integer) from public, anon;
grant execute on function public.move_job_card(uuid, text, integer) to authenticated;

-- =========================================================
-- 5. CV storage: private bucket, owner-only access
--    Path: {user_id}/{resume_id}/{version_no}.{ext}
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  5242880, -- PROPOSED 5 MB, mirrored in src/lib/config.ts (CV_MAX_BYTES)
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- no UPDATE policy: CV versions are immutable; a change is uploaded as a new version
create policy resumes_bucket_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy resumes_bucket_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy resumes_bucket_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
