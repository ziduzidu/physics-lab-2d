/* 模拟小程序运行时，把两个页面真的跑一遍 */
'use strict';

const path = require('path');

/* ---------------- canvas 2D 记录器 ---------------- */
const draw = { total: 0 };
function makeCtx() {
  const noop = () => { draw.total++; };
  const c = {};
  ['save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'ellipse', 'rect',
    'quadraticCurveTo', 'bezierCurveTo', 'arcTo', 'fill', 'stroke', 'fillRect', 'clearRect',
    'strokeRect', 'fillText', 'strokeText', 'setTransform', 'translate', 'rotate', 'scale',
    'setLineDash', 'drawImage', 'putImageData', 'clip'].forEach(function (k) { c[k] = noop; });
  c.createLinearGradient = () => ({ addColorStop() { } });
  c.createRadialGradient = () => ({ addColorStop() { } });
  c.createPattern = () => ({});
  c.createImageData = (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
  c.getImageData = (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
  c.measureText = (t) => ({ width: String(t).length * 6 });
  return c;
}

/* ---------------- wx ---------------------------- */
const storage = {};
const sels = [];

global.wx = {
  getSystemInfoSync: () => ({ pixelRatio: 2, windowWidth: 375, windowHeight: 667, platform: 'devtools' }),
  getStorageSync: (k) => (storage[k] === undefined ? '' : storage[k]),
  setStorageSync: (k, v) => { storage[k] = v; },
  removeStorageSync: (k) => { delete storage[k]; },
  createWebAudioContext: () => null,
  createSelectorQuery: () => {
    const q = {
      in() { return q; },
      select(sel) {
        sels.push(sel);
        return {
          fields() { return { exec(cb) { q._cb = cb; } }; }
        };
      },
      exec(cb) {
        const out = sels.map(function () {
          return { node: { width: 0, height: 0, getContext: makeCtx }, width: 351, height: 274 };
        });
        cb(out);
      }
    };
    return q;
  },
  setNavigationBarTitle() { },
  showToast(o) { global.__lastToast = o && o.title; },
  showModal(o) { if (o && o.success) o.success({ confirm: true }); },
  navigateTo(o) { global.__lastNav = o && o.url; },
  onAccelerometerChange() { }, startAccelerometer() { }, stopAccelerometer() { },
  setClipboardData() { }, vibrateShort() { }
};

/* ---------------- Page 注册 ---------------- */
const pageDefs = {};
global.Page = function (opts) { pageDefs[global.__curPage] = opts; };
global.getApp = () => ({ globalData: {} });

function setPath(obj, key, val) {
  const m = key.match(/^([a-zA-Z_$][\w$]*)((?:\[\d+\]|\.[\w$]+)*)$/);
  if (!m) { obj[key] = val; return; }
  let cur = obj[m[1]];
  const parts = m[2].match(/\[\d+\]|\.[\w$]+/g) || [];
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    cur = p.charAt(0) === '[' ? cur[Number(p.slice(1, -1))] : cur[p.slice(1)];
  }
  const last = parts[parts.length - 1];
  if (last.charAt(0) === '[') cur[Number(last.slice(1, -1))] = val;
  else cur[last.slice(1)] = val;
}

function instantiate(opts) {
  const inst = {};
  Object.keys(opts).forEach(function (k) { inst[k] = opts[k]; });
  inst.data = JSON.parse(JSON.stringify(opts.data || {}));
  inst.setData = function (obj, cb) {
    Object.keys(obj).forEach(function (k) {
      if (k.indexOf('.') < 0 && k.indexOf('[') < 0) inst.data[k] = obj[k];
      else setPath(inst.data, k, obj[k]);
    });
    if (typeof cb === 'function') cb();
  };
  inst.__route = 'pages/scene/scene';
  return inst;
}

function loadPage(file, name) {
  global.__curPage = name;
  delete require.cache[require.resolve(file)];
  require(file);
  return instantiate(pageDefs[name]);
}

let pass = 0, fail = 0;
function ok(name, cond, got) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + '   得到: ' + (got === undefined ? '' : got)); }
}

const ROOT = path.join(__dirname, '..');

(async function main() {
  console.log('\n[1] 首页');
  const home = loadPage(path.join(ROOT, 'pages/index/index.js'), 'pages/index/index');
  home.onLoad();
  ok('首页列出 9 个模块', home.data.modules.length === 9, home.data.modules.length);
  ok('模块有名称与简介', home.data.modules.every(m => m.name && m.desc), '');
  ok('统计了例题总数', home.data.totalExamples > 10, home.data.totalExamples);
  home.openModule({ currentTarget: { dataset: { id: 'kinema' } } });
  ok('点模块会跳转实验台', /pages\/scene\/scene\?id=kinema/.test(global.__lastNav || ''), global.__lastNav);

  console.log('\n[2] 运动图像实验台');
  const sc = loadPage(path.join(ROOT, 'pages/scene/scene.js'), 'pages/scene/scene');
  sc.onLoad({ id: 'kinema' });
  ok('标题取到了模块名', sc.data.title === '运动图像 v-t / a-t', sc.data.title);
  sc.onReady();
  await new Promise(r => setTimeout(r, 200));
  ok('画布初始化成功（无报错）', !sc.data.err, sc.data.err);
  ok('参数面板有 8 个滑块', sc.data.params.length === 8, sc.data.params.length);
  ok('滑块值来自场景默认值', sc.data.params[0].value === 0, sc.data.params[0].value);
  ok('识别出有图表', sc.data.hasCharts === true, sc.data.hasCharts);
  ok('读数表非空', sc.data.rows.length > 0, sc.data.rows.length);
  ok('例题有 4 道', sc.data.examples.length === 4, sc.data.examples.length);
  ok('画布真的画了东西', draw.total > 0, draw.total);

  console.log('\n[3] 交互');
  sc.onPlay();
  ok('点播放后状态为播放中', sc.data.playing === true);
  await new Promise(r => setTimeout(r, 700));
  const engine = require(path.join(ROOT, 'utils/engine.js'));
  ok('时间真的往前走了', engine.App.state.t > 0.1, engine.App.state.t);
  ok('读数随时间更新', sc.data.rows.length > 0 && /s$/.test(sc.data.rows[0].v), sc.data.rows[0] && sc.data.rows[0].v);

  sc.onParamSet({ currentTarget: { dataset: { i: 1 } }, detail: { value: 5 } });
  ok('拖滑块改到了引擎参数', engine.App.P.a1 === 5, engine.App.P.a1);
  ok('界面上的参数文字同步', sc.data.params[1].valueText === '5', sc.data.params[1].valueText);

  sc.onLoadExample({ currentTarget: { dataset: { i: 1 } } });
  ok('载入例题后参数被替换', engine.App.P.a1 === -5 && engine.App.P.v0 === 20,
    engine.App.P.v0 + '/' + engine.App.P.a1);
  ok('载入例题会打开答案', sc.data.examples[1].open === true);

  sc.onStep();
  ok('单步不抛异常', true);

  console.log('\n[4] 沙盒');
  const sb = loadPage(path.join(ROOT, 'pages/scene/scene.js'), 'pages/scene/scene');
  sb.onLoad({ id: 'sandbox' });
  sb.onReady();
  await new Promise(r => setTimeout(r, 200));
  ok('识别为沙盒模式', sb.data.isSandbox === true, sb.data.isSandbox);
  ok('沙盒首次进入自带装置', engine.SB.bodies.length > 0, engine.SB.bodies.length);
  const n0 = engine.SB.bodies.length;
  sb.onAdd({ currentTarget: { dataset: { k: 'box' } } });
  ok('点「＋方块」多了一个物体', engine.SB.bodies.length === n0 + 1, engine.SB.bodies.length);
  sb.onAdd({ currentTarget: { dataset: { k: 'bomb' } } });
  ok('点「＋炸药」也能加', engine.SB.bodies.length === n0 + 2, engine.SB.bodies.length);
  sb.onDetonate();
  ok('引爆不抛异常', true);
  await new Promise(r => setTimeout(r, 300));
  ok('引爆后碎片/特效有产生', engine.SB.bodies.length + (engine.SB.fx ? engine.SB.fx.length : 0) > 0, '');
  sb.onEnv();
  ok('能切到空间环境', engine.SB.env === 'space', engine.SB.env);
  sb.onEnv();
  ok('能切回地面', engine.SB.env === 'ground', engine.SB.env);

  console.log('\n[5] 其余模块逐个进');
  const ids = ['conveyor', 'blockBoard', 'statics', 'circ', 'link', 'astro', 'cosmos'];
  for (const id of ids) {
    const p = loadPage(path.join(ROOT, 'pages/scene/scene.js'), 'pages/scene/scene');
    p.onLoad({ id: id });
    p.onReady();
    await new Promise(r => setTimeout(r, 120));
    const hasParams = id === 'cosmos' ? true : p.data.params.length > 0;
    ok('模块 ' + id + ' 能打开且面板有内容', !p.data.err && hasParams, p.data.err || ('参数 ' + p.data.params.length));
    p.onUnload();
  }

  console.log('\n[6] 退出清理');
  sb.onUnload();
  ok('卸载后定时器停掉', sb.syncTimer === null, String(sb.syncTimer));

  console.log('\n' + (fail === 0 ? '全部通过' : '存在失败') + '：' + pass + ' 通过 / ' + fail + ' 失败');
  process.exit(fail === 0 ? 0 : 1);
})();
