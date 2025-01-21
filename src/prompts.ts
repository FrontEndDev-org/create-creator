import * as prompts from '@clack/prompts';
import { glob } from 'glob';
import * as colors from 'picocolors';
import { tryFlatten } from 'try-flatten';
import { CreatorError } from './CreatorError';
import type { PkgMeta, WriteMode } from './types';
import { checkPkgVersion, execCommand } from './utils';

export { colors, prompts };

export async function promptSafe<T>(promise: Promise<T | symbol>) {
  const r = await promise;
  if (prompts.isCancel(r)) throw new CreatorError('Operation cancelled');
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

const IGNORE_NAMES = [
  // # Macos
  '.DS_Store',

  // # Windows
  '$RECYCLE.BIN',
  'Desktop.ini',
  'ehthumbs.db',
  'Thumbs.db',

  // # git
  '.git',

  // # Editor directories and files
  '.idea',
  '.vscode',
];

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

  const [err, { stderr, exitCode }] = await execCommand('git init', { cwd });

  if (err) {
    spinner.stop('Git repository initialization failed', exitCode);
    throw new CreatorError(err.message);
  }

  spinner.stop('Git repository initialized', exitCode);
}

export function checkNodeVersion(requiredVersion = 18) {
  const currentVersion = Number.parseInt(process.version.replace(/^\D/, ''));
  const adapted = currentVersion >= requiredVersion;

  if (!adapted) {
    throw new CreatorError(`Your Node.js version is old, please upgrade to ${requiredVersion} or higher`);
  }

  return adapted;
}

export async function checkUpdate(options: PkgMeta & { version: string; projectPath: string }) {
  const { version, name, distTag = 'latest', registry, projectPath } = options;
  const spinner = prompts.spinner();

  spinner.start('Checking for version updates...');
  const [err, newVersion] = await tryFlatten(checkPkgVersion({ name, distTag, registry }));

  if (err) {
    spinner.stop('Failed to check for updates', 1);
    throw new CreatorError(`Failed to check for updates: ${err.message}`);
  }

  spinner.stop('Successfully checked for updates', 0);

  if (version !== newVersion) {
    const command = ['npm', 'create', `${name}@${distTag}`, projectPath].filter(Boolean).join(' ');
    throw new CreatorError(`New version ${newVersion} is available, please use \`${command}\` instead.`);
  }
}
