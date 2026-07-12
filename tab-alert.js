/**
 * PoC · 场景三：数据预警（测试桩）—— 验证 loader 动态加载 3+ 文件
 *
 * 与 tab-explore.js / tab-describe.js 头部引导桩完全一致，风格再换一套（橙色系），
 * 用一个计数按钮验证「懒挂载后状态在切标签间保持」。
 */
(function () {
  'use strict';

  var NS = (window.__GDA__ = window.__GDA__ || {
    _queue: [],
    registerTab: function (t) { this._queue.push(t); },
  });

  NS.registerTab({
    id: 'alert',
    title: '数据预警',
    order: 3,
    mount: function (container, ctx) {
      var count = 0;
      container.innerHTML =
        '<div style="padding:24px;font-family:inherit;background:#fffbeb;height:100%;">' +
        '  <h3 style="margin:0 0 12px;color:#d97706;">🔔 数据预警（测试）</h3>' +
        '  <p style="margin:0 0 8px;color:#4b5563;">数据集ID：<code>' + ctx.dsId + '</code></p>' +
        '  <p style="margin:0 0 16px;color:#9ca3af;font-size:12px;">挂载时间：' +
             new Date().toLocaleTimeString() + '（懒挂载：首次点开本标签页才执行）</p>' +
        '  <button id="gdat-alert-btn" style="padding:8px 20px;border:none;border-radius:6px;' +
        '    background:#d97706;color:#fff;cursor:pointer;">模拟触发预警 +1</button>' +
        '  <p id="gdat-alert-count" style="margin:12px 0 0;color:#92400e;font-size:13px;">' +
        '    已触发 0 次（切走再切回来不应清零）</p>' +
        '</div>';

      var btn = container.querySelector('#gdat-alert-btn');
      var out = container.querySelector('#gdat-alert-count');
      btn.addEventListener('click', function () {
        count += 1;
        out.textContent = '已触发 ' + count + ' 次（切走再切回来不应清零）';
      });

      console.log('[gdas] alert tab mounted, ctx =', ctx);
    },
  });
})();
