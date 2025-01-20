import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import * as clackPrompts from '@clack/prompts';
import fse from 'fs-extra';
import * as colors from 'picocolors';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { Creator } from '../src';
import * as prompts from '../src/prompts';
import { execCommand, isFile } from '../src/utils';
import { runTest, testRoot } from './helpers';

let templatesRoot: string;
let templateRoot: string;
const nodeVersion = Math.random();
const npmRegistry = Math.random().toString();
const linter = Math.random().toString();
const projectName = Math.random().toString();

beforeAll(async () => {
  templatesRoot = fs.mkdtempSync(path.join(testRoot, 'templates-'));
  templateRoot = path.join(templatesRoot, 'default');
  // 创建测试模板文件
  fse.outputFileSync(path.join(templateRoot, 'file1.txt.ejs'), 'Hello <%= ctx.projectName %>');
  fse.outputFileSync(path.join(templateRoot, '__file2.txt.ejs'), 'Hello <%= ctx.projectName %>');
  fse.outputFileSync(path.join(templateRoot, '_file3.txt.ejs'), 'Hello <%= ctx.projectName %>');
  fse.outputFileSync(path.join(templateRoot, 'path/to/file4.txt'), 'Hello <%= ctx.projectName %>');
  vi.mock('@clack/prompts');
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

it('应该调用 onStart 和 onEnd', async () => {
  await runTest(async ({ cwd }) => {
    const mockOnStart = vi.fn();
    const mockOnEnd = vi.fn();
    const creator = new Creator({
      cwd,
      templatesRoot,
    });

    creator.on('start', mockOnStart);
    creator.on('end', mockOnEnd);
    creator.on('end', (context) => {
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
    });

    await creator.create();

    expect(mockOnStart).toHaveBeenCalled();
    expect(mockOnEnd).toHaveBeenCalled();
  });
});

it('空模板目录应该报错', async () => {
  await runTest(async ({ cwd }) => {
    const emptyTemplatesRoot = fs.mkdtempSync(path.join(cwd, 'empty-templates-'));

    const creator = new Creator({
      cwd,
      templatesRoot: emptyTemplatesRoot,
    });
    await expect(creator.create()).rejects.toThrow();
  });
});

it('覆盖模式应该覆盖现有文件', async () => {
  await runTest(async ({ cwd }) => {
    fs.writeFileSync(path.join(cwd, 'test.txt'), 'old content');

    const creator = new Creator({
      cwd,
      templatesRoot,
    });
    await creator.create();

    // 验证文件被覆盖
    const content = fs.readFileSync(path.join(cwd, 'file1.txt'), 'utf8');
    expect(content).toMatch(/Hello/);
  });
});

it('清空模式应该删除所有文件', async () => {
  await runTest(async ({ cwd }) => {
    fs.writeFileSync(path.join(cwd, 'existing.txt'), 'old content');
    vi.spyOn(prompts, 'selectWriteMode').mockResolvedValue('clean');
    const creator = new Creator({
      cwd,
      templatesRoot,
    });
    await creator.create();

    // 验证旧文件被删除
    expect(fs.existsSync(path.join(cwd, 'existing.txt'))).toBe(false);
  });
});

it('取消模式应该中止创建', async () => {
  await runTest(async ({ cwd }) => {
    vi.spyOn(prompts, 'selectWriteMode').mockResolvedValue('cancel');
    fs.writeFileSync(path.join(cwd, 'existing.txt'), 'old content');

    const creator = new Creator({
      cwd,
      templatesRoot,
    });
    await expect(creator.create()).rejects.toThrow();

    expect(fs.existsSync(path.join(cwd, 'test.txt'))).toBe(false);
  });
});

it('EJS 文件应该正确渲染', async () => {
  await runTest(async ({ cwd }) => {
    const creator = new Creator({
      cwd,
      templatesRoot,
      projectPath: projectName,
    });
    await creator.create();

    const content = fs.readFileSync(path.join(cwd, projectName, 'file1.txt'), 'utf8');
    expect(content.trim()).toEqual(`Hello ${projectName}`);
  });
});

it('应该正确处理不同的EJS文件扩展名', async () => {
  await runTest(async ({ cwd }) => {
    const creator = new Creator({
      cwd,
      templatesRoot,
    });
    await creator.create();

    expect(fs.existsSync(path.join(cwd, 'file1.txt'))).toBe(true);
    expect(fs.readFileSync(path.join(cwd, 'file1.txt'), 'utf8')).toMatch(path.basename(cwd));
  });
});

it('应该支持自定义扩展数据', async () => {
  const templatesRoot = fs.mkdtempSync(path.join(testRoot, 'templates-'));
  await runTest(
    async ({ cwd }) => {
      const templateRoot = path.join(templatesRoot, 'default');
      const fileName = `${Math.random().toString(36).slice(2)}.xxx`;
      const customValue = Math.random().toString();
      const mockExtendData = vi.fn().mockResolvedValue({ customValue });

      fse.outputFileSync(path.join(templateRoot, `${fileName}.ejs`), '<%= customValue %>');

      const creator = new Creator({
        cwd,
        templatesRoot,
        extendData: mockExtendData,
      });
      await creator.create();

      expect(mockExtendData).toHaveBeenCalled();
      const content = fs.readFileSync(path.join(cwd, fileName), 'utf8');
      expect(content.trim()).toEqual(customValue);
    },
    () => {
      fs.rmSync(templatesRoot, { recursive: true, force: true });
    },
  );
});

it('应该正确处理下划线前缀文件', async () => {
  await runTest(async ({ cwd }) => {
    const creator = new Creator({
      cwd,
      templatesRoot,
    });
    await creator.create();

    expect(isFile(path.join(cwd, '__file2.txt.ejs'))).toBe(false);
    expect(isFile(path.join(cwd, '__file2.txt'))).toBe(false);
    expect(isFile(path.join(cwd, '_file2.txt'))).toBe(true);
    expect(isFile(path.join(cwd, '.file2.txt'))).toBe(false);

    expect(isFile(path.join(cwd, '_file3.txt.ejs'))).toBe(false);
    expect(isFile(path.join(cwd, '_file3.txt'))).toBe(false);
    expect(isFile(path.join(cwd, '.file3.txt'))).toBe(true);
  });
});

it('应该正确处理点前缀文件', async () => {
  const fileName = `${Math.random().toString(36).slice(2)}.xx`;
  await runTest(async ({ cwd }) => {
    fs.writeFileSync(path.join(templateRoot, `_${fileName}`), 'test content');

    const creator = new Creator({
      cwd,
      templatesRoot,
    });
    await creator.create();

    expect(fs.existsSync(path.join(cwd, `.${fileName}`))).toBe(true);
    expect(fs.existsSync(path.join(cwd, `_${fileName}`))).toBe(false);
  });
});

it('应该正确规范化路径', async () => {
  await runTest(async ({ cwd }) => {
    const mockOnEnd = vi.fn();

    const creator = new Creator({
      cwd: path.join(cwd, 'test\\path'),
      templatesRoot,
    });
    creator.on('end', mockOnEnd);
    await creator.create();

    expect(mockOnEnd).toHaveBeenCalled();
    const context = mockOnEnd.mock.calls[0][0];
    expect(context.cwd).not.toMatch(/\\/);
    expect(context.templatesRoot).not.toMatch(/\\/);
    expect(context.projectRoot).not.toMatch(/\\/);
  });
});

it('写入文件前拦截 disableRenderEjs', async () => {
  await runTest(async ({ cwd }) => {
    const creator = new Creator({
      cwd,
      templatesRoot,
    });

    creator.writeIntercept('**/*.ejs', (meta) => {
      return {
        disableRenderEjs: true,
      };
    });

    await creator.create();

    expect(fs.readFileSync(path.join(cwd, 'file1.txt'), 'utf8')).toMatch('<%=');
    expect(fs.readFileSync(path.join(cwd, 'path/to/file4.txt'), 'utf8')).toMatch('<%=');
  });
});

it('写入文件前拦截 disableWrite', async () => {
  await runTest(async ({ cwd }) => {
    const creator = new Creator({
      cwd,
      templatesRoot,
    });

    creator.writeIntercept('**/*.txt', (meta) => {
      return {
        disableWrite: true,
      };
    });

    await creator.create();

    expect(isFile(path.join(cwd, 'file1.txt.ejs'))).toBe(false);
    expect(isFile(path.join(cwd, 'file1.txt'))).toBe(true);
    expect(isFile(path.join(cwd, 'path/to/file4.txt'))).toBe(false);
  });
});

it('写入文件前拦截 targetFileName', async () => {
  await runTest(async ({ cwd }) => {
    const creator = new Creator({
      cwd,
      templatesRoot,
    });

    creator.writeIntercept('**/*.ejs', (meta) => {
      return {
        targetFileName: meta.sourceFileName,
      };
    });

    creator.writeIntercept('**/*.txt', (meta) => {
      return {
        targetFileName: `${meta.targetFileName}.ok`,
      };
    });

    await creator.create();

    expect(isFile(path.join(cwd, 'file1.txt.ejs'))).toBe(true);
    expect(isFile(path.join(cwd, 'file1.txt'))).toBe(false);

    expect(isFile(path.join(cwd, '__file2.txt.ejs'))).toBe(true);
    expect(isFile(path.join(cwd, '_file3.txt.ejs'))).toBe(true);

    expect(isFile(path.join(cwd, 'path/to/file4.txt'))).toBe(false);
    expect(isFile(path.join(cwd, 'path/to/file4.txt.ok'))).toBe(true);

    expect(fs.readFileSync(path.join(cwd, 'file1.txt.ejs'), 'utf8')).not.toMatch('<%=');
    expect(fs.readFileSync(path.join(cwd, '__file2.txt.ejs'), 'utf8')).not.toMatch('<%=');
    expect(fs.readFileSync(path.join(cwd, '_file3.txt.ejs'), 'utf8')).not.toMatch('<%=');
    expect(fs.readFileSync(path.join(cwd, 'path/to/file4.txt.ok'), 'utf8')).toMatch('<%=');
  });
});

it('外置模板源', async () => {
  await runTest(async ({ cwd }) => {
    const npmRoot = fs.mkdtempSync(path.join(cwd, 'npm-'));
    const createViteRoot = path.join(npmRoot, 'node_modules/create-vite');
    const templatesRoot = fs.mkdtempSync(path.join(cwd, 'templates-'));
    const projectRoot = fs.mkdtempSync(path.join(cwd, 'project-'));
    let templateName = '';

    // 执行创建
    const creator = new Creator({
      cwd: projectRoot,
      templatesRoot: templatesRoot,
    });

    creator.on('before', async ({ execCommand }) => {
      // 安装 create-vite
      fse.outputFileSync(
        path.join(npmRoot, 'package.json'),
        JSON.stringify({
          name: 'test-templates',
          version: '1.0.0',
        }),
      );
      await execCommand('npm install create-vite@6.1.1', { cwd: npmRoot });

      // 移动模板文件到模板根目录
      const dirs = fse.readdirSync(createViteRoot).filter((name) => name.startsWith('template-'));
      templateName = dirs[0];
      vi.spyOn(clackPrompts, 'select').mockResolvedValue(templateName);

      for (const dir of dirs) {
        fse.moveSync(path.join(createViteRoot, dir), path.join(templatesRoot, dir));
      }
    });

    await creator.create();

    // 验证项目名
    const originPkg = fse.readJsonSync(path.join(templatesRoot, templateName, 'package.json')) as {
      name: string;
    };
    const projectPkg = fse.readJsonSync(path.join(projectRoot, 'package.json')) as {
      name: string;
    };
    expect(projectPkg.name).toEqual(originPkg.name);
  });
});
