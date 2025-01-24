/**
 * @file env.d.ts
 * @ref https://nodejs.org/api/process.html#processenv
 */

/// <reference types="vite/client" />
/// <reference types="vitest/globals" />


namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
  }
}


