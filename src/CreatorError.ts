export class CreateError extends Error {
  exitCode: number;
  constructor(message: string, exitCode = 0) {
    super(message);
    this.name = 'CreateError';
    this.exitCode = exitCode;
  }
}
