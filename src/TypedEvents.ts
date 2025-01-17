import { EventEmitter } from 'node:events';

type EventMap = Record<string, unknown[]>;

export class TypedEvents<T extends EventMap> {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
  }

  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void {
    this.emitter.on(event as string, listener);
  }

  async emit<K extends keyof T>(event: K, ...args: T[K]): Promise<void> {
    const listeners = this.emitter.listeners(event as string);
    for (const listener of listeners) {
      await listener(...args);
    }
  }
}
