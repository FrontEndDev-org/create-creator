import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execCommand, isDirectory, isFile, normalizePath } from '../src/utils';
import { testRoot } from './helpers';

let tempDir: string;
let testFile: string;
let testDir: string;

beforeAll(async () => {
  // 创建临时目录
  fs.mkdirSync(testRoot, { recursive: true });
  tempDir = fs.mkdtempSync(path.join(testRoot, 'test-utils-'));

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
});

describe('isDirectory', () => {
  it('should return true for directory', () => {
    expect(isDirectory(testDir)).toBe(true);
  });

  it('should return false for file', () => {
    expect(isDirectory(testFile)).toBe(false);
  });

  it('should return false for non-existent path', () => {
    expect(isDirectory(path.join(tempDir, 'non-existent'))).toBe(false);
  });
});

describe('isFile', () => {
  it('should return true for file', () => {
    expect(isFile(testFile)).toBe(true);
  });

  it('should return false for directory', () => {
    expect(isFile(testDir)).toBe(false);
  });

  it('should return false for non-existent path', () => {
    expect(isFile(path.join(tempDir, 'non-existent'))).toBe(false);
  });
});

describe('normalizePath', () => {
  it('should convert Windows paths to forward slashes', () => {
    expect(normalizePath('path\\to\\file')).toBe('path/to/file');
    expect(normalizePath('C:\\path\\to\\file')).toBe('C:/path/to/file');
  });

  it('should handle mixed paths', () => {
    expect(normalizePath('path\\to/file')).toBe('path/to/file');
    expect(normalizePath('path/to\\file')).toBe('path/to/file');
  });

  it('should leave already normalized paths unchanged', () => {
    expect(normalizePath('path/to/file')).toBe('path/to/file');
    expect(normalizePath('/path/to/file')).toBe('/path/to/file');
  });

  it('should handle edge cases', () => {
    expect(normalizePath('')).toBe('');
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('\\')).toBe('/');
  });
});

describe('execCommand', () => {
  it('should execute command successfully', async () => {
    const [error, result] = await execCommand('echo hello');
    expect(error).toBeNull();
    expect(result.stdout.trim()).toBe('hello');
    expect(result.stderr).toBe('');
  });

  it('should handle command error', async () => {
    const [error, result] = await execCommand('invalid-command');
    expect(error).not.toBeNull();
    expect(result.stderr).not.toBe('');
  });

  it('should work with options', async () => {
    const [error, result] = await execCommand('echo $TEST_VAR', {
      env: { TEST_VAR: 'test-value' },
    });
    expect(error).toBeNull();
    expect(result.stdout.trim()).toBe('test-value');
  });
});
