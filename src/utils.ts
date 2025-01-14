import fs from 'node:fs';

export function isDirectory(p: string): boolean {
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

export function isFile(p: string): boolean {
  return fs.existsSync(p) && fs.statSync(p).isFile();
}
