#!/usr/bin/env node

import path from 'node:path';
import { buildCreator } from 'create-creator';
import { pkgDescription, pkgName, pkgVersion } from './const';

void buildCreator({
  projectPath: process.argv[2],
  templatesRoot: path.join(__dirname, '../templates'),
  onStart({ prompts }) {
    prompts.intro(`${pkgName}@${pkgVersion}`);
    prompts.log.info(pkgDescription);
  },
  onEnd({ prompts }) {
    prompts.outro('🎉🎉🎉');
  },
});
