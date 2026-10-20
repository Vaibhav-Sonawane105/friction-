import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const forbidden = ['PF_DEV_CHALLENGE_CONTROL', 'pf_dev_challenge_overrides', 'Development challenge controls'];
export async function verifyProductionBuild(root) {
  let files = 0;
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await inspect(path);
      else if (entry.name.endsWith('.js')) {
        files += 1;
        const contents = await readFile(path, 'utf8');
        if (/ChallengePanel|challengeControls/.test(entry.name) || forbidden.some(value => contents.includes(value))) throw new Error(`Development testing code leaked into release chunk: ${path}`);
      }
    }
  }
  await inspect(resolve(root));
  if (!files) throw new Error('Release output is empty; no JavaScript was verified.');
  return { files };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = fileURLToPath(new URL('../dist/', import.meta.url));
  verifyProductionBuild(root).then(({ files }) => {
    console.log(`Release verified: ${files} JavaScript files contain no development challenge controls.`);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
