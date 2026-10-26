import {afterAll,beforeAll,expect,it,vi} from "vitest";
import {spawn,type ChildProcess} from "node:child_process";
import {readFile} from "node:fs/promises";
import {randomBytes,randomInt,randomUUID} from "node:crypto";
import {resolve} from "node:path";
import {PGlite} from "@electric-sql/pglite";

const auth=vi.hoisted(() => ({client:vi.fn()}));
vi.mock("@/lib/supabase/server",() => ({createClient:auth.client}));
import {POST as analyzeRoute} from "@/app/api/nlp/analyze/route";
import {POST as completeRoute} from "@/app/api/learning/complete/route";
import {POST as reviewRoute} from "@/app/api/learning/review/route";
import {analysisEnvelopeSchema} from "@/lib/nlp/contracts";

const db=new PGlite();
const user=randomUUID();const key=randomBytes(24).toString("hex");
const port=randomInt(41000,49000);const url=`http://127.0.0.1:${port}`;
let service:ChildProcess;

beforeAll(async () => {
  await db.exec(`create role anon;create role authenticated;create schema auth;grant usage on schema auth,public to authenticated;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    alter default privileges in schema public grant all on tables to authenticated;`);
  for(const name of ["001_initial_schema.sql","002_ai_feedback.sql","003_nlp_learning.sql","004_learning_storage_access.sql"]) await db.exec(await readFile(`supabase/migrations/${name}`,"utf8"));
  await db.exec(await readFile("supabase/seed.sql","utf8"));await db.query("insert into auth.users(id,email) values($1,'local-integration@example.test')",[user]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec("set role authenticated");
  auth.client.mockResolvedValue({auth:{getUser:async () => ({data:{user:{id:user}},error:null})},from:(table:string) => {
    if(table!=="nlp_analyses") throw new Error("Unsupported test query");
    const filters:Record<string,string>={};let row:Record<string,unknown>|null=null;
    return {select(){return this;},eq(k:string,v:string){filters[k]=v;return this;},insert(value:Record<string,unknown>){row=value;return this;},
      async maybeSingle(){const data=await db.query("select id,result from public.nlp_analyses where user_id=$1 and request_key=$2",[filters.user_id,filters.request_key]);return {data:data.rows[0]||null,error:null};},
      async single(){if(!row) return {data:null,error:{code:"test"}};const data=await db.query("insert into public.nlp_analyses(user_id,request_key,mode,result,engine_version,scoring_version) values($1,$2,$3,$4::jsonb,$5,$6) returning id",[row.user_id,row.request_key,row.mode,JSON.stringify(row.result),row.engine_version,row.scoring_version]);return {data:data.rows[0],error:null};}};
  },rpc:async(name:string,args:Record<string,unknown>) => {
    try {
      const result=name==="consume_api_quota" ? await db.query<{result:unknown}>("select public.consume_api_quota($1) result",[args.p_resource])
        : name==="complete_practice" ? await db.query<{result:unknown}>("select public.complete_practice($1,$2,$3,$4::jsonb,$5::jsonb) result",[args.p_attempt_id,args.p_activity,args.p_analysis_id,JSON.stringify(args.p_payload),JSON.stringify(args.p_chunks)])
        : await db.query<{result:unknown}>("select public.review_learning_chunk($1,$2,$3) result",[args.p_attempt_id,args.p_chunk_id,args.p_quality]);
      return {data:result.rows[0].result,error:null};
    }catch{return {data:null,error:{code:"database"}};}
  }});
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","http://localhost:54321");vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY","local-test-public");vi.stubEnv("NLP_SERVICE_URL",url);vi.stubEnv("NLP_SERVICE_API_KEY",key);vi.stubEnv("NEXT_PUBLIC_APP_URL","http://localhost");
  service=spawn(resolve("nlp-service/.venv/bin/python"),["-m","uvicorn","app.main:app","--host","127.0.0.1","--port",String(port),"--no-access-log"],{cwd:resolve("nlp-service"),stdio:"ignore",env:{...process.env,NLP_SERVICE_API_KEY:key,NLP_ENABLE_EMBEDDINGS:"true",LANGUAGETOOL_URL:"",OMP_NUM_THREADS:"1"}});
  let ready=false;
  for(let n=0;n<150;n++){
    if(service.exitCode!==null) throw new Error("Local NLP service failed to start");
    try {if((await fetch(`${url}/health`)).ok){ready=true;break;}}catch{ /* Starting local service. */ }
    await new Promise(r => setTimeout(r,100));
  }
  if(!ready) throw new Error("Local NLP health check timed out");
});
afterAll(async () => {service?.kill("SIGTERM");await db.close();vi.unstubAllEnvs();});

const request=(path:string,input:unknown) => new Request(`http://localhost${path}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});

it("actual private FastAPI HTTP analysis → Next gateway → PostgreSQL session → flashcard → SM-2 → real stats",async () => {
  expect((await fetch(`${url}/nlp/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"Hello there"})})).status).toBe(401);
  const attempt=randomUUID();
  const response=await analyzeRoute(request("/api/nlp/analyze",{attempt_id:attempt,mode:"cycle",text:"I goes to college yesterday and meet my friends. We enjoy learning together and sharing stories about our day.",prompt:"Describe a recent experience with your friends.",targets:["sharing stories"],duration_seconds:90}));
  expect(response.status).toBe(200);
  const envelope=analysisEnvelopeSchema.parse(await response.json());
  expect(envelope.analysis.preprocessing.trained_pipeline).toBe(true);
  expect(envelope.analysis.grammar.corrected_text).toContain("I went to college yesterday and met my friends.");
  expect(envelope.analysis.semantics.status).toBe("available");
  const saved=await completeRoute(request("/api/learning/complete",{attempt_id:attempt,activity:"speak",analysis_id:envelope.analysis_id,payload:{workflow:"cycle"},chunks:[{text:"sharing stories",note:"Practice with friends"}]}));
  expect(saved.status).toBe(200);expect(await saved.json()).toMatchObject({xp_awarded:25,chunks_saved:1});
  const card=(await db.query<{id:string}>("select id from public.chunks where user_id=auth.uid()")).rows[0].id;
  const review=await reviewRoute(request("/api/learning/review",{attempt_id:randomUUID(),chunk_id:card,quality:4}));expect(review.status).toBe(200);
  expect((await db.query<{xp:number;streak:number}>("select xp,streak from public.profiles where id=auth.uid()")).rows[0]).toEqual({xp:35,streak:1});
  expect((await db.query<{xp:number;activities:number;chunks_added:number}>("select xp,activities,chunks_added from public.daily_stats where user_id=auth.uid()")).rows[0]).toEqual({xp:35,activities:2,chunks_added:1});
  expect((await db.query<{reps:number;interval:number}>("select reps,interval from public.chunks where id=$1",[card])).rows[0]).toEqual({reps:1,interval:1});
});
