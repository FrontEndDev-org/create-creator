export class ExitError extends Error {
  exitCode: number;
  constructor(message: string, exitCode: number) {
    super(message);
    this.name = 'CreateError';
    this.exitCode = exitCode;
  }
}
