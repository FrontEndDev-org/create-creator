import path from 'node:path';
import process from 'node:process';
import { pkgDescription, pkgName, pkgVersion } from './const';
import { createCreator } from './creator';
import { selectCodeLinter, selectNodeVersion, selectNpmRegistry } from './prompts';
import { execCommand, isDirectory } from './utils';

const disableWrites = {
  eslint: ['biome'],
  biome: ['eslint', 'prettier'],
};

export async function createCLI() {
  return createCreator({
    projectPath: process.argv[2],
    templatesRoot: path.join(__dirname, '../templates'),
    onStart({ prompts, colors }) {
      prompts.intro(colors.bold(colors.bgCyan(` ${pkgName}@${pkgVersion} `)));
      prompts.log.info(pkgDescription);
    },
    async onEnd({ prompts, colors, projectRoot, projectPath }) {
      if (!isDirectory(path.join(projectRoot, '.git'))) {
        const [err, { stderr, exitCode }] = await execCommand('git init', { cwd: projectRoot });

        if (err) {
          prompts.log.error(stderr);
          prompts.cancel('Failed to initialize git repository');
          process.exit(exitCode);
        } else {
          prompts.log.success('Git repository initialized');
        }
      }

      prompts.log.success('The project has been created successfully!');
      prompts.log.success(`${colors.bold(colors.greenBright(`cd ${projectPath}`))} to start your coding journey`);
      prompts.outro('🎉🎉🎉');
    },
    async extendData({ prompts }) {
      const nodeVersion = await selectNodeVersion();
      const npmRegistry = await selectNpmRegistry();
      const codeLinter = await selectCodeLinter();

      return {
        nodeVersion,
        npmRegistry,
        codeLinter,
      };
    },
    canWrite(meta, data) {
      const disables = disableWrites[data.codeLinter as keyof typeof disableWrites];
      const targetName = path.basename(meta.targetPath);

      if (disables.some((d) => targetName.includes(d))) return false;

      return true;
    },
  });
}
