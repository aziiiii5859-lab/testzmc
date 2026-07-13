(function () {
  'use strict';
  // ⚠️ 调试版 loader：每步都打 console.log，定位问题后换回正式版

  console.log('[GDA loader] 1/6 脚本已执行');

  var ALLOWED_ROLES = ['admin', 'editor'];

  // 调试：先清空白名单，确认门控不是卡在这里；确认能加载后再恢复灰度名单
  var OPEN_DOMAINS = [];   // ← 改这里：[] = 全量不限制

  var CDN_BASE = 'https://cdn.jsdelivr.net/gh/aziiiii5859-lab/testzmc/';
  var FILES = [
    { name: 'shell',      src: CDN_BASE + 'shell.js' },
    { name: 'data_agent', src: CDN_BASE + 'embed.js' }
  ];

  if (window.__GDA_LOADER_LOADED__) { console.log('[GDA loader] 已加载过，跳过'); return; }
  window.__GDA_LOADER_LOADED__ = true;
  console.log('[GDA loader] 2/6 防重复注入通过');

  if (typeof GD === 'undefined') {
    console.error('[GDA loader] GD SDK 不存在！请确认在观远平台页面运行（非本地 HTML）');
    return;
  }
  console.log('[GDA loader] 3/6 GD SDK 存在，注册 gd-ready 监听');

  GD.on('gd-ready', async function () {
    console.log('[GDA loader] 4/6 gd-ready 触发');
    var info;
    try {
      var u = await GD.getUser();
      info = (u && u.$) || u || {};
      console.log('[GDA loader] GD.getUser() 返回：', JSON.stringify(info));
    } catch (e) {
      console.error('[GDA loader] GD.getUser() 异常：', e);
      return;
    }

    var roles = info.role || [];
    console.log('[GDA loader] 角色检查：user.role =', roles, ' 白名单 =', ALLOWED_ROLES);
    if (!roles.length || !roles.some(function (r) { return ALLOWED_ROLES.indexOf(r) !== -1; })) {
      console.warn('[GDA loader] 角色不匹配，不加载（当前角色：' + JSON.stringify(roles) + '）');
      return;
    }
    console.log('[GDA loader] 5/6 角色检查通过');

    if (OPEN_DOMAINS.length) {
      var domId = info.domId || '';
      console.log('[GDA loader] 域名灰度检查：domId =', domId, ' 白名单 =', OPEN_DOMAINS);
      if (OPEN_DOMAINS.indexOf(domId) === -1) {
        console.warn('[GDA loader] domId 不在灰度白名单，不加载');
        return;
      }
    } else {
      console.log('[GDA loader] OPEN_DOMAINS 为空，跳过域名灰度检查');
    }

    console.log('[GDA loader] 6/6 开始加载 ' + FILES.length + ' 个文件：', FILES.map(function(f){return f.name;}));
    FILES.forEach(function (file) {
      var script = document.createElement('script');
      script.src = file.src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = function () {
        console.log('[GDA loader] ✓ ' + file.name + ' 加载成功');
      };
      script.onerror = function () {
        console.error('[GDA loader] ✗ ' + file.name + ' 加载失败：' + file.src);
      };
      document.head.appendChild(script);
    });
  });

  console.log('[GDA loader] 等待 gd-ready 事件…');
})();
