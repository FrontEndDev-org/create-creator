import { ExitError } from '../src/ExitError';

describe('CreateError', () => {
  it('should create an instance with default exit code', () => {
    const error = new ExitError('Test error', 1);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CreateError');
    expect(error.message).toBe('Test error');
    expect(error.exitCode).toBe(1);
  });

  it('should create an instance with custom exit code', () => {
    const error = new ExitError('Test error', 1);
    expect(error.exitCode).toBe(1);
  });

  it('should have correct stack trace', () => {
    const error = new ExitError('Test error', 0);
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('CreateError: Test error');
  });
});
