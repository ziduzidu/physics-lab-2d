/* 布局体检：用真实 View 检查各情景关键元素是否落在画布可视范围内 */
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync('_check.js', 'utf8');
const NUMKEYS = { clientWidth: 760, clientHeight: 400, width: 760, height: 400, max: '1', min: '0', step: '1', value: '0' };
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
sandbox.navigator = { userAgent: 'node' }; sandbox.location = { hash: '', href: '' };
sandbox.addEventListener = () => 0; sandbox.scrollTo = () => 0;
vm.createContext(sandbox);
const inject = 'globalThis.__T={Scenes:Scenes,App:App,View:View};\n';
const ii = code.lastIndexOf('})();');
vm.runInContext(code.slice(0, ii) + inject + code.slice(ii), sandbox, { filename: '_check.js' });
const T = sandbox.__T, S = T.Scenes.statics;

const W = 760, H = 400, PAD = 12;
function base(o) { const p = { mode: 0, m: 5, mu: 0.4, th: 30, F: 0, al: 0, g: 10 }; for (const k in o) p[k] = o[k]; return p; }

let pass = 0, fail = 0;
function check(name, cond, info) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + '　' + info); }
}

Object.keys(S.MODE).forEach(mk => {
  const mode = Number(mk);
  [[30, 0], [80, 60], [0, 200]].forEach(cfg => {
    const P = base({ mode, th: cfg[0], F: cfg[1], al: 45, m: 8 });
    const st = S.init(P);
    const b = S.bounds(st, P);
    const V = new T.View();
    for (let i = 0; i < 200; i++) V.fit(b.x, b.y, W, H);   // 收敛到稳定
    const pts = [['物体', st.x, st.y]];
    if (mode === 2) pts.push(['悬点', S.geo(P).A[0], S.geo(P).A[1]]);
    if (mode === 0) pts.push(['斜面顶端', S.PLANE * Math.cos(S.rad(P.th)), S.PLANE * Math.sin(S.rad(P.th))]);
    pts.forEach(pt => {
      const X = V.sx(pt[1]), Y = V.sy(pt[2]);
      const okin = X >= PAD && X <= W - PAD && Y >= PAD && Y <= H - PAD;
      check(S.MODE[mode] + ' θ=' + cfg[0] + ' F=' + cfg[1] + ' → ' + pt[0] + ' 在画布内',
        okin, '屏幕坐标 (' + X.toFixed(0) + ',' + Y.toFixed(0) + ')　画布 ' + W + '×' + H);
    });
  });
});
console.log('\n' + (fail ? '存在越界' : '布局全部正常') + '：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
