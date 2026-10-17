import { supabase } from '../src/supabase.js';
import { checkTableReads } from './check-table-reads.js';

checkTableReads(supabase)
  .then((passed) => { process.exitCode = passed ? 0 : 1; })
  .catch((error) => {
    console.error('Unexpected check error:', error.message);
    process.exitCode = 1;
  });
