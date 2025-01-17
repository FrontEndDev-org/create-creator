import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { MiddleWare } from '../src/MiddleWare';

it('单个文件', async () => {
  const fn1 = vi.fn();
  const fn2 = vi.fn();
  const cwd = '/path/to';
  const mw = new MiddleWare<[number, string], boolean>({
    cwd,
    paths: ['file1.ts'],
    executor: (output) => {
      expect(output).toBeTypeOf('boolean');
      fn1();
    },
  });

  mw.is('file1.ts', (a, b) => {
    expect(a).toBe(1);
    expect(b).toBe('2');
    fn2();
    return true;
  });
  await mw.at('./file1.ts', 1, '2');
  expect(fn1).toBeCalledTimes(1);
  expect(fn2).toBeCalledTimes(1);
});

it('多个文件', async () => {
  const fn1 = vi.fn();
  const fn2 = vi.fn();
  const cwd = '/path/to';
  const mw = new MiddleWare<[number, string], boolean>({
    paths: ['file1.ts', 'x/y/file2.js'],
    cwd,
    executor: (output) => {
      expect(output).toBeTypeOf('boolean');
      fn1();
    },
  });

  mw.is(['file1.ts', 'x\\y/file2.js'], (a, b) => {
    expect(a).toBe(1);
    expect(b).toBe('2');
    fn2();
    return true;
  });

  await mw.at('file1.ts', 1, '2');
  await mw.at('x/y/file2.js', 1, '2');

  expect(fn1).toBeCalledTimes(2);
  expect(fn2).toBeCalledTimes(2);
});

it('空 paths 应该报错', async () => {
  const fn = vi.fn();
  const cwd = '/path/to';

  expect(
    () =>
      new MiddleWare<[number, string], boolean>({
        cwd,
        paths: [],
        executor: () => {
          fn();
        },
      }),
  ).toThrowError('No files found');
});

it('不匹配文件应该报错', async () => {
  const fn = vi.fn();
  const cwd = '/path/to';
  const mw = new MiddleWare<[number, string], boolean>({
    cwd,
    paths: ['file1.ts'],
    executor: () => {
      fn();
    },
  });

  expect(() => mw.is('non-existent.ts', () => true)).toThrowError('File non-existent.ts not found');
  expect(fn).toBeCalledTimes(0);
});

it('重复判断的文件应该报错', async () => {
  const fn = vi.fn();
  const cwd = '/path/to';
  const mw = new MiddleWare<[number, string], boolean>({
    cwd,
    paths: ['file1.ts'],
    executor: () => {
      fn();
    },
  });

  mw.is('file1.ts', () => true);
  expect(() => mw.is('file1.ts', () => true)).toThrowError('File file1.ts already matched');
  expect(fn).toBeCalledTimes(0);
});

it('不存在的文件应该报错', async () => {
  const fn = vi.fn();
  const cwd = '/path/to';
  const mw = new MiddleWare<[number, string], boolean>({
    cwd,
    paths: ['file1.ts'],
    executor: () => {
      fn();
    },
  });

  await expect(mw.at('non-existent.ts', 1, '2')).rejects.toThrowError('File non-existent.ts not found');
  expect(fn).toBeCalledTimes(0);
});
