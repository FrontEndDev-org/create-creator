# create-creator

[![code-review](https://github.com/FrontEndDev-org/create-creator/actions/workflows/code-review.yml/badge.svg)](https://github.com/FrontEndDev-org/create-creator/actions/workflows/code-review.yml)
[![dependency-review](https://github.com/FrontEndDev-org/create-creator/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/FrontEndDev-org/create-creator/actions/workflows/dependency-review.yml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/4fa1acaeb717469caddfe21a84c50bb2)](https://app.codacy.com/gh/FrontEndDev-org/create-creator/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/4fa1acaeb717469caddfe21a84c50bb2)](https://app.codacy.com/gh/FrontEndDev-org/create-creator/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
[![npm version](https://img.shields.io/npm/v/create-creator)](https://npmjs.com/package/create-creator)

创建一个脚手架。

## 功能特性

- 🗝 简单易用，简洁设计
- 🛠️ 基于模板的项目生成
- ⚙️ 交互式 CLI 配置
- 📦 支持多个模板
- 🧩 EJS 模板渲染

## 安装与使用

```bash
npm create creator my-creator

Need to install the following packages:
create-creator@2.0.0
Ok to proceed? (y)

> npx
> create-creator my-creator

┌   create-creator@2.0.0
│
●  创建一个脚手架工具 - npm create creator
│
◆  Node.js 版本 22 与 18 兼容
│
◇  当前使用的是最新版本
│
▲  项目目录是: /path/to/my-creator
│
◇  选择 Node 版本
│  v22.x
│
◇  选择 npm 镜像源
│  npm 官方
│
◇  选择代码检查工具
│  eslint
│
◇  已生成项目 26 个文件
│
◇  Git 仓库初始化成功
│
◆  项目已成功创建
│
◆  cd my-creator 开始你的编码之旅
│
└  🎉🎉🎉

my-creator
├── .editorconfig
├── .gitignore
├── .npmrc
├── .nvmrc
├── README.md
├── bin
│   └── index.cjs
├── biome.jsonc
├── commitlint.config.mjs
├── lefthook.yml
├── package.json
├── src
│   ├── const.ts
│   ├── dts
│   │   ├── global.d.ts
│   │   └── types.d.ts
│   └── index.ts
├── templates
│   └── default
│       └── README.md.ejs
├── test
│   └── sample.test.ts
├── tsconfig.json
└── vite.config.mts
```

### 打开 `src/index.ts` 自定义创建逻辑
```ts
import { Creator } from 'create-creator';

export async function createCLI() {
  const creator = new Creator({
    projectPath: process.argv[2],
    templatesRoot: path.join(__dirname, '../templates'),
  });

  // create 方法不会抛错，不必捕获
  await creator.create();
}
```

### 打开 `templates` 编写模板文件
- templates 是模板根目录
- templates/default 是一个具体模板目录，可以是任意名称
- 如果 templates 下有多个目录，则会在创建项目时以供用户选择

## 示例

### 扩展自定义数据

```ts
// src/index.ts
export async function createCLI() {
  const creator = new Creator({
    // ... other options
    async extendData({ prompts }) {
      // Add custom data
      return {
        timestamp: Date.now(),
        author: 'Your Name'
      };
    }
  });
  await creator.create();
}
```

```ejs
// templates/default/README.md.ejs
# <%= ctx.projectName %>

Created by: <%= author %>
Created at: <%= timestamp %>
```

### 根据条件渲染不同模板文件

```ts
// src/index.ts
export async function createCLI() {
  const creator = new Creator({
    // ... other options
  });

  // 没有选择 eslint 的时候，不生成 eslint 相关文件
  creator.writeIntercept(['eslint*', '.eslint*'], (meta, data) => ({
    disableWrite: data.codeLinter !== 'eslint',
  }));

  // 没有选择 biome 的时候，不生成 biome 相关文件
  creator.writeIntercept(['biome*'], (meta, data) => ({
    disableWrite: data.codeLinter !== 'biome',
  }));

  await creator.create();
}
```

### 打印相关日志

```ts
// src/index.ts
export async function createCLI() {
  const creator = new Creator({
    // ... other options
    onWritten(meta, data) {
      console.log(`Created file: ${meta.targetPath}`);
    }
  });

  creator.on('before', ({prompts}) => {
    prompts.log.info('输出一些 banner 信息');
  });

  creator.on('start', ({prompts}) => {
    prompts.log.info('开始创建新工程');
  });

  creator.on('written', (meta, data, override) => {
    data.ctx.prompts.log.info(`写入文件: ${meta.targetPath}`);
  });

  creator.on('end', ({prompts}, meta) => {
    prompts.log.info('创建成功');
  });

  await creator.create();
}
```

### 自定义命令行选择交互
```ts
// src/index.ts
import { promptSafe } from 'create-creator';

export async function createCLI() {
  const creator = new Creator({
    // ... other options
    async extendData({ prompts }) {
      const tabSize = await promptSafe(prompts.select({
        message: 'Select your preferred tab size',
        choices: [
          {
            value: 2,
            label: '2 spaces'
          },
          {
            value: 4,
            label: '4 spaces'
          }
        ]
      }))
      // Add custom data
      return {
        // type is number
        tabSize,
      };
    }
  });
}
```

### 特殊点文件
在发布 npm 包的时候，`.gitignore` 和 `.npmignore` 两个文件会默认被忽略打包。此时，常规做法是

1. 将 `.gitignore` 和 `.npmignore` 文件重命名为 `_gitignore` 和 `_npmignore`
2. 添加自定义拦截器进行特殊处理
```ts
// 将任意目录下的 _gitignore 和 _npmignore 文件重命名为 .gitignore 和 .npmignore
creator.writeIntercept(['**/_gitignore', '**/_npmignore'], (meta) => ({
  targetFileName: meta.targetFileName.replace('_', '.'),
}));
```

## API

### Creator 类
```ts
class Creator<T extends Record<string, unknown>> {
  constructor(options: CreatorOptions<T>);

  /**
   * 开始创建项目
   */
  create(): Promise<void>;

  /**
   * 拦截文件写入
   * @param paths 要拦截的文件路径模式
   * @param interceptor 拦截器函数
   */
  writeIntercept(
    paths: string | string[],
    interceptor: WriteInterceptor
  ): void;

  /**
   * 注册事件监听器
   * @param event 事件名称
   * @param listener 监听器函数
   */
  on(event: 'before' | 'start' | 'written' | 'end', listener: (...args: any[]) => void): void;
}
```

### CreatorOptions<T>
```ts

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

```

### `FileMeta`
```ts
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
```

### `OverrideWrite`
```ts
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
```

### `CreatorContext`
```ts
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
```

### `CreatorData<T>`
```ts
/**
 * 结合内置数据和自定义数据的完整模板数据类型
 * @template T - 要扩展的自定义数据类型
 */
export type CreatorData<T> = CreatorBuiltinData & T;
```

### CreateError 类
```ts
class CreateError extends Error {
  exitCode: number;
  constructor(message: string);
}
```

### 事件
#### `creator.on('before', (context: CreatorContext) => unknown)`
在创建前触发

#### `creator.on('start', (context: CreatorContext) => unknown)`
在创建开始触发

#### `creator.on('written', (fileMeta: FileMeta, data: CreatorData<T>, override?: OverrideWrite) => unknown)`
在文件写入后触发

#### `creator.on('end', (context: CreatorContext) => unknown)`
在创建结束触发

### 拦截器
#### `writeIntercept(paths: string | string[], interceptor: WriteInterceptor)`
拦截文件写入。例如：

- 如果配置了 `ssr`，则生成 `src/client.ts` 和 `src/server.ts`
- 否则
  - 如果源文件是 `client.ts` 则重命名为 `index.ts`
  - 如果源文件是 `server.ts` 则不需要生成

```ts
creator.writeIntercept(['*/src/client.ts', '*/src/server.ts'], (fileMeta, data) => {
  if (data.ssr) return {};

  return fileMeta.sourceFileName === 'client.ts'
  // client.ts -> index.ts
  ? {
    targetFileName: 'index.ts'
  }
  // 不需要写入 server.ts
  : {
    disableWrite: true
  }
})
```

### 工具方法
```ts
/**
 * 安全执行 prompts 操作
 */
function promptSafe<T>(promise: Promise<T | symbol>): Promise<T | symbol>;

/**
 * 初始化 Git 仓库
 */
function initGitRepo(cwd: string): Promise<void>;

/**
 * 检查 Node.js 版本
 */
function checkNodeVersion(version: number): Promise<boolean>;

/**
 * 检查更新
 */
function checkUpdate(pkgName: string, currentVersion: string): Promise<boolean>;

/**
 * 选择 Node.js 版本
 */
function selectNodeVersion(versions?: number[]): Promise<number>;

/**
 * 选择 npm registry
 */
function selectNpmRegistry(registries?: string[]): Promise<string>;

/**
 * 选择代码格式化工具
 */
function selectCodeLinter(linters?: string[]): Promise<string>;

/**
 * 选择文件写入模式
 */
function selectWriteMode(cwd: string, ignoreNames?: string[]): Promise<WriteMode>;

/**
 * 执行 shell 命令
 */
function execCommand(
  command: string,
  options?: ExecOptions
): Promise<[Error | null, { stderr: string; stdout: string; exitCode: number }]>;

/**
 * @see https://www.npmjs.com/package/@clack/prompts
 */
export const prompts = Prompts;

/**
 * @see https://www.npmjs.com/package/picocolors
 */
export const colors = Colors;
```


## License

MIT
