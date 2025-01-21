import path from 'node:path/posix';
import process from 'node:process';
import { Creator } from 'create-creator';

export async function createCLI() {
  const creator = new Creator({
    projectPath: process.argv[2],
    templatesRoot: path.join(__dirname, '../templates'),
  });

  // create 方法不会抛错，不必捕获
  await creator.create();
}
