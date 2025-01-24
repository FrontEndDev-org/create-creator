/**
 * eslint.config.mjs
 * @ref https://eslint.org/
 * @ref https://github.com/antfu/eslint-config
 */

import { antfu } from '@antfu/eslint-config';
import prettierConfig from './prettier.config.mjs';

export default antfu(
  {
    type: 'lib',
    yaml: true,
    typescript: true,
    ignores: [
      ".*",
      "node_modules",
      "/dist/**",
      "/public/**",
      "/coverage/**",
      "package.json",
      "package-lock.json",
      "pnpm-lock.{yml,yaml}",
      "yarn.lock"
    ],
    stylistic: {
      semi: prettierConfig.semi,
      indent: prettierConfig.tabWidth,
      quotes: prettierConfig.singleQuote ? 'single' : 'double',
    },
    typescript: {
      overrides: {
        'ts/explicit-function-return-type': ['off'],
        'ts/no-require-imports': 'off',
      },
    },
    rules: {
      'unused-imports/no-unused-imports': 'off',
      'unused-imports/no-unused-vars': 'off',
      'no-console': 'off',
    },
  },
);


