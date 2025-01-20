import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as prompts from '@clack/prompts';
import ejs from 'ejs';
import fse from 'fs-extra';
import { glob } from 'glob';
import * as colors from 'picocolors';
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

export type OverrideFileMeta = {
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
  before: [context: CreatorContext];
  start: [context: CreatorContext];
  written: [fileMeta: FileMeta, data: CreatorData<T>, override?: OverrideFileMeta];
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

  #writeMW: MiddleWare<[meta: FileMeta, data: CreatorData<T>], OverrideFileMeta>;

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

    this.#writeMW = new MiddleWare({
      cwd: context.templatesRoot,
    });
  }

  writeIntercept(
    paths: string | string[],
    interceptor: MiddleWareCallback<[meta: FileMeta, data: CreatorData<T>], OverrideFileMeta>,
  ) {
    this.#writeMW.match(paths, interceptor);
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

    // Verify selected template contains files
    if (paths.length === 0) {
      prompts.cancel(`Template "${context.templateName}" is empty - add project files to ${context.templateRoot}`);
      process.exit(1);
    }

    for (const sourcePath of paths) {
      const sourceFileName = path.basename(sourcePath);
      const sourceFolder = path.dirname(sourcePath);
      const sourceFile = normalizePath(path.join(context.templateRoot, sourcePath));

      const isEjsFile = EJS_FILE_REGEX.test(sourcePath);
      const isUnderscoreFile = sourcePath.startsWith(UNDERSCORE_FILE_PREFIX);
      const isDotFile = !isUnderscoreFile && sourcePath.startsWith(DOT_FILE_PREFIX);

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

      const targetPath = normalizePath(path.join(sourceFolder, prefix + sourceFileName.slice(start, end)));
      const targetFile = normalizePath(path.join(context.projectRoot, targetPath));

      const fileMeta: FileMeta = {
        isDotFile,
        isEjsFile: isEjsFile,
        isUnderscoreFile,
        sourcePath,
        sourceFile,
        sourceRoot: context.templateRoot,
        sourceFileName,
        targetPath,
        targetFile,
        targetRoot: context.projectRoot,
        targetFileName: path.basename(targetPath),
      };

      await this.#write(fileMeta);
    }
  }

  async #write(fileMeta: FileMeta) {
    const { context, options } = this;
    const overrideFileMeta = await this.#writeMW.when(fileMeta.sourcePath, fileMeta, this.data);
    const { disableRenderEjs, disableWrite, targetFileName } = overrideFileMeta || {};

    if (disableWrite) return;

    let targetFile = fileMeta.targetFile;

    if (targetFileName) {
      targetFile = path.join(context.projectRoot, fileMeta.targetPath, '..', targetFileName || fileMeta.sourceFileName);
    }

    if (fileMeta.isEjsFile && !disableRenderEjs) {
      const template = await fse.readFile(fileMeta.sourceFile, 'utf8');
      fse.outputFileSync(targetFile, ejs.render(template, this.data));
    } else {
      fse.copySync(fileMeta.sourceFile, targetFile);
    }

    await this.emit('written', fileMeta, this.data, overrideFileMeta);
  }

  async create() {
    const { context, options } = this;

    await this.emit('before', context);

    // Verify templates root directory exists and is accessible
    if (isDirectory(context.templatesRoot) === false) {
      prompts.cancel(
        `Invalid templates directory "${context.templatesRoot}" - create a templates folder containing your project templates`,
      );
      process.exit(1);
    }

    // Scan templates root directory for valid template folders
    const templateNames = fs.readdirSync(context.templatesRoot).filter((name) => {
      const fullPath = path.join(context.templatesRoot, name);
      return (
        !name.startsWith('.') && // Skip hidden files/directories
        !name.startsWith('_') && // Skip underscore prefixed files/directories
        fs.statSync(fullPath).isDirectory() // Only include actual directories
      );
    });

    // Verify templates directory contains at least one valid template
    if (templateNames.length === 0) {
      prompts.cancel(
        `No templates found in "${context.templatesRoot}" - add template folders containing your project files`,
      );
      process.exit(1);
    }

    if (templateNames.length === 1) {
      context.templateName = templateNames[0];
    } else {
      context.templateName = (await prompts.select({
        message: 'Select a template',
        options: templateNames.map((name) => ({
          value: name,
          label: name,
        })),
      })) as string;
    }

    context.templateRoot = normalizePath(path.join(context.templatesRoot, context.templateName));

    await this.emit('start', context);
    await this.#check();
    await this.#extend();
    await this.#generate();
    await this.emit('end', context);
  }
}
