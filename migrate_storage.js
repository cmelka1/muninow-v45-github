
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const OLD_PROJECT_URL = 'https://qcuiuubbaozcmejzvxje.supabase.co';
const OLD_SERVICE_KEY = 'REMOVED_FOR_SECURITY';

const NEW_PROJECT_URL = 'https://drcfdnlqrgecofwtarem.supabase.co';
const NEW_SERVICE_KEY = 'REMOVED_FOR_SECURITY';
// ---------------------

const oldClient = createClient(OLD_PROJECT_URL, OLD_SERVICE_KEY);
const newClient = createClient(NEW_PROJECT_URL, NEW_SERVICE_KEY);

async function migrateStorage() {
  console.log("🚀 Starting Storage Migration...");
  console.log(`From: ${OLD_PROJECT_URL}`);
  console.log(`To:   ${NEW_PROJECT_URL}\n`);

  // 1. Get all buckets from Old Project
  const { data: buckets, error: bucketError } = await oldClient.storage.listBuckets();
  if (bucketError) {
    console.error("❌ Error fetching buckets:", bucketError.message);
    return;
  }

  console.log(`Found ${buckets.length} buckets to migrate.`);

  for (const bucket of buckets) {
    console.log(`\n📂 Processing bucket: [${bucket.name}]`);

    // 2. Create bucket in New Project (ignore if exists)
    const { error: createError } = await newClient.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: bucket.file_size_limit,
      allowedMimeTypes: bucket.allowed_mime_types
    });
    
    // Ignore "already exists" error safely
    if (createError && !createError.message.includes('already exists')) {
      console.error(`  ❌ Failed to create bucket:`, createError.message);
    } else {
      console.log(`  ✅ Bucket ready.`);
    }

    // 3. List files in Old Bucket
    const { data: files, error: listError } = await oldClient.storage
      .from(bucket.name)
      .list(null, { limit: 1000, offset: 0 });

    if (listError || !files || files.length === 0) {
      console.log(`  (Bucket empty or no files found)`);
      continue;
    }

    // 4. Download and Upload each file
    for (const file of files) {
        if (file.name === '.emptyFolderPlaceholder') continue; 

        process.stdout.write(`  --> Moving ${file.name}... `);

        // Download
        const { data: fileData, error: downloadError } = await oldClient.storage
            .from(bucket.name)
            .download(file.name);

        if (downloadError) {
            console.log(`❌ Download Error: ${downloadError.message}`);
            continue;
        }

        // Upload
        const { error: uploadError } = await newClient.storage
            .from(bucket.name)
            .upload(file.name, fileData, {
                contentType: file.metadata?.mimetype || 'application/octet-stream',
                upsert: true
            });

        if (uploadError) console.log(`❌ Upload Error: ${uploadError.message}`);
        else console.log(`✅ Done`);
    }
  }
  console.log("\n✨ Migration Complete!");
}

migrateStorage();
