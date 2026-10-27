import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { zodSchema } from "ai";
import { ChunkingSchema, ShadowingSchema } from "@/lib/ai/schemas";
import { contextualFailure } from "@/lib/ai/errors";

const mocks = vi.hoisted(() => ({ client:vi.fn(),user:vi.fn(),rpc:vi.fn(),insert:vi.fn(),cached:vi.fn() }));
vi.mock("@/lib/supabase/server",() => ({createClient:mocks.client}));
import { POST } from "@/app/api/ai/analyze/route";
import { GET as definition } from "@/app/api/learning/definition/route";

const contextual = {
  phrase:"aesthetically pleasing areas",meaning:"Places that look attractive.",collocations:[],
  context:{register:"neutral",whenToUse:"Describing attractive surroundings.",whoWith:"Anyone.",
    scenarios:[],naturalness:"common",sayItAnotherWay:[],avoidWhen:""},
};
const shadow = {overallScore:80,wordComparison:[],pacing:{thoughtGroups:[],pauseMap:[{afterWordIndex:1,type:"short",natural:true,note:""}],stress:[],rushedAt:[],tip:"Pause between ideas."},intonation:null,topFixes:[],encouragement:"Keep practising."};
const req = (mode = "chunk") => new Request("http://localhost/api/ai/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode,input:{phrase:contextual.phrase,context:"A passage about parks."}})});
const lookup = () => definition(new Request("http://localhost/api/learning/definition?word=pleasing"));
const response = (data:unknown,status=200) => new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});
const completion = (data:unknown) => response({id:"mock-chat",object:"chat.completion",created:1,model:"openai/gpt-4o-mini",choices:[{index:0,message:{role:"assistant",content:JSON.stringify(data)},finish_reason:"stop"}],usage:{prompt_tokens:10,completion_tokens:20,total_tokens:30}});

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","http://localhost:54321");vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY","test-public");
  vi.stubEnv("OPENROUTER_API_KEY","test-private-provider-key");vi.stubEnv("OPENROUTER_MODEL_FAST","openai/gpt-4o-mini");vi.stubEnv("OPENROUTER_MODEL_DEEP","openai/gpt-4o");
  vi.spyOn(console,"error").mockImplementation(() => {});
  mocks.user.mockResolvedValue({data:{user:{id:"test-user"}},error:null});mocks.rpc.mockResolvedValue({data:true,error:null});
  mocks.cached.mockResolvedValue({data:null,error:null});mocks.insert.mockResolvedValue({error:null});
  const query:Record<string,unknown> = {maybeSingle:mocks.cached,insert:mocks.insert};
  for (const method of ["select","eq","gte","order","limit"]) query[method] = () => query;
  mocks.client.mockResolvedValue({auth:{getUser:mocks.user},rpc:mocks.rpc,from:() => query});
});
afterEach(() => {vi.restoreAllMocks();vi.unstubAllEnvs();vi.clearAllMocks();});

// Simulate a strict endpoint's contract against the actual HTTP request emitted
// by the installed SDK, rather than mocking generateObject/schema conversion.
function strictObjects(schema:unknown):void {
  if (!schema || typeof schema !== "object") return;
  const node = schema as Record<string,unknown>;
  if (node.type === "object") {
    expect(node.additionalProperties).toBe(false);
    expect([...(node.required as string[] ?? [])].sort()).toEqual(Object.keys(node.properties as object ?? {}).sort());
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(strictObjects);
    else if (value && typeof value === "object") strictObjects(value);
  }
}

describe("contextual AI through the real SDK with mocked HTTP",() => {
  it("reproduces the old strict-schema incompatibility",async () => {
    const schema = await zodSchema(ChunkingSchema).jsonSchema;
    const context = schema.properties?.context;
    expect(context).toBeTypeOf("object");
    expect((context as {required:string[]}).required).not.toContain("avoidWhen");
  });
  it.each([ ["chunk",contextual,ChunkingSchema], ["shadow",shadow,ShadowingSchema] ] as const)("sends a strict-compatible %s request and preserves the consumer contract",async (mode,data,schema) => {
    const fetch = vi.spyOn(globalThis,"fetch").mockImplementation(async (_url,options) => {
      const sent = JSON.parse(options?.body as string);
      expect(sent.response_format.json_schema.strict).toBe(true);
      strictObjects(sent.response_format.json_schema.schema);
      expect(sent.provider.require_parameters).toBe(true);
      expect(sent.messages.some((message:{content:unknown}) => JSON.stringify(message.content).includes(contextual.phrase))).toBe(true);
      return completion(data);
    });
    const result = await POST(req(mode));
    expect(result.status).toBe(200);expect(schema.safeParse(await result.json()).success).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({mode,output_jsonb:data}));
  });
  it("preserves historical cached explanations with absent optional notes",async () => {
    const historical = {...contextual,context:{...contextual.context,avoidWhen:undefined}};
    mocks.cached.mockResolvedValue({data:{output_jsonb:historical},error:null});
    const fetch = vi.spyOn(globalThis,"fetch");
    const result = await POST(req());expect(result.status).toBe(200);
    expect((await result.json()).meaning).toBe(contextual.meaning);expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    [400,502,"ai_request_rejected"],[401,503,"ai_credentials"],[402,503,"ai_credit_limit"],
    [403,503,"ai_forbidden"],[404,503,"ai_model_unavailable"],[408,504,"ai_timeout"],
    [429,429,"ai_rate_limited"],[503,503,"ai_unavailable"],
  ])("classifies provider HTTP %i without exposing its payload",async (providerStatus,status,code) => {
    const privatePayload = "private learner content and test-private-provider-key";
    vi.spyOn(globalThis,"fetch").mockImplementation(async () => response({error:{code:providerStatus,message:privatePayload}},providerStatus));
    const result = await POST(req());expect(result.status).toBe(status);
    const payload = await result.json();expect(payload.error.code).toBe(code);
    expect(JSON.stringify(payload)).not.toContain(privatePayload);expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(privatePayload);
  });
  it("reports invalid generated output without logging generated learner text",async () => {
    vi.spyOn(globalThis,"fetch").mockResolvedValue(completion({private:"learner-secret"}));
    const result = await POST(req());expect(result.status).toBe(502);
    expect((await result.json()).error.code).toBe("ai_invalid_output");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("learner-secret");
  });
  it("classifies an application deadline",async () => {
    const result = contextualFailure(new DOMException("private text","TimeoutError"));
    expect(result.status).toBe(504);expect((await result.json()).error.code).toBe("ai_timeout");
  });
  it("authenticates before calling the provider and reports missing configuration",async () => {
    const fetch = vi.spyOn(globalThis,"fetch");
    mocks.user.mockResolvedValueOnce({data:{user:null},error:null});expect((await POST(req())).status).toBe(401);
    vi.stubEnv("OPENROUTER_API_KEY","");const result = await POST(req());expect(result.status).toBe(503);
    expect((await result.json()).error.code).toBe("ai_unavailable");expect(fetch).not.toHaveBeenCalled();
  });
});

describe("dictionary errors",() => {
  it("returns an actual provider definition",async () => {
    vi.spyOn(globalThis,"fetch").mockResolvedValue(response([{meanings:[{definitions:[{definition:"Giving enjoyment."}]}]}]));
    const result = await lookup();expect(result.status).toBe(200);expect((await result.json()).definition).toBe("Giving enjoyment.");
  });
  it("distinguishes a missing entry from a provider outage",async () => {
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(response({},404)).mockResolvedValueOnce(response({},503));
    const missing = await lookup();expect(missing.status).toBe(404);expect((await missing.json()).error.code).toBe("dictionary_not_found");
    const outage = await lookup();expect(outage.status).toBe(503);expect((await outage.json()).error.code).toBe("dictionary_unavailable");
  });
  it("distinguishes network failures from invalid provider data",async () => {
    vi.spyOn(globalThis,"fetch").mockRejectedValueOnce(new Error("network private details")).mockResolvedValueOnce(response({invalid:"private"}));
    const offline = await lookup();expect(offline.status).toBe(503);expect((await offline.json()).error.code).toBe("dictionary_unavailable");
    const invalid = await lookup();expect(invalid.status).toBe(502);expect((await invalid.json()).error.code).toBe("dictionary_invalid_output");
  });
});
