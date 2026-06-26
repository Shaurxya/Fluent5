-- FluentFive Database Schema
-- Run this in Supabase SQL Editor

-- profiles: extends Supabase auth.users
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  streak int default 0,
  longest_streak int default 0,
  xp int default 0,
  last_active date,
  created_at timestamptz default now()
);

-- 5 static activities
create table if not exists activities (
  key text primary key,
  title text not null,
  description text,
  position int
);

-- one row per completed activity per day (drives streak + checklist)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  activity_key text references activities(key),
  done_on date default current_date,
  payload jsonb,
  created_at timestamptz default now(),
  unique(user_id, activity_key, done_on)
);

-- collected phrases with SM-2 spaced-repetition state
create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  text text not null,
  note text,
  ef numeric default 2.5,
  reps int default 0,
  interval int default 0,
  due_date date default current_date,
  created_at timestamptz default now()
);

-- writing drafts and rewrites
create table if not exists writings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  prompt text,
  draft_v1 text,
  draft_v2 text,
  word_count int,
  created_at timestamptz default now()
);

-- quiz question bank (public read)
create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  level text,
  prompt text not null,
  options jsonb not null,
  answer_index int not null
);

-- every test attempt (feeds the progress chart)
create table if not exists test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  mode text,
  score int,
  total int,
  pct int,
  taken_on date default current_date,
  created_at timestamptz default now()
);

-- daily rollup for fast charting
create table if not exists daily_stats (
  user_id uuid references auth.users on delete cascade,
  day date default current_date,
  xp int default 0,
  activities int default 0,
  words_spoken int default 0,
  chunks_added int default 0,
  test_pct int,
  primary key (user_id, day)
);

-- seed content tables
create table if not exists sentences (
  id uuid primary key default gen_random_uuid(),
  level text check (level in ('easy','med','hard')),
  text text not null
);

create table if not exists passages (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text not null,
  level text
);

-- Row Level Security
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table chunks enable row level security;
alter table writings enable row level security;
alter table test_results enable row level security;
alter table daily_stats enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own sessions" on sessions for all using (auth.uid() = user_id);
create policy "own chunks" on chunks for all using (auth.uid() = user_id);
create policy "own writings" on writings for all using (auth.uid() = user_id);
create policy "own tests" on test_results for all using (auth.uid() = user_id);
create policy "own stats" on daily_stats for all using (auth.uid() = user_id);

-- public read tables
alter table activities enable row level security;
alter table sentences enable row level security;
alter table passages enable row level security;
alter table quiz_questions enable row level security;

create policy "read activities" on activities for select using (true);
create policy "read sentences" on sentences for select using (true);
create policy "read passages" on passages for select using (true);
create policy "read quiz" on quiz_questions for select using (true);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
