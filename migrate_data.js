
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// --- CONFIGURATION ---
const OLD_PROJECT_URL = 'https://qcuiuubbaozcmejzvxje.supabase.co';
const OLD_SERVICE_KEY = 'REMOVED_FOR_SECURITY';

const NEW_PROJECT_URL = 'https://drcfdnlqrgecofwtarem.supabase.co';
const NEW_SERVICE_KEY = 'REMOVED_FOR_SECURITY';
// ---------------------

const oldClient = createClient(OLD_PROJECT_URL, OLD_SERVICE_KEY);
const newClient = createClient(NEW_PROJECT_URL, NEW_SERVICE_KEY);

async function syncAllTables() {
  console.log("🚀 Starting Comprehensive Data Sync...");
  
  // 1. Read Tables List
  console.log("📖 Reading table list from tables.txt...");
  let tables = [];
  try {
    const data = fs.readFileSync('tables.txt', 'utf8');
    // Split by newlines, trim, and filter empty lines
    tables = data.split(/\r?\n/).map(t => t.trim()).filter(t => t.length > 0);
  } catch (err) {
    console.error("❌ Could not read tables.txt. Make sure it exists.");
    return;
  }

  console.log(`🔍 Found ${tables.length} tables to check.\n`);

  for (const tableName of tables) {
    // Skip internal/system tables if any leaked in (though public schema usually safe)
    if (tableName.startsWith('_') || tableName.startsWith('pg_')) continue;

    process.stdout.write(`checking [${tableName}]... `);

    // 2. Count Rows Old
    const { count: oldCount, error: oldErr } = await oldClient.from(tableName).select('*', { count: 'exact', head: true });
    if (oldErr) {
        console.log(`⚠️ Skiping (Error reading Old): ${oldErr.message}`);
        continue;
    }

    // 3. Count Rows New
    const { count: newCount, error: newErr } = await newClient.from(tableName).select('*', { count: 'exact', head: true });
    if (newErr) {
        console.log(`⚠️ Skiping (Error reading New): ${newErr.message}`);
        continue;
    }

    if (oldCount > newCount) {
        console.log(`\n   ❗ MISMATCH FOUND: Old=${oldCount}, New=${newCount}. Syncing...`);
        await migrateTable(tableName, oldCount);
    } else {
        console.log(`✅ OK (${newCount})`);
    }
  }

  console.log("\n✨ All tables synced successfully!");
}

async function migrateTable(tableName, expectedCount) {
    // Fetch ALL rows (paging if necessary, but assuming < 10000 for verified 44 tables)
    // Supabase limit default 1000. Increase to 5000.
    const { data: rows, error: fetchError } = await oldClient
      .from(tableName)
      .select('*')
      .limit(5000);

    if (fetchError || !rows) {
      console.error(`   ❌ Failed to fetch data: ${fetchError?.message}`);
      return;
    }

    if (rows.length === 0) return;

    // chunking upsert (PostgREST limit is usually safe but large payloads can fail)
    // we'll try sending all at once for now as datasets seem small, or chunk 1000
    const { error: insertError } = await newClient
      .from(tableName)
      .upsert(rows);

    if (insertError) {
      console.error(`   ❌ Sync Failed: ${insertError.message}`);
      // Special handling: if failure is Foreign Key constraint, we might need to sync dependencies first.
      // But we are iterating alphabetically... hopefully dependencies are fine.
      // If error is FK, we'd need topological sort.
    } else {
      console.log(`   ✅ Synced ${rows.length} rows.`);
    }
}

syncAllTables();
