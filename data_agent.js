(function () {
  'use strict';
  console.log('[GDA data_agent scene] loaded — Dataset Scene Protocol v1');

  // ── Configuration ─────────────────────────────────────────────────────────
  var _RUNTIME_CONFIG = window.__GD_DATA_AGENT_CONFIG__ || {};
  var AGENT_URL = _RUNTIME_CONFIG.agentUrl || 'https://yf-agent.paas.cmbchina.cn';
  // 直连开关（便于验证单进程合并部署）：
  //   true  = 浏览器直接请求 AGENT_URL（同源反代 /agentsvc/data 或 CSP 允许时用）；
  //   false = 经观远 /api/forward/as-proxy 转发（默认，绕开跨域）。
  // localhost 恒直连，不受此开关影响。
  var DIRECT_CONNECT = _RUNTIME_CONFIG.directConnect === true;
  // 公网 PoC 默认使用固定版本 CDN；可通过运行时配置覆盖，避免使用 latest 带来兼容性漂移。
  var _MARKED_URL_CDN = _RUNTIME_CONFIG.markedUrl || 'https://cdn.jsdelivr.net/npm/marked@15.0.12/marked.min.js';
  var _CHART_URL_CDN  = _RUNTIME_CONFIG.chartUrl || 'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js';

  // ── 域名映射：办公网 → 业务网 ──────────────────────────────────────────────
  // 问题：前端在办公网（.com），agent 后端在业务网（.cn），agent 拿着办公网域名
  // 调 BI API 会超时。此开关将 location.origin 映射为业务网域名再传给后端。
  //   true  = 启用映射（生产默认），false = 关闭（本地测试 / 全链路同网时）
  var BI_DOMAIN_MAP_ENABLED = true;
  // key = 办公网域名（用户浏览器侧），value = 对应的业务网域名（agent 后端可达）
  var BI_DOMAIN_MAP = {
    'yuanfang2.cmbchina.com': 'yuanfang2.cmbchina.cn',
    'yf2-cmb.cmbchina.com':   'yf2-cmb.cmbchina.cn'
  };

  function _resolveBiBaseUrl(pageOrigin) {
    var origin = pageOrigin || location.origin;   // e.g. 'https://yf2-cmb.cmbchina.com'
    // 解析 hostname，仅替换 host 部分（保留 protocol 与 port）
    var a = document.createElement('a');
    a.href = origin;
    var host = a.hostname;
    if (BI_DOMAIN_MAP_ENABLED && BI_DOMAIN_MAP[host]) {
      var mapped = origin.replace(host, BI_DOMAIN_MAP[host]);
      console.log('[GDA] BI 域名映射：' + origin + ' → ' + mapped);
      return mapped;
    }
    return origin;
  }

  // ── Script loader ──────────────────────────────────────────────────────────
  function _loadScript(src, globalName) {
    return new Promise(function (resolve, reject) {
      if (globalName && window[globalName]) { resolve(); return; }
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // ── Token fetch ────────────────────────────────────────────────────────────
  async function _fetchToken() {
    if (_sceneContext && typeof _sceneContext.getBiToken === 'function') {
      try { return await _sceneContext.getBiToken(); } catch (e) { return ''; }
    }
    try {
      var r = await fetch('/api/user/token');
      if (!r.ok) return '';
      var j = await r.json();
      return j.uIdToken || '';
    } catch (e) { return ''; }
  }

  // ── User fetch（埋点身份维度：loginId / domId） ──────────────────────────────
  async function _fetchUser() {
    if (_sceneContext && _sceneContext.user) {
      var current = _sceneContext.user;
      return { loginId: current.loginId || '', domId: current.domId || '' };
    }
    try {
      var u = await GD.getUser();   // 兼容同步返回对象或 Promise
      var info = (u && u.$) || u || {};   // 字段或在 .$ 下，或直接挂顶层
      return { loginId: info.loginId || '', domId: info.domId || '' };
    } catch (e) { return { loginId: '', domId: '' }; }
  }

  // ── State ──────────────────────────────────────────────────────────────────
  var _sid = crypto.randomUUID();
  var _history = [];
  var _reader = null;
  var _thinkBody = null, _thinkCollapse = null;
  var _reasoningBody = null, _reasoningCollapse = null;
  var _msgBubble = null, _msgText = '', _msgCharts = {};
  var _toolBlock = null;
  var _clarifyQuestion = null;
  var _biToken = '';
  var _user = { loginId: '', domId: '' };   // 埋点身份维度
  var _pageInfo = null;
  var _suggestions = null;          // 快捷问题，页面加载时预取；null=未取到
  var _suggestFetching = false;
  var _chat, _inp, _bs, _bx, _dot, _st;
  var _root = null;
  var _sceneContext = null;

  function _byId(id) {
    return _root ? _root.querySelector('#' + id) : null;
  }

  // 取列失败 / 后端不可达时的前端兜底（与后端 STATIC_SUGGESTIONS 同义）
  var _STATIC_SUGGESTIONS = ['这个数据集里有哪些字段？', '帮我看一下数据概况', '数据量有多大？'];

  // ── CSS ────────────────────────────────────────────────────────────────────
  var _CSS = [
    /* Scene root: outer size and visibility are controlled by shell.js. */
    '#gda-drawer{position:relative;width:100%;height:100%;overflow:hidden;',
    'display:flex;flex-direction:column;background:#FAFBFD;',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
    'font-size:14px;color:#1e2a4a;}',
    '#gda-drawer *,#gda-drawer *::before,#gda-drawer *::after{box-sizing:border-box;margin:0;padding:0;}',

    /* Header */
    '#gda-header{padding:12px 16px;background:#fff;border-bottom:1px solid #c7d8fa;',
    'display:flex;align-items:center;gap:10px;flex-shrink:0;',
    'box-shadow:0 2px 8px rgba(37,99,235,.09);}',
    '#gda-header-title{font-size:14px;font-weight:700;color:#2563eb;flex:1;}',
    '#gda-status-wrap{display:flex;align-items:center;gap:6px;}',
    '#gda-st{font-size:12px;color:#6b7a99;}',
    '#gda-dot{width:8px;height:8px;border-radius:50%;background:#6b7a99;flex-shrink:0;}',
    '#gda-dot.run{background:#d97706;animation:gda-blink 1s infinite;}',
    '#gda-dot.ok{background:#059669;}',
    '#gda-dot.err{background:#dc2626;}',
    '@keyframes gda-blink{0%,100%{opacity:1}50%{opacity:.3}}',
    /* Chat area */
    '#gda-chat{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:6px;background:#fff;}',
    '#gda-chat::-webkit-scrollbar{width:4px;}',
    '#gda-chat::-webkit-scrollbar-track{background:transparent;}',
    '#gda-chat::-webkit-scrollbar-thumb{background:#c7d8fa;border-radius:2px;}',

    /* Bubbles */
    '#gda-drawer .gda-u{align-self:flex-end;max-width:78%;}',
    '#gda-drawer .gda-u .gda-b{background:linear-gradient(135deg,#2563eb,#1d4ed8);',
    'color:#fff;padding:10px 15px;border-radius:18px 18px 4px 18px;',
    'font-size:13px;line-height:1.55;white-space:pre-wrap;',
    'box-shadow:0 2px 8px rgba(37,99,235,.2);}',
    '#gda-drawer .gda-a{align-self:flex-start;max-width:92%;}',
    '#gda-drawer .gda-a .gda-b{background:#fff;padding:11px 15px;',
    'border-radius:4px 18px 18px 18px;font-size:13px;line-height:1.65;word-break:break-word;',
    'box-shadow:0 1px 3px rgba(37,99,235,.08);}',

    /* Thinking */
    '#gda-drawer .gda-th{align-self:flex-start;width:100%;border-left:2px solid #bfdbfe;padding-left:12px;}',
    '#gda-drawer .gda-ch{display:flex;align-items:center;gap:6px;padding:4px 10px;',
    'background:#f0f5ff;border-radius:20px;border:none;cursor:pointer;',
    'font-size:12px;color:#1e2a4a;user-select:none;transition:background .15s;',
    'width:fit-content;min-width:120px;}',
    '#gda-drawer .gda-ch:hover{background:#e0ebff;}',
    '#gda-drawer .gda-ch.open{background:#fafbff;}',
    '#gda-drawer .gda-ch.open:hover{background:#eef3ff;}',
    '#gda-drawer .gda-arr{margin-left:auto;font-size:9px;opacity:0;transition:opacity .15s,transform .2s;}',
    '#gda-drawer .gda-ch:hover .gda-arr,#gda-drawer .gda-ch.open .gda-arr{opacity:1;}',
    '#gda-drawer .gda-ch.open .gda-arr{transform:rotate(180deg);}',
    '#gda-drawer .gda-cb{background:#fafbff;border:1px solid #c7d8fa;border-radius:8px;',
    'margin-top:4px;padding:8px 11px;font-size:11px;color:#6b7a99;',
    'white-space:pre-wrap;line-height:1.65;max-height:180px;overflow-y:auto;}',
    '#gda-drawer .gda-cb.hide{display:none;}',

    /* Tool */
    '#gda-drawer .gda-tb{align-self:flex-start;width:100%;border-left:2px solid #bfdbfe;padding-left:12px;}',
    '#gda-drawer .gda-th2{display:flex;align-items:center;gap:6px;padding:4px 10px;',
    'background:#f0f5ff;border-radius:20px;border:none;cursor:pointer;',
    'font-size:12px;color:#1e2a4a;user-select:none;transition:background .15s;',
    'width:fit-content;min-width:140px;}',
    '#gda-drawer .gda-th2:hover{background:#e0ebff;}',
    '#gda-drawer .gda-th2.open{background:#fafbff;}',
    '#gda-drawer .gda-th2.open:hover{background:#eef3ff;}',
    '#gda-drawer .gda-th2:hover .gda-arr,#gda-drawer .gda-th2.open .gda-arr{opacity:1;}',
    '#gda-drawer .gda-th2.open .gda-arr{transform:rotate(180deg);}',
    '#gda-drawer .gda-tn{font-weight:600;}',
    '#gda-drawer .gda-ts{margin-left:auto;font-size:11px;padding:1px 7px;',
    'border-radius:10px;font-weight:500;flex-shrink:0;}',
    '#gda-drawer .gda-ts.run{background:#fef3c7;color:#92400e;}',
    '#gda-drawer .gda-ts.ok{display:none;}',
    '#gda-drawer .gda-ts.err{background:#fee2e2;color:#991b1b;}',
    '#gda-drawer .gda-tb2{background:#fafbff;border:1px solid #c7d8fa;',
    'border-radius:8px;margin-top:4px;overflow:hidden;}',
    '#gda-drawer .gda-tb2.hide{display:none;}',
    '#gda-drawer .gda-ts2{padding:6px 11px;border-bottom:1px solid #c7d8fa;}',
    '#gda-drawer .gda-ts2:last-child{border-bottom:none;}',
    '#gda-drawer .gda-tl{font-size:9px;color:#6b7a99;text-transform:uppercase;',
    'letter-spacing:.06em;margin-bottom:3px;font-weight:600;}',
    '#gda-drawer .gda-ts2 pre{font-family:Consolas,monospace;font-size:10px;color:#1e2a4a;',
    'white-space:pre-wrap;word-break:break-all;}',

    /* Error / end */
    '#gda-drawer .gda-er{align-self:flex-start;max-width:92%;}',
    '#gda-drawer .gda-er .gda-b{background:#fff1f2;border:1px solid #fecdd3;',
    'color:#dc2626;padding:9px 13px;border-radius:10px;font-size:12px;}',
    '#gda-drawer .gda-se{align-self:center;font-size:11px;color:#6b7a99;',
    'padding:3px 12px;background:#fff;border-radius:20px;border:1px solid #c7d8fa;}',

    /* Typing dots */
    '#gda-drawer .gda-ty{display:flex;gap:5px;padding:11px 13px;}',
    '#gda-drawer .gda-ty span{width:6px;height:6px;background:#c7d8fa;border-radius:50%;',
    'animation:gda-bounce 1.2s infinite;}',
    '#gda-drawer .gda-ty span:nth-child(2){animation-delay:.2s;}',
    '#gda-drawer .gda-ty span:nth-child(3){animation-delay:.4s;}',
    '@keyframes gda-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}',

    /* Markdown */
    '#gda-drawer .gda-md-body{white-space:normal;}',
    '#gda-drawer .gda-md-body p{margin:0 0 7px;line-height:1.7;}',
    '#gda-drawer .gda-md-body p:last-child{margin-bottom:0;}',
    '#gda-drawer .gda-md-body strong{font-weight:700;color:#1e2a4a;}',
    '#gda-drawer .gda-md-body em{font-style:italic;color:#6b7a99;}',
    '#gda-drawer .gda-md-body code{font-family:Consolas,monospace;font-size:11px;',
    'background:#eff6ff;padding:1px 5px;border-radius:4px;color:#1d4ed8;border:1px solid #dbeafe;}',
    '#gda-drawer .gda-md-body pre{background:#eef2ff;border:1px solid #c7d8fa;',
    'border-radius:8px;padding:10px 12px;overflow-x:auto;margin:7px 0;}',
    '#gda-drawer .gda-md-body pre code{background:none;padding:0;border:none;color:#1e2a4a;}',
    '#gda-drawer .gda-md-body ul,#gda-drawer .gda-md-body ol{margin:4px 0 7px 18px;}',
    '#gda-drawer .gda-md-body li{margin-bottom:3px;line-height:1.6;}',
    '#gda-drawer .gda-md-body h1,#gda-drawer .gda-md-body h2,#gda-drawer .gda-md-body h3',
    '{font-weight:700;margin:9px 0 5px;color:#1e2a4a;}',
    '#gda-drawer .gda-md-body h1{font-size:16px;}',
    '#gda-drawer .gda-md-body h2{font-size:14px;}',
    '#gda-drawer .gda-md-body h3{font-size:13px;}',
    '#gda-drawer .gda-md-body table{border-collapse:collapse;width:100%;margin:8px 0;',
    'font-size:12px;border-radius:6px;overflow:hidden;}',
    '#gda-drawer .gda-md-body th{background:#2563eb;color:#fff;font-size:10px;',
    'text-transform:uppercase;letter-spacing:.05em;padding:6px 10px;text-align:left;font-weight:600;}',
    '#gda-drawer .gda-md-body td{padding:5px 10px;border:1px solid #c7d8fa;line-height:1.5;}',
    '#gda-drawer .gda-md-body tr:nth-child(even) td{background:#eff6ff;}',
    '#gda-drawer .gda-md-body blockquote{border-left:3px solid #2563eb;margin:7px 0;',
    'padding:4px 11px;color:#6b7a99;background:#eff6ff;border-radius:0 6px 6px 0;}',

    /* Chart */
    '#gda-drawer .gda-chart-inline-holder{margin:8px 0;}',

    /* Clarify */
    '#gda-drawer .gda-clarify-card{align-self:flex-start;max-width:92%;}',
    '#gda-drawer .gda-clarify-card .gda-b{background:#fff;border:1.5px solid #2563eb;',
    'padding:13px 15px;border-radius:4px 18px 18px 18px;',
    'box-shadow:0 2px 8px rgba(37,99,235,.09);}',
    '#gda-drawer .gda-clarify-q{font-size:13px;color:#1e2a4a;margin-bottom:10px;',
    'line-height:1.55;font-weight:500;}',
    '#gda-drawer .gda-clarify-opts{display:flex;flex-wrap:wrap;gap:7px;}',
    '#gda-drawer .gda-clarify-btn{padding:5px 14px;border-radius:20px;',
    'border:1.5px solid #2563eb;background:transparent;color:#2563eb;',
    'cursor:pointer;font-size:12px;transition:all .15s;font-weight:500;}',
    '#gda-drawer .gda-clarify-btn:hover{background:#eff6ff;}',
    '#gda-drawer .gda-clarify-btn:disabled{border-color:#c7d8fa;color:#6b7a99;',
    'cursor:not-allowed;background:transparent;}',
    '#gda-drawer .gda-clarify-btn.selected{background:#2563eb;border-color:#2563eb;color:#fff;}',

    /* Input area */
    '#gda-input-area{padding:12px 14px 10px;background:#fff;flex-shrink:0;display:flex;flex-direction:column;}',
    '#gda-input-box{width:100%;',
    'background:linear-gradient(#fff,#fff) padding-box,',
    'linear-gradient(90deg,rgba(43,105,230,1),rgba(231,134,155,1)) border-box;',
    'border:1px solid transparent;border-radius:4px;padding:10px 12px 8px;}',
    '#gda-inp{width:100%;background:transparent;border:none;color:#202020;',
    'padding:0;font-size:14px;resize:none;min-height:45px;max-height:130px;',
    'line-height:1.6;font-family:inherit;outline:none;display:block;}',
    '#gda-inp::placeholder{color:#808080;}',
    '#gda-input-footer{display:flex;justify-content:flex-end;align-items:center;gap:6px;margin-top:8px;}',
    '#gda-bs{width:30px;height:30px;background:#CDCDCD;border:none;border-radius:4px;',
    'cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'transition:background .15s;flex-shrink:0;}',
    '#gda-bs:hover:not(:disabled){background:#4A81FF;}',
    '#gda-bs:disabled{opacity:0.45;cursor:not-allowed;}',
    '#gda-bx{padding:4px 10px;background:transparent;color:#dc2626;',
    'border:1px solid #fecdd3;border-radius:4px;cursor:pointer;font-size:12px;',
    'height:30px;display:none;align-items:center;transition:background .15s;flex-shrink:0;}',
    '#gda-bx.show{display:flex;}',
    '#gda-bx:hover{background:#fff1f2;}',

    /* Welcome / empty state */
    '#gda-welcome{padding:18px 16px 6px;color:#202020;}',
    '#gda-drawer .gda-wel-title{font-size:18px;font-weight:500;margin-bottom:4px;line-height:1.5;}',
    '#gda-drawer .gda-wel-title-blue{background:linear-gradient(90deg,rgba(124,46,255,1),rgba(28,96,255,1));',
    '-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}',
    '#gda-drawer .gda-wel-sub{font-size:12px;color:#505050;margin:14px 0 8px;display:flex;align-items:center;gap:6px;}',
    '#gda-drawer .gda-wel-caps{margin:0;padding:0;list-style:none;',
    'background:#F7FAFF;border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:10px;}',
    '#gda-drawer .gda-wel-caps li{font-size:14px;line-height:1.4;color:#4A5565;',
    'display:flex;align-items:center;gap:10px;}',
    '#gda-drawer .gda-wel-icon{width:23px;height:23px;border-radius:50%;background:#EAEEFF;',
    'display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
    '#gda-drawer .gda-wel-chips{display:flex;flex-direction:column;gap:8px;}',
    '#gda-drawer .gda-wel-chip{text-align:left;padding:8px 12px;border-radius:8px;',
    'border:1px solid #E4EAEE;background:#fff;color:#202020;cursor:pointer;',
    'font-size:14px;line-height:1.4;transition:all .15s;font-family:inherit;',
    'display:flex;align-items:center;justify-content:space-between;gap:8px;}',
    '#gda-drawer .gda-wel-chip:first-child{border-color:#065BCE;}',
    '#gda-drawer .gda-wel-chip:hover{background:#f5f8ff;border-color:#4A81FF;}',
    '#gda-drawer .gda-wel-chip-arr{opacity:0.3;flex-shrink:0;color:#333;}',
    '#gda-drawer .gda-wel-loading{font-size:12px;color:#9aa7c2;}',

    /* Clear button */
    '#gda-clear{display:flex;align-items:center;gap:5px;padding:5px 12px 5px 10px;',
    'border-radius:20px;border:1px solid #E4EAEE;background:#fff;color:#505050;',
    'cursor:pointer;font-size:13px;font-family:inherit;align-self:flex-end;',
    'margin-bottom:8px;transition:background .15s,border-color .15s;flex-shrink:0;}',
    '#gda-clear:hover{background:#f5f5f5;border-color:#c8c8c8;}',
  ].join('');

  // ── Style injection ────────────────────────────────────────────────────────
  function _injectStyles() {
    if (_byId('gda-styles')) return;
    var style = document.createElement('style');
    style.id = 'gda-styles';
    style.textContent = _CSS;
    _root.appendChild(style);
  }

  // ── DOM creation ───────────────────────────────────────────────────────────
  function _createUI() {
    var drawer = document.createElement('div');
    drawer.id = 'gda-drawer';
    drawer.innerHTML =
      '<div id="gda-header">' +
        '<span id="gda-header-title">💬 AI 数据分析助手</span>' +
        '<div id="gda-status-wrap">' +
          '<span id="gda-dot"></span>' +
          '<span id="gda-st">就绪</span>' +
        '</div>' +
      '</div>' +
      '<div id="gda-chat"></div>' +
      '<div id="gda-input-area">' +
        '<button id="gda-clear" title="清空对话">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<g stroke="#000" stroke-width="1.5" stroke-linejoin="round" opacity="0.4">' +
              '<polygon points="1.75 2.1 1.75 14 12.25 14 12.25 2.1"/>' +
              '<line x1="5.6" y1="5.6" x2="5.6" y2="10.15" stroke-linecap="round"/>' +
              '<line x1="8.4" y1="5.6" x2="8.4" y2="10.15" stroke-linecap="round"/>' +
              '<line x1="0" y1="2.1" x2="14" y2="2.1" stroke-linecap="round"/>' +
              '<polygon points="4.2 2.1 5.35115 0 8.671985 0 9.8 2.1"/>' +
            '</g>' +
          '</svg>' +
          '清空对话' +
        '</button>' +
        '<div id="gda-input-box">' +
          '<textarea id="gda-inp" placeholder="请输入问题，按 Enter 发送…"></textarea>' +
          '<div id="gda-input-footer">' +
            '<button id="gda-bx">■ 停止</button>' +
            '<button id="gda-bs" title="发送">' +
              '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M14.4878559,0.051 L0.824069754,4.25542816 C-0.126500265,4.54702052 -0.299139781,5.81971061 0.53984616,6.35447204 L4.57582119,8.93459066 C5.00741998,9.21039282 5.56639305,9.17249634 5.95799,8.8430075 L10.9961164,4.59123308 C11.2698132,4.36069616 11.6382512,4.72913415 11.4066616,5.00177827 L7.1569925,10.0430627 C6.82740883,10.4337443 6.79029757,10.9933992 7.06540934,11.4241788 L9.64552796,15.4612065 C10.1823948,16.2991398 11.4529795,16.1254476 11.7456245,15.1759302 L15.947923,1.51214414 C16.0757522,1.09850657 15.9641741,0.648094371 15.6580399,0.341960125 C15.3519056,0.035825879 14.9014934,-0.075752203 14.4878559,0.052 Z" fill="white"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    _root.appendChild(drawer);

    // DOM refs
    _chat = _byId('gda-chat');
    _inp  = _byId('gda-inp');
    _bs   = _byId('gda-bs');
    _bx   = _byId('gda-bx');
    _dot  = _byId('gda-dot');
    _st   = _byId('gda-st');

    // Events
    _byId('gda-clear').onclick = _clearChat;
    _bs.onclick = function () { _send(); };
    _bx.onclick = function () { _stopStream(); };
    _inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _send(); }
    });
    _inp.addEventListener('input', function () {
      _inp.style.height = 'auto';
      _inp.style.height = Math.min(_inp.scrollHeight, 130) + 'px';
    });
    _renderWelcome();   // 空状态：能力介绍 + 快捷问题
  }

  // ── Welcome / suggested questions ───────────────────────────────────────────
  function _renderWelcome() {
    if (!_chat) return;
    var w = document.createElement('div');
    w.id = 'gda-welcome';
    var _diamondSvg = '<svg width="8" height="9" viewBox="0 0 8 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 0.5L8 4.5L4 8.5L0 4.5L4 0.5Z" fill="#4A81FF"/></svg>';
    var _icon2Svg = '<svg width="15" height="15" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0"><g transform="translate(1,1)" stroke="#4A81FF" stroke-width="1.5" stroke-linejoin="round"><polygon points="2.8 9.04 0 9.04 0 0 14 0 14 9.04 11.2 9.04"/><line x1="4.2" y1="5.22" x2="4.2" y2="6.61" stroke-linecap="round"/><line x1="7" y1="9.04" x2="7" y2="11.13" stroke-linecap="round"/><line x1="7" y1="3.83" x2="7" y2="6.61" stroke-linecap="round"/><line x1="9.8" y1="2.43" x2="9.8" y2="6.61" stroke-linecap="round"/><line x1="2.8" y1="11.83" x2="11.2" y2="11.83" stroke-linecap="round"/></g></svg>';
    var _icon3Svg = '<svg width="15" height="15" viewBox="0 0 14 17" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0"><g transform="translate(1,1)" stroke="#FFBA04" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12,6 C12,8.55 10.41,10.73 8.16,11.6 L6,11.6 L3.84,11.6 C1.59,10.73 0,8.55 0,6 C0,2.69 2.69,0 6,0 C9.31,0 12,2.69 12,6 Z"/><path d="M8.16,11.6 L7.9,14.66 C7.89,14.85 7.73,15 7.53,15 L4.47,15 C4.28,15 4.11,14.85 4.1,14.66 L3.84,11.6"/><polyline points="3.75 4.875 3.75 7.125 6 6 8.25 7.125 8.25 4.875"/></g></svg>';
    w.innerHTML =
      '<div class="gda-wel-title">👋 Hi，我是这个数据集的<span class="gda-wel-title-blue">AI分析助手</span></div>' +
      '<div class="gda-wel-sub">' + _icon2Svg + '我可以帮你</div>' +
      '<ul class="gda-wel-caps">' +
        '<li><span class="gda-wel-icon">' + _diamondSvg + '</span>取数、筛选、排序Top-N</li>' +
        '<li><span class="gda-wel-icon">' + _diamondSvg + '</span>趋势/归因/分布/相关性分析</li>' +
        '<li><span class="gda-wel-icon">' + _diamondSvg + '</span>预测未来走势，并直接给出图表</li>' +
      '</ul>' +
      '<div class="gda-wel-sub">' + _icon3Svg + '试试这样问</div>' +
      '<div class="gda-wel-chips" id="gda-wel-chips">' +
        '<span class="gda-wel-loading">正在为你准备问题…</span>' +
      '</div>';
    _chat.appendChild(w);
    _renderChips();
    if (!_suggestions) _fetchSuggestions();
  }

  function _renderChips() {
    var box = _byId('gda-wel-chips');
    if (!box) return;
    if (!_suggestions) return;     // 仍在预取，保留 loading 文案，待返回再渲染
    var list = _suggestions.length ? _suggestions : _STATIC_SUGGESTIONS;
    box.innerHTML = '';
    var _chipArr = '<svg class="gda-wel-chip-arr" width="5" height="10" viewBox="0 0 5 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L4 5L1 9" stroke="#333" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    list.forEach(function (q) {
      var b = document.createElement('button');
      b.className = 'gda-wel-chip';
      b.innerHTML = '<span>' + q + '</span>' + _chipArr;
      b.onclick = function () { _send(q); };
      box.appendChild(b);
    });
  }

  async function _fetchSuggestions() {
    if (_suggestFetching || !_pageInfo) return;
    _suggestFetching = true;
    var key = 'gda_suggest_' + _pageInfo.dsId;
    try {
      try {
        var cached = sessionStorage.getItem(key);
        if (cached) { _suggestions = JSON.parse(cached); return; }
      } catch (e) {}

      var payload = { ds_id: _pageInfo.dsId, bi_token: _biToken, bi_base_url: _pageInfo.biBaseUrl };
      // isLocal 此处语义为「直连」：真实 localhost 或显式 DIRECT_CONNECT
      var isLocal = DIRECT_CONNECT || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(AGENT_URL);
      var url = AGENT_URL + '/api/agent/suggestions';
      var res = await fetch(
        isLocal ? url : window.location.origin + '/api/forward/as-proxy',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: isLocal
            ? JSON.stringify(payload)
            : JSON.stringify(Object.assign({ url: url, method: 'POST' }, payload)),
          signal: _sceneContext && _sceneContext.abortSignal
        }
      );
      if (res.ok) {
        var j = await res.json();
        _suggestions = (j && j.suggestions) || [];
        try { sessionStorage.setItem(key, JSON.stringify(_suggestions)); } catch (e) {}
      } else {
        _suggestions = _STATIC_SUGGESTIONS.slice();
      }
    } catch (e) {
      _suggestions = _STATIC_SUGGESTIONS.slice();   // 后端不可达 → 前端兜底
    } finally {
      _suggestFetching = false;
      _renderChips();
    }
  }

  function _clearChat() {
    if (_reader) return; // 流式进行中不允许清空
    _chat.innerHTML = '';
    _history = [];
    _sid = crypto.randomUUID();
    _thinkBody = null; _thinkCollapse = null;
    _reasoningBody = null; _reasoningCollapse = null;
    _msgBubble = null; _msgText = ''; _msgCharts = {};
    _toolBlock = null; _clarifyQuestion = null;
    _setStatus('', '就绪');
    _renderWelcome();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function _scroll() { _chat.scrollTop = _chat.scrollHeight; }
  function _setStatus(cls, txt) {
    _dot.setAttribute('class', cls || '');
    _st.textContent = txt;
  }

  // ── Chat UI builders ───────────────────────────────────────────────────────
  function _mkUser(text) {
    var d = document.createElement('div');
    d.className = 'gda-u';
    d.innerHTML = '<div class="gda-b">' + _esc(text) + '</div>';
    _chat.appendChild(d); _scroll();
  }

  function _mkTyping() {
    var d = document.createElement('div');
    d.className = 'gda-a'; d.id = '_gda_ty';
    d.innerHTML = '<div class="gda-b gda-ty"><span></span><span></span><span></span></div>';
    _chat.appendChild(d); _scroll(); return d;
  }

  function _rmTyping() { var e = _byId('_gda_ty'); if (e) e.remove(); }

  function _mkThinking() {
    var wrap = document.createElement('div');
    wrap.className = 'gda-th';
    var hdr = document.createElement('div');
    hdr.className = 'gda-ch open';
    hdr.innerHTML = '<span>💭</span><span style="font-weight:500">thinking</span><span class="gda-arr">▼</span>';
    var body = document.createElement('div');
    body.className = 'gda-cb';
    hdr.onclick = function () { hdr.classList.toggle('open'); body.classList.toggle('hide'); };
    wrap.appendChild(hdr); wrap.appendChild(body);
    _chat.appendChild(wrap); _scroll();
    _thinkCollapse = function () { hdr.classList.remove('open'); body.classList.add('hide'); };
    return body;
  }

  function _mkReasoning() {
    var wrap = document.createElement('div');
    wrap.className = 'gda-th';
    var hdr = document.createElement('div');
    hdr.className = 'gda-ch open';
    hdr.innerHTML = '<span>💭</span><span style="font-weight:500">thinking</span><span class="gda-arr">▼</span>';
    var body = document.createElement('div');
    body.className = 'gda-cb';
    hdr.onclick = function () { hdr.classList.toggle('open'); body.classList.toggle('hide'); };
    wrap.appendChild(hdr); wrap.appendChild(body);
    _chat.appendChild(wrap); _scroll();
    _reasoningCollapse = function () { hdr.classList.remove('open'); body.classList.add('hide'); };
    return body;
  }

  function _mkTool(name, args) {
    var wrap = document.createElement('div');
    wrap.className = 'gda-tb';
    var hdr = document.createElement('div');
    hdr.className = 'gda-th2';
    hdr.innerHTML =
      '<span>🔧</span><span class="gda-tn">' + _esc(name) + '</span>' +
      '<span class="gda-ts run">执行中</span><span class="gda-arr">▼</span>';
    var body = document.createElement('div');
    body.className = 'gda-tb2 hide';
    var argDiv = document.createElement('div');
    argDiv.className = 'gda-ts2';
    argDiv.innerHTML = '<div class="gda-tl">参数</div><pre>' + _esc(JSON.stringify(args, null, 2)) + '</pre>';
    var resDiv = document.createElement('div');
    resDiv.className = 'gda-ts2 gda-tool-res';
    resDiv.style.display = 'none';
    resDiv.innerHTML = '<div class="gda-tl">结果摘要</div><pre class="gda-tool-res-pre"></pre>';
    body.appendChild(argDiv);
    body.appendChild(resDiv);
    hdr.onclick = function () { body.classList.toggle('hide'); hdr.classList.toggle('open'); };
    wrap.appendChild(hdr); wrap.appendChild(body);
    _chat.appendChild(wrap); _scroll();
    return wrap;
  }

  function _updateTool(wrap, status, summary) {
    var ts = wrap.querySelector('.gda-ts');
    var resDiv = wrap.querySelector('.gda-tool-res');
    var resPre = wrap.querySelector('.gda-tool-res-pre');
    if (ts) { ts.className = 'gda-ts ' + status; ts.textContent = status === 'ok' ? '✓ 完成' : '✗ 失败'; }
    if (resDiv && resPre) { resDiv.style.display = ''; resPre.textContent = summary; }
  }

  function _mkMsg() {
    _rmTyping();
    var d = document.createElement('div');
    d.className = 'gda-a';
    var b = document.createElement('div');
    b.className = 'gda-b gda-md-body';
    d.appendChild(b); _chat.appendChild(d); _scroll();
    return b;
  }

  function _mkClarify(question, options) {
    _rmTyping();
    var d = document.createElement('div');
    d.className = 'gda-clarify-card';
    var b = document.createElement('div');
    b.className = 'gda-b';
    var q = document.createElement('div');
    q.className = 'gda-clarify-q';
    q.textContent = '🤔 ' + question;
    var opts = document.createElement('div');
    opts.className = 'gda-clarify-opts';
    options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.className = 'gda-clarify-btn';
      btn.textContent = opt;
      btn.onclick = function () {
        d.querySelectorAll('.gda-clarify-btn').forEach(function (b) { b.disabled = true; });
        btn.classList.add('selected');
        _send(opt);
      };
      opts.appendChild(btn);
    });
    b.appendChild(q); b.appendChild(opts); d.appendChild(b);
    _chat.appendChild(d); _scroll();
  }

  function _mkError(code, msg) {
    _rmTyping();
    var d = document.createElement('div');
    d.className = 'gda-er';
    d.innerHTML = '<div class="gda-b">⚠️ <b>' + _esc(code) + '</b>: ' + _esc(msg) + '</div>';
    _chat.appendChild(d); _scroll();
  }

  function _mkEnd(usage) {
    var d = document.createElement('div');
    d.className = 'gda-se';
    var tok = usage && usage.total_tokens != null ? usage.total_tokens + ' tokens' : '';
    var dur = usage && usage.duration_ms ? ' · ' + (usage.duration_ms / 1000).toFixed(1) + 's' : '';
    d.textContent = '✓ 完成' + (tok ? ' · ' + tok : '') + dur;
    _chat.appendChild(d); _scroll();
  }

  // ── Markdown / chart rendering ─────────────────────────────────────────────
  function _renderMsgBubble(bubble, text, charts) {
    var html = text.replace(
      /\[chart:([\w]+)\]/g,
      function (_, ref) { return '\n<div class="gda-chart-inline-holder" data-ref="' + ref + '"></div>\n'; }
    );
    bubble.innerHTML = marked.parse(html.replace(/(?<!~)~(?!~)/g, '\\~'));
    bubble.querySelectorAll('.gda-chart-inline-holder:not([data-rendered])').forEach(function (holder) {
      var ref = holder.dataset.ref;
      var p = charts[ref];
      if (p) {
        holder.dataset.rendered = '1';
        var canvas = document.createElement('canvas');
        holder.appendChild(canvas);
        var ct = p.chart_type || 'bar';
        if (ct === 'line') _renderLine(canvas, p);
        else if (ct === 'scatter') _renderScatter(canvas, p);
        else if (ct === 'heatmap') _renderHeatmap(canvas, p);
        else if (ct === 'retention_matrix') _renderRetentionMatrix(canvas, p);
        else if (ct === 'forecast') _renderForecast(canvas, p);
        else _renderBar(canvas, p);
      }
    });
  }

  function _finalizeMsgBubble() {
    if (_msgBubble && _msgText) {
      _renderMsgBubble(_msgBubble, _msgText, _msgCharts);
      _msgBubble.querySelectorAll('.gda-chart-inline-holder:not([data-rendered])').forEach(function (holder) {
        var ref = holder.dataset.ref;
        var p = _msgCharts[ref];
        if (p) {
          holder.dataset.rendered = '1';
          var canvas = document.createElement('canvas');
          holder.appendChild(canvas);
          var ct2 = p.chart_type || 'bar';
          if (ct2 === 'line') _renderLine(canvas, p);
          else if (ct2 === 'scatter') _renderScatter(canvas, p);
          else if (ct2 === 'heatmap') _renderHeatmap(canvas, p);
          else if (ct2 === 'retention_matrix') _renderRetentionMatrix(canvas, p);
          else if (ct2 === 'forecast') _renderForecast(canvas, p);
          else _renderBar(canvas, p);
        }
      });
    }
    _msgBubble = null; _msgText = ''; _msgCharts = {};
  }

  // ── Chart rendering ────────────────────────────────────────────────────────
  var _COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#ea580c', '#dc2626'];
  var _SCALE = {
    ticks: { color: '#6b7a99', font: { size: 10 }, maxTicksLimit: 8 },
    grid: { color: '#e2e8f0' }
  };

  function _renderLine(canvas, p) {
    var dense = (p.x || []).length > 40;
    new Chart(canvas, {
      type: 'line',
      data: {
        labels: p.x || [],
        datasets: (p.series || []).map(function (s, i) {
          return {
            label: s.name, data: s.data,
            borderColor: _COLORS[i % _COLORS.length],
            backgroundColor: 'transparent',
            borderWidth: i === 0 ? 2 : 1.5,
            borderDash: i > 0 ? [4, 3] : [],
            pointRadius: dense ? 0 : 2,
            tension: 0.3, spanGaps: true
          };
        })
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#6b7a99', font: { size: 10 }, boxWidth: 10 } } },
        scales: { x: _SCALE, y: _SCALE }
      }
    });
  }

  function _renderForecast(canvas, p) {
    var allX = p.x || [];
    var splitIdx = p.split_index || 0;
    var dense = allX.length > 40;
    var datasets;
    if (p.series) {
      datasets = (p.series || []).map(function (s, i) {
        var c = _COLORS[i % _COLORS.length];
        return {
          label: s.name, data: s.data,
          borderColor: c, backgroundColor: 'transparent', borderWidth: 2,
          segment: {
            borderDash: function (ctx) { return ctx.p1DataIndex > splitIdx - 1 ? [6, 3] : undefined; },
            borderColor: function (ctx) { return ctx.p1DataIndex > splitIdx - 1 ? c + 'aa' : c; },
          },
          pointRadius: dense ? 0 : 2, tension: 0.3, spanGaps: true
        };
      });
    } else {
      var hist = p.historical || [];
      var fc = p.forecast || [];
      var lower = p.lower_bound || [];
      var upper = p.upper_bound || [];
      var histLen = hist.length;
      var upperPad = new Array(histLen).fill(null).concat(upper);
      var lowerPad = new Array(histLen).fill(null).concat(lower);
      datasets = [
        {
          label: '实际值 / 预测值', data: hist.concat(fc),
          borderColor: '#2563eb', backgroundColor: 'transparent', borderWidth: 2,
          segment: {
            borderDash: function (ctx) { return ctx.p1DataIndex > histLen - 1 ? [6, 3] : undefined; },
            borderColor: function (ctx) { return ctx.p1DataIndex > histLen - 1 ? 'rgba(37,99,235,0.75)' : '#2563eb'; },
          },
          pointRadius: dense ? 0 : 2, tension: 0.3, spanGaps: false
        },
        {
          label: (p.confidence || 95) + '% 置信上限', data: upperPad,
          borderColor: 'rgba(37,99,235,0.2)', backgroundColor: 'rgba(37,99,235,0.1)',
          borderWidth: 1, pointRadius: 0, fill: '+1', tension: 0.3, spanGaps: false
        },
        {
          label: (p.confidence || 95) + '% 置信下限', data: lowerPad,
          borderColor: 'rgba(37,99,235,0.2)', backgroundColor: 'transparent',
          borderWidth: 1, pointRadius: 0, fill: false, tension: 0.3, spanGaps: false
        }
      ];
    }
    new Chart(canvas, {
      type: 'line',
      data: { labels: allX, datasets: datasets },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: '#6b7a99', font: { size: 10 }, boxWidth: 10,
              filter: function (item) { return item.text.indexOf('置信') === -1; }
            }
          }
        },
        scales: { x: _SCALE, y: _SCALE }
      }
    });
  }

  function _renderBar(canvas, p) {
    var multi = (p.series || []).length > 1;
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: p.x || [],
        datasets: (p.series || []).map(function (s, i) {
          return {
            label: s.name, data: s.data,
            backgroundColor: _COLORS[i % _COLORS.length] + (multi ? 'cc' : '99'),
            borderColor: _COLORS[i % _COLORS.length],
            borderWidth: 1, borderRadius: 3
          };
        })
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: multi, labels: { color: '#6b7a99', font: { size: 10 }, boxWidth: 10 } }
        },
        scales: {
          x: Object.assign({}, _SCALE, { ticks: Object.assign({}, _SCALE.ticks, { maxRotation: 45 }) }),
          y: _SCALE
        }
      }
    });
  }

  function _renderScatter(canvas, p) {
    var labels = p.labels || null;
    var xTicks = labels
      ? Object.assign({}, _SCALE.ticks, {
          callback: function (v) {
            return Number.isInteger(v) && labels[v] != null ? labels[v] : v;
          }
        })
      : _SCALE.ticks;
    new Chart(canvas, {
      type: 'scatter',
      data: {
        datasets: (p.series || []).map(function (s, i) {
          return {
            label: s.name,
            data: s.data,
            backgroundColor: _COLORS[i % _COLORS.length] + (i === 0 ? '55' : 'dd'),
            borderColor: _COLORS[i % _COLORS.length],
            borderWidth: i === 0 ? 1 : 1.5,
            pointRadius: i === 0 ? 3 : 6,
            pointHoverRadius: i === 0 ? 5 : 8
          };
        })
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#6b7a99', font: { size: 10 }, boxWidth: 10 } },
          tooltip: {
            callbacks: labels ? {
              label: function (ctx) {
                var xl = Number.isInteger(ctx.parsed.x) && labels[ctx.parsed.x] != null
                  ? labels[ctx.parsed.x] : ctx.parsed.x;
                return ctx.dataset.label + ': (' + xl + ', ' + ctx.parsed.y + ')';
              }
            } : {}
          }
        },
        scales: {
          x: Object.assign({}, _SCALE, { ticks: xTicks },
            p.x_label ? { title: { display: true, text: p.x_label, color: '#6b7a99', font: { size: 10 } } } : {}
          ),
          y: Object.assign({}, _SCALE,
            p.y_label ? { title: { display: true, text: p.y_label, color: '#6b7a99', font: { size: 10 } } } : {}
          )
        }
      }
    });
  }

  function _renderHeatmap(canvas, p) {
    var cols = p.columns || [];
    var corr = p.correlation || [];
    var pvals = p.p_values || [];
    var n = cols.length;
    if (n < 2) return;

    var cellSize = n <= 4 ? 72 : n <= 6 ? 60 : n <= 8 ? 50 : 42;
    var labelPad = 90;
    var W = labelPad + n * cellSize + 40; // +40 for right-side legend bar + labels
    var H = labelPad + n * cellSize;
    canvas.width = W;
    canvas.height = H;
    canvas.style.maxWidth = '100%';

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    function cellColor(r) {
      var t = Math.max(-1, Math.min(1, isNaN(r) ? 0 : r));
      if (t >= 0) {
        return 'rgb(' + Math.round(255 - 26 * t) + ',' + Math.round(255 - 198 * t) + ',' + Math.round(255 - 202 * t) + ')';
      } else {
        var a = -t;
        return 'rgb(' + Math.round(255 - 225 * a) + ',' + Math.round(255 - 119 * a) + ',' + Math.round(255 - 26 * a) + ')';
      }
    }

    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        var r = (corr[i] || [])[j];
        var pv = (pvals[i] || [])[j];
        var x = labelPad + j * cellSize;
        var y = labelPad + i * cellSize;

        ctx.fillStyle = (r == null || isNaN(r)) ? '#f0f5ff' : cellColor(r);
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);

        if (r == null || isNaN(r)) {
          ctx.fillStyle = '#aaa';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('N/A', x + cellSize / 2, y + cellSize / 2);
          continue;
        }

        var insig = pv != null && pv > 0.05 && i !== j;
        var bright = Math.abs(r) > 0.6;
        ctx.fillStyle = bright ? '#fff' : (insig ? '#999' : '#1e2a4a');
        var fs = Math.max(9, Math.min(13, cellSize / 5));
        ctx.font = (insig ? 'italic ' : '') + fs + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var label = i === j ? '1.00' : r.toFixed(2) + (insig ? '*' : '');
        ctx.fillText(label, x + cellSize / 2, y + cellSize / 2);
      }
    }

    var lfs = Math.max(9, Math.min(12, cellSize / 5));
    ctx.fillStyle = '#1e2a4a';
    ctx.font = lfs + 'px sans-serif';

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var ri = 0; ri < n; ri++) {
      var rl = cols[ri].length > 13 ? cols[ri].slice(0, 12) + '…' : cols[ri];
      ctx.fillText(rl, labelPad - 8, labelPad + ri * cellSize + cellSize / 2);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (var ci = 0; ci < n; ci++) {
      var cl = cols[ci].length > 13 ? cols[ci].slice(0, 12) + '…' : cols[ci];
      ctx.save();
      ctx.translate(labelPad + ci * cellSize + cellSize / 2, labelPad - 8);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(cl, 0, 0);
      ctx.restore();
    }

    var lgX = labelPad + n * cellSize + 10;
    var lgH = n * cellSize;
    var lgY = labelPad;
    var grad = ctx.createLinearGradient(0, lgY, 0, lgY + lgH);
    grad.addColorStop(0, 'rgb(229,57,53)');
    grad.addColorStop(0.5, 'rgb(255,255,255)');
    grad.addColorStop(1, 'rgb(30,136,229)');
    ctx.fillStyle = grad;
    ctx.fillRect(lgX, lgY, 10, lgH);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(lgX, lgY, 10, lgH);
    ctx.fillStyle = '#6b7a99';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('+1', lgX + 13, lgY);
    ctx.fillText('0',  lgX + 13, lgY + lgH / 2);
    ctx.fillText('-1', lgX + 13, lgY + lgH);
  }

  function _renderRetentionMatrix(canvas, p) {
    var days = p.retention_days || [0, 1, 7, 14, 30];
    var cohortDates = p.cohort_dates || [];
    var cohortSizes = p.cohort_sizes || [];
    var matrix = p.retention_matrix || [];
    var avgRet = p.avg_retention || [];
    var n = cohortDates.length;
    if (n === 0) return;

    var MAX_ROWS = 25;
    var startIdx = Math.max(0, n - MAX_ROWS);
    var showRows = n - startIdx;

    var dateW = 72, sizeW = 54;
    var cellW = Math.max(44, Math.min(62, Math.floor(360 / Math.max(1, days.length))));
    var hdrH = 28, cellH = 26;
    var W = dateW + sizeW + days.length * cellW;
    var H = hdrH + cellH + showRows * cellH;

    canvas.width = W;
    canvas.height = H;
    canvas.style.maxWidth = '100%';

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    function retColor(rate) {
      if (rate == null) return '#f0f4fb';
      var t = Math.max(0, Math.min(100, rate)) / 100;
      return 'rgb(' + Math.round(255 - 218 * t) + ',' + Math.round(255 - 156 * t) + ',' + Math.round(255 - 20 * t) + ')';
    }

    function txtColor(rate) {
      return (rate != null && rate >= 60) ? '#ffffff' : '#1e2a4a';
    }

    // Header row
    ctx.fillStyle = '#dde8f8';
    ctx.fillRect(0, 0, W, hdrH);
    ctx.fillStyle = '#1e2a4a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('日期', dateW / 2, hdrH / 2);
    ctx.fillText('用户数', dateW + sizeW / 2, hdrH / 2);
    days.forEach(function (day, i) {
      ctx.fillText('D' + day, dateW + sizeW + i * cellW + cellW / 2, hdrH / 2);
    });

    // Average row
    var avgY = hdrH;
    ctx.fillStyle = '#eef2ff';
    ctx.fillRect(0, avgY, dateW + sizeW, cellH);
    ctx.fillStyle = '#1e2a4a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('平均', dateW / 2, avgY + cellH / 2);
    ctx.fillStyle = '#6b7a99';
    ctx.fillText('—', dateW + sizeW / 2, avgY + cellH / 2);
    days.forEach(function (day, i) {
      var rate = avgRet[i];
      var x = dateW + sizeW + i * cellW;
      ctx.fillStyle = retColor(rate);
      ctx.fillRect(x, avgY, cellW, cellH);
      ctx.fillStyle = txtColor(rate);
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rate != null ? rate.toFixed(1) + '%' : '—', x + cellW / 2, avgY + cellH / 2);
    });

    // Data rows
    for (var ri = 0; ri < showRows; ri++) {
      var di = startIdx + ri;
      var rowY = hdrH + cellH + ri * cellH;
      var date = cohortDates[di] || '';
      var size = cohortSizes[di];
      var rates = matrix[di] || [];

      ctx.fillStyle = ri % 2 === 0 ? '#f8faff' : '#ffffff';
      ctx.fillRect(0, rowY, dateW + sizeW, cellH);
      ctx.fillStyle = '#1e2a4a';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(date.length >= 10 ? date.slice(5) : date, dateW / 2, rowY + cellH / 2);
      ctx.fillStyle = '#6b7a99';
      ctx.fillText(size != null ? Number(size).toLocaleString() : '—', dateW + sizeW / 2, rowY + cellH / 2);

      days.forEach(function (day, i) {
        var rate = rates[i];
        var x = dateW + sizeW + i * cellW;
        ctx.fillStyle = retColor(rate);
        ctx.fillRect(x, rowY, cellW, cellH);
        ctx.fillStyle = txtColor(rate);
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rate != null ? rate.toFixed(1) + '%' : '—', x + cellW / 2, rowY + cellH / 2);
      });
    }

    // Grid lines
    ctx.strokeStyle = '#c7d8fa';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0, 0, W, H);
    [[0, hdrH, W, hdrH], [0, hdrH + cellH, W, hdrH + cellH]].forEach(function (seg) {
      ctx.beginPath(); ctx.moveTo(seg[0], seg[1]); ctx.lineTo(seg[2], seg[3]); ctx.stroke();
    });
    [dateW, dateW + sizeW].forEach(function (x) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    });
    for (var ci = 1; ci < days.length; ci++) {
      var cx = dateW + sizeW + ci * cellW;
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    }
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.3;
    for (var rri = 0; rri < showRows; rri++) {
      var ry = hdrH + cellH + rri * cellH;
      ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(W, ry); ctx.stroke();
    }
  }

  // ── SSE event handler ──────────────────────────────────────────────────────
  function _handleEvent(type, data) {
    switch (type) {
      case 'session.start':
        _setStatus('run', '会话 ' + (data.session_id || '').slice(0, 8) + '…');
        _reasoningBody = null;
        break;
      case 'agent.reasoning':
        if (!_reasoningBody) _reasoningBody = _mkReasoning();
        _reasoningBody.textContent += (data.delta || '');
        _scroll();
        break;
      case 'agent.thinking':
        if (!_thinkBody) _thinkBody = _mkThinking();
        _thinkBody.textContent += (data.delta || '');
        _scroll();
        break;
      case 'tool.call_start':
        if (_thinkCollapse) { _thinkCollapse(); _thinkCollapse = null; _thinkBody = null; }
        if (_reasoningCollapse) { _reasoningCollapse(); _reasoningCollapse = null; _reasoningBody = null; }
        _toolBlock = _mkTool(data.tool, data.args || {});
        break;
      case 'tool.call_progress':
        break;
      case 'tool.call_result':
        if (_toolBlock) _updateTool(_toolBlock, data.status, data.summary || '');
        _toolBlock = null;
        break;
      case 'agent.message':
        if (!_msgBubble) {
          if (_reasoningCollapse) { _reasoningCollapse(); _reasoningCollapse = null; _reasoningBody = null; }
          if (_thinkCollapse) { _thinkCollapse(); _thinkCollapse = null; _thinkBody = null; }
          _msgBubble = _mkMsg();
        }
        _msgText += (data.delta || '');
        if (data.charts) Object.assign(_msgCharts, data.charts);
        if (data.done) {
          if (_msgBubble && Object.keys(_msgCharts).length > 0) {
            _msgBubble.querySelectorAll('.gda-chart-inline-holder:not([data-rendered])').forEach(function (holder) {
              var ref = holder.dataset.ref;
              var p = _msgCharts[ref];
              if (p) {
                holder.dataset.rendered = '1';
                var canvas = document.createElement('canvas');
                holder.appendChild(canvas);
                var ct3 = p.chart_type || 'bar';
                if (ct3 === 'line') _renderLine(canvas, p);
                else if (ct3 === 'scatter') _renderScatter(canvas, p);
                else if (ct3 === 'heatmap') _renderHeatmap(canvas, p);
                else if (ct3 === 'retention_matrix') _renderRetentionMatrix(canvas, p);
                else if (ct3 === 'forecast') _renderForecast(canvas, p);
                else _renderBar(canvas, p);
              }
            });
          }
          _msgBubble = null; _msgText = ''; _msgCharts = {};
        } else if (data.delta) {
          _renderMsgBubble(_msgBubble, _msgText, _msgCharts);
        }
        _scroll();
        break;
      case 'agent.message_cancel':
        if (_msgBubble) _msgBubble.parentElement.remove();
        _msgBubble = null; _msgText = ''; _msgCharts = {};
        break;
      case 'agent.clarify':
        _mkClarify(data.question, data.options || []);
        _clarifyQuestion = data.question;
        break;
      case 'agent.artifact':
        _rmTyping();
        break;
      case 'session.error':
        _finalizeMsgBubble();
        _mkError(data.code, data.message);
        break;
      case 'session.end':
        _finalizeMsgBubble();
        _mkEnd(data.usage);
        _setStatus('ok', '完成');
        break;
    }
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  async function _send(overrideText) {
    var text = overrideText !== undefined ? String(overrideText) : _inp.value.trim();
    if (!text || _bs.disabled) return;
    if (overrideText === undefined) { _inp.value = ''; _inp.style.height = '45px'; }

    var _wel = _byId('gda-welcome');
    if (_wel) _wel.remove();      // 首次发送后移除空状态引导

    _mkUser(text);
    _mkTyping();
    _setStatus('run', '连接中…');
    _bs.disabled = true; _bx.classList.add('show');
    _thinkBody = null; _msgBubble = null; _msgText = ''; _msgCharts = {}; _toolBlock = null;
    _clarifyQuestion = null;
    var finalAnswer = '';

    var payload = {
      session_id: _sid,
      source: 'dataset_explore',
      context: {
        dataset_id: _pageInfo.dsId,
        dataset_name: '',
        bi_base_url: _pageInfo.biBaseUrl,
        bi_token: _biToken,
        login_id: _user.loginId,
        dom_id: _user.domId
      },
      user_message: text,
      history: _history.slice(-10)
    };

    try {
      // _isLocal 此处语义为「直连」：真实 localhost 或显式 DIRECT_CONNECT
      var _isLocal = DIRECT_CONNECT || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(AGENT_URL);
      var _chatUrl = AGENT_URL + '/api/agent/chat';
      var res = await fetch(
        _isLocal ? _chatUrl : window.location.origin + '/api/forward/as-proxy',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
          body: _isLocal
            ? JSON.stringify(payload)
            : JSON.stringify(Object.assign({ url: _chatUrl, method: 'POST' }, payload)),
          signal: _sceneContext && _sceneContext.abortSignal
        }
      );
      if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + await res.text());

      _rmTyping();
      _setStatus('run', '分析中…');
      _reader = res.body.getReader();
      var dec = new TextDecoder();
      var buf = '';

      while (true) {
        var chunk = await _reader.read();
        if (chunk.done) break;
        buf += dec.decode(chunk.value, { stream: true });
        var parts = buf.split('\n\n');
        buf = parts.pop();
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i];
          if (!part.trim()) continue;
          var em = part.match(/^event: (.+)/m);
          var dm = part.match(/^data: ([\s\S]+)/m);
          if (!dm) continue;
          var etype = em ? em[1].trim() : 'message';
          var edata;
          try { edata = JSON.parse(dm[1]); } catch (e) { continue; }
          _handleEvent(etype, edata);
          if (etype === 'agent.message') finalAnswer += (edata.delta || '');
        }
      }

      if (finalAnswer) {
        _history.push({ role: 'user', content: text });
        _history.push({ role: 'assistant', content: finalAnswer });
      } else if (_clarifyQuestion) {
        _history.push({ role: 'user', content: text });
        _history.push({ role: 'assistant', content: _clarifyQuestion });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        _finalizeMsgBubble();
        _rmTyping(); _mkError('CONNECTION_ERROR', err.message);
        _setStatus('err', '连接失败');
      }
    } finally {
      _reader = null;
      if (_bs) _bs.disabled = false;
      if (_bx) _bx.classList.remove('show');
      if (_dot && (_dot.getAttribute('class') || '').includes('run')) _setStatus('', '就绪');
    }
  }

  async function _stopStream() {
    if (_reader) { try { await _reader.cancel(); } catch (e) {} _reader = null; }
    _finalizeMsgBubble();
    _rmTyping(); _mkError('STOPPED', '已手动停止');
    _bs.disabled = false; _bx.classList.remove('show');
    _setStatus('', '就绪');
  }

  // ── Dataset Scene Protocol v1 entry point ─────────────────────────────────
  var _uiReady = false;

  async function _initUI(root, context) {
    if (_uiReady) return true;
    _root = root;
    _sceneContext = context;
    _pageInfo = {
      dsId: context.datasetId,
      biBaseUrl: _resolveBiBaseUrl(context.pageOrigin),
    };
    try {
      await _loadScript(_MARKED_URL_CDN, 'marked');
      await _loadScript(_CHART_URL_CDN, 'Chart');
    } catch (e) {
      console.error('[GDA] Failed to load dependencies:', e);
      return false;
    }
    if (context.abortSignal && context.abortSignal.aborted) return false;
    marked.use({ gfm: true, breaks: true });
    _biToken = await _fetchToken();
    _user = await _fetchUser();
    _injectStyles();
    _createUI();
    _uiReady = true;
    if (!_suggestions) _fetchSuggestions();
    return true;
  }

  function _activateScene() {
    if (_inp) _inp.focus();
    if (_root && window.Chart && typeof Chart.getChart === 'function') {
      _root.querySelectorAll('canvas').forEach(function (canvas) {
        var chart = Chart.getChart(canvas);
        if (chart) chart.resize();
      });
    }
  }

  async function _destroyScene() {
    if (_reader) { try { await _reader.cancel(); } catch (e) {} _reader = null; }
    if (_root && window.Chart && typeof Chart.getChart === 'function') {
      _root.querySelectorAll('canvas').forEach(function (canvas) {
        var chart = Chart.getChart(canvas);
        if (chart) chart.destroy();
      });
    }
    if (_root) _root.innerHTML = '';
    _sid = crypto.randomUUID();
    _history = [];
    _suggestions = null;
    _suggestFetching = false;
    _thinkBody = null; _thinkCollapse = null;
    _reasoningBody = null; _reasoningCollapse = null;
    _msgBubble = null; _msgText = ''; _msgCharts = {};
    _toolBlock = null; _clarifyQuestion = null;
    _chat = null; _inp = null; _bs = null; _bx = null; _dot = null; _st = null;
    _pageInfo = null;
    _sceneContext = null;
    _root = null;
    _uiReady = false;
  }

  var _hub = window.__GD_DATASET_SCENE_HUB__;
  if (!_hub || _hub.protocolVersion !== 1) {
    console.error('[GDA data_agent scene] Registry 不存在或协议版本不兼容');
    return;
  }

  _hub.registerScene({
    id: 'cmb.data-agent',
    title: '探索分析',
    order: 10,
    apiVersion: 1,
    mount: async function (root, context) {
      var ok = await _initUI(root, context);
      if (!ok) throw new Error('data_agent 依赖加载失败');
      return {
        activate: _activateScene,
        deactivate: function () {},
        destroy: _destroyScene,
      };
    },
  });

})();
