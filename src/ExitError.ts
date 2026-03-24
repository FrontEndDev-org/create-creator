export class ExitError extends Error {
  exitCode: number;
  constructor(message: string, exitCode: number) {
    super(message);
    this.name = '创建错误';
    this.exitCode = exitCode;
  }
}
