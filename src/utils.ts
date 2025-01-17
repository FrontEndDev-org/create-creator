import { type ChildProcess, type ExecOptions, exec } from 'node:child_process';
import fs from 'node:fs';

export function normalizePath(path: string) {
  return path.replace(/\\/g, '/');
}

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
        resolve([error, { stderr: stderrStr, stdout: stdoutStr, exitCode: process.exitCode || 0 }]);
      } else {
        resolve([error, { stderr: stderrStr, stdout: stdoutStr, exitCode: process.exitCode || 0 }]);
      }
    });
  });
}
