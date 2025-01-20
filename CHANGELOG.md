# Changelog

## 1.0.0 (2025-01-20)


### Features

* **core:** 实现类型安全的事件管理 ([078a476](https://github.com/FrontEndDev-org/create-creator/commit/078a476961e27ad50bf37f215b160ce1264aa405))
* **core:** 重构 Creator 类并添加中间件支持 ([36d52e3](https://github.com/FrontEndDev-org/create-creator/commit/36d52e31e9cd8cd4e439acf8082ef1d3c555e8ac))
* **creator:** 在 CreatorContext 中添加 execCommand 工具函数 ([d78227f](https://github.com/FrontEndDev-org/create-creator/commit/d78227fab40f91f052fadbe74f70781b1845b40f))
* **creator:** 重构文件写入流程并添加元数据支持 ([0a100ef](https://github.com/FrontEndDev-org/create-creator/commit/0a100efc2b7366573a1ce9f1af5a84b06e4c2c1d))
* **MiddleWare:** 实现模式匹配功能 ([3db6e39](https://github.com/FrontEndDev-org/create-creator/commit/3db6e39fa66254bb49f08c1d591b94111cf3536a))
* 实现中间件并添加相关测试 ([ef4da71](https://github.com/FrontEndDev-org/create-creator/commit/ef4da711d2064d67dc537faeab8fcee1ad8c7875))
* 更新 2.0 模板 ([ed44d9b](https://github.com/FrontEndDev-org/create-creator/commit/ed44d9b997f9559a62ac535508b490c0d19ff8a9))
* 更新模板中的 Prettier 配置 ([cb6c46d](https://github.com/FrontEndDev-org/create-creator/commit/cb6c46df6ff0f20d877de32c38b794ef02a64e4e))


### Performance Improvements

* **MiddleWare:** 优化 MiddleWare 类中的钩子调用方式 ([8d166dc](https://github.com/FrontEndDev-org/create-creator/commit/8d166dce4f0bc916dc6b1ff3cb8ec3b01e804cbe))

## 1.0.0 (2025-01-16)


### Features

* **cli:** 优化命令行界面样式，增加 colors 辅助对象 ([8d954ba](https://github.com/FrontEndDev-org/create-creator/commit/8d954ba312236011a520ea2c355d9cfa7f11c9f2))
* **cli:** 创建项目后自动初始化 git 仓库 ([d5b52be](https://github.com/FrontEndDev-org/create-creator/commit/d5b52be507d6658e76e330a9f2e890e24492b0e1))
* **cli:** 项目创建后增加 cd 命令提示 ([cf627ff](https://github.com/FrontEndDev-org/create-creator/commit/cf627ff9a81eb0772dc2ea7e9bacfaf073be59c6))
* **creator:** 添加包名属性并处理特殊命名 ([b604789](https://github.com/FrontEndDev-org/create-creator/commit/b60478976f6d9f375811ac7dcd22f0ecfe065b6d))
* **export:** 导出 cli 模块 ([1f18c36](https://github.com/FrontEndDev-org/create-creator/commit/1f18c361f7a30233af52d54ae954ded61ec4a83d))
* **prompts:** 更新 npm 官方注册表的标签 ([e17706a](https://github.com/FrontEndDev-org/create-creator/commit/e17706aaae43005afab00356b5d9cd9f392affff))
* **utils:** 添加 execCommand 函数并编写相关测试 ([e3b90f1](https://github.com/FrontEndDev-org/create-creator/commit/e3b90f1b6cdc4f02bc3d33f4df1f26d3c334ea7e))
* **utils:** 添加判断目录存在的工具函数 ([059f98b](https://github.com/FrontEndDev-org/create-creator/commit/059f98bcdaa64a7ab04e14572d34701ebd65b018))
* 优化创建文件的元信息文件类型 ([0bdc5ea](https://github.com/FrontEndDev-org/create-creator/commit/0bdc5ea3680f1b13b619182143522f5fe9caef4b))
* 支持 eslint 和 biome 两种 linter ([e40286a](https://github.com/FrontEndDev-org/create-creator/commit/e40286a6b5592c6ca8d9446799e99dd597e35bf7))
* 支持创建一个 creator ([9d158da](https://github.com/FrontEndDev-org/create-creator/commit/9d158dac45c06661a44e184f01bfe02c0f4f654f))
* 添加默认模板的入口文件 ([15d102f](https://github.com/FrontEndDev-org/create-creator/commit/15d102fa31a4b1f03ea5ab2dc7e04d61e886e153))
* 重构默认模板并添加配置项 ([a3ba5ca](https://github.com/FrontEndDev-org/create-creator/commit/a3ba5ca8d09a4bfe7d7f2ffcec31fb5d48c2bb11))


### Bug Fixes

* **creator:** 修复模板根目录不存在的问题 ([bce7298](https://github.com/FrontEndDev-org/create-creator/commit/bce7298a190d746f05973eacff052bd45255f721))
* 修正 bin 依赖文件 ([1a6a9e1](https://github.com/FrontEndDev-org/create-creator/commit/1a6a9e16de1d2c6e98ecc905dcb85de96a451d20))
