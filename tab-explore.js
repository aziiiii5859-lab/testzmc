/**
 * PoC · 场景一：探索分析（测试桩）—— 观远前端插件 2/3
 */
(function () {
  'use strict';

  var NS = (window.__GDA__ = window.__GDA__ || {
    _queue: [],
    registerTab: function (t) { this._queue.push(t); },
  });

  NS.registerTab({
    id: 'explore',
    title: '探索分析',
    order: 1,
    mount: function (container, ctx) {
      container.innerHTML =
        '<div style="padding:24px;font-family:inherit;">' +
        '  <h3 style="margin:0 0 12px;color:#2563eb;">探索分析（测试）</h3>' +
        '  <p style="margin:0 0 8px;color:#4b5563;">数据集ID：<code>' + ctx.dsId + '</code></p>' +
        '  <p style="margin:0 0 16px;color:#4b5563;">BI 地址：<code>' + ctx.biBaseUrl + '</code></p>' +
        '  <button id="gdat-token-btn" style="padding:8px 20px;border:none;border-radius:6px;' +
        '    background:#2563eb;color:#fff;cursor:pointer;">获取 Token</button>' +
        '  <pre id="gdat-token-out" style="margin:12px 0 0;padding:12px;background:#f1f5f9;' +
        '    border-radius:6px;font-size:12px;color:#334155;white-space:pre-wrap;' +
        '    word-break:break-all;min-height:40px;">（点击按钮后显示结果）</pre>' +
        '</div>';

      var btn = container.querySelector('#gdat-token-btn');
      var out = container.querySelector('#gdat-token-out');

      btn.addEventListener('click', function () {
        btn.disabled = true;
        btn.textContent = '请求中…';
        out.textContent = '';

        fetch('/api/user/token')
          .then(function (r) {
            out.textContent += 'HTTP ' + r.status + ' ' + r.statusText + '\n\n';
            return r.text();
          })
          .then(function (text) {
            try {
              out.textContent += JSON.stringify(JSON.parse(text), null, 2);
            } catch (e) {
              out.textContent += text;
            }
            console.log('[gdas] /api/user/token 响应：', text);
          })
          .catch(function (e) {
            out.textContent += '请求失败：' + e.message;
            console.error('[gdas] /api/user/token 错误：', e);
          })
          .finally(function () {
            btn.disabled = false;
            btn.textContent = '重新获取';
          });
      });

      console.log('[gdas] explore tab mounted, ctx =', ctx);
    },
  });
})();
