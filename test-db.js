import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

// Simple env parser to avoid external dependencies
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2];
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase URL or Anon Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('Testing connection to Supabase...');
  
  // Test 1: Check if tables exist
  const { error: tablesError } = await supabase.from('profiles').select('id').limit(1);
  if (tablesError) {
    console.log('❌ Could not query database. Have you run the database migrations?');
    console.log(tablesError.message);
    return;
  }
  console.log('✅ Connected to database successfully. Tables exist.');

  // Test 2: Check if seed data exists (checking activities or sentences)
  const { data: passages, error: passagesError } = await supabase.from('passages').select('id');
  if (passagesError || !passages || passages.length === 0) {
    console.log('⚠️ Database is missing seed data! You need to run the `seed.sql` file.');
  } else {
    console.log(`✅ Seed data exists! Found ${passages.length} passages.`);
    console.log('🎉 Supabase is 100% fully configured and ready to go!');
  }
}

checkDatabase();
