# create-creator

Create a creator.

## Features

- 🛠️ Template-based project generation
- ⚙️ Interactive CLI prompts for configuration
- 📦 Supports multiple templates
- 🧩 EJS template rendering

## Installation

```bash
npm create creator my-creator
```

## API

### `createCreator<T>(options: CreatorOptions<T>): Promise<void>`

The main function to create a new project creator.


```typescript

export type Prompts = typeof prompts;
export type Colors = typeof colors;

/**
 * File write mode options
 * @enum {string}
 */
export type WriteMode = 'overwrite' | 'clean' | 'cancel';

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
   * CLI prompts instance
   */
  prompts: Prompts;
  /**
   * Color utilities instance
   */
  colors: Colors;
  /**
   * Current write mode (overwrite/clean/cancel)
   */
  writeMode: WriteMode;
};

const builtinDataKey = 'ctx';

/**
 * Built-in data that is automatically included in template context
 */
export type CreatorBuiltinData = {
  /**
   * The creation context
   */
  [builtinDataKey]: CreatorContext;
};

/**
 * Complete template data type combining built-in and custom data
 * @template T - Type of custom data to extend with
 */
export type CreatorData<T> = CreatorBuiltinData & T;

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

### Template Variables

The following variables are available in EJS templates:

- `ctx`: The creation context (`CreatorContext`)
- Custom data returned from `extendData: () => ({ timestamp: Date.now() })`

Example template (README.md.ejs):
```ejs
# <%= ctx.projectName %>

Created at: <%= timestamp %>
```

## License

MIT
