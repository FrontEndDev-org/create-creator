[➡️ English](./README-en.md)

# create-creator

[![code-review](https://github.com/FrontEndDev-org/create-creator/actions/workflows/code-review.yml/badge.svg)](https://github.com/FrontEndDev-org/create-creator/actions/workflows/code-review.yml)
[![dependency-review](https://github.com/FrontEndDev-org/create-creator/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/FrontEndDev-org/create-creator/actions/workflows/dependency-review.yml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/4fa1acaeb717469caddfe21a84c50bb2)](https://app.codacy.com/gh/FrontEndDev-org/create-creator/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/4fa1acaeb717469caddfe21a84c50bb2)](https://app.codacy.com/gh/FrontEndDev-org/create-creator/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
[![npm version](https://badge.fury.io/js/create-creator.svg)](https://npmjs.com/package/create-creator)

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
●  Create a creator - npm create creator
│
▲  The project directory is: /Users/yundanran/development/localhost/my-creator
│
◇  Select node version
│  v22.x
│
◇  Select npm registry
│  npm official
│
◇  Select code linter
│  biome
│
◆  Git repository initialized
│
◆  The project has been created successfully!
│
◆  cd my-creator to start your coding journey
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

- 打开 `src/index.ts` 自定义创建逻辑
- 打开 `src/templates` 编写模板文件

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
import { promptsSafe } from 'create-creator';

export async function createCLI() {
  const creator = new Creator({
    // ... other options
    async extendData({ prompts }) {
      const tabSize = await promptsSafe(prompts.select({
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

### 点文件
在 templates/default 目录下创建点（`.*`）文件，例如 .gitignore 和 .npmrc。注意，由于点文件在文件系统中是隐藏文件，需要在文件名前加上 `_` 前缀，以便在模板中正确处理。
```bash
templates/default/
├── _gitignore  -> .gitignore
├── _npmrc      -> .npmrc
└── README.md
```

### 下划线文件
在 `templates` 中，创建点文件需要 `_*` 开头，那么创建下划线（`_*`）开头的文件，则需要两个下划线开头（`__*`）。
```bash
templates/default/
├── __gitignore -> _gitignore
├── __npmrc     -> _npmrc
└── README.md
```

## API

### `createCreator<T>(options: CreatorOptions<T>): Promise<void>`
创建一个新项目的脚手架。

### `CreatorOptions<T>`
```ts
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
```

### `FileMeta`
```ts
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
```

### `OverrideFileMeta`
```ts
/**
 * Options to override default file writing behavior
 */
export type OverrideFileMeta = {
  /**
   * Whether to disable EJS rendering for EJS files
   */
  disableRenderEjs?: boolean;
  /**
   * Custom target file name
   */
  targetFileName?: string;
  /**
   * Whether to disable file writing
   */
  disableWrite?: boolean;
};
```

### `Creator<T>`
```ts
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
  /**
   * Create a new Creator instance
   * @param options - Configuration options
   */
  constructor(options: CreatorOptions<T>);

  /**
   * Add file write interceptors
   * @param paths - Glob patterns to match files
   * @param interceptor - Interceptor callback function
   * @returns The Creator instance for chaining
   */
  writeIntercept(
    paths: string | string[],
    interceptor: MiddleWareCallback<[meta: FileMeta, data: CreatorData<T>], OverrideFileMeta>
  ): this;

  /**
   * Start the project creation process
   */
  create(): Promise<void>;
}
```


### `CreatorContext`
```ts
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
  execCommand: (command: string, options?: ExecOptions) => Promise<[Error | null, {
      stderr: string;
      stdout: string;
      exitCode: number;
  }]>;
};
```

### `WriteMeta`
```ts
/**
 * Metadata about files being processed
 */
export type WriteMeta = {
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
```

### `CreatorData<T>`
```ts
/**
 * Complete template data type combining built-in and custom data
 * @template T - Type of custom data to extend with
 */
export type CreatorData<T> = {
  ctx: CreatorContext;
} & T;
```

### `selectNodeVersion(versions?: number[]): Promise<number>`
命令行交互选择 node 版本。

### `selectNpmRegistry(registries?: string[]): Promise<string>`
命令行交互选择 npm 仓库地址。

### `selectCodeLinter(linters?: string[]): Promise<string>`
命令行交互选择代码格式化工具。

### `selectWriteMode(cwd: string, ignoreNames?: string[]): Promise<WriteMode>`
命令行交互选择当目录不为空时文件的写入模式。

## License

MIT
