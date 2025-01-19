import { describe, expect, it } from 'vitest';
import * as cliModule from '../src/cli';
import * as constModule from '../src/const';
import * as creatorModule from '../src/creator';
import * as index from '../src/index';
import * as promptsModule from '../src/prompts';

it('should export pkgName and pkgVersion from const', () => {
  expect(index.pkgName).toBe(constModule.pkgName);
  expect(index.pkgVersion).toBe(constModule.pkgVersion);
});

it('should re-export all prompts exports', () => {
  for (const [key, value] of Object.entries(promptsModule)) {
    if (key === 'default') continue;
    expect(index[key as keyof typeof index]).toBe(value);
  }
});

it('should re-export all creator exports', () => {
  for (const [key, value] of Object.entries(creatorModule)) {
    if (key === 'default') continue;
    expect(index[key as keyof typeof index]).toBe(value);
  }
});

it('should re-export all cli exports', () => {
  for (const [key, value] of Object.entries(cliModule)) {
    if (key === 'default') continue;
    expect(index[key as keyof typeof index]).toBe(value);
  }
});

it('should re-export creator types', () => {
  // Import types directly from index to verify they match creator types
  type IndexCreatorOptions = import('../src/index').CreatorOptions<unknown>;
  type IndexCreatorContext = import('../src/index').CreatorContext;
  type IndexWriteMeta = import('../src/index').FileMeta;
  type IndexCreatorData = import('../src/index').CreatorData<unknown>;

  expectTypeOf<IndexCreatorOptions>().toEqualTypeOf<creatorModule.CreatorOptions<unknown>>();
  expectTypeOf<IndexCreatorContext>().toEqualTypeOf<creatorModule.CreatorContext>();
  expectTypeOf<IndexWriteMeta>().toEqualTypeOf<creatorModule.FileMeta>();
  expectTypeOf<IndexCreatorData>().toEqualTypeOf<creatorModule.CreatorData<unknown>>();
});
