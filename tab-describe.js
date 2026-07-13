/** Demo scene: another team can publish this file independently. */
(function () {
  'use strict';

  var hub = window.__GD_DATASET_SCENE_HUB__;
  if (!hub || hub.protocolVersion !== 1) {
    console.error('[describe-scene] Registry 不存在或协议版本不兼容');
    return;
  }

  hub.registerScene({
    id: 'demo.describe',
    title: '智能描述',
    order: 20,
    apiVersion: 1,
    mount: async function (root, context) {
      var mountedAt = new Date().toLocaleTimeString();
      root.innerHTML =
        '<style>' +
        '.gdscene-describe{height:100%;overflow:auto;padding:24px;background:#f0fdf4;font-family:Georgia,serif}' +
        '.gdscene-describe h3{margin:0 0 12px;color:#059669}' +
        '.gdscene-describe p{margin:0 0 12px;color:#4b5563}' +
        '.gdscene-describe input{width:100%;padding:9px 12px;border:1px solid #a7f3d0;border-radius:6px;outline:none}' +
        '</style>' +
        '<section class="gdscene-describe">' +
        '  <h3>智能描述（接入示例）</h3>' +
        '  <p>数据集 ID：<code></code></p>' +
        '  <p>首次挂载时间：' + mountedAt + '</p>' +
        '  <input placeholder="切换 Tab 后内容不会丢失">' +
        '</section>';
      root.querySelector('code').textContent = context.datasetId;

      return {
        activate: function () { console.log('[describe-scene] activate'); },
        deactivate: function () { console.log('[describe-scene] deactivate'); },
        destroy: function () { root.innerHTML = ''; },
      };
    },
  });
})();
