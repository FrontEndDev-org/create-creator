import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import * as clackPrompts from '@clack/prompts';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createCLI, selectLinter, selectNodeVersion, selectNpmRegistry } from '../src';
import * as prompts from '../src/prompts.ts';
import { isDirectory, isFile } from '../src/utils.ts';

const cwd = process.cwd();
const argv = process.argv;
const nodeVersion = Math.random();
const npmRegistry = Math.random().toString();
const projectName = Math.random().toString();

beforeAll(() => {
  vi.mock('@clack/prompts');
  vi.mock('../src/prompts');
  vi.spyOn(clackPrompts, 'select').mockResolvedValue('overwrite');
  vi.spyOn(prompts, 'selectNodeVersion').mockResolvedValue(nodeVersion);
  vi.spyOn(prompts, 'selectNpmRegistry').mockResolvedValue(npmRegistry);

  process.argv = ['', '', projectName];
});

afterAll(() => {
  process.chdir(cwd);
  process.argv = argv;
  vi.clearAllMocks();
});

it('创建新脚手架 + eslint', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-cli-'));

  try {
    const toAbs = (p: string) => path.join(tempDir, projectName, p);
    const readFile = (p: string) => fs.readFileSync(toAbs(p), 'utf-8');

    process.chdir(tempDir);
    vi.spyOn(prompts, 'selectLinter').mockResolvedValue('eslint');

    await createCLI();

    expect(isDirectory(toAbs('.'))).toBeTruthy();
    expect(isFile(toAbs('biome.jsonc'))).toBeFalsy();
    expect(isFile(toAbs('eslint.config.mjs'))).toBeTruthy();
    expect(isFile(toAbs('prettier.config.mjs'))).toBeTruthy();
    expect(isFile(toAbs('.prettierignore'))).toBeTruthy();
    expect(readFile('.nvmrc').trim()).toEqual(nodeVersion.toString());
    expect(readFile('.npmrc')).toMatch(`registry=${npmRegistry}`);
    expect(readFile('README.md')).toMatch(`# ${projectName}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

it('创建新脚手架 + biome', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-cli-'));

  try {
    const toAbs = (p: string) => path.join(tempDir, projectName, p);
    const readFile = (p: string) => fs.readFileSync(toAbs(p), 'utf-8');

    process.chdir(tempDir);
    vi.spyOn(prompts, 'selectLinter').mockResolvedValue('biome');

    await createCLI();

    expect(isDirectory(toAbs('.'))).toBeTruthy();
    expect(isFile(toAbs('biome.jsonc'))).toBeTruthy();
    expect(isFile(toAbs('eslint.config.mjs'))).toBeFalsy();
    expect(isFile(toAbs('prettier.config.mjs'))).toBeFalsy();
    expect(isFile(toAbs('.prettierignore'))).toBeFalsy();
    expect(readFile('.nvmrc').trim()).toEqual(nodeVersion.toString());
    expect(readFile('.npmrc')).toMatch(`registry=${npmRegistry}`);
    expect(readFile('README.md')).toMatch(`# ${projectName}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});
