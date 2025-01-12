#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { buildCreator, selectLinter, selectNodeVersion, selectNpmRegistry } from '.';

buildCreator({
  projectPath: process.argv[2],
  templatesRoot: path.join(__dirname, '..', 'templates'),
  onStart({ prompts, ...context }) {
    prompts.intro('🚀');
    prompts.log.info('Welcome to create a creator!');
  },
  onEnd({ prompts, ...context }) {
    prompts.log.success('Successful creation!');
    prompts.outro('🎉');
  },
  async extendData({ prompts }) {
    const nodeVersion = await selectNodeVersion();
    const npmRegistry = await selectNpmRegistry();
    const linter = await selectLinter();

    return {
      nodeVersion,
      npmRegistry,
      linter,
    };
  },
  canWrite(meta, data) {
    console.log(meta);
    return true;
  },
  doWrite({ sourceFile: source, targetFile: target }, data) {},
});
