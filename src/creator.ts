import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as prompts from '@clack/prompts';
import ejs from 'ejs';
import fse from 'fs-extra';
import { glob } from 'glob';
import { isDirectory } from './utils';

export type Prompts = typeof prompts;
export type WriteMode = 'overwrite' | 'clean' | 'cancel';

export type CreatorContext = {
  cwd: string;
  templatesRoot: string;
  templateRoot: string;
  templateName: string;
  projectRoot: string;
  projectPath: string;
  projectName: string;
  prompts: Prompts;
  writeMode: WriteMode;
};

const builtinDataKey = 'ctx';
export type CreatorBuiltinData = {
  [builtinDataKey]: CreatorContext;
};

export type CreatorData<T> = CreatorBuiltinData & T;

export type WriteMeta = {
  isEjsFile: boolean;
  isUnderscoreFile: boolean;
  isDotFile: boolean;
  sourceFile: string;
  sourcePath: string;
  sourceRoot: string;
  targetFile: string;
  targetPath: string;
  targetRoot: string;
};

export type CreatorOptions<T> = {
  cwd?: string;
  projectPath?: string;
  templatesRoot: string;
  onStart?: (context: CreatorContext) => unknown | Promise<unknown>;
  extendData?: (context: CreatorContext) => T | Promise<T>;
  canWrite?: (meta: WriteMeta, data: CreatorData<T>) => boolean | Promise<boolean>;
  doWrite?: (meta: WriteMeta, data: CreatorData<T>) => unknown | Promise<unknown>;
  onWritten?: (meta: WriteMeta, data: CreatorData<T>) => unknown | Promise<unknown>;
  onEnd?: (context: CreatorContext) => unknown | Promise<unknown>;
};

const normalizePath = (path: string) => path.replace(/\\/g, '/');
const UNDERSCORE_FILE_PREFIX = '__';
const DOT_FILE_PREFIX = '_';
const EJS_FILE_SUFFIX = '.ejs';
const EJS_FILE_REGEX = /\.ejs$/i;

const ignoreFiles = [
  // # Macos
  '.DS_Store',

  // # Windows
  '$RECYCLE.BIN',
  'Desktop.ini',
  'ehthumbs.db',
  'Thumbs.db',

  // # git
  '.git',

  // # Editor directories and files
  '.idea',
  '.vscode',
];

class Creator<T extends Record<string, unknown>> {
  context: CreatorContext = {
    cwd: '',
    templatesRoot: '',
    templateRoot: '',
    templateName: '',
    projectRoot: '',
    projectPath: '',
    projectName: '',
    prompts,
    writeMode: 'cancel',
  };
  data: CreatorData<T>;
  constructor(private readonly options: CreatorOptions<T>) {
    const cwd = normalizePath(options.cwd || process.cwd());
    const projectRoot = normalizePath(path.resolve(cwd, options.projectPath || '.'));
    const { context } = this;

    context.cwd = cwd;
    context.templatesRoot = normalizePath(path.resolve(cwd, options.templatesRoot));
    context.projectRoot = projectRoot;
    context.projectPath = normalizePath(path.relative(cwd, projectRoot));
    context.projectName = path.basename(context.projectRoot);

    this.data = { ctx: context } as CreatorData<T>;
  }

  async #check() {
    const { context, options } = this;
    const files = glob
      .sync('*', {
        cwd: context.projectRoot,
        nodir: false,
      })
      .filter((n) => !ignoreFiles.includes(n));

    if (files.length === 0) {
      return;
    }

    const writeMode = await prompts.select({
      message: `The project directory ${context.projectRoot} already exists. Pick an action`,
      options: [
        {
          value: 'overwrite',
          label: 'Overwrite existing files',
        },
        {
          value: 'clean',
          label: 'Remove all files',
        },
        {
          value: 'cancel',
          label: 'Cancel project creation',
        },
      ],
    });

    if (prompts.isCancel(writeMode)) {
      prompts.cancel();
      process.exit(0);
    }

    context.writeMode = writeMode;

    switch (writeMode) {
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
    const files = await glob('**/*', {
      nodir: true,
      cwd: context.templateRoot,
      dot: false,
    });

    if (files.length === 0) {
      prompts.cancel(`No files found in template(${context.templateName})`);
      process.exit(1);
    }

    for (const sourcePath of files) {
      const fileName = path.basename(sourcePath);
      const fileFolder = path.dirname(sourcePath);
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

      const targetPath = normalizePath(path.join(fileFolder, prefix + fileName.slice(start, end)));
      const targetFile = normalizePath(path.join(context.projectRoot, targetPath));
      const writeMeta: WriteMeta = {
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

      if (options.canWrite?.call(null, writeMeta, this.data) === false) {
        continue;
      }

      if (options.doWrite) {
        await options.doWrite(writeMeta, this.data);
      } else if (isEjsFile) {
        const template = await fse.readFile(sourceFile, 'utf8');
        fse.outputFileSync(targetFile, ejs.render(template, this.data));
      } else {
        fse.copySync(sourceFile, targetFile);
      }

      options.onWritten?.call(null, writeMeta, this.data);
    }
  }

  async start() {
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

    await options.onStart?.call(null, context);
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

    await options.onEnd?.call(null, context);
  }
}

export async function buildCreator<T extends Record<string, unknown>>(options: CreatorOptions<T>) {
  await new Creator<T>(options).start();
}
