#!/usr/bin/env node
/**
 * Re-upload local files to UploadThing and update all matching core_doc records.
 *
 * Usage:  node scripts/reupload_to_uploadthing.mjs [--dry-run]
 *
 * Reads files from local disk, uploads via UTApi, then updates every core_doc
 * row whose doc_name matches (across cloned projects) with the new storage_uri.
 */

import { UTApi } from 'uploadthing/server';
import { readFileSync } from 'fs';
import { basename } from 'path';
import pg from 'pg';

const DRY_RUN = process.argv.includes('--dry-run');

const DB_URL =
  'postgresql://neondb_owner:npg_bps3EShU9WFM@ep-tiny-lab-af0tg3ps.c-2.us-west-2.aws.neon.tech/land_v2?sslmode=require';

const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN,
});

// ── File map: doc_name → local path ──────────────────────────────────────
// Each entry also carries ALL doc_ids that share this doc_name (across clones)
const FILES = [
  {
    docName: '3.1 Preliminary Plat Narrative & Approval.pdf',
    localPath: 'docs/09-session-notes/archive/attachments/3.1 Preliminary Plat Narrative & Approval.pdf',
    docIds: [1, 4, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
  },
  {
    docName: '14105 Chadron Ave_OM_2025[nopics].pdf',
    localPath: 'reference/multifam/chadron/14105 Chadron Ave_OM_2025[nopics].pdf',
    docIds: [58, 127, 137, 147],
  },
  {
    docName: '14105 Chadron Ave_OM_2025 [tables].pdf',
    localPath: 'reference/multifam/chadron/14105 Chadron Ave_OM_2025 [tables].pdf',
    docIds: [191],
  },
  {
    docName: 'Chadron - Rent Roll + Tenant Income Info as of 09.17.2025.xlsx',
    localPath: 'reference/multifam/chadron/Chadron - Rent Roll + Tenant Income Info as of 09.17.2025.xlsx',
    docIds: [121, 131, 141, 195],
  },
  {
    docName: 'multifamily-market-research-los-angeles-2025-4q.pdf',
    localPath: 'multifamily-market-research-los-angeles-2025-4q.pdf',
    docIds: [118, 128, 138, 148, 186],
  },
  {
    docName: 'Greater_Los_Angeles_2026_U.S._.pdf',
    localPath: 'Greater_Los_Angeles_2026_U.S._.pdf',
    docIds: [119, 129, 139, 149, 187],
  },
  {
    docName: 'Los_Angeles_Multifamily_Snapsh.pdf',
    localPath: 'Los_Angeles_Multifamily_Snapsh.pdf',
    docIds: [120, 130, 140, 150, 185],
  },
  {
    docName: '2025 JPM Co-Star Los Angeles - MultiFamily.pdf',
    localPath: 'reference/multifam/2025 JPM Co-Star Los Angeles - MultiFamily.pdf',
    docIds: [192],
  },
  {
    docName: 'Lynn Villas OM 2025_FINAL FOR MARKETING.pdf',
    localPath: 'reference/multifam/Lynn Villas OM 2025_FINAL FOR MARKETING.pdf',
    docIds: [73, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91],
  },
];

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===');
  console.log(`${FILES.length} files to upload\n`);

  const pool = new pg.Pool({ connectionString: DB_URL });
  const results = [];

  for (const entry of FILES) {
    const { docName, localPath, docIds } = entry;
    console.log(`── ${docName}`);
    console.log(`   Local: ${localPath}`);
    console.log(`   Doc IDs to update: [${docIds.join(', ')}]`);

    // Read local file
    let buf;
    try {
      buf = readFileSync(localPath);
    } catch (err) {
      console.log(`   ❌ SKIPPED — file not found: ${err.message}\n`);
      results.push({ docName, status: 'SKIPPED', reason: 'file not found' });
      continue;
    }

    if (DRY_RUN) {
      console.log(`   🔍 DRY RUN — would upload ${(buf.length / 1024).toFixed(1)} KB\n`);
      results.push({ docName, status: 'DRY_RUN', size: buf.length });
      continue;
    }

    // Upload to UploadThing
    const file = new File([buf], basename(localPath), {
      type: docName.endsWith('.xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : docName.endsWith('.pdf')
          ? 'application/pdf'
          : 'application/octet-stream',
    });

    let uploadResult;
    try {
      uploadResult = await utapi.uploadFiles(file);
    } catch (err) {
      console.log(`   ❌ UPLOAD FAILED: ${err.message}\n`);
      results.push({ docName, status: 'UPLOAD_ERROR', reason: err.message });
      continue;
    }

    if (uploadResult.error) {
      console.log(`   ❌ UPLOAD ERROR: ${uploadResult.error.message}\n`);
      results.push({ docName, status: 'UPLOAD_ERROR', reason: uploadResult.error.message });
      continue;
    }

    const newUri = uploadResult.data.url;
    const newKey = uploadResult.data.key;
    console.log(`   ✅ Uploaded → ${newUri}`);
    console.log(`   Key: ${newKey}`);

    // Update all matching doc_ids
    try {
      const res = await pool.query(
        `UPDATE landscape.core_doc
         SET storage_uri = $1, updated_at = NOW()
         WHERE doc_id = ANY($2) AND deleted_at IS NULL`,
        [newUri, docIds]
      );
      console.log(`   ✅ Updated ${res.rowCount} core_doc rows\n`);
      results.push({ docName, status: 'OK', newUri, newKey, rowsUpdated: res.rowCount });
    } catch (err) {
      console.log(`   ❌ DB UPDATE FAILED: ${err.message}\n`);
      results.push({ docName, status: 'DB_ERROR', newUri, reason: err.message });
    }

    // Small delay between uploads
    await new Promise((r) => setTimeout(r, 500));
  }

  await pool.end();

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const ok = results.filter((r) => r.status === 'OK');
  const skipped = results.filter((r) => r.status === 'SKIPPED');
  const errors = results.filter((r) => r.status.includes('ERROR'));
  const dry = results.filter((r) => r.status === 'DRY_RUN');

  console.log(`  Uploaded + DB updated: ${ok.length}`);
  console.log(`  Skipped (not found):   ${skipped.length}`);
  console.log(`  Errors:                ${errors.length}`);
  if (dry.length) console.log(`  Dry run:               ${dry.length}`);

  const totalRows = ok.reduce((sum, r) => sum + (r.rowsUpdated || 0), 0);
  console.log(`  Total core_doc rows updated: ${totalRows}`);

  if (skipped.length) {
    console.log('\nSkipped files (need manual sourcing):');
    skipped.forEach((r) => console.log(`  - ${r.docName}`));
  }
  if (errors.length) {
    console.log('\nErrors:');
    errors.forEach((r) => console.log(`  - ${r.docName}: ${r.reason}`));
  }
  console.log();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
