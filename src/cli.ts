import path from 'node:path';
import process from 'node:process';
import { pkgDescription, pkgName, pkgVersion } from './const';
import { buildCreator } from './creator';
import { selectLinter, selectNodeVersion, selectNpmRegistry } from './prompts';

const disableWrites = {
  eslint: ['biome'],
  biome: ['eslint', 'prettier'],
};

export async function createCLI() {
  return buildCreator({
    projectPath: process.argv[2],
    templatesRoot: path.join(__dirname, '../templates'),
    onStart({ prompts }) {
      prompts.intro(`${pkgName}@${pkgVersion}`);
      prompts.log.info(pkgDescription);
    },
    onEnd({ prompts }) {
      prompts.outro('🎉🎉🎉');
    },
    async extendData({ prompts }) {
      const nodeVersion = await selectNodeVersion();
      const npmRegistry = await selectNpmRegistry();
      const linter = await selectLinter();

      return {
        nodeVersion,
        npmRegistry,
        linter,
      };
    },
    canWrite(meta, data) {
      const disables = disableWrites[data.linter as keyof typeof disableWrites];
      const targetName = path.basename(meta.targetPath);

      if (disables.some((d) => targetName.includes(d))) return false;

      return true;
    },
  });
}
