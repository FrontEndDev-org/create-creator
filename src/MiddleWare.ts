import { minimatch } from 'minimatch';

export type MiddleWareCallback<I extends unknown[], O> = (...args: I) => O | Promise<O>;
export type MiddleWareOptions = {
  cwd: string;
};

export class MiddleWare<I extends unknown[], O> {
  #fileSet = new Set<string>();
  constructor(private readonly options: MiddleWareOptions) {}

  #hooks: {
    patterns: string[];
    callback: MiddleWareCallback<I, O>;
  }[] = [];

  match(patterns: string | string[], callback: MiddleWareCallback<I, O>) {
    this.#hooks.push({
      patterns: Array.isArray(patterns) ? patterns : [patterns],
      callback,
    });
    return this;
  }

  async when(pth: string, ...inputs: I): Promise<O | undefined> {
    const hooks = this.#hooks.filter((hook) => hook.patterns.find((pattern) => minimatch(pth, pattern)));

    if (hooks.length === 0) return undefined;
    if (hooks.length === 1) return hooks[0].callback.apply(null, inputs);

    throw new Error(`Multiple hooks found for file ${pth}`);
  }
}
