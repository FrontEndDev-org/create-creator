import path from 'node:path';
import process from 'node:process';
import { Creator } from 'create-creator';
import { pkgDescription, pkgName, pkgVersion } from './const';

export async function createCLI() {
  const creator = new Creator({
    projectPath: process.argv[2],
    templatesRoot: path.join(__dirname, '../templates'),
  });

  creator.on('start', ({ prompts, colors }) => {
    prompts.intro(colors.bold(colors.bgCyan(` ${pkgName}@${pkgVersion} `)));
    prompts.log.info(pkgDescription);
  });

  creator.on('end', ({ prompts, colors, projectPath }) => {
    prompts.log.success('The project has been created successfully!');
    prompts.log.success(`${colors.bold(colors.greenBright(`cd ${projectPath}`))} to start your coding journey`);
    prompts.outro('🎉🎉🎉');
  });

  await creator.create();
}
