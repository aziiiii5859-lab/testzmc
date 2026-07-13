/**
 * 多场景外壳（Shell）—— 数据集详情页的共用入口
 *
 * 职责：单个浮动按钮 + 右侧滑出抽屉 + 顶部 tab 栏 + registerTab 注册接口。
 * 场景内容（data_agent 的聊天面板、其他团队的场景）各自独立文件，通过
 *   window.__GDA__.registerTab({id, title, order, mount(container, ctx)})
 * 注册进来，注册顺序与文件加载顺序无关（见文末队列引导桩说明）。
 *
 * 视觉/路由处理对齐已在生产验证过的 embed.js（蓝色按钮 + 右侧抽屉 + GD.on 路由感知），
 * 机制（注册队列、懒挂载、tab 切换）继承自 poc/multi-tab-shell/shell.js。
 */
(function () {
  'use strict';

  // ── 注册表引导：无论 Shell 与场景脚本谁先加载完都能工作 ────────────────────
  var NS = (window.__GDA__ = window.__GDA__ || { _queue: [] });
  if (NS._shellReady) return;          // 防止脚本被平台重复注入时执行两次
  NS._shellReady = true;

  if (typeof GD === 'undefined') {
    console.warn('[GDA shell] GD SDK not found');
    return;
  }

  // ── 数据集详情页识别（与旧 embed.js _getPageInfo 保持同一正则）─────────────
  // biBaseUrl 返回原始 location.origin，不做域名映射——那是各场景自己的事
  //（data_agent 的 embed.js 会做办公网→业务网映射，其他团队可能不需要）。
  function getPageInfo(pathname) {
    var m = (pathname || location.pathname).match(
      /\/data-center\/data-sets\/[^/]+\/([^/]+)\/details\/overview/
    );
    if (!m) return null;
    return { dsId: m[1], biBaseUrl: location.origin };
  }

  // ── 样式（gdas- 前缀，与场景内容各自的前缀区分，见接入契约文档）────────────
  var CSS = [
    /* Floating button —— 视觉对齐 embed.js #gda-btn */
    '#gdas-btn{position:fixed;bottom:32px;right:32px;width:52px;height:52px;border-radius:50%;',
    'background:linear-gradient(135deg,#2563eb,#1d4ed8);border:none;cursor:pointer;z-index:9997;',
    'box-shadow:0 4px 16px rgba(37,99,235,.35);display:flex;align-items:center;justify-content:center;',
    'transition:transform .2s,box-shadow .2s;color:#fff;}',
    '#gdas-btn:hover{transform:scale(1.08);box-shadow:0 6px 22px rgba(37,99,235,.45);}',
    '#gdas-btn.gdas-hidden{display:none;}',

    /* Overlay */
    '#gdas-overlay{position:fixed;inset:0;background:rgba(0,0,0,.15);opacity:0;pointer-events:none;',
    'transition:opacity .28s;z-index:9998;}',
    '#gdas-overlay.open{opacity:1;pointer-events:auto;}',

    /* Drawer */
    '#gdas-drawer{position:fixed;top:56px;bottom:30px;right:0;width:600px;height:auto;',
    'transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);z-index:9999;',
    'display:flex;flex-direction:column;background:#FAFBFD;',
    'box-shadow:-4px 0 24px rgba(37,99,235,.12);',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
    'font-size:14px;color:#1e2a4a;}',
    '#gdas-drawer.open{transform:translateX(0);}',
    '#gdas-drawer *,#gdas-drawer *::before,#gdas-drawer *::after{box-sizing:border-box;}',

    /* Header + tab bar */
    '#gdas-header{padding:0 8px;background:#fff;border-bottom:1px solid #c7d8fa;',
    'display:flex;align-items:center;gap:4px;flex-shrink:0;height:48px;',
    'box-shadow:0 2px 8px rgba(37,99,235,.09);}',
    '#gdas-tabs{display:flex;gap:2px;flex:1;overflow-x:auto;height:100%;align-items:stretch;}',
    '.gdas-tab{padding:0 14px;border:none;background:none;cursor:pointer;font-size:13px;',
    'color:#6b7a99;border-bottom:2px solid transparent;white-space:nowrap;transition:color .15s;}',
    '.gdas-tab:hover{color:#2563eb;}',
    '.gdas-tab.active{color:#2563eb;border-bottom-color:#2563eb;font-weight:600;}',
    '#gdas-close{width:28px;height:28px;border-radius:50%;border:none;background:#eef2ff;',
    'color:#6b7a99;cursor:pointer;font-size:18px;line-height:1;display:flex;flex-shrink:0;',
    'align-items:center;justify-content:center;transition:background .15s,color .15s;margin-left:4px;}',
    '#gdas-close:hover{background:#fee2e2;color:#dc2626;}',

    /* Body / panes */
    '#gdas-body{flex:1;overflow:hidden;position:relative;background:#fff;}',
    '.gdas-pane{display:none;height:100%;}',
    '.gdas-pane.active{display:block;}',
    '#gdas-empty{padding:40px;text-align:center;color:#9ca3af;font-size:13px;}',
    '.gdas-loading{padding:40px;text-align:center;color:#9ca3af;font-size:13px;}',
  ].join('');

  // ── Tab 管理（在 DOM 挂载前就可用，addTab 在 DOM ready 后才真正操作节点）───
  var tabs = {};      // id → {def, btn, pane, mounted, mounting}
  var activeId = null;
  var tabBar, body, empty;   // DOM 节点，init() 之后才赋值

  function getCtx() {
    var info = getPageInfo();
    return {
      dsId: (info && info.dsId) || '(当前页面未识别到数据集ID)',
      biBaseUrl: (info && info.biBaseUrl) || location.origin
    };
  }

  function activate(id) {
    var t = tabs[id];
    if (!t || !t.btn) return;   // DOM 还没渲染完则跳过
    Object.keys(tabs).forEach(function (k) {
      if (!tabs[k].btn) return; // 同上，跳过尚未渲染的 tab
      tabs[k].btn.classList.toggle('active', k === id);
      tabs[k].pane.classList.toggle('active', k === id);
    });
    activeId = id;
    if (t.mounted || t.mounting) return;
    t.mounting = true;
    t.pane.innerHTML = '<div class="gdas-loading">加载中…</div>';
    Promise.resolve()
      .then(function () { return t.def.mount(t.pane, getCtx()); })
      .then(function () { t.mounted = true; })
      .catch(function (e) {
        t.pane.innerHTML = '<div style="padding:24px;color:#dc2626;">场景 [' +
          t.def.title + '] 挂载失败：' + (e && e.message) + '</div>';
      })
      .finally(function () { t.mounting = false; });
  }

  function addTab(def) {
    if (!def || !def.id || tabs[def.id]) return;
    tabs[def.id] = { def: def, btn: null, pane: null, mounted: false, mounting: false };
    if (tabBar) _renderTab(def.id);    // DOM 已就绪，立即渲染
  }

  function _renderTab(id) {
    var t = tabs[id];
    empty.style.display = 'none';

    var tb = document.createElement('button');
    tb.className = 'gdas-tab';
    tb.textContent = t.def.title || id;
    tb.dataset.order = t.def.order || 99;
    tb.addEventListener('click', function () { activate(id); });

    var siblings = tabBar.children, inserted = false;
    for (var i = 0; i < siblings.length; i++) {
      if (Number(siblings[i].dataset.order) > Number(tb.dataset.order)) {
        tabBar.insertBefore(tb, siblings[i]); inserted = true; break;
      }
    }
    if (!inserted) tabBar.appendChild(tb);

    var pane = document.createElement('div');
    pane.className = 'gdas-pane';
    body.appendChild(pane);

    t.btn = tb;
    t.pane = pane;
    if (!activeId) activate(id);
  }

  // ── 对外接口立即可用（场景脚本可能在 DOM ready 之前就调用 registerTab）──────
  NS.registerTab = addTab;
  (NS._queue || []).forEach(addTab);
  NS._queue = [];

  var btn, overlay, drawer;
  var _domReady = false;

  function _ensureDom() {
    if (_domReady) return;
    _domReady = true;

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    btn = document.createElement('button');
    btn.id = 'gdas-btn';
    btn.title = 'AI 助手';
    btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    btn.addEventListener('click', openDrawer);
    document.body.appendChild(btn);

    overlay = document.createElement('div');
    overlay.id = 'gdas-overlay';
    overlay.addEventListener('click', closeDrawer);
    document.body.appendChild(overlay);

    drawer = document.createElement('div');
    drawer.id = 'gdas-drawer';
    drawer.innerHTML =
      '<div id="gdas-header">' +
      '  <div id="gdas-tabs"></div>' +
      '  <button id="gdas-close" title="关闭">×</button>' +
      '</div>' +
      '<div id="gdas-body"><div id="gdas-empty">尚无场景注册</div></div>';
    document.body.appendChild(drawer);

    tabBar = drawer.querySelector('#gdas-tabs');
    body   = drawer.querySelector('#gdas-body');
    empty  = drawer.querySelector('#gdas-empty');
    drawer.querySelector('#gdas-close').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
    });

    // DOM ready 之前已排队的场景批量渲染出来（全部渲染后激活第一个）
    var ids = Object.keys(tabs).sort(function (a, b) {
      return (tabs[a].def.order || 99) - (tabs[b].def.order || 99);
    });
    ids.forEach(_renderTab);

    console.log('[gdas] shell ready, tabs:', Object.keys(tabs));
  }

  function openDrawer() {
    _ensureDom();
    overlay.classList.add('open');
    drawer.classList.add('open');
    if (activeId) activate(activeId);   // 确保当前 tab 已挂载（切数据集后内容被重置）
  }
  function closeDrawer() {
    if (!_domReady) return;
    overlay.classList.remove('open');
    drawer.classList.remove('open');
  }

  // ── 路由感知：真实 GD API（对齐 embed.js 的 GD.on 写法）────────────────────
  var _lastDsId = null;

  function _resetAllTabs() {
    Object.keys(tabs).forEach(function (k) {
      var t = tabs[k];
      if (t.mounted) {
        t.mounted = false;
        if (t.pane) t.pane.innerHTML = '';   // 清空旧内容，下次激活时以新 ctx 重新 mount
      }
    });
  }

  GD.on('gd-ready', function () {
    var info = getPageInfo();
    if (!info) return;
    _ensureDom();
    _lastDsId = info.dsId;
    btn.classList.remove('gdas-hidden');
  });

  GD.on('gd-route-change', function (params) {
    var info = getPageInfo(params && params.pathname);
    if (info) {
      _ensureDom();
      if (_lastDsId && _lastDsId !== info.dsId) {
        console.log('[gdas] dsId changed:', _lastDsId, '→', info.dsId);
        closeDrawer();
        _resetAllTabs();
      }
      _lastDsId = info.dsId;
      btn.classList.remove('gdas-hidden');
    } else if (_domReady) {
      closeDrawer();
      btn.classList.add('gdas-hidden');
    }
  });
})();
