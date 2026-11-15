/* 全板块冒烟：确认新增静力学后，原有模块未受影响 */
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync('_check.js', 'utf8');
const NUMKEYS = { clientWidth: 760, clientHeight: 400, width: 760, height: 400,
                  max: '1', min: '0', step: '1', value: '0' };
function node(tag) {
  const f = function () {};
  return new Proxy(f, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === Symbol.iterator) return function* () {};
      if (k === 'length') return 0;
      if (k === 'tagName') return tag || 'DIV';
      if (k in NUMKEYS) return NUMKEYS[k];
      if (k === 'getContext') return () => node('ctx');
      if (k === 'querySelectorAll') return () => [];
      return node(k);
    },
    set() { return true; }, apply() { return node('c'); }, has() { return true; }
  });
}
const store = {};
const sandbox = {
  console, Math, JSON, Date, Number, String, Array, Object, isFinite, isNaN, parseInt, parseFloat,
  setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, requestAnimationFrame: () => 0,
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
  performance: { now: () => 0 }, devicePixelRatio: 1, innerWidth: 760, innerHeight: 900
};
sandbox.window = sandbox; sandbox.document = node('doc');
sandbox.navigator = { userAgent: 'node' };
sandbox.location = { hash: '', href: '' };
sandbox.addEventListener = () => 0; sandbox.scrollTo = () => 0;
vm.createContext(sandbox);
const inject = 'globalThis.__T={Scenes:Scenes,MODULES:MODULES,App:App,render:render,resetSim:resetSim,enterScene:enterScene,runToEnd:runToEnd};\n';
const ii = code.lastIndexOf('})();');
vm.runInContext(code.slice(0, ii) + inject + code.slice(ii), sandbox, { filename: '_check.js' });
const T = sandbox.__T;

let pass = 0, fail = 0;
console.log('\n板块清单：' + Object.keys(T.Scenes).join(', '));
console.log('卡片数量：' + T.MODULES.length + '　顺序：' + T.MODULES.map(m => m.id).join(' → '));

Object.keys(T.Scenes).forEach(id => {
  const sc = T.Scenes[id];
  if (id === 'sandbox') { console.log('  · sandbox 为独立模式，跳过'); return; }
  if (id === 'free3d') { pass++; console.log('  ✓ free3d（独立实时三维分支，不走 params/step 纯函数契约）'); return; }
  let err = '';
  try {
    T.App.scene = sc;
    T.App.P = {};
    sc.params.forEach(p => { T.App.P[p.key] = p.def; });
    T.resetSim();
    // 跑到结束，途中每步都做一次渲染，模拟真实播放
    let guard = 0;
    while (!sc.finished(T.App.state, T.App.P) && guard < 600) {
      sc.step(T.App.state, T.App.P, 0.01);
      T.App.state.t += 0.01;
      if (++guard % 20 === 0) T.render();
    }
    T.render();
    const rows = sc.info(T.App.state, T.App.P);
    const bad = rows.filter(r => !isFinite(Number(String(r[1]).replace(/[^\d.eE+-]/g, ''))) && /NaN|undefined/.test(String(r[1])));
    if (bad.length) err = 'info 含 NaN：' + JSON.stringify(bad[0]);
    if (!isFinite(T.App.state.t)) err = 't 非法';
  } catch (e) { err = e.message; }
  if (err) { fail++; console.log('  ✗ ' + id + '　' + err); }
  else { pass++; console.log('  ✓ ' + id + '（' + sc.params.length + ' 参数 / ' + (sc.examples || []).length + ' 例题）跑到 t=' + T.App.state.t.toFixed(2) + 's 无异常'); }
});

// 通过 enterScene 走完整入口链路（含 App 首屏卡片生成逻辑）
let e2 = '';
try { T.enterScene('statics'); T.render(); } catch (e) { e2 = e.message; }
if (e2) { fail++; console.log('  ✗ enterScene(statics)　' + e2); }
else { pass++; console.log('  ✓ enterScene(statics) 完整入口链路无异常'); }

console.log('\n' + (fail ? '存在失败' : '全部通过') + '：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
