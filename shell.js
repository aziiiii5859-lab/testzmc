/** Dataset Scene Shell · Protocol v1 */
(function () {
  'use strict';

  var hub = window.__GD_DATASET_SCENE_HUB__;
  if (!hub || hub.protocolVersion !== 1) {
    console.error('[dataset-shell] Registry 不存在或协议版本不兼容');
    return;
  }
  if (hub._shellReady) return;
  hub._shellReady = true;

  var CSS = [
    '#gdshell-btn{position:fixed;right:32px;bottom:32px;width:52px;height:52px;border:0;border-radius:50%;',
    'display:none;align-items:center;justify-content:center;background:#065bce;color:#fff;cursor:pointer;z-index:9997;',
    'box-shadow:0 4px 16px rgba(6,91,206,.28);font-size:14px;font-weight:600;transition:transform .2s,box-shadow .2s}',
    '#gdshell-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(6,91,206,.36)}',
    '#gdshell-overlay{position:fixed;inset:0;background:rgba(0,0,0,.16);opacity:0;pointer-events:none;',
    'transition:opacity .25s;z-index:9998}',
    '#gdshell-overlay.open{opacity:1;pointer-events:auto}',
    '#gdshell-drawer{position:fixed;top:101px;right:0;bottom:0;width:min(800px,calc(100vw - 24px));display:flex;',
    'background:#fff;transform:translateX(100%);transition:transform .25s;z-index:9999;',
    'box-shadow:-2px 0 12px rgba(0,0,0,.10);font-family:"PingFang SC","Microsoft YaHei",Arial,sans-serif;',
    'color:#202020;overflow:hidden}',
    '#gdshell-drawer.open{transform:translateX(0)}',
    '#gdshell-drawer *,#gdshell-drawer *::before,#gdshell-drawer *::after{box-sizing:border-box}',
    '#gdshell-sidebar{width:180px;display:flex;flex-direction:column;flex:none;background:#fff;border-right:1px solid #f0f0f0}',
    '#gdshell-brand{height:76px;display:flex;align-items:center;padding:0 20px;gap:10px;font-size:16px;font-weight:600;',
    'border-bottom:1px solid #f5f5f5;white-space:nowrap}',
    '#gdshell-brand-mark{width:24px;height:24px;display:grid;place-items:center;border-radius:6px;background:linear-gradient(135deg,#23c9f1,#7b76f5);',
    'color:#fff;font-size:12px;font-weight:700}',
    '#gdshell-tabs{display:flex;flex:1;flex-direction:column;gap:4px;padding:28px 10px;overflow-y:auto}',
    '.gdshell-tab{position:relative;width:100%;min-height:44px;padding:0 14px 0 40px;border:0;border-radius:4px;background:transparent;',
    'color:#202020;cursor:pointer;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px;transition:background .15s,color .15s}',
    '.gdshell-tab::before{content:"";position:absolute;left:16px;top:50%;width:15px;height:15px;transform:translateY(-50%);border:1.5px solid currentColor;border-radius:3px;opacity:.72}',
    '.gdshell-tab:hover{background:#f7f7f7}',
    '.gdshell-tab.active{background:#f2f2f2;color:#202020;font-weight:600}',
    '.gdshell-tab:disabled{cursor:not-allowed;color:#bfbfbf}',
    '#gdshell-exit{height:64px;display:flex;align-items:center;gap:10px;padding:0 20px;border:0;border-top:1px solid #f0f0f0;background:#fff;',
    'color:#202020;cursor:pointer;text-align:left;font-size:14px}',
    '#gdshell-exit::before{content:"↪";font-size:22px;font-weight:300;line-height:1}',
    '#gdshell-workspace{display:flex;flex:1;min-width:0;flex-direction:column;background:#fff}',
    '#gdshell-header{height:76px;display:flex;align-items:center;justify-content:space-between;padding:0 16px 0 24px;border-bottom:1px solid #f0f0f0;flex:none}',
    '#gdshell-title{font-size:16px;font-weight:600;color:#202020;white-space:nowrap}',
    '#gdshell-close{width:28px;height:28px;border:1px solid #ebebeb;border-radius:4px;background:#fff;color:#595959;cursor:pointer;font-size:20px;line-height:1}',
    '#gdshell-close:hover{background:#f7f7f7;color:#202020}',
    '#gdshell-content{position:relative;flex:1;min-height:0;overflow:hidden;background:#fff}',
    '.gdshell-pane{position:absolute;inset:0;display:none;overflow:hidden}',
    '.gdshell-pane.active{display:block}',
    '.gdshell-root{width:100%;height:100%;overflow:hidden}',
    '.gdshell-state{height:100%;display:flex;align-items:center;justify-content:center;padding:24px;',
    'text-align:center;color:#8c8c8c;font-size:13px}',
    '.gdshell-error{color:#cf1322}',
    '@media(max-width:720px){#gdshell-drawer{top:0;width:100vw}#gdshell-sidebar{width:152px}#gdshell-brand{padding:0 14px;font-size:14px}#gdshell-tabs{padding:20px 8px}.gdshell-tab{padding-left:34px}#gdshell-btn{right:18px;bottom:18px}}',
  ].join('');

  var tabs = {};
  var activeId = null;
  var currentContext = null;
  var currentDatasetId = null;
  var ui = {};
  var userPromise = null;
  var tokenPromise = null;

  function parseDatasetId(pathname) {
    var match = (pathname || location.pathname).match(/\/data-center\/data-sets\/[^/]+\/([^/]+)\/details(?:\/|$)/);
    return match ? match[1] : null;
  }

  function getTestContext() {
    return window.__GD_DATASET_SCENE_TEST_CONTEXT__ || null;
  }

  async function getUser() {
    if (!userPromise) {
      userPromise = (async function () {
        if (typeof GD === 'undefined' || typeof GD.getUser !== 'function') return {};
        try {
          var value = await GD.getUser();
          return (value && value.$) || value || {};
        } catch (e) { return {}; }
      })();
    }
    return userPromise;
  }

  function getBiToken() {
    if (!tokenPromise) {
      tokenPromise = fetch('/api/user/token').then(function (response) {
        if (!response.ok) return '';
        return response.json().then(function (value) { return value.uIdToken || ''; });
      }).catch(function () { return ''; });
    }
    return tokenPromise;
  }

  async function makeContext(datasetId) {
    var test = getTestContext();
    if (test) {
      return Object.assign({
        datasetId: datasetId,
        pathname: location.pathname,
        pageOrigin: location.origin,
        user: {},
        getBiToken: function () { return Promise.resolve(''); },
      }, test);
    }
    return {
      datasetId: datasetId,
      pathname: location.pathname,
      pageOrigin: location.origin,
      user: await getUser(),
      getBiToken: getBiToken,
    };
  }

  function isAvailable(definition, context) {
    var availability = definition.availability || {};
    var roles = (context.user && context.user.role) || [];
    if (availability.roles && availability.roles.length &&
        !roles.some(function (role) { return availability.roles.indexOf(role) >= 0; })) return false;
    if (availability.domIds && availability.domIds.length &&
        availability.domIds.indexOf((context.user && context.user.domId) || '') < 0) return false;
    return true;
  }

  function renderState(tab, text, isError) {
    tab.root.innerHTML = '';
    var state = document.createElement('div');
    state.className = 'gdshell-state' + (isError ? ' gdshell-error' : '');
    state.textContent = text;
    tab.root.appendChild(state);
    return state;
  }

  function insertTabButton(button) {
    var children = ui.tabs.children;
    for (var index = 0; index < children.length; index++) {
      if (Number(children[index].dataset.order) > Number(button.dataset.order)) {
        ui.tabs.insertBefore(button, children[index]);
        return;
      }
    }
    ui.tabs.appendChild(button);
  }

  function addScene(definition) {
    if (!definition || tabs[definition.id]) return;
    if (definition.apiVersion !== 1 || typeof definition.mount !== 'function') {
      console.error('[dataset-shell] 场景协议不兼容：' + (definition.id || '(unknown)'));
      return;
    }

    var button = document.createElement('button');
    button.className = 'gdshell-tab';
    button.textContent = definition.title || definition.id;
    button.dataset.order = definition.order == null ? 99 : definition.order;

    var pane = document.createElement('section');
    pane.className = 'gdshell-pane';
    pane.setAttribute('role', 'tabpanel');
    var root = document.createElement('div');
    root.className = 'gdshell-root';
    pane.appendChild(root);
    ui.content.appendChild(pane);

    var tab = tabs[definition.id] = {
      definition: definition,
      button: button,
      pane: pane,
      root: root,
      status: 'registered',
      instance: null,
      controller: null,
    };
    button.onclick = function () { activate(definition.id); };
    insertTabButton(button);
    refreshVisibility();
  }

  async function mount(tab) {
    if (tab.status === 'mounted' || tab.status === 'mounting') return;
    tab.status = 'mounting';
    tab.button.disabled = true;
    var loadingState = renderState(tab, '场景加载中…', false);
    tab.controller = new AbortController();
    var controller = tab.controller;
    var context = Object.assign({}, currentContext, { abortSignal: controller.signal });
    try {
      var instance = await tab.definition.mount(tab.root, context);
      var normalized = typeof instance === 'function' ? { destroy: instance } : (instance || {});
      if (controller.signal.aborted || tab.controller !== controller || !currentContext) {
        if (typeof normalized.destroy === 'function') await normalized.destroy();
        return;
      }
      if (loadingState.parentNode) loadingState.remove();
      tab.instance = normalized;
      tab.status = 'mounted';
      tab.button.disabled = false;
      if (activeId === tab.definition.id && typeof tab.instance.activate === 'function') {
        tab.instance.activate();
      }
    } catch (error) {
      if (controller.signal.aborted || tab.controller !== controller || !currentContext) return;
      tab.status = 'error';
      tab.button.disabled = false;
      renderState(tab, '场景「' + (tab.definition.title || tab.definition.id) + '」加载失败：' +
        ((error && error.message) || '未知错误'), true);
      console.error('[dataset-shell] 场景挂载失败：' + tab.definition.id, error);
    }
  }

  function activate(id) {
    var next = tabs[id];
    if (!next || next.button.style.display === 'none') return;
    if (activeId && tabs[activeId] && activeId !== id) {
      var previous = tabs[activeId];
      previous.button.classList.remove('active');
      previous.pane.classList.remove('active');
      if (previous.instance && typeof previous.instance.deactivate === 'function') previous.instance.deactivate();
    }
    activeId = id;
    if (ui.title) ui.title.textContent = next.definition.title || next.definition.id;
    next.button.classList.add('active');
    next.pane.classList.add('active');
    if (next.status === 'registered') mount(next);
    else if (next.instance && typeof next.instance.activate === 'function') next.instance.activate();
  }

  function visibleTabs() {
    return Object.keys(tabs).map(function (id) { return tabs[id]; }).filter(function (tab) {
      return tab.button.style.display !== 'none';
    });
  }

  function refreshVisibility() {
    if (!currentContext) {
      ui.button.style.display = 'none';
      return;
    }
    Object.keys(tabs).forEach(function (id) {
      var tab = tabs[id];
      var visible = isAvailable(tab.definition, currentContext);
      tab.button.style.display = visible ? '' : 'none';
      if (!visible) tab.pane.classList.remove('active');
    });
    var visible = visibleTabs();
    ui.button.style.display = visible.length ? 'flex' : 'none';
    if ((!activeId || !tabs[activeId] || tabs[activeId].button.style.display === 'none') && visible.length) {
      activeId = visible[0].definition.id;
      if (ui.title) ui.title.textContent = visible[0].definition.title || visible[0].definition.id;
      visible[0].button.classList.add('active');
      visible[0].pane.classList.add('active');
      if (ui.drawer.classList.contains('open')) mount(visible[0]);
    }
  }

  function openShell() {
    ui.overlay.classList.add('open');
    ui.drawer.classList.add('open');
    if (activeId && tabs[activeId] && tabs[activeId].status === 'registered') mount(tabs[activeId]);
  }

  function closeShell() {
    ui.overlay.classList.remove('open');
    ui.drawer.classList.remove('open');
  }

  async function destroyScenes() {
    var jobs = Object.keys(tabs).map(async function (id) {
      var tab = tabs[id];
      if (tab.controller) tab.controller.abort();
      if (tab.instance && typeof tab.instance.destroy === 'function') {
        try { await tab.instance.destroy(); } catch (e) { console.error('[dataset-shell] 场景销毁失败：' + id, e); }
      }
      tab.instance = null;
      tab.controller = null;
      tab.status = 'registered';
      tab.button.disabled = false;
      tab.root.innerHTML = '';
      tab.pane.classList.remove('active');
      tab.button.classList.remove('active');
    });
    await Promise.all(jobs);
    activeId = null;
  }

  async function handleRoute(pathname) {
    var test = getTestContext();
    var datasetId = test ? (test.datasetId || 'preview-dataset') : parseDatasetId(pathname);
    if (!datasetId) {
      closeShell();
      ui.button.style.display = 'none';
      currentContext = null;
      currentDatasetId = null;
      tokenPromise = null;
      await destroyScenes();
      return;
    }
    if (currentDatasetId && currentDatasetId !== datasetId) await destroyScenes();
    currentDatasetId = datasetId;
    currentContext = await makeContext(datasetId);
    refreshVisibility();
  }

  function createUI() {
    var style = document.createElement('style');
    style.id = 'gdshell-styles';
    style.textContent = CSS;
    document.head.appendChild(style);

    ui.button = document.createElement('button');
    ui.button.id = 'gdshell-btn';
    ui.button.type = 'button';
    ui.button.textContent = 'AI';
    ui.button.title = '数据集智能场景';

    ui.overlay = document.createElement('div');
    ui.overlay.id = 'gdshell-overlay';

    ui.drawer = document.createElement('aside');
    ui.drawer.id = 'gdshell-drawer';
    ui.drawer.innerHTML =
      '<aside id="gdshell-sidebar">' +
      '  <div id="gdshell-brand"><span id="gdshell-brand-mark">AI</span><span>数据集助手</span></div>' +
      '  <nav id="gdshell-tabs" role="tablist" aria-label="助手场景"></nav>' +
      '  <button id="gdshell-exit" type="button">退出插件</button>' +
      '</aside>' +
      '<section id="gdshell-workspace">' +
      '  <header id="gdshell-header">' +
      '    <span id="gdshell-title">数据集助手</span>' +
      '    <button id="gdshell-close" type="button" aria-label="关闭助手">×</button>' +
      '  </header>' +
      '  <main id="gdshell-content"></main>' +
      '</section>';

    document.body.appendChild(ui.button);
    document.body.appendChild(ui.overlay);
    document.body.appendChild(ui.drawer);
    ui.tabs = ui.drawer.querySelector('#gdshell-tabs');
    ui.content = ui.drawer.querySelector('#gdshell-content');
    ui.title = ui.drawer.querySelector('#gdshell-title');
    ui.button.onclick = openShell;
    ui.overlay.onclick = closeShell;
    ui.drawer.querySelector('#gdshell-close').onclick = closeShell;
    ui.drawer.querySelector('#gdshell-exit').onclick = closeShell;
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeShell(); });

    hub.getScenes().forEach(addScene);
    hub.subscribe(addScene);
    handleRoute(location.pathname);
  }

  function ready(callback) {
    if (document.body) callback();
    else document.addEventListener('DOMContentLoaded', callback, { once: true });
  }

  ready(function () {
    createUI();
    if (typeof GD !== 'undefined' && typeof GD.on === 'function') {
      GD.on('gd-route-change', function (params) { handleRoute(params && params.pathname); });
    } else {
      window.addEventListener('popstate', function () { handleRoute(location.pathname); });
    }
  });
})();
