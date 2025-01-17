import path from 'node:path';
import { normalizePath } from './utils';

export type MiddleWareCallback<I extends unknown[], O> = (...args: I) => O | Promise<O>;
export type MiddleWareOptions = {
  cwd: string;
  paths: string[];
};

export class MiddleWare<I extends unknown[], O> {
  #files: string[] = [];
  #fileSet = new Set<string>();
  constructor(private readonly options: MiddleWareOptions) {
    this.setPaths(options.paths);
  }

  setPaths(paths: string[]) {
    this.#files = paths.map((pth) => normalizePath(path.join(this.options.cwd, pth)));
  }

  #hooks: {
    files: string[];
    callback: MiddleWareCallback<I, O>;
  }[] = [];

  is(pth: string | string[], callback: MiddleWareCallback<I, O>) {
    this.#hooks.push({
      files: (Array.isArray(pth) ? pth : [pth]).map((p) => {
        const file = normalizePath(path.join(this.options.cwd, p));

        if (!this.#files.includes(file)) {
          throw new Error(`File ${p} not found`);
        }

        if (this.#fileSet.has(file)) {
          throw new Error(`File ${p} already matched`);
        }

        this.#fileSet.add(file);

        return file;
      }),
      callback,
    });
    return this;
  }

  async at(pth: string, ...inputs: I): Promise<O | undefined> {
    const file = normalizePath(path.join(this.options.cwd, pth));

    if (!this.#files.includes(file)) {
      throw new Error(`File ${pth} not found`);
    }

    const hooks = this.#hooks.filter((hook) => hook.files.includes(file));

    if (hooks.length === 0) return;
    if (hooks.length === 1) return hooks[0].callback(...inputs);

    throw new Error(`Multiple hooks found for file ${pth}`);
  }
}
