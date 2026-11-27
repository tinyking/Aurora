# Aurora workbench · DSH plugin

Aurora 是一个本地优先的个人自媒体工作台。本仓库就是 DSH 插件包本身：安装后左侧栏出现「Aurora 工作台」入口，打开后在同一面板内管理：

- 选题池：灵感收集、评分、状态与标签筛选
- 内容生产：构思 / 脚本 / 制作 / 已发布看板
- 发布日历：按发布日期与截止日期排期
- 数据效果：播放 / 互动 / 涨粉 / 收益趋势
- 素材脚本：脚本、链接、笔记与文件分类管理
- 设置：JSON 备份与恢复、偏好设置

数据保存在浏览器 IndexedDB（数据库 `aurora-workbench`），不依赖账号或服务器。关闭插件不会删除数据，但入口与面板会消失。

## 安装

在 DSH 的「插件」→「添加插件」中选择本地目录（本仓库根目录），或填入 `github:tinyking/Aurora`。

## 结构

```
package.json          插件清单（dsh.bundle / dsh.client、exports、files）
cordis.patch.yml     插入 Loader 的补丁行
index.js             Host 半边（UI 插件，空 apply）
client.js            构建产物：浏览器 Client 模块（提交进仓库）
src/                 面板源码（App.tsx、pages/、components/、styles.css）
docs/                插件详情页文档与插图
locale/              en / zh 文案
icon.svg             插件图标
rolldown.config.mjs  打包配置
build-client.mjs     包装成 Client 模块 + 构建期断言
```

## 开发

```bash
npm install
npm run build     # rolldown 打包 src/ → dist/app.js，再生成 client.js
npm run check     # 校验 index.js / client.js 语法
```

- `rolldown.config.mjs` 把 React 全部外部化，并使用 classic JSX（`transform.jsx: 'react'`）。
  宿主提供的是 React 18；若打包进 React 19 的 `react/jsx-runtime`，元素会带
  `react.transitional.element`，React 18 无法渲染。
- `build-client.mjs` 把 `react` / `react/jsx-runtime` 等改写为 factory 内的 `require`，
  并执行 CSS 作用域断言（所有选择器必须以 `.aurora-panel` 开头、不得双重前缀）。
- 发布/安装只包含 `files` 列出的文件；`src/`、`dist/`、构建脚本是开发产物，不参与打包，
  但 `client.js` 必须提交，安装后才可直接运行。

修改后重新加载：在「插件」里关闭再启用本插件，或刷新页面。
