// Offline integrity gate for the Staging logical SQL export manifest.
// This does not decrypt, restore, or certify that the backup is recoverable.
import { readFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, resolve, join } from 'node:path';

const EXPECTED_PROJECT = 'qandxrcuetwzenlqspez';
const FILES = ['roles.sql', 'schema.sql', 'data.sql'];

export async function verifyBackupManifest(directory) {
  const folder = resolve(directory);
  const manifest = JSON.parse(await readFile(join(folder, 'manifest.json'), 'utf8'));
  if (manifest.stage_project !== EXPECTED_PROJECT) throw Error('Wrong staging project');
  if (manifest.result !== 'EXPORT_COMPLETE_NOT_RESTORE_VERIFIED') throw Error('Wrong export status');
  if (!/^[a-f0-9]{40}$/i.test(manifest.git_sha ?? '')) throw Error('Invalid source SHA');
  if (!Number.isFinite(Date.parse(manifest.captured_utc))) throw Error('Invalid backup timestamp');
  if (!Array.isArray(manifest.files) || manifest.files.length !== FILES.length) throw Error('Manifest must contain exactly three dump files');
  for (const expected of FILES) {
    const entries = manifest.files.filter(f => f.name === expected);
    if (entries.length !== 1 || basename(entries[0].name) !== expected) throw Error(`Missing or duplicate ${expected}`);
    const item = entries[0];
    if (!Number.isSafeInteger(item.bytes) || item.bytes <= 0 || !/^[a-f0-9]{64}$/i.test(item.sha256)) throw Error(`Invalid manifest metadata for ${expected}`);
    const path = join(folder, expected);
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size !== item.bytes) throw Error(`Size or file type mismatch: ${expected}`);
    const data = await readFile(path);
    const digest = createHash('sha256').update(data).digest('hex');
    if (digest.toLowerCase() !== item.sha256.toLowerCase()) throw Error(`Checksum mismatch: ${expected}`);
  }
  return { ok: true, project: EXPECTED_PROJECT, files: FILES.length, restoreVerified: false };
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  try {
    if (!process.argv[2]) throw Error('Usage: node scripts/verify-backup-manifest.mjs <private-backup-directory>');
    const result = await verifyBackupManifest(process.argv[2]);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('BACKUP_INTEGRITY_FAILED:', error.message);
    process.exitCode = 1;
  }
}
