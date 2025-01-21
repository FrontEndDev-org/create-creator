import fs from 'node:fs';
import path from 'node:path/posix';
import * as prompts from '@clack/prompts';
import * as colors from 'picocolors';
import { describe, expect, it, vi } from 'vitest';
import {
  checkNodeVersion,
  initGitRepo,
  selectCodeLinter,
  selectNodeVersion,
  selectNpmRegistry,
  selectWriteMode,
} from '../src/prompts';
import { runTest } from './helpers';

beforeAll(() => {
  vi.mock('@clack/prompts');
});

afterAll(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

it('should select node version', async () => {
  vi.spyOn(prompts, 'select').mockResolvedValue(18);

  const version = await selectNodeVersion();
  expect(version).toBe(18);
  expect(prompts.select).toHaveBeenCalledWith({
    message: 'Select node version',
    options: expect.arrayContaining([expect.objectContaining({ value: 22 }), expect.objectContaining({ value: 20 })]),
  });
});

it('should select npm registry', async () => {
  vi.spyOn(prompts, 'select').mockResolvedValue('https://registry.npmjs.org');

  const registry = await selectNpmRegistry();
  expect(registry).toBe('https://registry.npmjs.org');
  expect(prompts.select).toHaveBeenCalledWith({
    message: 'Select npm registry',
    options: expect.arrayContaining([
      expect.objectContaining({ value: 'https://registry.npmjs.org' }),
      expect.objectContaining({ value: 'https://registry.npmmirror.com' }),
    ]),
  });
});

it('should select code linter', async () => {
  vi.spyOn(prompts, 'select').mockResolvedValue('eslint');

  const codeLinter = await selectCodeLinter();
  expect(codeLinter).toBe('eslint');
  expect(prompts.select).toHaveBeenCalledWith({
    message: 'Select code linter',
    options: expect.arrayContaining([
      expect.objectContaining({ value: 'eslint' }),
      expect.objectContaining({ value: 'biome' }),
    ]),
  });
});

it('空目录，直接过，无选择', async () => {
  await runTest(async ({ cwd }) => {
    // vi.spyOn(prompts, 'select').mockResolvedValue('overwrite');
    const result = await selectWriteMode(cwd);
    expect(result).toBe('overwrite');
  });
});

it('有文件，默认取消', async () => {
  await runTest(async ({ cwd }) => {
    vi.spyOn(prompts, 'select').mockResolvedValue('cancel');
    fs.writeFileSync(path.join(cwd, 'test.txt'), 'test');
    const result = await selectWriteMode(cwd);
    expect(result).toBe('cancel');
  });
});

it('有文件，选择清空', async () => {
  await runTest(async ({ cwd }) => {
    fs.writeFileSync(path.join(cwd, 'test.txt'), 'test');
    vi.spyOn(prompts, 'select').mockResolvedValue('clean');
    const result = await selectWriteMode(cwd);
    expect(result).toBe('clean');
  });
});

it('成功初始化git仓库', async () => {
  await runTest(async ({ cwd }) => {
    const spinnerSpy = vi.spyOn(prompts, 'spinner').mockReturnValue({
      start: vi.fn(),
      stop: vi.fn(),
      message: vi.fn(),
    });
    await initGitRepo(cwd);
    expect(spinnerSpy).toHaveBeenCalled();
    expect(fs.existsSync(path.join(cwd, '.git'))).toBe(true);
  });
});

describe('Node版本检查', () => {
  it('当当前版本大于要求版本时应返回 true', () => {
    vi.stubGlobal('process', { version: 'v18.0.0' });
    expect(checkNodeVersion(16)).toBe(true);
  });

  it('当当前版本等于要求版本时应返回 true', () => {
    vi.stubGlobal('process', { version: 'v16.0.0' });
    expect(checkNodeVersion(16)).toBe(true);
  });

  it('当当前版本小于要求版本时应返回 false', () => {
    vi.stubGlobal('process', { version: 'v14.0.0' });
    expect(() => checkNodeVersion(16)).toThrowError('old');
  });

  it('应该处理带有额外字符的版本字符串', () => {
    vi.stubGlobal('process', { version: 'v16.12.1-nightly' });
    expect(checkNodeVersion(16)).toBe(true);
  });
});
