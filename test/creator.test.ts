import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as clackPrompts from '@clack/prompts';
import * as colors from 'picocolors';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createCreator } from '../src';
import * as prompts from '../src/prompts';
import { execCommand, isDirectory, isFile } from '../src/utils';
import { runTest } from './helpers';

let templatesRoot: string;
let templateRoot: string;
const nodeVersion = Math.random();
const npmRegistry = Math.random().toString();
const linter = Math.random().toString();
const projectName = Math.random().toString();

beforeAll(async () => {
  templatesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'templates-'));
  templateRoot = path.join(templatesRoot, 'default');
  fs.mkdirSync(templateRoot, { recursive: true });
  // 创建测试模板文件
  fs.writeFileSync(path.join(templateRoot, 'test.txt.ejs'), 'Hello <%= ctx.projectName %>');
  fs.mkdirSync(path.join(templateRoot, 'path/to'), { recursive: true });
  fs.writeFileSync(path.join(templateRoot, 'path/to/test.txt'), 'Hello <%= ctx.projectName %>');
});

afterAll(() => {
  vi.clearAllMocks();
  fs.rmSync(templatesRoot, { recursive: true, force: true });
});

beforeEach(() => {
  vi.spyOn(prompts, 'selectWriteMode').mockResolvedValue('overwrite');
  vi.spyOn(prompts, 'selectNodeVersion').mockResolvedValue(nodeVersion);
  vi.spyOn(prompts, 'selectNpmRegistry').mockResolvedValue(npmRegistry);
  vi.spyOn(prompts, 'selectCodeLinter').mockResolvedValue(linter);
});

afterEach(() => {
  vi.resetAllMocks();
});

it('调用 onStart onEnd', async () => {
  await runTest(async ({ cwd }) => {
    const mockOnStart = vi.fn();
    const mockOnEnd = vi.fn();

    await createCreator({
      cwd,
      templatesRoot,
      onStart: mockOnStart,
      onEnd(context) {
        mockOnEnd();
        expect(context.cwd).toEqual(cwd);
        expect(context.writeMode).toEqual('overwrite');
        expect(context.templatesRoot).toEqual(templatesRoot);
        expect(context.templateRoot).toEqual(templateRoot);
        expect(context.templateName).toEqual('default');
        expect(context.projectRoot).toEqual(cwd);
        expect(context.projectName).toEqual(path.basename(cwd));
        expect(context.projectPath).toEqual('.');
        expect(context.prompts).toBe(clackPrompts);
        expect(context.colors).toBe(colors);
        expect(context.execCommand).toBe(execCommand);
      },
    });

    expect(mockOnStart).toHaveBeenCalled();
    expect(mockOnEnd).toHaveBeenCalled();
  });
});

it('空目录', async () => {
  await runTest(async ({ cwd }) => {
    const emptyTemplatesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-templates-'));

    await expect(
      createCreator({
        cwd,
        templatesRoot: emptyTemplatesRoot,
      }),
    ).rejects.toThrow();
  });
});

it('覆盖模式', async () => {
  await runTest(async ({ cwd }) => {
    fs.writeFileSync(path.join(cwd, 'test.txt'), 'old content');

    await createCreator({
      cwd,
      templatesRoot,
    });

    // 验证文件被覆盖
    const content = fs.readFileSync(path.join(cwd, 'test.txt'), 'utf8');
    expect(content).toMatch(/Hello/);
  });
});

it('清空模式', async () => {
  await runTest(async ({ cwd }) => {
    fs.writeFileSync(path.join(cwd, 'existing.txt'), 'old content');
    vi.spyOn(prompts, 'selectWriteMode').mockResolvedValue('clean');
    await createCreator({
      cwd,
      templatesRoot,
    });

    // 验证旧文件被删除
    expect(fs.existsSync(path.join(cwd, 'existing.txt'))).toBe(false);
  });
});

it('取消模式', async () => {
  await runTest(async ({ cwd }) => {
    vi.spyOn(prompts, 'selectWriteMode').mockResolvedValue('cancel');
    fs.writeFileSync(path.join(cwd, 'existing.txt'), 'old content');

    await expect(
      createCreator({
        cwd,
        templatesRoot,
      }),
    ).rejects.toThrow();

    expect(fs.existsSync(path.join(cwd, 'test.txt'))).toBe(false);
  });
});

it('EJS 文件渲染', async () => {
  await runTest(async ({ cwd }) => {
    await createCreator({
      cwd,
      templatesRoot,
      projectPath: projectName,
    });

    const content = fs.readFileSync(path.join(cwd, projectName, 'test.txt'), 'utf8');
    expect(content.trim()).toEqual(`Hello ${projectName}`);
  });
});

it('自定义扩展数据', async () => {
  await runTest(async ({ cwd }) => {
    const customValue = Math.random().toString();
    const mockExtendData = vi.fn().mockResolvedValue({ customValue });

    fs.writeFileSync(path.join(templateRoot, 'test.txt.ejs'), '<%= customValue %>');

    await createCreator({
      cwd,
      templatesRoot,
      extendData: mockExtendData,
    });

    expect(mockExtendData).toHaveBeenCalled();
    const content = fs.readFileSync(path.join(cwd, 'test.txt'), 'utf8');
    expect(content.trim()).toEqual(customValue);
  });
});

it('支持写入前判断', async () => {
  await runTest(async ({ cwd }) => {
    const mockCanWrite = vi.fn().mockReturnValue(false);

    await createCreator({
      cwd,
      templatesRoot,
      canWrite: mockCanWrite,
    });

    expect(mockCanWrite).toHaveBeenCalled();
    expect(fs.existsSync(path.join(cwd, 'test.txt'))).toBe(false);
  });
});

it('自定义写入方法', async () => {
  await runTest(async ({ cwd }) => {
    const mockDoWrite = vi.fn();

    await createCreator({
      cwd,
      templatesRoot,
      doWrite: mockDoWrite,
    });

    expect(mockDoWrite).toHaveBeenCalled();
  });
});
