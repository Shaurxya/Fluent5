import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/cycle-analysis.json";

const mocks=vi.hoisted(() => ({user:vi.fn(),rpc:vi.fn(),from:vi.fn(),client:vi.fn()}));
vi.mock("@/lib/supabase/server",() => ({createClient:mocks.client}));
import {POST as analyze} from "@/app/api/nlp/analyze/route";
import {POST as complete} from "@/app/api/learning/complete/route";
import {POST as chunks} from "@/app/api/learning/chunks/route";
import {POST as legacyAI} from "@/app/api/ai/analyze/route";
import {POST as tts} from "@/app/api/tts/route";

function chain(result:unknown) {
  const query: Record<string,unknown> = {};
  for(const method of ["select","eq","gte","limit","order","insert","update"]) query[method]=vi.fn(() => query);
  query.maybeSingle=vi.fn(async () => result); query.single=vi.fn(async () => result);
  return query;
}
const id="11111111-1111-4111-8111-111111111111";
const input=() => ({attempt_id:id,mode:"cycle",text:fixture.text,prompt:"A personal memory",duration_seconds:90});
const request=(path:string,value:unknown) => new Request(`http://localhost${path}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
beforeEach(() => {
  vi.restoreAllMocks();vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","http://localhost:54321");vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY","test-public-key");
  vi.stubEnv("NLP_SERVICE_URL","http://nlp.internal:8000");vi.stubEnv("NLP_SERVICE_API_KEY","private-test-key");
  mocks.user.mockReset().mockResolvedValue({data:{user:{id}},error:null});
  mocks.rpc.mockReset().mockResolvedValue({data:true,error:null});mocks.from.mockReset();
  mocks.client.mockResolvedValue({auth:{getUser:mocks.user},rpc:mocks.rpc,from:mocks.from});
});

describe("authenticated NLP gateway",() => {
  it("rejects unauthenticated access before touching providers",async () => {
    mocks.user.mockResolvedValue({data:{user:null},error:null}); const fetch=vi.spyOn(globalThis,"fetch");
    const response=await analyze(request("/api/nlp/analyze",input()));expect(response.status).toBe(401);expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects cross-origin mutations",async () => {
    const req=request("/api/nlp/analyze",input());req.headers.set("origin","https://untrusted.test");
    expect((await analyze(req)).status).toBe(403);
  });
  it("rejects oversized input and debug bypass flags",async () => {
    expect((await analyze(request("/api/nlp/analyze",{...input(),text:"a".repeat(12001)}))).status).toBe(422);
    expect((await legacyAI(request("/api/ai/analyze",{mode:"write",input:{text:"Hi"},debug:true}))).status).toBe(422);
  });
  it("returns a recoverable configuration error without service secrets",async () => {
    vi.stubEnv("NLP_SERVICE_API_KEY","");const response=await analyze(request("/api/nlp/analyze",input()));
    expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain("private-test-key");
  });
  it("uses only an exact stored request and does not call the provider for a cache hit",async () => {
    mocks.from.mockReturnValue(chain({data:{id,result:fixture},error:null}));const fetch=vi.spyOn(globalThis,"fetch");
    const response=await analyze(request("/api/nlp/analyze",input()));expect(response.status).toBe(200);
    expect((await response.json()).cached).toBe(true);expect(fetch).not.toHaveBeenCalled();
  });
  it("sends the private credential server-side, validates and persists actual results",async () => {
    mocks.from.mockReturnValueOnce(chain({data:null,error:null})).mockReturnValueOnce(chain({data:{id},error:null}));
    const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify(fixture),{status:200}));
    const response=await analyze(request("/api/nlp/analyze",input()));
    expect(response.status).toBe(200);expect((await response.json()).analysis_id).toBe(id);
    expect(fetch.mock.calls[0][1]?.headers).toMatchObject({Authorization:"Bearer private-test-key"});
    expect(mocks.rpc).toHaveBeenCalledWith("consume_api_quota",{p_resource:"nlp"});
  });
  it("fails closed when database quotas are unavailable",async () => {
    mocks.from.mockReturnValue(chain({data:null,error:null}));mocks.rpc.mockResolvedValue({data:null,error:{message:"db down"}});
    const fetch=vi.spyOn(globalThis,"fetch");expect((await analyze(request("/api/nlp/analyze",input()))).status).toBe(503);expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects malformed or mismatched provider output",async () => {
    mocks.from.mockReturnValue(chain({data:null,error:null}));vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({...fixture,text:"another learner"}),{status:200}));
    expect((await analyze(request("/api/nlp/analyze",input()))).status).toBe(502);
  });
  it("does not claim success if persistence fails",async () => {
    mocks.from.mockReturnValueOnce(chain({data:null,error:null})).mockReturnValueOnce(chain({data:null,error:{code:"offline"}}));
    vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify(fixture),{status:200}));
    expect((await analyze(request("/api/nlp/analyze",input()))).status).toBe(503);
  });
  it("returns an explicit unavailable response after a timeout",async () => {
    mocks.from.mockReturnValue(chain({data:null,error:null}));vi.spyOn(globalThis,"fetch").mockRejectedValue(new DOMException("timeout","TimeoutError"));
    expect((await analyze(request("/api/nlp/analyze",input()))).status).toBe(503);
  });
});

describe("learning and voice APIs",() => {
  it("saves chosen phrases through the authenticated transaction",async () => {
    mocks.rpc.mockResolvedValue({data:{id,xp_awarded:25,chunks_saved:1},error:null});
    const response=await complete(request("/api/learning/complete",{attempt_id:id,activity:"speak",chunks:[{text:"in fact"}]}));
    expect(response.status).toBe(200);expect(mocks.rpc).toHaveBeenCalledWith("complete_practice",expect.objectContaining({p_chunks:[{text:"in fact"}]}));
  });
  it("preserves errors from failed phrase/session saves",async () => {
    mocks.rpc.mockResolvedValue({data:null,error:{code:"db_down"}});
    expect((await chunks(request("/api/learning/chunks",{chunks:[{text:"in fact"}]}))).status).toBe(503);
    expect((await complete(request("/api/learning/complete",{attempt_id:id,activity:"speak"}))).status).toBe(503);
  });
  it("authenticates voice requests and handles a missing paid API key",async () => {
    mocks.user.mockResolvedValueOnce({data:{user:null},error:null});expect((await tts(request("/api/tts",{text:"Hello"}))).status).toBe(401);
    vi.stubEnv("ELEVENLABS_API_KEY","");expect((await tts(request("/api/tts",{text:"Hello"}))).status).toBe(503);
  });
});
