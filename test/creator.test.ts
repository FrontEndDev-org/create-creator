import fs from 'node:fs';
import path from 'node:path';
import * as clackPrompts from '@clack/prompts';
import * as colors from 'picocolors';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Creator } from '../src';
import * as prompts from '../src/prompts';
import { execCommand, isDirectory, isFile } from '../src/utils';
import { runTest, testRoot } from './helpers';

let templatesRoot: string;
let templateRoot: string;
const nodeVersion = Math.random();
const npmRegistry = Math.random().toString();
const linter = Math.random().toString();
const projectName = Math.random().toString();

beforeAll(async () => {
  fs.mkdirSync(testRoot, { recursive: true });
  templatesRoot = fs.mkdtempSync(path.join(testRoot, 'templates-'));
  templateRoot = path.join(templatesRoot, 'default');
  fs.mkdirSync(templateRoot, { recursive: true });
  // 创建测试模板文件
  fs.writeFileSync(path.join(templateRoot, 'test.txt.ejs'), 'Hello <%= ctx.projectName %>');
  fs.mkdirSync(path.join(templateRoot, 'path/to'), { recursive: true });
  fs.writeFileSync(path.join(templateRoot, 'path/to/test.txt'), 'Hello <%= ctx.projectName %>');
});

afterAll(() => {
  vi.clearAllMocks();
  // fs.rmSync(templatesRoot, { recursive: true, force: true });
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
    const content = fs.readFileSync(path.join(cwd, 'test.txt'), 'utf8');
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

    const content = fs.readFileSync(path.join(cwd, projectName, 'test.txt'), 'utf8');
    expect(content.trim()).toEqual(`Hello ${projectName}`);
  });
});

it('应该正确处理不同的EJS文件扩展名', async () => {
  await runTest(
    async ({ cwd }) => {
      fs.writeFileSync(path.join(templateRoot, 'test.txt.ejs'), '<%= ctx.projectName %>');
      fs.writeFileSync(path.join(templateRoot, 'test.html.ejs'), '<%= ctx.projectName %>');

      const creator = new Creator({
        cwd,
        templatesRoot,
      });
      await creator.create();

      expect(fs.existsSync(path.join(cwd, 'test.txt'))).toBe(true);
      expect(fs.existsSync(path.join(cwd, 'test.html'))).toBe(true);
    },
    () => {
      fs.rmSync(path.join(templateRoot, 'test.txt.ejs'));
      fs.rmSync(path.join(templateRoot, 'test.html.ejs'));
    },
  );
});

it('应该根据linter选择跳过文件', async () => {
  await runTest(async ({ cwd }) => {
    fs.writeFileSync(path.join(templateRoot, 'biome.jsonc'), '{}');
    fs.writeFileSync(path.join(templateRoot, 'eslint.config.mjs'), '{}');
    fs.writeFileSync(path.join(templateRoot, 'prettier.config.mjs'), '{}');

    const creator = new Creator({
      cwd,
      templatesRoot,
      canWrite(meta, data) {
        const disableWrites = {
          eslint: ['biome'],
          biome: ['eslint', 'prettier'],
        };
        const disables = disableWrites.biome;
        if (disables.some((d) => meta.targetPath.includes(d))) {
          return false;
        }
        return true;
      },
    });
    await creator.create();

    expect(fs.existsSync(path.join(cwd, 'biome.jsonc'))).toBe(true);
    expect(fs.existsSync(path.join(cwd, 'eslint.config.mjs'))).toBe(false);
    expect(fs.existsSync(path.join(cwd, 'prettier.config.mjs'))).toBe(false);
  });
});

it('应该支持自定义扩展数据', async () => {
  const fileName = `${Math.random().toString(36).slice(2)}.xxx`;
  await runTest(
    async ({ cwd }) => {
      const customValue = Math.random().toString();
      const mockExtendData = vi.fn().mockResolvedValue({ customValue });

      fs.writeFileSync(path.join(templateRoot, `${fileName}.ejs`), '<%= customValue %>');

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
      fs.rmSync(path.join(templateRoot, `${fileName}.ejs`));
    },
  );
});

it('应该支持写入前判断', async () => {
  await runTest(async ({ cwd }) => {
    const mockCanWrite = vi.fn().mockReturnValue(false);

    const creator = new Creator({
      cwd,
      templatesRoot,
      canWrite: mockCanWrite,
    });
    await creator.create();

    expect(mockCanWrite).toHaveBeenCalled();
    expect(fs.existsSync(path.join(cwd, 'test.txt'))).toBe(false);
  });
});

it('应该支持修改写入文件名', async () => {
  await runTest(async ({ cwd }) => {
    const creator = new Creator({
      cwd,
      templatesRoot,
      canWrite({ sourcePath }) {
        if (sourcePath === 'test.txt') {
          return false;
        }

        return true;
      },
    });

    expect(fs.existsSync(path.join(cwd, 'test.txt'))).toBe(false);
    expect(fs.existsSync(path.join(cwd, 'test.txt'))).toBe(false);
  });
});

it('应该支持自定义写入方法', async () => {
  await runTest(async ({ cwd }) => {
    const mockDoWrite = vi.fn();

    const creator = new Creator({
      cwd,
      templatesRoot,
      doWrite: mockDoWrite,
    });
    await creator.create();

    expect(mockDoWrite).toHaveBeenCalled();
    expect(fs.existsSync(path.join(cwd, 'test.txt'))).toBe(false);
  });
});

it('应该正确处理下划线前缀文件', async () => {
  const fileName = `${Math.random().toString(36).slice(2)}.xxx`;
  await runTest(async ({ cwd }) => {
    fs.writeFileSync(path.join(templateRoot, `__${fileName}`), 'test content');

    const creator = new Creator({
      cwd,
      templatesRoot,
    });
    await creator.create();

    expect(fs.existsSync(path.join(cwd, `_${fileName}`))).toBe(true);
    expect(fs.existsSync(path.join(cwd, `__${fileName}`))).toBe(false);
  });
});

it('应该正确处理点前缀文件', async () => {
  const fileName = `${Math.random().toString(36).slice(2)}.xx`;
  await runTest(
    async ({ cwd }) => {
      fs.writeFileSync(path.join(templateRoot, `_${fileName}`), 'test content');

      const creator = new Creator({
        cwd,
        templatesRoot,
      });
      await creator.create();

      expect(fs.existsSync(path.join(cwd, `.${fileName}`))).toBe(true);
      expect(fs.existsSync(path.join(cwd, `_${fileName}`))).toBe(false);
    },
    ({ cwd }) => {
      fs.rmSync(path.join(templateRoot, `_${fileName}`));
    },
  );
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
