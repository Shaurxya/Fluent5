import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

// Executes actual PostgreSQL SQL/functions/RLS in WASM; no hosted Supabase connection.
const db = new PGlite();
let user = "";
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated;
    create schema auth; grant usage on schema auth,public to authenticated;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant execute on function auth.uid() to authenticated;
    alter default privileges in schema public grant all on tables to authenticated;`);
  for (const name of ["001_initial_schema.sql","002_ai_feedback.sql","003_nlp_learning.sql"]) await db.exec(await readFile(`supabase/migrations/${name}`,"utf8"));
  await db.exec(await readFile("supabase/seed.sql","utf8"));
});
beforeEach(async () => {
  await db.exec("reset role");
  user = randomUUID();
  await db.query("insert into auth.users(id,email) values($1,'learner@example.test')",[user]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
  await db.exec("set role authenticated");
});
afterAll(async () => {await db.close();});

describe.sequential("additive learning migration and authenticated transactions",() => {
  it("preserves legacy learning data and reconstructs only evidence-backed streaks",async () => {
    const legacy=new PGlite();const learner=randomUUID();
    try {
      await legacy.exec(`create role anon;create role authenticated;create schema auth;grant usage on schema auth,public to authenticated;
        create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
        alter default privileges in schema public grant all on tables to authenticated;`);
      for(const name of ["001_initial_schema.sql","002_ai_feedback.sql"])await legacy.exec(await readFile(`supabase/migrations/${name}`,"utf8"));
      await legacy.exec(await readFile("supabase/seed.sql","utf8"));
      await legacy.query("insert into auth.users(id,email) values($1,'legacy@example.test')",[learner]);
      await legacy.query("update public.profiles set xp=123 where id=$1",[learner]);
      await legacy.query("insert into public.chunks(user_id,text) values($1,' In fact '),($1,'in fact')",[learner]);
      await legacy.query("insert into public.sessions(user_id,activity_key,done_on) values($1,'read',(now() at time zone 'UTC')::date-2),($1,'speak',(now() at time zone 'UTC')::date-1),($1,'read',(now() at time zone 'UTC')::date)",[learner]);
      await legacy.exec(await readFile("supabase/migrations/003_nlp_learning.sql","utf8"));
      expect((await legacy.query<{xp:number;streak:number;longest_streak:number}>("select xp,streak,longest_streak from public.profiles where id=$1",[learner])).rows[0]).toEqual({xp:123,streak:3,longest_streak:3});
      expect((await legacy.query("select * from public.chunks where user_id=$1",[learner])).rows).toHaveLength(2);
      expect((await legacy.query("select * from public.sessions where user_id=$1",[learner])).rows).toHaveLength(3);
      expect((await legacy.query("select * from public.practice_sessions")).rows).toHaveLength(0);
    } finally {await legacy.close();}
  });
  it("records practice, chunks, daily completion and XP atomically and idempotently",async () => {
    const attempt=randomUUID();
    const args=[attempt,"speak",null,JSON.stringify({prompt:"A memory"}),JSON.stringify([{text:"in fact",note:"In context"}])];
    const first=await db.query<{result:{xp_awarded:number;chunks_saved:number}}>("select public.complete_practice($1,$2,$3,$4::jsonb,$5::jsonb) result",args);
    expect(first.rows[0].result).toMatchObject({xp_awarded:25,chunks_saved:1});
    const again=await db.query<{result:{already_saved:boolean}}>("select public.complete_practice($1,$2,$3,$4::jsonb,$5::jsonb) result",args);
    expect(again.rows[0].result.already_saved).toBe(true);
    expect((await db.query("select * from public.practice_sessions where user_id=auth.uid()" )).rows).toHaveLength(1);
    expect((await db.query<{xp:number;streak:number}>("select xp,streak from public.profiles where id=auth.uid()")).rows[0]).toEqual({xp:25,streak:1});
    expect((await db.query<{xp:number;activities:number;chunks_added:number}>("select xp,activities,chunks_added from public.daily_stats where user_id=auth.uid()")).rows[0]).toEqual({xp:25,activities:1,chunks_added:1});
  });
  it("preserves multiple attempts without awarding duplicate daily activity XP",async () => {
    await db.query("select public.complete_practice($1,'write')",[randomUUID()]);
    const next=await db.query<{result:{xp_awarded:number}}>("select public.complete_practice($1,'write') result",[randomUUID()]);
    expect(next.rows[0].result.xp_awarded).toBe(0);
    expect((await db.query("select id from public.practice_sessions where user_id=auth.uid()")).rows).toHaveLength(2);
  });
  it("rolls back session/reward when a chunk is invalid",async () => {
    await expect(db.query("select public.complete_practice($1,'speak',null,'{}',$2::jsonb)",[randomUUID(),JSON.stringify([{text:""}])])).rejects.toThrow();
    expect((await db.query<{xp:number}>("select xp from public.profiles where id=auth.uid()")).rows[0].xp).toBe(0);
    expect((await db.query("select id from public.practice_sessions where user_id=auth.uid()")).rows).toHaveLength(0);
  });
  it("deduplicates phrases while preserving existing legacy rows",async () => {
    await db.query("insert into public.chunks(user_id,text) values(auth.uid(),' In Fact ')");
    await db.query("select public.save_learning_chunks($1::jsonb)",[JSON.stringify([{text:"in fact"},{text:"As a result"},{text:"as a result"}])]);
    expect((await db.query("select text from public.chunks where user_id=auth.uid()")).rows).toHaveLength(2);
  });
  it("reschedules a due card with SM-2 and awards review XP once",async () => {
    await db.query("select public.save_learning_chunks($1::jsonb)",[JSON.stringify([{text:"as a result"}])]);
    const card=(await db.query<{id:string}>("select id from public.chunks where user_id=auth.uid()")).rows[0].id;
    const id=randomUUID();
    await db.query("select public.review_learning_chunk($1,$2,4)",[id,card]);
    await db.query("select public.review_learning_chunk($1,$2,4)",[id,card]);
    const saved=(await db.query<{reps:number;interval:number}>("select reps,interval from public.chunks where id=$1",[card])).rows[0];
    expect(saved).toEqual({reps:1,interval:1});
    expect((await db.query<{xp:number}>("select xp from public.profiles where id=auth.uid()")).rows[0].xp).toBe(10);
    expect((await db.query("select * from public.flashcard_reviews where user_id=auth.uid()")).rows).toHaveLength(1);
  });
  it("rejects direct browser edits to XP but permits display-name changes",async () => {
    await expect(db.query("update public.profiles set xp=9999 where id=auth.uid()")).rejects.toThrow();
    await db.query("update public.profiles set display_name='Learner' where id=auth.uid()");
    expect((await db.query<{display_name:string}>("select display_name from public.profiles where id=auth.uid()")).rows[0].display_name).toBe("Learner");
  });
  it("enforces ownership of analysis references",async () => {
    const other=randomUUID(); const analysis=randomUUID();
    await db.exec("reset role");
    await db.query("insert into auth.users(id,email) values($1,'other@example.test')",[other]);
    await db.query("insert into public.nlp_analyses(id,user_id,request_key,mode,result,engine_version,scoring_version) values($1,$2,'key','speak','{}','v1','v1')",[analysis,other]);
    await db.exec("set role authenticated");
    expect((await db.query("select id from public.nlp_analyses where id=$1",[analysis])).rows).toHaveLength(0);
    await expect(db.query("select public.complete_practice($1,'speak',$2)",[randomUUID(),analysis])).rejects.toThrow();
  });
  it("persists original and rewritten drafts in the completion transaction",async () => {
    const draft=randomUUID();
    await db.query("insert into public.writings(id,user_id,draft_v1) values($1,auth.uid(),'My original paragraph.')",[draft]);
    await db.query("select public.complete_practice($1,'write',null,$2::jsonb)",[randomUUID(),JSON.stringify({writing_id:draft,draft_v1:"My original paragraph.",draft_v2:"My improved paragraph.",word_count:3})]);
    expect((await db.query<{draft_v1:string;draft_v2:string}>("select draft_v1,draft_v2 from public.writings where id=$1",[draft])).rows[0]).toEqual({draft_v1:"My original paragraph.",draft_v2:"My improved paragraph."});
  });
  it("limits quotas atomically and rejects unknown resources",async () => {
    for(let i=0;i<20;i++) expect((await db.query<{allowed:boolean}>("select public.consume_api_quota('ai') allowed")).rows[0].allowed).toBe(true);
    expect((await db.query<{allowed:boolean}>("select public.consume_api_quota('ai') allowed")).rows[0].allowed).toBe(false);
    await expect(db.query("select public.consume_api_quota('unlimited')")).rejects.toThrow();
  });
  it("persists quizzes and caps same-day quiz rewards",async () => {
    const attempt=randomUUID();
    const first=await db.query<{result:{xp_awarded:number}}>("select public.record_quiz_attempt($1,'grammar',8,10) result",[attempt]);
    expect(first.rows[0].result.xp_awarded).toBe(40);
    await db.query("select public.record_quiz_attempt($1,'grammar',8,10)",[attempt]);
    const second=await db.query<{result:{xp_awarded:number}}>("select public.record_quiz_attempt($1,'mixed',10,10) result",[randomUUID()]);
    expect(second.rows[0].result.xp_awarded).toBe(0);
    expect((await db.query("select id from public.test_results where user_id=auth.uid()")).rows).toHaveLength(2);
    expect((await db.query<{xp:number}>("select xp from public.profiles where id=auth.uid()")).rows[0].xp).toBe(40);
  });
  it("protects private history from anonymous reads even when table SELECT is granted",async () => {
    await db.query("select public.complete_practice($1,'speak')",[randomUUID()]);
    await db.exec("reset role;grant usage on schema public,auth to anon;grant select on public.practice_sessions,public.nlp_analyses,public.flashcard_reviews to anon");
    await db.query("select set_config('request.jwt.claim.sub','',false)");await db.exec("set role anon");
    expect((await db.query("select * from public.practice_sessions")).rows).toHaveLength(0);
    expect((await db.query("select * from public.nlp_analyses")).rows).toHaveLength(0);
    await expect(db.query("select public.complete_practice($1,'speak')",[randomUUID()])).rejects.toThrow();
  });
  it("deletes only the current user's analyses, preserving completions",async () => {
    const id=randomUUID();
    await db.query("insert into public.nlp_analyses(id,user_id,request_key,mode,result,engine_version,scoring_version) values($1,auth.uid(),'delete-key','speak','{}','v1','v1')",[id]);
    await db.query("select public.complete_practice($1,'speak',$2)",[randomUUID(),id]);
    await db.query("select public.delete_own_analyses()");
    expect((await db.query("select id from public.nlp_analyses where user_id=auth.uid()")).rows).toHaveLength(0);
    expect((await db.query<{analysis_id:string|null}>("select analysis_id from public.practice_sessions where user_id=auth.uid()")).rows[0].analysis_id).toBe(null);
  });
});
