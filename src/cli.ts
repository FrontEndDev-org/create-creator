import path from 'node:path/posix';
import process from 'node:process';
import { Creator } from './Creator';
import { CreatorError } from './CreatorError';
import { pkgDescription, pkgName, pkgVersion } from './const';
import { colors, prompts, selectCodeLinter, selectNodeVersion, selectNpmRegistry } from './prompts';
import { execCommand, isDirectory } from './utils';

export async function createCli() {
  const creator = new Creator({
    projectPath: process.argv[2],
    templatesRoot: path.join(__dirname, '../templates'),
    checkNodeVersion: 18,
    checkUpdate: {
      name: pkgName,
      version: pkgVersion,
    },
    async extendData() {
      const nodeVersion = await selectNodeVersion();
      const npmRegistry = await selectNpmRegistry();
      const codeLinter = await selectCodeLinter();

      return {
        nodeVersion,
        npmRegistry,
        codeLinter,
      };
    },
  });

  creator.on('before', () => {
    prompts.intro(colors.bold(colors.bgCyan(` ${pkgName}@${pkgVersion} `)));
    prompts.log.info(pkgDescription);
  });

  creator.on('end', async ({ projectRoot, projectPath }) => {
    if (!isDirectory(path.join(projectRoot, '.git'))) {
      const [err, { stderr, exitCode }] = await execCommand('git init', { cwd: projectRoot });

      if (err) {
        prompts.log.error(stderr);
        throw new CreatorError('Failed to initialize git repository');
      }

      prompts.log.success('Git repository initialized');
    }

    prompts.log.success('The project has been created successfully!');
    prompts.log.success(`${colors.bold(colors.greenBright(`cd ${projectPath}`))} to start your coding journey`);
    prompts.outro('🎉🎉🎉');
  });

  creator.writeIntercept(['default/templates/**/*.ejs'], (meta, data) => ({
    disableRenderEjs: true,
    targetFileName: meta.sourceFileName,
  }));

  creator.writeIntercept(['**/eslint*', '**/prettier*', '**/_prettier*'], (meta, data) => ({
    disableWrite: data.codeLinter !== 'eslint',
  }));

  creator.writeIntercept(['**/biome.*'], (meta, data) => ({
    disableWrite: data.codeLinter !== 'biome',
  }));

  await creator.create();
}
