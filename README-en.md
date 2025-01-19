[➡️ 中文](./README.md)

# create-creator

[![code-review](https://github.com/FrontEndDev-org/create-creator/actions/workflows/code-review.yml/badge.svg)](https://github.com/FrontEndDev-org/create-creator/actions/workflows/code-review.yml)
[![dependency-review](https://github.com/FrontEndDev-org/create-creator/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/FrontEndDev-org/create-creator/actions/workflows/dependency-review.yml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/4fa1acaeb717469caddfe21a84c50bb2)](https://app.codacy.com/gh/FrontEndDev-org/create-creator/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/4fa1acaeb717469caddfe21a84c50bb2)](https://app.codacy.com/gh/FrontEndDev-org/create-creator/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
[![npm version](https://badge.fury.io/js/create-creator.svg)](https://npmjs.com/package/create-creator)

Create a creator.

## Features

- 🗝 Simple and easy to use, concise design
- 🛠️ Template-based project generation
- ⚙️ Interactive CLI configuration
- 📦 Supports multiple templates
- 🧩 EJS template rendering

## Installation & Usage

```bash
npm create creator my-creator

Need to install the following packages:
create-creator@1.0.0
Ok to proceed? (y)

> npx
> create-creator my-creator

┌   create-creator@1.0.0
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
│   └── index.cjs
├── biome.jsonc
├── commitlint.config.mjs
├── lefthook.yml
├── package.json
├── src
│   ├── const.ts
│   ├── dts
│   │   ├── global.d.ts
│   │   └── types.d.ts
│   └── index.ts
├── templates
│   └── default
│       └── README.md.ejs
├── test
│   └── sample.test.ts
├── tsconfig.json
└── vite.config.mts
```

- Open `src/index.ts` to customize creation logic
- Open `src/templates` to write template files

## Examples

### Extending Custom Data

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

### Conditional Template Rendering

```ts
// src/index.ts
export async function createCLI() {
  const creator = new Creator({
    // ... other options
  });

  creator.writeIntercept(['eslint*', '.eslint*'], (meta, data) => ({
    disableWrite: data.codeLinter !== 'eslint',
  }));

  creator.writeIntercept(['biome*'], (meta, data) => ({
    disableWrite: data.codeLinter !== 'biome',
  }));

  await creator.create();
}
```

### Logging File Writes

```ts
// src/index.ts
export async function createCLI() {
  const creator = new Creator({
    // ... other options
    onWritten(meta, data) {
      console.log(`Created file: ${meta.targetPath}`);
    }
  });

  creator.on('written', (meta, data) => {
    console.log(`Writing file: ${meta.targetPath}`);
  });

  await creator.create();
}
```

### Custom CLI Selection
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

### Dot Files
Create dot files (.*) in the templates/default directory, such as .gitignore and .npmrc. Note that since dot files are hidden in the file system, you need to prefix the filename with _ to handle them correctly in templates.
```bash
templates/default/
├── _gitignore  -> .gitignore
├── _npmrc      -> .npmrc
└── README.md
```

### Underscore Files
In `templates`, to create dot files you need to use `_*` prefix, so to create files that actually start with underscore (`_*`), you need to use double underscore prefix (`__*`).
```bash
templates/default/
├── __gitignore -> _gitignore
├── __npmrc     -> _npmrc
└── README.md
```

## API

### `createCreator<T>(options: CreatorOptions<T>): Promise<void>`
Create a creator.

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
  canWrite?: (meta: FileMeta, data: CreatorData<T>) => boolean | Promise<boolean>;
  /**
   * Custom file writing implementation
   */
  doWrite?: (meta: FileMeta, data: CreatorData<T>) => unknown | Promise<unknown>;
  /**
   * Callback after each file is written
   */
  onWritten?: (meta: FileMeta, data: CreatorData<T>) => unknown | Promise<unknown>;
  /**
   * Callback after template generation completes
   */
  onEnd?: (context: CreatorContext) => unknown | Promise<unknown>;
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
  start: [context: CreatorContext];
  write: [fileMeta: FileMeta, data: CreatorData<T>, overrideFileMeta?: OverrideFileMeta];
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
Interactive CLI selection for Node.js version.

### `selectNpmRegistry(registries?: string[]): Promise<string>`
Interactive CLI selection for npm registry.

### `selectCodeLinter(linters?: string[]): Promise<string>`
Interactive CLI selection for code linter/formatter.

### `selectWriteMode(cwd: string, ignoreNames?: string[]): Promise<WriteMode>`
Interactive CLI selection for file write mode when directory is not empty.

## License

MIT
