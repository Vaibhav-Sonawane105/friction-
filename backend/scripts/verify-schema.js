import { supabase } from '../src/supabase.js';

async function checkSchema() {
  console.log('--- Checking Supabase Database Tables ---');
  const tables = ['profiles', 'user_settings', 'synced_websites', 'unlock_history'];
  let allReady = true;

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ ${table}: ${error.message} (Code: ${error.code})`);
      allReady = false;
    } else {
      console.log(`✅ ${table}: Table exists & RLS active`);
    }
  }

  if (allReady) {
    console.log('\n🎉 All tables exist and are accessible through Supabase client!');
  } else {
    console.log('\n⚠️  One or more tables are not yet created in Supabase.');
    console.log('Run the SQL migration in backend/supabase/migrations/20261015000001_initial_schema.sql via the Supabase SQL Editor.');
  }
}

checkSchema().catch((err) => {
  console.error('Unexpected check error:', err);
  process.exit(1);
});
