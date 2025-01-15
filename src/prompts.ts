import * as prompts from '@clack/prompts';
import { glob } from 'glob';
import * as colors from 'picocolors';

export async function promptsSafe<T>(promise: Promise<T | symbol>) {
  const r = await promise;
  if (prompts.isCancel(r)) process.exit(0);
  return r;
}

export async function selectNodeVersion(versions: number[] = [22, 20, 18, 16, 14]) {
  return promptsSafe(
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
  return promptsSafe(
    prompts.select({
      message: 'Select npm registry',
      options: registries,
    }),
  );
}

export async function selectCodeLinter(linters: string[] = ['eslint', 'biome']) {
  return promptsSafe(
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

export async function selectWriteMode(cwd: string, ignoreNames = IGNORE_NAMES) {
  const files = glob
    .sync('*', {
      cwd: cwd,
      nodir: false,
    })
    .filter((name) => !ignoreNames.includes(name));

  prompts.log.warn(`The project directory is: ${colors.yellowBright(cwd)}`);

  if (files.length === 0) {
    return;
  }

  return promptsSafe(
    prompts.select({
      message: colors.bold(colors.red('The project directory already exists. Pick an action')),
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
