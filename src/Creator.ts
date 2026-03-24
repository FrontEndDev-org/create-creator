import fs from 'node:fs';
import path from 'node:path/posix';
import process from 'node:process';
import { setTimeout } from 'node:timers/promises';
import ejs from 'ejs';
import fse from 'fs-extra';
import { glob } from 'glob';
import { tryFlatten } from 'try-flatten';
import { CreateError } from './CreateError';
import { MiddleWare, type MiddleWareInterceptor } from './MiddleWare';
import { TypedEvents } from './TypedEvents';
import { BUILTIN_DATA_KEY, EJS_FILE_REGEX, EJS_FILE_SUFFIX } from './const';
import { colors, prompts, selectTemplate, selectWriteMode } from './prompts';
import type { CreatorContext, CreatorData, CreatorOptions, FileMeta, OverrideWrite } from './types';
import { isDirectory } from './utils';

/**
 * 处理项目创建的主要类
 * @template T - 要扩展的自定义数据类型
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
   * 创建一个新的 Creator 实例
   * @param {CreatorOptions<T>} options - 配置选项
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

    prompts.log.warn(`项目目录是: ${colors.yellowBright(context.projectRoot)}`);

    context.writeMode = await selectWriteMode(context.projectRoot);

    switch (context.writeMode) {
      case 'overwrite':
        break;
      case 'clean':
        await fse.emptyDir(context.projectRoot);
        break;
      case 'cancel':
        throw new CreateError('操作已取消', 0);
      default:
        break;
    }
  }

  async #extend() {
    const { context, options } = this;
    const externalData = await options.extendData?.call(null, context);

    if (externalData !== undefined && BUILTIN_DATA_KEY in externalData) {
      throw new CreateError(`扩展数据不能包含内部键名 "${BUILTIN_DATA_KEY}"`, 1);
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
      dot: true,
    });

    // 验证选定的模板是否包含文件
    if (paths.length === 0) {
      throw new CreateError(`模板 "${context.templateName}" 是空的，请在 ${context.templateRoot} 添加项目文件`, 1);
    }

    const spinner = prompts.spinner();
    let files = 0;
    spinner.start('正在生成项目文件 ...');
    const onWritten = async (fileMeta: FileMeta) => {
      files++;
      spinner.message(`${colors.gray('+')} ${colors.green(fileMeta.targetPath)}`);
      await setTimeout(Math.random() * 100);
    };
    this.on('written', onWritten);
    const [err] = await tryFlatten(this.#generateWriteFiles(paths));
    this.off('written', onWritten);

    if (err) {
      spinner.stop('生成项目文件失败');
      throw new CreateError(err.message, 1);
    }

    spinner.stop(`已生成项目 ${files} 个文件`);
  }

  async #generateWriteFiles(paths: string[]) {
    const { context, options } = this;

    for (const sourcePath of paths) {
      const sourceFileName = path.basename(sourcePath);
      const sourceFolder = path.dirname(sourcePath);
      const sourceFile = path.join(context.templateRoot, sourcePath);

      const isEjsFile = EJS_FILE_REGEX.test(sourceFileName);
      const targetPath = path.join(
        sourceFolder,
        sourceFileName.slice(0, isEjsFile ? -EJS_FILE_SUFFIX.length : undefined),
      );
      const targetFile = path.join(context.projectRoot, targetPath);

      const fileMeta: FileMeta = {
        isEjsFile: isEjsFile,
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

    // 验证模板根目录是否存在且可访问
    if (isDirectory(context.templatesRoot) === false) {
      throw new CreateError(`无效的模板目录 "${context.templatesRoot}"，请创建一个包含项目模板的模板文件夹`, 1);
    }

    // 扫描模板根目录以获取有效的模板文件夹
    const templateNames = fs.readdirSync(context.templatesRoot).filter((name) => {
      const fullPath = path.join(context.templatesRoot, name);
      return (
        !name.startsWith('.') && // 跳过隐藏文件/目录
        !name.startsWith('_') && // 跳过下划线前缀的文件/目录
        fs.statSync(fullPath).isDirectory() // 只包含实际目录
      );
    });
    context.templateNames = templateNames;

    // 验证模板目录是否至少包含一个有效的模板
    if (templateNames.length === 0) {
      throw new CreateError(`在 "${context.templatesRoot}" 中未找到模板，请添加包含项目文件的模板文件夹`, 1);
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

    if (err instanceof CreateError) {
      process.exit(err.exitCode);
    } else {
      process.exit(1);
    }
  }
}
