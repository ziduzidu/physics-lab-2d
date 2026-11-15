# -*- coding: utf-8 -*-
"""v6 补丁：手触陀螺仪 + 自由沙盒材质/破碎/炸药爆破 + 图表修复"""
import io, sys, shutil, os

SRC = 'index.html'
shutil.copy(SRC, 'index.html.bak6')
s = io.open(SRC, encoding='utf-8').read()

R = []   # (名字, old, new)

# ---------------------------------------------------------------- 1. SB 状态
R.append(('SB 状态扩展', """var SB={
  bodies:[],joints:[],links:[],nextId:1,linkId:1,
  g:10,air:0,iters:14,defE:0.15,defMu:0.4,
  run:true,showVec:true,showGrid:true,showCt:false,showId:false,
  showF:true,showField:true,showTrail:true,
  sel:null,grab:null,pan:null,rot:null,pick:null,selLink:null,
  view:{s:50,cx:8,cy:3,W:800,H:420},
  t:0,hist:[],fps:60,lastT:0,nc:0,ready:false,needFit:true,preset:'斜面',warm:{},undo:[],
  px:0,py:0,Ek:0,Ep:0,
  Ex:0,Ey:0,Bz:0,            // 匀强电场 (N/C) 与垂直纸面磁场 (T)
  mouse:{sx:0,sy:0,wx:8,wy:3},
  colors:['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2','#db2777','#65a30d']
};
var SBMAX=90;
var LINKDEF={spring:{k:120,c:1.2},rope:{},pulley:{pr:0.45}};""",
"""var SB={
  bodies:[],joints:[],links:[],nextId:1,linkId:1,
  g:10,air:0,iters:14,defE:0.15,defMu:0.4,
  run:true,showVec:true,showGrid:true,showCt:false,showId:false,
  showF:true,showField:true,showTrail:true,
  sel:null,grab:null,pan:null,rot:null,pick:null,selLink:null,
  view:{s:50,cx:8,cy:3,W:800,H:420},
  t:0,hist:[],fps:60,lastT:0,nc:0,ready:false,needFit:true,preset:'斜面',warm:{},undo:[],
  px:0,py:0,Ek:0,Ep:0,
  Ex:0,Ey:0,Bz:0,            // 匀强电场 (N/C) 与垂直纸面磁场 (T)
  mouse:{sx:0,sy:0,wx:8,wy:3},
  colors:['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2','#db2777','#65a30d'],
  /* ---- v6 新增：重力方向 / 材质 / 破碎 / 爆破 / 特效 ---- */
  gdir:-Math.PI/2, gx:0, gy:-10,     // 重力方向（弧度，-π/2 为正下方）
  tiltG:0, tiltFlip:1, tiltBase:null, tiltMsg:'',
  defMat:'wood', fragOn:true, fragFade:true, fragTtl:12,
  dmgK:0.18, dmgV:1.5,
  boomKg:2, boomFuse:0,
  fx:[], brk:[], shake:0, flash:0
};
var SBMAX=140;
var LINKDEF={spring:{k:120,c:1.2},rope:{},pulley:{pr:0.45}};

/* ==================================================================
   材质表：密度 / 弹性 / 摩擦 / 强度(决定会不会碎) / 配色 / 表面纹理
   hp 单位相当于「能扛住的冲击能量(J) 每平方米」，实际强度再乘物体面积
   ================================================================== */
var MATS=[
 {k:'wood',  n:'木',   rho:0.62,e:0.30,mu:0.45,hp:58, c:'#dda86a',c2:'#9a6535',tex:'grain',edge:'#6b4423'},
 {k:'stone', n:'石',   rho:2.40,e:0.18,mu:0.62,hp:140,c:'#aab2bf',c2:'#69717f',tex:'speck',edge:'#4b5563'},
 {k:'steel', n:'钢',   rho:7.80,e:0.52,mu:0.20,hp:620,c:'#d3dbe7',c2:'#8492a6',tex:'metal',edge:'#475569'},
 {k:'rubber',n:'橡胶', rho:1.10,e:0.86,mu:0.88,hp:300,c:'#4a515e',c2:'#252b34',tex:'plain',edge:'#111827'},
 {k:'ice',   n:'冰',   rho:0.92,e:0.14,mu:0.05,hp:26, c:'#dbf2fc',c2:'#8ed3ea',tex:'shine',edge:'#5aa9c4'},
 {k:'glass', n:'玻璃', rho:2.50,e:0.12,mu:0.30,hp:13, c:'#e3f5fd',c2:'#a7dcec',tex:'shine',edge:'#5aa9c4'},
 {k:'foam',  n:'泡沫', rho:0.06,e:0.05,mu:0.72,hp:340,c:'#f5eddd',c2:'#d8c8a8',tex:'pore', edge:'#b9a67f'},
 {k:'tnt',   n:'炸药', rho:1.60,e:0.10,mu:0.50,hp:7,  c:'#e8503f',c2:'#8f1d16',tex:'tnt',  edge:'#5b1410'}
];
function matDef(k){
  for(var i=0;i<MATS.length;i++)if(MATS[i].k===k)return MATS[i];
  return MATS[0];
}
function sbArea(b){
  if(b.shape==='circle')return Math.PI*b.r*b.r;
  if(b.shape==='tri')return 0.5*b.bw*b.bh;
  return b.bw*b.bh;
}
/* 质量按 密度×面积×厚度 自动给（厚度取 12 m 只是为了把数值落到好用的量级） */
function sbAutoMass(b){return clamp(matDef(b.mat).rho*sbArea(b)*12,0.05,600);}
function sbHpMax(b){return Math.max(1.5,matDef(b.mat).hp*sbArea(b)*0.9);}
function sbHpInit(b){
  b.hpmax=sbHpMax(b);
  if(b.hp===undefined||b.hp===null||!isFinite(b.hp))b.hp=b.hpmax;
  if(b.hp>b.hpmax)b.hpmax=b.hp;
}
function sbSetMat(b,k){
  b.mat=k;var M=matDef(k);
  b.e=M.e;b.mu=M.mu;b.color=M.c;
  b.m=sbAutoMass(b);sbMass(b);
  b.hpmax=sbHpMax(b);b.hp=b.hpmax;b.cracks=null;
}
function sbAllMat(k){
  var n=0;
  for(var i=0;i<SB.bodies.length;i++){
    var b=SB.bodies[i];
    if(b.stat||b.boom)continue;
    sbSetMat(b,k);n++;
  }
  sbToast(n?('已把 '+n+' 个物体换成'+matDef(k).n+'，质量按密度重算'):'没有可换材质的物体');
}"""))

# ---------------------------------------------------------------- 2. sbMake
R.append(('sbMake 增加材质/生命值/炸药字段', """    q:o.q||0,                 // 电荷量（C，可正可负），用于电场力与洛伦兹力
    stat:!!o.stat,nofit:!!o.nofit,
    color:o.color||SB.colors[SB.nextId%SB.colors.length]};
  sbMass(b);
  return b;
}""",
"""    q:o.q||0,                 // 电荷量（C，可正可负），用于电场力与洛伦兹力
    stat:!!o.stat,nofit:!!o.nofit,
    mat:o.mat||'wood',        // 材质：决定 密度/弹性/摩擦/强度/外观
    cracks:null,frag:!!o.frag,ttl:(o.ttl===undefined?0:o.ttl),
    boom:o.boom||null,        // 炸药：{kg, R}
    fuse:(o.fuse===undefined?-1:o.fuse),fuse0:(o.fuse>0?o.fuse:1),due:0,
    color:o.color||SB.colors[SB.nextId%SB.colors.length]};
  if(o.m===undefined&&o.mat!==undefined){b.m=sbAutoMass(b);}
  if(b.mat==='tnt'&&!b.boom)b.boom={kg:SB.boomKg,R:sbBoomR(SB.boomKg)};
  sbMass(b);
  sbHpInit(b);
  return b;
}
function sbBoomR(kg){return 3.6*Math.pow(Math.max(kg,0.05),0.3334);}"""))

# ---------------------------------------------------------------- 3. 破坏系统（插在 sbPosFix 之前）
R.append(('破坏 / 爆破 / 特效内核', """function sbPosFix(c){""",
"""/* ==================================================================
   破坏系统：撞击累积损伤 → 裂纹 → 碎裂成块
   ================================================================== */
function sbHurt(b,dmg,px,py){
  if(!SB.fragOn||!b||b.gone)return;
  if(b.boom){
    if(!b.boom.done&&dmg>Math.max(1.2,b.hpmax*0.22))SB.brk.push({b:b,px:px,py:py,boom:1});
    return;
  }
  if(b.stat)return;                 // 地面 / 支架不会被撞坏（爆炸另算）
  if(!(dmg>0))return;
  b.hp-=dmg;
  if(!b.cracks)b.cracks=[];
  var ca=Math.cos(b.angle),sa=Math.sin(b.angle);
  var lx=(px-b.x)*ca+(py-b.y)*sa, ly=-(px-b.x)*sa+(py-b.y)*ca;
  var n=Math.min(3,1+Math.floor(dmg/Math.max(b.hpmax*0.12,1e-6))),i;
  var R0=sbRad(b);
  for(i=0;i<n;i++){
    if(b.cracks.length>16)b.cracks.splice(0,2);
    var a0=Math.random()*Math.PI*2, L=R0*(0.3+Math.random()*0.5);
    b.cracks.push([lx,ly,
                   lx+Math.cos(a0)*L*0.45,ly+Math.sin(a0)*L*0.45,
                   lx+Math.cos(a0+0.7)*L,ly+Math.sin(a0+0.7)*L]);
  }
  if(b.hp<=0)SB.brk.push({b:b,px:px,py:py});
}
/* 把物体切成几块（矩形按撞击点切 2×2，圆切 4 瓣，三角切 3 块） */
function sbSplit(b,px,py){
  var out=[],i;
  var ca=Math.cos(b.angle),sa=Math.sin(b.angle);
  var lx=(px-b.x)*ca+(py-b.y)*sa, ly=-(px-b.x)*sa+(py-b.y)*ca;
  if(b.shape==='circle'){
    var n=4,r2=b.r*0.5;
    for(i=0;i<n;i++){
      var a0=b.angle+i*Math.PI*2/n+Math.random()*0.6, d0=b.r*0.46;
      out.push({shape:'circle',r:r2,x:b.x+Math.cos(a0)*d0,y:b.y+Math.sin(a0)*d0,angle:b.angle});
    }
  }else if(b.shape==='tri'){
    var hh=b.bh*0.5;
    out.push({shape:'tri',bw:b.bw*0.62,bh:b.bh*0.62,angle:b.angle,
      x:b.x-Math.cos(b.angle)*hh*0.25,y:b.y-Math.sin(b.angle)*hh*0.25});
    out.push({shape:'tri',bw:b.bw*0.44,bh:b.bh*0.44,angle:b.angle+0.7,
      x:b.x+Math.cos(b.angle)*hh*0.42,y:b.y+Math.sin(b.angle)*hh*0.42});
    out.push({shape:'box',bw:b.bw*0.42,bh:b.bh*0.28,angle:b.angle,
      x:b.x-Math.cos(b.angle)*hh*0.1+sa*0.05,y:b.y-Math.sin(b.angle)*hh*0.1});
  }else{
    var W=b.bw,H=b.bh;
    var fx=clamp(0.5-lx/W,0.28,0.72)+(Math.random()-0.5)*0.12;
    var fy=clamp(0.5-ly/H,0.28,0.72)+(Math.random()-0.5)*0.12;
    fx=clamp(fx,0.26,0.74);fy=clamp(fy,0.26,0.74);
    var ws=[W*fx,W*(1-fx)],hs=[H*fy,H*(1-fy)];
    var minS=Math.min(W,H)*0.17;
    for(var a2=0;a2<2;a2++)for(var b2=0;b2<2;b2++){
      var ww=ws[a2],h2=hs[b2];
      if(ww<minS||h2<minS)continue;
      var ox=(a2?(-W/2+ws[0]+ww/2):(-W/2+ww/2));
      var oy=(b2?(-H/2+hs[0]+h2/2):(-H/2+h2/2));
      out.push({shape:'box',bw:ww,bh:h2,
        x:b.x+ox*ca-oy*sa,y:b.y+ox*sa+oy*ca,angle:b.angle});
    }
  }
  return out;
}
function sbBreak(b,px,py){
  if(!b||b.gone)return;
  b.gone=1;
  var i=SB.bodies.indexOf(b);if(i<0)return;
  SB.bodies.splice(i,1);
  sbUnlink(b);
  sbFxShatter(b,px,py);
  var parts=sbSplit(b,px,py),ar=[],tot=0;
  for(i=0;i<parts.length;i++){
    var A=parts[i].shape==='circle'?Math.PI*parts[i].r*parts[i].r
         :(parts[i].shape==='tri'?0.5*parts[i].bw*parts[i].bh:parts[i].bw*parts[i].bh);
    ar.push(A);tot+=A;
  }
  if(tot<=1e-9)return;
  for(i=0;i<parts.length;i++){
    if(SB.bodies.length>=SBMAX)break;
    var p=parts[i],mfrac=b.m*ar[i]/tot;
    var dx=p.x-b.x,dy=p.y-b.y,d=Math.sqrt(dx*dx+dy*dy);
    if(d<1e-6){dx=Math.random()-0.5;dy=Math.random()-0.5;d=Math.sqrt(dx*dx+dy*dy)||1;}
    var kick=1.4+Math.random()*2.0;
    var nb=sbMake({shape:p.shape,x:p.x,y:p.y,angle:p.angle,bw:p.bw,bh:p.bh,r:p.r,
      mat:b.mat,m:Math.max(0.05,mfrac),e:b.e,mu:b.mu,q:b.q*(ar[i]/tot)});
    nb.vx=b.vx+dx/d*kick+(Math.random()-0.5)*0.9;
    nb.vy=b.vy+dy/d*kick+(Math.random()-0.5)*0.9;
    nb.w=b.w+(Math.random()-0.5)*7;
    nb.frag=1;nb.ttl=SB.fragTtl;nb.cracks=null;
    nb.hpmax=nb.hp=Math.max(nb.hpmax*0.5,6);
    SB.bodies.push(nb);
  }
}
/* 摘掉某个物体身上的所有约束 */
function sbUnlink(b){
  var k,nj=[],nl=[];
  for(k=0;k<SB.joints.length;k++)if(SB.joints[k].A!==b&&SB.joints[k].B!==b)nj.push(SB.joints[k]);
  SB.joints=nj;
  for(k=0;k<SB.links.length;k++)if(SB.links[k].A!==b&&SB.links[k].B!==b)nl.push(SB.links[k]);
  SB.links=nl;
  if(SB.sel===b)SB.sel=null;
  if(SB.grab&&SB.grab.b===b)SB.grab=null;
  if(SB.rot&&SB.rot.b===b)SB.rot=null;
  if(SB.pick&&SB.pick.a&&SB.pick.a.b===b)SB.pick=null;
}
function sbFlushBreak(){
  var q=SB.brk;
  if(!q||!q.length)return;
  SB.brk=[];
  for(var i=0;i<q.length;i++){
    var it=q[i];
    if(it.boom&&it.b.boom)sbDetonate(it.b);
    else sbBreak(it.b,it.px,it.py);
  }
  SB.warm={};
}

/* ==================================================================
   炸药与爆破
   ================================================================== */
function sbAddBomb(){
  var x=SB.mouse.wx,y=SB.mouse.wy;
  if(!isFinite(x)){x=SB.view.cx;y=SB.view.cy;}
  var b=sbAdd({shape:'box',bw:0.58,bh:0.58,x:x,y:y,mat:'tnt',
    boom:{kg:SB.boomKg,R:sbBoomR(SB.boomKg)},fuse:(SB.boomFuse>0?SB.boomFuse:-1)});
  if(b)sbToast('放了 '+fmt(SB.boomKg,1)+' kg 炸药'+(SB.boomFuse>0?('，引信 '+fmt(SB.boomFuse,1)+' s'):'（撞到就炸，或点「全部引爆」）'));
  return b;
}
function sbDetonate(b){
  if(!b||!b.boom||b.boom.done)return;
  b.boom.done=1;b.due=0;b.gone=1;
  var kg=b.boom.kg,R=b.boom.R||sbBoomR(kg);
  var i=SB.bodies.indexOf(b);if(i>=0)SB.bodies.splice(i,1);
  sbUnlink(b);
  sbExplode(b.x,b.y,kg,R);
}
function sbDetonateAll(){
  var n=0,i;
  for(i=0;i<SB.bodies.length;i++){
    var b=SB.bodies[i];
    if(b.boom&&!b.boom.done){b.fuse=0;b.due=1;n++;}
  }
  if(!n){sbToast('场景里没有炸药，先点「＋炸药」放一个');return;}
  sbToast('引爆 '+n+' 个炸药');
  sbFuse(0);
}
function sbFuse(dt){
  var i,b,any=false;
  for(i=0;i<SB.bodies.length;i++){
    b=SB.bodies[i];
    if(!b.boom||b.boom.done)continue;
    if(b.fuse>=0){b.fuse-=dt;if(b.fuse<=0){b.due=1;any=true;}}
  }
  if(!any)return;
  for(i=SB.bodies.length-1;i>=0;i--){
    b=SB.bodies[i];
    if(b.boom&&!b.boom.done&&b.due)sbDetonate(b);
  }
  sbFlushBreak();
}
function sbExplode(x,y,kg,R){
  R=R||sbBoomR(kg);
  var i,b,dx,dy,d,w,dv,ux,uy,nj;
  SB.fx.push({k:'boom',x:x,y:y,R:R,t:0,life:0.62,kg:kg});
  SB.fx.push({k:'ring',x:x,y:y,R:R,t:0,life:0.52});
  SB.shake=Math.min(1.6,SB.shake+0.55*Math.sqrt(Math.max(kg,0.05)));
  SB.flash=Math.min(1.1,SB.flash+0.7*Math.sqrt(Math.max(kg,0.05)));
  var sp=26+Math.min(48,Math.round(kg*7)),a0,s0;
  for(i=0;i<sp;i++){
    a0=Math.random()*Math.PI*2;
    s0=(4+Math.random()*15)*Math.pow(Math.max(kg,0.1),0.35);
    SB.fx.push({k:'spark',x:x,y:y,vx:Math.cos(a0)*s0,vy:Math.sin(a0)*s0+2,
      t:0,life:0.45+Math.random()*0.7,c:(Math.random()<0.45?'#fde68a':'#fb923c')});
  }
  var sm=10+Math.min(22,Math.round(kg*3));
  for(i=0;i<sm;i++){
    a0=Math.random()*Math.PI*2;s0=1+Math.random()*3.2;
    SB.fx.push({k:'smoke',x:x,y:y,vx:Math.cos(a0)*s0,vy:Math.sin(a0)*s0+1.5,
      t:0,life:1.5+Math.random()*1.5,r0:0.25+Math.random()*0.4,r1:1.1+Math.random()*1.6});
  }
  var victims=[];
  for(i=0;i<SB.bodies.length;i++){
    b=SB.bodies[i];
    dx=b.x-x;dy=b.y-y;d=Math.sqrt(dx*dx+dy*dy);
    if(d>R+sbRad(b))continue;
    var dd=Math.max(d-sbRad(b),0);
    w=clamp(1-dd/R,0,1);w=w*w;
    if(w<=0.002)continue;
    if(b.boom&&!b.boom.done){b.fuse=0.04+dd/R*0.15;continue;}   // 殉爆
    var dmg=260*kg*Math.pow(w,1.35);
    if(b.stat){
      if(!b.nofit){b.hp-=dmg*0.5;if(b.hp<=0)victims.push(b);}
      continue;
    }
    sbHurt(b,dmg,b.x,b.y);
    if(b.gone)continue;
    ux=(d<1e-6)?0:dx/d;uy=(d<1e-6)?1:dy/d;
    dv=Math.min(22*Math.sqrt(kg)*w/(0.5+0.15*b.m),70);
    b.vx+=ux*dv;b.vy+=uy*dv+0.28*dv;b.w+=(Math.random()-0.5)*dv*0.5;
  }
  sbFlushBreak();
  for(i=0;i<victims.length;i++)if(!victims[i].gone)sbBreak(victims[i],victims[i].x,victims[i].y);
  sbFlushBreak();
}

/* ==================================================================
   特效：火花 / 烟尘 / 火球 / 冲击波 / 画面震动
   ================================================================== */
function sbFxShatter(b,px,py){
  var n=6+Math.floor(Math.random()*5),i,a0,s0;
  for(i=0;i<n;i++){
    a0=Math.random()*Math.PI*2;s0=1.5+Math.random()*4.5;
    SB.fx.push({k:'spark',x:px,y:py,vx:Math.cos(a0)*s0,vy:Math.sin(a0)*s0+1.5,
      t:0,life:0.4+Math.random()*0.4,c:matDef(b.mat).c});
  }
  for(i=0;i<4;i++){
    SB.fx.push({k:'dust',x:px+(Math.random()-0.5)*0.4,y:py+(Math.random()-0.5)*0.4,
      vx:(Math.random()-0.5)*1.3,vy:Math.random()*1.0,
      t:0,life:0.7+Math.random()*0.5,r:0.14+Math.random()*0.2});
  }
  SB.shake=Math.min(1,SB.shake+0.18);
}
function sbFxStep(dt){
  var out=[],i,f;
  for(i=0;i<SB.fx.length;i++){
    f=SB.fx[i];f.t+=dt;
    if(f.t>=f.life)continue;
    if(f.k==='spark'){f.vy-=9*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.985;f.vy*=0.985;}
    else if(f.k==='smoke'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.94;f.vy=f.vy*0.94+0.4*dt;}
    else if(f.k==='dust'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.93;f.vy*=0.93;}
    out.push(f);
  }
  SB.fx=out;
  if(SB.fx.length>420)SB.fx.splice(0,SB.fx.length-420);
}
function sbFxDraw(g){
  var i,f,u,X,Y,k2,a2,rr,px2,py2;
  for(i=0;i<SB.fx.length;i++){
    f=SB.fx[i];u=clamp(f.t/f.life,0,1);
    X=sbX(f.x);Y=sbY(f.y);
    if(f.k==='boom'){
      var R=f.R*SB.view.s*(0.35+0.85*Math.pow(u,0.45));
      var al=(1-u)*(1-u);
      var gr=g.createRadialGradient(X,Y,0,X,Y,Math.max(R,1));
      gr.addColorStop(0,'rgba(255,255,238,'+(0.95*al)+')');
      gr.addColorStop(0.35,'rgba(253,224,71,'+(0.82*al)+')');
      gr.addColorStop(0.68,'rgba(249,115,22,'+(0.5*al)+')');
      gr.addColorStop(1,'rgba(120,30,10,0)');
      g.fillStyle=gr;g.beginPath();
      for(k2=0;k2<=18;k2++){
        a2=k2/18*Math.PI*2;
        rr=R*(1+0.10*Math.sin(a2*3+f.x*7.1+f.t*9)+0.06*Math.sin(a2*5-f.t*6));
        px2=X+Math.cos(a2)*rr;py2=Y+Math.sin(a2)*rr;
        if(k2===0)g.moveTo(px2,py2);else g.lineTo(px2,py2);
      }
      g.closePath();g.fill();
    }else if(f.k==='ring'){
      var R2=f.R*SB.view.s*(0.2+1.15*u);
      g.strokeStyle='rgba(255,243,196,'+(0.72*(1-u))+')';
      g.lineWidth=Math.max(1,3.4*(1-u)*Math.min(2,f.R/2));
      g.beginPath();g.arc(X,Y,Math.max(R2,0.5),0,Math.PI*2);g.stroke();
    }else if(f.k==='spark'){
      var ss=Math.sqrt(f.vx*f.vx+f.vy*f.vy);
      var L=Math.min(0.32+ss*0.026,0.9)*SB.view.s;
      var ux=ss>1e-6?f.vx/ss:0,uy=ss>1e-6?f.vy/ss:0;
      g.globalAlpha=1-u;g.strokeStyle=f.c;
      g.lineWidth=Math.max(1,2.2*(1-u*0.7));g.lineCap='round';
      g.beginPath();g.moveTo(X,Y);g.lineTo(X-ux*L,Y+uy*L);g.stroke();
      g.lineCap='butt';g.globalAlpha=1;
    }else if(f.k==='smoke'){
      var r2=(f.r0+(f.r1-f.r0)*u)*SB.view.s;
      g.fillStyle='rgba(78,74,72,'+(0.34*(1-u)*(1-u))+')';
      g.beginPath();g.arc(X,Y,Math.max(r2,0.5),0,Math.PI*2);g.fill();
    }else if(f.k==='dust'){
      var r3=f.r*SB.view.s*(1+u*1.7);
      g.fillStyle='rgba(203,213,225,'+(0.42*(1-u))+')';
      g.beginPath();g.arc(X,Y,Math.max(r3,0.4),0,Math.PI*2);g.fill();
    }
  }
}
/* 碎片到期淡出移除，避免越炸越卡 */
function sbDecay(dt){
  if(!SB.fragFade)return;
  var i,b,any=false;
  for(i=0;i<SB.bodies.length;i++){
    b=SB.bodies[i];
    if(!b.frag)continue;
    b.ttl=(b.ttl||0)-dt;
    if(b.ttl<=0)any=true;
  }
  if(!any)return;
  for(i=SB.bodies.length-1;i>=0;i--){
    b=SB.bodies[i];
    if(b.frag&&(b.ttl||0)<=0&&SB.bodies.length>1){
      if(SB.sel===b)SB.sel=null;
      if(SB.grab&&SB.grab.b===b)SB.grab=null;
      SB.bodies.splice(i,1);
    }
  }
}

function sbPosFix(c){"""))

# ---------------------------------------------------------------- 4. sbSub：重力方向 + 撞击损伤
R.append(('sbSub 重力方向', """function sbSub(h){
  var bs=SB.bodies,i;""",
"""function sbSub(h){
  var bs=SB.bodies,i;
  SB.gx=SB.g*Math.cos(SB.gdir);SB.gy=SB.g*Math.sin(SB.gdir);"""))

R.append(('sbSub 重力施加', """    b.vy-=SB.g*h;""", """    b.vx+=SB.gx*h;b.vy+=SB.gy*h;"""))

R.append(('sbSub 接触损伤', """    var ee=(vn0<-1)?Math.max(ct.A.e,ct.B.e):0;
    ct.vb=(vn0<0)?(-ee*vn0):0;""",
"""    var ee=(vn0<-1)?Math.max(ct.A.e,ct.B.e):0;
    ct.vb=(vn0<0)?(-ee*vn0):0;
    // 撞击损伤：只有"真的撞上去"（接近速度超过阈值）才扣血，堆叠静置不会掉血
    if(SB.fragOn&&vn0<-SB.dmgV){
      var iA=ct.A.invM,iB=ct.B.invM,im=Math.max(iA+iB,1e-9);
      var meff=1/im, Ek=0.5*meff*vn0*vn0, dmg=Ek*SB.dmgK;
      sbHurt(ct.A,dmg*2*(iA/im),ct.p[0],ct.p[1]);
      sbHurt(ct.B,dmg*2*(iB/im),ct.p[0],ct.p[1]);
    }"""))

R.append(('sbSub 末尾结算破坏', """  sbLinkPosFix();          // 绳索/滑轮硬修正，杜绝缓慢伸长
  sbAxisFix();             // 位置拉回导轨轴线
}""",
"""  sbLinkPosFix();          // 绳索/滑轮硬修正，杜绝缓慢伸长
  sbAxisFix();             // 位置拉回导轨轴线
  sbFlushBreak();          // 本子步内被打碎的物体在这里统一替换成碎块
}"""))

# ---------------------------------------------------------------- 5. sbStep
R.append(('sbStep 引信/特效/碎片清理', """  for(i=0;i<n;i++){sbSub(h);SB.t+=h;}
  sbHist();
}""",
"""  for(i=0;i<n;i++){sbSub(h);SB.t+=h;}
  sbFuse(dt);
  sbFxStep(dt);
  sbDecay(dt);
  sbHist();
}"""))

R.append(('sbHist 势能按重力方向', """    Ep+=b.m*SB.g*b.y-(b.q?(b.q*(SB.Ex*b.x+SB.Ey*b.y)):0);""",
"""    Ep+=-(b.m*(SB.gx*b.x+SB.gy*b.y))-(b.q?(b.q*(SB.Ex*b.x+SB.Ey*b.y)):0);"""))

# ---------------------------------------------------------------- 6. 渲染：震动 / 特效 / 材质
R.append(('sbRender 震动', """  if(SB.needFit){sbFitView();SB.needFit=false;}""",
"""  if(SB.needFit){sbFitView();SB.needFit=false;}
  /* 爆炸的画面震动（只抖世界层，HUD 与读数不跟着抖） */
  var shk=SB.shake;
  g.save();
  if(shk>0.003){SB.shake=shk*0.87;g.translate((Math.random()-0.5)*18*shk,(Math.random()-0.5)*18*shk);}
  else SB.shake=0;"""))

R.append(('sbRender 特效层', """  /* 接触点 */
  if(SB.showCt&&SB.cts){
    g.fillStyle='#dc2626';
    for(var k=0;k<SB.cts.length;k++){
      var p=SB.cts[k].p;
      g.beginPath();g.arc(sbX(p[0]),sbY(p[1]),3,0,Math.PI*2);g.fill();
    }
  }
""",
"""  /* 接触点 */
  if(SB.showCt&&SB.cts){
    g.fillStyle='#dc2626';
    for(var k=0;k<SB.cts.length;k++){
      var p=SB.cts[k].p;
      g.beginPath();g.arc(sbX(p[0]),sbY(p[1]),3,0,Math.PI*2);g.fill();
    }
  }

  /* 爆炸 / 火花 / 烟尘（画在物体之上，冲击波才压得住画面） */
  sbFxDraw(g);
"""))

R.append(('sbRender 结束 restore + 闪光', """  /* HUD */
  label(g,10,16,'物体 '+SB.bodies.length+' · 约束 '+SB.links.length+' · 接触 '+SB.nc+' · '+fmt(SB.fps,0)+'fps · '+(SB.run?'运行中':'已暂停'),'#6b7280','left');""",
"""  g.restore();
  /* 爆闪光（画在世界层之外，覆盖整个画布） */
  if(SB.flash>0.004){
    g.fillStyle='rgba(255,246,214,'+Math.min(0.42,SB.flash*0.42)+')';
    g.fillRect(0,0,W,H);
    SB.flash*=0.84;
  }else SB.flash=0;

  /* HUD */
  label(g,10,16,'物体 '+SB.bodies.length+' · 约束 '+SB.links.length+' · 接触 '+SB.nc+' · '+fmt(SB.fps,0)+'fps · '+(SB.run?'运行中':'已暂停'),'#6b7280','left');"""))

R.append(('HUD 重力方向显示', """  if(SB.g>0)label(g,W-10,16,'g = '+fmt(SB.g,1)+' m/s² ↓','#94a3b8','right');""",
"""  if(SB.g>0){
    var gdeg=Math.round(SB.gdir*180/Math.PI);
    label(g,W-10,16,'g = '+fmt(SB.g,1)+' m/s² '+(Math.abs(gdeg+90)<3?'↓':(gdeg+'°')),'#94a3b8','right');
  }
  if(SB.tiltMsg)label(g,W-10,H-12,SB.tiltMsg,'rgba(217,119,6,.9)','right');"""))

# ---------------------------------------------------------------- 7. sbDrawBody 材质外观
R.append(('sbDrawBody 重写', """function sbDrawBody(g,b){
  var X=sbX(b.x),Y=sbY(b.y);
  if(b.shape==='circle'){
    var R=b.r*SB.view.s;
    g.beginPath();g.arc(X,Y,R,0,Math.PI*2);
    g.fillStyle=b.stat?'#cbd5e1':b.color;g.fill();
    g.strokeStyle=b.stat?'#94a3b8':'#0f172a';g.lineWidth=1.5;g.stroke();
    // 朝向半径线
    g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=2;
    g.beginPath();g.moveTo(X,Y);
    g.lineTo(X+Math.cos(b.angle)*R,Y-Math.sin(b.angle)*R);g.stroke();
  }else{
    var V=sbVerts(b),i;
    g.beginPath();
    for(i=0;i<V.length;i++){
      var px=sbX(V[i][0]),py=sbY(V[i][1]);
      if(i===0)g.moveTo(px,py);else g.lineTo(px,py);
    }
    g.closePath();
    g.fillStyle=b.stat?'#cbd5e1':b.color;g.fill();
    g.strokeStyle=b.stat?'#94a3b8':'#0f172a';g.lineWidth=1.5;g.stroke();
  }
  /* 质心 */""",
"""/* 材质外观：渐变底色 + 程序化纹理（全部用 Canvas 2D 画，无贴图文件） */
function sbPaint(g,b,X,Y,M){
  var R=Math.max(sbRad(b)*SB.view.s,1);
  if(b.stat){
    g.fillStyle='#cbd5e1';g.fill();
    g.strokeStyle='#94a3b8';g.lineWidth=1.5;g.stroke();
    return;
  }
  var gr=g.createLinearGradient(X-R*0.9,Y-R,X+R*0.9,Y+R);
  gr.addColorStop(0,M.c);gr.addColorStop(1,M.c2);
  g.fillStyle=gr;g.fill();
  sbTex(g,b,X,Y,M,R);
  g.strokeStyle=M.edge||'#0f172a';g.lineWidth=1.5;g.stroke();
}
function sbTex(g,b,X,Y,M,R){
  if(b.stat||M.tex==='plain')return;
  var s=SB.view.s,hw,hh,i;
  g.save();
  g.translate(X,Y);g.rotate(-b.angle);            // 进入物体局部坐标（屏幕 y 向下，故取负角）
  g.beginPath();
  if(b.shape==='circle'){g.arc(0,0,Math.max(b.r*s,0.5),0,Math.PI*2);}
  else{
    hw=Math.max(b.bw*s/2,0.5);hh=Math.max(b.bh*s/2,0.5);
    if(b.shape==='tri'){g.moveTo(-hw,hh*0.6667);g.lineTo(hw,hh*0.6667);g.lineTo(0,-hh*1.3333);}
    else g.rect(-hw,-hh,hw*2,hh*2);
  }
  g.clip();
  var W2=(b.shape==='circle')?b.r*s*2:b.bw*s, H2=(b.shape==='circle')?b.r*s*2:b.bh*s;
  var seed=(b.id*9301+49297)%233280;
  function rnd(){seed=(seed*9301+49297)%233280;return seed/233280;}
  var det=(SB.bodies.length>45)?0.45:1;           // 物体多时自动降低纹理密度保帧率
  if(M.tex==='grain'){
    g.strokeStyle='rgba(92,54,22,.30)';g.lineWidth=Math.max(1,s*0.035);
    for(i=-3;i<=3;i++){
      var yy=i*H2*0.15+rnd()*H2*0.05;
      g.beginPath();g.moveTo(-W2/2,yy);
      g.quadraticCurveTo(0,yy+H2*0.035*(i%2?1:-1),W2/2,yy);g.stroke();
    }
    g.strokeStyle='rgba(92,54,22,.22)';g.lineWidth=Math.max(1,s*0.05);
    g.beginPath();g.arc(W2*0.16,-H2*0.08,Math.max(2,H2*0.09),0,Math.PI*2);g.stroke();
  }else if(M.tex==='speck'){
    var n1=Math.round(16*det);
    for(i=0;i<n1;i++){
      var a1=rnd()*Math.PI*2,r1=Math.sqrt(rnd())*W2*0.5;
      g.fillStyle='rgba(255,255,255,'+(0.10+rnd()*0.16)+')';
      g.beginPath();g.arc(Math.cos(a1)*r1,Math.sin(a1)*r1,Math.max(0.8,s*0.045*(0.5+rnd())),0,Math.PI*2);g.fill();
    }
    for(i=0;i<Math.round(12*det);i++){
      var a2=rnd()*Math.PI*2,r2=Math.sqrt(rnd())*W2*0.5;
      g.fillStyle='rgba(20,26,38,.18)';
      g.beginPath();g.arc(Math.cos(a2)*r2,Math.sin(a2)*r2,Math.max(0.8,s*0.04*(0.5+rnd())),0,Math.PI*2);g.fill();
    }
  }else if(M.tex==='metal'){
    g.strokeStyle='rgba(255,255,255,.32)';g.lineWidth=Math.max(1.2,s*0.06);
    g.beginPath();g.moveTo(-W2/2,H2*0.16);g.lineTo(W2/2,-H2*0.22);g.stroke();
    g.strokeStyle='rgba(255,255,255,.14)';g.lineWidth=Math.max(1,s*0.04);
    g.beginPath();g.moveTo(-W2/2,H2*0.38);g.lineTo(W2/2,H2*0.02);g.stroke();
    g.strokeStyle='rgba(15,23,42,.20)';g.lineWidth=Math.max(1,s*0.045);
    g.beginPath();g.moveTo(-W2/2,-H2*0.30);g.lineTo(W2/2,-H2*0.40);g.stroke();
  }else if(M.tex==='shine'){
    g.strokeStyle='rgba(255,255,255,.58)';g.lineWidth=Math.max(1.2,s*0.05);
    g.beginPath();g.moveTo(-W2*0.22,H2*0.32);g.lineTo(W2*0.06,-H2*0.36);g.stroke();
    g.strokeStyle='rgba(255,255,255,.26)';g.lineWidth=Math.max(1,s*0.032);
    g.beginPath();g.moveTo(-W2*0.04,H2*0.38);g.lineTo(W2*0.22,-H2*0.28);g.stroke();
    g.strokeStyle='rgba(120,180,210,.5)';g.lineWidth=1;
    g.beginPath();
    if(b.shape==='circle')g.arc(0,0,Math.max(b.r*s*0.92,0.5),0,Math.PI*2);
    else g.rect(-W2/2+1,-H2/2+1,Math.max(W2-2,1),Math.max(H2-2,1));
    g.stroke();
  }else if(M.tex==='pore'){
    for(i=0;i<Math.round(18*det);i++){
      var a3=rnd()*Math.PI*2,r3=Math.sqrt(rnd())*W2*0.48;
      g.fillStyle='rgba(150,130,95,.30)';
      g.beginPath();g.arc(Math.cos(a3)*r3,Math.sin(a3)*r3,Math.max(0.7,s*0.035*(0.4+rnd())),0,Math.PI*2);g.fill();
    }
  }else if(M.tex==='tnt'){
    g.fillStyle='rgba(32,12,10,.55)';
    g.fillRect(-W2/2,-H2*0.11,W2,H2*0.22);
    g.fillStyle='rgba(255,236,205,.85)';
    g.fillRect(-W2/2,-H2*0.31,W2*0.17,H2*0.22);
    g.strokeStyle='rgba(60,40,20,.9)';g.lineWidth=Math.max(1,W2*0.06);
    g.beginPath();g.moveTo(W2*0.09,-H2/2);
    g.quadraticCurveTo(W2*0.34,-H2*0.86,W2*0.17,-H2*1.12);g.stroke();
    if(b.fuse>=0&&!b.boom.done){
      g.fillStyle='rgba(253,224,71,'+(0.55+0.45*Math.sin(Date.now()*0.02))+')';
      g.beginPath();g.arc(W2*0.17,-H2*1.12,Math.max(1.6,W2*0.085),0,Math.PI*2);g.fill();
    }
  }
  g.restore();
}
/* 裂纹 + 受损变暗 */
function sbDamage(g,b,X,Y){
  var s=SB.view.s,i;
  if(b.cracks&&b.cracks.length){
    g.save();g.translate(X,Y);g.rotate(-b.angle);
    g.strokeStyle='rgba(32,22,16,.72)';g.lineWidth=Math.max(1,s*0.035);
    for(i=0;i<b.cracks.length;i++){
      var c=b.cracks[i];
      g.beginPath();g.moveTo(c[0]*s,-c[1]*s);g.lineTo(c[2]*s,-c[3]*s);g.lineTo(c[4]*s,-c[5]*s);g.stroke();
    }
    g.restore();
  }
  var frac=clamp(1-b.hp/Math.max(b.hpmax,1e-6),0,1);
  if(frac>0.06){
    g.fillStyle='rgba(34,24,18,'+(0.30*frac)+')';
    g.beginPath();
    if(b.shape==='circle')g.arc(X,Y,Math.max(sbRad(b)*s,1),0,Math.PI*2);
    else{
      var V=sbVerts(b);
      g.moveTo(sbX(V[0][0]),sbY(V[0][1]));
      for(i=1;i<V.length;i++)g.lineTo(sbX(V[i][0]),sbY(V[i][1]));
      g.closePath();
    }
    g.fill();
  }
}
function sbDrawBody(g,b){
  var X=sbX(b.x),Y=sbY(b.y);
  var M=matDef(b.mat);
  if(b.frag&&SB.fragFade&&b.ttl<3)g.globalAlpha=clamp(b.ttl/3,0.18,1);
  if(b.shape==='circle'){
    var R=b.r*SB.view.s;
    g.beginPath();g.arc(X,Y,R,0,Math.PI*2);
    sbPaint(g,b,X,Y,M);
    // 朝向半径线
    g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=2;
    g.beginPath();g.moveTo(X,Y);
    g.lineTo(X+Math.cos(b.angle)*R,Y-Math.sin(b.angle)*R);g.stroke();
  }else{
    var V=sbVerts(b),i;
    g.beginPath();
    for(i=0;i<V.length;i++){
      var px=sbX(V[i][0]),py=sbY(V[i][1]);
      if(i===0)g.moveTo(px,py);else g.lineTo(px,py);
    }
    g.closePath();
    sbPaint(g,b,X,Y,M);
  }
  sbDamage(g,b,X,Y);
  g.globalAlpha=1;
  /* 炸药：外圈呼吸灯 + 引信读数 */
  if(b.boom&&!b.boom.done){
    var pl=0.5+0.5*Math.sin(Date.now()*0.006);
    g.strokeStyle='rgba(239,68,68,'+(0.32+0.5*pl)+')';g.lineWidth=2;
    g.beginPath();g.arc(X,Y,sbRad(b)*SB.view.s+5+3*pl,0,Math.PI*2);g.stroke();
    if(b.fuse>=0)label(g,X,Y-sbRad(b)*SB.view.s-8,fmt(Math.max(b.fuse,0),1)+'s','#dc2626','center');
  }
  /* 质心 */"""))

# ---------------------------------------------------------------- 8. sbAddAt / 面板
R.append(('sbAddAt 增加炸药', """  else if(kind==='ramp'){o.shape='box';o.bw=6;o.bh=0.35;o.angle=-0.35;o.stat=true;o.color='#94a3b8';}""",
"""  else if(kind==='ramp'){o.shape='box';o.bw=6;o.bh=0.35;o.angle=-0.35;o.stat=true;o.color='#94a3b8';}
  else if(kind==='bomb'){o.shape='box';o.bw=0.58;o.bh=0.58;o.mat='tnt';o.boom={kg:SB.boomKg,R:sbBoomR(SB.boomKg)};o.fuse=(SB.boomFuse>0?SB.boomFuse:-1);}"""))

R.append(('sbDel/sbClear 复用 sbUnlink', """  box.appendChild(sbTools([
    ['＋方块',function(){sbAddAt('box');}],
    ['＋圆球',function(){sbAddAt('circle');}],
    ['＋三角',function(){sbAddAt('tri');}],
    ['＋细杆',function(){sbAddAt('rod');}],
    ['＋斜面',function(){sbAddAt('ramp');}],
    ['＋挡板',function(){sbAddAt('wall');}],""",
"""  box.appendChild(sbTools([
    ['＋方块',function(){sbAddAt('box');}],
    ['＋圆球',function(){sbAddAt('circle');}],
    ['＋三角',function(){sbAddAt('tri');}],
    ['＋细杆',function(){sbAddAt('rod');}],
    ['＋斜面',function(){sbAddAt('ramp');}],
    ['＋挡板',function(){sbAddAt('wall');}],
    ['＋炸药',function(){sbAddAt('bomb');}],"""))

# ---------------------------------------------------------------- 9. 面板：材质 / 破碎 / 爆破 区
R.append(('sbPanel 重力与材质分区', """  sbSlider(box,'重力 g (m/s²)',0,20,0.5,function(){return SB.g;},function(v){SB.g=v;});
  sbSlider(box,'空气阻力',0,2,0.05,function(){return SB.air;},function(v){SB.air=v;});
  sbSlider(box,'新物体弹性 e',0,1,0.05,function(){return SB.defE;},function(v){SB.defE=v;});
  sbSlider(box,'新物体摩擦 μ',0,1.2,0.05,function(){return SB.defMu;},function(v){SB.defMu=v;});""",
"""  sbSlider(box,'重力 g (m/s²)',0,20,0.5,function(){return SB.g;},function(v){SB.g=v;});
  sbSlider(box,'重力方向 (°)',-180,180,5,function(){return Math.round(SB.gdir*180/Math.PI);},
    function(v){SB.gdir=v*Math.PI/180;SB.tiltG=0;sbUnTilt();});
  sbSlider(box,'空气阻力',0,2,0.05,function(){return SB.air;},function(v){SB.air=v;});
  sbSlider(box,'新物体弹性 e',0,1,0.05,function(){return SB.defE;},function(v){SB.defE=v;});
  sbSlider(box,'新物体摩擦 μ',0,1.2,0.05,function(){return SB.defMu;},function(v){SB.defMu=v;});
  box.appendChild(sbTools([
    ['重力↓复位',function(){SB.gdir=-Math.PI/2;SB.tiltG=0;sbUnTilt();sbPanel();}],
    [SB.tiltG?'倾斜跟随 开':'倾斜跟随 关',function(){sbTiltToggle();},SB.tiltG?'on':''],
    ['倾斜反向',function(){SB.tiltFlip=-SB.tiltFlip;sbTiltBase=null;sbPanel();}]
  ]));

  /* ---- 材质 · 破碎 · 爆破 ---- */
  var sM=document.createElement('div');sM.className='sec';sM.textContent='材质 · 破碎 · 爆破';
  box.appendChild(sM);
  box.appendChild(sbTools(MATS.map(function(M){
    return [M.n,function(){SB.defMat=M.k;sbPanel();},SB.defMat===M.k?'on':''];
  })));
  box.appendChild(sbTools([
    ['＋炸药',function(){sbAddBomb();}],
    ['全部引爆',function(){sbDetonateAll();}],
    ['全场换材质',function(){sbAllMat(SB.defMat);}]
  ]));
  sbSlider(box,'炸药当量 (kg TNT)',0.2,20,0.2,function(){return SB.boomKg;},
    function(v){SB.boomKg=clamp(v,0.05,50);});
  sbSlider(box,'引信 (s，0=撞到就炸)',0,10,0.5,function(){return SB.boomFuse;},
    function(v){SB.boomFuse=v;});
  var nMat=document.createElement('div');nMat.className='note';
  nMat.innerHTML='选好材质再放物体：<b>质量按密度自动算</b>，弹性摩擦也跟着变。<br>'+
    '<b>玻璃 / 冰</b>一摔就碎，<b>木</b>要狠狠砸，<b>钢 / 泡沫 / 橡胶</b>基本砸不烂。<br>'+
    '炸药撞到就炸，也可以设引信延时；几个炸药放一起会<b>殉爆</b>。';
  box.appendChild(nMat);"""))

R.append(('sbPanel 破碎开关', """  [  ['矢量',function(v){SB.showVec=v;},SB.showVec],
   ['受力',function(v){SB.showF=v;},SB.showF],
   ['轨迹',function(v){SB.showTrail=v;},SB.showTrail],
   ['场',function(v){SB.showField=v;},SB.showField],
   ['网格',function(v){SB.showGrid=v;},SB.showGrid],
   ['接触点',function(v){SB.showCt=v;},SB.showCt],
   ['编号',function(v){SB.showId=v;},SB.showId]].forEach(function(it){""",
"""  [  ['矢量',function(v){SB.showVec=v;},SB.showVec],
   ['受力',function(v){SB.showF=v;},SB.showF],
   ['轨迹',function(v){SB.showTrail=v;},SB.showTrail],
   ['场',function(v){SB.showField=v;},SB.showField],
   ['网格',function(v){SB.showGrid=v;},SB.showGrid],
   ['接触点',function(v){SB.showCt=v;},SB.showCt],
   ['编号',function(v){SB.showId=v;},SB.showId],
   ['允许破碎',function(v){SB.fragOn=v;},SB.fragOn],
   ['碎片自动消失',function(v){SB.fragFade=v;},SB.fragFade]].forEach(function(it){"""))

# ---------------------------------------------------------------- 10. 选中面板：材质
R.append(('sbSelPanel 材质行', """  sbSlider(box,'质量 m (kg)',0.1,50,0.1,function(){return b.m;},function(v){b.m=Math.max(0.05,v);sbMass(b);});
  sbSlider(box,'弹性 e',0,1,0.05,function(){return b.e;},function(v){b.e=v;});
  sbSlider(box,'摩擦 μ',0,1.2,0.05,function(){return b.mu;},function(v){b.mu=v;});""",
"""  var sM2=document.createElement('div');sM2.className='sec';sM2.textContent='材质（换材质会按密度重算质量）';
  box.appendChild(sM2);
  box.appendChild(sbTools(MATS.map(function(M){
    return [M.n,function(){sbSetMat(b,M.k);sbSelPanel();},b.mat===M.k?'on':''];
  })));
  sbSlider(box,'质量 m (kg)',0.05,600,0.1,function(){return b.m;},function(v){b.m=Math.max(0.05,v);sbMass(b);});
  sbSlider(box,'强度 hp (J)',1,2000,1,function(){return b.hpmax;},
    function(v){b.hpmax=Math.max(1,v);b.hp=Math.min(b.hp,b.hpmax);});
  sbSlider(box,'当前损伤 hp',0,2000,1,function(){return b.hp;},
    function(v){b.hp=clamp(v,0,b.hpmax);});
  sbSlider(box,'弹性 e',0,1,0.05,function(){return b.e;},function(v){b.e=v;});
  sbSlider(box,'摩擦 μ',0,1.2,0.05,function(){return b.mu;},function(v){b.mu=v;});
  if(b.boom){
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
  }"""))

R.append(('sbReadout 增加强度与引信', """    rows.push(['动能',fmt(0.5*b.m*(b.vx*b.vx+b.vy*b.vy)+0.5*b.I*b.w*b.w,2)+' J']);""",
"""    rows.push(['动能',fmt(0.5*b.m*(b.vx*b.vx+b.vy*b.vy)+0.5*b.I*b.w*b.w,2)+' J']);
    rows.push(['材质',matDef(b.mat).n+(b.frag?'（碎块）':'')]);
    rows.push(['强度 hp',fmt(b.hp,1)+' / '+fmt(b.hpmax,1)+' J']);
    if(b.boom)rows.push(['炸药',fmt(b.boom.kg,2)+' kg TNT · 半径 '+fmt(b.boom.R,2)+' m'+
      (b.fuse>=0?(' · 引信 '+fmt(Math.max(b.fuse,0),2)+' s'):' · 撞击起爆')]);"""))

# ---------------------------------------------------------------- 11. 手机工具条
R.append(('sbMobBar 增加炸药', """    ['＋挡板',function(){sbAddAt('wall');}],
    ['sep'],""",
"""    ['＋挡板',function(){sbAddAt('wall');}],
    ['＋炸药',function(){sbAddAt('bomb');}],
    ['引爆',function(){sbDetonateAll();},'pri'],
    ['sep'],"""))

# ---------------------------------------------------------------- 12. 预设重置特效
R.append(('sbPreset 清特效', """  SB.sel=null;SB.grab=null;SB.pan=null;SB.rot=null;SB.selLink=null;SB.pick=null;
  SB.Ex=0;SB.Ey=0;SB.Bz=0;""",
"""  SB.sel=null;SB.grab=null;SB.pan=null;SB.rot=null;SB.selLink=null;SB.pick=null;
  SB.Ex=0;SB.Ey=0;SB.Bz=0;
  SB.fx=[];SB.brk=[];SB.shake=0;SB.flash=0;"""))

R.append(('sbClear 清特效', """  SB.hist=[];SB.sel=null;SB.grab=null;SB.rot=null;SB.selLink=null;
  sbSelPanel();sbAutoSave();""",
"""  SB.hist=[];SB.sel=null;SB.grab=null;SB.rot=null;SB.selLink=null;
  SB.fx=[];SB.brk=[];SB.shake=0;SB.flash=0;
  sbSelPanel();sbAutoSave();"""))

# ---------------------------------------------------------------- 13. 新预设
R.append(('新增爆破预设', """  {name:'速度选择器',build:function(){""",
"""  {name:'材质对比',build:function(){
    SB.g=10;sbWorld();
    var ms=[['glass',5],['ice',8],['wood',11],['steel',14]];
    for(var i=0;i<ms.length;i++){
      SB.bodies.push(sbMake({shape:'box',bw:1.1,bh:1.1,x:ms[i][1],y:3.4,mat:ms[i][0],mu:0.4,e:0.1}));
    }
  }},
  {name:'爆破实验',build:function(){
    SB.g=10;sbWorld();
    for(var i=0;i<5;i++)for(var j=0;j<4;j++){
      SB.bodies.push(sbMake({shape:'box',bw:0.66,bh:0.66,x:8.2+i*0.74,y:0.38+j*0.72,
        mat:(j>1?'wood':'glass'),mu:0.5,e:0.05}));
    }
    SB.bodies.push(sbMake({shape:'box',bw:0.6,bh:0.6,x:9.9,y:0.36,mat:'tnt',
      boom:{kg:3,R:sbBoomR(3)},fuse:-1}));
  }},
  {name:'速度选择器',build:function(){"""))

# ---------------------------------------------------------------- 14. 存档字段
R.append(('sbSnap 增加材质炸药', """           q:b.q||0,ax:b.ax?[b.ax[0],b.ax[1],b.ax[2],b.ax[3],b.ax[4]]:0};""",
"""           q:b.q||0,ax:b.ax?[b.ax[0],b.ax[1],b.ax[2],b.ax[3],b.ax[4]]:0,
           mt:b.mat||'wood',hp:(b.hp===undefined?0:+b.hp.toFixed(2)),
           bm:(b.boom?[+b.boom.kg.toFixed(3),+(b.boom.R||0).toFixed(3)]:0),fu:b.fuse};"""))

R.append(('sbRestore 恢复材质炸药', """    if(d.ax)b.ax=[d.ax[0],d.ax[1],d.ax[2],d.ax[3],d.ax[4]];""",
"""    if(d.ax)b.ax=[d.ax[0],d.ax[1],d.ax[2],d.ax[3],d.ax[4]];
    if(d.mt)b.mat=d.mt;
    if(d.bm)b.boom={kg:d.bm[0],R:d.bm[1]};
    if(d.fu!==undefined)b.fuse=d.fu;
    b.fuse0=(b.fuse>0?b.fuse:1);
    if(d.hp!==undefined&&d.hp>0){b.hp=d.hp;}
    sbHpInit(b);
    if(d.hp!==undefined&&d.hp>0){b.hp=Math.min(d.hp,b.hpmax);}"""))

# ---------------------------------------------------------------- 15. 重力倾斜（手触陀螺仪用于沙盒）
R.append(('倾斜重力实现', """/* ---------- 手机端浮动工具条 ---------- */""",
"""/* ---------- 手触 / 体感陀螺仪：用手机倾斜改沙盒的重力方向 ---------- */
var TILT={b:0,g:0,live:0};
function sbTiltOri(e){
  if(e.beta===null&&e.gamma===null)return;
  TILT.b=e.beta||0;TILT.g=e.gamma||0;TILT.live=1;
}
function sbTiltBind(){
  try{
    window.addEventListener('deviceorientation',sbTiltOri,false);
    setTimeout(function(){if(!TILT.live)SB.tiltMsg='没读到陀螺仪数据（桌面设备没有）';},1200);
  }catch(e){SB.tiltMsg='这个浏览器不支持陀螺仪';}
}
function sbUnTilt(){
  try{window.removeEventListener('deviceorientation',sbTiltOri,false);}catch(e){}
  TILT.live=0;SB.tiltMsg='';
}
/* 屏幕旋转以后，"横滚"对应的轴会换，横屏时用 beta 才对 */
function sbTiltRoll(){
  var oa=0;
  try{oa=(screen.orientation&&screen.orientation.angle)||window.orientation||0;}catch(e){oa=0;}
  oa=((oa%360)+360)%360;
  return (oa===90||oa===270)?TILT.b:TILT.g;
}
function sbTiltToggle(){
  if(SB.tiltG){SB.tiltG=0;sbUnTilt();sbToast('已停止跟随手机倾斜');sbPanel();return;}
  if(typeof window==='undefined'||typeof window.DeviceOrientationEvent==='undefined'){
    sbToast('这台设备没有陀螺仪，用上面的「重力方向」滑块手动调');sbPanel();return;
  }
  var req=window.DeviceOrientationEvent.requestPermission;
  if(typeof req==='function'){
    req().then(function(r){
      if(r==='granted'){SB.tiltG=1;SB.tiltBase=null;sbTiltBind();sbToast('已开启，转一下手机，重力跟着歪');sbPanel();}
      else sbToast('没拿到陀螺仪权限');
    })['catch'](function(){sbToast('陀螺仪权限被拒绝');});
    return;
  }
  SB.tiltG=1;SB.tiltBase=null;sbTiltBind();
  sbToast('已开启，转一下手机，重力跟着歪');sbPanel();
}
/* 每帧把"当前横滚 - 基准横滚"换算成重力方向 */
function sbTiltApply(){
  if(!SB.tiltG)return;
  var r=sbTiltRoll();
  if(SB.tiltBase===null)SB.tiltBase=r;
  var d=(r-SB.tiltBase);
  while(d>180)d-=360;
  while(d<-180)d+=360;
  SB.gdir=-Math.PI/2-SB.tiltFlip*d*Math.PI/180;
}

/* ---------- 手机端浮动工具条 ---------- */"""))

R.append(('sbStep 前调用倾斜', """function sbStep(dt){
  // 子步按最硬弹簧自适应加密""",
"""function sbStep(dt){
  sbTiltApply();
  // 子步按最硬弹簧自适应加密"""))

# ---------------------------------------------------------------- 16. 图表修复
R.append(('沙盒显示曲线', """  $('#charts').style.display='none';   // 沙盒没有 v-t/E-t 曲线，隐藏避免白占一屏高度""",
"""  $('#charts').style.display='';       // 沙盒照样显示 系统动量 / 机械能 曲线"""))

R.append(('drawChart 单点与面积与游标', """  if(!hist.length||!cfg)return;
  var n=Math.min(cursor+1,hist.length);
  var keys=cfg.keys;""",
"""  if(!hist.length||!cfg)return;
  var n=Math.min(cursor+1,hist.length);
  var keys=cfg.keys;
  if(!keys||!keys.length)return;"""))

R.append(('drawChart 曲线主体', """  for(var k=0;k<keys.length;k++){
    g.strokeStyle=keys[k].color;g.lineWidth=1.8;
    if(keys[k].dash)g.setLineDash([5,4]);else g.setLineDash([]);
    g.beginPath();
    for(var i=0;i<n;i++){
      var x=X(hist[i].t),y=Y(hist[i][cfg.field][k]);
      if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
    }
    g.stroke();g.setLineDash([]);
  }""",
"""  // 第一条曲线下方的填充：v-t 的面积就是位移，看得见才算真的懂
  if(cfg.area&&n>1){
    var base=clamp(Y(0),pt,pt+ph);
    g.fillStyle='rgba(37,99,235,.10)';
    g.beginPath();g.moveTo(X(hist[0].t),base);
    for(var i2=0;i2<n;i2++)g.lineTo(X(hist[i2].t),Y(hist[i2][cfg.field][0]));
    g.lineTo(X(hist[n-1].t),base);g.closePath();g.fill();
  }
  for(var k=0;k<keys.length;k++){
    g.strokeStyle=keys[k].color;g.lineWidth=1.8;
    if(keys[k].dash)g.setLineDash([5,4]);else g.setLineDash([]);
    g.beginPath();
    for(var i=0;i<n;i++){
      var x=X(hist[i].t),y=Y(hist[i][cfg.field][k]);
      if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
    }
    // 只有一个采样点时画不出来折线，补一条水平线，免得整张图看着像坏了
    if(n<2){
      var y1=Y(hist[0][cfg.field][k]);
      g.lineTo(pad+pw,y1);
    }
    g.stroke();g.setLineDash([]);
  }
  // 当前时刻的游标点
  if(n>0){
    var cx=X(hist[n-1].t),cy=Y(hist[n-1][cfg.field][0]);
    g.fillStyle=keys[0].color;
    g.beginPath();g.arc(clamp(cx,pad,pad+pw),clamp(cy,pt,pt+ph),3,0,Math.PI*2);g.fill();
    g.strokeStyle='#fff';g.lineWidth=1.4;g.stroke();
  }"""))

R.append(('kinema v-t 面积', """    vel:{field:'v',title:'速度—时间 v-t（斜率＝加速度，面积＝位移）',unit:'m/s',
         keys:[{label:'速度 v',color:'#2563eb'}]},""",
"""    vel:{field:'v',title:'速度—时间 v-t（斜率＝加速度，面积＝位移）',unit:'m/s',area:true,
         keys:[{label:'速度 v',color:'#2563eb'}]},"""))

# ---------------------------------------------------------------- 17. cosmos 按键 / 手触陀螺盘
R.append(('cosmos 按钮组', """  C3.btn=[];
  var bw=64,bh=24,x0=W-bw-10,y0=10;
  C3.btn.push({x:x0,y:y0,w:bw,h:bh,t:C3.gy?'陀螺仪 开':'陀螺仪 关',a:1});
  C3.btn.push({x:x0,y:y0+bh+6,w:bw,h:bh,t:'复位视角',a:2});
  for(i=0;i<C3.btn.length;i++){
    var bt=C3.btn[i];
    g.fillStyle=C3.gy&&bt.a===1?'rgba(74,222,128,0.20)':'rgba(30,41,59,0.75)';
    rrect(g,bt.x,bt.y,bt.w,bt.h,6);g.fill();
    g.strokeStyle=C3.gy&&bt.a===1?'rgba(74,222,128,0.7)':'rgba(148,163,184,0.45)';
    g.lineWidth=1;rrect(g,bt.x,bt.y,bt.w,bt.h,6);g.stroke();""",
"""  C3.btn=[];
  var bw=68,bh=24,x0=W-bw-10,y0=10,by=y0;
  C3.btn.push({x:x0,y:by,w:bw,h:bh,t:C3.gy?'陀螺仪 开':'陀螺仪 关',a:1});
  by+=bh+6;
  if(C3.gy){C3.btn.push({x:x0,y:by,w:bw,h:bh,t:'校准基准',a:4});by+=bh+6;}
  C3.btn.push({x:x0,y:by,w:bw,h:bh,t:C3.tp?'手触陀螺 开':'手触陀螺 关',a:3});
  by+=bh+6;
  C3.btn.push({x:x0,y:by,w:bw,h:bh,t:'复位视角',a:2});
  for(i=0;i<C3.btn.length;i++){
    var bt=C3.btn[i];
    var on=(bt.a===1&&C3.gy)||(bt.a===3&&C3.tp);
    g.fillStyle=on?'rgba(74,222,128,0.20)':'rgba(30,41,59,0.75)';
    rrect(g,bt.x,bt.y,bt.w,bt.h,6);g.fill();
    g.strokeStyle=on?'rgba(74,222,128,0.7)':'rgba(148,163,184,0.45)';
    g.lineWidth=1;rrect(g,bt.x,bt.y,bt.w,bt.h,6);g.stroke();"""))

R.append(('cosmos 手触陀螺盘绘制', """  var tip=['按住天体拖到别处','点空白放一个，按住拖出速度','点中天体就删掉','按住画面拖动转视角，滚轮缩放'][clamp(Math.round(P.mode),0,3)];
  label(g,10,H-10,tip,'rgba(148,163,184,0.7)','left');""",
"""  /* 手触陀螺盘：手指在圆盘上滑动就转视角，没有体感陀螺仪的设备也能用 */
  if(C3.tp){
    var pr=52,pcx=W-pr-16,pcy=H-pr-16;
    C3.tpC={x:pcx,y:pcy,r:pr};
    g.fillStyle='rgba(12,18,36,.45)';
    g.beginPath();g.arc(pcx,pcy,pr,0,Math.PI*2);g.fill();
    g.strokeStyle='rgba(148,163,184,.55)';g.lineWidth=1.2;
    g.beginPath();g.arc(pcx,pcy,pr,0,Math.PI*2);g.stroke();
    g.strokeStyle='rgba(148,163,184,.28)';
    g.beginPath();g.moveTo(pcx-pr,pcy);g.lineTo(pcx+pr,pcy);
    g.moveTo(pcx,pcy-pr);g.lineTo(pcx,pcy+pr);g.stroke();
    var ox=clamp(-Math.sin(C3.yaw)*pr*0.72,-pr*0.8,pr*0.8);
    var oy=clamp(Math.sin(C3.pitch)*pr*0.72,-pr*0.8,pr*0.8);
    g.fillStyle='rgba(34,211,238,.85)';
    g.beginPath();g.arc(pcx+ox,pcy+oy,9,0,Math.PI*2);g.fill();
    g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=1.4;g.stroke();
    g.fillStyle='rgba(226,232,240,.85)';g.textAlign='center';
    g.fillText('手触陀螺',pcx,pcy+pr+14);
    g.textAlign='left';
  }else C3.tpC=null;
  var tip=['按住天体拖到别处','点空白放一个，按住拖出速度','点中天体就删掉','按住画面拖动转视角，滚轮缩放'][clamp(Math.round(P.mode),0,3)];
  label(g,10,H-10,tip+(C3.tp?'；右下角圆盘也能转视角':''),'rgba(148,163,184,0.7)','left');"""))

R.append(('cosmos 按钮动作', """      if(bt.a===1)gyToggle();
      else {C3.yaw=-0.62;C3.pitch=0.34;C3.zk=1;C3.gyMsg='视角已复位';}
      return null;
    }
  }
  var md=clamp(Math.round(P.mode),0,3);""",
"""      if(bt.a===1)gyToggle();
      else if(bt.a===4){C3.gyBase=null;C3.gyMsg='已按现在的姿势校准基准';}
      else if(bt.a===3){
        C3.tp=C3.tp?0:1;
        if(C3.tp&&C3.gy){C3.gy=0;gyUnbind();}
        C3.gyMsg=C3.tp?'手触陀螺已开：在右下角圆盘上滑动转视角':'';
      }
      else {C3.yaw=-0.62;C3.pitch=0.34;C3.zk=1;C3.gyMsg='视角已复位';}
      return null;
    }
  }
  if(C3.tp&&C3.tpC){
    var tdx=q.x-C3.tpC.x,tdy=q.y-C3.tpC.y;
    if(tdx*tdx+tdy*tdy<=C3.tpC.r*C3.tpC.r){C3.gy=0;return {kind:'tilt',lx:q.x,ly:q.y};}
  }
  var md=clamp(Math.round(P.mode),0,3);"""))

R.append(('cosmos tilt 拖动', """Scenes.cosmos.pointerMove=function(wx,wy,st,P,dr){
  var q=c3Pix(wx,wy);
  if(dr.kind==='cam'){""",
"""Scenes.cosmos.pointerMove=function(wx,wy,st,P,dr){
  var q=c3Pix(wx,wy);
  if(dr.kind==='tilt'){
    C3.yaw+=(q.x-dr.lx)*0.011;
    C3.pitch=clamp(C3.pitch-(q.y-dr.ly)*0.011,-1.45,1.45);
    dr.lx=q.x;dr.ly=q.y;
    return;
  }
  if(dr.kind==='cam'){"""))

R.append(('C3 增加 tp 字段', """  gy:0, gyBase:null, gyY0:0, gyP0:0, gyMsg:'', gyLive:0,
  btn:[], hit:null
};""",
"""  gy:0, gyBase:null, gyY0:0, gyP0:0, gyMsg:'', gyLive:0,
  tp:0, tpC:null,
  btn:[], hit:null
};"""))

# ---------------------------------------------------------------- 18. 文案
R.append(('首页沙盒简介', """ {id:'sandbox',name:'自由沙盒',
  desc:'任意拼装斜面、滑轮、弹簧、绳索，还能加电场磁场，自己搭装置做实验。',
  tags:['弹簧 / 绳索','电场磁场','碰撞动量']},""",
""" {id:'sandbox',name:'自由沙盒',
  desc:'任意拼装斜面、滑轮、弹簧、绳索，加电场磁场，还能放炸药。八种材质各有密度弹性强度，玻璃一摔就碎、钢怎么砸都不烂，爆炸有火球冲击波和碎片。',
  tags:['弹簧 / 绳索','电场磁场','材质与爆破']},"""))

R.append(('沙盒操作提示', """    '<b>📱 手机/平板</b>：单指拖＝抓取或平移，<b>双指捏合</b>＝缩放，<b>双指转动</b>＝让选中物体翻滚，<b>双击空白</b>＝加方块</div>';""",
"""    '<b>手机/平板</b>：单指拖＝抓取或平移，<b>双指捏合</b>＝缩放，<b>双指转动</b>＝让选中物体翻滚，<b>双击空白</b>＝加方块<br>'+
    '<b>爆破玩法</b>：左下工具「＋炸药」放一个，点「引爆」；也可以把引信设成几秒，看它倒计时炸开</div>';"""))

R.append(('cosmos 简介补手触陀螺', """  desc:'放几个天体进去，看它们互相拽着跑。点一下放一个，拖一下给速度，能斜着看、转着看，手机上开陀螺仪晃着看。',""",
"""  desc:'放几个天体进去，看它们互相拽着跑。点一下放一个，拖一下给速度，能斜着看、转着看；手机上可以开体感陀螺仪晃着看，没有陀螺仪就用「手触陀螺」圆盘滑着转。',"""))

# ---------------------------------------------------------------- 应用
bad = []
for name, old, new in R:
    c = s.count(old)
    if c != 1:
        bad.append('%s -> 匹配 %d 次' % (name, c))
        continue
    s = s.replace(old, new, 1)

if bad:
    print('失败：')
    for b in bad:
        print('  ' + b)
    sys.exit(1)

io.open(SRC, 'w', encoding='utf-8').write(s)
print('已应用 %d 处补丁，%d -> %d 字节' % (len(R), os.path.getsize('index.html.bak6'), os.path.getsize(SRC)))
