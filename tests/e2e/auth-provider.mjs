// Test-only HTTP stand-in. Never imported by application code; never a production auth bypass.
import http from "node:http";
const id="11111111-1111-4111-8111-111111111111";
const user={id,email:"learner@example.test",aud:"authenticated",role:"authenticated",app_metadata:{provider:"email",providers:["email"]},user_metadata:{full_name:"Test Learner"},created_at:"2026-10-01T00:00:00Z"};
http.createServer((req,res) => {
  res.setHeader("Access-Control-Allow-Origin","http://127.0.0.1:3010");res.setHeader("Access-Control-Allow-Headers","*");res.setHeader("Access-Control-Allow-Methods","GET,POST,PATCH,OPTIONS");res.setHeader("Content-Type","application/json");
  if(req.method==="OPTIONS"){res.writeHead(204);res.end();return;}
  if(req.url==="/health"){res.end('{"status":"test-only"}');return;}
  if(req.url?.startsWith("/auth/v1/otp")){res.end('{}');return;}
  if(!req.headers.authorization?.startsWith("Bearer ")){res.writeHead(401);res.end('{}');return;}
  if(req.url?.startsWith("/auth/v1/user")){res.end(JSON.stringify(user));return;}
  if(req.url?.startsWith("/rest/v1/profiles")){const profile={...user,display_name:"Test Learner",xp:0,streak:0,longest_streak:0,last_active:null};res.end(JSON.stringify(req.headers.accept?.includes("object")?profile:[profile]));return;}
  if(req.url?.startsWith("/rest/v1/sentences")){res.end(JSON.stringify([{id:"22222222-2222-4222-8222-222222222222",level:"easy",text:"I went to college yesterday and met my friends."}]));return;}
  res.end('[]');
}).listen(54329,"127.0.0.1");
