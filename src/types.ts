import type * as prompts from '@clack/prompts';
import type * as colors from 'picocolors';
import type { BUILTIN_DATA_KEY } from './const';

/**
 * Type representing the @clack/prompts module
 * @see https://www.npmjs.com/package/@clack/prompts
 */
export type Prompts = typeof prompts;

/**
 * Type representing the picocolors module
 * @see https://www.npmjs.com/package/picocolors
 */
export type Colors = typeof colors;

export type PkgMeta = {
  /**
   * Package name
   */
  name: string;
  /**
   * Dist tag
   * @default 'latest'
   * @see https://docs.npmjs.com/cli/dist-tag
   */
  distTag?: string;
  /**
   * NPM registry
   * @default 'https://registry.npmjs.org'
   */
  registry?: string;
};

/**
 * File write mode options
 * @enum {string}
 */
export type WriteMode = 'overwrite' | 'clean' | 'cancel';

/**
 * Context object containing information about the current creation process
 */
export type CreatorContext = {
  /**
   * Current working directory
   */
  cwd: string;
  /**
   * Root directory containing templates
   */
  templatesRoot: string;
  /**
   * Path to selected template directory
   */
  templateRoot: string;
  /**
   * Names of selected template directories
   */
  templateNames: string[];
  /**
   * Name of selected template
   */
  templateName: string;
  /**
   * Root directory of project being created
   */
  projectRoot: string;
  /**
   * Relative path to project directory
   */
  projectPath: string;
  /**
   * Name of project being created
   */
  projectName: string;
  /**
   * Name of package being created
   */
  packageName: string;
  /**
   * Current write mode (overwrite/clean/cancel)
   */
  writeMode: WriteMode;
};

/**
 * Built-in data that is automatically included in template context
 */
export type CreatorBuiltinData = {
  /**
   * The creation context
   */
  [BUILTIN_DATA_KEY]: CreatorContext;
};

/**
 * Complete template data type combining built-in and custom data
 * @template T - Type of custom data to extend with
 */
export type CreatorData<T> = CreatorBuiltinData & T;

export type OverrideWrite = {
  /**
   * Whether to disable EJS rendering for EJS files
   */
  disableRenderEjs?: boolean;

  /**
   * Specify target file name
   */
  targetFileName?: string;

  /**
   * Whether to disable file writing
   * When true, other configurations will be ignored
   */
  disableWrite?: boolean;
};

/**
 * Metadata about files being processed
 */
export type FileMeta = {
  /**
   * Whether file uses EJS templating
   */
  isEjsFile: boolean;
  /**
   * Whether file uses underscore prefix
   */
  isUnderscoreFile: boolean;
  /**
   * Whether file uses dot prefix
   */
  isDotFile: boolean;

  /**
   * Root directory of source files
   */
  sourceRoot: string;
  /**
   * Name of source file
   */
  sourceFileName: string;
  /**
   * Relative path to source file
   */
  sourcePath: string;
  /**
   * Full path to source file
   */
  sourceFile: string;

  /**
   * Root directory of target files
   */
  targetRoot: string;
  /**
   * Name of target file
   */
  targetFileName: string;
  /**
   * Relative path to target file
   */
  targetPath: string;
  /**
   * Full path to target file
   */
  targetFile: string;
};

export type TemplateOption = {
  /**
   * Unique identifier for the template option
   */
  value: string;
  /**
   * Display name for the template option
   */
  label?: string;
  /**
   * Additional description or hint about the template
   */
  hint?: string;
};

/**
 * Configuration options for the creator
 * @template T - Type of custom data to extend with
 */
export type CreatorOptions<T> = {
  /**
   * Current working directory (default: process.cwd())
   */
  cwd?: string;
  /**
   * Path to project directory
   */
  projectPath?: string;
  /**
   * Root directory containing templates
   */
  templatesRoot: string;
  /**
   * Convert creation context to template options
   * @param context - The creation context containing information about the current process
   * @returns Array of template options or promise resolving to array of template options
   */
  toTemplateOptions?: (context: CreatorContext) => TemplateOption[] | Promise<TemplateOption[]>;
  /**
   * Extend template data with custom properties
   * @param context - The creation context containing information about the current process
   * @returns Extended template data or promise resolving to extended template data
   */
  extendData?: (context: CreatorContext) => T | Promise<T>;
};
