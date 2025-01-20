import fs from 'node:fs';
import path from 'node:path';
import * as prompts from '@clack/prompts';
import * as colors from 'picocolors';
import { describe, expect, it, vi } from 'vitest';
import { selectCodeLinter, selectNodeVersion, selectNpmRegistry, selectWriteMode } from '../src/prompts';
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
