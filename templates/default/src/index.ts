import path from 'node:path';
import { createCreator } from 'create-creator';
import { pkgDescription, pkgName, pkgVersion } from './const';

export function createCLI() {
  return createCreator({
    projectPath: process.argv[2],
    templatesRoot: path.join(__dirname, '../templates'),
    onStart({ prompts, colors }) {
      prompts.intro(colors.bold(colors.bgCyan(` ${pkgName}@${pkgVersion} `)));
      prompts.log.info(pkgDescription);
    },
    onEnd({ prompts }) {
      prompts.outro('🎉🎉🎉');
    }
  });
}
