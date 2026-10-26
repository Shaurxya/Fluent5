import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {PGlite} from "@electric-sql/pglite";
import {readFile} from "node:fs/promises";
import {randomUUID} from "node:crypto";

const db=new PGlite();
const legacy=randomUUID(),owner=randomUUID(),other=randomUUID();
let repair:string;
beforeAll(async()=>{
  // Deliberately no automatic table grants: reproduce stricter Supabase project settings.
  await db.exec(`create role anon;create role authenticated;create schema auth;
    grant usage on schema public,auth to authenticated;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
  await db.query("insert into auth.users(id,email) values($1,'legacy@example.test')",[legacy]);
  for(const file of ["001_initial_schema.sql","002_ai_feedback.sql","003_nlp_learning.sql"])await db.exec(await readFile(`supabase/migrations/${file}`,"utf8"));
  await db.exec(await readFile("supabase/seed.sql","utf8"));
  await db.query("insert into auth.users(id,email) values($1,'owner@example.test'),($2,'other@example.test')",[owner,other]);
  await db.query("update public.profiles set xp=120,display_name='Existing name' where id=$1",[owner]);
  await db.query("insert into public.practice_sessions(id,user_id,activity_key) values($1,$2,'speak'),($3,$4,'read')",[randomUUID(),owner,randomUUID(),other]);
  repair=await readFile("supabase/migrations/004_learning_storage_access.sql","utf8");
});
afterAll(async()=>{await db.close();});

describe.sequential("explicit storage grants without automatic Supabase defaults",()=>{
  it("reproduces denied access before applying the repair",async()=>{
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec("set role authenticated");
    await expect(db.query("select * from public.practice_sessions")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });
  it("can be rerun safely and backfills only missing real-account profiles",async()=>{
    await db.exec(repair);await db.exec(repair);
    expect((await db.query<{xp:number;display_name:string}>("select xp,display_name from public.profiles where id=$1",[owner])).rows[0]).toEqual({xp:120,display_name:"Existing name"});
    expect((await db.query<{xp:number}>("select xp from public.profiles where id=$1",[legacy])).rows[0].xp).toBe(0);
    expect((await db.query("select id from public.profiles")).rows).toHaveLength(3);
    expect((await db.query("select id from public.practice_sessions")).rows).toHaveLength(2);
  });
  it("restores authenticated reads while retaining cross-user RLS",async()=>{
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec("set role authenticated");
    expect((await db.query<{user_id:string}>("select user_id from public.practice_sessions")).rows).toEqual([{user_id:owner}]);
    expect((await db.query("select id from public.profiles")).rows).toEqual([{id:owner}]);
    for(const table of ["sessions","daily_stats","chunks","flashcard_reviews","test_results","nlp_analyses"])await expect(db.query(`select * from public.${table}`)).resolves.toBeDefined();
  });
  it("does not grant quota tampering, table truncation, profile deletion or reward editing",async()=>{
    await expect(db.query("select * from public.api_usage")).rejects.toThrow(/permission denied/);
    await expect(db.query("truncate public.practice_sessions")).rejects.toThrow(/permission denied/);
    await expect(db.query("delete from public.profiles where id=auth.uid()")).rejects.toThrow(/permission denied/);
    await expect(db.query("update public.profiles set xp=9999 where id=auth.uid()")).rejects.toThrow(/permission denied/);
    await expect(db.query("insert into public.profiles(id,display_name,xp) values(auth.uid(),'Cheating',9999)")).rejects.toThrow(/permission denied/);
    await db.query("update public.profiles set display_name='Updated name' where id=auth.uid()");
  });
  it("allows recovery of only an authenticated user's missing profile",async()=>{
    await db.exec("reset role");await db.query("delete from public.profiles where id=$1",[owner]);await db.exec("set role authenticated");
    await db.query("insert into public.profiles(id,display_name) values(auth.uid(),'Recovered')");
    await expect(db.query("insert into public.profiles(id,display_name) values($1,'Foreign')",[randomUUID()])).rejects.toThrow();
    expect((await db.query<{xp:number}>("select xp from public.profiles where id=auth.uid()")).rows[0].xp).toBe(0);
  });
  it("allows only public learning content to signed-out clients",async()=>{
    await db.exec("reset role;set role anon");
    expect((await db.query("select key from public.activities")).rows.length).toBeGreaterThan(0);
    await expect(db.query("select * from public.practice_sessions")).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from public.nlp_analyses")).rejects.toThrow(/permission denied/);
  });
});
