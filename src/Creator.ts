import fs from 'node:fs';
import path from 'node:path/posix';
import process from 'node:process';
import ejs from 'ejs';
import fse from 'fs-extra';
import { glob } from 'glob';
import { tryFlatten } from 'try-flatten';
import { CreatorError } from './CreatorError';
import { MiddleWare, type MiddleWareInterceptor } from './MiddleWare';
import { TypedEvents } from './TypedEvents';
import { BUILTIN_DATA_KEY, DOT_FILE_PREFIX, EJS_FILE_REGEX, EJS_FILE_SUFFIX, UNDERSCORE_FILE_PREFIX } from './const';
import { colors, prompts, promptsSafe, selectWriteMode } from './prompts';
import type { CreatorContext, CreatorData, CreatorOptions, FileMeta, OverrideFileMeta } from './types';
import { checkPkgVersion, isDirectory } from './utils';

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
    writeMode: 'cancel',
  };
  data: CreatorData<T>;

  #writeMW: MiddleWare<[meta: FileMeta, data: CreatorData<T>], OverrideFileMeta>;

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
    interceptor: MiddleWareInterceptor<[meta: FileMeta, data: CreatorData<T>], OverrideFileMeta>,
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
        throw new CreatorError('Canceled by user', 0);
      default:
        break;
    }
  }

  async #extend() {
    const { context, options } = this;

    try {
      const externalData = await options.extendData?.call(null, context);

      if (externalData !== undefined && BUILTIN_DATA_KEY in externalData) {
        throw new CreatorError(`Extended data cannot contain the internal key name "${BUILTIN_DATA_KEY}"`);
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
      throw new CreatorError(
        `Template "${context.templateName}" is empty - add project files to ${context.templateRoot}`,
      );
    }

    for (const sourcePath of paths) {
      const sourceFileName = path.basename(sourcePath);
      const sourceFolder = path.dirname(sourcePath);
      const sourceFile = path.join(context.templateRoot, sourcePath);

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

      await this.#write(fileMeta);
    }
  }

  async #write(fileMeta: FileMeta) {
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
      fse.outputFileSync(targetFile, ejs.render(template, this.data));
    } else {
      fse.copySync(fileMeta.sourceFile, targetFile);
    }

    await this.emit('written', fileMeta, this.data, overrideFileMeta);
  }

  async #create() {
    const { context, options } = this;

    await this.emit('before', context);

    // Verify templates root directory exists and is accessible
    if (isDirectory(context.templatesRoot) === false) {
      throw new CreatorError(
        `Invalid templates directory "${context.templatesRoot}" - create a templates folder containing your project templates`,
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

    // Verify templates directory contains at least one valid template
    if (templateNames.length === 0) {
      throw new CreatorError(
        `No templates found in "${context.templatesRoot}" - add template folders containing your project files`,
      );
    }

    if (templateNames.length === 1) {
      context.templateName = templateNames[0];
    } else {
      context.templateName = await promptsSafe(
        prompts.select({
          message: 'Select a template',
          options: templateNames.map((name) => ({
            value: name,
            label: name,
          })),
        }),
      );
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

    if (err instanceof CreatorError) {
      process.exit(err.exitCode);
    } else {
      process.exit(1);
    }
  }
}
