import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

export const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'test-root-'));

export async function runTest(
  test: (env: { cwd: string }) => Promise<unknown>,
  after?: (env: { cwd: string }) => unknown | Promise<unknown>,
) {
  const cwd = fs.mkdtempSync(path.join(testRoot, 'test-once-'));
  fs.mkdirSync(cwd, { recursive: true });

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
