(function () {
  'use strict';
  // 生产合规 loader：观远平台代码框不允许粘贴完整源码，只放这一小段。真正的
  // shell.js / embed.js（以及后续接入的其他团队场景文件）各自上传到观远「流程中心」
  // 文件管理后拿到 jump 地址，这里用 <script src> 动态加载（写法对齐平台参考代码）。
  //
  // 相比旧版 embed-loader.js（只加载一个文件），这里泛化成一份清单：每个团队一行，
  // 各自迭代时只改自己那一行 URL、重新上传自己的文件，不影响其他团队的代码和发布节奏。
  // 加载顺序不重要——shell.js 的 registerTab 走注册队列，谁先加载完都能正常工作。

  // 角色白名单：仅 admin 或 editor 可见（GD.getUser().role 为数组，如 ["admin"]）
  var ALLOWED_ROLES = ['admin', 'editor'];

  // 灰度白名单：只在名单内的 domId（分行/租户）生效，逐步扩量；留空数组 = 不限制、全量生效
  var OPEN_DOMAINS = ['REPLACE_ME'];

  // 上线前改：这里用 jsdelivr CDN 地址方便本地/测试验证；生产发布时改为观远「流程中心」
  // 上传后生成的 jump 同源相对路径（天然免跨域+免手动维护缓存版本号，见 docs/内网部署实录.md）。
  // 每次重新上传 CDN 后可能需要等 jsdelivr 刷新缓存（purge 或加 ?v= 参数）。
  // 新增场景只需要在这里加一行，不用改其他团队的条目。
  var CDN_BASE = 'https://cdn.jsdelivr.net/gh/aziiiii5859-lab/testzmc/';
  var FILES = [
    { name: 'shell',      src: CDN_BASE + 'shell.js' },
    { name: 'data_agent', src: CDN_BASE + 'embed.js' }
    // { name: '<其他团队场景标识>', src: '<自己文件的 CDN/jump 地址>' },
  ];

  if (window.__GDA_LOADER_LOADED__) return;   // 防平台重复执行代码框脚本时二次注入
  window.__GDA_LOADER_LOADED__ = true;

  GD.on('gd-ready', async function () {
    var info;
    try {
      // GD.getUser() 实测不保证同步返回，且字段可能在 .$ 下——防御性处理
      var u = await GD.getUser();
      info = (u && u.$) || u || {};
    } catch (e) { /* 取不到用户信息就不加载 */ return; }

    // 角色权限检查：仅 admin 或 editor 可见（门控粒度为整体——要么都加载、要么都不加载；
    // 如果某个场景需要自己单独控制可见性，可以在自己 mount() 内部再判断一次并跳过注册）
    var roles = info.role || [];
    if (!roles.length || !roles.some(function (r) { return ALLOWED_ROLES.indexOf(r) !== -1; })) return;

    if (OPEN_DOMAINS.length) {
      var domId = info.domId || '';
      if (OPEN_DOMAINS.indexOf(domId) === -1) return;
    }

    FILES.forEach(function (file) {
      var script = document.createElement('script');
      script.src = file.src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onerror = function () {
        console.error('[GDA loader] ' + file.name + ' 加载失败：' + file.src);
      };
      document.head.appendChild(script);
    });
  });
})();
