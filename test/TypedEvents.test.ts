import { describe, expect, it, vi } from 'vitest';
import { TypedEvents } from '../src/TypedEvents';

type TestEvents = {
  'test-event': [string, number];
  'another-event': [boolean];
};

it('should register and trigger event listeners', async () => {
  const events = new TypedEvents<TestEvents>();
  const listener = vi.fn();

  events.on('test-event', listener);
  await events.emit('test-event', 'hello', 42);

  expect(listener).toHaveBeenCalledWith('hello', 42);
});

it('should handle multiple listeners', async () => {
  const events = new TypedEvents<TestEvents>();
  const listener1 = vi.fn().mockResolvedValue(1);
  const listener2 = vi.fn().mockResolvedValue(2);

  events.on('test-event', listener1);
  events.on('test-event', listener2);

  await events.emit('test-event', 'hello', 42);

  expect(listener1).toHaveBeenCalledWith('hello', 42);
  expect(listener2).toHaveBeenCalledWith('hello', 42);
});

it('should handle different event types', async () => {
  const events = new TypedEvents<TestEvents>();
  const listener1 = vi.fn();
  const listener2 = vi.fn();

  events.on('test-event', listener1);
  events.on('another-event', listener2);
  await events.emit('test-event', 'hello', 42);
  await events.emit('another-event', true);

  expect(listener1).toHaveBeenCalledWith('hello', 42);
  expect(listener2).toHaveBeenCalledWith(true);
});
