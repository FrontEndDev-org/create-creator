import path from 'node:path';
import { normalizePath } from './utils';

export type MiddleWareCallback<I extends unknown[], O> = (...args: I) => O | Promise<O>;
export type MiddleWareOptions = {
  cwd: string;
};

export class MiddleWare<I extends unknown[], O> {
  #fileSet = new Set<string>();
  constructor(private readonly options: MiddleWareOptions) {}

  #hooks: {
    files: string[];
    callback: MiddleWareCallback<I, O>;
  }[] = [];

  is(pth: string | string[], callback: MiddleWareCallback<I, O>) {
    this.#hooks.push({
      files: (Array.isArray(pth) ? pth : [pth]).map((p) => {
        const file = normalizePath(path.join(this.options.cwd, p));

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
    const hooks = this.#hooks.filter((hook) => hook.files.includes(file));

    if (hooks.length === 0) return undefined;
    if (hooks.length === 1) return hooks[0].callback(...inputs);

    throw new Error(`Multiple hooks found for file ${pth}`);
  }
}
