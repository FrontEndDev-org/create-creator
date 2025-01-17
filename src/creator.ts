import EventEmitter from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as prompts from '@clack/prompts';
import ejs from 'ejs';
import fse from 'fs-extra';
import { glob } from 'glob';
import * as colors from 'picocolors';
import type { W } from 'vitest/dist/chunks/reporters.D7Jzd9GS.js';
import { MiddleWare, type MiddleWareCallback } from './MiddleWare';
import { TypedEvents } from './TypedEvents';
import { selectWriteMode } from './prompts';
import { execCommand, isDirectory, normalizePath } from './utils';

export type Prompts = typeof prompts;
export type Colors = typeof colors;

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
   * CLI prompts instance @see https://www.npmjs.com/package/@clack/prompts
   */
  prompts: Prompts;
  /**
   * Color utilities instance @see https://www.npmjs.com/package/picocolors
   */
  colors: Colors;
  /**
   * Current write mode (overwrite/clean/cancel)
   */
  writeMode: WriteMode;
  /**
   * Utility function to execute shell commands
   */
  execCommand: typeof execCommand;
};

const builtinDataKey = 'ctx';

/**
 * Built-in data that is automatically included in template context
 */
export type CreatorBuiltinData = {
  /**
   * The creation context
   */
  [builtinDataKey]: CreatorContext;
};

/**
 * Complete template data type combining built-in and custom data
 * @template T - Type of custom data to extend with
 */
export type CreatorData<T> = CreatorBuiltinData & T;

export type FileTypes = {
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
};

/**
 * Metadata about files being processed
 */
export type FileMeta = FileTypes & {
  /**
   * Full path to source file
   */
  sourceFile: string;
  /**
   * Relative path to source file
   */
  sourcePath: string;
  /**
   * Root directory of source files
   */
  sourceRoot: string;
  /**
   * Full path to target file
   */
  targetFile: string;
  /**
   * Relative path to target file
   */
  targetPath: string;
  /**
   * Root directory of target files
   */
  targetRoot: string;
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
   * Extend template data with custom properties
   */
  extendData?: (context: CreatorContext) => T | Promise<T>;

  canWrite?: (meta: FileMeta, data: CreatorData<T>) => boolean | Promise<boolean>;
  canRender?: (meta: FileMeta, data: CreatorData<T>) => boolean | Promise<boolean>;
  /**
   * Custom file writing implementation
   */
  doWrite?: (meta: FileMeta, data: CreatorData<T>) => unknown | Promise<unknown>;
  /**
   * Callback after each file is written
   */
  onWritten?: (meta: FileMeta, data: CreatorData<T>) => unknown | Promise<unknown>;
};

const UNDERSCORE_FILE_PREFIX = '__';
const DOT_FILE_PREFIX = '_';
const EJS_FILE_SUFFIX = '.ejs';
const EJS_FILE_REGEX = /\.ejs$/i;

/**
 * Main class for handling project creation
 * @template T - Type of custom data to extend with
 */
export class Creator<T extends Record<string, unknown>> extends TypedEvents<{
  start: [context: CreatorContext];
  end: [context: CreatorContext];
}> {
  context: CreatorContext = {
    cwd: '',
    templatesRoot: '',
    templateRoot: '',
    templateName: '',
    projectRoot: '',
    projectPath: '',
    projectName: '',
    packageName: '',
    prompts,
    colors,
    writeMode: 'cancel',
    execCommand,
  };
  data: CreatorData<T>;

  fileMetaMW: MiddleWare<[meta: FileMeta, data: CreatorData<T>], Partial<FileTypes>>;

  /**
   * Create a new Creator instance
   * @param {CreatorOptions<T>} options - Configuration options
   */
  constructor(private readonly options: CreatorOptions<T>) {
    super();

    const cwd = normalizePath(options.cwd || process.cwd());
    const projectRoot = normalizePath(path.resolve(cwd, options.projectPath || '.'));
    const { context } = this;

    context.cwd = cwd;
    context.templatesRoot = normalizePath(path.resolve(cwd, options.templatesRoot));
    context.projectRoot = projectRoot;
    context.projectPath = normalizePath(path.relative(cwd, projectRoot)) || '.';
    context.projectName = path.basename(context.projectRoot);
    context.packageName = context.projectName.startsWith('create-')
      ? context.projectName
      : `create-${context.projectName}`;

    this.data = { ctx: context } as CreatorData<T>;

    this.fileMetaMW = new MiddleWare({
      cwd: context.templatesRoot,
    });
  }

  fileIntercept(
    paths: string | string[],
    interceptor: MiddleWareCallback<[meta: FileMeta, data: CreatorData<T>], Partial<FileTypes>>,
  ) {
    this.fileMetaMW.match(paths, interceptor);
    return this;
  }

  async #check() {
    const { context, options } = this;

    prompts.log.warn(`The project directory is: ${colors.yellowBright(context.projectRoot)}`);

    context.writeMode = await selectWriteMode(context.projectRoot);

    switch (context.writeMode) {
      case 'overwrite':
        break;
      case 'clean':
        await fse.emptyDir(context.projectRoot);
        break;
      case 'cancel':
        process.exit(0);
        break;
      default:
        break;
    }
  }

  async #extend() {
    const { context, options } = this;

    try {
      const externalData = await options.extendData?.call(null, context);

      if (externalData !== undefined && builtinDataKey in externalData) {
        prompts.cancel(`Extended data cannot contain the internal key name "${builtinDataKey}"`);
        process.exit(1);
      }

      this.data = {
        ...externalData,
        ...this.data,
      };
    } catch (cause) {
      //
    }
  }

  async #generate() {
    const { context, options } = this;
    const paths = await glob('**/*', {
      nodir: true,
      cwd: context.templateRoot,
      dot: false,
    });

    if (paths.length === 0) {
      prompts.cancel(`No files found in template(${context.templateName})`);
      process.exit(1);
    }

    for (const sourcePath of paths) {
      const fileName = path.basename(sourcePath);
      const fileFolder = path.dirname(sourcePath);
      const sourceFile = normalizePath(path.join(context.templateRoot, sourcePath));

      const isEjsFile = EJS_FILE_REGEX.test(sourcePath);
      const isUnderscoreFile = sourcePath.startsWith(UNDERSCORE_FILE_PREFIX);
      const isDotFile = !isUnderscoreFile && sourcePath.startsWith(DOT_FILE_PREFIX);

      const { prefix, end, start } = calculateFileMate({ isDotFile, isEjsFile, isUnderscoreFile });
      const targetPath = normalizePath(path.join(fileFolder, prefix + fileName.slice(start, end)));
      const targetFile = normalizePath(path.join(context.projectRoot, targetPath));

      const fileMeta: FileMeta = {
        isDotFile,
        isEjsFile,
        isUnderscoreFile,
        sourcePath,
        sourceFile,
        sourceRoot: context.templateRoot,
        targetPath,
        targetFile,
        targetRoot: context.projectRoot,
      };
      const fileTypes = await this.fileMetaMW.when(path.join(context.templateName, sourcePath), fileMeta, this.data);

      // 修改了 fileTypes
      if (fileTypes) {
        const { isDotFile, isEjsFile, isUnderscoreFile } = fileTypes;
        const { prefix, end, start } = calculateFileMate({ isDotFile, isEjsFile, isUnderscoreFile });
        const targetPath = normalizePath(path.join(fileFolder, prefix + fileName.slice(start, end)));
        const targetFile = normalizePath(path.join(context.projectRoot, targetPath));
        fileMeta.targetPath = targetPath;
        fileMeta.targetFile = targetFile;
        fileMeta.isDotFile = isDotFile || false;
        fileMeta.isEjsFile = isEjsFile || false;
        fileMeta.isUnderscoreFile = isUnderscoreFile || false;
      }

      if ((await options.canWrite?.call(null, fileMeta, this.data)) === false) {
        continue;
      }

      await this.#write(fileMeta);
      options.onWritten?.call(null, fileMeta, this.data);
    }
  }

  async #write(fileMeta: FileMeta) {
    const { context, options } = this;

    if (options.doWrite) {
      await options.doWrite(fileMeta, this.data);
    } else if (fileMeta.isEjsFile) {
      const template = await fse.readFile(fileMeta.sourceFile, 'utf8');
      fse.outputFileSync(fileMeta.targetFile, ejs.render(template, this.data));
    } else {
      fse.copySync(fileMeta.sourceFile, fileMeta.targetFile);
    }
  }

  async create() {
    const { context, options } = this;

    if (isDirectory(context.templatesRoot) === false) {
      prompts.cancel(`Templates root directory ${context.templatesRoot} does not exist`);
      process.exit(1);
    }

    const templateNames = fs
      .readdirSync(context.templatesRoot)
      .filter((name) => !name.startsWith('.') && !name.startsWith('_'));

    if (templateNames.length === 0) {
      prompts.cancel('No templates found');
      process.exit(1);
    }

    await this.emit('start', context);

    context.templateName =
      templateNames.length === 1
        ? templateNames[0]
        : ((await prompts.select({
            message: 'Select a template',
            options: templateNames.map((name) => ({
              value: name,
              label: name,
            })),
          })) as string);
    context.templateRoot = normalizePath(path.join(context.templatesRoot, context.templateName));

    await this.#check();
    await this.#extend();
    await this.#generate();
    await this.emit('end', context);
  }
}

export function calculateFileMate({ isDotFile, isEjsFile, isUnderscoreFile }: Partial<FileTypes>) {
  let start = 0;
  let end = undefined;
  let prefix = '';

  if (isEjsFile) {
    end = -EJS_FILE_SUFFIX.length;
  }

  if (isUnderscoreFile) {
    start = UNDERSCORE_FILE_PREFIX.length;
    prefix = '_';
  } else if (isDotFile) {
    start = DOT_FILE_PREFIX.length;
    prefix = '.';
  }

  return { start, end, prefix };
}
