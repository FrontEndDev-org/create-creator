import { CreatorError } from '../src/CreatorError';

describe('CreateError', () => {
  it('should create an instance with default exit code', () => {
    const error = new CreatorError('Test error');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CreateError');
    expect(error.message).toBe('Test error');
    expect(error.exitCode).toBe(0);
  });

  it('should create an instance with custom exit code', () => {
    const error = new CreatorError('Test error', 1);
    expect(error.exitCode).toBe(1);
  });

  it('should have correct stack trace', () => {
    const error = new CreatorError('Test error');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('CreateError: Test error');
  });
});
