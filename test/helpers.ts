import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

export function runTest(test: (env: { cwd: string }) => Promise<unknown>) {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  const cwdOriginal = process.cwd();
  process.chdir(tmpdir);
  // fs.mkdtempSync 创建的临时目录是 /var/ 开头的
  // 但，一旦 process.chdir(tmpdir) 后
  // process.chdir 后就变成 /private/var/ 开头的了
  // 因此，取 process.cwd() 而不是 tmpdir
  const cwdReally = process.cwd();
  process.chdir(cwdOriginal);

  try {
    return test({ cwd: cwdReally });
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
}
