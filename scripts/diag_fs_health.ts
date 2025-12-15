#!/usr/bin/env npx tsx
/**
 * Diagnostic: File System Health Check
 * 
 * Safe diagnostic to confirm file access without parsing full JSON.
 * MUST exit in < 2s. Uses hard timeout guard.
 * 
 * Run: npx tsx scripts/diag_fs_health.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// HARD TIMEOUT GUARD - FIRST THING
const TIMEOUT_MS = 1500;
const exitTimer = setTimeout(() => {
    console.error('\n❌ TIMEOUT: Script exceeded 1.5s safety guard');
    process.exit(2);
}, TIMEOUT_MS);

// Unref so it doesn't keep the process alive if we finish early
exitTimer.unref();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_FILE = path.resolve(
    __dirname,
    '../src/docudent/core/billing/knowledgeBase/secondary/commentIndex_analog.json'
);

const MAX_BYTES = 65536; // 64KB
const PRINT_CHARS = 200;

async function runDiagnostic(): Promise<void> {
    const startTime = Date.now();

    console.log('='.repeat(60));
    console.log('DIAGNOSTIC: File System Health Check');
    console.log('='.repeat(60));
    console.log('');

    // 1. Memory stats
    console.log('## Memory Usage');
    const mem = process.memoryUsage();
    console.log(`  rss:      ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  heapUsed: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  heapTotal: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log('');

    // 2. File existence
    console.log('## Target File');
    console.log(`  Path: ${TARGET_FILE}`);

    if (!fs.existsSync(TARGET_FILE)) {
        console.error('  ❌ FILE NOT FOUND');
        clearTimeout(exitTimer);
        process.exit(1);
    }
    console.log('  ✓ File exists');

    // 3. File size
    const stats = fs.statSync(TARGET_FILE);
    console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB (${stats.size} bytes)`);
    console.log('');

    // 4. Stream read first 64KB
    console.log('## Content Preview (first 64KB stream, showing first 200 chars)');

    const chunks: Buffer[] = [];
    let bytesRead = 0;

    await new Promise<void>((resolve, reject) => {
        const stream = fs.createReadStream(TARGET_FILE, {
            highWaterMark: MAX_BYTES,
            start: 0,
            end: MAX_BYTES - 1, // Read at most 64KB
        });

        stream.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
            bytesRead += chunk.length;
        });

        stream.on('end', resolve);
        stream.on('error', reject);
    });

    const preview = Buffer.concat(chunks).toString('utf-8').slice(0, PRINT_CHARS);
    console.log('```');
    console.log(preview + (preview.length >= PRINT_CHARS ? '...' : ''));
    console.log('```');
    console.log('');

    // 5. Final stats
    const elapsed = Date.now() - startTime;
    console.log('## Result');
    console.log(`  ✓ Stream read ${bytesRead} bytes in ${elapsed}ms`);
    console.log(`  ✓ No full JSON parse attempted`);
    console.log('');

    // Success
    clearTimeout(exitTimer);
    console.log('✓ DIAGNOSTIC PASSED');
    process.exit(0);
}

runDiagnostic().catch((err) => {
    console.error('❌ DIAGNOSTIC FAILED:', err.message);
    clearTimeout(exitTimer);
    process.exit(1);
});
