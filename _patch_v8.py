# -*- coding: utf-8 -*-
"""v8：环境(地面/空间) · 坚硬程度 · 液体燃料+点火 · 原子弹 · 特效强度 · 生成落位"""
import io

P = 'index.html'
src = io.open(P, encoding='utf-8').read()
orig_len = len(src)
applied = 0

def rep(old, new, count=1):
    global src, applied
    n = src.count(old)
    assert n == count, 'count mismatch: expected %d got %d\n---OLD---\n%s' % (count, n, old[:400])
    src = src.replace(old, new)
    applied += 1

# ==================================================== 1. 全局：硬度表 / 液体常量 / 辅助
rep("""var SBMAX=140;
var LINKDEF=""",
"""var SBMAX=140;
/* 坚硬程度：直接乘在材质标称强度上（新物体用 SB.defHard，选中物体可单独改） */
var HARDS=[
 {k:'fragile',n:'脆弱',   mul:0.22},
 {k:'normal', n:'普通',   mul:1},
 {k:'hard',   n:'坚硬',   mul:6},
 {k:'ultra',  n:'超硬',   mul:60},
 {k:'invul',  n:'不可破坏',mul:1e9}
];
function hardDef(k){
  for(var i=0;i<HARDS.length;i++)if(HARDS[i].k===k)return HARDS[i];
  return HARDS[1];
}
function SOLIDS(){var o=[],i;for(i=0;i<MATS.length;i++)if(!MATS[i].liq)o.push(MATS[i]);return o;}
function LIQS(){var o=[],i;for(i=0;i<MATS.length;i++)if(MATS[i].liq)o.push(MATS[i]);return o;}
/* 液体粒子参数：双密度松弛 SPH（Clavet 2005），网页上跑得动也足够稳 */
var SBPR={h:0.46,pitch:0.19,rho0:12,rhoN:6,rad:0.155,k:1.1,kNear:5.5,sig:0.10,beta:0.04};
(function(){
  /* 按"理想排布"自动算静止密度，改 pitch/h 也不会漂 */
  var i,j,x,y,r,q,s=0,sn=0,p=SBPR.pitch,h=SBPR.h;
  for(i=-5;i<=5;i++)for(j=-5;j<=5;j++){
    x=i*p;y=j*p;r=Math.sqrt(x*x+y*y);
    if(r>=h||r<1e-9)continue;
    q=1-r/h;s+=q*q;sn+=q*q*q;
  }
  SBPR.rho0=s;SBPR.rhoN=sn;
})();
var LINKDEF=""")

# ==================================================== 2. SB 新字段
rep("""  boomKg:2, boomFuse:0,
  fx:[], brk:[], shake:0, flash:0
};""",
"""  boomKg:2, boomFuse:0,
  fx:[], brk:[], shake:0, flash:0,
  /* ---- v8：环境 / 硬度 / 液体 / 燃烧 / 核武 / 特效强度 ---- */
  env:'ground', dark:0, spaceWall:true, stars:null,
  defHard:'normal',
  parts:[], pmax:420, pcount:0, pgrid:null, pbodies:null, pourW:2.4,
  fxP:1, nukeKt:15, sparkMode:0, sparkDrag:0, sparkT:0
};""")

# ==================================================== 3. 材质：可燃标记 + 液体
rep(""" {k:'wood',  n:'木',   rho:0.62,e:0.30,mu:0.45,hp:45,  c:'#dda86a',c2:'#9a6535',tex:'grain',edge:'#6b4423'},""",
    """ {k:'wood',  n:'木',   rho:0.62,e:0.30,mu:0.45,hp:45,  c:'#dda86a',c2:'#9a6535',tex:'grain',edge:'#6b4423',flam:1},""")
rep(""" {k:'rubber',n:'橡胶', rho:1.10,e:0.86,mu:0.88,hp:2200,c:'#4a515e',c2:'#252b34',tex:'plain',edge:'#111827'},""",
    """ {k:'rubber',n:'橡胶', rho:1.10,e:0.86,mu:0.88,hp:2200,c:'#4a515e',c2:'#252b34',tex:'plain',edge:'#111827',flam:1},""")
rep(""" {k:'foam',  n:'泡沫', rho:0.06,e:0.05,mu:0.72,hp:3000,c:'#f5eddd',c2:'#d8c8a8',tex:'pore', edge:'#b9a67f'},""",
    """ {k:'foam',  n:'泡沫', rho:0.06,e:0.05,mu:0.72,hp:3000,c:'#f5eddd',c2:'#d8c8a8',tex:'pore', edge:'#b9a67f',flam:1},""")
rep(""" {k:'tnt',   n:'炸药', rho:1.60,e:0.10,mu:0.50,hp:1.6, c:'#e8503f',c2:'#8f1d16',tex:'tnt',  edge:'#5b1410'}
];""",
""" {k:'tnt',   n:'炸药', rho:1.60,e:0.10,mu:0.50,hp:1.6, c:'#e8503f',c2:'#8f1d16',tex:'tnt',  edge:'#5b1410',flam:1},
 /* 液体 / 燃料：只用作"液体粒子"，会流动 (liq)、能烧 (fuel)、能灭火 (wet)、会烫 (hot) */
 {k:'water', n:'水',   rho:1.00,liq:1,e:0.05,mu:0.02,hp:3000,c:'#6fb8ef',c2:'#2f8fd0',tex:'plain',edge:'#2f8fd0',wet:1},
 {k:'gas',   n:'汽油', rho:0.75,liq:1,e:0.05,mu:0.03,hp:3000,c:'#eec96b',c2:'#b07a1e',tex:'plain',edge:'#b07a1e',fuel:1.6},
 {k:'oil',   n:'油',   rho:0.90,liq:1,e:0.02,mu:0.06,hp:3000,c:'#6b5a44',c2:'#3d3226',tex:'plain',edge:'#3d3226',fuel:1.0},
 {k:'lava',  n:'岩浆', rho:2.60,liq:1,e:0.02,mu:0.25,hp:3000,c:'#ff7a2f',c2:'#a01b12',tex:'plain',edge:'#a01b12',hot:1}
];""")

# ==================================================== 4. 强度 / 硬度
rep("""function sbHpMax(b){
  var A=Math.max(sbArea(b),1e-4);
  return Math.max(0.8,matDef(b.mat).hp*1.35/(1+0.35*Math.sqrt(A)));
}""",
"""function sbHpMax(b){
  if(b.invul)return 1e9;
  var A=Math.max(sbArea(b),1e-4);
  var base=Math.max(0.8,matDef(b.mat).hp*1.35/(1+0.35*Math.sqrt(A)));
  if(b.hard&&b.hard!=='normal'){
    var H=hardDef(b.hard);
    if(H.mul>=1e9)return 1e9;
    base=base*H.mul;
  }
  return base;
}
/* 换坚硬程度：立刻重算强度上限并把血填满 */
function sbSetHard(b,k){
  if(!b)return;
  b.hard=k;var H=hardDef(k);
  b.invul=(H.mul>=1e9);
  b.hpmax=sbHpMax(b);b.hp=b.hpmax;b.cracks=null;
}""")

rep("""    cracks:null,frag:!!o.frag,ttl:(o.ttl===undefined?0:o.ttl),""",
"""    cracks:null,frag:!!o.frag,ttl:(o.ttl===undefined?0:o.ttl),
    hard:(o.hard||SB.defHard||'normal'),invul:!!o.invul,fire:0,""")

rep("""  if(b.mat==='tnt'&&!b.boom)b.boom={kg:SB.boomKg,R:sbBoomR(SB.boomKg)};""",
"""  if(b.mat==='tnt'&&!b.boom)b.boom={kg:SB.boomKg,R:sbBoomR(SB.boomKg)};
  if(o.nuke)b.nuke={kt:(o.nuke.kt||SB.nukeKt)};""")

# ==================================================== 5. 环境：地面 / 空间
rep("""function sbWorld(opt){
  opt=opt||{};
  var g1=sbMake({shape:'box',stat:true,nofit:true,bw:60,bh:1,x:10,y:-0.5,mu:(opt.gmu===undefined?0.4:opt.gmu),e:0.1});
  SB.bodies.push(g1);
  if(opt.walls!==false){
    SB.bodies.push(sbMake({shape:'box',stat:true,nofit:true,bw:1,bh:40,x:-0.5,y:10,mu:0.1,e:0.2}));
    SB.bodies.push(sbMake({shape:'box',stat:true,nofit:true,bw:1,bh:40,x:20.5,y:10,mu:0.1,e:0.2}));
  }
}""",
"""function sbWorld(opt){
  opt=opt||{};
  if(SB.env==='space'){sbSpaceBox();return;}      // 空间模式：没有地面
  /* 地面做到 ±200 m 宽：把物体扔到远处也掉不出世界（这正是"地面不够用"的老毛病） */
  var g1=sbMake({shape:'box',stat:true,nofit:true,bw:400,bh:1,x:10,y:-0.5,
                 mu:(opt.gmu===undefined?0.4:opt.gmu),e:0.1});
  g1.env='ground';g1.mat='stone';SB.bodies.push(g1);
  if(opt.walls!==false){
    var w1=sbMake({shape:'box',stat:true,nofit:true,bw:1,bh:40,x:-0.5,y:10,mu:0.1,e:0.2});
    var w2=sbMake({shape:'box',stat:true,nofit:true,bw:1,bh:40,x:20.5,y:10,mu:0.1,e:0.2});
    w1.env='ground';w2.env='ground';w1.mat='stone';w2.mat='stone';
    SB.bodies.push(w1);SB.bodies.push(w2);
  }
}
/* 空间模式四周的"看不见的挡墙"，防止物体一直飞到找不回来 */
function sbSpaceBox(){
  if(!SB.spaceWall)return;
  var L=-40,R=60,B=-30,T=44,d=2,i;
  var defs=[[(L+R)/2,B-d/2,(R-L)+2*d,d],[(L+R)/2,T+d/2,(R-L)+2*d,d],
            [L-d/2,(B+T)/2,d,(T-B)+2*d],[R+d/2,(B+T)/2,d,(T-B)+2*d]];
  for(i=0;i<defs.length;i++){
    var b=sbMake({shape:'box',stat:true,nofit:true,bw:defs[i][2],bh:defs[i][3],
                  x:defs[i][0],y:defs[i][1],mu:0.05,e:0.6});
    b.env='space';b.ghost=1;b.mat='steel';SB.bodies.push(b);
  }
}
function sbEnvBodies(k){                     // 清掉某一类环境物体
  var out=[],i;
  for(i=0;i<SB.bodies.length;i++)if(SB.bodies[i].env!==k)out.push(SB.bodies[i]);
  SB.bodies=out;
}
function sbHasGround(){
  for(var i=0;i<SB.bodies.length;i++)if(SB.bodies[i].env==='ground')return true;
  return false;
}
function sbSetEnv(e){
  if(SB.env===e)return;
  SB.env=e;SB.dark=(e==='space')?1:0;
  sbPushUndo();
  SB.tiltG=0;sbUnTilt();
  if(e==='space'){
    sbEnvBodies('ground');
    SB.g=0;SB.gdir=-Math.PI/2;
    sbSpaceBox();
  }else{
    sbEnvBodies('space');
    SB.g=10;SB.gdir=-Math.PI/2;
    if(!sbHasGround())sbWorld();
  }
  SB.sel=null;SB.grab=null;SB.rot=null;SB.needFit=true;
  sbToast(e==='space'?'切到【空间】：失重、没有地面（四周有看不见的边界，不会飞丢）'
                     :'切到【地面】：恢复重力，地面和侧墙已放回');
  sbPanel();sbSelPanel();sbMobBar();sbAutoSave();
}""")

# ==================================================== 6. 生成物体：自动找空位
rep("""function sbAddAt(kind){
  var x=SB.mouse.wx,y=SB.mouse.wy;
  if(!isFinite(x)){x=SB.view.cx;y=SB.view.cy;}
  // 故意不写 m：让 sbMake 按「当前材质 × 面积」自动算，换材质立刻能看出轻重差别
  var o={x:x,y:y,e:SB.defE,mu:SB.defMu};
  if(kind==='circle'){o.shape='circle';o.r=0.5;o.mat=SB.defMat;}
  else if(kind==='tri'){o.shape='tri';o.bw=1;o.bh=1;o.mat=SB.defMat;}
  else if(kind==='rod'){o.shape='box';o.bw=2.6;o.bh=0.18;o.mat=SB.defMat;}
  else if(kind==='ramp'){o.shape='box';o.bw=6;o.bh=0.35;o.angle=-0.35;o.stat=true;o.color='#94a3b8';o.mat='stone';}
  else if(kind==='bomb'){o.shape='box';o.bw=0.58;o.bh=0.58;o.mat='tnt';o.boom={kg:SB.boomKg,R:sbBoomR(SB.boomKg)};o.fuse=(SB.boomFuse>0?SB.boomFuse:-1);}
  else if(kind==='wall'){o.shape='box';o.bw=0.4;o.bh=3;o.stat=true;o.color='#94a3b8';o.mat='stone';}
  else {o.shape='box';o.bw=0.9;o.bh=0.9;o.mat=SB.defMat;}
  return sbAdd(o);
}""",
"""/* 这块地方能不能放东西：粗筛半径 + 采样点判定（矩形用四角+中心） */
function sbBlocked(x,y,bw,bh,r,shape){
  var i,b,j,pad=0.05;
  for(i=0;i<SB.bodies.length;i++){
    b=SB.bodies[i];
    if(b.ghost)continue;
    var rr=(shape==='circle'?r:Math.sqrt(bw*bw+bh*bh)/2)+pad;
    if(Math.abs(x-b.x)>rr+sbRad(b))continue;
    if(Math.abs(y-b.y)>rr+sbRad(b))continue;
    var pts=[[x,y]];
    if(shape!=='circle'){
      pts.push([x-bw/2,y-bh/2],[x+bw/2,y-bh/2],[x+bw/2,y+bh/2],[x-bw/2,y+bh/2]);
    }
    for(j=0;j<pts.length;j++)if(sbPick(b,pts[j][0],pts[j][1]))return true;
    if(shape==='circle'&&b.shape==='circle'){
      var ddx=x-b.x,ddy=y-b.y,dl=Math.sqrt(ddx*ddx+ddy*ddy);
      if(dl<r+b.r+pad)return true;
    }
  }
  return false;
}
/* 新物体的安放点：先在鼠标处试，撞车了就螺旋外扩找最近的空位，还不成就往上抬 */
function sbFreeSpot(o){
  var bw=o.bw||0,bh=o.bh||0,r=o.r||0,shape=o.shape||'box';
  var x=SB.mouse.wx,y=SB.mouse.wy,k,rad,ang,tx,ty;
  if(!isFinite(x)||!isFinite(y)){x=SB.view.cx;y=SB.view.cy;}
  var lo=(shape==='circle'?r:bh/2)+0.03;
  for(k=0;k<33;k++){
    if(k===0){tx=x;ty=y;}
    else{
      rad=0.4+0.45*Math.floor((k-1)/8);ang=(k-1)%8/8*Math.PI*2;
      tx=x+Math.cos(ang)*rad;ty=y+Math.sin(ang)*rad;
    }
    if(SB.env!=='space'&&ty<lo)ty=lo;         // 别把物体埋进地面里
    tx=clamp(tx,-30,52);ty=clamp(ty,-2,40);
    if(!sbBlocked(tx,ty,bw,bh,r,shape))return [tx,ty];
  }
  return [clamp(x,-30,52),clamp(Math.max(y,lo+0.8),-2,40)];
}
function sbAddAt(kind){
  var o={e:SB.defE,mu:SB.defMu};
  // 故意不写 m：让 sbMake 按「当前材质 × 面积」自动算，换材质立刻能看出轻重差别
  if(kind==='circle'){o.shape='circle';o.r=0.5;o.mat=SB.defMat;}
  else if(kind==='tri'){o.shape='tri';o.bw=1;o.bh=1;o.mat=SB.defMat;}
  else if(kind==='rod'){o.shape='box';o.bw=2.6;o.bh=0.18;o.mat=SB.defMat;}
  else if(kind==='ramp'){o.shape='box';o.bw=6;o.bh=0.35;o.angle=-0.35;o.stat=true;o.color='#94a3b8';o.mat='stone';}
  else if(kind==='bomb'){o.shape='box';o.bw=0.58;o.bh=0.58;o.mat='tnt';
    o.boom={kg:SB.boomKg,R:sbBoomR(SB.boomKg)};o.fuse=(SB.boomFuse>0?SB.boomFuse:-1);}
  else if(kind==='nuke'){o.shape='box';o.bw=0.86;o.bh=0.98;o.mat='steel';o.hard='hard';
    o.boom={kg:SB.nukeKt*1000,R:sbNukeR(SB.nukeKt)};o.nuke={kt:SB.nukeKt};
    o.fuse=(SB.boomFuse>0?SB.boomFuse:-1);}
  else if(kind==='wall'){o.shape='box';o.bw=0.4;o.bh=3;o.stat=true;o.color='#94a3b8';o.mat='stone';}
  else {o.shape='box';o.bw=0.9;o.bh=0.9;o.mat=SB.defMat;}
  o.hard=(o.hard||SB.defHard||'normal');
  var sp=sbFreeSpot(o);
  o.x=sp[0];o.y=sp[1];
  return sbAdd(o);
}""")

# ==================================================== 7. 炸药：特效强度 + 引向核弹
rep("""  sbUnlink(b);
  sbExplode(b.x,b.y,kg,R);
}""",
"""  sbUnlink(b);
  if(b.nuke)sbNuke(b.x,b.y,b.nuke.kt||SB.nukeKt);
  else sbExplode(b.x,b.y,kg,R);
}""")

rep("""  if(!n){sbToast('场景里没有炸药，先点「＋炸药」放一个');return;}""",
    """  if(!n){sbToast('场景里没有炸药/核弹，先点「＋炸药」或「＋原子弹」放一个');return;}""")

rep("""  SB.shake=Math.min(1.6,SB.shake+0.55*Math.sqrt(Math.max(kg,0.05)));
  SB.flash=Math.min(1.1,SB.flash+0.7*Math.sqrt(Math.max(kg,0.05)));
  var sp=26+Math.min(48,Math.round(kg*7)),a0,s0;""",
"""  var FP=SB.fxP||1;
  SB.shake=Math.min(1.9,SB.shake+0.55*FP*Math.sqrt(Math.max(kg,0.05)));
  SB.flash=Math.min(1.25,SB.flash+0.7*FP*Math.sqrt(Math.max(kg,0.05)));
  var sp=sbFxN(26+Math.min(48,Math.round(kg*7))),a0,s0;""")

rep("""  var sm=10+Math.min(22,Math.round(kg*3));""",
    """  var sm=sbFxN(10+Math.min(22,Math.round(kg*3)));""")

rep("""  if(SB.fx.length>420)SB.fx.splice(0,SB.fx.length-420);""",
    """  var capF=Math.round(420*(SB.fxP||1));if(capF<200)capF=200;
  if(SB.fx.length>capF)SB.fx.splice(0,SB.fx.length-capF);""")

# ==================================================== 8. 核武 / 点火器
rep("""/* ==================================================================
   特效：火花 / 烟尘 / 火球 / 冲击波 / 画面震动
   ================================================================== */""",
"""/* ==================================================================
   原子弹 / 点火器
   ================================================================== */
function sbFxN(n){
  var p=SB.fxP;
  if(p===undefined||!isFinite(p))p=1;
  return Math.max(1,Math.round(n*p));
}
/* 当量 → 火球半径（kt 的 0.42 次方，量感上比严格标度更像"核爆"） */
function sbNukeR(kt){return 20*Math.pow(Math.max(kt,0.02),0.42);}
function sbAddNuke(){
  var x=SB.mouse.wx,y=SB.mouse.wy;
  if(!isFinite(x)){x=SB.view.cx;y=SB.view.cy;}
  var kt=SB.nukeKt;
  var o={shape:'box',bw:0.86,bh:0.98,x:x,y:y,mat:'steel',hard:'hard',
    boom:{kg:kt*1000,R:sbNukeR(kt)},nuke:{kt:kt},fuse:(SB.boomFuse>0?SB.boomFuse:-1)};
  o.hard=(o.hard||SB.defHard||'normal');
  var sp=sbFreeSpot(o);o.x=sp[0];o.y=sp[1];
  var b=sbAdd(o);
  if(b)sbToast('放了 '+fmt(kt,1)+' 千吨级核弹'+(SB.boomFuse>0?('，引信 '+fmt(SB.boomFuse,1)+' s'):'（撞到就炸，或点「全部引爆」）'));
  return b;
}
function sbNuke(x,y,kt){
  var R=sbNukeR(kt),i,b,dx,dy,d,d2,w,dv,ux,uy,core=R*0.30;
  var vapor=[],victims=[],FP=SB.fxP||1;
  /* 白热闪 → 火球 → 三道冲击波 → 蘑菇云 */
  SB.fx.push({k:'boom',x:x,y:y,R:R*0.42,t:0,life:0.55,kg:120*Math.min(kt,80)});
  SB.fx.push({k:'boom',x:x,y:y,R:R*0.95,t:0,life:1.5,kg:60*Math.min(kt,90)});
  SB.fx.push({k:'ring',x:x,y:y,R:R,t:0,life:0.9});
  SB.fx.push({k:'ring',x:x,y:y,R:R*1.7,t:0,life:1.6});
  SB.fx.push({k:'ring',x:x,y:y,R:R*2.6,t:0,life:2.4});
  var ns=Math.max(2,Math.round(3*FP));
  for(i=0;i<ns;i++){
    SB.fx.push({k:'shroom',x:x+(Math.random()-0.5)*R*0.3,y:y+0.6+i*0.5,
      vx:(Math.random()-0.5)*0.3,vy:1.5+Math.random()+Math.min(kt,60)*0.02,
      t:0,life:3.2+Math.random()*1.8,r0:Math.max(R*0.26*(1-0.1*i),0.4),grow:1.6+Math.random()*0.9});
  }
  var spn=sbFxN(60),a0,s0;
  for(i=0;i<spn;i++){
    a0=Math.random()*Math.PI*2;s0=(6+Math.random()*26)*Math.pow(Math.max(kt,1),0.3);
    SB.fx.push({k:'spark',x:x,y:y,vx:Math.cos(a0)*s0,vy:Math.sin(a0)*s0+3,
      t:0,life:0.5+Math.random()*0.9,c:(Math.random()<0.5?'#fff7cc':'#fb923c')});
  }
  SB.shake=Math.min(2.4,SB.shake+1.4*FP);
  SB.flash=Math.min(1.6,SB.flash+1.5*FP);
  sbNukeParts(x,y,R);
  /* 动的东西：核心区直接气化，外面按距离吃巨量伤害 + 被掀飞 + 点着 */
  for(i=0;i<SB.bodies.length;i++){
    b=SB.bodies[i];
    if(b.stat||b.ghost)continue;
    dx=b.x-x;dy=b.y-y;d=Math.sqrt(dx*dx+dy*dy);
    d2=Math.max(d-sbRad(b),0);
    if(d2>R)continue;
    if(b.boom&&!b.boom.done){b.fuse=0.06+Math.random()*0.25;continue;}
    if(b.invul)continue;
    if(d2<core){vapor.push(b);continue;}
    w=clamp(1-d2/R,0,1);w=w*w;
    if(w<=0.002)continue;
    sbHurt(b,9000*kt*Math.pow(w,1.25),b.x,b.y);
    if(b.gone)continue;
    if(matDef(b.mat).flam)b.fire=Math.max(b.fire||0,Math.min(1,0.5+w*1.5));
    ux=(d<1e-6)?0:dx/d;uy=(d<1e-6)?1:dy/d;
    dv=Math.min(52*Math.sqrt(kt)*w/(0.5+0.12*b.m),92);
    b.vx+=ux*dv;b.vy+=uy*dv+0.32*dv;b.w+=(Math.random()-0.5)*dv*0.7;
  }
  /* 自己摆的静态障碍（斜面/挡板）会被炸塌，但地面和边界不受影响 */
  for(i=0;i<SB.bodies.length;i++){
    b=SB.bodies[i];
    if(!b.stat||b.nofit||b.env||b.ghost||b.invul)continue;
    dx=b.x-x;dy=b.y-y;d2=Math.max(Math.sqrt(dx*dx+dy*dy)-sbRad(b),0);
    if(d2>R)continue;
    w=clamp(1-d2/R,0,1);w=w*w;
    b.hp-=6000*kt*Math.pow(w,1.25);
    if(b.hp<=0)victims.push(b);
  }
  sbFlushBreak();
  for(i=0;i<victims.length;i++)if(!victims[i].gone)sbBreak(victims[i],victims[i].x,victims[i].y);
  sbFlushBreak();
  for(i=0;i<vapor.length;i++){
    b=vapor[i];
    if(SB.sel===b)SB.sel=null;
    if(SB.grab&&SB.grab.b===b)SB.grab=null;
    sbUnlink(b);
    var idx=SB.bodies.indexOf(b);
    if(idx>=0)SB.bodies.splice(idx,1);
    b.gone=1;
    if(Math.random()<0.7*FP)SB.fx.push({k:'spark',x:b.x,y:b.y,
      vx:(Math.random()-0.5)*4,vy:1+Math.random()*3,t:0,life:0.5,c:'#fde68a'});
  }
  sbToast('核爆：'+fmt(kt,1)+' 千吨 · 火球半径 '+fmt(R,1)+' m');
}
function sbNukeParts(x,y,R){
  var P=SB.parts,i,p,dx,dy,d2,out=[],n=0,M,dd,pl;
  for(i=0;i<P.length;i++){
    p=P[i];dx=p.x-x;dy=p.y-y;d2=Math.sqrt(dx*dx+dy*dy);
    if(d2<R*0.55)continue;                                   // 核心区液体直接蒸发
    if(d2<R*1.4){
      M=matDef(p.mat);
      if(M.fuel||M.hot){p.burn=1;n++;}
      else{
        dd=Math.max(d2,0.2);pl=30*Math.pow(1-d2/(R*1.4),1.2);
        p.vx+=dx/dd*pl;p.vy+=dy/dd*pl;
      }
    }
    out.push(p);
  }
  SB.parts=out;
  return n;
}
/* ---------- 点火器 ---------- */
function sbSparkToggle(){
  SB.sparkMode=!SB.sparkMode;
  sbToast(SB.sparkMode?'点火器已打开：在画面里点一下/拖一下就能打出火星点燃燃料'
                      :'点火器已关闭');
  sbPanel();sbMobBar();
}
function sbIgniteAt(x,y,r){
  r=r||1.2;
  var P=SB.parts,i,p,dx,dy,hit=0,hitB=0,M,b,dd,ns,a0,s0;
  for(i=0;i<P.length;i++){
    p=P[i];M=matDef(p.mat);
    dx=p.x-x;dy=p.y-y;
    if(dx*dx+dy*dy>r*r)continue;
    if(M.fuel||M.hot){p.burn=1;hit++;}
  }
  for(i=0;i<SB.bodies.length;i++){
    b=SB.bodies[i];
    dx=b.x-x;dy=b.y-y;dd=Math.sqrt(dx*dx+dy*dy);
    if(dd>r+sbRad(b))continue;
    if(matDef(b.mat).flam){b.fire=Math.max(b.fire||0,0.55);hitB++;}
    if(b.boom&&!b.boom.done&&b.fuse<0)b.fuse=1.5+Math.random()*2.5;   // 炸药被火焰延迟引爆
  }
  ns=sbFxN(16);
  for(i=0;i<ns;i++){
    a0=Math.random()*Math.PI*2;s0=2+Math.random()*6;
    SB.fx.push({k:'spark',x:x,y:y,vx:Math.cos(a0)*s0,vy:Math.sin(a0)*s0+2.4,
      t:0,life:0.28+Math.random()*0.3,c:(Math.random()<0.6?'#fff3b0':'#fbbf24')});
  }
  return hit+hitB;
}
function sbIgniteAll(){
  var P=SB.parts,i,n=0,b,M;
  for(i=0;i<P.length;i++){
    M=matDef(P[i].mat);
    if(M.fuel||M.hot){P[i].burn=1;n++;}
  }
  for(i=0;i<SB.bodies.length;i++){
    b=SB.bodies[i];
    if(matDef(b.mat).flam&&!b.fire){b.fire=0.5;n++;}
    if(b.boom&&!b.boom.done&&b.fuse<0)b.fuse=1.2+Math.random()*2;
  }
  sbToast(n?('点着了 '+n+' 处'):'没有可燃物（先倒汽油或放木头）');
  return n;
}

/* ==================================================================
   特效：火花 / 烟尘 / 火球 / 冲击波 / 蘑菇云 / 画面震动
   ================================================================== */""")

rep("""  var n=6+Math.floor(Math.random()*5),i,a0,s0;""",
    """  var n=sbFxN(6+Math.floor(Math.random()*5)),i,a0,s0;""")
rep("""  SB.shake=Math.min(1,SB.shake+0.18);
}""",
    """  SB.shake=Math.min(1.2,SB.shake+0.18*(SB.fxP||1));
}""")
rep("""    else if(f.k==='dust'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.93;f.vy*=0.93;}""",
    """    else if(f.k==='dust'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.93;f.vy*=0.93;}
    else if(f.k==='shroom'){f.y+=f.vy*dt;f.x+=(f.vx||0)*dt;f.vy=(f.vy-0.2*dt)*0.985;}""")
rep("""    }else if(f.k==='spark'){""",
"""    }else if(f.k==='shroom'){
      var R3=(f.r0*(1+f.grow*Math.pow(u,0.6)))*SB.view.s;
      var al3=Math.min(u/0.15,1)*(1-u)*(1-u)*0.9;
      /* 蘑菇柄（往下连回地面） */
      g.fillStyle='rgba(120,104,92,'+(al3*0.5)+')';
      g.beginPath();
      g.moveTo(X-R3*0.30,Y);g.lineTo(X+R3*0.30,Y);
      g.lineTo(X+R3*0.18,Y+R3*1.2);g.lineTo(X-R3*0.18,Y+R3*1.2);
      g.closePath();g.fill();
      /* 蘑菇头：几团圆叠出翻滚的云顶 */
      var lobes=[[0,-0.18,1],[-0.62,0.12,0.72],[0.62,0.12,0.72],
                 [-0.32,-0.48,0.66],[0.32,-0.48,0.66],[0,-0.78,0.6]];
      for(k2=0;k2<lobes.length;k2++){
        var lx=X+lobes[k2][0]*R3,ly=Y+lobes[k2][1]*R3,lr=Math.max(lobes[k2][2]*R3*0.62,0.6);
        var gm=g.createRadialGradient(lx,ly,0,lx,ly,lr);
        gm.addColorStop(0,'rgba(92,78,68,'+(al3*0.95)+')');
        gm.addColorStop(0.6,'rgba(122,106,94,'+(al3*0.8)+')');
        gm.addColorStop(1,'rgba(150,135,120,0)');
        g.fillStyle=gm;g.beginPath();g.arc(lx,ly,lr,0,Math.PI*2);g.fill();
      }
    }else if(f.k==='spark'){""")

# ==================================================== 9. 液体粒子引擎
rep("""function sbPosFix(c){""",
"""/* ==================================================================
   液体 / 燃料：双密度松弛 SPH（Clavet 2005）
   几百颗粒子也能实时跑；和用户摆的刚体做单向碰撞（水能推动物体）
   ================================================================== */
function sbPartAdd(mat,x,y,vx,vy){
  if(SB.parts.length>=(SB.pmax||420))return null;
  var M=matDef(mat||'water');
  var p={mat:mat||'water',x:x,y:y,vx:vx||0,vy:vy||0,x0:x,y0:y,
         rho:0,rn:0,burn:0,fuel:(M.fuel||0),ig:0,nb:null};
  if(M.hot)p.burn=1;
  SB.parts.push(p);
  return p;
}
function sbClearParts(){SB.parts=[];SB.pgrid=null;}
function sbPartPour(mat,x,y,w,h){
  var p=SBPR.pitch,n=0,i,j,px,py,q;
  var cols=Math.max(1,Math.round(w/p)),rows=Math.max(1,Math.round(h/p));
  for(j=0;j<rows;j++)for(i=0;i<cols;i++){
    px=x+i*p+(j%2?p*0.5:0)+(Math.random()-0.5)*0.02;
    py=y+j*p+(Math.random()-0.5)*0.02;
    q=sbPartAdd(mat,px,py,0,0);
    if(q)n++;else return n;
  }
  return n;
}
function sbPour(mat){
  var x=SB.mouse.wx,y=SB.mouse.wy;
  if(!isFinite(x)||!isFinite(y)){x=SB.view.cx;y=(SB.env==='space'?SB.view.cy:1.2);}
  var w=(SB.pourW||2.4),hh=Math.max(0.5,w*0.42);
  var n=sbPartPour(mat,x-w/2,y,w,hh);
  sbToast('倒了 '+n+' 颗'+matDef(mat).n+(matDef(mat).fuel?'（可以点燃，试试「火花点火」）':''));
  return n;
}
function sbPartGrid(){
  var cs=SBPR.h,g={},P=SB.parts,i,k;
  for(i=0;i<P.length;i++){
    var p=P[i];
    k=(Math.floor(p.x/cs)+1024)*4096+(Math.floor(p.y/cs)+1024);
    if(!g[k])g[k]=[p];else g[k].push(p);
  }
  SB.pgrid=g;
}
function sbPartNbr(p){
  var cs=SBPR.h,gi=Math.floor(p.x/cs),gj=Math.floor(p.y/cs),i,j,a,t;
  p.nb=[];
  for(i=-1;i<=1;i++)for(j=-1;j<=1;j++){
    a=SB.pgrid[(gi+i+1024)*4096+(gj+j+1024)];
    if(!a)continue;
    for(t=0;t<a.length;t++)if(a[t]!==p)p.nb.push(a[t]);
  }
}
function sbPartVisc(dt){
  var P=SB.parts,i,j,p,q,dx,dy,r,nx,ny,u,I,nb;
  var h=SBPR.h,sg=SBPR.sig,bt=SBPR.beta;
  for(i=0;i<P.length;i++){
    p=P[i];nb=p.nb;if(!nb)continue;
    for(j=0;j<nb.length;j++){
      q=nb[j];dx=q.x-p.x;dy=q.y-p.y;r=Math.sqrt(dx*dx+dy*dy);
      if(r>=h||r<1e-9)continue;
      nx=dx/r;ny=dy/r;
      u=(p.vx-q.vx)*nx+(p.vy-q.vy)*ny;
      if(u>0){
        I=dt*(1-r/h)*(sg*u+bt*u*u);
        if(I>0.6)I=0.6;
        I*=0.5;
        p.vx-=nx*I;p.vy-=ny*I;
        q.vx+=nx*I;q.vy+=ny*I;
      }
    }
  }
}
function sbPartRelax(dt){
  var P=SB.parts,i,j,p,q,dx,dy,r,q1,press,pn,D,nx,ny,nb;
  var h=SBPR.h,k1=SBPR.k,k2=SBPR.kNear,r0=SBPR.rho0,dt2=dt*dt,lim=h*0.35,rho,rn;
  for(i=0;i<P.length;i++){
    p=P[i];nb=p.nb;if(!nb)continue;
    rho=0;rn=0;
    for(j=0;j<nb.length;j++){
      q=nb[j];dx=q.x-p.x;dy=q.y-p.y;r=Math.sqrt(dx*dx+dy*dy);
      if(r>=h)continue;
      q1=1-r/h;rho+=q1*q1;rn+=q1*q1*q1;
    }
    p.rho=rho;p.rn=rn;
  }
  for(i=0;i<P.length;i++){
    p=P[i];nb=p.nb;if(!nb)continue;
    press=(p.rho-r0)*k1;
    if(press<0)press*=0.35;               // 负压（表面）弱一点，不然会缩成一颗珠
    pn=p.rn*k2;
    for(j=0;j<nb.length;j++){
      q=nb[j];dx=q.x-p.x;dy=q.y-p.y;r=Math.sqrt(dx*dx+dy*dy);
      if(r>=h||r<1e-9)continue;
      q1=1-r/h;nx=dx/r;ny=dy/r;
      D=dt2*(press*q1+pn*q1*q1);
      if(D>lim)D=lim;else if(D<-lim)D=-lim;
      D*=0.5;
      p.x-=nx*D;p.y-=ny*D;
      q.x+=nx*D;q.y+=ny*D;
    }
  }
}
/* 缓存刚体的当前形状（一帧一次够用：粒子步进时刚体其实没在动） */
function sbPartPrep(){
  var out=[],i,b,o,k,mx,dd;
  for(i=0;i<SB.bodies.length;i++){
    b=SB.bodies[i];
    o={b:b,x:b.x,y:b.y,vx:b.vx||0,vy:b.vy||0,stat:!!b.stat,
       invM:b.stat?0:(b.invM||0),mat:b.mat,fire:!!b.fire};
    if(b.shape==='circle'){o.c=1;o.r=b.r;o.brad=b.r;}
    else{
      o.c=0;o.V=sbVerts(b);mx=0;
      for(k=0;k<o.V.length;k++){
        dd=Math.sqrt((o.V[k][0]-b.x)*(o.V[k][0]-b.x)+(o.V[k][1]-b.y)*(o.V[k][1]-b.y));
        if(dd>mx)mx=dd;
      }
      o.brad=mx;
    }
    out.push(o);
  }
  SB.pbodies=out;
}
/* 多边形最近的边：告诉粒子"从哪条边钻出去最快" */
function sbPolyInfo(o,x,y){
  var V=o.V,i,best=null,A,B,ex,ey,L2,t,cx,cy,d;
  for(i=0;i<V.length;i++){
    A=V[i];B=V[(i+1)%V.length];
    ex=B[0]-A[0];ey=B[1]-A[1];L2=ex*ex+ey*ey;
    t=L2>1e-12?((x-A[0])*ex+(y-A[1])*ey)/L2:0;
    if(t<0)t=0;else if(t>1)t=1;
    cx=A[0]+ex*t;cy=A[1]+ey*t;
    d=Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy));
    if(!best||d<best.d)best={d:d,cx:cx,cy:cy};
  }
  return best;
}
function sbPartPush(p){
  var L=SB.pbodies,i,o,b,nx,ny,pen,dx,dy,d,res,M,rp=SBPR.rad,ins,rvx,rvy,vn,J;
  if(!L)return;
  for(i=0;i<L.length;i++){
    o=L[i];b=o.b;
    dx=p.x-o.x;dy=p.y-o.y;d=Math.sqrt(dx*dx+dy*dy);
    if(d>o.brad+rp+0.05)continue;
    if(o.c){
      if(d>=o.r+rp)continue;
      nx=d>1e-9?dx/d:0;ny=d>1e-9?dy/d:1;
      pen=o.r+rp-d;
    }else{
      res=sbPolyInfo(o,p.x,p.y);
      if(!res)continue;
      ins=sbInPoly([p.x,p.y],o.V);
      var sd=ins?-res.d:res.d;
      if(sd>=rp)continue;
      pen=rp-sd;dx=p.x-res.cx;dy=p.y-res.cy;
      d=Math.sqrt(dx*dx+dy*dy);
      if(d<1e-9){nx=0;ny=1;}
      else if(ins){nx=-dx/d;ny=-dy/d;}
      else{nx=dx/d;ny=dy/d;}
    }
    p.x+=nx*pen;p.y+=ny*pen;
    if(!isFinite(p.x)||!isFinite(p.y)){p.x=o.x;p.y=o.y+1;p.vx=0;p.vy=0;continue;}
    rvx=p.vx-o.vx;rvy=p.vy-o.vy;vn=rvx*nx+rvy*ny;
    if(vn<0){
      rvx-=nx*vn;rvy-=ny*vn;                 // 去掉法向来速
      rvx*=0.84;rvy*=0.84;                   // 切向摩擦：贴着壁面滑
      p.vx=rvx+o.vx;p.vy=rvy+o.vy;
      /* 给动态物体一点反作用力：水流真的能把东西推动 */
      if(!o.stat&&o.invM>0){
        J=Math.min(1.5,-vn)*0.024;
        b.vx-=nx*J*o.invM*8;b.vy-=ny*J*o.invM*8;
        if(!isFinite(b.vx))b.vx=0;
        if(!isFinite(b.vy))b.vy=0;
      }
    }
    /* 水灭火 / 岩浆点火 / 烧着的液体点燃刚体 */
    M=matDef(p.mat);
    if(M.wet&&b.fire>0){b.fire=Math.max(0,b.fire-0.06);if(b.fire<0.05)b.fire=0;}
    else if(M.hot&&matDef(b.mat).flam&&!b.fire){b.fire=0.15;}
    else if(p.burn>0&&matDef(b.mat).flam&&!b.fire){b.fire=0.2;}
  }
}
function sbPartSub(dt){
  var P=SB.parts,i,p,n=P.length,f;
  sbPartGrid();
  for(i=0;i<n;i++)sbPartNbr(P[i]);
  sbPartVisc(dt);
  for(i=0;i<n;i++){
    p=P[i];
    p.x0=p.x;p.y0=p.y;
    p.vx+=SB.gx*dt;p.vy+=SB.gy*dt;
    if(SB.air>0){f=1-SB.air*dt*0.5;p.vx*=f;p.vy*=f;}
    p.vx=clamp(p.vx,-45,45);p.vy=clamp(p.vy,-45,45);
    p.x+=p.vx*dt;p.y+=p.vy*dt;
  }
  sbPartRelax(dt);
  for(i=0;i<n;i++)sbPartPush(P[i]);
  for(i=0;i<n;i++){
    p=P[i];
    if(!isFinite(p.x)||!isFinite(p.y)){p.x=p.x0;p.y=p.y0;p.vx=0;p.vy=0;continue;}
    p.vx=clamp((p.x-p.x0)/dt,-45,45);
    p.vy=clamp((p.y-p.y0)/dt,-45,45);
  }
}
function sbPartStep(dt){
  var n=SB.parts.length,s,h;
  SB.pcount=n;
  if(!n||!SB.run)return;
  if(dt>1/40)dt=1/40;
  sbPartPrep();
  h=dt/2;
  for(s=0;s<2;s++)sbPartSub(h);
}
/* 燃料在烧：一边冒火焰一边消耗，烧完化成一小撮烟 */
function sbPartBurn(dt){
  var P=SB.parts,i,p,out=[],M;
  if(!P.length)return;
  for(i=0;i<P.length;i++){
    p=P[i];M=matDef(p.mat);
    if(p.burn>0){
      p.burn-=dt*0.55;
      if(p.fuel>0)p.fuel-=dt*0.42;
      if(Math.random()<0.18*(SB.fxP||1)){
        SB.fx.push({k:'spark',x:p.x,y:p.y,vx:(Math.random()-0.5)*1.2,vy:1.6+Math.random()*2.4,
          t:0,life:0.32+Math.random()*0.32,c:(Math.random()<0.5?'#ffd166':'#ff7b2c')});
      }
      if(Math.random()<0.03*(SB.fxP||1))SB.fx.push({k:'smoke',x:p.x,y:p.y+0.2,
        vx:(Math.random()-0.5)*0.7,vy:1.2,t:0,life:1.1,r0:0.15,r1:0.7});
      sbSpreadFire(p,dt);
      if(p.burn<=0||p.fuel<=0){
        if(Math.random()<0.6)SB.fx.push({k:'smoke',x:p.x,y:p.y,vx:0,vy:0.8,t:0,life:0.8,r0:0.12,r1:0.5});
        continue;                          // 烧光了 → 一小撮烟后消失
      }
    }
    out.push(p);
  }
  SB.parts=out;
}
/* 火顺着燃料蔓延（用网格找邻居，避免 O(n²)） */
function sbSpreadFire(p,dt){
  if(!SB.pgrid)sbPartGrid();
  var cs=SBPR.h,gi=Math.floor(p.x/cs),gj=Math.floor(p.y/cs),i,j,a,t,q,M,dx,dy;
  for(i=-1;i<=1;i++)for(j=-1;j<=1;j++){
    a=SB.pgrid[(gi+i+1024)*4096+(gj+j+1024)];
    if(!a)continue;
    for(t=0;t<a.length;t++){
      q=a[t];
      if(q.burn>0)continue;
      M=matDef(q.mat);
      if(!M.fuel)continue;
      dx=q.x-p.x;dy=q.y-p.y;
      if(dx*dx+dy*dy>0.40)continue;
      q.ig=(q.ig||0)+dt;
      if(q.ig>0.10+Math.random()*0.22)q.burn=1;
    }
  }
}
/* 物体着火：掉血 + 冒火苗 + 引爆炸药 */
function sbFireStep(dt){
  var i,b,M;
  for(i=0;i<SB.bodies.length;i++){
    b=SB.bodies[i];
    if(!b.fire||b.fire<=0)continue;
    M=matDef(b.mat);
    b.fire-=dt*(M.flam?0.05:0.5);
    if(b.fire<=0){b.fire=0;continue;}
    b.hp-=dt*(10+45*b.fire);
    if(Math.random()<0.5*(SB.fxP||1)){
      SB.fx.push({k:'spark',x:b.x+(Math.random()-0.5)*(b.bw||b.r||1),
        y:b.y+(Math.random()-0.5)*(b.bh||b.r||1),
        vx:(Math.random()-0.5)*1.4,vy:1.8+Math.random()*2.4,
        t:0,life:0.4+Math.random()*0.4,c:(Math.random()<0.5?'#fbbf24':'#f97316')});
    }
    if(Math.random()<0.10*(SB.fxP||1))SB.fx.push({k:'smoke',x:b.x,y:b.y+((b.bh||b.r||1)/2),
      vx:(Math.random()-0.5),vy:1.4,t:0,life:1.4,r0:0.2,r1:1.0});
    if(SB.fragOn&&b.hp<=0&&!b.stat&&!b.invul)SB.brk.push({b:b,px:b.x,py:b.y});
  }
  sbFlushBreak();
}
function sbPartSnap(){
  var out=[],P=SB.parts,i,p,n=Math.min(P.length,300);
  for(i=0;i<n;i++){
    p=P[i];
    out.push({m:p.mat,x:+p.x.toFixed(3),y:+p.y.toFixed(3),
      vx:+p.vx.toFixed(3),vy:+p.vy.toFixed(3),b:p.burn?1:0,f:+(p.fuel||0).toFixed(2)});
  }
  return out;
}
function sbPartRestore(arr){
  SB.parts=[];
  if(!arr)return;
  for(var i=0;i<arr.length;i++){
    var d=arr[i],p=sbPartAdd(d.m,d.x,d.y,d.vx,d.vy);
    if(!p)break;
    if(d.b)p.burn=1;
    if(d.f!==undefined)p.fuel=d.f;
  }
}
/* ---------- 液体画法：本体 + 内部高光 + 火苗 ---------- */
function sbPartDraw(g){
  var P=SB.parts,n=P.length,i,p,M,X,Y,pr,t,rr,gm;
  if(!n)return;
  pr=Math.max(2,SBPR.rad*SB.view.s);
  t=Date.now()*0.003;
  for(i=0;i<n;i++){
    p=P[i];M=matDef(p.mat);X=sbX(p.x);Y=sbY(p.y);
    if(p.burn>0&&(M.fuel||M.hot)){g.fillStyle=(Math.floor(i+t*3)%2?'#ffbe4d':'#ff8a3c');}
    else if(M.hot){g.fillStyle=(Math.floor(i+t*2)%3?'#ff8c3a':'#e2562c');}
    else g.fillStyle=M.c;
    g.beginPath();g.arc(X,Y,pr*1.6,0,Math.PI*2);g.fill();
  }
  g.globalAlpha=0.26;
  for(i=0;i<n;i++){
    p=P[i];
    g.fillStyle=(p.burn>0?'#fff3b8':'#ffffff');
    g.beginPath();g.arc(sbX(p.x)-pr*0.34,sbY(p.y)-pr*0.42,pr*0.72,0,Math.PI*2);g.fill();
  }
  g.globalAlpha=1;
  for(i=0;i<n;i++){
    p=P[i];
    if(!(p.burn>0))continue;
    X=sbX(p.x);Y=sbY(p.y);
    rr=Math.max(pr*(1.7+0.5*Math.sin(i*2.1+t*3)),1);
    gm=g.createRadialGradient(X,Y-pr,0,X,Y-pr,rr*2.3);
    gm.addColorStop(0,'rgba(255,235,170,.9)');
    gm.addColorStop(0.45,'rgba(249,146,22,.55)');
    gm.addColorStop(1,'rgba(239,68,68,0)');
    g.fillStyle=gm;g.beginPath();g.arc(X,Y-pr,rr*2.3,0,Math.PI*2);g.fill();
  }
}

function sbPosFix(c){""")

# ==================================================== 10. 主循环
rep("""  sbFuse(dt);
  sbFxStep(dt);
  sbDecay(dt);""",
"""  sbFuse(dt);
  sbFxStep(dt);
  sbPartStep(dt);
  sbPartBurn(dt);
  sbFireStep(dt);
  sbDecay(dt);""")

# ==================================================== 11. 渲染
rep("""  g.clearRect(0,0,W,H);
  SB.view.W=W;SB.view.H=H;""",
"""  g.clearRect(0,0,W,H);
  SB.view.W=W;SB.view.H=H;
  if(SB.dark)sbDrawSpace(g,W,H);""")

rep("""    g.strokeStyle='#eef2f7';g.lineWidth=1;""",
    """    g.strokeStyle=(SB.dark?'rgba(148,163,184,.12)':'#eef2f7');g.lineWidth=1;""")
rep("""      if(x%2===0)label(g,X+2,H-4,x+'m','#cbd5e1','left');""",
    """      if(x%2===0)label(g,X+2,H-4,x+'m',(SB.dark?'rgba(148,163,184,.55)':'#cbd5e1'),'left');""")
rep("""      if(y%2===0)label(g,4,Y-2,y+'m','#cbd5e1','left');""",
    """      if(y%2===0)label(g,4,Y-2,y+'m',(SB.dark?'rgba(148,163,184,.55)':'#cbd5e1'),'left');""")
rep("""    if(gy>=0&&gy<=H){g.strokeStyle='#94a3b8';g.lineWidth=1.5;g.beginPath();g.moveTo(0,gy);g.lineTo(W,gy);g.stroke();}""",
    """    if(gy>=0&&gy<=H&&SB.env!=='space'){g.strokeStyle=(SB.dark?'rgba(148,163,184,.45)':'#94a3b8');g.lineWidth=1.5;g.beginPath();g.moveTo(0,gy);g.lineTo(W,gy);g.stroke();}""")

rep("""  /* 场（背景层） */
  sbDrawField(g,W,H);""",
"""  /* 场（背景层） */
  sbDrawField(g,W,H);

  /* 液体（画在刚体之下，看上去像是物体泡在水里） */
  if(SB.parts.length)sbPartDraw(g);""")

rep("""  label(g,10,16,'物体 '+SB.bodies.length+' · 约束 '+SB.links.length+' · 接触 '+SB.nc+' · '+fmt(SB.fps,0)+'fps · '+(SB.run?'运行中':'已暂停'),'#6b7280','left');""",
"""  label(g,10,16,'物体 '+SB.bodies.length+' · 约束 '+SB.links.length+' · 接触 '+SB.nc+
    (SB.pcount?(' · 液体 '+SB.pcount):'')+' · '+fmt(SB.fps,0)+'fps · '+(SB.run?'运行中':'已暂停'),
    (SB.dark?'rgba(226,232,240,.85)':'#6b7280'),'left');""")
rep("""    label(g,W-10,16,'g = '+fmt(SB.g,1)+' m/s² '+(Math.abs(gdeg+90)<3?'↓':(gdeg+'°')),'#94a3b8','right');""",
"""    label(g,W-10,16,'g = '+fmt(SB.g,1)+' m/s² '+(Math.abs(gdeg+90)<3?'↓':(gdeg+'°')),
      (SB.dark?'rgba(226,232,240,.7)':'#94a3b8'),'right');
    if(SB.env==='space')label(g,10,32,'空间模式 · 失重（四周有看不见的边界）',
      (SB.dark?'rgba(148,197,253,.95)':'#2563eb'),'left');""")

rep("""function sbDrawBody(g,b){
  var X=sbX(b.x),Y=sbY(b.y);""",
"""/* 空间模式的星空背景（带视差：拖动时星星会慢慢走） */
function sbStarsInit(){
  if(SB.stars)return;
  var a=[],i,x,y,r;
  for(i=0;i<160;i++){
    x=(Math.sin(i*12.9898)*43758.5453)%1;if(x<0)x+=1;
    y=(Math.sin(i*78.233)*12345.6789)%1;if(y<0)y+=1;
    r=(Math.sin(i*39.346)*24634.6345)%1;if(r<0)r+=1;
    a.push([x,y,0.5+r*1.4]);
  }
  SB.stars=a;
}
function sbDrawSpace(g,W,H){
  sbStarsInit();
  var gr=g.createLinearGradient(0,0,0,H);
  gr.addColorStop(0,'#0b1026');gr.addColorStop(0.55,'#111a3a');gr.addColorStop(1,'#0a0f22');
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.fillStyle='rgba(99,102,241,.10)';
  g.beginPath();
  g.arc(((W*0.7-SB.view.cx*SB.view.s*0.05)%W+W)%W,((H*0.3+SB.view.cy*SB.view.s*0.05)%H+H)%H,
    Math.min(W,H)*0.45,0,Math.PI*2);g.fill();
  var S=SB.stars,i,s,X,Y;
  for(i=0;i<S.length;i++){
    s=S[i];
    X=((s[0]*W-SB.view.cx*SB.view.s*0.08)%W+W)%W;
    Y=((s[1]*H+SB.view.cy*SB.view.s*0.08)%H+H)%H;
    g.fillStyle='rgba(226,232,240,'+(0.22+0.5*s[2]/2)+')';
    g.beginPath();g.arc(X,Y,s[2]*0.9,0,Math.PI*2);g.fill();
  }
}
function sbDrawBody(g,b){
  if(b.ghost)return;                 // 空间边界是隐形的：参与碰撞但不画出来
  var X=sbX(b.x),Y=sbY(b.y);""")

rep("""  sbDamage(g,b,X,Y);
  g.globalAlpha=1;""",
"""  sbDamage(g,b,X,Y);
  g.globalAlpha=1;
  /* 着火：整体烤成橙色，还会一闪一闪 */
  if(b.fire>0){
    var fa=clamp(b.fire,0,1);
    g.fillStyle='rgba(249,115,22,'+(0.20+0.32*fa*(0.6+0.4*Math.sin(Date.now()*0.012)))+')';
    g.beginPath();g.arc(X,Y,sbRad(b)*SB.view.s*1.05,0,Math.PI*2);g.fill();
  }""")

rep("""  /* 质心 */
  g.fillStyle='#0f172a';""",
"""  /* 核弹：黄色脉冲 + 三颗转圈的辐射点 */
  if(b.nuke&&b.boom&&!b.boom.done){
    var pl2=0.5+0.5*Math.sin(Date.now()*0.004);
    g.strokeStyle='rgba(250,204,21,'+(0.35+0.5*pl2)+')';g.lineWidth=2.5;
    var rr2=sbRad(b)*SB.view.s+8+5*pl2;
    g.beginPath();g.arc(X,Y,rr2,0,Math.PI*2);g.stroke();
    g.fillStyle='rgba(250,204,21,.9)';
    for(var k3=0;k3<3;k3++){
      var a3=Date.now()*0.0012+k3*Math.PI*2/3;
      g.beginPath();g.arc(X+Math.cos(a3)*rr2*0.72,Y+Math.sin(a3)*rr2*0.72,2.6,0,Math.PI*2);g.fill();
    }
    if(b.fuse>=0)label(g,X,Y-sbRad(b)*SB.view.s-10,'核 '+fmt(Math.max(b.fuse,0),1)+'s','#f59e0b','center');
  }
  /* 质心 */
  g.fillStyle='#0f172a';""")

# ==================================================== 12. 读数面板
rep("""    ['物体数 / 接触',SB.bodies.length+' / '+SB.nc],""",
"""    ['物体数 / 接触',SB.bodies.length+' / '+SB.nc],
    ['环境',(SB.env==='space'?'空间（失重）':'地面')+' · g='+fmt(SB.g,1)],
    ['液体 / 着火',SB.pcount+' 颗 / '+(function(){
       var n=0;for(var i=0;i<SB.bodies.length;i++)if(SB.bodies[i].fire>0)n++;return n;})()+' 个'],""")

rep("""    if(b.boom)rows.push(['炸药',fmt(b.boom.kg,2)+' kg TNT · 半径 '+fmt(b.boom.R,2)+' m'+
      (b.fuse>=0?(' · 引信 '+fmt(Math.max(b.fuse,0),2)+' s'):' · 撞击起爆')]);""",
"""    rows.push(['坚硬程度',hardDef(b.hard||'normal').n+(b.invul?'（打不碎）':'')+
      ' · hp '+fmt(b.hp,1)+'/'+fmt(b.hpmax,1)]);
    if(b.fire>0)rows.push(['着火','强度 '+fmt(b.fire,2)+'（正在掉血）']);
    if(b.boom)rows.push(['炸药',fmt(b.boom.kg,2)+' kg TNT · 半径 '+fmt(b.boom.R,2)+' m'+
      (b.fuse>=0?(' · 引信 '+fmt(Math.max(b.fuse,0),2)+' s'):' · 撞击起爆')]);
    if(b.nuke)rows.push(['核武器',fmt(b.nuke.kt,2)+' 千吨 TNT · 火球 '+fmt(sbNukeR(b.nuke.kt),1)+' m']);""")

# ==================================================== 13. 左侧面板
rep("""    '<b>爆破玩法</b>：左下工具「＋炸药」放一个，点「引爆」；也可以把引信设成几秒，看它倒计时炸开</div>';""",
"""    '<b>爆破玩法</b>：左下工具「＋炸药」放一个，点「引爆」；也可以把引信设成几秒，看它倒计时炸开<br>'+
    '<b>液体与点火</b>：先倒一滩水/汽油/油/岩浆（会流动），点「火花点火」后在汽油池或木堆上点一下就着<br>'+
    '<b>环境与硬度</b>：环境里可切「地面 / 空间（失重）」；坚硬程度决定新放的物体多容易被撞碎</div>';""")

rep("""    ['＋斜面',function(){sbAddAt('ramp');}],
    ['＋挡板',function(){sbAddAt('wall');}],
    ['＋炸药',function(){sbAddAt('bomb');}],""",
"""    ['＋斜面',function(){sbAddAt('ramp');}],
    ['＋挡板',function(){sbAddAt('wall');}],
    ['＋炸药',function(){sbAddAt('bomb');}],
    ['＋原子弹',function(){sbAddAt('nuke');}],""")

rep("""  /* ---- 材质 · 破碎 · 爆破 ---- */""",
"""  /* ---- 环境：地面 / 空间 ---- */
  var sE=document.createElement('div');sE.className='sec';sE.textContent='环境';
  box.appendChild(sE);
  box.appendChild(sbTools([
    ['地面（有重力·有地）',function(){sbSetEnv('ground');},SB.env==='ground'?'on':''],
    ['空间（失重·无地面）',function(){sbSetEnv('space');},SB.env==='space'?'on':'']
  ]));
  (function(){
    var ckE=document.createElement('div');ckE.className='chkrow';
    var l=document.createElement('label');
    var ci=document.createElement('input');ci.type='checkbox';ci.checked=!!SB.spaceWall;
    ci.onchange=function(){
      SB.spaceWall=ci.checked;
      if(SB.env==='space'){sbEnvBodies('space');sbSpaceBox();}
      sbAutoSave();
    };
    l.appendChild(ci);l.appendChild(document.createTextNode('空间边界（看不见的挡墙）'));
    ckE.appendChild(l);box.appendChild(ckE);
  })();
  var nE=document.createElement('div');nE.className='note';
  nE.innerHTML='<b>地面</b>：常规重力 + 地面 + 两侧挡板，适合斜面/碰撞/堆叠。<br>'+
    '<b>空间</b>：g 归零、地面消失，物体会一直漂；倒出来的液体会团成一个球漂着。';
  box.appendChild(nE);

  /* ---- 材质 · 破碎 · 爆破 ---- */""")

rep("""  box.appendChild(sbTools(MATS.map(function(M){
    return [M.n,function(){SB.defMat=M.k;sbPanel();},SB.defMat===M.k?'on':''];
  })));""",
"""  box.appendChild(sbTools(SOLIDS().map(function(M){
    return [M.n,function(){SB.defMat=M.k;sbPanel();},SB.defMat===M.k?'on':''];
  })));""")

rep("""  sbSlider(box,'引信 (s，0=撞到就炸)',0,10,0.5,function(){return SB.boomFuse;},
    function(v){SB.boomFuse=v;});""",
"""  sbSlider(box,'引信 (s，0=撞到就炸)',0,10,0.5,function(){return SB.boomFuse;},
    function(v){SB.boomFuse=v;});
  sbSlider(box,'核弹当量 (千吨 TNT)',0.5,100,0.5,function(){return SB.nukeKt;},
    function(v){SB.nukeKt=clamp(v,0.1,500);});
  sbSlider(box,'特效强度 (%)',20,200,10,function(){return Math.round((SB.fxP||1)*100);},
    function(v){SB.fxP=clamp(v/100,0.2,2);});
  box.appendChild(sbTools([
    ['＋原子弹',function(){sbAddNuke();}],
    ['全部引爆',function(){sbDetonateAll();}],
    ['液体上限 '+SB.pmax,function(){
      SB.pmax=(SB.pmax>=900)?240:(SB.pmax>=420?900:420);sbPanel();}]
  ]));""")

rep("""    '炸药撞到就炸，也可以设引信延时；几个炸药放一起会<b>殉爆</b>。';
  box.appendChild(nMat);""",
"""    '炸药撞到就炸，也可以设引信延时；几个炸药放一起会<b>殉爆</b>。';
  box.appendChild(nMat);

  /* ---- 坚硬程度 ---- */
  var sHd=document.createElement('div');sHd.className='sec';
  sHd.textContent='坚硬程度（新放的物体 · 同时改选中物体）';
  box.appendChild(sHd);
  box.appendChild(sbTools(HARDS.map(function(H){
    return [H.n,function(){
      SB.defHard=H.k;
      if(SB.sel)sbSetHard(SB.sel,H.k);
      sbToast('以后新物体＝'+H.n+(SB.sel?('，选中的 #'+SB.sel.id+' 也改成了'+H.n):''));
      sbPanel();sbSelPanel();
    },SB.defHard===H.k?'on':''];
  })));
  var nHd=document.createElement('div');nHd.className='note';
  nHd.innerHTML='坚硬程度是材质强度的<b>倍数</b>：脆弱 0.22×、普通 1×、坚硬 6×、超硬 60×、不可破坏永远不碎。<br>'+
    '例：普通玻璃约 2.8 m/s 就碎，选<b>坚硬</b>后要 6.9 m/s，选<b>超硬</b>后要 22 m/s。';
  box.appendChild(nHd);

  /* ---- 液体 / 燃料 / 点火 ---- */
  var sLq=document.createElement('div');sLq.className='sec';
  sLq.textContent='液体 / 燃料（会流动 · 可点燃）';
  box.appendChild(sLq);
  box.appendChild(sbTools(LIQS().map(function(M){
    return ['＋'+M.n,function(){sbPour(M.k);},''];
  })));
  box.appendChild(sbTools([
    ['火花点火'+(SB.sparkMode?'（已开）':''),function(){sbSparkToggle();},SB.sparkMode?'pri':''],
    ['全部点燃',function(){sbIgniteAll();}],
    ['清空液体',function(){sbClearParts();sbToast('液体已清空');}]
  ]));
  sbSlider(box,'倒液体的宽度 (m)',0.6,6,0.2,function(){return SB.pourW;},
    function(v){SB.pourW=clamp(v,0.4,8);});
  var nQ=document.createElement('div');nQ.className='note';
  nQ.innerHTML='液体由几百颗小粒子实时计算，越多越吃性能（可用上面的「液体上限」循环切换）。<br>'+
    '<b>汽油 / 油</b>能烧：点「火花点火」后在汽油池或木堆上点一下就着，火会顺着燃料蔓延；'+
    '<b>水</b>能浇灭火；<b>岩浆</b>碰到木头直接引燃。';
  box.appendChild(nQ);""")

# ==================================================== 14. 选中面板：硬度 / 核弹
rep("""  sbSlider(box,'质量 m (kg)',0.05,600,0.1,function(){return b.m;},function(v){b.m=Math.max(0.05,v);sbMass(b);});""",
"""  var sHd2=document.createElement('div');sHd2.className='sec';sHd2.textContent='坚硬程度';
  box.appendChild(sHd2);
  box.appendChild(sbTools(HARDS.map(function(H){
    return [H.n,function(){sbSetHard(b,H.k);sbSelPanel();},(b.hard||'normal')===H.k?'on':''];
  })));
  sbSlider(box,'质量 m (kg)',0.05,600,0.1,function(){return b.m;},function(v){b.m=Math.max(0.05,v);sbMass(b);});""")

rep("""  if(b.boom){
    var sb2=document.createElement('div');sb2.className='sec';sb2.textContent='炸药';
    box.appendChild(sb2);
    sbSlider(box,'当量 (kg TNT)',0.1,30,0.1,function(){return b.boom.kg;},
      function(v){b.boom.kg=clamp(v,0.05,60);b.boom.R=sbBoomR(b.boom.kg);});
    sbSlider(box,'引信 (s，−1=撞击起爆)',-1,10,0.5,function(){return b.fuse;},
      function(v){b.fuse=v;b.due=0;});
    box.appendChild(sbTools([
      ['现在引爆',function(){b.fuse=0;b.due=1;sbFuse(0);}],
      ['解除炸药',function(){b.boom=null;b.mat='wood';b.fuse=-1;sbSelPanel();}]
    ]));
  }""",
"""  if(b.boom){
    var sb2=document.createElement('div');sb2.className='sec';sb2.textContent='炸药';
    box.appendChild(sb2);
    sbSlider(box,'当量 (kg TNT)',0.1,30,0.1,function(){return b.boom.kg;},
      function(v){b.boom.kg=clamp(v,0.05,60);b.boom.R=sbBoomR(b.boom.kg);});
    sbSlider(box,'引信 (s，−1=撞击起爆)',-1,10,0.5,function(){return b.fuse;},
      function(v){b.fuse=v;b.due=0;});
    box.appendChild(sbTools([
      ['现在引爆',function(){b.fuse=0;b.due=1;sbFuse(0);}],
      ['解除炸药',function(){b.boom=null;b.mat='wood';b.fuse=-1;sbSelPanel();}]
    ]));
  }
  if(b.nuke){
    var sn2=document.createElement('div');sn2.className='sec';sn2.textContent='核武器';
    box.appendChild(sn2);
    sbSlider(box,'当量 (千吨 TNT)',0.1,200,0.5,function(){return b.nuke.kt;},
      function(v){b.nuke.kt=clamp(v,0.05,1000);
        if(b.boom){b.boom.kg=b.nuke.kt*1000;b.boom.R=sbNukeR(b.nuke.kt);}});
    sbSlider(box,'引信 (s，−1=撞击起爆)',-1,10,0.5,function(){return b.fuse;},
      function(v){b.fuse=v;b.due=0;});
    box.appendChild(sbTools([
      ['现在引爆',function(){b.fuse=0;b.due=1;sbFuse(0);}],
      ['拆除核弹',function(){b.nuke=null;b.boom=null;b.mat='steel';b.hard='hard';
        sbSetHard(b,b.hard);b.fuse=-1;sbSelPanel();}]
    ]));
  }
  if(matDef(b.mat).flam){
    box.appendChild(sbTools([
      [b.fire>0?'正在燃烧':'点着它',function(){
        b.fire=b.fire>0?0:0.6;sbSelPanel();},b.fire>0?'on':'']
    ]));
  }""")

# ==================================================== 15. 清空 / 预设 / 存档
rep("""  SB.fx=[];SB.brk=[];SB.shake=0;SB.flash=0;""",
    """  SB.fx=[];SB.brk=[];SB.shake=0;SB.flash=0;SB.parts=[];SB.pgrid=null;""", 2)

rep("""  sbSelPanel();sbAutoSave();
}

/* ---------- 面板 ---------- */""",
"""  if(SB.env==='space')SB.g=0;      // 空间模式里所有预设都按失重玩
  sbSelPanel();sbAutoSave();
}

/* ---------- 面板 ---------- */""")

rep("""  {name:'速度选择器',build:function(){""",
"""  {name:'火灾实验',build:function(){
    SB.g=10;sbWorld();sbClearParts();
    var i,j,cols=[6.6,8.4,10.2,12.0];
    for(i=0;i<4;i++)for(j=0;j<4;j++){
      SB.bodies.push(sbMake({shape:'box',bw:0.42,bh:0.42,x:cols[i],y:0.28+j*0.46,
        mat:'wood',hard:'normal',mu:0.5,e:0.05}));
    }
    sbPartPour('gas',8.2,0.08,4.4,0.55);
    sbToast('火灾实验：点「火花点火」再点画面里的汽油池');
  }},
  {name:'核爆城市',build:function(){
    SB.g=10;sbWorld();
    var i,j,hs=[3,5,4,6,3];
    for(i=0;i<5;i++)for(j=0;j<hs[i];j++){
      SB.bodies.push(sbMake({shape:'box',bw:1.0,bh:0.9,x:5.6+i*2.3,y:0.5+j*0.95,
        mat:'stone',hard:'normal',mu:0.6,e:0.05}));
    }
    SB.bodies.push(sbMake({shape:'box',bw:1.0,bh:1.0,x:12.1,y:7.6,mat:'steel',hard:'hard',
      boom:{kg:15000,R:sbNukeR(15)},nuke:{kt:15},fuse:4}));
    sbToast('原子弹已挂在城市上空，4 s 后自动引爆（也可以点「全部引爆」）');
  }},
  {name:'速度选择器',build:function(){""")

rep("""           bm:(b.boom?[+b.boom.kg.toFixed(3),+(b.boom.R||0).toFixed(3)]:0),fu:b.fuse};""",
"""           bm:(b.boom?[+b.boom.kg.toFixed(3),+(b.boom.R||0).toFixed(3)]:0),fu:b.fuse,
           hd:(b.hard||'normal'),iv:b.invul?1:0,nk:(b.nuke?+b.nuke.kt.toFixed(3):0)};""")

rep("""  return {b:bs,j:js,l:ls};""",
    """  return {b:bs,j:js,l:ls,pt:sbPartSnap()};""")

rep("""    if(d.mt)b.mat=d.mt;""",
"""    if(d.mt)b.mat=d.mt;
    if(d.hd)b.hard=d.hd;
    if(d.iv)b.invul=1;
    if(d.nk)b.nuke={kt:d.nk};""")

rep("""      if(l.id>=SB.linkId)SB.linkId=l.id+1;
    }
  }
  sbSelPanel();
  return true;
}""",
"""      if(l.id>=SB.linkId)SB.linkId=l.id+1;
    }
  }
  if(o.pt)sbPartRestore(o.pt);
  sbSelPanel();
  return true;
}""")

rep("""  return {v:1,mode:App.mode,scene:App.scene?App.scene.id:null,P:App.P,
          g:SB.g,air:SB.air,defE:SB.defE,defMu:SB.defMu,preset:SB.preset,
          Ex:SB.Ex,Ey:SB.Ey,Bz:SB.Bz,""",
"""  return {v:1,mode:App.mode,scene:App.scene?App.scene.id:null,P:App.P,
          g:SB.g,air:SB.air,defE:SB.defE,defMu:SB.defMu,preset:SB.preset,
          Ex:SB.Ex,Ey:SB.Ey,Bz:SB.Bz,
          env:SB.env,fxP:SB.fxP,dh:SB.defHard,sw:SB.spaceWall?1:0,gd:SB.gdir,pw:SB.pourW,
          nk:SB.nukeKt,pm:SB.pmax,""")

rep("""    if(st.defMu!==undefined)SB.defMu=st.defMu;""",
"""    if(st.defMu!==undefined)SB.defMu=st.defMu;
    if(st.env==='space'){SB.env='space';SB.dark=1;}else{SB.env='ground';SB.dark=0;}
    if(st.fxP!==undefined)SB.fxP=st.fxP;
    if(st.dh!==undefined)SB.defHard=st.dh;
    if(st.sw!==undefined)SB.spaceWall=!!st.sw;
    if(st.gd!==undefined)SB.gdir=st.gd;
    if(st.pw!==undefined)SB.pourW=st.pw;
    if(st.nk!==undefined)SB.nukeKt=st.nk;
    if(st.pm!==undefined)SB.pmax=st.pm;""")

# ==================================================== 16. 手机工具栏
rep("""    ['＋炸药',function(){sbAddAt('bomb');}],
    ['引爆',function(){sbDetonateAll();},'pri'],
    ['sep'],""",
"""    ['＋炸药',function(){sbAddAt('bomb');}],
    ['＋核弹',function(){sbAddAt('nuke');}],
    ['引爆',function(){sbDetonateAll();},'pri'],
    ['点火'+(SB.sparkMode?'·开':''),function(){sbSparkToggle();},SB.sparkMode?'pri':''],
    [SB.env==='space'?'回地面':'进空间',function(){
      sbSetEnv(SB.env==='space'?'ground':'space');}],
    ['倒汽油',function(){sbPour('gas');}],
    ['倒水',function(){sbPour('water');}],
    ['sep'],""")

# ==================================================== 17. 事件：点火器
rep("""    SB.mouse.sx=p.sx;SB.mouse.sy=p.sy;SB.mouse.wx=wx;SB.mouse.wy=wy;
    if(e.button===1||e.button===2){""",
"""    SB.mouse.sx=p.sx;SB.mouse.sy=p.sy;SB.mouse.wx=wx;SB.mouse.wy=wy;
    if(SB.sparkMode&&e.button!==1&&e.button!==2){
      sbIgniteAt(wx,wy,1.3);SB.sparkDrag=1;e.preventDefault();return;
    }
    if(e.button===1||e.button===2){""")

rep("""  window.addEventListener('mouseup',function(){
    if(App.mode!=='sandbox')return;
    SB.grab=null;SB.pan=null;SB.rot=null;
  });""",
"""  window.addEventListener('mouseup',function(){
    if(App.mode!=='sandbox')return;
    SB.grab=null;SB.pan=null;SB.rot=null;SB.sparkDrag=0;
  });""")

rep("""    SB.mouse.wx=sbWX(p.sx);SB.mouse.wy=sbWY(p.sy);
    if(SB.pan){""",
"""    SB.mouse.wx=sbWX(p.sx);SB.mouse.wy=sbWY(p.sy);
    if(SB.sparkMode&&SB.sparkDrag){
      var nt=Date.now();
      if(nt-(SB.sparkT||0)>70){SB.sparkT=nt;sbIgniteAt(SB.mouse.wx,SB.mouse.wy,1.1);}
      return;
    }
    if(SB.pan){""")

rep("""    SB.mouse.wx=sbWX(a[0].x);SB.mouse.wy=sbWY(a[0].y);
    if(dbl&&!SB.pick){""",
"""    SB.mouse.wx=sbWX(a[0].x);SB.mouse.wy=sbWY(a[0].y);
    if(SB.sparkMode){
      sbIgniteAt(SB.mouse.wx,SB.mouse.wy,1.3);SB.sparkDrag=1;TCH.lastTap=0;
      e.preventDefault();return;
    }
    if(dbl&&!SB.pick){""")

rep("""      SB.mouse.wx=sbWX(sx);SB.mouse.wy=sbWY(sy);
      if(SB.pan){""",
"""      SB.mouse.wx=sbWX(sx);SB.mouse.wy=sbWY(sy);
      if(SB.sparkMode&&SB.sparkDrag){
        var nt2=Date.now();
        if(nt2-(SB.sparkT||0)>70){SB.sparkT=nt2;sbIgniteAt(SB.mouse.wx,SB.mouse.wy,1.1);}
        e.preventDefault();return;
      }
      if(SB.pan){""")

rep("""      SB.grab=null;SB.pan=null;SB.rot=null;TCH.n=0;""",
    """      SB.grab=null;SB.pan=null;SB.rot=null;TCH.n=0;SB.sparkDrag=0;""")

io.open(P, 'w', encoding='utf-8').write(src)
print('v8 补丁完成：%d 处修改，%d -> %d 字节' % (applied, orig_len, len(src)))
