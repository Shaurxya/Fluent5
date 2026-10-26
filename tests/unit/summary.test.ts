import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks=vi.hoisted(() => ({client:vi.fn(),from:vi.fn(),insert:vi.fn()}));
vi.mock("@/lib/supabase/server",() => ({createClient:mocks.client}));
import {GET} from "@/app/api/learning/summary/route";

type Result = {data:unknown;error:{code:string;message?:string}|null;count?:number};
const userId="11111111-1111-4111-8111-111111111111";
const profile={display_name:"Learner",xp:0,streak:0,longest_streak:0,last_active:null};
let results:Record<string,Result>;
let insertResult:Result;

function query(initial:Result) {
  let result=initial;
  return {
    select(){return this;},eq(){return this;},gte(){return this;},lte(){return this;},order(){return this;},limit(){return this;},in(){return this;},
    insert(row:unknown){mocks.insert(row);result=insertResult;return this;},
    maybeSingle:async() => result,
    single:async() => result,
    then(resolve:(value:Result)=>unknown,reject:(reason:unknown)=>unknown){return Promise.resolve(result).then(resolve,reject);},
  };
}

beforeEach(() => {
  vi.restoreAllMocks();vi.spyOn(console,"error").mockImplementation(() => {});
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","http://localhost:54321");vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY","test-public");
  mocks.insert.mockReset();mocks.from.mockReset();
  results={};for(const table of ["profiles","sessions","practice_sessions","daily_stats","chunks","flashcard_reviews","test_results","nlp_analyses"])
    results[table]={data:table==="profiles"?profile:[],error:null,count:0};
  insertResult={data:profile,error:null};
  mocks.from.mockImplementation((table:string)=>query(results[table]));
  mocks.client.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:userId,email:"learner@example.test",user_metadata:{}}},error:null})},from:mocks.from});
});
const request=()=>new Request("http://localhost/api/learning/summary");

describe("learning summary recovery and precise storage failures",() => {
  it("shows the genuine empty state without inventing history or inserting existing profiles",async()=>{
    const response=await GET(request());expect(response.status).toBe(200);
    const data=await response.json();expect(data.history).toEqual([]);expect(data.today_activities).toEqual([]);expect(data.profile.xp).toBe(0);expect(data.weekly_active_days).toBe(0);expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("creates only the authenticated user's missing profile with default rewards",async()=>{
    results.profiles={data:null,error:null};
    const response=await GET(request());expect(response.status).toBe(200);
    expect(mocks.insert).toHaveBeenCalledExactlyOnceWith({id:userId,display_name:"Learner"});
    expect((await response.json()).profile.xp).toBe(0);
  });
  it("handles concurrent profile creation by re-reading without overwriting XP",async()=>{
    insertResult={data:null,error:{code:"23505"}};
    let reads=0;
    mocks.from.mockImplementation((table:string)=>query(table==="profiles"?(++reads===1?{data:null,error:null}:{data:{...profile,xp:120},error:null}):results[table]));
    const response=await GET(request());expect(response.status).toBe(200);expect((await response.json()).profile.xp).toBe(120);expect(mocks.insert).toHaveBeenCalledTimes(1);
  });
  it("identifies the missing table and its actual migration",async()=>{
    results.practice_sessions={data:null,error:{code:"PGRST205",message:"Private provider data must not be echoed"}};
    const response=await GET(request());expect(response.status).toBe(503);
    const data=await response.json();expect(data.error.code).toBe("database_missing_table");expect(data.error.message).toContain('"practice_sessions"');expect(data.error.message).toContain("003_nlp_learning.sql");
    expect(JSON.stringify(data)).not.toContain("Private provider data");expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("Private provider data");
  });
  it("points a missing base table to 001 rather than the NLP migration",async()=>{
    results.profiles={data:null,error:{code:"42P01"}};
    const response=await GET(request());expect((await response.json()).error.message).toContain("001_initial_schema.sql");expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("distinguishes denied table grants from absent tables",async()=>{
    results.flashcard_reviews={data:null,error:{code:"42501"}};
    const response=await GET(request());const data=await response.json();expect(response.status).toBe(503);expect(data.error.code).toBe("database_permissions");expect(data.error.message).toContain('"flashcard_reviews"');expect(data.error.message).toContain("004_learning_storage_access.sql");
  });
  it("never masks a connection failure as a migration failure",async()=>{
    results.daily_stats={data:null,error:{code:""}};
    const response=await GET(request());const data=await response.json();expect(data.error.code).toBe("database_unavailable");expect(data.error.message).toContain('"daily_stats"');expect(data.error.message).not.toContain("003");
  });
  it("explains column mismatches separately",async()=>{
    results.test_results={data:null,error:{code:"42703"}};
    const response=await GET(request());expect((await response.json()).error.code).toBe("database_schema_mismatch");
  });
  it("fails clearly if the user's profile cannot be created",async()=>{
    results.profiles={data:null,error:null};insertResult={data:null,error:{code:"42501"}};
    const response=await GET(request());expect(response.status).toBe(503);expect((await response.json()).error.code).toBe("database_permissions");
  });
  it("reports a failing saved-analysis lookup",async()=>{
    results.practice_sessions={data:[{id:userId,activity_key:"speak",created_at:new Date().toISOString(),xp_awarded:25,analysis_id:userId}],error:null};
    results.nlp_analyses={data:null,error:{code:"42501"}};
    const response=await GET(request());expect((await response.json()).error.message).toContain('"nlp_analyses"');
  });
});
