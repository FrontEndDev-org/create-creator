import fs from 'node:fs';
import path from 'node:path/posix';
import process from 'node:process';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createCli } from '../src';
import * as prompts from '../src/prompts.ts';
import { isDirectory, isFile } from '../src/utils.ts';
import { expectExit, runTest } from './helpers.ts';

const cwd = process.cwd();
const argv = process.argv;
const nodeVersion = Math.random();
const npmRegistry = Math.random().toString();

beforeAll(() => {
  // vi.mock('@clack/prompts');
  // vi.mock('../src/prompts');
  vi.spyOn(prompts, 'selectNodeVersion').mockResolvedValue(nodeVersion);
  vi.spyOn(prompts, 'selectNpmRegistry').mockResolvedValue(npmRegistry);
  vi.spyOn(prompts, 'selectWriteMode').mockResolvedValue('overwrite');
});

afterAll(() => {
  vi.clearAllMocks();
});

it('创建新脚手架 + eslint', async () => {
  await runTest(async ({ cwd }) => {
    const projectName = Math.random().toString();
    const toAbs = (p: string) => path.join(cwd, projectName, p);
    const readFile = (p: string) => fs.readFileSync(toAbs(p), 'utf-8');

    process.chdir(cwd);
    process.argv = ['', '', projectName];
    vi.spyOn(prompts, 'selectCodeLinter').mockResolvedValue('eslint');

    await expectExit(createCli());

    expect(isDirectory(toAbs('.'))).toBeTruthy();
    expect(isDirectory(toAbs('.git'))).toBeTruthy();
    expect(isFile(toAbs('biome.jsonc'))).toBeFalsy();
    expect(isFile(toAbs('eslint.config.mjs'))).toBeTruthy();
    expect(isFile(toAbs('prettier.config.mjs'))).toBeTruthy();
    expect(isFile(toAbs('.prettierignore'))).toBeTruthy();
    expect(readFile('.nvmrc').trim()).toEqual(nodeVersion.toString());
    expect(readFile('.npmrc')).toMatch(`registry=${npmRegistry}`);
    expect(readFile('README.md')).toMatch(`# ${projectName}`);
  });
});

it('创建新脚手架 + biome', async () => {
  await runTest(async ({ cwd }) => {
    const toAbs = (p: string) => path.join(cwd, projectName, p);
    const readFile = (p: string) => fs.readFileSync(toAbs(p), 'utf-8');
    const projectName = Math.random().toString();

    process.chdir(cwd);
    vi.spyOn(prompts, 'selectCodeLinter').mockResolvedValue('biome');
    process.argv = ['', '', projectName];

    await expectExit(createCli());

    expect(isDirectory(toAbs('.'))).toBeTruthy();
    expect(isDirectory(toAbs('.git'))).toBeTruthy();
    expect(isFile(toAbs('biome.jsonc'))).toBeTruthy();
    expect(isFile(toAbs('eslint.config.mjs'))).toBeFalsy();
    expect(isFile(toAbs('prettier.config.mjs'))).toBeFalsy();
    expect(isFile(toAbs('.prettierignore'))).toBeFalsy();
    expect(readFile('.nvmrc').trim()).toEqual(nodeVersion.toString());
    expect(readFile('.npmrc')).toMatch(`registry=${npmRegistry}`);
    expect(readFile('README.md')).toMatch(`# ${projectName}`);
  });
});
