-- Repair installations that do not automatically grant Data API access to new tables.
-- Safe to run after 003. Does not disable RLS or replace existing profile/reward data.
begin;

do $$
declare missing text;
begin
  select string_agg(t, ', ' order by t) into missing
  from unnest(array['profiles','sessions','practice_sessions','daily_stats','chunks',
    'flashcard_reviews','test_results','nlp_analyses','writings','api_usage','ai_analyses',
    'activities','sentences','passages','quiz_questions']) as tables(t)
  where to_regclass('public.' || t) is null;
  if missing is not null then
    raise exception 'Missing FluentFive tables: %. Complete migrations 001, 002 and 003 before running 004.', missing;
  end if;
end; $$;

grant usage on schema public to authenticated;
-- Table grants and RLS policies are separate checks. Restore only app operations.
revoke all on public.profiles, public.sessions, public.daily_stats, public.test_results,
  public.chunks, public.writings, public.nlp_analyses, public.practice_sessions,
  public.flashcard_reviews, public.api_usage, public.ai_analyses,
  public.activities, public.sentences, public.passages, public.quiz_questions from authenticated, anon;
grant select on public.profiles to authenticated;
grant insert(id,display_name) on public.profiles to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant select on public.sessions, public.daily_stats, public.test_results to authenticated;
grant select, insert, update on public.chunks, public.writings to authenticated;
grant select, insert, delete on public.nlp_analyses to authenticated;
grant select on public.practice_sessions, public.flashcard_reviews to authenticated;
grant select, insert on public.ai_analyses to authenticated;
grant select on public.activities, public.sentences, public.passages, public.quiz_questions to authenticated, anon;
-- api_usage remains accessible only through the existing bounded SECURITY DEFINER function.

-- Existing authenticated accounts can predate the profile-creation trigger.
insert into public.profiles(id,display_name)
select u.id, left(coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'),''),'Learner'),80)
from auth.users u
where not exists(select 1 from public.profiles p where p.id=u.id)
on conflict(id) do nothing;

notify pgrst, 'reload schema';
commit;
