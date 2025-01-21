import { type ExecOptions, exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path/posix';
import type { CheckPkgUpdate } from './types';

export function isDirectory(p: string): boolean {
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

export function isFile(p: string): boolean {
  return fs.existsSync(p) && fs.statSync(p).isFile();
}

export async function execCommand(
  command: string,
  options?: ExecOptions,
): Promise<[Error | null, { stderr: string; stdout: string; exitCode: number }]> {
  return new Promise((resolve, reject) => {
    const process = exec(command, options, (error, stdout, stderr) => {
      const stdoutStr = stdout.toString();
      const stderrStr = stderr.toString();

      if (error) {
        resolve([error, { stderr: stderrStr, stdout: stdoutStr, exitCode: process.exitCode || 1 }]);
      } else {
        resolve([error, { stderr: stderrStr, stdout: stdoutStr, exitCode: process.exitCode || 1 }]);
      }
    });
  });
}

export async function checkPkgVersion(pkg: CheckPkgUpdate) {
  const url = new URL(pkg.registry || 'https://registry.npmjs.org');
  url.pathname = path.join(pkg.name, pkg.distTag || 'latest');
  url.searchParams.set('t', process.env.TEST ? '1234567890' : Date.now().toString());

  const resp = await fetch(url.toString());
  const { version } = (await resp.json()) as { version: string };

  return version;
}

export function checkNodeVersion(version: number) {
  const nodeVersion = Number.parseInt(process.version.replace(/^\D/, ''));
  return nodeVersion >= version;
}
