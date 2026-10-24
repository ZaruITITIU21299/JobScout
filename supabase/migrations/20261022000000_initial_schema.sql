-- Baseline: initial JobScout schema.
-- Already applied manually to the production project on 2026-10-22 (from SUPABASE_DIAGRAM_TEST.MD).
-- Kept here so the repository reflects the database. Do not re-run.

begin;

-- =========================================================
-- Module 1: users and trust
-- =========================================================

create table public.profiles (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  display_name     text check (char_length(display_name) <= 100),
  headline         text check (char_length(headline) <= 200),
  location         text check (char_length(location) <= 100),
  desired_position text check (char_length(desired_position) <= 100),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.user_roles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'user' check (role in ('user', 'admin')),
  updated_at timestamptz not null default now()
);

create table public.user_stats (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  login_count   integer not null default 0 check (login_count >= 0),
  last_login_at timestamptz
);

create table public.trust_scores (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  score             numeric(4, 3) not null default 0 check (score between 0 and 1),
  components        jsonb not null default '{}'::jsonb,
  formula_version   text not null,
  anomaly_cap_until timestamptz,
  computed_at       timestamptz not null default now()
);

-- =========================================================
-- Modules 1 and 2: CVs
-- =========================================================

create table public.resumes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null check (char_length(title) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resume_versions (
  id                uuid primary key default gen_random_uuid(),
  resume_id         uuid not null references public.resumes (id) on delete cascade,
  version_no        integer not null check (version_no >= 1),
  storage_path      text not null,
  file_name         text not null,
  mime_type         text not null check (mime_type in (
                      'application/pdf',
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  file_size_bytes   integer not null check (file_size_bytes > 0),
  llm_consent       boolean not null default false,
  consented_at      timestamptz,
  extraction_status text not null default 'not_requested'
                      check (extraction_status in ('not_requested', 'pending', 'succeeded', 'failed')),
  skills            jsonb,
  model             text,
  prompt_version    text,
  extracted_at      timestamptz,
  created_at        timestamptz not null default now(),
  unique (resume_id, version_no),
  -- skills may only exist if the user consented to sending the CV to the LLM (FR-3.7)
  check (skills is null or llm_consent)
);

-- =========================================================
-- Module 2: jobs and pipeline
-- =========================================================

create table public.companies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) <= 200),
  normalized_name text not null unique,
  created_at      timestamptz not null default now()
);

create table public.job_postings (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid references public.companies (id) on delete restrict,
  title        text not null check (char_length(title) <= 200),
  source_url   text check (source_url ~* '^https?://'),
  jd_text      text not null,
  content_hash text not null unique,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table public.job_cards (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  job_posting_id uuid not null references public.job_postings (id) on delete restrict,
  company_name   text not null check (char_length(company_name) <= 200),
  position       text not null check (char_length(position) <= 200),
  applied_at     date not null default current_date,
  stage          text not null default 'saved'
                   check (stage in ('saved', 'applied', 'interview', 'offer', 'rejected')),
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, job_posting_id)
);
create index job_cards_board_idx on public.job_cards (user_id, stage, sort_order);

create table public.card_stage_history (
  id          uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards (id) on delete cascade,
  from_stage  text check (from_stage in ('saved', 'applied', 'interview', 'offer', 'rejected')),
  to_stage    text not null check (to_stage in ('saved', 'applied', 'interview', 'offer', 'rejected')),
  changed_at  timestamptz not null default now()
);
create index card_stage_history_card_idx on public.card_stage_history (job_card_id, changed_at);

-- =========================================================
-- Modules 3 and 4: analysis results
-- =========================================================

create table public.jd_skill_extractions (
  id             uuid primary key default gen_random_uuid(),
  job_posting_id uuid not null references public.job_postings (id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  skills         jsonb,
  model          text not null,
  prompt_version text not null,
  error_code     text,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz,
  unique (job_posting_id, prompt_version, model)
);

create table public.scam_assessments (
  id                    uuid primary key default gen_random_uuid(),
  job_posting_id        uuid not null references public.job_postings (id) on delete cascade,
  -- rule signal
  rule_set_version      text not null,
  rule_hits             jsonb not null default '[]'::jsonb,
  rule_outcome          text not null check (rule_outcome in ('clear', 'suspicious', 'inconclusive')),
  -- LLM signal
  llm_invoked           boolean not null default false,
  llm_invocation_reason text,
  llm_status            text check (llm_status in ('succeeded', 'failed', 'timeout')),
  llm_result            jsonb,
  llm_model             text,
  llm_prompt_version    text,
  -- final verdict
  verdict               text not null check (verdict in ('genuine', 'misleading', 'scam', 'unknown')),
  evidence              jsonb not null default '[]'::jsonb,
  aggregator_version    text not null,
  created_at            timestamptz not null default now()
);
create index scam_assessments_posting_idx on public.scam_assessments (job_posting_id, created_at desc);

create table public.skill_gap_analyses (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  job_card_id            uuid not null references public.job_cards (id) on delete cascade,
  resume_version_id      uuid not null references public.resume_versions (id) on delete cascade,
  jd_skill_extraction_id uuid references public.jd_skill_extractions (id) on delete set null,
  matched                jsonb not null default '[]'::jsonb,
  missing                jsonb not null default '[]'::jsonb,
  extra                  jsonb not null default '[]'::jsonb,
  matcher_version        text not null,
  created_at             timestamptz not null default now()
);

-- =========================================================
-- Modules 1 and 5: flags, anti-abuse, moderation
-- =========================================================

create table public.anomaly_events (
  id             uuid primary key default gen_random_uuid(),
  heuristic      text not null check (heuristic in ('H1', 'H2', 'H3')),
  job_posting_id uuid references public.job_postings (id) on delete set null,
  user_id        uuid references auth.users (id) on delete set null,
  details        jsonb not null,
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz,
  resolved_by    uuid references auth.users (id) on delete set null
);

create table public.flags (
  id               uuid primary key default gen_random_uuid(),
  -- set to null when the reporter deletes their account (NFR-12a)
  reporter_id      uuid references auth.users (id) on delete set null,
  target_type      text not null check (target_type in ('job_posting', 'company')),
  job_posting_id   uuid references public.job_postings (id) on delete cascade,
  company_id       uuid references public.companies (id) on delete cascade,
  reason           text not null check (reason in (
                     'scam', 'title_mismatch', 'mlm', 'payment_required', 'fake_company', 'other')),
  comment          text check (char_length(comment) <= 500),
  status           text not null default 'active' check (status in ('active', 'frozen', 'rejected')),
  low_quality      boolean not null default false,
  accuracy         text check (accuracy in ('correct', 'incorrect')),
  anomaly_event_id uuid references public.anomaly_events (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (
    (target_type = 'job_posting' and job_posting_id is not null and company_id is null) or
    (target_type = 'company' and company_id is not null and job_posting_id is null)
  ),
  check (reason <> 'other' or comment is not null),
  unique (reporter_id, job_posting_id),
  unique (reporter_id, company_id)
);
create index flags_posting_idx on public.flags (job_posting_id, created_at);
create index flags_company_idx on public.flags (company_id, created_at);
create index flags_status_idx on public.flags (status);

create table public.moderation_decisions (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid references auth.users (id) on delete set null,
  flag_id    uuid not null references public.flags (id) on delete restrict,
  decision   text not null check (decision in ('release', 'reject', 'confirm_accurate', 'mark_inaccurate')),
  reason     text not null,
  created_at timestamptz not null default now()
);

create table public.trust_score_events (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  old_score              numeric(4, 3) check (old_score between 0 and 1),
  new_score              numeric(4, 3) not null check (new_score between 0 and 1),
  components             jsonb,
  reason                 text not null,
  moderation_decision_id uuid references public.moderation_decisions (id) on delete set null,
  created_at             timestamptz not null default now()
);

create table public.blacklist_entries (
  id             uuid primary key default gen_random_uuid(),
  entry_type     text not null check (entry_type in ('company', 'job_posting', 'domain')),
  company_id     uuid references public.companies (id) on delete cascade,
  job_posting_id uuid references public.job_postings (id) on delete cascade,
  domain         text check (domain = lower(domain)),
  reason         text not null,
  added_by       uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  removed_at     timestamptz,
  removed_by     uuid references auth.users (id) on delete set null,
  check (
    (entry_type = 'company' and company_id is not null and job_posting_id is null and domain is null) or
    (entry_type = 'job_posting' and job_posting_id is not null and company_id is null and domain is null) or
    (entry_type = 'domain' and domain is not null and company_id is null and job_posting_id is null)
  )
);

-- =========================================================
-- Logs
-- =========================================================

create table public.llm_call_logs (
  id             uuid primary key default gen_random_uuid(),
  purpose        text not null check (purpose in ('skill_extraction', 'cv_skill_extraction', 'scam_analysis')),
  job_posting_id uuid references public.job_postings (id) on delete set null,
  model          text not null,
  prompt_version text not null,
  latency_ms     integer check (latency_ms >= 0),
  input_tokens   integer check (input_tokens >= 0),
  output_tokens  integer check (output_tokens >= 0),
  schema_valid   boolean,
  retry_count    integer not null default 0 check (retry_count >= 0),
  error_type     text,
  created_at     timestamptz not null default now()
);
create index llm_call_logs_created_idx on public.llm_call_logs (created_at);

-- =========================================================
-- RLS: enabled everywhere, no policies yet (deny all via API)
-- =========================================================

alter table public.profiles             enable row level security;
alter table public.user_roles           enable row level security;
alter table public.user_stats           enable row level security;
alter table public.trust_scores         enable row level security;
alter table public.resumes              enable row level security;
alter table public.resume_versions      enable row level security;
alter table public.companies            enable row level security;
alter table public.job_postings         enable row level security;
alter table public.job_cards            enable row level security;
alter table public.card_stage_history   enable row level security;
alter table public.jd_skill_extractions enable row level security;
alter table public.scam_assessments     enable row level security;
alter table public.skill_gap_analyses   enable row level security;
alter table public.anomaly_events       enable row level security;
alter table public.flags                enable row level security;
alter table public.moderation_decisions enable row level security;
alter table public.trust_score_events   enable row level security;
alter table public.blacklist_entries    enable row level security;
alter table public.llm_call_logs        enable row level security;

commit;
