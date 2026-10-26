import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {PGlite} from "@electric-sql/pglite";
import {readFile} from "node:fs/promises";
import {createHash,randomUUID} from "node:crypto";

const db=new PGlite();const learner=randomUUID();
let setup:string;
beforeAll(async()=>{
  await db.exec(`create role anon;create role authenticated;create schema auth;
    grant usage on schema public,auth to authenticated;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
  await db.exec(await readFile("supabase/migrations/001_initial_schema.sql","utf8"));
  await db.exec(await readFile("supabase/seed.sql","utf8"));
  await db.query("insert into auth.users(id,email) values($1,'existing@example.test')",[learner]);
  await db.query("update public.profiles set xp=123,display_name='Existing learner' where id=$1",[learner]);
  await db.query("insert into public.chunks(user_id,text,note) values($1,'in fact','Keep this original note')",[learner]);
  await db.query("insert into public.sessions(user_id,activity_key,done_on) values($1,'read',(now() at time zone 'UTC')::date)",[learner]);
  setup=await readFile("supabase/repairs/install_missing_nlp.sql","utf8");
});
afterAll(async()=>{await db.close();});

describe.sequential("complete installer for the reported missing NLP tables",()=>{
  it("contains the exact canonical migrations and matching source hashes",async()=>{
    for(const name of ["002_ai_feedback.sql","003_nlp_learning.sql","004_learning_storage_access.sql"]){
      const source=await readFile(`supabase/migrations/${name}`,"utf8");
      const canonical=source.split(/\r?\n/).filter(line=>!["begin;","commit;"].includes(line.trim().toLowerCase())).map(line=>line.trimEnd()).join("\n").trim();
      expect(setup).toContain(`-- Source: ${name}; sha256: ${createHash("sha256").update(source).digest("hex")}`);
      expect(setup).toContain(canonical);
    }
    expect(setup.split("\n").filter(line=>line.trim().toLowerCase()==="begin;")).toHaveLength(1);
    expect(setup.split("\n").filter(line=>line.trim().toLowerCase()==="commit;")).toHaveLength(1);
  });
  it("installs every missing table and function without resetting legacy content",async()=>{
    for(const name of ["ai_analyses","api_usage","flashcard_reviews","nlp_analyses","practice_sessions"])
      expect((await db.query<{table_exists:boolean}>("select to_regclass($1) is not null table_exists",[`public.${name}`])).rows[0].table_exists).toBe(false);
    await db.exec(setup);
    for(const name of ["ai_analyses","api_usage","flashcard_reviews","nlp_analyses","practice_sessions"])
      expect((await db.query<{table_exists:boolean}>("select to_regclass($1) is not null table_exists",[`public.${name}`])).rows[0].table_exists).toBe(true);
    expect((await db.query<{xp:number;display_name:string}>("select xp,display_name from public.profiles where id=$1",[learner])).rows[0]).toEqual({xp:123,display_name:"Existing learner"});
    expect((await db.query<{note:string}>("select note from public.chunks where user_id=$1",[learner])).rows[0].note).toBe("Keep this original note");
    expect((await db.query("select id from public.sessions where user_id=$1",[learner])).rows).toHaveLength(1);
    expect((await db.query("select id from public.practice_sessions")).rows).toHaveLength(0);
  });
  it("supports authenticated saves and quotas immediately after installation",async()=>{
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[learner]);await db.exec("set role authenticated");
    expect((await db.query<{allowed:boolean}>("select public.consume_api_quota('nlp') allowed")).rows[0].allowed).toBe(true);
    const result=await db.query<{saved:{xp_awarded:number;chunks_saved:number}}>("select public.complete_practice($1,'speak',null,'{}',$2::jsonb) saved",[randomUUID(),JSON.stringify([{text:"as a result"}])]);
    expect(result.rows[0].saved).toMatchObject({xp_awarded:25,chunks_saved:1});
    expect((await db.query<{xp:number}>("select xp from public.profiles where id=auth.uid()")).rows[0].xp).toBe(148);
    await expect(db.query("update public.profiles set xp=9999 where id=auth.uid()")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });
  it("refuses accidental reinstallation without changing existing records",async()=>{
    await expect(db.exec(setup)).rejects.toThrow(/NLP tables already exist/);
    await db.exec("rollback");
    expect((await db.query<{xp:number}>("select xp from public.profiles where id=$1",[learner])).rows[0].xp).toBe(148);
    expect((await db.query("select id from public.practice_sessions")).rows).toHaveLength(1);
  });
});
