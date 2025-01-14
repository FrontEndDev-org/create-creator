import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isDirectory, isFile } from '../src/utils';

let tempDir: string;
let testFile: string;
let testDir: string;

beforeAll(async () => {
  // 创建临时目录
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-utils-'));

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

it('should return true for directory', () => {
  expect(isDirectory(testDir)).toBe(true);
});

it('should return false for file', () => {
  expect(isDirectory(testFile)).toBe(false);
});

it('should return false for non-existent path', () => {
  expect(isDirectory(path.join(tempDir, 'non-existent'))).toBe(false);
});

it('should return true for file', () => {
  expect(isFile(testFile)).toBe(true);
});

it('should return false for directory', () => {
  expect(isFile(testDir)).toBe(false);
});

it('should return false for non-existent path', () => {
  expect(isFile(path.join(tempDir, 'non-existent'))).toBe(false);
});
