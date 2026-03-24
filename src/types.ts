import type * as prompts from '@clack/prompts';
import type * as colors from 'picocolors';
import type { BUILTIN_DATA_KEY } from './const';

/**
 * 表示 @clack/prompts 模块的类型
 * @see https://www.npmjs.com/package/@clack/prompts
 */
export type Prompts = typeof prompts;

/**
 * 表示 picocolors 模块的类型
 * @see https://www.npmjs.com/package/picocolors
 */
export type Colors = typeof colors;

export type PkgMeta = {
  /**
   * 包名称
   */
  name: string;
  /**
   * 发布标签
   * @default 'latest'
   * @see https://docs.npmjs.com/cli/dist-tag
   */
  distTag?: string;
  /**
   * NPM 镜像源
   * @default 'https://registry.npmjs.org'
   */
  registry?: string;
};

/**
 * 文件写入模式选项
 * @enum {string}
 */
export type WriteMode = 'overwrite' | 'clean' | 'cancel';

/**
 * 包含当前创建过程信息的上下文对象
 */
export type CreatorContext = {
  /**
   * 当前工作目录
   */
  cwd: string;
  /**
   * 包含模板的根目录
   */
  templatesRoot: string;
  /**
   * 所选模板目录的路径
   */
  templateRoot: string;
  /**
   * 所选模板目录的名称
   */
  templateNames: string[];
  /**
   * 所选模板的名称
   */
  templateName: string;
  /**
   * 正在创建的项目的根目录
   */
  projectRoot: string;
  /**
   * 项目目录的相对路径
   */
  projectPath: string;
  /**
   * 正在创建的项目名称
   */
  projectName: string;
  /**
   * 当前写入模式 (overwrite/clean/cancel)
   */
  writeMode: WriteMode;
};

/**
 * 自动包含在模板上下文中的内置数据
 */
export type CreatorBuiltinData = {
  /**
   * 创建上下文
   */
  [BUILTIN_DATA_KEY]: CreatorContext;
};

/**
 * 结合内置数据和自定义数据的完整模板数据类型
 * @template T - 要扩展的自定义数据类型
 */
export type CreatorData<T> = CreatorBuiltinData & T;

export type OverrideWrite = {
  /**
   * 是否禁用 EJS 文件的 EJS 渲染
   */
  disableRenderEjs?: boolean;

  /**
   * 指定目标文件名
   */
  targetFileName?: string;

  /**
   * 是否禁用文件写入
   * 当为 true 时，其他配置将被忽略
   */
  disableWrite?: boolean;
};

/**
 * 关于正在处理的文件的元数据
 */
export type FileMeta = {
  /**
   * 文件是否使用 EJS 模板
   */
  isEjsFile: boolean;

  /**
   * 源文件的根目录
   */
  sourceRoot: string;
  /**
   * 源文件名称
   */
  sourceFileName: string;
  /**
   * 源文件的相对路径
   */
  sourcePath: string;
  /**
   * 源文件的完整路径
   */
  sourceFile: string;

  /**
   * 目标文件的根目录
   */
  targetRoot: string;
  /**
   * 目标文件名称
   */
  targetFileName: string;
  /**
   * 目标文件的相对路径
   */
  targetPath: string;
  /**
   * 目标文件的完整路径
   */
  targetFile: string;
};

export type TemplateOption = {
  /**
   * 模板选项的唯一标识符
   */
  value: string;
  /**
   * 模板选项的显示名称
   */
  label?: string;
  /**
   * 关于模板的附加描述或提示
   */
  hint?: string;
};

/**
 * 创建器的配置选项
 * @template T - 要扩展的自定义数据类型
 */
export type CreatorOptions<T> = {
  /**
   * 当前工作目录 (默认: process.cwd())
   */
  cwd?: string;
  /**
   * 项目目录的路径
   */
  projectPath?: string;
  /**
   * 包含模板的根目录
   */
  templatesRoot: string;
  /**
   * 将创建上下文转换为模板选项
   * @param context - 包含当前过程信息的创建上下文
   * @returns 模板选项数组或解析为模板选项数组的 Promise
   */
  toTemplateOptions?: (context: CreatorContext) => TemplateOption[] | Promise<TemplateOption[]>;
  /**
   * 使用自定义属性扩展模板数据
   * @param context - 包含当前过程信息的创建上下文
   * @returns 扩展的模板数据或解析为扩展模板数据的 Promise
   */
  extendData?: (context: CreatorContext) => T | Promise<T>;
};
