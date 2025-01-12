import * as prompts from '@clack/prompts';

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
      label: 'npm',
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

export async function selectLinter(linters: string[] = ['eslint', 'biome']) {
  return promptsSafe(
    prompts.select({
      message: 'Select linter',
      options: linters.map((v) => ({
        value: v,
        label: v,
      })),
    }),
  );
}
