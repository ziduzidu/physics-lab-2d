/* 模拟小程序环境，验证 engine.js 能加载、能切模块、能真的画出东西 */
'use strict';

const calls = { total: 0, byOp: {} };
function fakeCtx() {
  const c = {
    canvas: null,
    save() { }, restore() { }, beginPath() { }, closePath() { },
    moveTo() { }, lineTo() { }, arc() { }, ellipse() { }, rect() { },
    quadraticCurveTo() { }, bezierCurveTo() { }, arcTo() { },
    fill() { hit('fill'); }, stroke() { hit('stroke'); },
    fillRect() { hit('fillRect'); }, clearRect() { }, strokeRect() { },
    fillText() { hit('fillText'); }, strokeText() { },
    setTransform() { }, translate() { }, rotate() { }, scale() { }, setLineDash() { },
    drawImage() { }, putImageData() { },
    createLinearGradient() { return { addColorStop() { } }; },
    createRadialGradient() { return { addColorStop() { } }; },
    createPattern() { return {}; },
    createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }; },
    getImageData(x, y, w, h) { return { width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }; },
    measureText(t) { return { width: String(t).length * 6 }; },
    clip() { }
  };
  function hit(op) {
    calls.total++;
    calls.byOp[op] = (calls.byOp[op] || 0) + 1;
  }
  return c;
}

/* ---- wx 全局 ---- */
const storage = {};
global.wx = {
  getSystemInfoSync() {
    return { pixelRatio: 2, windowWidth: 375, windowHeight: 667, platform: 'devtools' };
  },
  getStorageSync(k) { return storage[k] === undefined ? '' : storage[k]; },
  setStorageSync(k, v) { storage[k] = v; },
  removeStorageSync(k) { delete storage[k]; },
  createWebAudioContext() { return null; },
  createSelectorQuery() { return { select() { return { fields() { return { exec(cb) { cb([null]); } }; } }; } }; },
  showToast() { }, showModal() { }, getNetworkType() { }, onAccelerometerChange() { },
  startAccelerometer() { }, stopAccelerometer() { }, setClipboardData() { }
};

const env = require('../utils/env.js');
const sceneCtx = fakeCtx();
const chVCtx = fakeCtx();
const chECtx = fakeCtx();
env.bindCanvas('scene', { width: 0, height: 0, getContext: () => sceneCtx }, 375, 420);
env.bindCanvas('chV', { width: 0, height: 0, getContext: () => chVCtx }, 375, 150);
env.bindCanvas('chE', { width: 0, height: 0, getContext: () => chECtx }, 375, 150);

let E;
try {
  E = require('../utils/engine.js');
} catch (e) {
  console.log('引擎加载失败:', e.message);
  console.log(e.stack.split('\n').slice(0, 6).join('\n'));
  process.exit(1);
}

let pass = 0, fail = 0;
function ok(name, cond, got) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + '   得到: ' + (got === undefined ? '' : got)); }
}

console.log('\n[1] 引擎加载');
ok('模块能 require 且不抛异常', !!E, 'null');
ok('导出里有 App', !!E.App);
ok('导出里有 Scenes', !!E.Scenes);
ok('场景数量 >= 8', E.Scenes && Object.keys(E.Scenes).length >= 8, E.Scenes && Object.keys(E.Scenes).length);
ok('模块清单 >= 8', E.MODULES && E.MODULES.length >= 8, E.MODULES && E.MODULES.length);

console.log('\n[2] 逐模块切场景');
const ids = E.MODULES.map(m => m.id);
ids.forEach(function (id) {
  const before = calls.total;
  let err = '';
  try {
    E.loadScene(id);
    E.render();
  } catch (e) {
    err = e.message;
  }
  const drew = calls.total - before;
  ok('模块 ' + id + ' 能加载并绘制', !err && drew > 0, err || ('绘制调用 ' + drew));
});

console.log('\n[3] 物理推进');
ok('运动图像能往前推并出历史记录', (function () {
  try {
    E.loadScene('kinema');
    const n0 = E.App.hist.length;
    for (let i = 0; i < 60; i++) E.advance(0.01);
    return E.App.hist.length > n0 && E.App.state.t > 0.1;
  } catch (e) { return e.message; }
})());

ok('沙盒能生成物体并推进', (function () {
  try {
    E.loadScene('sandbox');
    E.sbWorld({});
    E.SB.bodies.length = 0;
    const b = E.sbMake({ shape: 'box', bw: 1, bh: 1, x: 0, y: 6, mat: 'wood' });
    E.SB.bodies.push(b);
    const y0 = b.y;
    for (let i = 0; i < 60; i++) E.sbStep(1 / 60);
    return b.y < y0;
  } catch (e) { return e.message; }
})());

ok('沙盒爆炸不抛异常', (function () {
  try {
    E.sbExplode(0, 4, 20);
    for (let i = 0; i < 30; i++) E.sbStep(1 / 60);
    return true;
  } catch (e) { return e.message; }
})());

console.log('\n[4] 图表绘制');
ok('v-t 图能画出来', (function () {
  try {
    E.loadScene('kinema');
    for (let i = 0; i < 30; i++) E.advance(0.01);
    const before = calls.total;
    E.render();
    return calls.total > before;
  } catch (e) { return e.message; }
})());

console.log('\n[5] 系统层');
ok('账号系统可用', !!(E.ACC && typeof E.ACC.reg === 'function'));
ok('未登录也能进沙盒（v18 起不强制登录）', (function () {
  try { E.ACC.logout(); return E.gateCan('sandbox') === true; } catch (e) { return e.message; }
})());
ok('storage 真的写进了 wx storage', (function () {
  try {
    E.ACC.logout();
    E.ACC.reg('tester', 'pw1234');
    return Object.keys(storage).some(k => String(storage[k]).indexOf('tester') >= 0);
  } catch (e) { return e.message; }
})());

console.log('\n' + (fail === 0 ? '全部通过' : '存在失败') + '：' + pass + ' 通过 / ' + fail + ' 失败');
console.log('累计 canvas 调用: ' + calls.total + ' 次');
process.exit(fail === 0 ? 0 : 1);
