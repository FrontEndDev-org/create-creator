import path from 'node:path';
import process from 'node:process';
import { createCreator } from 'create-creator';
import { pkgDescription, pkgName, pkgVersion } from './const';

export async function createCLI() {
  return createCreator({
    projectPath: process.argv[2],
    templatesRoot: path.join(__dirname, '../templates'),
    onStart({ prompts, colors }) {
      prompts.intro(colors.bold(colors.bgCyan(` ${pkgName}@${pkgVersion} `)));
      prompts.log.info(pkgDescription);
    },
    onEnd({ prompts, colors, projectPath }) {
      prompts.outro(`🎉🎉🎉 ${colors.bold(colors.greenBright(`cd ${projectPath}`))} to start your coding journey`);
    },
  });
}
