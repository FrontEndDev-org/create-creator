import path from 'node:path';
import { normalizePath } from './utils';

export type MiddleWareCallback<I extends unknown[], O> = (...args: I) => O | Promise<O>;
export type MiddleWareOptions<I extends unknown[], O> = {
  cwd: string;
  paths: string[];
  executor: (output: O) => unknown | Promise<unknown>;
};

export class MiddleWare<I extends unknown[], O> {
  files: string[];
  fileSet = new Set<string>();
  constructor(readonly options: MiddleWareOptions<I, O>) {
    this.files = options.paths.map((pth) => normalizePath(path.join(this.options.cwd, pth)));

    if (this.files.length === 0) {
      throw new Error('No files found');
    }
  }

  #hooks: {
    files: string[];
    callback: MiddleWareCallback<I, O>;
  }[] = [];

  is(pth: string | string[], callback: MiddleWareCallback<I, O>) {
    this.#hooks.push({
      files: (Array.isArray(pth) ? pth : [pth]).map((p) => {
        const file = normalizePath(path.join(this.options.cwd, p));

        if (!this.files.includes(file)) {
          throw new Error(`File ${p} not found`);
        }

        if (this.fileSet.has(file)) {
          throw new Error(`File ${p} already matched`);
        }

        this.fileSet.add(file);

        return file;
      }),
      callback,
    });
    return this;
  }

  async at(pth: string, ...inputs: I) {
    const file = normalizePath(path.join(this.options.cwd, pth));

    if (!this.files.includes(file)) {
      throw new Error(`File ${pth} not found`);
    }

    const hooks = this.#hooks.filter((hook) => hook.files.includes(file));

    for (const hook of hooks) {
      const output = await hook.callback(...inputs);
      await this.options.executor(output);
    }
  }
}
