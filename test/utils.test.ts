import fs from 'node:fs';
import path from 'node:path/posix';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkNodeVersion, checkPkgVersion, execCommand, isDirectory, isFile } from '../src/utils';
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
  it('应该从 npm registry 返回包版本', async () => {
    const mockResponse = { version: '1.2.3' };
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal('fetch', mockFetch);

    const version = await checkPkgVersion({
      name: 'test-package',
      distTag: 'xxx',
      registry: 'https://registry.yyy.org',
    });

    expect(version).toBe('1.2.3');
    expect(mockFetch).toHaveBeenCalledWith('https://registry.yyy.org/test-package/xxx?t=1234567890');
  });

  it('当未提供 distTag 和 registry 时应该使用默认值', async () => {
    const mockResponse = { version: '1.0.0' };
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal('fetch', mockFetch);

    const version = await checkPkgVersion({
      name: 'test-package',
    });

    expect(version).toBe('1.0.0');
    expect(mockFetch).toHaveBeenCalledWith('https://registry.npmjs.org/test-package/latest?t=1234567890');
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
    expect(checkNodeVersion(16)).toBe(false);
  });

  it('应该处理带有额外字符的版本字符串', () => {
    vi.stubGlobal('process', { version: 'v16.12.1-nightly' });
    expect(checkNodeVersion(16)).toBe(true);
  });
});
