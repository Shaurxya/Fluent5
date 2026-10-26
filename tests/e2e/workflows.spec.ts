import {test,expect,type Page,type BrowserContext} from "@playwright/test";
import cycle from "../fixtures/cycle-analysis.json";
import reading from "../fixtures/read-analysis.json";
import writing from "../fixtures/write-analysis.json";
import shadowing from "../fixtures/shadow-analysis.json";
import type {LearningSummary} from "../../src/lib/learning/analytics";

const userId="11111111-1111-4111-8111-111111111111";
const analysisId="33333333-3333-4333-8333-333333333333";
async function session(context:BrowserContext) {
  const exp=Math.floor(Date.now()/1000)+3600;
  const token=[Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url"),Buffer.from(JSON.stringify({sub:userId,aud:"authenticated",role:"authenticated",exp})).toString("base64url"),"test-provider-signature"].join(".");
  const value="base64-"+Buffer.from(JSON.stringify({access_token:token,refresh_token:"mock-refresh",expires_at:exp,expires_in:3600,token_type:"bearer",user:{id:userId,email:"learner@example.test"}})).toString("base64url");
  await context.addCookies([{name:"sb-127-auth-token",value,url:"http://127.0.0.1:3010",sameSite:"Lax"}]);
}

async function learningMocks(page:Page) {
  const state={completed:[] as Record<string,unknown>[],chunks:[] as {id:string;text:string;note:string;ef:number;reps:number;interval:number;due_date:string}[],reviews:0,drafts:[] as Record<string,unknown>[]};
  const fulfill=(route:Parameters<Parameters<Page["route"]>[1]>[0],data:unknown,status=200) => route.fulfill({status,contentType:"application/json",body:JSON.stringify(data)});
  await page.route("**/api/ai/analyze",r => fulfill(r,{error:{message:"Paid AI mocked unavailable"}},503));
  await page.route("**/api/tts",r => fulfill(r,{error:{message:"Paid voice mocked unavailable"}},503));
  await page.route("**/api/nlp/analyze",async r => {const input=r.request().postDataJSON();const analysis=input.mode==="read"?reading:input.mode==="write"?writing:input.mode==="shadow"?shadowing:cycle;await fulfill(r,{analysis_id:analysisId,analysis,cached:false});});
  await page.route("**/api/learning/passage",r => fulfill(r,{title:"Daily routines",text:reading.text,source:"FluentFive test passage",attribution:"Locally authored fixture"}));
  await page.route("**/api/learning/draft",async r => {state.drafts.push(r.request().postDataJSON());await fulfill(r,{id:state.drafts.at(-1)?.id});});
  await page.route("**/api/learning/complete",async r => {
    const input=r.request().postDataJSON();state.completed.push(input);
    for(const chunk of input.chunks || []) if(!state.chunks.some(c => c.text===chunk.text)) state.chunks.push({id:crypto.randomUUID(),text:chunk.text,note:chunk.note || "",ef:2.5,reps:0,interval:0,due_date:new Date().toISOString().slice(0,10)});
    await fulfill(r,{id:input.attempt_id,xp_awarded:25,chunks_saved:input.chunks?.length||0,already_saved:false});
  });
  await page.route("**/rest/v1/chunks?**",r => fulfill(r,state.chunks));
  await page.route("**/api/learning/review",async r => {state.reviews++;await fulfill(r,{xp_awarded:10,already_saved:false});});
  await page.route("**/api/learning/summary",r => {
    const data:LearningSummary={profile:{display_name:"Test Learner",email:"learner@example.test",xp:state.completed.length*25+state.reviews*10,streak:state.completed.length?1:0,longest_streak:state.completed.length?1:0},today_activities:state.completed.length?["speak"]:[],weekly_active_days:state.completed.length?1:0,saved_chunks:state.chunks.length,due_chunks:Math.max(0,state.chunks.length-state.reviews),reviews:{count:state.reviews,recalled:state.reviews,recall_rate:state.reviews?1:null},history:state.completed.map(s => ({id:String(s.attempt_id),activity_key:String(s.activity),created_at:new Date().toISOString(),xp_awarded:25,analysis_id:analysisId})),chart:[{date:new Date().toISOString().slice(0,10),activities:state.completed.length,xp:state.completed.length*25+state.reviews*10}],trends:[],recommendations:[],recurring_errors:[],phrase_usage:[],test_results:[]};return fulfill(r,data);
  });
  await page.route("**/api/learning/history?**",r => fulfill(r,{session:state.completed[0],analysis:cycle}));
  return state;
}

test("magic-link form submits to a mocked auth provider",async({page}) => {
  await page.goto("/login");await page.getByPlaceholder("you@example.com").fill("learner@example.test");await page.getByRole("button",{name:/magic link/i}).click();await expect(page.getByText(/check your inbox/i).first()).toBeVisible();
});

test("mocked authenticated cycle → feedback → remember → review → history → progress",async({page,context}) => {
  await session(context);const state=await learningMocks(page);
  await page.goto("/app/cycle");
  for(const chunk of reading.vocabulary.chunks.slice(0,5)) await page.getByRole("button",{name:`○ ${chunk.text}`,exact:true}).click();
  await page.getByRole("button",{name:"I’m ready to think & speak"}).click();await page.getByRole("button",{name:"Start speaking early"}).click();
  await page.getByLabel("Your spoken response").fill(cycle.text);await page.getByRole("button",{name:"Continue to analysis"}).click();
  await expect(page.getByTestId("analysis-results")).toBeVisible();await expect(page.getByRole("heading",{name:"Your text & grammar suggestions"})).toBeVisible();
  await page.getByRole("button",{name:"Save selected phrases & finish"}).click();await expect(page.getByRole("heading",{name:"Cycle complete"})).toBeVisible();
  expect(state.completed).toHaveLength(1);expect((state.completed[0].chunks as unknown[]).length).toBeGreaterThan(0);
  await page.getByRole("link",{name:"Review saved phrases"}).click();
  for(let i=0;i<state.chunks.length;i++){await page.getByRole("button",{name:"Flip flashcard"}).click();await page.getByRole("button",{name:"Good",exact:true}).click();}
  await expect(page.getByRole("heading",{name:/Review Complete/})).toBeVisible();expect(state.reviews).toBe(state.chunks.length);
  await page.goto("/app/activities");await page.getByRole("button",{name:/speak/}).click();await expect(page.getByTestId("analysis-results")).toBeVisible();
  await page.goto("/app/progress");await expect(page.getByRole("heading",{name:"Vocabulary retention"})).toBeVisible();await expect(page.getByText(/reviews rated Good or Easy/)).toBeVisible();
});

test("mocked writing keeps both drafts and applies a correction only after acceptance",async({page,context}) => {
  await session(context);const state=await learningMocks(page);await page.goto("/app/write");
  await page.getByLabel("First draft").fill(writing.text);await page.getByRole("button",{name:"Save first draft & start rewrite"}).click();
  await page.getByRole("button",{name:"Analyze writing"}).click();await expect(page.getByTestId("analysis-results")).toBeVisible();await expect(page.getByLabel("Your rewrite")).toHaveValue(writing.text);
  await page.getByRole("button",{name:"Accept suggestion"}).first().click();await expect(page.getByLabel("Your rewrite")).toHaveValue(writing.text.replace("goes","went"));
  await page.getByRole("button",{name:"Save rewrite & finish"}).click();await expect(page.getByRole("status").filter({hasText:"Both drafts saved"})).toBeVisible();
  expect(state.drafts[0].draft_v1).toBe(writing.text);expect((state.completed[0].payload as Record<string,unknown>).draft_v2).toContain("I went");
});

test("mocked shadowing displays word agreement and never claims acoustic pronunciation",async({page,context}) => {
  await session(context);await learningMocks(page);await page.goto("/app/shadow");
  await page.getByLabel("Your spoken response").fill(shadowing.text);await page.getByRole("button",{name:"Continue to analysis"}).click();
  await expect(page.getByRole("heading",{name:"Word-level shadowing comparison"})).toBeVisible();await expect(page.getByText(/WER includes speech recognizer errors/)).toBeVisible();
  await page.getByRole("button",{name:"Save shadowing practice"}).click();await expect(page.getByText(/Shadowing saved/)).toBeVisible();
});

test("analysis failure retains typed response and offers retry",async({page,context}) => {
  await session(context);await learningMocks(page);await page.route("**/api/nlp/analyze",r => r.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:{message:"NLP temporarily unavailable"}})}));
  await page.goto("/app/speak");await page.getByLabel("Your spoken response").fill(cycle.text);await page.getByRole("button",{name:"Continue to analysis"}).click();
  await expect(page.getByRole("alert").filter({hasText:"NLP temporarily unavailable"})).toBeVisible();await expect(page.getByLabel("Your spoken response")).toHaveValue(cycle.text);await expect(page.getByRole("button",{name:"Retry NLP analysis"})).toBeVisible();
});

test("mobile navigation and honest zero-activity state",async({page,context}) => {
  await session(context);await learningMocks(page);await page.setViewportSize({width:390,height:844});await page.goto("/app");
  await expect(page.getByText("0-day streak, 0 of 5 done")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:"test-results/mobile-dashboard.png",fullPage:true});
  await page.getByRole("button",{name:"Open navigation"}).click();await page.getByRole("link",{name:"Review",exact:true}).click();await expect(page.getByRole("heading",{name:"No cards due today"})).toBeVisible();
});

test("microphone denial leaves a usable typed fallback",async({page,context}) => {
  await session(context);await learningMocks(page);
  await page.addInitScript(() => {
    Object.defineProperty(window,"SpeechRecognition",{configurable:true,value:class {}});
    Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:async () => {throw new DOMException("Denied for test","NotAllowedError");}}});
  });
  await page.goto("/app/speak");await page.getByRole("button",{name:"Start speaking",exact:true}).click();
  await expect(page.getByRole("alert").filter({hasText:/Microphone access was denied/})).toBeVisible();
  await page.getByLabel("Your spoken response").fill(cycle.text);await page.getByRole("button",{name:"Continue to analysis"}).click();await expect(page.getByTestId("analysis-results")).toBeVisible();
});
