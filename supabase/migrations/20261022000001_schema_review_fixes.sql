-- Baseline: fixes from the schema review (DATABASE_IMPROVEMENT.MD).
-- Already applied manually to the production project on 2026-10-22 (from Database_change.md).
-- Kept here so the repository reflects the database. Do not re-run.

begin;

-- ---------------------------------------------------------
-- #1 jd_skill_extractions: allow retry after failure
-- ---------------------------------------------------------
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.jd_skill_extractions'::regclass and contype = 'u'
  loop
    execute format('alter table public.jd_skill_extractions drop constraint %I', c.conname);
  end loop;
end $$;

-- at most one in-flight or successful extraction per (posting, prompt, model); failed rows are kept as history
create unique index jd_skill_extractions_active_uidx
  on public.jd_skill_extractions (job_posting_id, prompt_version, model)
  where status in ('pending', 'succeeded');

alter table public.jd_skill_extractions
  add constraint jd_skill_extractions_succeeded_has_skills
  check (status <> 'succeeded' or skills is not null);

-- ---------------------------------------------------------
-- #2 moderation_decisions: one row = state action + accuracy assessment
-- ---------------------------------------------------------
alter table public.moderation_decisions drop column decision;

alter table public.moderation_decisions
  add column action text not null default 'none'
    check (action in ('release', 'reject', 'none')),
  add column accuracy_assessment text not null default 'unknown'
    check (accuracy_assessment in ('correct', 'incorrect', 'unknown')),
  add constraint moderation_decisions_not_empty
    check (action <> 'none' or accuracy_assessment <> 'unknown');

-- defaults only existed to add the columns; the admin must choose explicitly
alter table public.moderation_decisions
  alter column action drop default,
  alter column accuracy_assessment drop default;

create index moderation_decisions_flag_idx on public.moderation_decisions (flag_id, created_at);

-- ---------------------------------------------------------
-- #3 + #4 anomaly events: record every affected flag and user, with the action taken
-- ---------------------------------------------------------
alter table public.flags drop column anomaly_event_id;
alter table public.anomaly_events drop column user_id;

create table public.anomaly_event_flags (
  anomaly_event_id uuid not null references public.anomaly_events (id) on delete cascade,
  flag_id          uuid not null references public.flags (id) on delete cascade,
  action           text not null check (action in ('frozen', 'marked_low_quality')),
  created_at       timestamptz not null default now(),
  primary key (anomaly_event_id, flag_id)
);
create index anomaly_event_flags_flag_idx on public.anomaly_event_flags (flag_id);

create table public.anomaly_event_users (
  anomaly_event_id uuid not null references public.anomaly_events (id) on delete cascade,
  -- rows are removed when the user deletes their account (NFR-12a); the event and its details stay
  user_id          uuid not null references auth.users (id) on delete cascade,
  action           text not null check (action in ('watchlisted', 'accuracy_reset')),
  created_at       timestamptz not null default now(),
  primary key (anomaly_event_id, user_id)
);
create index anomaly_event_users_user_idx on public.anomaly_event_users (user_id);

alter table public.anomaly_event_flags enable row level security;
alter table public.anomaly_event_users enable row level security;

-- ---------------------------------------------------------
-- #5 flags: index for per-user queries
-- ---------------------------------------------------------
create index flags_reporter_created_idx on public.flags (reporter_id, created_at desc);

-- ---------------------------------------------------------
-- #6 llm_call_logs: per-user cost tracking
-- ---------------------------------------------------------
alter table public.llm_call_logs
  add column user_id uuid references auth.users (id) on delete set null;
create index llm_call_logs_user_created_idx on public.llm_call_logs (user_id, created_at);

-- ---------------------------------------------------------
-- #8 skill_gap_analyses: always keep the extraction that was used
-- ---------------------------------------------------------
alter table public.skill_gap_analyses
  drop constraint skill_gap_analyses_jd_skill_extraction_id_fkey;

alter table public.skill_gap_analyses
  alter column jd_skill_extraction_id set not null,
  add constraint skill_gap_analyses_jd_skill_extraction_id_fkey
    foreign key (jd_skill_extraction_id)
    references public.jd_skill_extractions (id) on delete restrict;

-- ---------------------------------------------------------
-- #9 resume_versions: consent consistency
-- ---------------------------------------------------------
alter table public.resume_versions
  add constraint resume_versions_consent_has_timestamp
    check (not llm_consent or consented_at is not null),
  add constraint resume_versions_succeeded_has_skills
    check (extraction_status <> 'succeeded' or skills is not null),
  -- revoking consent means: llm_consent = false, skills = null, extraction_status = 'not_requested'
  add constraint resume_versions_no_consent_no_extraction
    check (llm_consent or extraction_status = 'not_requested');

-- ---------------------------------------------------------
-- #10 latest scam assessment per posting
-- ---------------------------------------------------------
create view public.latest_scam_assessments
  with (security_invoker = true) as
select distinct on (job_posting_id) *
from public.scam_assessments
order by job_posting_id, created_at desc;

commit;
