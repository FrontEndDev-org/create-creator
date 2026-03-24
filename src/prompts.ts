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
  if (prompts.isCancel(r)) throw new ExitError('操作已取消', 0);
  return r;
}

export async function selectTemplate(templates: string[] | { value: string; label?: string; hint?: string }[]) {
  return promptSafe(
    prompts.select({
      message: '选择一个模板',
      options: templates.map((option) => (typeof option === 'string' ? { value: option } : option)),
    }),
  );
}

export async function selectNodeVersion(versions: number[] = [22, 20, 18, 16, 14]) {
  return promptSafe(
    prompts.select({
      message: '选择 Node 版本',
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
      message: '选择 npm 镜像源',
      options: registries,
    }),
  );
}

export async function selectCodeLinter(linters: string[] = ['eslint', 'biome']) {
  return promptSafe(
    prompts.select({
      message: '选择代码检查工具',
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
      message: colors.bold(colors.red('该目录不为空。请选择操作')),
      options: [
        {
          value: 'cancel',
          label: '取消项目创建',
        },
        {
          value: 'overwrite',
          label: '覆盖现有文件',
        },
        {
          value: 'clean',
          label: '删除所有文件',
        },
      ],
    }),
  );
}

export async function initGitRepo(cwd: string) {
  const spinner = prompts.spinner();
  spinner.start('正在初始化 Git 仓库...');

  const [err, { stdout, stderr, exitCode }] = await execCommand('git init', { cwd });

  if (err) {
    spinner.stop('Git 仓库初始化失败', exitCode);
    prompts.log.error(stderr);
    throw new ExitError(err.message, 1);
  }

  spinner.stop('Git 仓库初始化成功', 0);
}

export function checkNodeVersion(requiredVersion: number) {
  const currentVersion = Number.parseInt(process.version.replace(/^\D/, ''));
  const adapted = currentVersion >= requiredVersion;

  if (!adapted) {
    throw new ExitError(`您的 Node.js 版本较旧，请升级到 ${requiredVersion} 或更高版本`, 1);
  }

  prompts.log.success(`Node.js 版本 ${currentVersion} 与 ${requiredVersion} 兼容`);
}

export async function checkUpdate(options: PkgMeta & { version: string; projectPath: string }) {
  const { version: localVersion, name, distTag = 'latest', registry, projectPath } = options;
  const spinner = prompts.spinner();

  spinner.start('正在检查版本更新...');
  const [err, remoteVersion] = await tryFlatten(checkPkgVersion({ name, distTag, registry }));

  if (err) {
    spinner.stop('检查更新失败', 1);
    throw new ExitError(`检查更新失败: ${err.message}`, 1);
  }

  // 如果当前 package 还没有发布，则远程版本为空
  if (remoteVersion && localVersion !== remoteVersion) {
    spinner.stop(`有新版本 ${remoteVersion} 可用`, 1);
    const command = ['npx', `${name}@${distTag}`, projectPath].filter(Boolean).join(' ');
    throw new ExitError(`请使用 \`${command}\` 命令。`, 1);
  }

  spinner.stop('当前使用的是最新版本', 0);
}
