import { expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyProductionBuild } from './verify-production-build';

it('inspects nested release chunks and fails if test controls leak into any chunk', async () => {
  const root = await mkdtemp(join(tmpdir(), 'friction-release-'));
  const assets = join(root, 'assets'); await mkdir(assets);
  try {
    await writeFile(join(root, 'background.js'), 'export const ready = true;');
    await writeFile(join(assets, 'lazy.js'), 'export const value = 1;');
    expect((await verifyProductionBuild(root)).files).toBe(2);
    await writeFile(join(assets, 'lazy.js'), 'const type = "PF_DEV_CHALLENGE_CONTROL";');
    await expect(verifyProductionBuild(root)).rejects.toThrow(/lazy.js/);
  } finally {
    await unlink(join(root, 'background.js')); await unlink(join(assets, 'lazy.js'));
    await rmdir(assets); await rmdir(root);
  }
});
it('rejects an empty output directory rather than claiming it is a safe build', async () => {
  const root = await mkdtemp(join(tmpdir(), 'friction-empty-'));
  try { await expect(verifyProductionBuild(root)).rejects.toThrow(/empty/i); } finally { await rmdir(root); }
});
