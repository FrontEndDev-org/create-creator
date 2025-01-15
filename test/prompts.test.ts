import * as prompts from '@clack/prompts';
import { describe, expect, it, vi } from 'vitest';
import { selectCodeLinter, selectNodeVersion, selectNpmRegistry } from '../src/prompts';

vi.mock('@clack/prompts');

beforeEach(() => {
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
