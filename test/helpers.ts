import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export const testRoot = path.join(__dirname, '../dist-test');

export async function runTest(
  test: (env: { cwd: string }) => Promise<unknown>,
  after?: (env: { cwd: string }) => unknown | Promise<unknown>,
) {
  fs.mkdirSync(testRoot, { recursive: true });
  const cwd = fs.mkdtempSync(path.join(testRoot, 'test-'));

  try {
    return await test({ cwd });
  } finally {
    try {
      fs.rmSync(cwd, { recursive: true });
      await after?.({ cwd });
    } catch (cause) {
      //
    }
  }
}
