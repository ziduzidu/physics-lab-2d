/*
 * 小程序环境适配层
 * ------------------------------------------------------------------
 * 网页版的物理引擎完全按浏览器写法写成（document / window / canvas 2D）。
 * 小程序没有 DOM，所以这里造一个「最小 DOM」，把节点操作全部吸收掉，
 * 只把 canvas 的绘制真正接到小程序的 Canvas 2D 节点上。
 *
 * 用法（页面里）：
 *   const env = require('../../utils/env.js');
 *   env.bindCanvas('scene', canvasNode, cssWidth, cssHeight);
 *   const engine = require('../../utils/engine.js');   // 再加载引擎
 */
'use strict';

var sysInfo = (function () {
  try { return wx.getSystemInfoSync(); } catch (e) {
    return { pixelRatio: 2, windowWidth: 375, windowHeight: 667 };
  }
})();
var DPR = sysInfo.pixelRatio || 2;
if (DPR > 2) DPR = 2;                    /* 大 canvas 在低端安卓上有内存上限，和网页版一致封顶 2 */
var VW = sysInfo.windowWidth || 375;
var VH = sysInfo.windowHeight || 667;

/* ---------------- 存储：localStorage 语义包在 wx storage 上 ---------------- */
var store = {
  getItem: function (k) {
    try {
      var v = wx.getStorageSync(k);
      return (v === '' || v === undefined || v === null) ? null : v;
    } catch (e) { return null; }
  },
  setItem: function (k, v) { try { wx.setStorageSync(k, String(v)); } catch (e) { } },
  removeItem: function (k) { try { wx.removeStorageSync(k); } catch (e) { } }
};

/* ---------------- 真实 canvas 注册表 ---------------- */
var real = {};        /* id -> { node, ctx, cssW, cssH } */

function bindCanvas(id, node, w, h) {
  var ctx = node.getContext('2d');
  real[id] = { node: node, ctx: ctx, cssW: w, cssH: h };
  return ctx;
}
function getReal(id) { return real[id] || null; }

/* ---------------- 虚拟节点 ---------------- */
var nodes = {};

function makeClassList(n) {
  var set = {};
  function load() {
    for (var k in set) delete set[k];
    String(n._cn || '').split(/\s+/).forEach(function (x) { if (x) set[x] = 1; });
  }
  function sync() { n._cn = Object.keys(set).join(' '); }
  return {
    add: function (c) { load(); String(c).split(/\s+/).forEach(function (x) { if (x) set[x] = 1; }); sync(); },
    remove: function (c) { load(); String(c).split(/\s+/).forEach(function (x) { delete set[x]; }); sync(); },
    toggle: function (c, on) {
      load();
      if (on === undefined) { if (set[c]) delete set[c]; else set[c] = 1; }
      else if (on) set[c] = 1; else delete set[c];
      sync();
    },
    contains: function (c) { load(); return !!set[c]; }
  };
}

/* 透明的空 2D 上下文：给 chart 之类还没绑定真实 canvas 的节点兜底，保证不崩 */
function nullCtx() {
  function noop() { }
  return {
    save: noop, restore: noop, beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, ellipse: noop, rect: noop, fill: noop, stroke: noop, clip: noop,
    fillRect: noop, clearRect: noop, strokeRect: noop, fillText: noop, strokeText: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop, arcTo: noop, setTransform: noop,
    translate: noop, rotate: noop, scale: noop, setLineDash: noop, drawImage: noop,
    putImageData: noop, createPattern: function () { return {}; },
    createLinearGradient: function () { return { addColorStop: noop }; },
    createRadialGradient: function () { return { addColorStop: noop }; },
    createImageData: function (w, h) {
      return { width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) };
    },
    getImageData: function (x, y, w, h) {
      return { width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) };
    },
    measureText: function (t) { return { width: String(t).length * 6 }; }
  };
}

function makeNode(id, tag) {
  var n = {
    tagName: String(tag || 'div').toUpperCase(),
    id: id || '',
    dataset: {},
    children: [],
    _style: {},
    _w: 0,
    _h: 0,
    _ctx: null,
    _listeners: {},
    value: '',
    max: '1',
    min: '0',
    step: '1',
    type: 'text',
    checked: false,
    textContent: ''
  };

  n.style = {
    setProperty: function (k, v) { n._style[k] = v; },
    getPropertyValue: function (k) { return n._style[k] || ''; },
    removeProperty: function (k) { delete n._style[k]; }
  };
  n.classList = makeClassList(n);

  Object.defineProperty(n, 'className', {
    get: function () { return n._cn || ''; },
    set: function (v) { n._cn = String(v); }
  });

  var _html = '';
  Object.defineProperty(n, 'innerHTML', {
    get: function () { return _html; },
    set: function (v) { _html = String(v); if (_html === '') n.children.length = 0; }
  });

  /* 尺寸：写 width/height 会落到真实 canvas 上；读 clientWidth 返回 CSS 尺寸 */
  Object.defineProperty(n, 'width', {
    get: function () {
      var r = real[id];
      return r ? (r.node.width || Math.round(r.cssW * DPR)) : 300;
    },
    set: function (v) {
      var r = real[id];
      if (r && r.node) { r.node.width = Math.round(v); }
      n._w = v;
    }
  });
  Object.defineProperty(n, 'height', {
    get: function () {
      var r = real[id];
      return r ? (r.node.height || Math.round(r.cssH * DPR)) : 150;
    },
    set: function (v) {
      var r = real[id];
      if (r && r.node) { r.node.height = Math.round(v); }
      n._h = v;
    }
  });
  Object.defineProperty(n, 'clientWidth', {
    get: function () {
      var r = real[id];
      return r ? r.cssW : VW;
    }
  });
  Object.defineProperty(n, 'clientHeight', {
    get: function () {
      var r = real[id];
      return r ? r.cssH : 300;
    }
  });

  n.getContext = function () {
    var r = real[id];
    if (r) return r.ctx;
    if (!n._ctx) n._ctx = nullCtx();
    return n._ctx;
  };
  n.getBoundingClientRect = function () {
    return {
      left: 0, top: 0,
      width: n.clientWidth, height: n.clientHeight,
      right: n.clientWidth, bottom: n.clientHeight
    };
  };
  n.appendChild = function (c) { n.children.push(c); return c; };
  n.insertBefore = function (c) { n.children.unshift(c); return c; };
  n.removeChild = function (c) {
    var i = n.children.indexOf(c);
    if (i >= 0) n.children.splice(i, 1);
    return c;
  };
  n.remove = function () {
    for (var k in nodes) if (nodes[k] === n) delete nodes[k];
  };
  n.querySelector = function (s) { return doc.querySelector(s); };
  n.querySelectorAll = function (s) { return doc.querySelectorAll(s); };
  n.setAttribute = function (k, v) { n['_' + k] = v; if (k === 'class') n.className = v; };
  n.getAttribute = function (k) { return n['_' + k] === undefined ? null : n['_' + k]; };
  n.hasAttribute = function (k) { return n['_' + k] !== undefined; };
  n.addEventListener = function (t, f) {
    if (!n._listeners[t]) n._listeners[t] = [];
    n._listeners[t].push(f);
  };
  n.removeEventListener = function (t, f) {
    var a = n._listeners[t] || [];
    var i = a.indexOf(f);
    if (i >= 0) a.splice(i, 1);
  };
  n.dispatch = function (t, ev) {           /* 页面层把真实触摸事件转发进来 */
    var a = n._listeners[t] || [];
    for (var i = 0; i < a.length; i++) {
      try { a[i](ev); } catch (e) { console.error('[env] 事件处理出错', t, e); }
    }
  };
  n.focus = function () { };
  n.blur = function () { };
  n.click = function () { n.dispatch('click', { target: n, currentTarget: n }); };
  n.toDataURL = function () { return ''; };
  n.scrollTo = function () { };
  n.scrollTop = 0;

  if (id) nodes[id] = n;
  return n;
}

function getNode(id) {
  if (!nodes[id]) nodes[id] = makeNode(id, 'div');
  return nodes[id];
}

var bodyNode = makeNode('__body', 'body');
var headNode = makeNode('__head', 'head');
var htmlNode = makeNode('__html', 'html');

var doc = {
  _nodes: nodes,
  body: bodyNode,
  head: headNode,
  documentElement: htmlNode,
  hidden: false,
  createElement: function (tag) { return makeNode('', tag); },
  createTextNode: function (t) {
    var n = makeNode('', '#text');
    n.textContent = String(t);
    return n;
  },
  getElementById: function (id) { return getNode(id); },
  querySelector: function (sel) {
    var s = String(sel);
    if (s.charAt(0) === '#') return getNode(s.slice(1));
    return getNode(s);
  },
  querySelectorAll: function (sel) {
    var s = String(sel);
    if (s.charAt(0) === '#') return [getNode(s.slice(1))];
    return [];
  },
  addEventListener: function (t, f) {
    if (!doc._l) doc._l = {};
    if (!doc._l[t]) doc._l[t] = [];
    doc._l[t].push(f);
  },
  removeEventListener: function () { },
  dispatch: function (t, ev) {
    var a = (doc._l && doc._l[t]) || [];
    for (var i = 0; i < a.length; i++) {
      try { a[i](ev); } catch (e) { }
    }
  }
};

/* ---------------- 音频：小程序 WebAudio 可用就用，不可用就静音 ---------------- */
function makeAudioContext() {
  try {
    if (typeof wx.createWebAudioContext === 'function') return wx.createWebAudioContext();
  } catch (e) { }
  return null;
}

/* ---------------- window ---------------- */
var win = {
  devicePixelRatio: DPR,
  innerWidth: VW,
  innerHeight: VH,
  screen: { width: VW, height: VH },
  orientation: 0,
  performance: { now: function () { return Date.now(); } },
  location: { hash: '', href: 'wx://miniprogram', reload: function () { } },
  navigator: { userAgent: 'WeChatMiniProgram', maxTouchPoints: 1, clipboard: null },
  addEventListener: function (t, f) { doc.addEventListener(t, f); },
  removeEventListener: function () { },
  scrollTo: function () { },
  getComputedStyle: function () { return { getPropertyValue: function () { return ''; } }; },
  btoa: function (s) {
    var t = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var i, o = '', c1, c2, c3;
    s = String(s);
    for (i = 0; i < s.length; i += 3) {
      c1 = s.charCodeAt(i);
      c2 = s.charCodeAt(i + 1);
      c3 = s.charCodeAt(i + 2);
      o += t.charAt(c1 >> 2);
      o += t.charAt(((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4));
      o += isNaN(c2) ? '=' : t.charAt(((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6));
      o += isNaN(c3) ? '=' : t.charAt(c3 & 63);
    }
    return o;
  },
  atob: function (s) {
    var t = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    s = String(s).replace(/[^A-Za-z0-9+/=]/g, '');
    var o = '', i, b1, b2, b3, b4;
    for (i = 0; i < s.length; i += 4) {
      b1 = t.indexOf(s.charAt(i));
      b2 = t.indexOf(s.charAt(i + 1));
      b3 = t.indexOf(s.charAt(i + 2));
      b4 = t.indexOf(s.charAt(i + 3));
      o += String.fromCharCode((b1 << 2) | (b2 >> 4));
      if (b3 !== -1 && s.charAt(i + 2) !== '=') o += String.fromCharCode(((b2 & 15) << 4) | (b3 >> 2));
      if (b4 !== -1 && s.charAt(i + 3) !== '=') o += String.fromCharCode(((b3 & 3) << 6) | b4);
    }
    return o;
  },
  URL: { createObjectURL: function () { return ''; }, revokeObjectURL: function () { } },
  matchMedia: function () { return { matches: false, addListener: function () { }, removeListener: function () { } }; },
  alert: function (m) { try { wx.showToast({ title: String(m), icon: 'none' }); } catch (e) { } },
  confirm: function () { return true; },
  prompt: function () { return null; }
};

/* ---------------- 渲染循环开关 ----------------
 * 引擎自己用 requestAnimationFrame 驱动主循环。小程序里这里把它接到
 * setTimeout 上，并用 loopOn 控制：页面 onShow 时打开，onHide 时关掉，
 * 下一帧检测到关闭就不再续，链条自然断开，不会在后台空转耗电。 */
var loopOn = false;

function startLoop() { loopOn = true; }
function stopLoop() { loopOn = false; }

win.requestAnimationFrame = function (fn) {
  if (!loopOn) return 0;
  return setTimeout(function () {
    if (!loopOn) return;
    try { fn(Date.now()); } catch (e) { console.error('[loop]', e); }
  }, 16);
};
win.cancelAnimationFrame = function (h) { if (h) clearTimeout(h); };

/* 引擎里既用 window.x 也用裸 x，两边都要指到同一份 */
win.window = win;
win.document = doc;
win.localStorage = store;
win.setTimeout = function (f, ms) { return setTimeout(f, ms); };
win.clearTimeout = function (h) { clearTimeout(h); };
win.setInterval = function (f, ms) { return setInterval(f, ms); };
win.clearInterval = function (h) { clearInterval(h); };
win.AudioContext = makeAudioContext;
win.webkitAudioContext = win.AudioContext;
win.DeviceOrientationEvent = function () { };

module.exports = {
  DPR: DPR,
  VW: VW,
  VH: VH,
  document: doc,
  window: win,
  localStorage: store,
  navigator: win.navigator,
  performance: win.performance,
  location: win.location,
  screen: win.screen,
  requestAnimationFrame: function (fn) { return win.requestAnimationFrame(fn); },
  cancelAnimationFrame: function (h) { win.cancelAnimationFrame(h); },
  startLoop: startLoop,
  stopLoop: stopLoop,
  isLoopOn: function () { return loopOn; },
  AudioContext: win.AudioContext,
  DeviceOrientationEvent: win.DeviceOrientationEvent,
  bindCanvas: bindCanvas,
  getReal: getReal,
  node: getNode,
  nodes: nodes
};
