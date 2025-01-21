import { expect, it } from 'vitest';
import * as index from '../src/index';

it('should export pkgName and pkgVersion', () => {
  expect(index.pkgName).toBeDefined();
  expect(index.pkgVersion).toBeDefined();
});

it('should export Creator and ExitError', () => {
  expect(index.Creator).toBeDefined();
  expect(index.ExitError).toBeDefined();
});

it('should export prompts functions', () => {
  expect(index.colors).toBeDefined();
  expect(index.prompts).toBeDefined();
  expect(index.promptSafe).toBeDefined();
  expect(index.selectNodeVersion).toBeDefined();
  expect(index.selectNpmRegistry).toBeDefined();
  expect(index.selectCodeLinter).toBeDefined();
  expect(index.selectWriteMode).toBeDefined();
  expect(index.initGitRepo).toBeDefined();
  expect(index.checkNodeVersion).toBeDefined();
  expect(index.checkUpdate).toBeDefined();
});

it('should export execCommand', () => {
  expect(index.execCommand).toBeDefined();
});

it('should export correct types', () => {
  type IndexCreatorOptions = import('../src/index').CreatorOptions<unknown>;
  type IndexCreatorContext = import('../src/index').CreatorContext;
  type IndexFileMeta = import('../src/index').FileMeta;
  type IndexCreatorData = import('../src/index').CreatorData<unknown>;

  expectTypeOf<IndexCreatorOptions>().toBeObject();
  expectTypeOf<IndexCreatorContext>().toBeObject();
  expectTypeOf<IndexFileMeta>().toBeObject();
  expectTypeOf<IndexCreatorData>().toBeObject();
});
