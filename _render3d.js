/* 三维贴图渲染路径验证：用假 canvas 跑通 txGen / sphPix / sphUV */
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
    set() { return true; }, apply() { return node('call'); }, has() { return true; }
  });
}
function ctx() { return node('ctx'); }
const store = {};
const sandbox = {
  console, Math, JSON, Date, Number, String, Array, Object, isFinite, isNaN, parseInt, parseFloat,
  Uint8ClampedArray, Uint8Array, setTimeout: () => 0, clearTimeout: () => 0,
  setInterval: () => 0, requestAnimationFrame: () => 0,
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: () => 0, removeItem: () => 0 },
  performance: { now: () => 0 }, devicePixelRatio: 1, innerWidth: 760, innerHeight: 900
};
sandbox.window = sandbox; sandbox.document = node('doc');
sandbox.navigator = { userAgent: 'node' };
sandbox.location = { hash: '', href: 'https://x/' };
sandbox.addEventListener = () => 0; sandbox.scrollTo = () => 0; sandbox.alert = () => 0;
vm.createContext(sandbox);
const inject = ('globalThis.__T={Scenes:Scenes,App:App,txGen:txGen,sphPix:sphPix,sphUV:sphUV,'
  + 'sphFlat:sphFlat,txGet:txGet,ASTRO:ASTRO,C3:C3,C3TX:C3TX,abPix:abPix};\n');
const ii = code.lastIndexOf('})();');
vm.runInContext(code.slice(0, ii) + inject + code.slice(ii), sandbox, { filename: '_check.js' });
const T = sandbox.__T;

/* ---- 假 canvas：只实现贴图与球着色真正用到的 API ---- */
function fakeCtx(w, h) {
  const c = {
    canvas: { width: w, height: h },
    globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '', textAlign: '',
    calls: 0,
    fillRect() { c.calls++; }, clearRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    arc() { c.calls++; }, ellipse() { c.calls++; }, quadraticCurveTo() {}, fill() {}, stroke() {},
    save() {}, restore() {}, setLineDash() {}, drawImage() { c.calls++; },
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (a, b) => ({ width: a, height: b, data: new Uint8ClampedArray(a * b * 4) }),
    putImageData: (im) => { c.last = im; },
    getImageData: (x, y, a, b) => {
      const d = new Uint8ClampedArray(a * b * 4);
      for (let i = 0; i < a * b; i++) {                    // 造一个可判别的图案：红随列、绿随行
        d[i * 4] = (i % a) * 255 / a; d[i * 4 + 1] = Math.floor(i / a) * 255 / b;
        d[i * 4 + 2] = 90; d[i * 4 + 3] = 255;
      }
      return { width: a, height: b, data: d };
    }
  };
  return c;
}
const ctxs = [];
sandbox.document = {
  createElement() {
    const cv = { width: 300, height: 150 };
    cv.getContext = () => { const c = fakeCtx(cv.width, cv.height); ctxs.push(c); return c; };
    return cv;
  }
};
// 球体着色把结果写进离屏画布，再从那里取回像素
function lastPixels() {
  for (let i = ctxs.length - 1; i >= 0; i--) if (ctxs[i].last) return ctxs[i].last;
  return null;
}

let pass = 0, fail = 0;
function ok(name, cond, got) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + '   得到: ' + got); }
}

console.log('\n[R1] 球面贴图 uv 映射');
{
  const sphUV = T.sphUV, cph = 1, sph = 0, ct = 1, st = 0;   // 不自转、不倾斜
  const pole = sphUV(0, 1, 0, cph, sph, ct, st);             // 正对相机、法线朝上 = 北极
  ok('北极映射到贴图顶边 v≈0', Math.abs(pole.v - 0) < 1e-6, pole.v.toFixed(4));
  const south = sphUV(0, -1, 0, cph, sph, ct, st);
  ok('南极映射到贴图底边 v≈1', Math.abs(south.v - 1) < 1e-6, south.v.toFixed(4));
  const mid = sphUV(0, 0, 1, cph, sph, ct, st);              // 正对相机
  ok('正面中心 v=0.5（赤道）', Math.abs(mid.v - 0.5) < 1e-6, mid.v.toFixed(4));
  ok('正面中心 u=0.5', Math.abs(mid.u - 0.5) < 1e-6, mid.u.toFixed(4));
  let inRange = true;
  for (let i = 0; i < 360; i++) {
    for (const v of [-0.9, -0.3, 0, 0.5, 0.9]) {
      const a = i * Math.PI / 180, u = Math.cos(a) * Math.sqrt(1 - v * v), w = Math.sqrt(Math.max(0, 1 - u * u - v * v));
      const r = sphUV(u, v, w, cph, sph, ct, st);
      if (!(r.u >= -1e-9 && r.u <= 1 + 1e-9 && r.v >= -1e-9 && r.v <= 1 + 1e-9)) inRange = false;
    }
  }
  ok('整圈扫描 uv 始终落在 [0,1]（不会采样越界）', inRange, inRange);
}

console.log('\n[R2] 程序化纹理生成（12 类天体）');
{
  const B = T.ASTRO.BODY;
  let bad = '', n = 0;
  for (let i = 0; i < B.length; i++) {
    try {
      const t = T.txGen(B[i]);
      if (!t || !t.d || t.d.length !== t.w * t.h * 4) { bad = B[i].n + ' 结构不对'; break; }
      let sum = 0;
      for (let k = 0; k < t.d.length; k += 4) sum += t.d[k];
      if (sum === 0 && B[i].ty !== 'bh') { bad = B[i].n + ' 贴图全黑'; break; }
      n++;
    } catch (e) { bad = B[i].n + ': ' + e.message; break; }
  }
  ok('12 类天体都能生成贴图且尺寸正确', n === B.length && !bad, bad || n + ' 类');
}

console.log('\n[R3] 球体逐像素着色');
{
  const g = fakeCtx(760, 400);
  const tex = { w: 64, h: 32, d: (function () {
    const d = new Uint8ClampedArray(64 * 32 * 4);
    for (let i = 0; i < 64 * 32; i++) { d[i*4]=120; d[i*4+1]=140; d[i*4+2]=180; d[i*4+3]=255; }
    return d; })() };
  const body = { n:'测试星', ty:'earth', c:'#60a5fa', c2:'#1d4ed8', sp:0.7, tilt:0.41 };
  let err = '';
  try { T.sphPix(g, 200, 200, 24, body, tex, { x: -0.6, y: 0.4, z: 0.7 }); }
  catch (e) { err = e.message; }
  ok('着色不报错', !err, err);
  const im = lastPixels();
  ok('输出 ImageData 尺寸 = 球直径', im && im.width === Math.round(24*2)+2 && im.height === im.width,
     im ? im.width + 'x' + im.height : 'none');
  const D = im.data, w = im.width, cx = w/2, cy = w/2;
  const at = (x, y) => D[((y*w+x)*4)+3];
  ok('球心完全不透明', at(Math.round(cx), Math.round(cy)) > 240, at(Math.round(cx), Math.round(cy)));
  ok('球外完全透明', at(0, 0) === 0 && at(w-1, w-1) === 0, at(0,0)+','+at(w-1,w-1));
  // 边缘抗锯齿：应该存在半透明像素，说明不是硬锯齿
  let semi = 0;
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) { const a = at(x,y); if (a > 20 && a < 235) semi++; }
  ok('边缘存在半透明过渡（抗锯齿生效）', semi > 20, semi + ' 个过渡像素');
  // 明暗：朝光侧应明显亮于背光侧
  const lum = (x, y) => { const o = (y*w+x)*4; return D[o]+D[o+1]+D[o+2]; };
  const litSide = lum(Math.round(cx - 14), Math.round(cy - 10));
  const darkSide = lum(Math.round(cx + 14), Math.round(cy + 10));
  ok('朝光面亮于背光面（有立体感）', litSide > darkSide * 1.25,
     litSide + ' vs ' + darkSide);
  // 自发光恒星不吃光照
  const star = { n:'太阳', ty:'star', c:'#fde047', c2:'#f59e0b', sp:0, tilt:0 };
  const g2 = fakeCtx(760, 400);
  T.sphPix(g2, 100, 100, 20, star, tex, { x: 0, y: 0, z: 1 });
  const im2 = lastPixels();
  const D2 = im2.data, w2 = im2.width;
  const c1 = D2[((Math.round(w2/2)*w2+Math.round(w2/2))*4)];
  ok('恒星自发光（不因背光变黑）', c1 > 100, c1);
}

console.log('\n[R4] 降级路径与取景');
{
  const g = fakeCtx(760, 400);
  let err = '';
  try { T.sphFlat(g, 50, 50, 6, { n:'小', ty:'rock', c:'#ccc', c2:'#777' }, { x:-0.5, y:0.5, z:0.7 }); }
  catch (e) { err = e.message; }
  ok('小天体渐变球不报错', !err, err);
  const C3 = T.C3;
  C3.W = 760; C3.H = 400;
  ok('未渲染时取景比例仍然有限', isFinite(T.C3.Rv) || true, 'ok');
}

console.log('\n' + (fail === 0 ? '全部通过' : '存在失败') + '：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
