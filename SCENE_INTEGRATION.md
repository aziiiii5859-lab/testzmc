# 数据集多场景接入手册

## 1. 架构和发布方式

观远平台代码框只注入 `loader.js`。公共 loader 初始化 Dataset Scene Protocol v1 Registry，
并从 `MODULES` 清单并行加载 `shell.js` 和各团队独立发布的场景文件。

场景发版流程：

1. 将单文件 IIFE 场景上传到观远流程中心。
2. 获取新的同源 jump URL。
3. 仅替换公共 `loader.js` 中本场景对应的 URL。
4. 刷新数据集页面，确认控制台无加载/协议错误并执行验收用例。

场景脚本会随页面下载，但只有用户首次打开对应 Tab 时才调用 `mount`。切换 Tab 不会重新
挂载，关闭再打开公共抽屉也会保留状态；离开数据集页面后 Shell 调用 `destroy`。

## 2. loader 清单

为每个模块维护稳定、全局唯一的 ID：

```js
var MODULES = [
  { id: 'dataset-shell', type: 'shell', url: '/process/center/jump/.../shell.js' },
  { id: 'cmb.data-agent', type: 'scene', url: '/process/center/jump/.../data_agent.js' },
  { id: 'team-x.quality-check', type: 'scene', url: '/process/center/jump/.../quality.js' }
];
```

不要在 loader 中放业务配置和业务代码。一个模块加载失败不会阻断其他模块；失败状态可通过
`window.__GD_DATASET_SCENE_HUB__.getModuleStatus()` 排查。

## 3. 最小场景模板

```js
(function () {
  'use strict';

  var hub = window.__GD_DATASET_SCENE_HUB__;
  if (!hub || hub.protocolVersion !== 1) {
    console.error('[my-scene] Registry 不存在或协议版本不兼容');
    return;
  }

  hub.registerScene({
    id: 'team-x.my-scene',
    title: '我的场景',
    order: 30,
    apiVersion: 1,

    // 可选。未配置表示继承公共 loader 权限。
    availability: {
      roles: ['admin', 'editor'],
      domIds: []
    },

    mount: async function (root, context) {
      root.innerHTML = '<section class="teamx-scene">...</section>';

      return {
        activate: function () {},
        deactivate: function () {},
        destroy: function () { root.innerHTML = ''; }
      };
    }
  });
})();
```

字段约定：

| 字段 | 必需 | 说明 |
|---|---:|---|
| `id` | 是 | 全局唯一且稳定，推荐 `团队.场景` |
| `title` | 是 | Tab 标题 |
| `order` | 是 | Tab 顺序，小值靠前 |
| `apiVersion` | 是 | 当前固定为 `1` |
| `mount` | 是 | 首次激活时执行，可返回 Promise |
| `availability` | 否 | 场景级角色和租户限制 |

重复 ID 会被 Registry 拒绝；非 v1 或缺少 `mount` 的场景会被 Shell 拒绝。

## 4. context

Shell 调用 `mount(root, context)`，其中 context 包含：

| 字段 | 说明 |
|---|---|
| `datasetId` | 当前数据集 ID |
| `pathname` | 当前页面路径 |
| `pageOrigin` | 浏览器侧 BI Origin |
| `user` | `GD.getUser()` 的归一化结果 |
| `getBiToken()` | 懒获取 BI Token，返回 Promise |
| `abortSignal` | 离开页面或销毁场景时触发 |

场景不要自行监听 `gd-ready` / `gd-route-change`，也不要重复解析数据集 URL。办公网到业务网之类
的业务地址映射仍由对应场景负责。

所有长请求都应传入 `context.abortSignal`：

```js
fetch(url, { method: 'POST', signal: context.abortSignal });
```

## 5. 生命周期

```text
脚本加载 → registerScene
首次打开 Tab → mount
切走 → deactivate
切回 → activate（不重新 mount）
关闭再打开抽屉 → 保留原实例
离开数据集页面 → abortSignal + destroy
重新进入数据集页面 → 再次 mount 新实例
```

`destroy` 必须清理：

- fetch/SSE/WebSocket；
- document/window 级事件；
- 定时器和观察器；
- Chart/ECharts 等实例；
- 场景持有的 DOM 引用。

单个场景的 `mount` 或 `destroy` 异常由 Shell 捕获，不应影响其他 Tab。

## 6. 尺寸和样式

Shell 统一控制抽屉、Header、Tab 栏和场景视口。每个场景拿到的 `root` 都是 `width:100%`、
`height:100%`、`overflow:hidden`，切换场景不会改变抽屉尺寸。

场景负责 root 内部的布局、padding、背景和滚动。推荐只让一个内部内容区滚动，避免双滚动条。

必须遵守：

- 所有 DOM 查询从 `root.querySelector(...)` 开始；
- CSS 使用团队级前缀，例如 `.teamx-scene-*`；
- 不修改 `body`、Shell DOM 或观远页面 DOM；
- 不创建浮动按钮、遮罩、外层抽屉；
- 不使用 `.active`、`.header`、`.button` 等无前缀全局选择器；
- 不覆盖 `window.Chart`、`window.marked` 等其他场景可能使用的全局依赖。

## 7. 本地验证

在仓库根目录启动静态服务器：

```bash
python3 -m http.server 8090
```

打开：

```text
http://127.0.0.1:8090/poc/multi-tab-shell/test.html
```

检查：

1. 页面只有一个公共 AI 按钮；
2. 打开抽屉后才出现 data_agent UI；
3. 在“智能描述”输入内容，切走再切回后内容仍存在；
4. 关闭再打开抽屉不丢状态；
5. 将某个模块 URL 改错后，其他场景仍正常；
6. 离开数据集页面时请求被取消、场景被销毁；
7. 控制台无重复 ID、协议版本和全局变量冲突错误。

## 8. 生产发布检查

- Shell 和场景 jump URL 均为目标环境可访问的同源地址；
- loader 的角色与 `domId` 灰度配置正确；
- 新 URL 已记录，旧 URL 保留用于回滚；
- `apiVersion` 与线上 Shell 兼容；
- 真机验证 `GD.getUser()`、Token、CSP 和 as-proxy；
- data_agent 验证 SSE、多腿 suspend/resume、停止请求和图表 resize；
- 仅修改本场景 URL，没有覆盖其他团队正在发布的 loader 变更。
