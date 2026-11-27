# Aurora workbench · DSH plugin

Aurora 是一个本地优先的个人自媒体工作台。本插件将其改造为 DSH 面板：左侧栏出现「Aurora 工作台」入口，打开后在同一面板内管理：

- 选题池：灵感收集、评分、状态与标签筛选
- 内容生产：构思 / 脚本 / 制作 / 已发布看板
- 发布日历：按发布日期与截止日期排期
- 数据效果：播放 / 互动 / 涨粉 / 收益趋势
- 素材脚本：脚本、链接、笔记与文件分类管理
- 设置：JSON 备份与恢复、偏好设置

数据保存在浏览器 IndexedDB（数据库 `aurora-workbench`），不依赖账号或服务器。关闭插件不会删除数据，但入口与面板会消失。

## 开发与重建

面板源码在 `build/`（`App.tsx`、`pages/`、`components/`、`styles.css`），由 rolldown 打包后再包成 DSH Client 模块：

```bash
# 在仓库根目录（使用根目录的 node_modules）
./node_modules/.bin/rolldown -c aurora-plugin/rolldown.config.mjs
node aurora-plugin/build-client.mjs
```

- `rolldown.config.mjs` 把 React 全部外部化，并使用 classic JSX（`transform.jsx: 'react'`）。
  宿主提供的是 React 18；若打包进 React 19 的 `react/jsx-runtime`，元素会带
  `react.transitional.element`，React 18 无法渲染。
- `build-client.mjs` 把 `react` / `react/jsx-runtime` 等改写为 factory 内的 `require`，
  并执行 CSS 作用域断言（所有选择器必须以 `.aurora-panel` 开头、不得双重前缀）。
- 发布/安装只包含 `files` 列出的文件；`build/`、`dist/` 是开发产物，不参与打包。

修改后重新加载：在「插件」里关闭再启用本插件，或刷新页面。

