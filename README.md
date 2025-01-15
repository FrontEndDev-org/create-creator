[➡️ English](./README-en.md)

# create-creator

[![code-review](https://github.com/FrontEndDev-org/create-creator/actions/workflows/code-review.yml/badge.svg)](https://github.com/FrontEndDev-org/create-creator/actions/workflows/code-review.yml)
[![dependency-review](https://github.com/FrontEndDev-org/create-creator/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/FrontEndDev-org/create-creator/actions/workflows/dependency-review.yml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/4fa1acaeb717469caddfe21a84c50bb2)](https://app.codacy.com/gh/FrontEndDev-org/create-creator/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/4fa1acaeb717469caddfe21a84c50bb2)](https://app.codacy.com/gh/FrontEndDev-org/create-creator/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
[![npm version](https://badge.fury.io/js/create-creator.svg)](https://npmjs.com/package/create-creator)

Create a creator.

## 功能特性

- 🗝 简单易用，简洁设计
- 🛠️ 基于模板的项目生成
- ⚙️ 交互式 CLI 配置
- 📦 支持多个模板
- 🧩 EJS 模板渲染

## 安装与使用

```bash
npm create creator my-creator
```

- 打开 `src/index.ts` 自定义创建逻辑
- 打开 `src/templates` 编写模板文件

## 示例

### 扩展自定义数据

```ts
// src/index.ts
export async function createCLI() {
  return createCreator({
    // ... other options
    async extendData({ prompts }) {
      // Add custom data
      return {
        timestamp: Date.now(),
        author: 'Your Name'
      };
    }
  });
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
  return createCreator({
    // ... other options
    canWrite(meta, data) {
      if (data.codeLinter === 'eslint' && meta.targetPath.includes('biome')) {
        return false;
      }

       if (data.codeLinter === 'biome' && meta.targetPath.includes('eslint')) {
        return false;
      }

      return true;
    }
  });
}
```

### 打印写入文件日志

```ts
// src/index.ts
export async function createCLI() {
  return createCreator({
    // ... other options
    onWritten(meta, data) {
      console.log(`Created file: ${meta.targetPath}`);
    }
  });
}
```

### 自定义命令行选择交互
```ts
// src/index.ts
import { promptsSafe } from 'create-creator';

export async function createCLI() {
  return createCreator({
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


## API

### `createCreator<T>(options: CreatorOptions<T>): Promise<void>`

The main function to create a new project creator.

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
   * Callback before template generation
   */
  onStart?: (context: CreatorContext) => unknown | Promise<unknown>;
  /**
   * Extend template data with custom properties
   */
  extendData?: (context: CreatorContext) => T | Promise<T>;
  /**
   * Control which files should be written
   */
  canWrite?: (meta: WriteMeta, data: CreatorData<T>) => boolean | Promise<boolean>;
  /**
   * Custom file writing implementation
   */
  doWrite?: (meta: WriteMeta, data: CreatorData<T>) => unknown | Promise<unknown>;
  /**
   * Callback after each file is written
   */
  onWritten?: (meta: WriteMeta, data: CreatorData<T>) => unknown | Promise<unknown>;
  /**
   * Callback after template generation completes
   */
  onEnd?: (context: CreatorContext) => unknown | Promise<unknown>;
};
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
