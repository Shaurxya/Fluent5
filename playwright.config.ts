import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir:"./tests/e2e", fullyParallel:false, workers:1, timeout:45000,
  use:{baseURL:"http://127.0.0.1:3010",browserName:"chromium",trace:"retain-on-failure"},
  webServer:[
    {command:"node tests/e2e/auth-provider.mjs",url:"http://127.0.0.1:54329/health",reuseExistingServer:false},
    {command:"npm run dev -- --hostname 127.0.0.1 --port 3010",url:"http://127.0.0.1:3010/login",reuseExistingServer:false,timeout:120000,
      env:{NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:54329",NEXT_PUBLIC_SUPABASE_ANON_KEY:"test-public-anon-key",NEXT_PUBLIC_APP_URL:"http://127.0.0.1:3010"}},
  ],
});
