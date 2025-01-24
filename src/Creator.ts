import fs from 'node:fs';
import path from 'node:path/posix';
import process from 'node:process';
import { setTimeout } from 'node:timers/promises';
import ejs from 'ejs';
import fse from 'fs-extra';
import { glob } from 'glob';
import { tryFlatten } from 'try-flatten';
import { ExitError } from './ExitError';
import { MiddleWare, type MiddleWareInterceptor } from './MiddleWare';
import { TypedEvents } from './TypedEvents';
import { BUILTIN_DATA_KEY, DOT_FILE_PREFIX, EJS_FILE_REGEX, EJS_FILE_SUFFIX, UNDERSCORE_FILE_PREFIX } from './const';
import { colors, prompts, selectTemplate, selectWriteMode } from './prompts';
import type { CreatorContext, CreatorData, CreatorOptions, FileMeta, OverrideWrite } from './types';
import { isDirectory } from './utils';

/**
 * Main class for handling project creation
 * @template T - Type of custom data to extend with
 */
export class Creator<T extends Record<string, unknown>> extends TypedEvents<{
  before: [context: CreatorContext];
  start: [context: CreatorContext];
  written: [fileMeta: FileMeta, data: CreatorData<T>, override?: OverrideWrite];
  end: [context: CreatorContext];
}> {
  context: CreatorContext = {
    cwd: '',
    templatesRoot: '',
    templateRoot: '',
    templateNames: [],
    templateName: '',
    projectRoot: '',
    projectPath: '',
    projectName: '',
    writeMode: 'cancel',
  };
  data: CreatorData<T>;

  #writeMW: MiddleWare<[meta: FileMeta, data: CreatorData<T>], OverrideWrite>;

  /**
   * Create a new Creator instance
   * @param {CreatorOptions<T>} options - Configuration options
   */
  constructor(private readonly options: CreatorOptions<T>) {
    super();

    const cwd = path.normalize(options.cwd || process.cwd());
    const projectRoot = path.resolve(cwd, options.projectPath || '.');
    const { context } = this;

    context.cwd = cwd;
    context.templatesRoot = path.resolve(cwd, options.templatesRoot);
    context.projectRoot = projectRoot;
    context.projectPath = path.relative(cwd, projectRoot) || '.';
    context.projectName = path.basename(context.projectRoot);

    this.data = { ctx: context } as CreatorData<T>;
    this.#writeMW = new MiddleWare({
      cwd: context.templatesRoot,
    });
  }

  writeIntercept(
    paths: string | string[],
    interceptor: MiddleWareInterceptor<[meta: FileMeta, data: CreatorData<T>], OverrideWrite>,
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
        throw new ExitError('Operation cancelled', 0);
      default:
        break;
    }
  }

  async #extend() {
    const { context, options } = this;
    const externalData = await options.extendData?.call(null, context);

    if (externalData !== undefined && BUILTIN_DATA_KEY in externalData) {
      throw new ExitError(`Extended data cannot contain the internal key name "${BUILTIN_DATA_KEY}"`, 1);
    }

    this.data = {
      ...externalData,
      ...this.data,
    };
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
      throw new ExitError(
        `Template "${context.templateName}" is empty - add project files to ${context.templateRoot}`,
        1,
      );
    }

    const spinner = prompts.spinner();
    let files = 0;
    spinner.start('Generating project files ...');
    const onWritten = async (fileMeta: FileMeta) => {
      files++;
      spinner.message(`${colors.gray('+')} ${colors.green(fileMeta.targetPath)}`);
      await setTimeout(Math.random() * 100);
    };
    this.on('written', onWritten);
    const [err] = await tryFlatten(this.#generateWriteFiles(paths));
    this.off('written', onWritten);

    if (err) {
      spinner.stop('Failed to generate project files', 1);
      throw new ExitError(err.message, 1);
    }

    spinner.stop(`Generated project ${files} files`, 0);
  }

  async #generateWriteFiles(paths: string[]) {
    const { context, options } = this;

    for (const sourcePath of paths) {
      const sourceFileName = path.basename(sourcePath);
      const sourceFolder = path.dirname(sourcePath);
      const sourceFile = path.join(context.templateRoot, sourcePath);

      const isEjsFile = EJS_FILE_REGEX.test(sourceFileName);
      const isUnderscoreFile = sourceFileName.startsWith(UNDERSCORE_FILE_PREFIX);
      const isDotFile = !isUnderscoreFile && sourceFileName.startsWith(DOT_FILE_PREFIX);

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

      const targetPath = path.join(sourceFolder, prefix + sourceFileName.slice(start, end));
      const targetFile = path.join(context.projectRoot, targetPath);

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

      await this.#generateWriteFile(fileMeta);
    }
  }

  async #generateWriteFile(fileMeta: FileMeta) {
    const { context, options } = this;
    const overrideFileMeta = await this.#writeMW.when(
      path.join(context.templateName, fileMeta.sourcePath),
      fileMeta,
      this.data,
    );
    const { disableRenderEjs, disableWrite, targetFileName } = overrideFileMeta || {};

    if (disableWrite) return;

    let targetFile = fileMeta.targetFile;

    if (targetFileName) {
      targetFile = path.join(context.projectRoot, fileMeta.targetPath, '..', targetFileName || fileMeta.sourceFileName);
    }

    if (fileMeta.isEjsFile && !disableRenderEjs) {
      const template = await fse.readFile(fileMeta.sourceFile, 'utf8');
      await fse.outputFile(targetFile, ejs.render(template, this.data));
    } else {
      await fse.copy(fileMeta.sourceFile, targetFile);
    }

    await this.emit('written', fileMeta, this.data, overrideFileMeta);
  }

  async #create() {
    const { context, options } = this;

    await this.emit('before', context);

    // Verify templates root directory exists and is accessible
    if (isDirectory(context.templatesRoot) === false) {
      throw new ExitError(
        `Invalid templates directory "${context.templatesRoot}" - create a templates folder containing your project templates`,
        1,
      );
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
    context.templateNames = templateNames;

    // Verify templates directory contains at least one valid template
    if (templateNames.length === 0) {
      throw new ExitError(
        `No templates found in "${context.templatesRoot}" - add template folders containing your project files`,
        1,
      );
    }

    if (templateNames.length === 1 && !options.toTemplateOptions) {
      context.templateName = templateNames[0];
    } else {
      const templates = options.toTemplateOptions ? await options.toTemplateOptions(context) : templateNames;
      context.templateName = await selectTemplate(templates);
    }

    context.templateRoot = path.join(context.templatesRoot, context.templateName);

    await this.emit('start', context);
    await this.#check();
    await this.#extend();
    await this.#generate();
    await this.emit('end', context);
  }

  async create() {
    const [err] = await tryFlatten(this.#create());

    if (!err) return process.exit(0);

    prompts.cancel(err.message);

    if (err instanceof ExitError) {
      process.exit(err.exitCode);
    } else {
      process.exit(1);
    }
  }
}
