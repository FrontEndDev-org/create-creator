import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path/posix';
import process from 'node:process';
import fse from 'fs-extra';

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
      await after?.({ cwd });
      fse.removeSync(cwd);
    } catch (cause) {
      //
    }
  }
}

export async function expectExit(promise: Promise<unknown>, exitCode: number) {
  const message = `process.exit=${exitCode};`;
  const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(message);
  });
  await expect(promise).rejects.toThrow(message);
  expect(mockExit).toHaveBeenCalledWith(exitCode);
  mockExit.mockRestore();
}
