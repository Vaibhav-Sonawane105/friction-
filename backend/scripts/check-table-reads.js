export async function checkTableReads(client, log = console.log) {
  log('Checking anonymous table reads. RLS enforcement is not verified by this check.');
  let allReady = true;
  for (const table of ['profiles', 'user_settings', 'synced_websites', 'unlock_history']) {
    try {
      const { error } = await client.from(table).select('*').limit(1);
      if (error) throw error;
      log(`${table}: Read request succeeded; rows may be filtered by RLS.`);
    } catch (error) {
      log(`${table}: Read check failed: ${error.message} (Code: ${error.code || 'unavailable'})`);
      allReady = false;
    }
  }
  log(allReady
    ? 'All table read requests succeeded. This does not verify migrations, write permissions or user isolation.'
    : 'Some read checks failed. Inspect the errors: configuration, connectivity, permissions or schema may be responsible.');
  log('See backend/supabase/README.md for ordered migrations and SQL permission/versioned-sync checks.');
  return allReady;
}
