import * as prompts from '@clack/prompts';
import { glob } from 'glob';
import * as colors from 'picocolors';
import { tryFlatten } from 'try-flatten';
import { ExitError } from './ExitError';
import { IGNORE_NAMES } from './const';
import type { PkgMeta, WriteMode } from './types';
import { checkPkgVersion, execCommand } from './utils';

export { colors, prompts };

export async function promptSafe<T>(promise: Promise<T | symbol>) {
  const r = await promise;
  if (prompts.isCancel(r)) throw new ExitError('Operation cancelled', 0);
  return r;
}

export async function selectNodeVersion(versions: number[] = [22, 20, 18, 16, 14]) {
  return promptSafe(
    prompts.select({
      message: 'Select node version',
      options: versions.map((v) => ({
        value: v,
        label: `v${v}.x`,
      })),
    }),
  );
}

export async function selectNpmRegistry(
  registries: { value: string; label: string }[] = [
    {
      value: 'https://registry.npmjs.org',
      label: 'npm official',
    },
    {
      value: 'https://registry.npmmirror.com',
      label: 'npmmirror',
    },
  ],
) {
  return promptSafe(
    prompts.select({
      message: 'Select npm registry',
      options: registries,
    }),
  );
}

export async function selectCodeLinter(linters: string[] = ['eslint', 'biome']) {
  return promptSafe(
    prompts.select({
      message: 'Select code linter',
      options: linters.map((v) => ({
        value: v,
        label: v,
      })),
    }),
  );
}

export async function selectWriteMode(cwd: string, ignoreNames = IGNORE_NAMES): Promise<WriteMode> {
  const files = glob
    .sync('*', {
      cwd: cwd,
      nodir: false,
    })
    .filter((name) => !ignoreNames.includes(name));

  if (files.length === 0) {
    return 'overwrite';
  }

  return promptSafe(
    prompts.select({
      message: colors.bold(colors.red('The directory is NOT empty. Pick an action')),
      options: [
        {
          value: 'cancel',
          label: 'Cancel project creation',
        },
        {
          value: 'overwrite',
          label: 'Overwrite existing files',
        },
        {
          value: 'clean',
          label: 'Remove all files',
        },
      ],
    }),
  );
}

export async function initGitRepo(cwd: string) {
  const spinner = prompts.spinner();
  spinner.start('Initializing Git repository...');

  const [err, { stdout, stderr, exitCode }] = await execCommand('git init', { cwd });

  if (err) {
    spinner.stop('Git repository initialization failed', exitCode);
    prompts.log.error(stderr);
    throw new ExitError(err.message, 1);
  }

  spinner.stop(stdout, 0);
}

export function checkNodeVersion(requiredVersion: number) {
  const currentVersion = Number.parseInt(process.version.replace(/^\D/, ''));
  const adapted = currentVersion >= requiredVersion;

  if (!adapted) {
    throw new ExitError(`Your Node.js version is old, please upgrade to ${requiredVersion} or higher`, 1);
  }

  prompts.log.success(`Node.js version ${currentVersion} is compatible with ${requiredVersion}`);
}

export async function checkUpdate(options: PkgMeta & { version: string; projectPath: string }) {
  const { version: localVersion, name, distTag = 'latest', registry, projectPath } = options;
  const spinner = prompts.spinner();

  spinner.start('Checking for version updates...');
  const [err, remoteVersion] = await tryFlatten(checkPkgVersion({ name, distTag, registry }));

  if (err) {
    spinner.stop('Failed to check for updates', 1);
    throw new ExitError(`Failed to check for updates: ${err.message}`, 1);
  }

  if (localVersion !== remoteVersion) {
    const command = ['npm', 'create', `${name}@${distTag}`, projectPath].filter(Boolean).join(' ');
    throw new ExitError(`New version ${remoteVersion} is available, please use \`${command}\` command instead.`, 1);
  }

  spinner.stop('Currently using the latest version', 0);
}
