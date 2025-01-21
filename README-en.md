[➡️ 中文](./README.md)

# create-creator

[![code-review](https://github.com/FrontEndDev-org/create-creator/actions/workflows/code-review.yml/badge.svg)](https://github.com/FrontEndDev-org/create-creator/actions/workflows/code-review.yml)
[![dependency-review](https://github.com/FrontEndDev-org/create-creator/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/FrontEndDev-org/create-creator/actions/workflows/dependency-review.yml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/4fa1acaeb717469caddfe21a84c50bb2)](https://app.codacy.com/gh/FrontEndDev-org/create-creator/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/4fa1acaeb717469caddfe21a84c50bb2)](https://app.codacy.com/gh/FrontEndDev-org/create-creator/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
[![npm version](https://badge.fury.io/js/create-creator.svg)](https://npmjs.com/package/create-creator)

Create Creator.

## Features

- 🗝 Simple and easy to use, clean design
- 🛠️ Template-based project generation
- ⚙️ Interactive CLI configuration
- 📦 Support for multiple templates
- 🧩 EJS template rendering

## Installation & Usage

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
▲  The project directory is: /path/to/my-creator
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

### Open `src/index.ts` to customize creation logic
```ts
import path from 'node:path/posix';
import process from 'node:process';
import { Creator, prompts, colors } from 'create-creator';
import { pkgDescription, pkgName, pkgVersion } from './const';

export async function createCLI() {
  const creator = new Creator({
    projectPath: process.argv[2],
    templatesRoot: path.join(__dirname, '../templates'),
  });

  creator.on('before', () => {
    prompts.intro(colors.bold(colors.bgCyan(` ${pkgName}@${pkgVersion} `)));
    prompts.log.info(pkgDescription);
  });

  creator.on('end', ({ projectPath }) => {
    prompts.log.success('The project has been created successfully!');
    prompts.log.success(`${colors.bold(colors.greenBright(`cd ${projectPath}`))} to start your coding journey`);
    prompts.outro('🎉🎉🎉');
  });

  // create method won't throw errors, no need to catch
  await creator.create();
}
```

### Open `src/templates` to write template files
- templates is the root directory for templates
- templates/default is a specific template directory, can be any name
- If there are multiple directories under templates, users can choose during project creation

## Examples

### Extend custom data

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

### Conditionally render different template files

```ts
// src/index.ts
export async function createCLI() {
  const creator = new Creator({
    // ... other options
  });

  // Don't generate eslint related files when eslint is not selected
  creator.writeIntercept(['eslint*', '.eslint*'], (meta, data) => ({
    disableWrite: data.codeLinter !== 'eslint',
  }));

  // Don't generate biome related files when biome is not selected
  creator.writeIntercept(['biome*'], (meta, data) => ({
    disableWrite: data.codeLinter !== 'biome',
  }));

  await creator.create();
}
```

### Logging

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
    prompts.log.info('Output some banner information');
  });

  creator.on('start', ({prompts}) => {
    prompts.log.info('Starting new project creation');
  });

  creator.on('written', (meta, data, override) => {
    data.ctx.prompts.log.info(`File written: ${meta.targetPath}`);
  });

  creator.on('end', ({prompts}, meta) => {
    prompts.log.info('Creation successful');
  });

  await creator.create();
}
```

### Custom CLI selection interaction
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

### Dot files
Create dot files (.*) in the templates/default directory, such as .gitignore and .npmrc. Note that since dot files are hidden in the file system, you need to prefix the filename with _ for proper handling in templates.
```bash
templates/default/
├── _gitignore  -> .gitignore
├── _npmrc      -> .npmrc
└── README.md
```

### Underscore files
In `templates`, creating dot files requires _* prefix, so creating underscore (_*) files requires double underscore prefix (__*).
```bash
templates/default/
├── __gitignore -> _gitignore
├── __npmrc     -> _npmrc
└── README.md
```

## API

### Creator Class
```ts
class Creator<T extends Record<string, unknown>> {
  constructor(options: CreatorOptions<T>);

  /**
   * Start project creation
   */
  create(): Promise<void>;

  /**
   * Intercept file writing
   * @param paths File path patterns to intercept
   * @param interceptor Interceptor function
   */
  writeIntercept(
    paths: string | string[],
    interceptor: WriteInterceptor
  ): void;

  /**
   * Register event listeners
   * @param event Event name
   * @param listener Listener function
   */
  on(event: 'before' | 'start' | 'written' | 'end', listener: (...args: any[]) => void): void;
}
```

### CreatorOptions<T>
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
  /**
   * Check for updates
   */
  checkUpdate?: CheckPkgUpdate & { version: string };
  /**
   * Check Node.js version
   */
  checkNodeVersion?: number;
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
   * Specify target file name
   */
  targetFileName?: string;

  /**
   * Whether to disable file writing
   * When true, other configurations will be ignored
   */
  disableWrite?: boolean;
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
   * Current write mode (overwrite/clean/cancel)
   */
  writeMode: WriteMode;
};
```

### `CreatorData<T>`
```ts
/**
 * Complete template data type combining built-in and custom data
 * @template T - Type of custom data to extend with
 */
export type CreatorData<T> = {
  /**
   * The creation context
   */
  ctx: CreatorContext;
} & T;
```

### CreatorError Class
```ts
class CreatorError extends Error {
  constructor(message: string);
}
```

### Events
#### `creator.on('before', (context: CreatorContext) => unknown)`
Triggered before creation

#### `creator.on('start', (context: CreatorContext) => unknown)`
Triggered when creation starts

#### `creator.on('written', (fileMeta: FileMeta, data: CreatorData<T>, override?: OverrideFileMeta) => unknown)`
Triggered after file writing

#### `creator.on('end', (context: CreatorContext) => unknown)`
Triggered when creation ends

### Interceptors
#### `writeIntercept(paths: string | string[], interceptor: WriteInterceptor)`
Intercept file writing. For example:

- If `ssr` is configured, generate `src/client.ts` and `src/server.ts`
- Otherwise
  - If source file is `client.ts`, rename to `index.ts`
  - If source file is `server.ts`, skip generation

```ts
creator.writeIntercept(['*/src/client.ts', '*/src/server.ts'], (fileMeta, data) => {
  if (data.ssr) return {};

  return fileMeta.sourceFileName === 'client.ts'
  // client.ts -> index.ts
  ? {
    targetFileName: 'index.ts'
  }
  // skip server.ts
  : {
    disableWrite: true
  }
})
```

### Utility Methods
```ts
/**
 * Safely execute prompts operations
 */
function promptsSafe<T>(promise: Promise<T | symbol>): Promise<T | symbol>;

/**
 * Select Node.js version
 */
function selectNodeVersion(versions?: number[]): Promise<number>;

/**
 * Select npm registry
 */
function selectNpmRegistry(registries?: string[]): Promise<string>;

/**
 * Select code linter
 */
function selectCodeLinter(linters?: string[]): Promise<string>;

/**
 * Select file write mode
 */
function selectWriteMode(cwd: string, ignoreNames?: string[]): Promise<WriteMode>;

/**
 * Execute shell command
 */
function execCommand(
  command: string,
  options?: ExecOptions
): Promise<[Error | null, { stderr: string; stdout: string; exitCode: number }]>;
```

## Links
- [prompts](https://www.npmjs.com/package/@clack/prompts)
- [colors](https://www.npmjs.com/package/picocolors)


## License

MIT
