import { prompts } from './prompts';

export class CreatorError extends Error {
  exitCode: number;
  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = 'CreateError';
    this.exitCode = exitCode;
  }
}
