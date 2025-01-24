import path from 'node:path/posix';
import process from 'node:process';
import { Creator } from './Creator';
import { pkgDescription, pkgName, pkgVersion } from './const';
import {
  checkNodeVersion,
  checkUpdate,
  colors,
  initGitRepo,
  prompts,
  selectCodeLinter,
  selectNodeVersion,
  selectNpmRegistry,
} from './prompts';

export async function createCLI() {
  const creator = new Creator({
    projectPath: process.argv[2],
    templatesRoot: path.join(__dirname, '../templates'),
    async extendData({ projectName }) {
      const nodeVersion = await selectNodeVersion();
      const npmRegistry = await selectNpmRegistry();
      const codeLinter = await selectCodeLinter();

      return {
        packageName: projectName.startsWith('create-') ? projectName : `create-${projectName}`,
        nodeVersion,
        npmRegistry,
        codeLinter,
      };
    },
  });

  creator.on('before', async ({ projectPath }) => {
    prompts.intro(colors.bold(colors.bgCyan(` ${pkgName}@${pkgVersion} `)));
    prompts.log.info(pkgDescription);
    checkNodeVersion(18);

    if (process.env.TEST) return;

    await checkUpdate({
      name: pkgName,
      version: pkgVersion,
      projectPath,
    });
  });

  creator.on('end', async ({ projectRoot, projectPath }) => {
    await initGitRepo(projectRoot);

    prompts.log.success('The project has been created successfully');
    prompts.log.success(`${colors.bold(colors.greenBright(`cd ${projectPath}`))} to start your coding journey`);
    prompts.outro('🎉🎉🎉');
  });

  creator.writeIntercept(['*/_gitignore'], (meta) => ({
    targetFileName: meta.targetFileName.replace('_', '.'),
  }));

  creator.writeIntercept(['*/templates/**/*.ejs'], (meta, data) => ({
    disableRenderEjs: true,
    targetFileName: meta.sourceFileName,
  }));

  creator.writeIntercept(['*/eslint*', '*/prettier*', '*/_prettier*'], (meta, data) => ({
    disableWrite: data.codeLinter !== 'eslint',
  }));

  creator.writeIntercept(['*/biome.*'], (meta, data) => ({
    disableWrite: data.codeLinter !== 'biome',
  }));

  await creator.create();
}
