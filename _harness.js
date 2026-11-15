/* 在 Node 里用最小 DOM 桩跑整页脚本，做物理正确性与渲染冒烟测试 */
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
      if (k === 'getContext') return () => ctx();
      if (k === 'querySelectorAll') return () => [];
      if (k === 'createElement') return (tg) => node(tg);
      return node(k);
    },
    set() { return true; },
    apply() { return node('call'); },
    has() { return true; }
  });
}
function ctx() { return node('ctx'); }

const store = {};
const sandbox = {
  console,
  Math, JSON, Date, Number, String, Array, Object, isFinite, isNaN, parseInt, parseFloat,
  setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0,
  requestAnimationFrame: () => 0,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  performance: { now: () => 0 },
  devicePixelRatio: 1,
  innerWidth: 760, innerHeight: 900
};
sandbox.window = sandbox;
sandbox.document = node('doc');
sandbox.navigator = { userAgent: 'node' };
sandbox.location = { hash: '', href: 'https://x/' };
sandbox.addEventListener = () => 0;
sandbox.scrollTo = () => 0;
sandbox.alert = () => 0;

vm.createContext(sandbox);
// 整页脚本是严格模式 IIFE，在收尾前把内部符号挂到 globalThis 供测试取出
const inject = ('globalThis.__T={Scenes:Scenes,MODULES:MODULES,ICO:ICO,SHORT:SHORT,'
  + 'App:App,render:render,resetSim:resetSim,loadScene:loadScene,enterScene:enterScene};\n');
const ii = code.lastIndexOf('})();');
if (ii < 0) { console.error('找不到 IIFE 结尾'); process.exit(1); }
vm.runInContext(code.slice(0, ii) + inject + code.slice(ii), sandbox, { filename: '_check.js' });

const T = sandbox.__T;
const Scenes = T.Scenes, App = T.App;
let pass = 0, fail = 0;
function ok(name, cond, got) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + '   得到: ' + got); }
}
function near(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 1e-2 : tol); }

console.log('\n[1] 注册检查');
ok('Scenes.statics 已注册', !!Scenes.statics, Scenes.statics);
ok('MODULES 含 statics', T.MODULES.some(m => m.id === 'statics'), JSON.stringify(T.MODULES.map(m => m.id)));
ok('ICO.statics 存在', !!(T.ICO && T.ICO.statics), typeof T.ICO);
ok('SHORT.statics 存在', !!(T.SHORT && T.SHORT.statics), JSON.stringify(T.SHORT));
ok('params 有 7 项', Scenes.statics.params.length === 7, Scenes.statics.params.length);

const S = Scenes.statics;
function P(base) {
  const o = { mode: 0, m: 5, mu: 0.4, th: 30, F: 0, al: 0, g: 10 };
  for (const k in base) o[k] = base[k];
  return o;
}
function R(p) { const st = S.init(p); st.t = 0; return S.solve(st, p); }

console.log('\n[2] 情景 A 斜面：自锁判据');
let r = R(P({ m: 5, mu: 0.4, th: 30, F: 0 }));
ok('N = mg cos30 = 43.30 N', near(r.N, 43.301), r.N);
ok('μN = 17.32 N', near(r.fmax, 17.3205), r.fmax);
ok('沿面需求 = −25 N（下滑趋势）', near(r.req, -25), r.req);
ok('判定为下滑 down', r.state === 'down', r.state);
r = R(P({ mu: 0.6, th: 30 }));
ok('μ=0.6 → 静止 rest', r.state === 'rest', r.state);
ok('静止时 f = 25 N（按需，不是 μN）', near(r.f, 25), r.f);
r = R(P({ mu: 0.8, th: 30, th2: 0 }));
ok('θ=80° 无外力必滑', R(P({ th: 80, mu: 0.9 })).state === 'down', R(P({ th: 80, mu: 0.9 })).state);
ok('θ=0 时静止且不脱离', R(P({ th: 0 })).state === 'rest', R(P({ th: 0 })).state);
ok('提离斜面：F=100 α=50 θ=30 → lift', R(P({ F: 100, al: 80 })).lift === true, R(P({ F: 100, al: 80 })).lift);
ok('提离时 N = 0', R(P({ F: 100, al: 80 })).N === 0, R(P({ F: 100, al: 80 })).N);

console.log('\n[3] 情景 B 水平：拉比推省力');
r = R(P({ mode: 1, m: 10, mu: 0.3, F: 35, al: 30 }));
ok('斜拉 N = 82.5 N', near(r.N, 82.5), r.N);
ok('斜拉 μN = 24.75 N', near(r.fmax, 24.75), r.fmax);
ok('斜拉需求 30.31 N → 动 Up', r.state === 'up' && near(r.req, 30.3109), r.state + '/' + r.req);
r = R(P({ mode: 1, m: 10, mu: 0.3, F: 35, al: -30 }));
ok('斜推 N = 117.5 N', near(r.N, 117.5), r.N);
ok('斜推 μN = 35.25 N → 静止', r.state === 'rest' && near(r.fmax, 35.25), r.state + '/' + r.fmax);
ok('斜推时 f = −30.31 N（反向）', near(r.f, -30.3109), r.f);
ok('水平拉飞：F=200 α=80 → lift', R(P({ mode: 1, m: 2, F: 200, al: 80 })).lift === true, 'no');

console.log('\n[4] 情景 C 悬绳三力平衡');
r = R(P({ mode: 2, m: 2, F: 15, al: 0 }));
ok('β = 36.87°', near(r.beta, 36.8699), r.beta);
ok('T = 25 N', near(r.T, 25), r.T);
ok('未松弛', r.slack === false, r.slack);
let st2 = S.init(P({ mode: 2, m: 2, F: 15, al: 0 }));
ok('球在悬点右下方偏 0.69 m', near(st2.x, 0.69, 0.01) && near(st2.y, 1.48, 0.02), st2.x + ',' + st2.y);
r = R(P({ mode: 2, m: 2, F: 0, al: 0 }));
ok('F=0 → β=0，T=mg', near(r.beta, 0) && near(r.T, 20), r.beta + '/' + r.T);
r = R(P({ mode: 2, m: 2, F: 40, al: 60 }));
ok('外力托起 → 绳松弛 slack', r.slack === true, r.slack);

console.log('\n[5] 情景 D 竖直墙自锁');
r = R(P({ mode: 3, m: 1, mu: 0.4, F: 20, al: 0 }));
ok('N = F = 20 N', near(r.N, 20), r.N);
ok('μN = 8 N', near(r.fmax, 8), r.fmax);
ok('需求 −10 N → 下滑', r.state === 'down' && near(r.req, -10), r.state + '/' + r.req);
r = R(P({ mode: 3, m: 1, mu: 0.4, F: 25, al: 0 }));
ok('F=25 恰好静止（μN=10）', r.state === 'rest', r.state);
ok('静止时 f = 10 N 向上', near(r.f, 10), r.f);
r = R(P({ mode: 3, m: 1, mu: 0.4, F: 0, al: 0 }));
ok('F=0 → 无支持力，自由下落', r.lift === true && r.state === 'down', r.lift + '/' + r.state);

console.log('\n[6] 动力学积分（松手后真的动）');
function run(p, tt) {
  const st = S.init(p), h = 0.001, n = Math.round(tt / h);
  for (let i = 0; i < n; i++) { st.t += h; S.step(st, p, h); }
  return st;
}
let st = run(P({ m: 5, mu: 0.4, th: 30, F: 0 }), 1);
let vt = st.vx * Math.cos(Math.PI / 6) + st.vy * Math.sin(Math.PI / 6);
ok('斜面下滑 1 s → v = −1.536 m/s', near(vt, -1.5359, 0.01), vt);
st = run(P({ mode: 1, m: 10, mu: 0.3, F: 35, al: 30 }), 1);
ok('水平斜拉 1 s → v = 0.556 m/s', near(st.vx, 0.556, 0.01), st.vx);
st = run(P({ mode: 1, m: 10, mu: 0.3, F: 35, al: -30 }), 1);
ok('水平斜推 → 静止 v≈0', Math.abs(st.vx) < 1e-9, st.vx);
st = run(P({ mode: 3, m: 1, mu: 0.4, F: 20, al: 0 }), 0.5);
ok('墙面下滑 0.5 s → v = −1 m/s', near(st.vy, -1, 0.01), st.vy);
st = run(P({ mode: 2, m: 2, F: 15, al: 0 }), 0.3);
ok('悬绳平衡保持不动', Math.sqrt(st.vx * st.vx + st.vy * st.vy) < 1e-6, st.vx + ',' + st.vy);

console.log('\n[7] 全部情景 / 极端参数渲染冒烟');
let big = 0;
for (let mode = 0; mode <= 3; mode++) {
  for (const th of [0, 30, 80]) for (const mu of [0, 0.4, 1]) for (const F of [0, 60, 200]) for (const al of [-80, 0, 80]) {
    const p = P({ mode, th, mu, F, al, m: 8 });
    App.scene = S; App.P = p;
    try { T.resetSim(); T.render(); S.stage(st, p); S.info(st, p); }
    catch (e) { if (big++ < 3) console.log('   渲染异常 mode=' + mode + ' ' + e.message); }
  }
}
ok('108 组参数组合渲染均无异常', big === 0, big + ' 组失败');

console.log('\n[8] 例题参数自检');
S.examples.forEach((ex, i) => {
  const p = P(ex.params);
  const s = S.init(p);
  let err = '';
  try { const rr = S.solve(s, p); if (!isFinite(rr.N + rr.f + rr.req + rr.T)) err = 'NaN'; } catch (e) { err = e.message; }
  ok('例' + (i + 1) + ' 参数可载入且数值有效（' + ex.title.slice(0, 12) + '）', err === '', err);
});

console.log('\n' + (fail === 0 ? '全部通过' : '存在失败') + '：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
