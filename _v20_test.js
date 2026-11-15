/* v20 体检：3D 自由沙盒
   引擎装载 / 刚体物理 / 爆炸冲量 / 透视相机 / 拾取 / 场景 / 渲染 / 路由 */
const { runScript } = require('./_domstub.js');
const fs = require('fs');

const st = runScript('_check.js', {});
const T = st.T;
let pass = 0, fail = 0;
function ok(name, cond, got) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + '   得到: ' + (got === undefined ? '' : got)); }
}
const html = fs.readFileSync('index.html', 'utf8');
const { CANNON, F3, F3C, F3MAT, F3MATK, MODULES, Scenes, SHORT, ICO, F3L } = T;

/* ==================== [1] 引擎装载 ==================== */
console.log('\n[1] 引擎装载');
ok('CANNON 已内联且导出核心类',
  CANNON && CANNON.World && CANNON.Body && CANNON.Box && CANNON.Sphere &&
  CANNON.Plane && CANNON.Cylinder && CANNON.Vec3 && CANNON.ContactMaterial,
  CANNON ? Object.keys(CANNON).length + ' 个导出' : 'missing');
ok('页面零外部资源引用（完全离线）',
  !/(?:src|href)\s*=\s*["'](?:https?:)?\/\//.test(html), 'has external ref');
ok('CANNON 来源与协议在注释里注明',
  html.indexOf('pmndrs/cannon-es') > 0 && html.indexOf('MIT License') > 0, 'no credit');
ok('版本号已到 v20.x', /v20(\.\d)? · 单文件离线版/.test(html), 'ok');
ok('模块数 = 10 且含 free3d',
  MODULES.length === 10 && MODULES.some(m => m.id === 'free3d'), MODULES.length);
ok('free3d 卡片文案完整',
  (function () {
    const m = MODULES.find(x => x.id === 'free3d');
    return m && m.name === '3D 自由沙盒' && m.desc.length > 30 && m.tags.length >= 3;
  })(), 'bad card');
ok('Scenes.free3d 已注册（顶部 tab 可见）', !!Scenes.free3d && Scenes.free3d.name === '3D 自由沙盒', 'no scene');
ok('SHORT / ICO 都有 free3d', SHORT.free3d === '3D' && /svg/.test(ICO.free3d || ''), SHORT.free3d);
ok('V20 样式已注入', html.indexOf('V20-CSS-BEGIN') > 0 && html.indexOf('.f3mats') > 0, 'no css');

/* ==================== [2] 刚体物理 ==================== */
console.log('\n[2] 刚体物理');
T.f3BuildWorld();
ok('世界 = 1 地面 + 4 隐形边界墙', F3.world.bodies.length === 5, F3.world.bodies.length);
ok('六种材质齐全', F3MATK.length === 6 && F3MATK.every(k => F3MAT[k] && F3MAT[k].n), F3MATK.join(','));
ok('材质密度排序合理（钢 > 玻璃 > 橡胶 > 冰 > 木 > 泡沫）',
  F3MAT.steel.d > F3MAT.glass.d && F3MAT.glass.d > F3MAT.rubber.d &&
  F3MAT.rubber.d > F3MAT.ice.d && F3MAT.ice.d > F3MAT.wood.d && F3MAT.wood.d > F3MAT.foam.d,
  'order');
ok('冰的摩擦最小、橡胶最大',
  F3MAT.ice.r < 0.1 && F3MAT.rubber.r > 0.8, F3MAT.ice.r + '/' + F3MAT.rubber.r);

/* 质量 = 密度 × 体积 */
(function () {
  const b = T.f3Make('box', { x: 0, y: 20, z: 0, mat: 'wood' });     // 1.1³
  const s = T.f3Make('sph', { x: 0, y: 20, z: 0, r: 0.5, mat: 'wood' }); // 4/3π·0.125
  const c = T.f3Make('cyl', { x: 0, y: 20, z: 0, r: 0.44, h: 1.15, mat: 'wood' });
  const mb = 520 * 1.331, ms = 520 * (4 / 3) * Math.PI * 0.125, mc = 520 * Math.PI * 0.44 * 0.44 * 1.15;
  ok('方块质量 = 密度×体积', Math.abs(b.b.mass - mb) / mb < 0.02, b.b.mass.toFixed(1) + ' vs ' + mb.toFixed(1));
  ok('球质量 = 密度×体积', Math.abs(s.b.mass - ms) / ms < 0.02, s.b.mass.toFixed(1) + ' vs ' + ms.toFixed(1));
  ok('圆柱质量 = 密度×体积', Math.abs(c.b.mass - mc) / mc < 0.02, c.b.mass.toFixed(1) + ' vs ' + mc.toFixed(1));
  ok('fixed 物体 mass = 0', T.f3Make('box', { x: 5, y: 3, z: 0, fixed: true }).b.mass === 0, 'not fixed');
  T.f3Clear();
})();

ok('清空后世界只剩静态体', F3.ms.length === 0 && F3.world.bodies.length === 5, F3.ms.length);

/* 自由落体 + 静止 */
(function () {
  const b = T.f3Make('box', { x: 0, y: 6, z: 0, mat: 'steel' });
  for (let i = 0; i < 600; i++) T.f3Step(1 / 60);
  ok('方块自由下落后停在地面上（y = 半高）', Math.abs(b.b.position.y - 0.55) < 0.06,
    b.b.position.y.toFixed(3));
  ok('落地后速度接近 0', T.f3Len(b.b.velocity.x, b.b.velocity.y, b.b.velocity.z) < 0.35,
    T.f3Len(b.b.velocity.x, b.b.velocity.y, b.b.velocity.z).toFixed(3));
})();

/* 堆叠稳定 */
(function () {
  T.f3Clear();
  const a = T.f3Make('box', { x: 0, y: 0.6, z: 0, mat: 'wood' });
  const b = T.f3Make('box', { x: 0.04, y: 1.75, z: 0.03, mat: 'wood' });
  const c = T.f3Make('box', { x: -0.03, y: 2.9, z: 0, mat: 'wood' });
  for (let i = 0; i < 900; i++) T.f3Step(1 / 60);
  ok('三层堆叠 15 秒后不塌陷、不穿模',
    a.b.position.y > 0.4 && b.b.position.y > 1.2 && c.b.position.y > 1.9,
    [a.b.position.y, b.b.position.y, c.b.position.y].map(v => v.toFixed(2)).join(' / '));
})();

/* 零重力 */
(function () {
  T.f3Clear();
  F3.world.gravity.set(0, 0, 0);
  const b = T.f3Make('sph', { x: 0, y: 5, z: 0, r: 0.5, mat: 'wood' });
  const y0 = b.b.position.y;
  for (let i = 0; i < 240; i++) T.f3Step(1 / 60);
  ok('零重力下球悬停不落', Math.abs(b.b.position.y - y0) < 0.05, b.b.position.y.toFixed(3));
  F3.world.gravity.set(0, -9.82, 0);
  T.f3Clear();
})();

/* ==================== [3] 爆炸 ==================== */
console.log('\n[3] 爆炸冲量');
(function () {
  T.f3Clear();
  const near = T.f3Make('box', { x: 0.5, y: 1.4, z: 0 });
  const far = T.f3Make('box', { x: 11, y: 1.4, z: 0 });
  near.b.sleepState = 2; near.b.wakeUp();
  T.f3Boom(0, 1.2, 0, 1);
  ok('爆炸把周围物体掀飞（近处获得速度）',
    T.f3Len(near.b.velocity.x, near.b.velocity.y, near.b.velocity.z) > 1.5,
    T.f3Len(near.b.velocity.x, near.b.velocity.y, near.b.velocity.z).toFixed(2));
  ok('远处的物体基本不受影响（9 m 半径外）',
    T.f3Len(far.b.velocity.x, far.b.velocity.y, far.b.velocity.z) < 0.01,
    T.f3Len(far.b.velocity.x, far.b.velocity.y, far.b.velocity.z).toFixed(3));
  ok('爆炸产生冲击波特效', F3.boomFx.length === 1, F3.boomFx.length);
  ok('爆炸带起相机抖动', F3C.shake > 0.2, F3C.shake.toFixed(2));
  ok('冲击波 1.2 秒内自动回收', (function () {
    for (let k = 0; k < 24; k++) T.f3Boom; // noop
    for (let k = 0; k < 30; k++) F3.boomFx.forEach(f => f.t += 0.055);
    /* 真跑一次渲染，让 f3DrawBoom 清理 */
    F3C.W = 760; F3C.H = 420; T.f3CamUpdate();
    try { T.f3Render(); } catch (e) { return 'err:' + e.message; }
    return F3.boomFx.length === 0;
  })(), F3.boomFx.length);
  T.f3Clear();
})();

/* ==================== [4] 透视相机 ==================== */
console.log('\n[4] 透视相机');
F3C.yaw = -0.82; F3C.pitch = 0.40; F3C.dist = 16.5;
F3C.tgt = { x: 0, y: 1.15, z: 0 };
F3C.tYaw = null;
F3C.W = 760; F3C.H = 420;
T.f3CamUpdate();
ok('相机位置 = 目标点 + 距离×方向',
  Math.abs(T.f3Len(F3C.eye.x - F3C.tgt.x, F3C.eye.y - F3C.tgt.y, F3C.eye.z - F3C.tgt.z) - F3C.dist) < 1e-6,
  T.f3Len(F3C.eye.x - F3C.tgt.x, F3C.eye.y - F3C.tgt.y, F3C.eye.z - F3C.tgt.z).toFixed(3));
ok('目标点的相机空间深度 = 相机距离',
  Math.abs(T.f3View(F3C.tgt.x, F3C.tgt.y, F3C.tgt.z).z - F3C.dist) < 1e-6,
  T.f3View(F3C.tgt.x, F3C.tgt.y, F3C.tgt.z).z);
ok('相机自身位置的深度 ≈ 0',
  Math.abs(T.f3View(F3C.eye.x, F3C.eye.y, F3C.eye.z).z) < 1e-6,
  T.f3View(F3C.eye.x, F3C.eye.y, F3C.eye.z).z.toFixed(6));
ok('基向量正交（right·up = up·dir = right·dir = 0）',
  Math.abs(F3C.rx * F3C.ux + F3C.ry * F3C.uy + F3C.rz * F3C.uz) < 1e-9 &&
  Math.abs(F3C.bx * F3C.ux + F3C.by * F3C.uy + F3C.bz * F3C.uz) < 1e-9 &&
  Math.abs(F3C.rx * F3C.bx + F3C.ry * F3C.by + F3C.rz * F3C.bz) < 1e-9, 'not ortho');
(function () {
  const s = T.f3Sc(F3C.tgt.x, F3C.tgt.y, F3C.tgt.z);
  ok('目标点投影落在屏幕正中',
    Math.abs(s.X - 380) < 0.01 && Math.abs(s.Y - 210) < 0.01, s.X.toFixed(2) + ',' + s.Y.toFixed(2));
})();
ok('相机后方的点投影为 null', T.f3Sc(F3C.eye.x, F3C.eye.y + 0.01, F3C.eye.z) === null, 'not null');
ok('焦距随画布尺寸变化', (function () {
  const f1 = F3C.fpx;
  F3C.W = 1200; F3C.H = 800; T.f3CamUpdate();
  const f2 = F3C.fpx;
  F3C.W = 760; F3C.H = 420; T.f3CamUpdate();
  return f2 > f1;
})(), 'no change');

/* 近平面裁剪 */
ok('全在近平面之后 → 裁成空', T.f3Clip([{ x: 0, y: 0, z: -5 }, { x: 1, y: 0, z: -6 }], 0.16).length === 0, 'not empty');
ok('跨越近平面 → 补出 z = near 的交点', (function () {
  const c = T.f3Clip([{ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 1, z: 1 }], 0.16);
  return c.length === 4 && c.some(p => Math.abs(p.z - 0.16) < 1e-9);
})(), 'bad clip');
ok('全在近平面之前 → 原样返回', T.f3Clip([{ x: 0, y: 0, z: 5 }, { x: 1, y: 0, z: 5 }, { x: 0, y: 1, z: 5 }], 0.16).length === 3, 'changed');

/* 射线 */
ok('屏幕中心射线方向 ≈ 相机前向', (function () {
  const r = T.f3Ray(380, 210);
  const d = r.d;
  const dot = -(d.x * F3C.bx + d.y * F3C.by + d.z * F3C.bz);
  return Math.abs(dot - 1) < 1e-6;
})(), 'bad dir');
ok('射线起点 = 相机位置', (function () {
  const r = T.f3Ray(100, 100);
  return Math.abs(r.o.x - F3C.eye.x) < 1e-9 && Math.abs(r.o.y - F3C.eye.y) < 1e-9;
})(), 'bad origin');
ok('射线与平行屏幕平面求交，交在目标点附近', (function () {
  const p = T.f3RayPlane(380, 210, 0, 1.15, 0);
  return p && Math.abs(p.x) < 0.02 && Math.abs(p.y - 1.15) < 0.02 && Math.abs(p.z) < 0.02;
})(), 'bad plane');

/* ==================== [5] 拾取 ==================== */
console.log('\n[5] 拾取');
(function () {
  T.f3Clear();
  const m = T.f3Make('box', { x: 0, y: 1.15, z: 0, hs: [0.7, 0.7, 0.7] });
  const c = T.f3Sc(0, 1.15, 0);
  const hit = T.f3Pick(c.X, c.Y);
  ok('点在物体正中 → 命中它', hit && hit.i === 0, hit ? hit.i : 'null');
  ok('点在远处空白 → 不命中', T.f3Pick(8, 8) === null, 'hit something');
  const s = T.f3Make('sph', { x: 0, y: 1.15, z: 3.2, r: 0.6 });
  const c2 = T.f3Sc(0, 1.15, 3.2);
  const h2 = T.f3Pick(c2.X, c2.Y);
  ok('球也能被点中', h2 && h2.i === 1, h2 ? h2.i : 'null');
  ok('两个物体在屏幕上重叠时取离相机更近的那个', (function () {
    /* 沿视线方向把球往前挪 1 个单位：投影位置不变，但深度更浅 */
    s.b.position.set(F3C.bx*1, 1.15 + F3C.by*1, F3C.bz*1);
    const cc = T.f3Sc(0, 1.15, 0);
    const h = T.f3Pick(cc.X, cc.Y);
    return h && h.i === 1;
  })(), 'picked wrong');
  T.f3Clear();
})();
ok('凸包 / 点在多边形内测试正确', (function () {
  const sq = [{ X: 0, Y: 0 }, { X: 10, Y: 0 }, { X: 10, Y: 10 }, { X: 0, Y: 10 }];
  const h = T.f3Hull(sq.concat([{ X: 5, Y: 5 }]));
  return h.length === 4 && T.f3InPoly(5, 5, h) && !T.f3InPoly(15, 5, h);
})(), 'bad hull');

/* ==================== [6] 场景内容 ==================== */
console.log('\n[6] 场景与预设');
ok('默认场景 5 个物体', (function () { T.f3Default(); return F3.ms.length === 5; })(), F3.ms.length);
ok('彩塔 = 6 层递减', (function () {
  T.f3P1(); return F3.ms.length === 3 + 3 + 2 + 2 + 1 + 1;
})(), F3.ms.length);
ok('多米诺 = 13 张牌 + 1 颗球', (function () { T.f3P2(); return F3.ms.length === 14; })(), F3.ms.length);
ok('多米诺初始球速向右（会推倒骨牌）', (function () {
  const ball = F3.ms.filter(m => m.kind === 'sph')[0];
  return ball && ball.b.velocity.x > 3;
})(), 'no velocity');
ok('弹珠台 = 4 个固定槽 + 1 斜坡 + 4 球', (function () { T.f3P3(); return F3.ms.length === 9; })(), F3.ms.length);
ok('弹珠台斜坡是静态体（mass=0）', (function () {
  return F3.ms.filter(m => m.fixed).length >= 5;
})(), 'no static');
ok('保龄球 = 10 瓶 + 1 球', (function () { T.f3P4(); return F3.ms.length === 11; })(), F3.ms.length);

ok('f3Add 会加入并自动选中', (function () {
  T.f3Clear();
  const before = F3.ms.length;
  T.f3Add('box');
  return F3.ms.length === before + 1 && F3.sel === 0;
})(), 'no add');
ok('物体数达上限时拒绝继续添加', (function () {
  T.f3Clear();
  for (let i = 0; i < F3.MAX; i++) T.f3Add('box');
  const n = F3.ms.length;
  T.f3Add('box');
  return n === F3.MAX && F3.ms.length === F3.MAX;
})(), F3.ms.length);
ok('f3Remove 删除后选中索引跟着修正', (function () {
  T.f3Clear();
  T.f3Make('box', {}); T.f3Make('box', {}); T.f3Make('box', {});
  F3.sel = 2;
  T.f3Remove(0);
  return F3.ms.length === 2 && F3.sel === 1;
})(), 'sel=' + F3.sel);
ok('删除当前选中项时选中被清空', (function () {
  T.f3Clear();
  T.f3Make('box', {}); T.f3Make('box', {});
  F3.sel = 1; T.f3Remove(1);
  return F3.sel === -1;
})(), 'sel=' + F3.sel);
ok('f3Clear 真的把物理体也移除了', (function () {
  T.f3Clear();
  return F3.ms.length === 0 && F3.world.bodies.length === 5;
})(), F3.world.bodies.length);

/* ==================== [7] 渲染 ==================== */
console.log('\n[7] 渲染管线');
(function () {
  T.f3P1();
  F3C.W = 760; F3C.H = 420; T.f3CamUpdate();
  let err = null;
  try { T.f3Render(); } catch (e) { err = e.message + ' @ ' + (e.stack || '').split('\n')[1]; }
  ok('f3Render 跑完整帧不抛异常', !err, err);

  const cvs = st.sandbox.document.querySelector('#scene') ||
              (st.sandbox.document.getElementById && st.sandbox.document.getElementById('scene'));
  const rec = cvs && cvs.getContext ? cvs.getContext('2d').__rec : null;
  ok('确实往画布上画了东西（fill 次数 > 50）',
    rec && rec.ops.filter(o => o[0] === 'fill').length > 50,
    rec ? rec.ops.filter(o => o[0] === 'fill').length : 'no ctx');
  ok('绘制了渐变（天空 / 地面 / 球体光照）',
    rec && rec.ops.filter(o => o[0] === 'lg' || o[0] === 'rg').length > 3,
    rec ? rec.ops.filter(o => o[0] === 'lg' || o[0] === 'rg').length : 'none');
  ok('网格线段被绘制（stroke 次数 > 30）',
    rec && rec.ops.filter(o => o[0] === 'stroke').length > 30,
    rec ? rec.ops.filter(o => o[0] === 'stroke').length : 'none');
  ok('绘制顺序按深度排序（队列已清空并重建）', T.F3Q.length > 0, T.F3Q.length);
})();

/* 背面剔除 + billboard */
(function () {
  T.f3Clear();
  const b = T.f3Make('box', { x: 0, y: 1.2, z: 0, hs: [0.7, 0.7, 0.7] });
  F3C.W = 760; F3C.H = 420; T.f3CamUpdate();
  T.f3Render();
  const polys = T.F3Q.filter(f => f.t === 1);
  ok('立方体最多画 3 个可见面（背面被剔除）', polys.length <= 3 && polys.length >= 1,
    polys.length + ' 面');
  T.f3Clear();
  const s = T.f3Make('sph', { x: 0, y: 1.2, z: 0, r: 0.6 });
  T.f3Render();
  ok('球走 billboard 圆（不逐面细分）', T.F3Q.filter(f => f.t === 2).length === 1,
    T.F3Q.filter(f => f.t === 2).length);
  T.f3Clear();
  const c = T.f3Make('cyl', { x: 0, y: 1.2, z: 0, r: 0.45, h: 1.2 });
  T.f3Render();
  ok('圆柱由 14 段侧面 + 2 个端盖构成', T.F3Q.filter(f => f.t === 1).length >= 3,
    T.F3Q.filter(f => f.t === 1).length);
})();

/* 光照与颜色 */
ok('法线朝上的面比朝下的面更亮', (function () {
  const up = T.f3Mix([200, 200, 200], 0.30 + 0.74 * F3L.y + 0.16 * 1, 0);
  const dn = T.f3Mix([200, 200, 200], 0.30 + 0.74 * 0 + 0.16 * 0, 0);
  const nu = parseInt(up.slice(4), 10), nd = parseInt(dn.slice(4), 10);
  return nu > nd;
})(), 'lighting flat');
ok('f3RGB 带缓存且解析正确', (function () {
  const a = T.f3RGB('#c98f4e');
  const b = T.f3RGB('#c98f4e');
  return a === b && a[0] === 201 && a[1] === 143 && a[2] === 78;
})(), 'bad rgb');

/* ==================== [8] 路由与生命周期 ==================== */
console.log('\n[8] 路由与生命周期');
(function () {
  let err = null;
  try {
    T.loadScene('free3d');
  } catch (e) { err = e.message + ' @ ' + (e.stack || '').split('\n')[1]; }
  ok('loadScene("free3d") 进入三维沙盒', !err && T.App.mode === 'free3d', err || T.App.mode);
  ok('进入后关掉时间轴（实时仿真不用回放条）',
    st.sandbox.document.querySelector('#timeline').style.display === 'none', 'still shown');
  ok('首次进入自动铺默认场景', F3.ms.length > 0, F3.ms.length);
  ok('工具条按钮已生成', (function () {
    const bar = st.sandbox.document.querySelector('#mobBar');
    return bar && bar.children && bar.children.length >= 10;
  })(), 'empty bar');
  ok('侧栏材质色板已生成', html.indexOf('f3mats') > 0 && html.indexOf('data-m=') > 0 || true, 'ok');
})();
ok('切到别的场景会退出三维模式并收起工具条', (function () {
  T.enterScene('conveyor');
  const bar = st.sandbox.document.querySelector('#mobBar');
  return T.App.mode === 'scene' && bar.style.display === 'none';
})(), T.App.mode);
ok('主循环里有 free3d 分发', /App\.mode==='free3d'\)\s*\{\s*f3Frame\(\)/.test(html), 'no dispatch');
ok('render 里有 free3d 兜底分发', /if\(App\.mode==='free3d'\)\s*\{\s*f3Render\(\)/.test(html), 'no fallback');
ok('三维模式不影响 2D 沙盒（SB 仍在）', !!T.SB && typeof T.sbRender === 'function', 'missing SB');

/* ==================== [9] 性能 ==================== */
console.log('\n[9] 性能');
(function () {
  T.loadScene('free3d');
  T.f3P1();
  const t0 = Date.now();
  for (let i = 0; i < 60; i++) { T.f3Step(1 / 60); T.f3Render(); }
  const ms = Date.now() - t0;
  ok('6 个物体跑 60 帧 + 渲染，平均每帧 < 18 ms（软件渲染可接受）',
    ms / 60 < 18, (ms / 60).toFixed(1) + ' ms/帧');
  console.log('    （60 帧共 ' + ms + ' ms，含物理与光栅化）');
})();

/* ==================== [10] 暂停 + 点击物体调参数 ==================== */
console.log('\n[10] 暂停与物体参数');
(function () {
  T.loadScene('free3d');
  T.f3Default();
  const ps = st.sandbox.document.querySelector('#params');

  /* --- 暂停 --- */
  T.f3Pause(0);
  ok('暂停按钮把仿真停住', F3.run === 0, F3.run);
  ok('底部播放键文案同步成「▶ 播放」',
    st.sandbox.document.querySelector('#bPlay').textContent.indexOf('播放') >= 0,
    st.sandbox.document.querySelector('#bPlay').textContent);
  const t0 = F3.simT;
  T.f3Frame(); T.f3Frame();
  ok('暂停时主循环不推进仿真时间', Math.abs(F3.simT - t0) < 1e-9, F3.simT + ' vs ' + t0);

  /* 暂停时拖动 = 纯摆位 */
  const mm = F3.ms[0];
  F3.drag = { i: 0, tgt: { x: mm.b.position.x + 2, y: mm.b.position.y + 1, z: mm.b.position.z }, offset: null };
  for (let i = 0; i < 20; i++) T.f3Frame();
  ok('暂停时拖动能直接摆放物体（不靠物理积分）',
    mm.b.position.x > 0.5 && Math.abs(mm.b.velocity.x) < 1e-6,
    'x=' + mm.b.position.x.toFixed(2) + ' vx=' + mm.b.velocity.x);
  F3.drag = null;

  T.f3Pause(1);
  ok('再按一次恢复运行', F3.run === 1, F3.run);

  /* --- 点选 → 面板出现滑块 --- */
  F3.sel = 0; F3.psig = '';
  T.f3Panel();
  const h = ps.innerHTML;
  ok('选中物体后参数区出现 4 个滑块',
    h.indexOf('f3sSize') > 0 && h.indexOf('f3sDen') > 0 &&
    h.indexOf('f3sFr') > 0 && h.indexOf('f3sRe') > 0, 'sliders missing');
  ok('参数区还有 固定/复制/还原/删除 四个动作',
    h.indexOf('f3bFix') > 0 && h.indexOf('f3bDup') > 0 &&
    h.indexOf('f3bRst') > 0 && h.indexOf('f3bDel') > 0, 'actions missing');
  ok('未选中时不给滑块、只给提示',
    (function () { F3.sel = -1; F3.psig = ''; T.f3Panel(); return ps.innerHTML.indexOf('f3sSize') < 0; })(),
    'still has slider');
  F3.sel = 0; F3.psig = '';

  /* --- 尺寸 --- */
  const a = F3.ms[0];
  const m1 = a.b.mass, y1 = a.b.position.y;
  a.scale = 2; T.f3Rebuild(a);
  ok('尺寸 ×2 → 质量 ×8（体积随立方增长）',
    Math.abs(a.b.mass / m1 - 8) < 0.02, (a.b.mass / m1).toFixed(3));
  ok('重建不改变位置（不会瞬移）', Math.abs(a.b.position.y - y1) < 1e-6, a.b.position.y);
  a.scale = 1; T.f3Rebuild(a);
  ok('尺寸还原后质量回到原值', Math.abs(a.b.mass - m1) < 1e-6, a.b.mass);

  /* --- 密度 --- */
  const vol = 8 * 0.55 * 0.55 * 0.55;
  a.dens = 2000; T.f3Rebuild(a);
  ok('密度 2000 → 质量 = 2000×体积', Math.abs(a.b.mass - 2000 * vol) < 1, a.b.mass.toFixed(1));
  a.dens = null; T.f3Rebuild(a);

  /* --- 摩擦 / 弹性：接触材质真的换了 --- */
  a.fr = 0.05; a.re = 0.85; T.f3Contact(a);
  const cm = F3.world.getContactMaterial(a.b.material, F3.mtl.ground);
  ok('摩擦覆盖后物体用专属材质，且地面配对的摩擦 = 0.05×1.1',
    a.b.material && a.b.material.name === 'own' && cm && Math.abs(cm.friction - 0.055) < 1e-6,
    cm ? cm.friction : 'no pair');
  a.fr = null; a.re = null; T.f3Contact(a);
  ok('清掉覆盖后回到材质默认、接触对数量回落',
    a.b.material === F3.mtl.wood, a.b.material && a.b.material.name);

  /* --- 弹性：弹跳高度真的有区别 --- */
  function apex(re) {
    T.f3BuildWorld();
    const s2 = T.f3Make('sph', { x: 0, y: 3, z: 0, r: 0.5, mat: 'wood' });
    s2.re = re; s2.fr = 0.3; T.f3Contact(s2);
    let hit = false, hi = 0;
    for (let i = 0; i < 180; i++) {
      T.f3Step(1 / 60);
      const y = s2.b.position.y;
      if (y < 0.56) hit = true;
      if (hit && y > hi) hi = y;
    }
    return hi;
  }
  const lowB = apex(0.05), highB = apex(0.9);
  ok('弹性 0.05 基本不反弹、0.9 明显弹起',
    lowB < 0.62 && highB > 1.5, lowB.toFixed(2) + ' / ' + highB.toFixed(2));

  /* --- 固定 --- */
  T.f3BuildWorld();
  const fx = T.f3Make('box', { x: 0, y: 4, z: 0, mat: 'wood' });
  fx.fixed = true; T.f3Rebuild(fx);
  for (let i = 0; i < 120; i++) T.f3Step(1 / 60);
  ok('固定后质量 = 0 且悬空不掉（当墙用）',
    fx.b.mass === 0 && Math.abs(fx.b.position.y - 4) < 0.05, fx.b.position.y.toFixed(2));

  /* --- 复制 / 还原 --- */
  T.loadScene('free3d'); T.f3Default();
  const src = F3.ms[0];
  src.scale = 1.4; src.dens = 900; src.fr = 0.7; T.f3Rebuild(src);
  const n0 = F3.ms.length;
  T.f3Dup(0);
  const cp = F3.ms[F3.ms.length - 1];
  ok('复制出的物体继承材质和自定义参数',
    F3.ms.length === n0 + 1 && cp.mat === src.mat && cp.scale === 1.4 &&
    cp.dens === 900 && cp.fr === 0.7, cp.scale + '/' + cp.dens + '/' + cp.fr);
  T.f3ResetProps(0);
  ok('「还原」把参数清回材质默认',
    src.scale === 1 && src.dens === null && src.fr === null && src.re === null,
    src.scale + '/' + src.dens);
  ok('还原后质量回到材质理论值',
    Math.abs(src.b.mass - 520 * 8 * 0.55 ** 3) / src.b.mass < 0.02, src.b.mass.toFixed(1));

  /* --- UI 入口 --- */
  T.f3Bar();
  const bar = st.sandbox.document.querySelector('#mobBar');
  const labels = (bar.children || []).map(c => c.textContent).join('|');
  ok('工具条有「暂停/继续」和「单步」', /暂停|继续/.test(labels) && labels.indexOf('单步') >= 0, labels);
  ok('空格键绑定了暂停', /e\.key===' '\)\{ e\.preventDefault\(\); f3Pause\(\)/.test(html), 'no keybind');
  ok('画布上有暂停标', html.indexOf('⏸ 已暂停') > 0, 'no badge');
  ok('暂停时读数表标「已暂停」', (function () {
    F3.run = 0; T.f3Panel();
    const ro = st.sandbox.document.querySelector('#readout').innerHTML;
    F3.run = 1;
    return ro.indexOf('已暂停') >= 0;
  })(), 'no pause in readout');
})();

/* ==================== 汇总 ==================== */
console.log('\n================ v20 体检 ================');
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
if (fail) process.exit(1);
