/**
 * PoC · 多场景外壳（Shell）—— 观远前端插件 1/3
 *
 * 职责：悬浮图标 + 弹出框 + 标签栏 + registerTab 注册接口。
 * 场景内容由另外两个插件（tab-explore.js / tab-describe.js）各自注册，
 * 三个插件的加载顺序任意。
 */
(function () {
  'use strict';

  // ── 注册表引导：无论 Shell 与场景脚本谁先执行都能工作 ──────────────────────
  var NS = (window.__GDA__ = window.__GDA__ || { _queue: [] });
  if (NS._shellReady) return;          // 防止插件被重复注入时执行两次
  NS._shellReady = true;

  // ── DOM 就绪保护：观远插件脚本在 <head> 阶段执行，body 可能尚不存在 ──────────
  function ready(fn) {
    if (document.body) { fn(); return; }
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  // ── 共享上下文（实时读 location，每次调用都是最新值）────────────────────────
  function parseDsId(pathname) {
    var m = (pathname || location.pathname).match(
      /\/data-center\/data-sets\/[^/]+\/([^/]+)\/details\/overview/
    );
    return m ? m[1] : null;
  }
  function getCtx() {
    return { dsId: parseDsId() || '(当前页面未识别到数据集ID)', biBaseUrl: location.origin };
  }

  // ── 样式（gdas- 前缀，避免与现有 embed.js 的 gda- 冲突）────────────────────
  var CSS = [
    '#gdas-btn{position:fixed;bottom:100px;right:32px;width:48px;height:48px;border-radius:50%;',
    'background:linear-gradient(135deg,#7c3aed,#6d28d9);border:none;cursor:pointer;z-index:9990;',
    'color:#fff;font-size:20px;box-shadow:0 4px 14px rgba(124,58,237,.4);',
    'display:flex;align-items:center;justify-content:center;}',
    '#gdas-btn:hover{transform:scale(1.08);}',

    '#gdas-mask{position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:9991;display:none;}',
    '#gdas-mask.open{display:block;}',

    '#gdas-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);',
    'width:640px;height:480px;background:#fff;border-radius:12px;z-index:9992;display:none;',
    'flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.18);overflow:hidden;',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;color:#1e2a4a;}',
    '#gdas-modal.open{display:flex;}',
    '#gdas-modal *{box-sizing:border-box;}',

    '#gdas-head{display:flex;align-items:center;padding:0 16px;height:48px;',
    'border-bottom:1px solid #e5e7eb;background:#faf5ff;flex-shrink:0;}',
    '#gdas-title{font-weight:600;margin-right:24px;}',
    '#gdas-tabs{display:flex;gap:4px;flex:1;}',
    '.gdas-tab{padding:6px 16px;border:none;background:none;cursor:pointer;font-size:14px;',
    'color:#6b7280;border-radius:6px 6px 0 0;border-bottom:2px solid transparent;}',
    '.gdas-tab.active{color:#7c3aed;border-bottom-color:#7c3aed;font-weight:600;}',
    '#gdas-close{border:none;background:none;cursor:pointer;font-size:18px;color:#9ca3af;}',

    '#gdas-body{flex:1;overflow:auto;position:relative;}',
    '.gdas-pane{display:none;height:100%;}',
    '.gdas-pane.active{display:block;}',
    '#gdas-empty{padding:40px;text-align:center;color:#9ca3af;}',
  ].join('');

  // ── Tab 管理（在 DOM 挂载前就可用，addTab 在 DOM ready 后才真正操作节点）───
  var tabs = {};      // id → {def, btn, pane, mounted}
  var activeId = null;
  var tabBar, body, empty;   // DOM 节点，init() 之后才赋值

  function activate(id) {
    var t = tabs[id];
    if (!t || !t.btn) return;   // DOM 还没渲染完则跳过
    Object.keys(tabs).forEach(function (k) {
      if (!tabs[k].btn) return; // 同上，跳过尚未渲染的 tab
      tabs[k].btn.classList.toggle('active', k === id);
      tabs[k].pane.classList.toggle('active', k === id);
    });
    activeId = id;
    if (!t.mounted) {
      t.mounted = true;
      try {
        t.def.mount(t.pane, getCtx());
      } catch (e) {
        t.pane.innerHTML = '<div style="padding:24px;color:#dc2626;">场景 [' +
          t.def.title + '] 挂载失败：' + (e && e.message) + '</div>';
      }
    }
  }

  function addTab(def) {
    if (!def || !def.id || tabs[def.id]) return;
    // DOM 还没 ready 时只存定义，init() 完成后统一渲染
    tabs[def.id] = { def: def, btn: null, pane: null, mounted: false };
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

  // ── DOM 操作全部延到 body 就绪后执行 ─────────────────────────────────────────
  ready(function init() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var btn = document.createElement('button');
    btn.id = 'gdas-btn';
    btn.textContent = 'AI';
    btn.title = '多场景外壳 PoC';

    var mask = document.createElement('div');
    mask.id = 'gdas-mask';

    var modal = document.createElement('div');
    modal.id = 'gdas-modal';
    modal.innerHTML =
      '<div id="gdas-head">' +
      '  <span id="gdas-title">数据集 AI</span>' +
      '  <div id="gdas-tabs"></div>' +
      '  <button id="gdas-close">✕</button>' +
      '</div>' +
      '<div id="gdas-body"><div id="gdas-empty">尚无场景注册</div></div>';

    document.body.appendChild(btn);
    document.body.appendChild(mask);
    document.body.appendChild(modal);

    tabBar = modal.querySelector('#gdas-tabs');
    body   = modal.querySelector('#gdas-body');
    empty  = modal.querySelector('#gdas-empty');

    function openModal() {
      mask.classList.add('open');
      modal.classList.add('open');
      if (activeId) activate(activeId);  // 确保当前 tab 已挂载（切数据集后内容被重置）
    }
    function closeModal() { mask.classList.remove('open'); modal.classList.remove('open'); }
    btn.addEventListener('click', openModal);
    mask.addEventListener('click', closeModal);
    modal.querySelector('#gdas-close').addEventListener('click', closeModal);

    // 把 DOM ready 之前已排队的场景批量渲染出来（全部渲染后激活第一个）
    var ids = Object.keys(tabs).sort(function (a, b) {
      return (tabs[a].def.order || 99) - (tabs[b].def.order || 99);
    });
    ids.forEach(_renderTab);

    console.log('[gdas] shell ready, tabs:', Object.keys(tabs));

    // ── SPA 路由感知：拦截 history API + popstate ─────────────────────────────
    var _lastDsId = parseDsId();

    function onRouteChange() {
      var dsId = parseDsId();

      // 不在数据集详情页 → 隐藏按钮并关闭弹框
      if (!dsId) {
        btn.style.display = 'none';
        closeModal();
        return;
      }

      btn.style.display = '';

      // 切换到不同数据集 → 重置所有 tab 的挂载状态，下次激活时以新 ctx 重新 mount
      if (dsId !== _lastDsId) {
        console.log('[gdas] dsId changed:', _lastDsId, '→', dsId);
        _lastDsId = dsId;
        Object.keys(tabs).forEach(function (k) {
          var t = tabs[k];
          if (t.mounted) {
            t.mounted = false;
            t.pane.innerHTML = '';   // 清空旧内容，下次打开弹框时重新挂载
          }
        });
      }
    }

    // 劫持 pushState / replaceState（观远 SPA 路由主要用这两个）
    ['pushState', 'replaceState'].forEach(function (method) {
      var orig = history[method];
      history[method] = function () {
        orig.apply(history, arguments);
        onRouteChange();
      };
    });
    window.addEventListener('popstate', onRouteChange);

    // 初始检查：如果插件加载时就不在数据集页，先隐藏
    onRouteChange();
  });
})();
