-- Additive migration. Run after 001 and 002. Existing learning history is retained.
begin;

alter table public.chunks add column if not exists normalized_key text;
create unique index if not exists chunks_new_identity on public.chunks(user_id, normalized_key) where normalized_key is not null;

create table public.nlp_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  request_key text not null,
  mode text not null,
  result jsonb not null,
  engine_version text not null,
  scoring_version text not null,
  created_at timestamptz not null default now(),
  unique(user_id, request_key)
);
create index nlp_analyses_user_date on public.nlp_analyses(user_id, created_at desc);

create table public.practice_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  activity_key text not null references public.activities(key),
  analysis_id uuid references public.nlp_analyses(id) on delete set null,
  payload jsonb not null default '{}',
  xp_awarded int not null default 0,
  created_at timestamptz not null default now()
);
create index practice_sessions_user_date on public.practice_sessions(user_id, created_at desc);

alter table public.test_results add column if not exists attempt_id uuid;
create unique index if not exists test_attempt_identity on public.test_results(attempt_id) where attempt_id is not null;

create table public.flashcard_reviews (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  chunk_id uuid not null references public.chunks on delete cascade,
  grade int not null check (grade between 0 and 5),
  reviewed_on date not null default (now() at time zone 'UTC')::date,
  created_at timestamptz not null default now(),
  unique(user_id, chunk_id, reviewed_on)
);

create table public.api_usage (
  user_id uuid not null references auth.users on delete cascade,
  resource text not null,
  day date not null default (now() at time zone 'UTC')::date,
  calls int not null default 0,
  primary key(user_id, resource, day)
);

alter table public.nlp_analyses enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.api_usage enable row level security;
create policy "own NLP analyses" on public.nlp_analyses for select to authenticated using (user_id = (select auth.uid()));
create policy "own analysis inserts" on public.nlp_analyses for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own analysis deletion" on public.nlp_analyses for delete to authenticated using (user_id = (select auth.uid()));
create policy "own practice history" on public.practice_sessions for select to authenticated using (user_id = (select auth.uid()));
create policy "own flashcard history" on public.flashcard_reviews for select to authenticated using (user_id = (select auth.uid()));
-- Quota counters are intentionally inaccessible except through the fixed-limit function.

create or replace function public.consume_api_quota(p_resource text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_limit int; v_calls int; v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  v_limit := case p_resource when 'nlp' then 100 when 'ai' then 20 when 'tts' then 40 else 0 end;
  if v_limit = 0 then raise exception 'Unknown quota resource'; end if;
  insert into public.api_usage(user_id, resource, day, calls)
  values(v_user, p_resource, (now() at time zone 'UTC')::date, 1)
  on conflict(user_id, resource, day) do update set calls = public.api_usage.calls + 1
  where public.api_usage.calls < v_limit returning calls into v_calls;
  return v_calls is not null;
end; $$;

create or replace function public.save_learning_chunks(p_chunks jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_item jsonb; v_text text; v_key text; v_count int := 0;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_chunks) <> 'array' or jsonb_array_length(p_chunks) > 30 or octet_length(p_chunks::text)>100000 then raise exception 'Invalid chunks'; end if;
  perform 1 from public.profiles where id = v_user for update;
  for v_item in select value from jsonb_array_elements(p_chunks) loop
    v_text := btrim(v_item->>'text');
    if v_text is null or length(v_text) not between 1 and 500 then raise exception 'Invalid chunk text'; end if;
    v_key := lower(regexp_replace(v_text, '\s+', ' ', 'g'));
    if not exists(select 1 from public.chunks where user_id=v_user and lower(regexp_replace(btrim(text), '\s+', ' ', 'g'))=v_key) then
      insert into public.chunks(user_id,text,note,context_jsonb,normalized_key,due_date)
      values(v_user,v_text,left(v_item->>'note',2000),v_item->'context',v_key,(now() at time zone 'UTC')::date);
      v_count := v_count + 1;
    end if;
  end loop;
  insert into public.daily_stats(user_id,day,chunks_added) values(v_user,(now() at time zone 'UTC')::date,v_count)
  on conflict(user_id,day) do update set chunks_added=public.daily_stats.chunks_added+excluded.chunks_added;
  return v_count;
end; $$;

create or replace function public.complete_practice(
  p_attempt_id uuid, p_activity text, p_analysis_id uuid default null,
  p_payload jsonb default '{}', p_chunks jsonb default '[]'
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_today date := (now() at time zone 'UTC')::date;
  v_profile public.profiles%rowtype; v_existing public.practice_sessions%rowtype;
  v_first boolean; v_xp int := 0; v_streak int; v_saved int; v_words int := 0;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_activity not in ('read','speak','shadow','write','review') then raise exception 'Invalid activity'; end if;
  if octet_length(p_payload::text)>100000 then raise exception 'Payload too large'; end if;
  select * into v_profile from public.profiles where id=v_user for update;
  if not found then raise exception 'Profile not found'; end if;
  select * into v_existing from public.practice_sessions where id=p_attempt_id;
  if found then
    if v_existing.user_id <> v_user then raise exception 'Attempt belongs to another user'; end if;
    return jsonb_build_object('id',p_attempt_id,'xp_awarded',v_existing.xp_awarded,'already_saved',true,'chunks_saved',0);
  end if;
  if p_analysis_id is not null and not exists(select 1 from public.nlp_analyses where id=p_analysis_id and user_id=v_user) then
    raise exception 'Analysis not found';
  end if;
  v_first := not exists(select 1 from public.sessions where user_id=v_user and activity_key=p_activity and done_on=v_today);
  if v_first then v_xp := case p_activity when 'write' then 30 when 'speak' then 25 when 'review' then 0 else 20 end; end if;
  if p_analysis_id is not null and p_activity='speak' then
    select coalesce((result->'vocabulary'->>'word_count')::int,0) into v_words from public.nlp_analyses where id=p_analysis_id;
  end if;
  v_saved := public.save_learning_chunks(p_chunks);
  insert into public.practice_sessions(id,user_id,activity_key,analysis_id,payload,xp_awarded)
  values(p_attempt_id,v_user,p_activity,p_analysis_id,p_payload,v_xp);
  insert into public.sessions(user_id,activity_key,done_on,payload) values(v_user,p_activity,v_today,p_payload)
  on conflict(user_id,activity_key,done_on) do nothing;
  v_streak := case when v_profile.last_active=v_today then v_profile.streak when v_profile.last_active=v_today-1 then v_profile.streak+1 else 1 end;
  update public.profiles set xp=coalesce(xp,0)+v_xp, streak=v_streak,
    longest_streak=greatest(coalesce(longest_streak,0),v_streak),last_active=v_today where id=v_user;
  insert into public.daily_stats(user_id,day,xp,activities,words_spoken) values(v_user,v_today,v_xp,case when v_first then 1 else 0 end,v_words)
  on conflict(user_id,day) do update set xp=public.daily_stats.xp+excluded.xp,activities=public.daily_stats.activities+excluded.activities,words_spoken=public.daily_stats.words_spoken+excluded.words_spoken;
  if p_activity='write' and p_payload ? 'draft_v1' then
    if p_payload->>'writing_id' is not null then
      update public.writings set draft_v2=left(p_payload->>'draft_v2',12000),word_count=coalesce((p_payload->>'word_count')::int,0)
      where id=(p_payload->>'writing_id')::uuid and user_id=v_user;
      if not found then raise exception 'Original writing not found'; end if;
    else
      insert into public.writings(user_id,prompt,draft_v1,draft_v2,word_count)
      values(v_user,left(p_payload->>'prompt',2000),left(p_payload->>'draft_v1',12000),left(p_payload->>'draft_v2',12000),coalesce((p_payload->>'word_count')::int,0));
    end if;
  end if;
  return jsonb_build_object('id',p_attempt_id,'xp_awarded',v_xp,'already_saved',false,'chunks_saved',v_saved);
end; $$;

create or replace function public.review_learning_chunk(p_attempt_id uuid,p_chunk_id uuid,p_quality int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_today date:=(now() at time zone 'UTC')::date; v_card public.chunks%rowtype; v_reps int; v_interval int; v_ef numeric; v_streak int; v_first boolean; v_profile public.profiles%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_quality not in (0,2,4,5) then raise exception 'Invalid grade'; end if;
  select * into v_profile from public.profiles where id=v_user for update;
  if not found then raise exception 'Profile not found'; end if;
  if exists(select 1 from public.flashcard_reviews where user_id=v_user and (id=p_attempt_id or (chunk_id=p_chunk_id and reviewed_on=v_today))) then
    return jsonb_build_object('already_saved',true,'xp_awarded',0);
  end if;
  select * into v_card from public.chunks where id=p_chunk_id and user_id=v_user for update;
  if not found or v_card.due_date>v_today then raise exception 'Card is not due'; end if;
  v_reps:=case when p_quality<3 then 0 else v_card.reps+1 end;
  v_interval:=case when p_quality<3 or v_card.reps=0 then 1 when v_card.reps=1 then 6 else round(v_card.interval*v_card.ef)::int end;
  v_ef:=greatest(1.3,v_card.ef+(0.1-(5-p_quality)*(0.08+(5-p_quality)*0.02)));
  update public.chunks set reps=v_reps,interval=v_interval,ef=round(v_ef,2),due_date=v_today+v_interval where id=p_chunk_id;
  insert into public.flashcard_reviews(id,user_id,chunk_id,grade) values(p_attempt_id,v_user,p_chunk_id,p_quality);
  v_streak:=case when v_profile.last_active=v_today then v_profile.streak when v_profile.last_active=v_today-1 then v_profile.streak+1 else 1 end;
  update public.profiles set xp=coalesce(xp,0)+10,last_active=v_today,streak=v_streak,longest_streak=greatest(coalesce(longest_streak,0),v_streak) where id=v_user;
  v_first:=not exists(select 1 from public.sessions where user_id=v_user and activity_key='review' and done_on=v_today);
  insert into public.sessions(user_id,activity_key,done_on,payload) values(v_user,'review',v_today,'{}') on conflict(user_id,activity_key,done_on) do nothing;
  insert into public.daily_stats(user_id,day,xp,activities) values(v_user,v_today,10,case when v_first then 1 else 0 end)
  on conflict(user_id,day) do update set xp=public.daily_stats.xp+10,activities=public.daily_stats.activities+excluded.activities;
  return jsonb_build_object('already_saved',false,'xp_awarded',10,'due_date',v_today+v_interval);
end; $$;

-- Fixed signatures, schema-qualified relations and auth.uid protect SECURITY DEFINER routines.
revoke all on function public.consume_api_quota(text) from public, anon;
revoke all on function public.save_learning_chunks(jsonb) from public, anon;
revoke all on function public.complete_practice(uuid,text,uuid,jsonb,jsonb) from public, anon;
revoke all on function public.review_learning_chunk(uuid,uuid,int) from public, anon;
grant execute on function public.consume_api_quota(text) to authenticated;
grant execute on function public.save_learning_chunks(jsonb) to authenticated;
grant execute on function public.complete_practice(uuid,text,uuid,jsonb,jsonb) to authenticated;
grant execute on function public.review_learning_chunk(uuid,uuid,int) to authenticated;

-- Prevent browser clients editing rewards; profile name remains user-editable.
revoke update on public.profiles from authenticated, anon;
grant update(display_name) on public.profiles to authenticated;

create or replace function public.delete_own_analyses()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.nlp_analyses where user_id=auth.uid();
  delete from public.ai_analyses where user_id=auth.uid();
end; $$;
revoke all on function public.delete_own_analyses() from public, anon;
grant execute on function public.delete_own_analyses() to authenticated;

create or replace function public.record_quiz_attempt(p_attempt_id uuid,p_mode text,p_score int,p_total int)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_today date:=(now() at time zone 'UTC')::date; v_pct int; v_xp int; v_profile public.profiles%rowtype; v_streak int;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_mode not in ('grammar','chunks','mixed') or p_total not between 1 and 20 or p_score not between 0 and p_total then raise exception 'Invalid quiz'; end if;
  select * into v_profile from public.profiles where id=v_user for update;
  if exists(select 1 from public.test_results where attempt_id=p_attempt_id and user_id=v_user) then return jsonb_build_object('already_saved',true,'xp_awarded',0); end if;
  v_pct:=round(100.0*p_score/p_total);
  v_xp:=case when exists(select 1 from public.test_results where user_id=v_user and taken_on=v_today) then 0 else round(v_pct*0.5) end;
  insert into public.test_results(user_id,mode,score,total,pct,taken_on,attempt_id) values(v_user,p_mode,p_score,p_total,v_pct,v_today,p_attempt_id);
  v_streak:=case when v_profile.last_active=v_today then v_profile.streak when v_profile.last_active=v_today-1 then v_profile.streak+1 else 1 end;
  update public.profiles set xp=coalesce(xp,0)+v_xp,streak=v_streak,longest_streak=greatest(coalesce(longest_streak,0),v_streak),last_active=v_today where id=v_user;
  insert into public.daily_stats(user_id,day,xp,test_pct) values(v_user,v_today,v_xp,v_pct)
  on conflict(user_id,day) do update set xp=public.daily_stats.xp+excluded.xp,test_pct=excluded.test_pct;
  return jsonb_build_object('already_saved',false,'xp_awarded',v_xp);
end; $$;
revoke all on function public.record_quiz_attempt(uuid,text,int,int) from public, anon;
grant execute on function public.record_quiz_attempt(uuid,text,int,int) to authenticated;

-- Recover derived UTC streaks from observed legacy activity without inventing sessions/rewards.
with days as (
  select user_id,done_on as day from public.sessions where done_on <= (now() at time zone 'UTC')::date
  union select user_id,taken_on from public.test_results where taken_on <= (now() at time zone 'UTC')::date
), numbered as (
  select user_id,day,day-(row_number() over(partition by user_id order by day))::int as island from days
), runs as (
  select user_id,max(day) as last_day,count(*)::int as length from numbered group by user_id,island
), summary as (
  select user_id,max(last_day) as last_day,max(length) as longest from runs group by user_id
)
update public.profiles p set
  last_active=greatest(p.last_active,s.last_day),
  streak=case when s.last_day >= (now() at time zone 'UTC')::date-1 then
    (select r.length from runs r where r.user_id=p.id and r.last_day=s.last_day limit 1) else 0 end,
  longest_streak=greatest(coalesce(p.longest_streak,0),s.longest)
from summary s where p.id=s.user_id;
commit;
