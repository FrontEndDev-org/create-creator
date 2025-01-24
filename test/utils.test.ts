import fs from 'node:fs';
import path from 'node:path/posix';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkPkgVersion, execCommand, isDirectory, isFile } from '../src/utils';
import { testRoot } from './helpers';

let tempDir: string;
let testFile: string;
let testDir: string;

beforeAll(async () => {
  // 创建临时目录
  fs.mkdirSync(testRoot, { recursive: true });
  tempDir = fs.mkdtempSync(path.join(testRoot, 'utils-'));

  // 创建测试文件
  testFile = path.join(tempDir, 'test-file.txt');
  fs.writeFileSync(testFile, 'test content');

  // 创建测试目录
  testDir = path.join(tempDir, 'test-dir');
  fs.mkdirSync(testDir);
});

afterAll(() => {
  // 清理临时目录
  fs.rmSync(tempDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('目录检查', () => {
  it('应该对目录返回 true', () => {
    expect(isDirectory(testDir)).toBe(true);
  });

  it('应该对文件返回 false', () => {
    expect(isDirectory(testFile)).toBe(false);
  });

  it('应该对不存在的路径返回 false', () => {
    expect(isDirectory(path.join(tempDir, 'non-existent'))).toBe(false);
  });
});

describe('文件检查', () => {
  it('应该对文件返回 true', () => {
    expect(isFile(testFile)).toBe(true);
  });

  it('应该对目录返回 false', () => {
    expect(isFile(testDir)).toBe(false);
  });

  it('应该对不存在的路径返回 false', () => {
    expect(isFile(path.join(tempDir, 'non-existent'))).toBe(false);
  });
});

describe('命令执行', () => {
  it('应该成功执行命令', async () => {
    const [error, result] = await execCommand('echo hello');
    expect(error).toBeNull();
    expect(result.stdout.trim()).toBe('hello');
    expect(result.stderr).toBe('');
  });

  it('应该处理命令错误', async () => {
    const [error, result] = await execCommand('invalid-command');
    expect(error).not.toBeNull();
    expect(result.stderr).not.toBe('');
  });

  it('应该支持选项参数', async () => {
    const [error, result] = await execCommand('echo $TEST_VAR', {
      env: { TEST_VAR: 'test-value' },
    });
    expect(error).toBeNull();
    expect(result.stdout.trim()).toBe('test-value');
  });
});

describe('包版本检查', () => {
  it('应该从 npm registry 返回包版本', { timeout: 30 * 1000 }, async () => {
    const version = await checkPkgVersion({
      name: 'v2c',
    });

    expect(version).toBe('1.0.0');
  });

  it('不存在的包应该返回空字符串', { timeout: 30 * 1000 }, async () => {
    const version = await checkPkgVersion({
      name: 'v2c-not-exist',
    });

    expect(version).toBe('');
  });
});
