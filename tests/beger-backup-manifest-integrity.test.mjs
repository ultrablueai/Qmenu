import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { verifyBackupManifest } from '../scripts/verify-backup-manifest.mjs';

async function fixture() {
 const dir = await mkdtemp(join(tmpdir(),'beger-export-'));
 const files = [];
 for (const name of ['roles.sql','schema.sql','data.sql']) {
   const b = Buffer.from(`-- synthetic fixture ${name}\n`);
   await writeFile(join(dir,name),b);
   files.push({name,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex').toUpperCase()});
 }
 const manifest = {stage_project:'qandxrcuetwzenlqspez',result:'EXPORT_COMPLETE_NOT_RESTORE_VERIFIED',git_sha:'a'.repeat(40),captured_utc:'2026-11-09T12:00:00Z',files};
 await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest));
 return {dir,manifest};
}
test('valid synthetic export passes integrity but NOT restore certification', async () => {
 const {dir}=await fixture();try{assert.deepEqual(await verifyBackupManifest(dir),{ok:true,project:'qandxrcuetwzenlqspez',files:3,restoreVerified:false});}finally{await rm(dir,{recursive:true,force:true});}
});
test('tampered SQL fails closed', async () => {
 const {dir}=await fixture();try{await writeFile(join(dir,'data.sql'),'changed');await assert.rejects(verifyBackupManifest(dir),/mismatch/);}finally{await rm(dir,{recursive:true,force:true});}
});
test('wrong project fails closed', async () => {
 const {dir,manifest}=await fixture();try{manifest.stage_project='fstpxknegaxppjilbnke';await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest));await assert.rejects(verifyBackupManifest(dir),/Wrong staging project/);}finally{await rm(dir,{recursive:true,force:true});}
});
