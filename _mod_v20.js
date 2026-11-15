/* ==================================================================
   v20 · 3D 自由沙盒（free3d）
   ------------------------------------------------------------------
   一个真正可交互的三维物理沙盒：往场景里扔方块、球、圆柱、长板，
   搭塔、摆多米诺、做斜坡弹珠台，然后推它、炸它、让它塌。

   · 物理后端：cannon-es v0.20.0（https://github.com/pmndrs/cannon-es, MIT）
     内联在 CANNON 全局里，完全离线可用；球/盒/圆柱都是凸体，
     序列冲量求解 + 摩擦锥 + 休眠，堆叠稳定不抖。
   · 渲染：自研 Canvas 2D 软件三维管线（不依赖 WebGL，微信小程序
     的 Canvas 2D 也能跑）。透视投影 → 近平面裁剪 → 画家算法 →
     Lambert 漫反射 + Blinn 高光 + 地面接触阴影 + 体积雾。
   · 交互：单指转视角、双指缩放、按住物体拖动、点选查看实时数据、
     爆炸冲击波、六种材质（木/钢/冰/橡胶/玻璃/泡沫）。
   ================================================================== */

/* ================================================================
   0. 常量 · 工具
   ================================================================ */

/* 材质表：d=密度 kg/m³，r=摩擦，e=恢复系数，col=基色 */
var F3MAT = {
  wood:   { n:'木',   d:520,  r:0.58, e:0.16, col:'#c98f4e', snd:'wood'  },
  steel:  { n:'钢',   d:7600, r:0.40, e:0.09, col:'#8fa3b8', snd:'metal' },
  ice:    { n:'冰',   d:920,  r:0.045,e:0.05, col:'#8fd8ef', snd:'ice'   },
  rubber: { n:'橡胶', d:1150, r:0.90, e:0.74, col:'#46536a', snd:'soft'  },
  glass:  { n:'玻璃', d:2400, r:0.26, e:0.06, col:'#a9d9e8', snd:'glass' },
  foam:   { n:'泡沫', d:55,   r:0.68, e:0.30, col:'#e3d3a8', snd:'soft'  }
};
var F3MATK = ['wood','steel','ice','rubber','glass','foam'];

/* 向量/矩阵小工具 */
function f3Len(x,y,z){ return Math.sqrt(x*x+y*y+z*z); }
function f3Norm(v){ var L=f3Len(v.x,v.y,v.z)||1; return {x:v.x/L,y:v.y/L,z:v.z/L}; }
function f3Dot(a,b){ return a.x*b.x+a.y*b.y+a.z*b.z; }

/* 四元数 → 3×3 旋转矩阵（行主序 m[0..8]） */
function f3Mat(q){
  var x=q.x, y=q.y, z=q.z, w=q.w;
  var xx=x*x, yy=y*y, zz=z*z, xy=x*y, xz=x*z, yz=y*z, wx=w*x, wy=w*y, wz=w*z;
  return [
    1-2*(yy+zz), 2*(xy-wz),   2*(xz+wy),
    2*(xy+wz),   1-2*(xx+zz), 2*(yz-wx),
    2*(xz-wy),   2*(yz+wx),   1-2*(xx+yy)
  ];
}
/* 矩阵乘向量 */
function f3Mv(m,p,o){
  o.x = m[0]*p.x + m[1]*p.y + m[2]*p.z;
  o.y = m[3]*p.x + m[4]*p.y + m[5]*p.z;
  o.z = m[6]*p.x + m[7]*p.y + m[8]*p.z;
  return o;
}

/* 颜色：#rrggbb → [r,g,b]，带缓存 */
var F3CC = {};
function f3RGB(h){
  if(F3CC[h]) return F3CC[h];
  var v = [parseInt(h.substr(1,2),16), parseInt(h.substr(3,2),16), parseInt(h.substr(5,2),16)];
  F3CC[h] = v; return v;
}
function f3Clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function f3Mix(rgb, k, add){
  var a = add||0;
  var r = f3Clamp(Math.round(rgb[0]*k + 255*a),0,255);
  var g = f3Clamp(Math.round(rgb[1]*k + 255*a),0,255);
  var b = f3Clamp(Math.round(rgb[2]*k + 255*a),0,255);
  return 'rgb('+r+','+g+','+b+')';
}

/* ================================================================
   1. 状态
   ================================================================ */
var F3 = {
  ready: 0, booted: 0,
  world: null, planet: null,
  ms: [],              // 网格对象 {b, kind, hs, r, h, mat, col, rgb, seed}
  sel: -1,
  run: 1, speed: 1, zeroG: 0,
  tool: 'box', mat: 'wood',
  grid: 1, shadow: 1, haze: 1,
  drag: null, orbit: null, pinch: null,
  fps: 60, lastT: 0, acc: 0, simT: 0,
  toast: '', toastT: 0,
  boomFx: [],          // 冲击波圈
  hitFlash: 0,
  saved: 0,
  psig: '',            // 侧栏面板签名（值没变就不重建 DOM，避免滑块被拽回）
  mx: 0, my: 0,        // 最近一次指针位置（放物体时用）
  K: 'fz_f3',
  MAX: 72
};

/* 相机（球坐标 + 目标点） */
var F3C = {
  yaw: -0.82, pitch: 0.40, dist: 16.5,
  tgt: { x: 0, y: 1.15, z: 0 },
  eye: { x: 0, y: 0, z: 0 },
  rx: 1, ry: 0, rz: 0, ux: 0, uy: 1, uz: 0, bx: 0, by: 0, bz: 1,
  W: 0, H: 0, fpx: 400,
  tYaw: null, tPitch: null, tDist: null,   // 平滑目标
  shake: 0
};

/* 世界空间主光（左上前方） */
var F3L = { x: -0.44, y: 0.79, z: 0.43 };

/* ================================================================
   2. 相机
   ================================================================ */
function f3CamUpdate(){
  if(F3C.tYaw!==null){
    F3C.yaw   += (F3C.tYaw  -F3C.yaw  )*0.16;
    F3C.pitch += (F3C.tPitch-F3C.pitch)*0.16;
    F3C.dist  += (F3C.tDist -F3C.dist )*0.16;
    if(Math.abs(F3C.tYaw-F3C.yaw)<1e-3 && Math.abs(F3C.tPitch-F3C.pitch)<1e-3 &&
       Math.abs(F3C.tDist-F3C.dist)<1e-3){ F3C.tYaw=null; }
  }
  var cy=Math.cos(F3C.yaw), sy=Math.sin(F3C.yaw);
  var cp=Math.cos(F3C.pitch), sp=Math.sin(F3C.pitch);
  F3C.rx=cy;      F3C.ry=0;   F3C.rz=-sy;
  F3C.ux=-sy*sp;  F3C.uy=cp;  F3C.uz=-cy*sp;
  F3C.bx=cp*sy;   F3C.by=sp;  F3C.bz=cp*cy;
  F3C.eye.x = F3C.tgt.x + F3C.bx*F3C.dist;
  F3C.eye.y = F3C.tgt.y + F3C.by*F3C.dist;
  F3C.eye.z = F3C.tgt.z + F3C.bz*F3C.dist;
  var W=F3C.W||760, H=F3C.H||420;
  /* 焦距：竖屏按高度、横屏按宽度取大者，保证两种姿态视野一致 */
  F3C.fpx = 0.92*Math.max(H, W*0.58);
}

/* 世界 → 相机空间（z = 沿视线的前方距离） */
function f3View(wx,wy,wz){
  var dx=wx-F3C.tgt.x, dy=wy-F3C.tgt.y, dz=wz-F3C.tgt.z;
  return {
    x: dx*F3C.rx + dy*F3C.ry + dz*F3C.rz,
    y: dx*F3C.ux + dy*F3C.uy + dz*F3C.uz,
    z: F3C.dist - (dx*F3C.bx + dy*F3C.by + dz*F3C.bz)
  };
}
/* 相机空间 → 屏幕 */
function f3Scr(v){
  if(!(v.z > 0.12)) return null;
  var k = F3C.fpx/v.z;
  return { X: F3C.W/2 + v.x*k, Y: F3C.H/2 - v.y*k, k: k, z: v.z };
}
/* 世界 → 屏幕 */
function f3Sc(wx,wy,wz){ return f3Scr(f3View(wx,wy,wz)); }

/* 近平面裁剪（相机空间多边形） */
function f3Clip(pts, near){
  var out=[], n=pts.length;
  for(var i=0;i<n;i++){
    var a=pts[i], b=pts[(i+1)%n];
    var ia=a.z>=near, ib=b.z>=near;
    if(ia) out.push(a);
    if(ia!==ib){
      var t=(near-a.z)/(b.z-a.z);
      out.push({ x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t, z:near });
    }
  }
  return out;
}

/* 屏幕坐标 → 世界射线 */
function f3Ray(sx,sy){
  var vx=(sx-F3C.W/2)/F3C.fpx, vy=-(sy-F3C.H/2)/F3C.fpx;
  var d = {
    x: F3C.rx*vx + F3C.ux*vy - F3C.bx,
    y: F3C.ry*vx + F3C.uy*vy - F3C.by,
    z: F3C.rz*vx + F3C.uz*vy - F3C.bz
  };
  return { o:{x:F3C.eye.x,y:F3C.eye.y,z:F3C.eye.z}, d: f3Norm(d) };
}

/* ================================================================
   3. 物理世界
   ================================================================ */
function f3BuildWorld(){
  if(typeof CANNON==='undefined' || !CANNON.World){
    throw new Error('CANNON 未加载');
  }
  var W = new CANNON.World({ gravity: new CANNON.Vec3(0,-9.82,0) });
  W.broadphase = new CANNON.SAPBroadphase(W);
  W.allowSleep = true;
  W.solver.iterations = 12;
  W.solver.tolerance = 0.0015;
  W.defaultContactMaterial.friction = 0.4;
  W.defaultContactMaterial.restitution = 0.12;

  /* 每种材质一个 CANNON.Material + 与地面、彼此的接触参数 */
  F3.mtl = {};
  var gmat = new CANNON.Material('ground');
  F3.mtl.ground = gmat;
  F3MATK.forEach(function(k){
    var m = new CANNON.Material(k);
    F3.mtl[k] = m;
    W.addContactMaterial(new CANNON.ContactMaterial(m, m, {
      friction: F3MAT[k].r, restitution: F3MAT[k].e, contactEquationStiffness: 1e8
    }));
    W.addContactMaterial(new CANNON.ContactMaterial(m, gmat, {
      friction: F3MAT[k].r*1.1, restitution: F3MAT[k].e*0.8
    }));
  });

  /* 地面：无限平面 */
  var ground = new CANNON.Body({ mass:0, shape: new CANNON.Plane(), material: gmat });
  ground.quaternion.setFromEuler(-Math.PI/2, 0, 0);
  W.addBody(ground);
  F3.planet = ground;

  /* 四面隐形边界墙：让东西不会跑丢（R=13 的方框）。Plane 默认法线 +z，
     绕 Y 转 ry 后法线水平，调整朝向使其一律指向方框内侧。 */
  var R=13;
  [{x:0,z:-R,ry:0},{x:0,z:R,ry:Math.PI},
   {x:R,z:0,ry:-Math.PI/2},{x:-R,z:0,ry:Math.PI/2}].forEach(function(w){
    var wall = new CANNON.Body({ mass:0, shape: new CANNON.Plane(), material: gmat });
    wall.quaternion.setFromEuler(0, w.ry, 0);
    wall.position.set(w.x, 0, w.z);
    W.addBody(wall);
  });

  F3.world = W;
  F3.ms = [];
  F3.sel = -1;
}

/* 造一个刚体（不加入渲染，只进物理）
   kind: box | sph | cyl | plank
   opts: {x,y,z, r?, hs?, mat?, fixed?, qy?} */
function f3Make(kind, opts){
  opts = opts||{};
  var mat = opts.mat || F3.mat;
  var M = F3MAT[mat] || F3MAT.wood;
  var hs, r, hgt, shape, mass;

  if(kind==='sph'){
    r = opts.r!==undefined?opts.r:0.55;
    shape = new CANNON.Sphere(r);
    mass = M.d * (4/3)*Math.PI*r*r*r;
  } else if(kind==='cyl'){
    r = opts.r!==undefined?opts.r:0.44;
    hgt = opts.h!==undefined?opts.h:1.15;
    shape = new CANNON.Cylinder(r,r,hgt,14);
    mass = M.d * Math.PI*r*r*hgt;
  } else if(kind==='plank'){
    hs = opts.hs || [1.55, 0.13, 0.5];
    shape = new CANNON.Box(new CANNON.Vec3(hs[0],hs[1],hs[2]));
    mass = M.d * 8*hs[0]*hs[1]*hs[2];
  } else {
    hs = opts.hs || [0.55,0.55,0.55];
    shape = new CANNON.Box(new CANNON.Vec3(hs[0],hs[1],hs[2]));
    mass = M.d * 8*hs[0]*hs[1]*hs[2];
  }
  mass = Math.max(0.25, mass);

  var body = new CANNON.Body({
    mass: opts.fixed ? 0 : mass,
    shape: shape,
    material: F3.mtl[mat],
    position: new CANNON.Vec3(opts.x||0, opts.y||2, opts.z||0),
    linearDamping: 0.018, angularDamping: 0.06,
    sleepSpeedLimit: 0.14, sleepTimeLimit: 0.55
  });
  if(opts.qy) body.quaternion.setFromEuler(0, opts.qy, 0);
  if(opts.qx) body.quaternion.setFromEuler(opts.qx, 0, 0);
  body.allowSleep = true;
  F3.world.addBody(body);

  var ms = { b: body, kind:kind, hs:hs, r:r, h:hgt, mat:mat,
             col:M.col, rgb:f3RGB(M.col), fixed:!!opts.fixed,
             note:opts.note||'',
             /* 基准尺寸（缩放基准）+ 可编辑参数（null = 跟随材质默认） */
             hs0: hs? hs.slice() : null, r0: r, h0: hgt,
             scale: 1, dens: null, fr: null, re: null };
  F3.ms.push(ms);
  return ms;
}

/* 用当前参数重建刚体（改尺寸 / 密度 / 材质 / 固定 都走这里）
   保留位置、姿态、速度，避免重建瞬间“瞬移”或速度清零 */
function f3Rebuild(ms){
  if(!ms) return null;
  var W=F3.world, old=ms.b;
  if(!W || !old) return null;
  var p=old.position, q=old.quaternion, lv=old.velocity, av=old.angularVelocity;
  var px=p.x, py=p.y, pz=p.z;
  var qx=q.x, qy=q.y, qz=q.z, qw=q.w;
  var vx=lv.x, vy=lv.y, vz=lv.z;
  var wx=av.x, wy=av.y, wz=av.z;
  W.removeBody(old);

  var sc   = ms.scale||1;
  var M    = F3MAT[ms.mat]||F3MAT.wood;
  var dens = (ms.dens===null||ms.dens===undefined)? M.d : ms.dens;
  var shape, hs=null, r=null, hgt=null, vol;

  if(ms.kind==='sph'){
    r = ms.r0*sc;
    shape = new CANNON.Sphere(r);
    vol = (4/3)*Math.PI*r*r*r;
  } else if(ms.kind==='cyl'){
    r = ms.r0*sc; hgt = ms.h0*sc;
    shape = new CANNON.Cylinder(r,r,hgt,14);
    vol = Math.PI*r*r*hgt;
  } else {
    hs = [ms.hs0[0]*sc, ms.hs0[1]*sc, ms.hs0[2]*sc];
    shape = new CANNON.Box(new CANNON.Vec3(hs[0],hs[1],hs[2]));
    vol = 8*hs[0]*hs[1]*hs[2];
  }
  var mass = Math.max(0.02, dens*vol);

  var body = new CANNON.Body({
    mass: ms.fixed? 0 : mass,
    shape: shape,
    material: F3.mtl[ms.mat],
    position: new CANNON.Vec3(px,py,pz),
    linearDamping: 0.018, angularDamping: 0.06,
    sleepSpeedLimit: 0.14, sleepTimeLimit: 0.55
  });
  body.quaternion.set(qx,qy,qz,qw);
  body.velocity.set(vx,vy,vz);
  body.angularVelocity.set(wx,wy,wz);
  body.allowSleep = true;
  W.addBody(body);

  ms.b = body; ms.hs = hs; ms.r = r; ms.h = hgt; ms.mass = mass;
  f3Contact(ms);
  return ms;
}

/* 单物体摩擦 / 弹性覆盖：给它一个专属材质，并按需生成接触材质对。
   注意 cannon 的 ContactMaterial 按「材质引用」配对，所以必须复用同一实例 */
function f3Contact(ms){
  var W=F3.world;
  if(!W || !ms) return;
  if(ms._cms){
    ms._cms.forEach(function(cm){ try{ W.removeContactMaterial(cm); }catch(e){} });
    ms._cms=null;
  }
  var M=F3MAT[ms.mat]||F3MAT.wood;
  if(ms.fr===null && ms.re===null){
    ms.b.material = F3.mtl[ms.mat];
    return;
  }
  var own = ms._own || (ms._own = new CANNON.Material('own'));
  var fr = (ms.fr===null)? M.r : ms.fr;
  var re = (ms.re===null)? M.e : ms.re;
  ms.b.material = own;
  var list=[];
  list.push(new CANNON.ContactMaterial(own, F3.mtl.ground, {
    friction: fr*1.1, restitution: re*0.8, contactEquationStiffness:1e8
  }));
  F3MATK.forEach(function(k){
    list.push(new CANNON.ContactMaterial(own, F3.mtl[k], {
      friction: fr, restitution: re, contactEquationStiffness:1e8
    }));
  });
  list.forEach(function(cm){ W.addContactMaterial(cm); });
  ms._cms = list;
}

/* 删除 */
function f3Remove(i){
  if(i<0||i>=F3.ms.length) return;
  var ms = F3.ms[i];
  F3.world.removeBody(ms.b);
  if(ms._cms){ ms._cms.forEach(function(cm){ try{ F3.world.removeContactMaterial(cm); }catch(e){} }); ms._cms=null; }
  F3.ms.splice(i,1);
  if(F3.sel===i) F3.sel=-1;
  else if(F3.sel>i) F3.sel--;
  F3.psig='';          /* 让侧栏下一帧重建 */
}

/* ================================================================
   4. 渲染管线
   ================================================================ */
var F3Q = [];                       // 本帧待绘面队列
var F3V = { x:0,y:0,z:0 };          // 顶点复用的临时对象

function f3PushPoly(vpts, color, stroke, alpha, tag){
  if(vpts.length<3) return;
  var dp=0, i;
  for(i=0;i<vpts.length;i++) dp+=vpts[i].z;
  F3Q.push({ t:1, p:vpts, c:color, s:stroke, a:alpha===undefined?1:alpha, d:dp/vpts.length, g:tag });
}

/* 画一帧 */
function f3Render(){
  var cv = $('#scene');
  if(!cv) return;
  var dpr = Math.min(window.devicePixelRatio||1, 2);
  var W = cv.clientWidth||760;
  var H = (W<560) ? Math.round(Math.min(Math.max(W*0.96,300),500))
                  : Math.round(Math.min(Math.max(W*0.60,340),580));
  cv.style.height = H+'px';
  if(cv.height!==Math.round(H*dpr) || cv.width!==Math.round(W*dpr)){
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
  }
  var g = cv.getContext('2d');
  g.setTransform(dpr,0,0,dpr,0,0);
  F3C.W=W; F3C.H=H;
  f3CamUpdate();

  var dark = (typeof V19!=='undefined' && V19.grade);
  /* ---- 天空背景 ---- */
  var bg=g.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0d1730'); bg.addColorStop(0.52,'#132444'); bg.addColorStop(1,'#0a1120');
  g.fillStyle=bg; g.fillRect(0,0,W,H);
  /* 远处地平线光晕 */
  var hz=g.createRadialGradient(W/2,H*0.62,10,W/2,H*0.62,Math.max(W,H)*0.72);
  hz.addColorStop(0,'rgba(56,189,248,.10)'); hz.addColorStop(1,'rgba(56,189,248,0)');
  g.fillStyle=hz; g.fillRect(0,0,W,H);

  /* 抖动（爆炸）只作用于世界层 */
  g.save();
  if(F3C.shake>0.004){
    g.translate((Math.random()-0.5)*14*F3C.shake, (Math.random()-0.5)*14*F3C.shake);
    F3C.shake*=0.86;
  } else F3C.shake=0;

  F3Q.length=0;

  /* ---- 地面 ---- */
  f3DrawGround(g);

  /* ---- 阴影 ---- */
  if(F3.shadow) f3DrawShadows(g);

  /* ---- 物体面片收集 ---- */
  for(var i=0;i<F3.ms.length;i++) f3Collect(F3.ms[i], i);

  /* ---- 排序 + 绘制 ---- */
  F3Q.sort(function(a,b){ return b.d-a.d; });
  for(i=0;i<F3Q.length;i++){
    var f=F3Q[i];
    if(f.t===1) f3PaintPoly(g,f);
    else if(f.t===2) f3PaintSphere(g,f);
  }

  /* ---- 选中高亮 ---- */
  if(F3.sel>=0 && F3.sel<F3.ms.length) f3DrawSelRing(g, F3.ms[F3.sel]);

  /* ---- 冲击波 ---- */
  f3DrawBoom(g);

  g.restore();

  /* ---- 体积雾 / 暗角 ---- */
  if(F3.haze){
    var vg=g.createRadialGradient(W/2,H*0.48,Math.min(W,H)*0.32,W/2,H*0.48,Math.max(W,H)*0.78);
    vg.addColorStop(0,'rgba(4,8,18,0)'); vg.addColorStop(1,'rgba(4,8,18,.62)');
    g.fillStyle=vg; g.fillRect(0,0,W,H);
  }

  f3HUD(g,W,H);
}

/* ---- 地面：铺底 + 网格 ---- */
function f3DrawGround(g){
  var R=42, near=0.14;
  var quad=[
    f3View(-R,0,-R), f3View(R,0,-R), f3View(R,0,R), f3View(-R,0,R)
  ];
  var cp=f3Clip(quad,near);
  if(cp.length>=3){
    g.beginPath();
    var ok=false;
    for(var i=0;i<cp.length;i++){
      var s=f3Scr(cp[i]); if(!s) continue;
      if(!ok){ g.moveTo(s.X,s.Y); ok=true; } else g.lineTo(s.X,s.Y);
    }
    g.closePath();
    var gr=g.createLinearGradient(0,F3C.H*0.30,0,F3C.H);
    gr.addColorStop(0,'#16233c'); gr.addColorStop(0.55,'#111c31'); gr.addColorStop(1,'#0c1526');
    g.fillStyle=gr; g.fill();
  }
  if(!F3.grid) return;

  /* 网格线：每 1 单位细线，每 5 单位粗线 */
  var L=20;
  for(var k=-L;k<=L;k++){
    var major=(k%5===0);
    g.strokeStyle = major? 'rgba(96,165,250,.30)' : 'rgba(96,165,250,.10)';
    g.lineWidth = major? 1.2 : 0.7;
    /* 沿 X 方向的线 */
    f3Seg(g, -L,0,k, L,0,k, 0.14);
    /* 沿 Z 方向的线 */
    f3Seg(g, k,0,-L, k,0,L, 0.14);
  }
  /* 中轴高亮 */
  g.strokeStyle='rgba(56,189,248,.42)'; g.lineWidth=1.6;
  f3Seg(g,-L,0,0, L,0,0, 0.14);
  f3Seg(g,0,0,-L, 0,0,L, 0.14);
}

/* 3D 线段（带近裁剪） */
function f3Seg(g,x1,y1,z1,x2,y2,z2,near){
  var a=f3View(x1,y1,z1), b=f3View(x2,y2,z2);
  if(a.z<near && b.z<near) return;
  if(a.z<near){
    var t=(near-a.z)/(b.z-a.z);
    a={x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t, z:near};
  } else if(b.z<near){
    var t2=(near-b.z)/(a.z-b.z);
    b={x:b.x+(a.x-b.x)*t2, y:b.y+(a.y-b.y)*t2, z:near};
  }
  var sa=f3Scr(a), sb=f3Scr(b);
  if(!sa||!sb) return;
  g.beginPath(); g.moveTo(sa.X,sa.Y); g.lineTo(sb.X,sb.Y); g.stroke();
}

/* ---- 接触阴影 ---- */
function f3DrawShadows(g){
  for(var i=0;i<F3.ms.length;i++){
    var m=F3.ms[i], p=m.b.position;
    var hgt = Math.max(0, p.y);
    var rad = (m.kind==='sph'? m.r : (m.hs?Math.max(m.hs[0],m.hs[2])*1.22:m.r));
    var fade = f3Clamp(1 - hgt/6.5, 0, 1);
    if(fade<=0.02) continue;
    /* 影子稍微沿光反方向拉长 */
    var ox = -F3L.x/Math.max(F3L.y,0.2)*hgt*0.35;
    var oz = -F3L.z/Math.max(F3L.y,0.2)*hgt*0.35;
    var c = f3Sc(p.x+ox, 0.012, p.z+oz);
    if(!c) continue;
    var rx = rad*c.k, ry = rad*c.k*0.52;
    if(rx<0.6) continue;
    g.save();
    g.globalAlpha = 0.42*fade;
    var sg=g.createRadialGradient(c.X,c.Y,0,c.X,c.Y,Math.max(rx,ry));
    sg.addColorStop(0,'rgba(2,6,14,.85)');
    sg.addColorStop(0.55,'rgba(2,6,14,.42)');
    sg.addColorStop(1,'rgba(2,6,14,0)');
    g.fillStyle=sg;
    g.beginPath(); g.ellipse(c.X,c.Y,rx*1.25,ry*1.25,0,0,6.2832); g.fill();
    g.restore();
  }
}

/* ---- 单个物体的面片收集 ---- */
function f3Collect(m, idx){
  var b=m.b, p=b.position, q=b.quaternion;
  var mul = f3Mat(q);
  var i, j, vv;

  if(m.kind==='sph'){
    /* 球：屏幕空间圆 + 径向渐变（billboard，单独绘制） */
    var c=f3Sc(p.x,p.y,p.z);
    if(!c) return;
    var R=m.r*c.k;
    if(R<0.4) return;
    var lx = F3L.x*F3C.rx + F3L.y*F3C.ry + F3L.z*F3C.rz;
    var ly = -(F3L.x*F3C.ux + F3L.y*F3C.uy + F3L.z*F3C.uz);
    F3Q.push({ t:2, c:{X:c.X,Y:c.Y}, R:R, d:c.z, rgb:m.rgb, lx:lx, ly:ly,
               sel:(idx===F3.sel) });
    return;
  }

  /* 盒/圆柱：逐面 */
  var verts=[], faces=[];
  if(m.kind==='cyl'){
    var N=14, rr=m.r, hh=m.h*0.5;
    for(i=0;i<N;i++){
      var a=i*6.2832/N, ca=Math.cos(a)*rr, sa2=Math.sin(a)*rr;
      verts.push({x:ca,y:-hh,z:sa2});
      verts.push({x:ca,y: hh,z:sa2});
    }
    for(i=0;i<N;i++){
      var i0=i*2, i1=i*2+1, i2=((i+1)%N)*2+1, i3=((i+1)%N)*2;
      faces.push({ v:[i0,i1,i2,i3], n:f3CylN(i,N) });
    }
    var bot=[], top=[];
    for(i=0;i<N;i++){ bot.push(i*2); top.push(i*2+1); }
    faces.push({ v:bot.slice().reverse(), n:{x:0,y:-1,z:0} });
    faces.push({ v:top, n:{x:0,y:1,z:0} });
  } else {
    var hx=m.hs[0], hy=m.hs[1], hz=m.hs[2];
    verts=[
      {x:-hx,y:-hy,z:-hz},{x:hx,y:-hy,z:-hz},{x:hx,y:-hy,z:hz},{x:-hx,y:-hy,z:hz},
      {x:-hx,y: hy,z:-hz},{x:hx,y: hy,z:-hz},{x:hx,y: hy,z:hz},{x:-hx,y: hy,z:hz}
    ];
    faces=[
      {v:[4,5,6,7], n:{x:0,y:1,z:0}},   // 顶
      {v:[3,2,1,0], n:{x:0,y:-1,z:0}},  // 底
      {v:[0,1,5,4], n:{x:0,y:0,z:-1}},  // 前
      {v:[2,3,7,6], n:{x:0,y:0,z:1}},   // 后
      {v:[3,0,4,7], n:{x:-1,y:0,z:0}},  // 左
      {v:[1,2,6,5], n:{x:1,y:0,z:0}}    // 右
    ];
  }

  /* 顶点 → 世界 */
  var wp=[];
  for(i=0;i<verts.length;i++){
    var t=f3Mv(mul, verts[i], {x:0,y:0,z:0});
    wp.push({ x:t.x+p.x, y:t.y+p.y, z:t.z+p.z });
  }

  var base=m.rgb;
  for(j=0;j<faces.length;j++){
    var f=faces[j];
    /* 世界法线 */
    var nw=f3Mv(mul, f.n, {x:0,y:0,z:0});
    /* 面中心 */
    var cx=0, cy=0, cz=0;
    for(i=0;i<f.v.length;i++){ var P=wp[f.v[i]]; cx+=P.x; cy+=P.y; cz+=P.z; }
    cx/=f.v.length; cy/=f.v.length; cz/=f.v.length;
    /* 背面剔除：法线背离视线则跳过 */
    var vx=F3C.eye.x-cx, vy=F3C.eye.y-cy, vz=F3C.eye.z-cz;
    if(nw.x*vx + nw.y*vy + nw.z*vz <= 0) continue;

    /* 光照：Lambert + 半球环境光 */
    var diff = Math.max(0, nw.x*F3L.x + nw.y*F3L.y + nw.z*F3L.z);
    var sky = 0.5 + 0.5*nw.y;                       // 朝上更亮（天光）
    var k = 0.30 + 0.74*diff + 0.16*sky;
    /* Blinn 高光 */
    var vl=f3Len(vx,vy,vz)||1;
    var hx2=F3L.x+vx/vl, hy2=F3L.y+vy/vl, hz2=F3L.z+vz/vl;
    var hl=f3Len(hx2,hy2,hz2)||1;
    var spec = Math.max(0, (nw.x*hx2+nw.y*hy2+nw.z*hz2)/hl);
    spec = Math.pow(spec, 26) * (m.mat==='steel'?0.55:(m.mat==='glass'?0.65:0.18));

    var col = f3Mix(base, k, spec*0.9);
    /* 玻璃半透明 */
    var alpha = (m.mat==='glass')?0.72:1;

    /* 转相机空间并裁剪 */
    var vs=[];
    for(i=0;i<f.v.length;i++){
      var W2=wp[f.v[i]];
      vs.push(f3View(W2.x,W2.y,W2.z));
    }
    var cl=f3Clip(vs, 0.16);
    if(cl.length<3) continue;

    /* 边缘线：只在角度够"竖"时描边，避免满屏细线 */
    var edge = m.mat==='steel' ? 'rgba(226,238,255,.30)' : 'rgba(12,18,30,.34)';
    f3PushPoly(cl, col, edge, alpha, idx);
  }
}

/* 圆柱侧面法线（第 i 段） */
function f3CylN(i,N){
  var a=(i+0.5)*6.2832/N;
  return { x:Math.cos(a), y:0, z:Math.sin(a) };
}

/* ---- 绘制多边形面 ---- */
function f3PaintPoly(g,f){
  var pts=f.p, s;
  g.beginPath();
  var ok=false;
  for(var i=0;i<pts.length;i++){
    s=f3Scr(pts[i]);
    if(!s) return;
    if(!ok){ g.moveTo(s.X,s.Y); ok=true; } else g.lineTo(s.X,s.Y);
  }
  g.closePath();
  if(f.a<1){ g.globalAlpha=f.a; }
  g.fillStyle=f.c;
  g.fill();
  if(f.s){
    g.strokeStyle=f.s; g.lineWidth=1;
    g.stroke();
  }
  if(f.a<1) g.globalAlpha=1;
}

/* ---- 绘制球（billboard） ---- */
function f3PaintSphere(g,f){
  var cx=f.c.X, cy=f.c.Y, R=f.R;
  if(R<0.4) return;
  var lx=f.lx, ly=f.ly;
  var l=f3Len(lx,ly,0)||1;
  lx/=l; ly/=l;
  var gx=cx+R*0.34*lx, gy=cy+R*0.34*ly;
  var gr=g.createRadialGradient(gx,gy,R*0.06,cx,cy,R*1.06);
  gr.addColorStop(0, f3Mix(f.rgb, 1.22, 0.30));
  gr.addColorStop(0.34, f3Mix(f.rgb, 1.02, 0.05));
  gr.addColorStop(0.72, f3Mix(f.rgb, 0.72, 0));
  gr.addColorStop(1, f3Mix(f.rgb, 0.40, 0));
  g.beginPath(); g.arc(cx,cy,R,0,6.2832);
  g.fillStyle=gr; g.fill();
  /* 高光 */
  var sg=g.createRadialGradient(gx,gy,0,gx,gy,R*0.42);
  sg.addColorStop(0,'rgba(255,255,255,.62)');
  sg.addColorStop(0.5,'rgba(255,255,255,.12)');
  sg.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=sg; g.beginPath(); g.arc(gx,gy,R*0.42,0,6.2832); g.fill();
  /* 轮廓 */
  g.strokeStyle='rgba(8,14,26,.35)'; g.lineWidth=1;
  g.beginPath(); g.arc(cx,cy,R,0,6.2832); g.stroke();
}

/* ---- 选中环 ---- */
function f3DrawSelRing(g,m){
  var p=m.b.position;
  var c=f3Sc(p.x, p.y, p.z);
  if(!c) return;
  var R = (m.kind==='sph'? m.r : (m.hs?Math.max(m.hs[0],m.hs[1],m.hs[2])*1.5:m.r));
  var rr = R*c.k;
  g.save();
  g.strokeStyle='rgba(56,189,248,.92)'; g.lineWidth=2;
  g.setLineDash([6,5]);
  g.lineDashOffset = -(Date.now()/40)%11;
  g.beginPath(); g.arc(c.X,c.Y,rr+7,0,6.2832); g.stroke();
  g.setLineDash([]);
  g.restore();
}

/* ---- 爆炸冲击波 ---- */
function f3Boom(x,y,z,power){
  F3.boomFx.push({ x:x, y:y, z:z, t:0, p:power||1 });
  F3C.shake = Math.min(1.4, 0.5 + (power||1)*0.3);
  var arr=F3.world.bodies;
  for(var i=0;i<arr.length;i++){
    var b=arr[i];
    if(!b.mass) continue;
    var dx=b.position.x-x, dy=b.position.y-y, dz=b.position.z-z;
    var d=f3Len(dx,dy,dz)||0.4;
    if(d>9) continue;
    var s = (power||1) * 42 * b.mass / (d*d + 0.9);
    b.wakeUp();
    b.applyImpulse(new CANNON.Vec3(dx/d*s, (dy/d+0.42)*s, dz/d*s),
                   new CANNON.Vec3(b.position.x,b.position.y,b.position.z));
  }
  try{ if(typeof SND!=='undefined') SND.play('boom',{force:1}); }catch(e){}
  try{ if(typeof V19!=='undefined'&&V19.vib&&navigator.vibrate) navigator.vibrate(38); }catch(e){}
}
function f3DrawBoom(g){
  for(var i=F3.boomFx.length-1;i>=0;i--){
    var f=F3.boomFx[i];
    f.t += 0.055;
    if(f.t>1){ F3.boomFx.splice(i,1); continue; }
    var s=f3Sc(f.x,f.y,f.z);
    if(!s) continue;
    var R=(0.6+f.t*7.4*f.p)*s.k;
    g.save();
    g.globalAlpha=(1-f.t)*0.55;
    g.strokeStyle='rgba(253,186,116,.95)'; g.lineWidth=3.5*(1-f.t)+0.8;
    g.beginPath(); g.arc(s.X,s.Y,R,0,6.2832); g.stroke();
    g.globalAlpha=(1-f.t)*0.30;
    g.strokeStyle='rgba(255,255,255,.9)'; g.lineWidth=1.6;
    g.beginPath(); g.arc(s.X,s.Y,R*0.68,0,6.2832); g.stroke();
    g.restore();
  }
}

/* ---- HUD ---- */
function f3HUD(g,W,H){
  g.save();
  /* 左上状态 */
  g.font='600 11px -apple-system,"PingFang SC",sans-serif';
  g.fillStyle='rgba(148,197,255,.78)';
  g.textAlign='left'; g.textBaseline='top';
  var n=F3.ms.length;
  g.fillText('物体 '+n+'  ·  '+(F3.zeroG?'零重力':'g = 9.82')+
             '  ·  '+Math.round(F3.fps)+' fps', 12, 10);

  /* 暂停标（右上角），暂停时连边框都变琥珀色，一眼能看出来 */
  if(!F3.run){
    var pt='⏸ 已暂停';
    g.font='700 11.5px -apple-system,"PingFang SC",sans-serif';
    var pw=g.measureText(pt).width;
    var px2=W-pw-26, py2=8;
    g.fillStyle='rgba(245,158,11,.16)';
    g.strokeStyle='rgba(245,158,11,.55)'; g.lineWidth=1;
    g.beginPath();
    if(g.roundRect) g.roundRect(px2,py2,pw+18,20,10); else g.rect(px2,py2,pw+18,20);
    g.fill(); g.stroke();
    g.fillStyle='#fbbf24';
    g.textAlign='left'; g.textBaseline='top';
    g.fillText(pt, px2+9, py2+4.5);
  }

  /* 选中物体的浮标 */
  if(F3.sel>=0 && F3.sel<F3.ms.length){
    var m=F3.ms[F3.sel], p=m.b.position;
    var s=f3Sc(p.x,p.y,p.z);
    if(s){
      var txt = 'm '+m.b.mass.toFixed(1)+' kg';
      g.textAlign='center'; g.textBaseline='bottom';
      g.font='600 11px -apple-system,"PingFang SC",sans-serif';
      var tw=g.measureText(txt).width;
      g.fillStyle='rgba(8,16,30,.72)';
      var bx=s.X-tw/2-7, by=s.Y-44;
      g.beginPath();
      if(g.roundRect) { g.roundRect(bx,by,tw+14,18,9); } else { g.rect(bx,by,tw+14,18); }
      g.fill();
      g.fillStyle='#7dd3fc';
      g.fillText(txt, s.X, by+15);
    }
  }

  /* 首次操作的提示（前 7 秒） */
  if(F3.hintT>0){
    F3.hintT -= 1/60;
    var a=Math.min(1, F3.hintT/1.6);
    g.globalAlpha=a*0.9;
    g.textAlign='center'; g.textBaseline='bottom';
    g.font='600 12px -apple-system,"PingFang SC",sans-serif';
    var msg='拖动空白转视角 · 双指缩放 · 按住物体拖动';
    var mw=g.measureText(msg).width;
    g.fillStyle='rgba(6,12,24,.78)';
    g.beginPath();
    if(g.roundRect){ g.roundRect(W/2-mw/2-12, H-46, mw+24, 26, 13); } else { g.rect(W/2-mw/2-12,H-46,mw+24,26); }
    g.fill();
    g.fillStyle='#cbe6ff';
    g.fillText(msg, W/2, H-27);
    g.globalAlpha=1;
  }

  /* 提示气泡 */
  if(F3.toastT>0){
    F3.toastT -= 1/60;
    g.globalAlpha=Math.min(1, F3.toastT/0.5);
    g.textAlign='center'; g.textBaseline='middle';
    g.font='700 13px -apple-system,"PingFang SC",sans-serif';
    var tw2=g.measureText(F3.toast).width;
    g.fillStyle='rgba(56,189,248,.92)';
    g.beginPath();
    if(g.roundRect){ g.roundRect(W/2-tw2/2-14, H*0.14, tw2+28, 30, 15); } else { g.rect(W/2-tw2/2-14,H*0.14,tw2+28,30); }
    g.fill();
    g.fillStyle='#04121f';
    g.fillText(F3.toast, W/2, H*0.14+15);
    g.globalAlpha=1;
  }
  g.restore();
}

function f3Toast(s){ F3.toast=s; F3.toastT=1.5; }

/* ================================================================
   5. 物理步进
   ================================================================ */
function f3Step(dt){
  var W=F3.world;
  if(!W) return;
  /* 拖拽中的物体：朝目标点弹簧式移动，速度同步，松手有惯性 */
  if(F3.drag && F3.drag.i>=0 && F3.ms[F3.drag.i]){
    var ms=F3.ms[F3.drag.i], b=ms.b, t=F3.drag.tgt;
    var kx=(t.x-b.position.x)*0.34, ky=(t.y-b.position.y)*0.34, kz=(t.z-b.position.z)*0.34;
    b.position.x += kx; b.position.y += ky; b.position.z += kz;
    b.velocity.set(kx*22, ky*22, kz*22);
    b.angularVelocity.scale(0.86, b.angularVelocity);
    b.wakeUp();
  }
  W.step(1/120, dt, 4);
  F3.simT += dt;

  /* 越界回收 */
  for(var i=F3.ms.length-1;i>=0;i--){
    var p=F3.ms[i].b.position;
    if(p.y<-6 || Math.abs(p.x)>40 || Math.abs(p.z)>40){
      if(F3.drag && F3.drag.i===i) F3.drag=null;
      f3Remove(i);
    }
  }
}

/* 主循环一帧 */
function f3Frame(){
  var now=(window.performance&&performance.now)?performance.now():Date.now();
  if(F3.lastT){
    var df=now-F3.lastT;
    if(df>0) F3.fps=F3.fps*0.9+(1000/df)*0.1;
    if(F3.run) f3Step(Math.min(0.05, df/1000)*F3.speed);
  }
  /* 暂停时拖拽 = 纯摆位：直接跟到目标点，速度清零，松手就停在那儿 */
  if(!F3.run && F3.drag && F3.ms[F3.drag.i]){
    var dm=F3.ms[F3.drag.i], db=dm.b, dt=F3.drag.tgt;
    db.position.x += (dt.x-db.position.x)*0.4;
    db.position.y += (dt.y-db.position.y)*0.4;
    db.position.z += (dt.z-db.position.z)*0.4;
    db.velocity.set(0,0,0);
    db.angularVelocity.set(0,0,0);
    db.wakeUp();
  }
  F3.lastT=now;
  var tt=$('#timeTag');
  if(tt) tt.textContent='t = '+F3.simT.toFixed(2)+' s';
  /* 每 0.5 秒刷新一次侧栏数据（选中物体在动） */
  if((F3._roT=(F3._roT||0)+1)>=30){ F3._roT=0; f3Panel(); }
  f3Render();
}

/* ================================================================
   6. 命中测试
   ================================================================ */
/* 屏幕点是否在多边形内 */
function f3InPoly(px,py,pts){
  var inside=false;
  for(var i=0,j=pts.length-1;i<pts.length;j=i++){
    var a=pts[i], b=pts[j];
    if(((a.Y>py)!==(b.Y>py)) && (px < (b.X-a.X)*(py-a.Y)/(b.Y-a.Y)+a.X)) inside=!inside;
  }
  return inside;
}
/* 2D 凸包（Andrew monotone chain） */
function f3Hull(pts){
  if(pts.length<3) return pts.slice();
  var P=pts.slice().sort(function(a,b){ return a.X!==b.X? a.X-b.X : a.Y-b.Y; });
  var lower=[], i;
  for(i=0;i<P.length;i++){
    while(lower.length>=2 && f3Cross(lower[lower.length-2],lower[lower.length-1],P[i])<=0) lower.pop();
    lower.push(P[i]);
  }
  var upper=[];
  for(i=P.length-1;i>=0;i--){
    while(upper.length>=2 && f3Cross(upper[upper.length-2],upper[upper.length-1],P[i])<=0) upper.pop();
    upper.push(P[i]);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}
function f3Cross(o,a,b){ return (a.X-o.X)*(b.Y-o.Y)-(a.Y-o.Y)*(b.X-o.X); }

/* 拾取：返回 {i, z} */
function f3Pick(sx,sy){
  var best=-1, bz=1e9;
  for(var i=0;i<F3.ms.length;i++){
    var m=F3.ms[i], p=m.b.position;
    var c=f3Sc(p.x,p.y,p.z);
    if(!c) continue;
    var hit=false;
    if(m.kind==='sph'){
      var R=m.r*c.k;
      if(R<3) R=3;
      hit = ((sx-c.X)*(sx-c.X)+(sy-c.Y)*(sy-c.Y)) <= R*R;
    } else {
      var mul=f3Mat(m.b.quaternion), hs=m.hs||[m.r,m.h*0.5,m.r];
      var sp=[];
      var nx = m.kind==='cyl'?1:1;
      /* 用包围盒的 8 角点构凸包 */
      var H3 = m.kind==='cyl' ? [m.r, m.h*0.5, m.r] : hs;
      for(var a=0;a<2;a++)for(var bb=0;bb<2;bb++)for(var cc=0;cc<2;cc++){
        var lx=(a?1:-1)*H3[0], ly=(bb?1:-1)*H3[1], lz=(cc?1:-1)*H3[2];
        var t=f3Mv(mul,{x:lx,y:ly,z:lz},{x:0,y:0,z:0});
        var s=f3Sc(p.x+t.x, p.y+t.y, p.z+t.z);
        if(s) sp.push(s);
      }
      if(sp.length>=3) hit=f3InPoly(sx,sy,f3Hull(sp));
    }
    if(hit && c.z<bz){ bz=c.z; best=i; }
  }
  return best<0? null : { i:best, z:bz };
}

/* ================================================================
   7. 交互绑定
   ================================================================ */
function f3Bind(){
  var cv=$('#scene');
  if(!cv || cv.__f3) return;
  cv.__f3=1;

  function loc(e){
    var r=cv.getBoundingClientRect();
    var t=(e.touches&&e.touches[0])||(e.changedTouches&&e.changedTouches[0])||e;
    return { x:t.clientX-r.left, y:t.clientY-r.top };
  }

  var down=null, last=null, pinchD=0;

  function onDown(e){
    if(App.mode!=='free3d') return;
    if(e.touches && e.touches.length>=2){
      pinchD=f3Pinch(e);
      down=null; F3.drag=null;
      e.preventDefault(); return;
    }
    var p=loc(e);
    last={x:p.x,y:p.y};
    var hit=f3Pick(p.x,p.y);
    if(hit){
      F3.sel=hit.i;
      var m=F3.ms[hit.i], bp=m.b.position;
      /* 命中平面：过物体中心、垂直于相机视线 */
      F3.drag={ i:hit.i, tgt:{x:bp.x,y:bp.y,z:bp.z}, offset:null };
      /* 记录抓取点与物体中心的偏移，拖动更跟手 */
      var g2=f3RayPlane(p.x,p.y,bp.x,bp.y,bp.z);
      if(g2) F3.drag.offset={x:bp.x-g2.x, y:bp.y-g2.y, z:bp.z-g2.z};
      m.b.wakeUp();
      try{ SND.play('sel'); }catch(err){}
      if(F3._selPrev!==hit.i){
        F3._selPrev=hit.i;
        f3Toast('已选中 · 侧栏可调尺寸/密度/摩擦/弹性');
      }
      F3.psig='';
      f3Panel();
    } else {
      F3.drag=null;
      down={ x:p.x, y:p.y, yaw:F3C.yaw, pitch:F3C.pitch };
    }
    e.preventDefault();
  }

  function onMove(e){
    if(App.mode!=='free3d') return;
    if(e.touches && e.touches.length>=2){
      var d=f3Pinch(e);
      if(pinchD>0 && d>0){
        F3C.dist = f3Clamp(F3C.dist*(pinchD/d), 4.5, 44);
        F3C.tYaw=null;
      }
      pinchD=d;
      e.preventDefault(); return;
    }
    var p=loc(e);
    if(F3.drag){
      var m=F3.ms[F3.drag.i];
      if(m){
        var bp=m.b.position;
        var q=f3RayPlane(p.x,p.y,bp.x,bp.y,bp.z);
        if(q){
          var o=F3.drag.offset||{x:0,y:0,z:0};
          F3.drag.tgt.x=q.x+o.x;
          F3.drag.tgt.y=Math.max(0.3, q.y+o.y);
          F3.drag.tgt.z=q.z+o.z;
        }
      }
    } else if(down && last){
      var dx=p.x-down.x, dy=p.y-down.y;
      F3C.yaw   = down.yaw   + dx*0.0085;
      F3C.pitch = f3Clamp(down.pitch - dy*0.0070, -0.10, 1.42);
      F3C.tYaw = null;
    }
    last={x:p.x,y:p.y};
    if(e.preventDefault) e.preventDefault();
  }

  function onUp(e){
    if(App.mode!=='free3d') return;
    if(F3.drag) F3.drag=null;
    down=null; pinchD=0;
    if(e&&e.preventDefault) e.preventDefault();
  }

  function f3Pinch(e){
    var r=cv.getBoundingClientRect();
    var a=e.touches[0], b=e.touches[1];
    return Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
  }

  cv.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  cv.addEventListener('touchstart', onDown, {passive:false});
  cv.addEventListener('touchmove', onMove, {passive:false});
  cv.addEventListener('touchend', onUp, {passive:false});
  cv.addEventListener('touchcancel', onUp, {passive:false});
  /* 桌面滚轮缩放 */
  cv.addEventListener('wheel', function(e){
    if(App.mode!=='free3d') return;
    F3C.dist = f3Clamp(F3C.dist*(1+Math.sign(e.deltaY)*0.08), 4.5, 44);
    e.preventDefault();
  }, {passive:false});

  /* 键盘：空格暂停/继续，回车单步，Delete 删除选中 */
  if(!F3.__kb){
    F3.__kb=1;
    window.addEventListener('keydown', function(e){
      if(App.mode!=='free3d') return;
      var t=e.target, tag=t&&t.tagName;
      if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable)) return;
      if(e.key===' '){ e.preventDefault(); f3Pause(); }
      else if(e.key==='Delete'||e.key==='Backspace'){
        if(F3.sel>=0){ e.preventDefault(); f3Remove(F3.sel); f3Toast('已删除'); f3Panel(); }
      }
      else if(e.key==='Enter'){
        e.preventDefault(); F3.run=0;
        f3Step(1/60); f3Render(); f3Panel(); f3Bar();
      }
    });
  }
}

/* 屏幕点 → 过 (ox,oy,oz) 的相机平行平面交点 */
function f3RayPlane(sx,sy,ox,oy,oz){
  var R=f3Ray(sx,sy);
  /* 平面法线 = 相机前方 = -b */
  var nx=-F3C.bx, ny=-F3C.by, nz=-F3C.bz;
  var den = R.d.x*nx + R.d.y*ny + R.d.z*nz;
  if(Math.abs(den)<1e-5) return null;
  var t = ((ox-R.o.x)*nx + (oy-R.o.y)*ny + (oz-R.o.z)*nz)/den;
  return { x:R.o.x+R.d.x*t, y:R.o.y+R.d.y*t, z:R.o.z+R.d.z*t };
}

/* ================================================================
   8. 场景内容
   ================================================================ */
function f3Clear(){
  while(F3.ms.length) f3Remove(F3.ms.length-1);
  F3.sel=-1; F3.drag=null;
  f3Panel();
}

/* 在视野中心放一个（避免堆在同一点，做小随机） */
function f3Add(kind){
  if(F3.ms.length>=F3.MAX){ f3Toast('物体太多啦，先清一清'); return; }
  var t=F3C.tgt;
  var r=Math.random;
  var x=t.x+(r()-0.5)*2.4, z=t.z+(r()-0.5)*2.4;
  var y = (kind==='sph'? 4.5 : 5.2);
  var ms=f3Make(kind, {x:x, y:y, z:z});
  F3.sel=F3.ms.length-1;
  try{ SND.play(F3MAT[F3.mat].snd||'tap'); }catch(e){}
  f3Panel();
  return ms;
}

/* 预设：方塔 */
function f3P1(){
  f3Clear();
  var mats=['wood','steel','glass','rubber','foam','ice'];
  for(var l=0;l<6;l++){
    for(var k=0;k<3-Math.floor(l/2);k++){
      f3Make('box',{ x:(k-1)*1.16, y:0.58+l*1.14, z:0,
                     mat:mats[l%mats.length] });
    }
  }
  f3Toast('六层彩塔 · 推它试试');
}

/* 预设：多米诺骨牌 */
function f3P2(){
  f3Clear();
  for(var i=0;i<13;i++){
    f3Make('plank',{ x:-6+i*1.02, y:0.62, z:0, mat:i%2?'wood':'steel',
                     hs:[0.09,0.62,0.42], note:'domino' });
  }
  /* 一颗球从一端滚过去 */
  var b=f3Make('sph',{ x:-8.2, y:1.2, z:0, r:0.42, mat:'steel' });
  b.b.velocity.set(4.2,0,0);
  f3Toast('多米诺 · 看连锁反应');
}

/* 预设：斜坡弹珠 */
function f3P3(){
  f3Clear();
  /* 斜坡（静态盒体旋转） */
  var ramp=f3Make('box',{ x:-2.2, y:3.0, z:0, mat:'steel', hs:[3.2,0.14,1.5],
                          fixed:true });
  ramp.b.quaternion.setFromEuler(0,0,0.34);
  /* 接球槽 */
  f3Make('box',{ x:3.4, y:0.35, z:0, mat:'wood', hs:[0.16,0.35,1.6], fixed:true });
  f3Make('box',{ x:6.2, y:0.35, z:0, mat:'wood', hs:[0.16,0.35,1.6], fixed:true });
  f3Make('box',{ x:4.8, y:0.35, z:1.6, mat:'wood', hs:[1.55,0.35,0.16], fixed:true });
  f3Make('box',{ x:4.8, y:0.35, z:-1.6, mat:'wood', hs:[1.55,0.35,0.16], fixed:true });
  for(var i=0;i<4;i++){
    var b=f3Make('sph',{ x:-5.4+i*0.7, y:5.4+i*0.5, z:(i%2?0.5:-0.5), r:0.34,
                         mat:i%2?'glass':'rubber' });
    b.b.velocity.set(1.6,0,0);
  }
  f3Toast('斜坡弹珠台');
}

/* 预设：保龄球 */
function f3P4(){
  f3Clear();
  var rows=[[0,0],[-0.62,1.1],[0.62,1.1],[-1.24,2.2],[0,2.2],[1.24,2.2],
            [-1.86,3.3],[-0.62,3.3],[0.62,3.3],[1.86,3.3]];
  rows.forEach(function(r){
    f3Make('cyl',{ x:r[0], y:0.6, z:r[1], r:0.30, h:1.1, mat:'foam' });
  });
  var ball=f3Make('sph',{ x:0, y:0.55, z:-3.6, r:0.55, mat:'steel' });
  ball.b.velocity.set(0,0,7.2);
  f3Toast('保龄球 · 全中？');
}

/* 预设：默认开场 */
function f3Default(){
  f3Clear();
  f3Make('box',{ x:0, y:0.56, z:0, mat:'wood' });
  f3Make('box',{ x:0, y:1.68, z:0, mat:'steel' });
  f3Make('sph',{ x:0, y:3.2, z:0, r:0.5, mat:'glass' });
  f3Make('cyl',{ x:2.1, y:0.6, z:1.2, mat:'rubber' });
  f3Make('plank',{ x:-2.2, y:0.6, z:-0.8, mat:'foam', hs:[1.5,0.14,0.5] });
}

/* ================================================================
   9. UI：工具条 + 侧栏
   ================================================================ */
var F3PRESET=0;

/* 暂停 / 继续。暂停时物理不积分，但仍可转视角、点选、拖动摆位、调参数 */
function f3Pause(v){
  F3.run = (v===undefined) ? (F3.run?0:1) : (v?1:0);
  var bp=$('#bPlay');
  if(bp) bp.textContent = F3.run?'⏸ 暂停':'▶ 播放';
  f3Toast(F3.run?'继续模拟':'已暂停 · 仍可拖动物体、调参数');
  f3Bar(); f3Panel();
}

function f3Bar(){
  var box=$('#mobBar');
  if(!box) return;
  box.innerHTML='';
  if(App.mode!=='free3d'){ box.style.display='none'; return; }
  box.style.display='';

  function btn(label, fn, cls){
    var b=document.createElement('button');
    b.className='btn'+(cls?' '+cls:'');
    b.textContent=label;
    b.onclick=function(){ fn(); };
    return b;
  }

  var items=[
    ['＋方块', function(){ f3Add('box'); }],
    ['＋球',   function(){ f3Add('sph'); }],
    ['＋圆柱', function(){ f3Add('cyl'); }],
    ['＋长板', function(){ f3Add('plank'); }],
    ['材质·'+F3MAT[F3.mat].n, function(){
      var i=F3MATK.indexOf(F3.mat);
      F3.mat=F3MATK[(i+1)%F3MATK.length];
      f3Toast('材质：'+F3MAT[F3.mat].n+'（密度 '+F3MAT[F3.mat].d+' kg/m³）');
      f3Bar(); f3Panel();
    }, 'pri'],
    [F3.zeroG?'零重力·开':'零重力', function(){
      F3.zeroG=F3.zeroG?0:1;
      F3.world.gravity.set(0, F3.zeroG?0:-9.82, 0);
      f3Toast(F3.zeroG?'零重力：飘起来了':'重力恢复');
      f3Bar();
    }, F3.zeroG?'pri':''],
    ['💥 爆炸', function(){
      var p=F3C.tgt;
      if(F3.sel>=0 && F3.ms[F3.sel]){
        var bp=F3.ms[F3.sel].b.position;
        p={x:bp.x,y:bp.y,z:bp.z};
      }
      f3Boom(p.x, p.y, p.z, 1);
    }],
    ['样式', function(){
      F3PRESET=(F3PRESET+1)%5;
      [f3Default,f3P1,f3P2,f3P3,f3P4][F3PRESET]();
    }],
    ['清空', function(){ f3Clear(); f3Toast('已清空'); }],
    [F3.run?'⏸ 暂停':'▶ 继续', function(){ f3Pause(); }, F3.run?'':'pri'],
    ['单步', function(){
      F3.run=0; f3Step(1/60); f3Render(); f3Panel(); f3Bar();
      f3Toast('单步 1/60 s');
    }],
    ['视角', function(){
      F3C.tYaw=-0.82; F3C.tPitch=0.40; F3C.tDist=16.5;
      F3C.tgt.x=0; F3C.tgt.y=1.15; F3C.tgt.z=0;
      f3Toast('视角已复位');
    }],
    ['删除', function(){
      if(F3.sel>=0){ f3Remove(F3.sel); f3Toast('已删除'); f3Panel(); }
      else f3Toast('先点一下要删的物体');
    }]
  ];

  items.forEach(function(it){
    box.appendChild(btn(it[0], it[1], it[2]));
  });
}

/* ---------- 侧栏参数（材质板 + 选中物体调节） ---------- */
var F3D0=30, F3D1=8000;          /* 密度滑块区间 kg/m³ */
function f3DensToV(d){ return Math.round(1000*Math.log(Math.max(F3D0,d)/F3D0)/Math.log(F3D1/F3D0)); }
function f3VToDens(v){ return Math.round(F3D0*Math.pow(F3D1/F3D0, v/1000)); }

/* 面板签名：内容不变就不重建 DOM —— 否则拖动滑块时元素被销毁，手指会“掉” */
function f3Sig(){
  var m=(F3.sel>=0)?F3.ms[F3.sel]:null;
  if(!m) return 'none|'+F3.mat+'|'+F3.ms.length;
  return [F3.sel,m.kind,m.mat,m.fixed?1:0,(m.scale||1).toFixed(2),
          m.dens===null?'-':Math.round(m.dens),
          m.fr===null?'-':m.fr.toFixed(2),
          m.re===null?'-':m.re.toFixed(2)].join('|');
}

/* 改材质（只对选中的物体） */
function f3SetMat(i,k){
  var ms=F3.ms[i];
  if(!ms || !F3MAT[k]) return;
  ms.mat=k; ms.col=F3MAT[k].col; ms.rgb=f3RGB(F3MAT[k].col);
  f3Rebuild(ms);
}

/* 复制一个（保留材质与自定义参数） */
function f3Dup(i){
  var ms=F3.ms[i];
  if(!ms) return null;
  if(F3.ms.length>=F3.MAX){ f3Toast('物体太多啦，先清一清'); return null; }
  var p=ms.b.position;
  var o=f3Make(ms.kind,{ x:p.x+0.95, y:p.y+0.45, z:p.z+0.35, mat:ms.mat,
                         r:ms.r0, h:ms.h0,
                         hs:ms.hs0?[ms.hs0[0],ms.hs0[1],ms.hs0[2]]:undefined,
                         fixed:ms.fixed });
  o.scale=ms.scale; o.dens=ms.dens; o.fr=ms.fr; o.re=ms.re;
  f3Rebuild(o);
  F3.sel=F3.ms.length-1;
  f3Toast('已复制一个');
  return o;
}

/* 参数还原成材质默认 */
function f3ResetProps(i){
  var ms=F3.ms[i];
  if(!ms) return;
  ms.scale=1; ms.dens=null; ms.fr=null; ms.re=null;
  f3Rebuild(ms);
  f3Toast('参数已还原');
}

function f3Params(){
  var ps=$('#params');
  if(!ps || App.mode!=='free3d') return;
  F3.psig=f3Sig();

  var html='<div class="f3mats">';
  F3MATK.forEach(function(k){
    var M=F3MAT[k];
    html+='<button class="f3m'+(k===F3.mat?' on':'')+'" data-m="'+k+'" '+
          'style="--mc:'+M.col+'" title="'+M.n+' · '+M.d+' kg/m³">'+
          '<i></i><b>'+M.n+'</b></button>';
  });
  html+='</div>';

  var m=(F3.sel>=0)?F3.ms[F3.sel]:null;
  if(m){
    var M=F3MAT[m.mat];
    var dens=(m.dens===null)?M.d:m.dens;
    var fr=(m.fr===null)?M.r:m.fr;
    var re=(m.re===null)?M.e:m.re;
    var kn=(m.kind==='sph'?'球':m.kind==='cyl'?'圆柱':m.kind==='plank'?'长板':'方块');
    html+='<div class="f3sep"></div>';
    html+='<div class="f3selh" style="--mc:'+M.col+'"><i></i>选中 '+kn+' · '+M.n+
          (m.fixed?' <em>固定</em>':'')+'</div>';
    html+='<div class="f3row"><span>尺寸</span><input id="f3sSize" type="range" min="50" max="220" step="5" value="'+
          Math.round((m.scale||1)*100)+'"><b id="f3vSize">'+Math.round((m.scale||1)*100)+'%</b></div>';
    html+='<div class="f3row"><span>密度</span><input id="f3sDen" type="range" min="0" max="1000" step="5" value="'+
          f3DensToV(dens)+'"><b id="f3vDen">'+dens+'</b></div>';
    html+='<div class="f3row"><span>摩擦</span><input id="f3sFr" type="range" min="0" max="120" step="2" value="'+
          Math.round(fr*100)+'"><b id="f3vFr">'+fr.toFixed(2)+'</b></div>';
    html+='<div class="f3row"><span>弹性</span><input id="f3sRe" type="range" min="0" max="98" step="2" value="'+
          Math.round(re*100)+'"><b id="f3vRe">'+re.toFixed(2)+'</b></div>';
    html+='<div class="f3acts">'+
          '<button id="f3bFix" class="'+(m.fixed?'on':'')+'">'+(m.fixed?'取消固定':'固定')+'</button>'+
          '<button id="f3bDup">复制</button>'+
          '<button id="f3bRst">还原</button>'+
          '<button id="f3bDel" class="danger">删除</button></div>';
    html+='<div class="f3tip">滑块<b>即时生效</b>。「固定」=质量无穷大（当墙用），「还原」只清参数不动位置。也可以直接换上面的材质。</div>';
  } else {
    html+='<div class="f3kv"><span>材料摩擦 / 弹性</span><b>'+
          F3MAT[F3.mat].r.toFixed(2)+' / '+F3MAT[F3.mat].e.toFixed(2)+'</b></div>';
    html+='<div class="f3tip">按住物体可以搬动；<b>点一下物体</b>就能在这里调它的尺寸、密度、摩擦和弹性。点「💥 爆炸」把周围全部掀翻。</div>';
  }
  ps.innerHTML=html;

  /* 材质板：选中了物体就换它的材质，否则只设“下一个物体”的默认材质 */
  var btns=ps.querySelectorAll('.f3m');
  for(var i=0;i<btns.length;i++){
    btns[i].onclick=function(){
      var k=this.getAttribute('data-m');
      F3.mat=k;
      if(F3.sel>=0) f3SetMat(F3.sel,k);
      try{ SND.play(F3MAT[k].snd||'tap'); }catch(e){}
      f3Bar(); f3Panel();
    };
  }

  /* 滑块：input 时应用 + 同步签名，避免被下一次 f3Panel 重建 */
  function hook(id, vId, apply){
    var el=ps.querySelector('#'+id), lb=ps.querySelector('#'+vId);
    if(!el || !lb) return;
    el.addEventListener('input', function(){
      var t=apply(parseFloat(this.value)||0);
      if(t!==undefined && t!==null) lb.textContent=t;
      F3.psig=f3Sig();
    });
  }
  if(m){
    hook('f3sSize','f3vSize', function(v){
      var mm=F3.ms[F3.sel]; if(!mm) return null;
      mm.scale=v/100; f3Rebuild(mm); return Math.round(v)+'%';
    });
    hook('f3sDen','f3vDen', function(v){
      var mm=F3.ms[F3.sel]; if(!mm) return null;
      mm.dens=f3VToDens(v); f3Rebuild(mm); return String(mm.dens);
    });
    hook('f3sFr','f3vFr', function(v){
      var mm=F3.ms[F3.sel]; if(!mm) return null;
      mm.fr=v/100; f3Contact(mm); return mm.fr.toFixed(2);
    });
    hook('f3sRe','f3vRe', function(v){
      var mm=F3.ms[F3.sel]; if(!mm) return null;
      mm.re=v/100; f3Contact(mm); return mm.re.toFixed(2);
    });

    var bf=ps.querySelector('#f3bFix');
    if(bf) bf.onclick=function(){
      var mm=F3.ms[F3.sel]; if(!mm) return;
      mm.fixed=!mm.fixed;
      if(mm.fixed){ mm.b.velocity.set(0,0,0); mm.b.angularVelocity.set(0,0,0); }
      f3Rebuild(mm);
      f3Toast(mm.fixed?'已固定（当墙用）':'已解除固定');
      f3Panel();
    };
    var bd=ps.querySelector('#f3bDup');
    if(bd) bd.onclick=function(){ f3Dup(F3.sel); f3Panel(); };
    var br=ps.querySelector('#f3bRst');
    if(br) br.onclick=function(){ f3ResetProps(F3.sel); f3Panel(); };
    var bx=ps.querySelector('#f3bDel');
    if(bx) bx.onclick=function(){
      if(F3.sel>=0){ f3Remove(F3.sel); f3Toast('已删除'); f3Panel(); }
    };
  }
}

function f3Panel(){
  if(App.mode!=='free3d') return;
  /* 选择或参数变了才重建参数区 */
  if(f3Sig()!==F3.psig) f3Params();

  /* 实时数据 */
  var ro=$('#readout');
  if(!ro) return;
  var rows='';
  var m=(F3.sel>=0)?F3.ms[F3.sel]:null;
  if(m){
    var b=m.b, p=b.position, v=b.velocity, w=b.angularVelocity;
    var sp=f3Len(v.x,v.y,v.z), wp=f3Len(w.x,w.y,w.z);
    var ke=0.5*b.mass*(v.x*v.x+v.y*v.y+v.z*v.z);
    var kn=(m.kind==='sph'?'球':m.kind==='cyl'?'圆柱':m.kind==='plank'?'长板':'方块');
    rows+='<tr><td>物体</td><td>'+kn+' · '+F3MAT[m.mat].n+'</td></tr>';
    rows+='<tr><td>质量 m</td><td>'+b.mass.toFixed(2)+' kg'+(m.fixed?'（固定）':'')+'</td></tr>';
    rows+='<tr><td>尺寸</td><td>'+Math.round((m.scale||1)*100)+' %</td></tr>';
    rows+='<tr><td>摩擦 / 弹性</td><td>'+((m.fr===null?F3MAT[m.mat].r:m.fr).toFixed(2))+' / '+
          ((m.re===null?F3MAT[m.mat].e:m.re).toFixed(2))+'</td></tr>';
    rows+='<tr><td>位置 (x,y,z)</td><td>'+p.x.toFixed(2)+', '+p.y.toFixed(2)+', '+p.z.toFixed(2)+' m</td></tr>';
    rows+='<tr><td>速度 v</td><td>'+sp.toFixed(2)+' m/s</td></tr>';
    rows+='<tr><td>角速度 ω</td><td>'+wp.toFixed(2)+' rad/s</td></tr>';
    rows+='<tr><td>动能 Ek</td><td>'+ke.toFixed(1)+' J</td></tr>';
    rows+='<tr><td>状态</td><td>'+(F3.run? (b.sleepState===2?'静止（休眠）':'运动中') : '已暂停')+'</td></tr>';
  } else {
    rows+='<tr><td>提示</td><td>点一个物体，左侧就能调参数</td></tr>';
  }
  rows+='<tr><td>物体数</td><td>'+F3.ms.length+' / '+F3.MAX+'</td></tr>';
  rows+='<tr><td>重力</td><td>'+(F3.zeroG?'0（零重力）':'9.82 m/s²')+'</td></tr>';
  rows+='<tr><td>仿真时间</td><td>'+F3.simT.toFixed(2)+' s'+(F3.run?'':'（暂停）')+'</td></tr>';
  rows+='<tr><td>帧率</td><td>'+Math.round(F3.fps)+' fps</td></tr>';
  ro.innerHTML=rows;
}

/* ================================================================
   10. 按钮接管（只在 free3d 模式生效，不干扰其它模块）
   ================================================================ */
var F3BTN = {
  bPlay: function(){ f3Pause(); },
  bStep: function(){ F3.run=0; f3Step(1/60); f3Render(); f3Panel(); f3Bar(); },
  bReset: function(){ F3PRESET=0; f3Default(); f3Toast('已重置'); },
  bEnd: function(){ f3Clear(); f3Toast('已清空'); }
};
function f3HookBtns(){
  if(F3.__hooked) return;
  F3.__hooked = 1;
  /* 捕获阶段拦截：拦下后不再传到原本的 2D 处理器 */
  document.addEventListener('click', function(e){
    if(App.mode!=='free3d') return;
    var t=e.target;
    while(t && t!==document && t.nodeType===1){
      if(t.id && F3BTN[t.id]){
        e.stopPropagation(); e.preventDefault();
        F3BTN[t.id]();
        return;
      }
      t=t.parentNode;
    }
  }, true);
  document.addEventListener('change', function(e){
    if(App.mode!=='free3d') return;
    if(e.target && e.target.id==='selSpeed'){
      F3.speed = parseFloat(e.target.value)||1;
      e.stopPropagation();
    }
  }, true);
}

/* ================================================================
   11. 生命周期
   ================================================================ */
function f3Enter(){
  App.playing=false;
  /* 2D 场景的底部栏元素（矢量/轨迹/导出CSV）在 3D 里没有意义，先收起来 */
  F3._hid=[];
  ['#ckVec','#ckTrail'].forEach(function(sel){
    var el=$(sel);
    if(el && el.parentNode){ F3._hid.push([el.parentNode, el.parentNode.style.display]); el.parentNode.style.display='none'; }
  });
  var csv=$('#bCsv');
  if(csv){ F3._hid.push([csv, csv.style.display]); csv.style.display='none'; }
  $('#bPlay').textContent='⏸ 暂停';
  $('#bEnd').textContent='清空物体';
  $('#timeline').style.display='none';
  $('#charts').style.display='none';
  $('#stageTag').textContent='三维自由沙盒';
  var pn=$('#pname'); if(pn) pn.textContent='三维沙盒';
  var bf=$('#brief'); if(bf) bf.textContent='三维刚体沙盒：cannon-es 物理引擎 + 自研 Canvas 软件渲染。拖动空白转视角，双指缩放，按住物体直接拖。点一下物体可在侧栏调尺寸/密度/摩擦/弹性；「暂停」后还能一边停着一边摆位。';
  var ex=$('#examples');
  if(ex) ex.innerHTML='<div class="f3tip">3D 沙盒没有固定例题——<b>你自己搭的场景就是题</b>。试试：<br>① 搭一座六层彩塔然后「💥 爆炸」，看它怎么散架；<br>② 多米诺骨牌的间距对连锁速度有什么影响；<br>③ 冰球、钢球、橡胶球从长板斜坡滚下，谁滚得远？为什么？</div>';

  if(!F3.booted){
    try{ f3BuildWorld(); }catch(e){
      f3Toast('3D 引擎初始化失败：'+e.message);
      return;
    }
    F3.booted=1;
    f3Bind();
    f3HookBtns();
    f3Default();
    F3.hintT=7;
  }
  F3.lastT=0;
  F3.psig='';                 /* 强制重建侧栏参数区 */
  var bp=$('#bPlay'); if(bp) bp.textContent = F3.run?'⏸ 暂停':'▶ 播放';
  f3Bar(); f3Panel(); f3Render();
}

function f3Leave(){
  F3.drag=null; F3.orbit=null;
  if(F3._hid){ F3._hid.forEach(function(e){ e[0].style.display=e[1]; }); F3._hid=null; }
  $('#charts').style.display='';
  $('#timeline').style.display='';
  $('#bEnd').textContent='运行到底';
  $('#stageTag').textContent='—';
  var box=$('#mobBar'); if(box) box.style.display='none';
}
