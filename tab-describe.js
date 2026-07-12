/**
 * PoC · 场景二：智能描述（测试桩）—— 观远前端插件 3/3
 *
 * 模拟「另一个团队」的代码：风格不同（绿色系）、独立状态（输入框内容）。
 * 头部的引导桩与 shell.js 配对，与 tab-explore.js 完全一致。
 */
(function () {
  'use strict';

  var NS = (window.__GDA__ = window.__GDA__ || {
    _queue: [],
    registerTab: function (t) { this._queue.push(t); },
  });

  NS.registerTab({
    id: 'describe',
    title: '智能描述',
    order: 2,
    mount: function (container, ctx) {
      container.innerHTML =
        '<div style="padding:24px;font-family:Georgia,serif;background:#f0fdf4;height:100%;">' +
        '  <h3 style="margin:0 0 12px;color:#059669;">📝 智能描述（测试）</h3>' +
        '  <p style="margin:0 0 8px;color:#4b5563;">本场景由另一个插件文件提供，' +
        '     字体/配色刻意与探索分析不同，模拟跨团队独立样式。</p>' +
        '  <p style="margin:0 0 16px;color:#9ca3af;font-size:12px;">挂载时间：' +
             new Date().toLocaleTimeString() + '（懒挂载：首次点开本标签页才执行）</p>' +
        '  <input id="gdat-desc-inp" placeholder="随便输入点什么，切走再切回来不应丢失"' +
        '    style="width:100%;padding:8px 12px;border:1px solid #a7f3d0;border-radius:6px;outline:none;"/>' +
        '</div>';
      console.log('[gdas] describe tab mounted, ctx =', ctx);
    },
  });
})();
