import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as clackPrompts from '@clack/prompts';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildCreator } from '../src';
import * as prompts from '../src/prompts';

vi.mock('@clack/prompts');
vi.mock('../src/prompts');

let tempDir: string;
let templatesRoot: string;
let templateRoot: string;
let projectRoot: string;
const nodeVersion = Math.random();
const npmRegistry = Math.random().toString();
const linter = Math.random().toString();
const projectName = Math.random().toString();

beforeAll(async () => {
  // 创建临时目录
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-creator-'));
  templatesRoot = path.join(tempDir, 'templates');
  projectRoot = path.join(tempDir, projectName);

  // 创建测试模板
  templateRoot = path.join(templatesRoot, 'default');
  fs.mkdirSync(templateRoot, { recursive: true });

  // 创建测试模板文件
  fs.writeFileSync(path.join(templateRoot, 'test.txt.ejs'), 'Hello <%= ctx.projectName %>');
  fs.mkdirSync(path.join(templateRoot, 'path/to'), { recursive: true });
  fs.writeFileSync(path.join(templateRoot, 'path/to/test.txt'), 'Hello <%= ctx.projectName %>');
});

afterAll(() => {
  // 清理临时目录
  fs.rmSync(tempDir, { recursive: true, force: true });
});

beforeEach(() => {
  // 创建项目目录
  fs.mkdirSync(projectRoot, { recursive: true });
  vi.spyOn(clackPrompts, 'select').mockResolvedValue('overwrite');
  vi.spyOn(prompts, 'selectNodeVersion').mockResolvedValue(nodeVersion);
  vi.spyOn(prompts, 'selectNpmRegistry').mockResolvedValue(npmRegistry);
  vi.spyOn(prompts, 'selectLinter').mockResolvedValue(linter);
});

afterEach(() => {
  // 清理项目目录
  fs.rmSync(projectRoot, { recursive: true, force: true });
  vi.clearAllMocks();
});

it('调用 onStart onEnd', async () => {
  const mockOnStart = vi.fn();
  const mockOnEnd = vi.fn();

  await buildCreator({
    templatesRoot,
    projectPath: projectRoot,
    onStart: mockOnStart,
    onEnd: mockOnEnd,
  });

  expect(mockOnStart).toHaveBeenCalled();
  expect(mockOnEnd).toHaveBeenCalled();
});

it('空目录', async () => {
  const emptyTemplatesRoot = path.join(tempDir, 'empty-templates');
  fs.mkdirSync(emptyTemplatesRoot);

  await expect(
    buildCreator({
      templatesRoot: emptyTemplatesRoot,
      projectPath: projectRoot,
    }),
  ).rejects.toThrow();
});

it('覆盖模式', async () => {
  fs.writeFileSync(path.join(projectRoot, 'test.txt'), 'old content');

  await buildCreator({
    templatesRoot,
    projectPath: projectRoot,
  });

  // 验证文件被覆盖
  const content = fs.readFileSync(path.join(projectRoot, 'test.txt'), 'utf8');
  expect(content).toMatch(/Hello/);
});

it('清空模式', async () => {
  // 创建已有项目目录
  fs.mkdirSync(projectRoot, { recursive: true });
  fs.writeFileSync(path.join(projectRoot, 'existing.txt'), 'old content');

  vi.spyOn(clackPrompts, 'select').mockResolvedValue('clean');

  await buildCreator({
    templatesRoot,
    projectPath: projectRoot,
  });

  // 验证旧文件被删除
  expect(fs.existsSync(path.join(projectRoot, 'existing.txt'))).toBe(false);
});

it('取消模式', async () => {
  vi.spyOn(clackPrompts, 'select').mockResolvedValue('cancel');

  // 创建已有项目目录
  fs.mkdirSync(projectRoot, { recursive: true });
  fs.writeFileSync(path.join(projectRoot, 'existing.txt'), 'old content');

  await expect(
    buildCreator({
      templatesRoot,
      projectPath: projectRoot,
    }),
  ).rejects.toThrow();

  expect(fs.existsSync(path.join(projectRoot, 'test.txt'))).toBe(false);
});

it('EJS 文件渲染', async () => {
  await buildCreator({
    templatesRoot,
    projectPath: projectRoot,
  });

  const content = fs.readFileSync(path.join(projectRoot, 'test.txt'), 'utf8');
  expect(content.trim()).toEqual(`Hello ${projectName}`);
});

it('自定义扩展数据', async () => {
  const customValue = Math.random().toString();
  const mockExtendData = vi.fn().mockResolvedValue({ customValue });

  fs.writeFileSync(path.join(templateRoot, 'test.txt.ejs'), '<%= customValue %>');

  await buildCreator({
    cwd: tempDir,
    templatesRoot,
    extendData: mockExtendData,
    projectPath: projectName,
  });

  expect(mockExtendData).toHaveBeenCalled();
  console.log(fs.readdirSync(projectRoot));
  const content = fs.readFileSync(path.join(projectRoot, 'test.txt'), 'utf8');
  expect(content.trim()).toEqual(customValue);
});

it('支持写入前判断', async () => {
  const mockCanWrite = vi.fn().mockReturnValue(false);

  await buildCreator({
    templatesRoot,
    canWrite: mockCanWrite,
    projectPath: projectRoot,
  });

  expect(mockCanWrite).toHaveBeenCalled();
  expect(fs.existsSync(path.join(projectRoot, 'test.txt'))).toBe(false);
});

it('自定义写入方法', async () => {
  const mockDoWrite = vi.fn();

  await buildCreator({
    templatesRoot,
    doWrite: mockDoWrite,
  });

  expect(mockDoWrite).toHaveBeenCalled();
});
