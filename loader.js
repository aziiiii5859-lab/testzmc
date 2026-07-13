/**
 * Dataset multi-scene public loader.
 *
 * 生产部署时，观远代码框只保留本文件。Shell 与各场景独立上传到流程中心，
 * 然后仅替换 MODULES 中对应的 jump URL。
 */
(function () {
  'use strict';

  var LOADER_VERSION = '1.0.0';
  var DEFAULT_CONFIG = {
    allowedRoles: ['admin', 'editor'],
    openDomains: ['REPLACE_ME'],
    modules: [
      { id: 'dataset-shell', type: 'shell', url: '/process/center/jump/REPLACE_ME/SHELL' },
      { id: 'cmb.data-agent', type: 'scene', url: 'https://cdn.jsdelivr.net/gh/aziiiii5859-lab/testzmc@0b606e5426bba250f68647dbc25e8fbb283e4ee0/data_agent.js' },
      { id: 'demo.describe', type: 'scene', url: '/process/center/jump/REPLACE_ME/DESCRIBE' },
    ],
  };

  // 本地预览页可在加载 loader.js 前写入该配置；生产环境通常直接修改上面的清单。
  var config = Object.assign({}, DEFAULT_CONFIG, window.__GD_DATASET_SCENE_CONFIG__ || {});
  config.modules = (window.__GD_DATASET_SCENE_CONFIG__ || {}).modules || DEFAULT_CONFIG.modules;

  function createHub(existing) {
    var hub = existing || {};
    if (hub.protocolVersion) return hub;

    var scenes = hub._queuedScenes || [];
    var sceneIndex = {};
    var listeners = [];
    var moduleStatus = {};

    hub.protocolVersion = 1;
    hub.loaderVersion = LOADER_VERSION;
    hub.registerScene = function (definition) {
      if (!definition || typeof definition.id !== 'string' || !definition.id) {
        console.error('[dataset-loader] 场景注册失败：缺少有效 id');
        return false;
      }
      if (sceneIndex[definition.id]) {
        console.error('[dataset-loader] 场景 id 重复，已拒绝：' + definition.id);
        return false;
      }
      sceneIndex[definition.id] = definition;
      scenes.push(definition);
      listeners.slice().forEach(function (listener) {
        try { listener(definition); } catch (e) { console.error('[dataset-loader] 场景监听器异常', e); }
      });
      return true;
    };
    hub.subscribe = function (listener) {
      if (typeof listener !== 'function') return function () {};
      listeners.push(listener);
      return function () {
        var index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    };
    hub.getScenes = function () { return scenes.slice(); };
    hub.setModuleStatus = function (id, status, detail) {
      moduleStatus[id] = { status: status, detail: detail || '', updatedAt: Date.now() };
    };
    hub.getModuleStatus = function () { return Object.assign({}, moduleStatus); };
    return hub;
  }

  var hub = (window.__GD_DATASET_SCENE_HUB__ = createHub(window.__GD_DATASET_SCENE_HUB__));
  if (hub._loaderStarted) return;
  hub._loaderStarted = true;

  function loadModule(module) {
    if (!module || !module.id || !module.url) return;
    if (document.querySelector('script[data-dataset-module="' + module.id + '"]')) return;

    hub.setModuleStatus(module.id, 'loading', module.url);
    var script = document.createElement('script');
    script.src = module.url;
    script.async = true;
    script.dataset.datasetModule = module.id;
    script.dataset.datasetModuleType = module.type || 'scene';
    script.onload = function () { hub.setModuleStatus(module.id, 'loaded', module.url); };
    script.onerror = function () {
      hub.setModuleStatus(module.id, 'error', module.url);
      console.error('[dataset-loader] 模块加载失败：' + module.id + ' — ' + module.url);
    };
    document.head.appendChild(script);
  }

  function loadAll() {
    (config.modules || []).forEach(loadModule);
  }

  async function isAllowed() {
    if (config.skipAuth) return true;
    if (typeof GD === 'undefined' || typeof GD.getUser !== 'function') return false;
    try {
      var value = await GD.getUser();
      var user = (value && value.$) || value || {};
      var roles = user.role || [];
      if (config.allowedRoles && config.allowedRoles.length &&
          !roles.some(function (role) { return config.allowedRoles.indexOf(role) >= 0; })) return false;
      if (config.openDomains && config.openDomains.length &&
          config.openDomains.indexOf(user.domId || '') < 0) return false;
      return true;
    } catch (e) {
      console.error('[dataset-loader] 获取用户信息失败，模块未加载', e);
      return false;
    }
  }

  async function start() {
    if (await isAllowed()) loadAll();
  }

  if (config.skipAuth) {
    start();
  } else if (typeof GD !== 'undefined' && typeof GD.on === 'function') {
    GD.on('gd-ready', start);
  } else {
    console.warn('[dataset-loader] GD SDK 不可用，模块未加载');
  }
})();
