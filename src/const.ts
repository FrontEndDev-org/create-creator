export const pkgName = PKG_NAME;
export const pkgVersion = PKG_VERSION;
export const pkgDescription = PKG_DESCRIPTION;

export const EJS_FILE_SUFFIX = '.ejs';
export const EJS_FILE_REGEX = /\.ejs$/i;
export const BUILTIN_DATA_KEY = 'ctx';

export const IGNORE_NAMES = [
  // # MacOS 系统文件
  '.DS_Store',

  // # Windows 系统文件
  '$RECYCLE.BIN',
  'Desktop.ini',
  'ehthumbs.db',
  'Thumbs.db',

  // # Git 目录
  '.git',

  // # 编辑器目录和文件
  '.idea',
  '.vscode',
];
