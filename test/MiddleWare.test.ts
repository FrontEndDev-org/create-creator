import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { MiddleWare } from '../src/MiddleWare';

it('单个文件', async () => {
  const fn2 = vi.fn();
  const cwd = '/path/to';
  const mw = new MiddleWare<[number, string], boolean>({
    cwd,
  });

  mw.match('file1.ts', (a, b) => {
    expect(a).toBe(1);
    expect(b).toBe('2');
    fn2();
    return true;
  });
  expect(await mw.when('file1.ts', 1, '2')).toBeTypeOf('boolean');
  expect(fn2).toBeCalledTimes(1);
});

it('多个文件', async () => {
  const fn2 = vi.fn();
  const cwd = '/path/to';
  const mw = new MiddleWare<[number, string], boolean>({
    cwd,
  });

  mw.match(['file1.ts', 'x/y/file2.js'], (a, b) => {
    expect(a).toBe(1);
    expect(b).toBe('2');
    fn2();
    return true;
  });

  expect(await mw.when('file1.ts', 1, '2')).toBe(true);
  expect(await mw.when('x/y/file2.js', 1, '2')).toBe(true);

  expect(fn2).toBeCalledTimes(2);
});

it('不匹配的文件应该返回 undefined', async () => {
  const cwd = '/path/to';
  const mw = new MiddleWare<[], boolean>({
    cwd,
  });

  mw.match('file1.ts', () => true);
  expect(await mw.when('file2.ts')).toBe(undefined);
  expect(await mw.when('file1.ts')).toBe(true);
});

it('重复判断的文件不会报错', async () => {
  const cwd = '/path/to';
  const mw = new MiddleWare<[number, string], boolean>({
    cwd,
  });

  mw.match('file1.ts', () => true);
  mw.match('file1.ts', () => true);
});

it('模式匹配', async () => {
  const cwd = '/path/to';
  const mw = new MiddleWare<[], boolean>({
    cwd,
  });

  mw.match('*.ts', () => true);

  expect(await mw.when('file1.ts')).toBe(true);
  expect(await mw.when('file2.ts')).toBe(true);
  expect(await mw.when('file3.js')).toBe(undefined);
});
