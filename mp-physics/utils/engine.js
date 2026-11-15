/* ------------------------------------------------------------------
 * 由 _build_mp.py 从 index.html 自动生成，请勿手改。
 * 源文件：index.html 的内联脚本（网页版单文件应用）
 * ------------------------------------------------------------------ */
'use strict';

var __env = require('./env.js');

/* 引擎按浏览器写法写死了这些全局，这里统一指到适配层 */
var document = __env.document;
var window = __env.window;
var localStorage = __env.localStorage;
var navigator = __env.navigator;
var performance = __env.performance;
var location = __env.location;
var screen = __env.screen;
var requestAnimationFrame = __env.requestAnimationFrame;
var cancelAnimationFrame = __env.cancelAnimationFrame;
var AudioContext = __env.AudioContext;
var webkitAudioContext = __env.AudioContext;
var DeviceOrientationEvent = __env.DeviceOrientationEvent;
var devicePixelRatio = __env.DPR;
var innerWidth = __env.VW;
var innerHeight = __env.VH;
var __wx = (typeof wx !== 'undefined') ? wx : null;


(function(){
'use strict';
var $=function(s){return document.querySelector(s);};
var fmt=function(v,n){n=(n===undefined)?2:n;if(!isFinite(v))return '--';if(Math.abs(v)<5e-13)v=0;return v.toFixed(n);};
var clamp=function(v,a,b){return v<a?a:(v>b?b:v);};
var sign=function(v){return v>0?1:(v<0?-1:0);};

/* ============ 通用绘图工具 ============ */
// 世界坐标 -> 屏幕（y 轴向上为正）
function View(){this.scale=60;this.ox=60;this.oy=0;this.W=800;this.H=420;}
View.prototype.sx=function(x){return this.ox+x*this.scale;};
View.prototype.sy=function(y){return this.oy-y*this.scale;};
// 根据包围盒自适应（带平滑）
View.prototype.fit=function(bx,by,w,h){
  var pad=46;
  var ww=Math.max(bx[1]-bx[0],0.001), hh=Math.max(by[1]-by[0],0.001);
  var s=Math.min((w-pad*2)/ww,(h-pad*2)/hh);
  s=clamp(s,4,400);
  this.scale=this.scale+(s-this.scale)*0.12;
  var cx=(bx[0]+bx[1])/2, cy=(by[0]+by[1])/2;
  var tox=w/2-cx*this.scale, toy=h/2+cy*this.scale;
  this.ox=this.ox+(tox-this.ox)*0.12;
  this.oy=this.oy+(toy-this.oy)*0.12;
  this.W=w;this.H=h;
};
function arrow(g,x0,y0,x1,y1,color,width){
  var dx=x1-x0,dy=y1-y0,len=Math.sqrt(dx*dx+dy*dy);
  if(len<1.2)return;
  g.strokeStyle=color;g.fillStyle=color;g.lineWidth=width||2;
  g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();
  var a=Math.atan2(dy,dx),hs=Math.min(9,len*0.4);
  g.beginPath();
  g.moveTo(x1,y1);
  g.lineTo(x1-hs*Math.cos(a-0.42),y1-hs*Math.sin(a-0.42));
  g.lineTo(x1-hs*Math.cos(a+0.42),y1-hs*Math.sin(a+0.42));
  g.closePath();g.fill();
}
function label(g,x,y,txt,color,align){
  g.font='12px -apple-system,"Microsoft YaHei",sans-serif';
  g.fillStyle=color||'#374151';
  g.textAlign=align||'left';g.textBaseline='middle';
  g.fillText(txt,x,y);
}
function roundRect(g,x,y,w,h,r){
  g.beginPath();
  g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);
  g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);
  g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();
}

/* ============ 图表 ============ */
function drawChart(cv,hist,cursor,cfg){
  var dpr=Math.min(window.devicePixelRatio||1,2);   // 上限 2：安卓 X5 内核大 canvas 有内存上限
  var W=cv.clientWidth||400,H=(W<560)?150:170;
  cv.style.height=H+'px';
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  var g=cv.getContext('2d');
  g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,W,H);
  if(!hist.length||!cfg)return;
  var n=Math.min(cursor+1,hist.length);
  var keys=cfg.keys;
  if(!keys||!keys.length)return;
  var tmax=Math.max(hist[n-1].t,0.001);
  var vmax=-1e18,vmin=1e18;
  for(var i=0;i<n;i++){
    var arr=hist[i][cfg.field];
    for(var k=0;k<keys.length;k++){
      var v=arr[k];
      if(v>vmax)vmax=v;if(v<vmin)vmin=v;
    }
  }
  if(vmax-vmin<1e-9){vmax+=1;vmin-=1;}
  var pad=44,pt=16,pb=22;
  var pw=W-pad-12,ph=H-pt-pb;
  var X=function(t){return pad+(t/tmax)*pw;};
  var Y=function(v){return pt+ph-(v-vmin)/(vmax-vmin)*ph;};
  g.strokeStyle='#eef2f7';g.lineWidth=1;
  for(var i=0;i<=4;i++){
    var v=vmin+(vmax-vmin)*i/4,y=Y(v);
    g.beginPath();g.moveTo(pad,y);g.lineTo(pad+pw,y);g.stroke();
    label(g,pad-5,y,fmt(v,1),'#9ca3af','right');
  }
  for(var i=0;i<=4;i++){
    var t=tmax*i/4,x=X(t);
    g.strokeStyle='#f8fafc';g.beginPath();g.moveTo(x,pt);g.lineTo(x,pt+ph);g.stroke();
    label(g,x,H-7,fmt(t,1)+'s','#9ca3af','center');
  }
  g.strokeStyle='#cbd5e1';
  g.beginPath();g.moveTo(pad,pt);g.lineTo(pad,pt+ph);g.lineTo(pad+pw,pt+ph);g.stroke();
  // 第一条曲线下方的填充：v-t 的面积就是位移，看得见才算真的懂
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
  }
  // 图例
  var lx=pad+4;
  label(g,lx,pt-8,cfg.title+'  ('+cfg.unit+')','#374151','left');
  var tx=pad+pw;
  for(var k=keys.length-1;k>=0;k--){
    var tW=g.measureText(keys[k].label).width+18;
    tx-=tW;
    g.fillStyle=keys[k].color;g.fillRect(tx,pt-12,10,3);
    label(g,tx+14,pt-8,keys[k].label,'#6b7280','left');
    g.fillStyle='#000';
  }
}

/* ============ 物理引擎容器 ============ */
var App={
  scene:null,P:{},state:null,hist:[],playing:false,speed:1,mode:'scene',
  cursor:0,view:new View(),showVec:true,showTrail:true,trail:[]
};

function resetSim(){
  App.state=App.scene.init(App.P);
  App.hist=[];
  App.cursor=0;
  App.trail=[];
  pushHist();
  syncTL();
}
function pushHist(){
  var s=App.state;
  var rec={t:s.t,v:App.scene.vel(s,App.P).map(function(o){return o.value;}),
           e:App.scene.en(s,App.P).map(function(o){return o.value;}),
           snap:JSON.parse(JSON.stringify(s))};
  App.hist.push(rec);
  if(App.hist.length>4000)App.hist.shift();
  App.cursor=App.hist.length-1;
}
// 固定步长子步积分
function advance(dtSim){
  var sc=App.scene,st=App.state,P=App.P;
  var n=Math.max(1,Math.ceil(dtSim/0.001));
  var h=dtSim/n;
  for(var i=0;i<n;i++){
    if(sc.finished(st,P))break;
    sc.step(st,P,h);
    st.t+=h;
  }
  if(App.showTrail){
    var p=sc.trailPoint?sc.trailPoint(st,P):null;
    if(p){App.trail.push(p);if(App.trail.length>1500)App.trail.shift();}
  }
  pushHist();
}
function stepOnce(){ // 单步 0.02s
  if(!App.scene.finished(App.state,App.P))advance(0.02);
  syncTL();
}
function runToEnd(){
  var sc=App.scene,st=App.state,P=App.P,guard=0;
  while(!sc.finished(st,P)&&guard<8000){advance(0.01);guard++;}
  syncTL();
}

/* ============ 渲染 ============ */
function render(){
  if(App.mode==='sandbox'){sbRender();return;}
  var cv=$('#scene'),dpr=Math.min(window.devicePixelRatio||1,2);
  var W=cv.clientWidth;
  // 窄屏（手机竖屏）给画布更高的占比，避免可视区被控件挤占
  var H=(W<560)?Math.round(Math.min(Math.max(W*0.78,260),430))
              :Math.round(Math.min(Math.max(W*0.52,300),460));
  cv.style.height=H+'px';
  if(cv.height!==Math.round(H*dpr)||cv.width!==Math.round(W*dpr)){
    cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  }
  var g=cv.getContext('2d');
  g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,W,H);
  var st=App.state,P=App.P,sc=App.scene;
  var b=sc.bounds(st,P);
  App.view.fit(b.x,b.y,W,H);
  sc.draw(g,st,P,App.view,{vec:App.showVec});
  // 轨迹
  if(App.showTrail&&App.trail.length>1){
    g.strokeStyle='rgba(37,99,235,.35)';g.lineWidth=1.5;g.setLineDash([4,3]);
    g.beginPath();
    for(var i=0;i<App.trail.length;i++){
      var p=App.trail[i],X=App.view.sx(p[0]),Y=App.view.sy(p[1]);
      if(i===0)g.moveTo(X,Y);else g.lineTo(X,Y);
    }
    g.stroke();g.setLineDash([]);
  }
  $('#stageTag').textContent=sc.stage(st,P);
  $('#timeTag').textContent='t = '+fmt(st.t)+' s';
  drawReadout();
  drawChart($('#chV'),App.hist,App.cursor,sc.charts.vel);
  drawChart($('#chE'),App.hist,App.cursor,sc.charts.en);
}
function drawReadout(){
  var rows=App.scene.info(App.state,App.P);
  var h='';
  for(var i=0;i<rows.length;i++){
    h+='<tr><td class="k">'+rows[i][0]+'</td><td>'+rows[i][1]+'</td></tr>';
  }
  $('#readout').innerHTML=h;
}
function syncTL(){
  var tl=$('#tl');
  tl.max=String(Math.max(App.hist.length-1,0));
  tl.value=String(App.cursor);
  $('#tlT').textContent=fmt(App.state.t)+'s';
}

/* ============ 参数面板 ============ */
function buildParams(){
  var box=$('#params');box.innerHTML='';
  var sc=App.scene;
  $('#pname').textContent=sc.name;
  $('#brief').textContent=sc.brief||'';
  /* 模块专属开关（例如惯性力 / 非惯性系）：模块声明 sc.toggles 就会出现一行按钮 */
  if(sc.toggles&&sc.toggles.length){
    var tw=document.createElement('div');tw.className='toggles';
    sc.toggles.forEach(function(t){
      if(App.P[t.key]===undefined)App.P[t.key]=t.def?1:0;
      var b=document.createElement('button');
      b.className='tgl'+(App.P[t.key]?' on':'');
      b.textContent=t.label;
      b.onclick=function(){
        App.P[t.key]=App.P[t.key]?0:1;
        b.className='tgl'+(App.P[t.key]?' on':'');
        var wp=App.playing;App.playing=false;resetSim();render();App.playing=wp;
      };
      tw.appendChild(b);
    });
    box.appendChild(tw);
  }
  sc.params.forEach(function(p){
    var row=document.createElement('div');row.className='prow';
    var lab=document.createElement('label');lab.textContent=p.label+(p.unit?' ('+p.unit+')':'');
    var rg=document.createElement('input');rg.type='range';
    rg.min=p.min;rg.max=p.max;rg.step=p.step;rg.value=App.P[p.key];
    var nb=document.createElement('input');nb.type='number';
    nb.step=p.step;nb.value=App.P[p.key];
    rg.oninput=function(){nb.value=rg.value;App.P[p.key]=parseFloat(rg.value);onParamChange();};
    nb.oninput=function(){var v=parseFloat(nb.value);if(isNaN(v))return;rg.value=v;App.P[p.key]=v;onParamChange();};
    row.appendChild(lab);row.appendChild(rg);row.appendChild(nb);
    row.dataset.key=p.key;
    box.appendChild(row);
  });
}
function refreshParamUI(){
  var sc=App.scene;
  var rows=$('#params').querySelectorAll('.prow');
  for(var i=0;i<rows.length;i++){
    var k=rows[i].dataset.key,v=App.P[k];
    rows[i].children[1].value=v;rows[i].children[2].value=v;
  }
  $('#pname').textContent=sc.name;
}
function onParamChange(){
  var wasPlaying=App.playing;App.playing=false;
  resetSim();render();
  App.playing=wasPlaying;
}

/* ============ 例题面板 ============ */
function buildExamples(){
  var box=$('#examples');box.innerHTML='';
  var list=App.scene.examples||[];
  list.forEach(function(ex){
    var d=document.createElement('div');d.className='ex';
    var cls=ex.level==='高考'?'lv h':'lv';
    d.innerHTML='<div class="hd"><b>'+ex.title+'</b><span class="'+cls+'">'+ex.level+'</span></div>'+
      '<div class="q">'+ex.q+'</div>'+
      '<div class="a">理论答案：'+ex.answer+'</div>';
    var b=document.createElement('button');b.textContent='载入参数';
    b.onclick=function(){
      for(var k in ex.params)App.P[k]=ex.params[k];
      refreshParamUI();App.playing=false;
      resetSim();render();
    };
    d.insertBefore(b,d.firstChild);
    b.style.cssText='float:right;margin:2px 0 0 0;';
    box.appendChild(d);
  });
}

/* ============ 主循环 ============ */
var lastRAF=0,saveTick=0;
function loop(){
  requestAnimationFrame(loop);
  if(UI.home)return;                              // 停在 App 首屏时不跑物理、不渲染
  if(++saveTick>300){saveTick=0;sbSaveStore();}   // 约每 5 秒静默落盘一次
  if(App.mode==='sandbox'){
    var now=(window.performance&&performance.now)?performance.now():Date.now();
    if(SB.lastT){var df=now-SB.lastT;if(df>0)SB.fps=SB.fps*0.9+(1000/df)*0.1;}
    SB.lastT=now;
    if(SB.run)sbStep(0.01*App.speed);
    sbRender();
    return;
  }
  if(App.playing){
    var dtSim=0.01*App.speed;
    if(!App.scene.finished(App.state,App.P)){advance(dtSim);}
    else{App.playing=false;$('#bPlay').textContent='▶ 播放';}
    syncTL();
  }
  render();
}

/* ============ 场景注册 ============ */
var Scenes={};

/* ---------- 场景一：传送带 ---------- */
Scenes.conveyor={
  id:'conveyor',name:'传送带模型',
  brief:'水平/倾斜传送带，物块与带相对滑动→共速全过程；自动计算划痕长度、摩擦生热 Q、电动机多耗电能。',
  params:[
    {key:'m',label:'物块质量',min:0.2,max:10,step:0.1,def:1,unit:'kg'},
    {key:'mu',label:'动摩擦因数 μ',min:0,max:1.2,step:0.01,def:0.2,unit:''},
    {key:'mus',label:'静摩擦因数 μs',min:0,max:1.5,step:0.01,def:0.3,unit:''},
    {key:'theta',label:'倾角 θ（右端高为正）',min:-40,max:40,step:1,def:0,unit:'°'},
    {key:'vBelt',label:'带速（正=向右）',min:-12,max:12,step:0.1,def:4,unit:'m/s'},
    {key:'v0',label:'物块初速',min:-12,max:12,step:0.1,def:0,unit:'m/s'},
    {key:'s0',label:'初始位置（距左端）',min:0,max:40,step:0.5,def:0,unit:'m'},
    {key:'L',label:'传送带长度',min:2,max:40,step:0.5,def:10,unit:'m'},
    {key:'g',label:'重力加速度 g',min:9.8,max:10,step:0.2,def:10,unit:'m/s²'}
  ],
  init:function(P){
    return {t:0,s:P.s0,v:P.v0,a:0,f:0,N:0,fType:'—',
      sRel:0,relPath:0,maxRel:0,minRel:0,onBelt:true,left:-1,beltPhase:0,Q:0};
  },
  step:function(st,P,h){
    var th=P.theta*Math.PI/180;
    var N=P.m*P.g*Math.cos(th);
    var gsin=P.m*P.g*Math.sin(th);   // 沿斜面"向上(正方向)"为正时的重力分量负值来源
    var vB=P.vBelt;
    var f=0,a=0;
    if(!st.onBelt){ // 已离开：只受重力做抛体（简化：沿斜面方向匀变速）
      a=-gsin/P.m; f=0; st.fType='—'; st.N=0;
      st.v+=a*h; st.s+=st.v*h; st.a=a; st.f=f; return;
    }
    st.N=N;
    var vrel=st.v-vB;
    if(Math.abs(vrel)>1e-9){
      f=-sign(vrel)*P.mu*N; st.fType='滑动摩擦';
    }else{
      var need=gsin;                 // 维持共速所需静摩擦（沿正方向）
      var fmax=P.mus*N;
      if(Math.abs(need)<=fmax+1e-9){
        f=need; st.fType='静摩擦';
        st.v=vB; a=0;
      }else{
        f=sign(gsin)*P.mu*N; st.fType='滑动摩擦';
      }
    }
    a=(f-gsin)/P.m;
    st.a=a;st.f=f;
    var vNew=st.v+a*h;
    // 穿越共速钳制
    if(Math.abs(vrel)>1e-9){
      var vr2=vNew-vB;
      if(vrel*vr2<0){ // 本步内达到共速
        if(Math.abs(gsin)<=P.mus*N){vNew=vB;a=0;st.fType='静摩擦';st.f=gsin;}
      }
    }
    st.v=vNew;
    st.s+=st.v*h;
    var vrelN=st.v-vB;
    st.sRel+=vrelN*h;
    var dRel=Math.abs(vrelN)*h;
    st.relPath+=dRel;
    st.Q+=P.mu*N*dRel;
    if(st.sRel>st.maxRel)st.maxRel=st.sRel;
    if(st.sRel<st.minRel)st.minRel=st.sRel;
    st.beltPhase+=vB*h;
    if(st.s<0){st.onBelt=false;st.left=0;st.s=0;}
    else if(st.s>P.L){st.onBelt=false;st.left=1;st.s=P.L;}
  },
  bounds:function(st,P){
    var th=P.theta*Math.PI/180;
    var x0=Math.min(0,P.L*Math.cos(th))-1.2,x1=Math.max(0,P.L*Math.cos(th))+1.2;
    var y0=Math.min(0,P.L*Math.sin(th))-1.2,y1=Math.max(0,P.L*Math.sin(th))+1.6;
    return {x:[x0,x1],y:[y0,y1]};
  },
  trailPoint:function(st,P){
    var th=P.theta*Math.PI/180;
    return [st.s*Math.cos(th),st.s*Math.sin(th)+0.25];
  },
  draw:function(g,st,P,V,opt){
    var th=P.theta*Math.PI/180,cs=Math.cos(th),sn=Math.sin(th);
    var X0=V.sx(0),Y0=V.sy(0),X1=V.sx(P.L*cs),Y1=V.sy(P.L*sn);
    var bw=Math.max(6,V.scale*0.16);
    // 传送带本体
    g.save();
    g.strokeStyle='#94a3b8';g.lineWidth=bw;g.lineCap='round';
    g.beginPath();g.moveTo(X0,Y0);g.lineTo(X1,Y1);g.stroke();
    // 带面纹理（表示运动）
    g.strokeStyle='#64748b';g.lineWidth=1.5;
    var nSeg=Math.max(4,Math.round(P.L/0.6));
    for(var i=0;i<=nSeg;i++){
      var frac=(i/nSeg+(st.beltPhase/P.L)%1+1)%1;
      var px=X0+(X1-X0)*frac,py=Y0+(Y1-Y0)*frac;
      // 屏幕切向（沿斜面）：世界(cs,sn) -> 屏幕(cs,-sn)；法向取(sn,cs)
      var ux=cs,uy=-sn;
      var pxn=sn,pyn=cs;
      g.beginPath();
      g.moveTo(px+pxn*bw*0.5,py+pyn*bw*0.5);
      g.lineTo(px-pxn*bw*0.5,py-pyn*bw*0.5);
      g.stroke();
    }
    g.restore();
    // 端点标记
    g.fillStyle='#475569';
    g.beginPath();g.arc(X0,Y0,3.5,0,6.283);g.fill();
    g.beginPath();g.arc(X1,Y1,3.5,0,6.283);g.fill();
    label(g,X0,Y0+16,'A（左端）','#64748b','center');
    label(g,X1,Y1+16,'B（右端）','#64748b','center');
    // 物块
    var bx=V.sx(st.s*cs),by=V.sy(st.s*sn);
    var bw2=Math.max(14,V.scale*0.34),bh2=bw2*0.62;
    g.save();
    g.translate(bx,by);g.rotate(-th);
    g.fillStyle=st.onBelt?'#3b82f6':'#f59e0b';
    roundRect(g,-bw2/2,-bh2-bw*0.5,bw2,bh2,3);g.fill();
    g.strokeStyle='#1e40af';g.lineWidth=1;g.stroke();
    g.restore();
    var cxp=bx, cyp=by-bh2*0.5-bw*0.5;
    if(opt.vec){
      var sc=V.scale*0.055; // 力缩放
      // 重力
      arrow(g,cxp,cyp,cxp,cyp+P.m*P.g*sc,'#dc2626',2);
      label(g,cxp+4,cyp+P.m*P.g*sc+9,'G='+fmt(P.m*P.g,1)+'N','#dc2626');
      // 支持力（垂直斜面向上）：世界法向 (-sn, cs)
      var nx=-sn,ny=cs;
      arrow(g,cxp,cyp,cxp+nx*st.N*sc,cyp-ny*st.N*sc,'#7c3aed',2);
      label(g,cxp+nx*st.N*sc-4,cyp-ny*st.N*sc-8,'N='+fmt(st.N,1)+'N','#7c3aed',nx>0?'left':'right');
      // 摩擦（沿斜面）
      var fpx=st.f*sc,fpy=0;
      arrow(g,cxp,cyp,cxp+cs*fpx,cyp-sn*fpx,'#059669',2);
      label(g,cxp+cs*fpx,cyp-sn*fpx-8,'f='+fmt(Math.abs(st.f),2)+'N','#059669','center');
      // 速度（橙色，沿斜面）
      var vs=V.scale*0.09;
      arrow(g,cxp,cyp,cxp+cs*st.v*vs,cyp-sn*st.v*vs,'#f59e0b',2.5);
      label(g,cxp+cs*st.v*vs+4,cyp-sn*st.v*vs-8,'v='+fmt(st.v,2),'#f59e0b');
      // 带速指示
      var bpx=X0+(X1-X0)*0.5,bpy=Y0+(Y1-Y0)*0.5;
      arrow(g,bpx,bpy+18,bpx+cs*P.vBelt*vs*0.6,bpy+18-sn*P.vBelt*vs*0.6,'#0891b2',2);
      label(g,bpx+cs*P.vBelt*vs*0.6,bpy+26,'带 v='+fmt(P.vBelt,1),'#0891b2','center');
    }
    // 相对位移标注
    label(g,12,18,'相对位移 Δs_rel = '+fmt(st.sRel)+' m   划痕 = '+fmt(st.maxRel-st.minRel)+' m','#374151');
  },
  info:function(st,P){
    var th=P.theta*Math.PI/180;
    var K=0.5*P.m*st.v*st.v;
    var U=P.m*P.g*st.s*Math.sin(th);
    var N=P.m*P.g*Math.cos(th);
    return [
      ['时间 t',fmt(st.t)+' s'],
      ['沿带位移 s',fmt(st.s)+' m'],
      ['速度 v',fmt(st.v)+' m/s'],
      ['加速度 a',fmt(st.a)+' m/s²'],
      ['摩擦力 f',fmt(st.f)+' N（'+st.fType+'）'],
      ['支持力 N',fmt(st.N)+' N'],
      ['最大静摩擦',fmt(P.mus*N)+' N'],
      ['相对位移 s_rel',fmt(st.sRel)+' m'],
      ['划痕长度',fmt(st.maxRel-st.minRel)+' m'],
      ['摩擦生热 Q',fmt(st.Q)+' J'],
      ['动能 Ek',fmt(K)+' J'],
      ['重力势能 Ep',fmt(U)+' J'],
      ['电动机多耗电',fmt((K+U)-(0.5*P.m*P.v0*P.v0+P.m*P.g*P.s0*Math.sin(th))+st.Q)+' J'],
      ['状态',st.onBelt?'在带上':(st.left===1?'已从右端离开':'已从左端滑出')]
    ];
  },
  vel:function(st,P){
    return [{label:'物块 v',color:'#2563eb',value:st.v},
            {label:'带速 v_B',color:'#0891b2',value:P.vBelt,dash:true}];
  },
  en:function(st,P){
    var th=P.theta*Math.PI/180;
    return [{label:'动能 Ek',color:'#2563eb',value:0.5*P.m*st.v*st.v},
            {label:'势能 Ep',color:'#7c3aed',value:P.m*P.g*st.s*Math.sin(th)},
            {label:'内能 Q',color:'#dc2626',value:st.Q}];
  },
  stage:function(st,P){
    if(!st.onBelt)return st.left===1?'已到达右端并离开传送带':'已从左端滑出传送带';
    if(st.fType==='滑动摩擦'){
      return '阶段：相对滑动中（'+(st.f>0?'摩擦沿斜面向上':'摩擦沿斜面向下')+'）—— 尚未共速';
    }
    return '阶段：与传送带共速（'+(Math.abs(P.theta)>0.01?'静摩擦平衡重力分量':'水平方向无力，匀速')+'）';
  },
  finished:function(st,P){return !st.onBelt;},
  charts:{
    vel:{field:'v',title:'速度—时间',unit:'m/s',keys:[{label:'物块 v',color:'#2563eb'},{label:'带速 vB',color:'#0891b2',dash:true}]},
    en:{field:'e',title:'能量—时间',unit:'J',keys:[{label:'动能 Ek',color:'#2563eb'},{label:'势能 Ep',color:'#7c3aed'},{label:'内能 Q',color:'#dc2626'}]}
  },
  examples:[
    {level:'基础',title:'例1 · 水平传送带，无初速释放',
     q:'水平传送带长 L=10 m，以 4 m/s 向右匀速运行。将 m=1 kg 物块无初速轻放在左端，μ=0.2，g=10。求物块运动总时间、划痕长度、摩擦生热 Q。',
     params:{m:1,mu:0.2,mus:0.3,theta:0,vBelt:4,v0:0,s0:0,L:10,g:10},
     answer:'先匀加速：a=μg=2 m/s²，t₁=v/a=2 s，s₁=4 m\n再共速匀速：s₂=6 m，t₂=1.5 s\n总时间 t=3.5 s（到右端）\n划痕 Δs=v·t₁−s₁=8−4=4 m\nQ=μmg·Δs_rel=2×4=8 J\n电动机多耗电=ΔEk+Q=8+8=16 J'},
    {level:'中档',title:'例2 · 物块以更大初速冲上传送带',
     q:'水平传送带 L=10 m，带速 4 m/s 向右。物块以 v₀=6 m/s 从左端冲上传送带，μ=0.2，m=1 kg，g=10。求物块到达右端时间与摩擦生热。',
     params:{m:1,mu:0.2,mus:0.3,theta:0,vBelt:4,v0:6,s0:0,L:10,g:10},
     answer:'相对带向前滑→摩擦向后，a=−2 m/s²\n减速到 4 m/s：t₁=1 s，s₁=5 m（带走 4 m）\n之后共速匀速：剩 5 m，t₂=1.25 s\n总时间 t=2.25 s\n划痕 Δs=5−4=1 m\nQ=μmg×1=2 J\n动能减少 10 J = |W_f|，其中 8 J 转为物块动能减少、2 J 为内能'},
    {level:'高考',title:'例3 · 倾斜传送带（μ<tanθ 送不上去）',
     q:'倾角 θ=37° 的传送带以 2 m/s 向上运行。将 m=1 kg 物块无初速放在传送带最高端（距底端 L=10 m），μ=0.5，g=10（sin37°=0.6，cos37°=0.8）。判断物块如何运动。',
     params:{m:1,mu:0.5,mus:0.5,theta:37,vBelt:2,v0:0,s0:10,L:10,g:10},
     answer:'比较：μmg cosθ=0.5×1×10×0.8=4 N，mg sinθ=1×10×0.6=6 N\n因 μ=0.5 < tan37°=0.75，滑动摩擦（4 N）顶不住重力分量（6 N）\n合力=6−4=2 N 沿斜面向下 → a=2 m/s²，物块向下匀加速\n滑到底端：t=√(2L/a)=√10≈3.16 s，末速度 v=at≈6.32 m/s\n结论：μ<tanθ 时无论带速多大，物块都无法被向上运送\n（能被送上去的临界条件：μ ≥ tanθ）'}
  ]
};

/* ---------- 场景二：板块模型 ---------- */
Scenes.blockBoard={
  id:'blockBoard',name:'板块模型',
  brief:'滑块—木板系统。自动判断共速/相对滑动/滑离；v-t 双曲线叠加，动量与能量（含 Q=f·s相对）实时核算。「滑块初始位置」0 表示位于木板左端，若木板加速更快滑块会向左退出木板。',
  params:[
    {key:'m1',label:'滑块质量 m₁',min:0.2,max:10,step:0.1,def:1,unit:'kg'},
    {key:'m2',label:'木板质量 m₂',min:0.2,max:20,step:0.1,def:2,unit:'kg'},
    {key:'v10',label:'滑块初速 v₁₀',min:-10,max:10,step:0.1,def:6,unit:'m/s'},
    {key:'v20',label:'木板初速 v₂₀',min:-10,max:10,step:0.1,def:0,unit:'m/s'},
    {key:'x10',label:'滑块初始位置（距板左端）',min:0,max:20,step:0.1,def:0,unit:'m'},
    {key:'mu1',label:'块-板动摩擦 μ₁',min:0,max:1.2,step:0.01,def:0.2,unit:''},
    {key:'mu1s',label:'块-板静摩擦 μ₁s',min:0,max:1.5,step:0.01,def:0.2,unit:''},
    {key:'mu2',label:'板-地动摩擦 μ₂',min:0,max:1.2,step:0.01,def:0,unit:''},
    {key:'mu2s',label:'板-地静摩擦 μ₂s',min:0,max:1.5,step:0.01,def:0,unit:''},
    {key:'L',label:'木板长度',min:0.5,max:20,step:0.1,def:4,unit:'m'},
    {key:'F',label:'外力 F 拉木板（右为正）',min:-40,max:40,step:0.5,def:0,unit:'N'},
    {key:'g',label:'重力加速度 g',min:9.8,max:10,step:0.2,def:10,unit:'m/s²'}
  ],
  init:function(P){
    return {t:0,x1:P.x10,v1:P.v10,a1:0,x2:0,v2:P.v20,a2:0,
      f1:0,f2:0,f1Type:'—',f2Type:'—',relPath:0,Q:0,
      onBoard:true,left:0,tLeave:0};
  },
  step:function(st,P,h){
    var m1=P.m1,m2=P.m2,g=P.g,F=P.F;
    var onB=st.onBoard;
    var N1=m1*g;                    // 块-板正压
    var N2=onB?(m1+m2)*g:m2*g;      // 板-地正压
    var f1=0,f2=0,a1=0,a2=0,f1T='—',f2T='—';
    var vrel=st.v1-st.v2;
    var f1max=P.mu1s*N1;

    if(!onB){
      /* 滑块已滑离：滑块在地面上，木板独立 */
      f1T='—';
      var fg=0;
      if(Math.abs(st.v1)>1e-9)fg=-sign(st.v1)*P.mu2*m1*g;
      a1=fg/m1;
      if(Math.abs(st.v2)>1e-9){f2=-sign(st.v2)*P.mu2*m2*g;f2T='滑动摩擦';}
      else{
        var netF=F;
        if(Math.abs(netF)<=P.mu2s*m2*g+1e-9){f2=-netF;f2T='静摩擦';}
        else{f2=-sign(netF)*P.mu2*m2*g;f2T='滑动摩擦';}
      }
      a2=(F+f2)/m2;
    }else if(Math.abs(vrel)>1e-6){
      /* 相对滑动：滑动摩擦阻碍相对运动 */
      f1=-sign(vrel)*P.mu1*N1;f1T='滑动摩擦';
      a1=f1/m1;
      if(Math.abs(st.v2)>1e-9){f2=-sign(st.v2)*P.mu2*N2;f2T='滑动摩擦';}
      else{
        var netB=F-f1;
        if(Math.abs(netB)<=P.mu2s*N2+1e-9){f2=-netB;f2T='静摩擦';}
        else{f2=-sign(netB)*P.mu2*N2;f2T='滑动摩擦';}
      }
      a2=(F-f1+f2)/m2;
    }else{
      /* 速度相同：判断是否真能保持共速 */
      if(Math.abs(st.v2)>1e-9){
        f2=-sign(st.v2)*P.mu2*N2;f2T='滑动摩擦';
        var a=(F+f2)/(m1+m2);
        var f1r=m1*a;
        if(Math.abs(f1r)<=f1max+1e-9){f1=f1r;f1T='静摩擦';a1=a;a2=a;}
        else{f1=sign(f1r)*P.mu1*N1;f1T='滑动摩擦';a1=f1/m1;a2=(F-f1+f2)/m2;}
      }else{
        var f2s=-F;
        if(Math.abs(f2s)<=P.mu2s*N2+1e-9){
          /* 整体可静止 */
          f2=f2s;f2T='静摩擦';f1=0;f1T='静摩擦';a1=0;a2=0;
        }else{
          var f2d=-sign(F)*P.mu2*N2;f2T='滑动摩擦';
          var aa=(F+f2d)/(m1+m2);
          var fr=m1*aa;
          if(Math.abs(fr)<=f1max+1e-9){f1=fr;f1T='静摩擦';a1=aa;a2=aa;}
          else{f1=sign(fr)*P.mu1*N1;f1T='滑动摩擦';a1=f1/m1;a2=(F-f1+f2d)/m2;}
          f2=f2d;
        }
      }
    }

    /* 半隐式欧拉：先更新速度，再更新位置 */
    var v1o=st.v1,v2o=st.v2;
    st.v1+=a1*h; st.v2+=a2*h;
    /* 穿越共速时钳制，避免抖动 */
    var vr=v1o-v2o, vrn=st.v1-st.v2;
    if(onB&&Math.abs(vr)>1e-9&&vr*vrn<0&&Math.abs(a1-a2)>1e-12){
      var fr2=clamp(-vr/((a1-a2)*h),0,1);
      var vc=v1o+a1*h*fr2;
      st.v1=vc;st.v2=vc;
    }
    st.x1+=st.v1*h; st.x2+=st.v2*h;
    if(P.mu1===0&&P.mu1s===0)f1T='—';
    if(P.mu2===0&&P.mu2s===0)f2T='—';
    st.a1=a1;st.a2=a2;st.f1=f1;st.f2=f2;st.f1Type=f1T;st.f2Type=f2T;

    /* 相对滑动路程与摩擦生热 */
    if(onB&&f1T==='滑动摩擦'){
      var dRel=Math.abs(st.v1-st.v2)*h;
      st.relPath+=dRel;
      st.Q+=P.mu1*N1*dRel;
    }
    /* 滑离判定（滑块视为质点，位置 x1；木板占 [x2, x2+L]） */
    if(onB){
      if(st.x1<st.x2-1e-9){st.onBoard=false;st.left=-1;st.tLeave=st.t;}
      else if(st.x1>st.x2+P.L+1e-9){st.onBoard=false;st.left=1;st.tLeave=st.t;}
    }
  },
  bounds:function(st,P){
    var x0=Math.min(st.x2,st.x1)-1.2,x1=Math.max(st.x2+P.L,st.x1)+1.2;
    return {x:[x0,x1],y:[-0.8,1.6]};
  },
  trailPoint:function(st,P){return [st.x1,0.45];},
  draw:function(g,st,P,V,opt){
    var gy=V.sy(0);              // 地面屏幕 y
    var bx0=V.sx(st.x2),bx1=V.sx(st.x2+P.L);
    var bh=Math.max(10,V.scale*0.16);
    /* 地面 */
    g.strokeStyle='#94a3b8';g.lineWidth=2;
    g.beginPath();g.moveTo(0,gy);g.lineTo(V.W,gy);g.stroke();
    g.strokeStyle='#cbd5e1';g.lineWidth=1;
    for(var x=0;x<V.W;x+=12){
      g.beginPath();g.moveTo(x,gy);g.lineTo(x-7,gy+7);g.stroke();
    }
    /* 木板 */
    g.fillStyle='#d97706';
    g.fillRect(bx0,gy-bh,bx1-bx0,bh);
    g.strokeStyle='#92400e';g.lineWidth=1;g.strokeRect(bx0,gy-bh,bx1-bx0,bh);
    label(g,(bx0+bx1)/2,gy-bh-9,'木板 m₂='+fmt(P.m2,1)+'kg  L='+fmt(P.L,1)+'m','#92400e','center');
    /* 滑块 */
    var sw=Math.min(Math.max(14,V.scale*0.3),Math.abs(bx1-bx0)*0.35||14);
    var sh=sw*0.7;
    var cx=V.sx(st.x1);
    var syTop=(st.onBoard?gy-bh:gy);
    g.fillStyle=st.onBoard?'#2563eb':'#f59e0b';
    roundRect(g,cx-sw/2,syTop-sh,sw,sh,3);g.fill();
    g.strokeStyle='#1e40af';g.lineWidth=1;g.stroke();
    label(g,cx,syTop-sh-9,'滑块 m₁='+fmt(P.m1,1)+'kg','#1e40af','center');
    /* 相对位移标注 */
    label(g,12,18,'相对滑动路程 = '+fmt(st.relPath)+' m   摩擦生热 Q = '+fmt(st.Q)+' J','#374151');
    if(opt.vec){
      var fs=V.scale*0.05;   // 力缩放
      var vs=V.scale*0.10;   // 速度缩放
      var ay=syTop-sh*0.5;
      /* 滑块受力 */
      arrow(g,cx,ay,cx,ay+P.m1*P.g*fs,'#dc2626',2);
      arrow(g,cx,ay,cx,ay-P.m1*P.g*fs,'#7c3aed',2);
      if(st.onBoard&&Math.abs(st.f1)>1e-9){
        arrow(g,cx,ay,cx+st.f1*fs,ay,'#059669',2);
        label(g,cx+st.f1*fs+ (st.f1>0?4:-4),ay-9,'f₁='+fmt(Math.abs(st.f1),2)+'N','#059669',st.f1>0?'left':'right');
      }
      arrow(g,cx,ay,cx+st.v1*vs,ay,'#f59e0b',2.5);
      label(g,cx+st.v1*vs+(st.v1>0?5:-5),ay+11,'v₁='+fmt(st.v1,2),'#f59e0b',st.v1>0?'left':'right');
      /* 木板受力与速度 */
      var by=gy-bh*0.5,bmx=(bx0+bx1)/2;
      if(Math.abs(st.f2)>1e-9){
        arrow(g,bmx,by,bmx+st.f2*fs,by,'#dc2626',2);
        label(g,bmx+st.f2*fs+(st.f2>0?4:-4),by+12,'地摩='+fmt(Math.abs(st.f2),2)+'N','#dc2626',st.f2>0?'left':'right');
      }
      if(Math.abs(P.F)>1e-9){
        arrow(g,bmx,by,bmx+P.F*fs,by,'#0891b2',2);
        label(g,bmx+P.F*fs+(P.F>0?4:-4),by-10,'F='+fmt(P.F,1)+'N','#0891b2',P.F>0?'left':'right');
      }
      arrow(g,bmx,by,bmx+st.v2*vs,by,'#16a34a',2.5);
      label(g,bmx+st.v2*vs+(st.v2>0?5:-5),by-2,'v₂='+fmt(st.v2,2),'#16a34a',st.v2>0?'left':'right');
    }
  },
  info:function(st,P){
    var K1=0.5*P.m1*st.v1*st.v1,K2=0.5*P.m2*st.v2*st.v2;
    var p=P.m1*st.v1+P.m2*st.v2;
    return [
      ['时间 t',fmt(st.t)+' s'],
      ['滑块位置 x₁',fmt(st.x1)+' m'],
      ['滑块速度 v₁',fmt(st.v1)+' m/s'],
      ['滑块加速度 a₁',fmt(st.a1)+' m/s²'],
      ['木板速度 v₂',fmt(st.v2)+' m/s'],
      ['木板加速度 a₂',fmt(st.a2)+' m/s²'],
      ['块-板摩擦 f₁',fmt(st.f1)+' N（'+st.f1Type+'）'],
      ['板-地摩擦 f₂',fmt(st.f2)+' N（'+st.f2Type+'）'],
      ['相对位移 x₁−x₂',fmt(st.x1-st.x2)+' m'],
      ['相对滑动路程',fmt(st.relPath)+' m'],
      ['摩擦生热 Q',fmt(st.Q)+' J'],
      ['滑块动能',fmt(K1)+' J'],
      ['木板动能',fmt(K2)+' J'],
      ['系统总动量 p',fmt(p)+' kg·m/s'],
      ['状态',st.onBoard?'滑块在木板上':(st.left>0?'已从右端滑离':'已从左端滑离')]
    ];
  },
  vel:function(st,P){
    return [{label:'滑块 v₁',color:'#2563eb',value:st.v1},
            {label:'木板 v₂',color:'#16a34a',value:st.v2}];
  },
  en:function(st,P){
    return [{label:'滑块动能',color:'#2563eb',value:0.5*P.m1*st.v1*st.v1},
            {label:'木板动能',color:'#16a34a',value:0.5*P.m2*st.v2*st.v2},
            {label:'内能 Q',color:'#dc2626',value:st.Q}];
  },
  stage:function(st,P){
    if(!st.onBoard)return '阶段：滑块已'+(st.left>0?'从右端滑离木板':'从左端滑离木板')+'（之后各自独立运动）';
    if(st.f1Type==='滑动摩擦')return '阶段：相对滑动中 — 摩擦阻碍相对运动，Q=f₁·s相对 持续增加';
    if(Math.abs(st.v1)<1e-6&&Math.abs(st.v2)<1e-6)return '阶段：整体静止（静摩擦平衡外力）';
    return '阶段：滑块与木板共速，作为整体一起运动（块-板间为静摩擦）';
  },
  finished:function(st,P){
    if(st.t>25)return true;
    if(!st.onBoard&&st.t-st.tLeave>2)return true;
    return false;
  },
  charts:{
    vel:{field:'v',title:'速度—时间（滑块 vs 木板）',unit:'m/s',keys:[{label:'滑块 v₁',color:'#2563eb'},{label:'木板 v₂',color:'#16a34a'}]},
    en:{field:'e',title:'能量—时间',unit:'J',keys:[{label:'滑块动能',color:'#2563eb'},{label:'木板动能',color:'#16a34a'},{label:'内能 Q',color:'#dc2626'}]}
  },
  examples:[
    {level:'基础',title:'例1 · 地面光滑，滑块不滑离木板',
     q:'光滑地面上，木板 m₂=1 kg、长 L=3 m 静止；滑块 m₁=1 kg 以 v₀=4 m/s 从左端滑上木板，μ₁=0.2，g=10。求共速时刻、共同速度、相对位移与摩擦生热 Q。',
     params:{m1:1,m2:1,v10:4,v20:0,x10:0,mu1:0.2,mu1s:0.2,mu2:0,mu2s:0,L:3,F:0,g:10},
     answer:'滑块 a₁=−μ₁g=−2 m/s²；木板 a₂=μ₁m₁g/m₂=+2 m/s²\n共速：4−2t=2t → t=1 s，v共=2 m/s\n滑块位移 3 m，木板位移 1 m，相对位移=2 m < L=3 m（不滑离）\nQ=μ₁m₁g·s相对=2×2=4 J\n动量守恒：1×4=4 → (1+1)×2=4 ✓\n动能损失：8−4=4 J = Q ✓'},
    {level:'中档',title:'例2 · 滑块滑离木板（地面光滑）',
     q:'木板 m₂=2 kg、长 L=4 m 静止在光滑地面；滑块 m₁=1 kg 以 6 m/s 从左端滑上，μ₁=0.2，g=10。判断滑块是否滑离木板，并求滑离时刻与 Q。',
     params:{m1:1,m2:2,v10:6,v20:0,x10:0,mu1:0.2,mu1s:0.2,mu2:0,mu2s:0,L:4,F:0,g:10},
     answer:'a₁=−2 m/s²，a₂=+1 m/s²\n若共速需 t=2 s，此时相对位移=(6×2−½·2·4)−½·1·4=8−2=6 m > L=4 m\n故滑块先滑离：6t−1.5t²=4 → t≈0.845 s\n此时 v₁≈4.31 m/s，v₂≈0.85 m/s\nQ=μ₁m₁g×L=2×4=8 J\n动量：1×6=6 → 1×4.31+2×0.85=6.01 ✓（守恒）'},
    {level:'高考',title:'例3 · 地面粗糙 + 外力拉木板（判断是否相对滑动）',
     q:'m₁=1 kg 滑块置于 m₂=2 kg 木板上，木板在粗糙地面，μ₁=0.3（块-板），μ₂=0.1（板-地），用 F=9 N 水平拉木板，g=10。判断两者是否发生相对滑动。',
     params:{m1:1,m2:2,v10:0,v20:0,x10:0,mu1:0.3,mu1s:0.3,mu2:0.1,mu2s:0.1,L:2,F:9,g:10},
     answer:'滑块能获得的最大加速度由块-板最大静摩擦决定：a₁max=μ₁g=3 m/s²\n假设共速，整体 a=(F−μ₂(m₁+m₂)g)/(m₁+m₂)=(9−3)/3=2 m/s²\n因 2 < 3，故不发生相对滑动，两者一起以 a=2 m/s² 加速\n此时块-板间静摩擦 f₁=m₁a=2 N < μ₁m₁g=3 N ✓\n临界外力：a=3 时 F−3=3×3 → F=12 N（F>12 N 才会相对滑动）'}
  ]
};

/* ==================================================================
   自由沙盒 · 2D 刚体引擎
   抓取 / 抛掷 / 翻滚 / 形变 / 增删物体 / 铰链约束
   积分：半隐式欧拉 + 子步；碰撞：SAT + 顺序冲量（含库仑摩擦）
   ================================================================== */
var SB={
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
  dmgK:1, dmgV:1.5,
  boomKg:2, boomFuse:0,
  fx:[], brk:[], shake:0, flash:0,
  /* ---- v8：环境 / 硬度 / 液体 / 燃烧 / 核武 / 特效强度 ---- */
  env:'ground', dark:0, spaceWall:true, stars:null,
  defHard:'normal',
  parts:[], pmax:240, pcount:0, pgrid:null, pbodies:null, pourW:2.0,
  dbl:'box',
  fxP:1, nukeKt:15, sparkMode:0, sparkDrag:0, sparkT:0
};
var SBMAX=140;
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
var LINKDEF={spring:{k:120,c:1.2},rope:{},pulley:{pr:0.45}};

/* ==================================================================
   材质表：密度 / 弹性 / 摩擦 / 强度(决定会不会碎) / 配色 / 表面纹理
   hp 单位相当于「能扛住的冲击能量(J) 每平方米」，实际强度再乘物体面积
   ================================================================== */
/* hp = 抗撞阈值，单位是「比动能 ½v²」：
   玻璃 4 → 撞到约 2.8 m/s 就碎；木 45 → 约 9.5 m/s；钢 5000 → 约 100 m/s（实际砸不烂）
   用比动能而不是动能，是为了让「大铁块」不会因为质量大就自己把自己砸碎 */
var MATS=[
 {k:'wood',  n:'木',   rho:0.62,e:0.30,mu:0.45,hp:45,  c:'#dda86a',c2:'#9a6535',tex:'grain',edge:'#6b4423',flam:1},
 {k:'stone', n:'石',   rho:2.40,e:0.18,mu:0.62,hp:90,  c:'#aab2bf',c2:'#69717f',tex:'speck',edge:'#4b5563'},
 {k:'steel', n:'钢',   rho:7.80,e:0.52,mu:0.20,hp:5000,c:'#d3dbe7',c2:'#8492a6',tex:'metal',edge:'#475569'},
 {k:'rubber',n:'橡胶', rho:1.10,e:0.86,mu:0.88,hp:2200,c:'#4a515e',c2:'#252b34',tex:'plain',edge:'#111827',flam:1},
 {k:'ice',   n:'冰',   rho:0.92,e:0.14,mu:0.05,hp:10,  c:'#dbf2fc',c2:'#8ed3ea',tex:'shine',edge:'#5aa9c4'},
 {k:'glass', n:'玻璃', rho:2.50,e:0.12,mu:0.30,hp:4,   c:'#e3f5fd',c2:'#a7dcec',tex:'shine',edge:'#5aa9c4'},
 {k:'foam',  n:'泡沫', rho:0.06,e:0.05,mu:0.72,hp:3000,c:'#f5eddd',c2:'#d8c8a8',tex:'pore', edge:'#b9a67f',flam:1},
 {k:'tnt',   n:'炸药', rho:1.60,e:0.10,mu:0.50,hp:1.6, c:'#e8503f',c2:'#8f1d16',tex:'tnt',  edge:'#5b1410',flam:1},
 /* 液体 / 燃料：只用作"液体粒子"，会流动 (liq)、能烧 (fuel)、能灭火 (wet)、会烫 (hot) */
 {k:'water', n:'水',   rho:1.00,liq:1,e:0.05,mu:0.02,hp:3000,c:'#6fb8ef',c2:'#2f8fd0',tex:'plain',edge:'#2f8fd0',wet:1},
 {k:'gas',   n:'汽油', rho:0.75,liq:1,e:0.05,mu:0.03,hp:3000,c:'#eec96b',c2:'#b07a1e',tex:'plain',edge:'#b07a1e',fuel:1.6},
 {k:'oil',   n:'油',   rho:0.90,liq:1,e:0.02,mu:0.06,hp:3000,c:'#6b5a44',c2:'#3d3226',tex:'plain',edge:'#3d3226',fuel:1.0},
 {k:'lava',  n:'岩浆', rho:2.60,liq:1,e:0.02,mu:0.25,hp:3000,c:'#ff7a2f',c2:'#a01b12',tex:'plain',edge:'#a01b12',hot:1}
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
/* 同材质下，块越大越脆（缺陷更多）；area=1 时刚好等于材质标称值 */
function sbHpMax(b){
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
}
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
}

/* ---------- 物体 ---------- */
function sbMake(o){
  o=o||{};
  var b={id:SB.nextId++,shape:o.shape||'box',
    x:o.x||0,y:o.y||0,angle:o.angle||0,
    vx:o.vx||0,vy:o.vy||0,w:o.w||0,
    pvx:0,pvy:0,pw:0,
    m:o.m||1,bw:o.bw||1,bh:o.bh||1,r:o.r||0.5,
    e:(o.e===undefined?SB.defE:o.e),mu:(o.mu===undefined?SB.defMu:o.mu),
    q:o.q||0,                 // 电荷量（C，可正可负），用于电场力与洛伦兹力
    stat:!!o.stat,nofit:!!o.nofit,
    mat:o.mat||'wood',        // 材质：决定 密度/弹性/摩擦/强度/外观
    cracks:null,frag:!!o.frag,ttl:(o.ttl===undefined?0:o.ttl),
    hard:(o.hard||SB.defHard||'normal'),invul:!!o.invul,fire:0,
    boom:o.boom||null,        // 炸药：{kg, R}
    fuse:(o.fuse===undefined?-1:o.fuse),fuse0:(o.fuse>0?o.fuse:1),due:0,
    color:o.color||SB.colors[SB.nextId%SB.colors.length]};
  if(o.m===undefined&&o.mat!==undefined){b.m=sbAutoMass(b);}
  if(b.mat==='tnt'&&!b.boom)b.boom={kg:SB.boomKg,R:sbBoomR(SB.boomKg)};
  if(b.hard==='invul')b.invul=true;
  if(o.nuke)b.nuke={kt:(o.nuke.kt||SB.nukeKt)};
  sbMass(b);
  sbHpInit(b);
  return b;
}
function sbBoomR(kg){return 3.6*Math.pow(Math.max(kg,0.05),0.3334);}
function sbMass(b){
  if(b.stat){b.invM=0;b.invI=0;b.I=0;return;}
  b.invM=1/b.m;
  if(b.shape==='circle')b.I=0.5*b.m*b.r*b.r;
  else if(b.shape==='tri')b.I=b.m*(b.bw*b.bw+b.bh*b.bh)/18;
  else b.I=b.m*(b.bw*b.bw+b.bh*b.bh)/12;
  b.invI=1/b.I;
}
function sbRad(b){
  if(b.shape==='circle')return b.r;
  return Math.sqrt(b.bw*b.bw+b.bh*b.bh)/2;
}
function sbVerts(b){
  var c=Math.cos(b.angle),s=Math.sin(b.angle),L,i,out=[];
  if(b.shape==='tri'){L=[[-b.bw/2,-b.bh/3],[b.bw/2,-b.bh/3],[0,2*b.bh/3]];}
  else{var hw=b.bw/2,hh=b.bh/2;L=[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]];}
  for(i=0;i<L.length;i++)out.push([b.x+L[i][0]*c-L[i][1]*s,b.y+L[i][0]*s+L[i][1]*c]);
  return out;
}
function sbNorms(V){
  var out=[],i;
  for(i=0;i<V.length;i++){
    var a=V[i],b=V[(i+1)%V.length];
    var ex=b[0]-a[0],ey=b[1]-a[1],l=Math.sqrt(ex*ex+ey*ey)||1;
    out.push([ey/l,-ex/l]);
  }
  return out;
}
function sbInPoly(p,V){
  var N=sbNorms(V);
  for(var i=0;i<V.length;i++){
    if((p[0]-V[i][0])*N[i][0]+(p[1]-V[i][1])*N[i][1]>1e-9)return false;
  }
  return true;
}
function sbPick(b,x,y){
  if(b.shape==='circle'){var dx=x-b.x,dy=y-b.y;return dx*dx+dy*dy<=b.r*b.r+1e-9;}
  return sbInPoly([x,y],sbVerts(b));
}

/* ---------- 碰撞检测 ---------- */
function sbCC(A,B){
  var dx=B.x-A.x,dy=B.y-A.y,d=Math.sqrt(dx*dx+dy*dy),rr=A.r+B.r;
  if(d>=rr)return null;
  var n=(d<1e-9)?[0,1]:[dx/d,dy/d];
  return {n:n,depth:rr-d,pts:[[A.x+n[0]*A.r,A.y+n[1]*A.r]]};
}
function sbCP(C,P,circleIsA){
  var V=sbVerts(P),N=sbNorms(V),dmax=-1e18,im=0,i;
  for(i=0;i<V.length;i++){
    var d=(C.x-V[i][0])*N[i][0]+(C.y-V[i][1])*N[i][1];
    if(d>dmax){dmax=d;im=i;}
  }
  var depth=C.r-dmax;
  if(depth<0)return null;
  var n=N[im],pt=[C.x-dmax*n[0],C.y-dmax*n[1]];
  return {n:circleIsA?[-n[0],-n[1]]:[n[0],n[1]],depth:depth,pts:[pt]};
}
function sbPP(A,B){
  var VA=sbVerts(A),VB=sbVerts(B),best=null,k,i,j;
  for(k=0;k<2;k++){
    var P=k?VB:VA,Q=k?VA:VB,N=sbNorms(P);
    for(i=0;i<P.length;i++){
      var n=N[i],maxP=-1e18,minQ=1e18;
      for(j=0;j<P.length;j++){var d=P[j][0]*n[0]+P[j][1]*n[1];if(d>maxP)maxP=d;}
      for(j=0;j<Q.length;j++){var d2=Q[j][0]*n[0]+Q[j][1]*n[1];if(d2<minQ)minQ=d2;}
      var ov=maxP-minQ;
      if(ov<0)return null;
      if(!best||ov<best.d)best={d:ov,n:n,from:k};
    }
  }
  if(!best)return null;
  // 分离轴 n 是 P 的外法向：轴取自 A 时 A→B 为 +n；轴取自 B 时 A→B 为 -n
  var n=best.from===0?[best.n[0],best.n[1]]:[-best.n[0],-best.n[1]],pts=[];
  for(i=0;i<VA.length;i++)if(sbInPoly(VA[i],VB))pts.push(VA[i]);
  for(i=0;i<VB.length;i++)if(sbInPoly(VB[i],VA))pts.push(VB[i]);
  if(!pts.length){
    var bd=-1e18,bp=VA[0];
    for(i=0;i<VA.length;i++){var d3=VA[i][0]*n[0]+VA[i][1]*n[1];if(d3>bd){bd=d3;bp=VA[i];}}
    pts.push(bp);
  }
  if(pts.length>2)pts=pts.slice(0,2);
  return {n:n,depth:best.d,pts:pts};
}
function sbTest(A,B){
  if(A.shape==='circle'&&B.shape==='circle')return sbCC(A,B);
  if(A.shape==='circle')return sbCP(A,B,true);
  if(B.shape==='circle')return sbCP(B,A,false);
  return sbPP(A,B);
}
function sbCollide(){
  var out=[],bs=SB.bodies,i,j,k;
  // 被铰链直接连接的两个物体之间不做碰撞（否则排斥力与约束打架）
  var linked={};
  for(var q=0;q<SB.joints.length;q++){
    if(SB.joints[q].B)linked[SB.joints[q].A.id+'_'+SB.joints[q].B.id]=1;
  }
  for(i=0;i<bs.length;i++)for(j=i+1;j<bs.length;j++){
    var A=bs[i],B=bs[j];
    if(A.stat&&B.stat)continue;
    if(linked[A.id+'_'+B.id]||linked[B.id+'_'+A.id])continue;
    var dx=B.x-A.x,dy=B.y-A.y,rr=sbRad(A)+sbRad(B);
    if(dx*dx+dy*dy>rr*rr)continue;
    var c=sbTest(A,B);
    if(!c)continue;
    for(k=0;k<c.pts.length;k++){
      out.push({A:A,B:B,n:c.n,depth:c.depth,p:c.pts[k],jn:0,jt:0,jbn:0,key:A.id+'_'+B.id+'_'+k});
    }
  }
  return out;
}

/* ---------- 冲量求解 ---------- */
function sbApply(A,B,px,py,cx,cy){
  var rax=cx-A.x,ray=cy-A.y,rbx=cx-B.x,rby=cy-B.y;
  A.vx-=px*A.invM;A.vy-=py*A.invM;A.w-=(rax*py-ray*px)*A.invI;
  B.vx+=px*B.invM;B.vy+=py*B.invM;B.w+=(rbx*py-rby*px)*B.invI;
}
function sbApplyP(A,B,px,py,cx,cy){
  var rax=cx-A.x,ray=cy-A.y,rbx=cx-B.x,rby=cy-B.y;
  A.pvx-=px*A.invM;A.pvy-=py*A.invM;A.pw-=(rax*py-ray*px)*A.invI;
  B.pvx+=px*B.invM;B.pvy+=py*B.invM;B.pw+=(rbx*py-rby*px)*B.invI;
}
function sbSolveContact(c,h){
  var A=c.A,B=c.B,n=c.n;
  var rax=c.p[0]-A.x,ray=c.p[1]-A.y,rbx=c.p[0]-B.x,rby=c.p[1]-B.y;
  var rvx,rvy,vn;
  rvx=(B.vx-B.w*rby)-(A.vx-A.w*ray);
  rvy=(B.vy+B.w*rbx)-(A.vy+A.w*rax);
  vn=rvx*n[0]+rvy*n[1];
  var raN=rax*n[1]-ray*n[0],rbN=rbx*n[1]-rby*n[0];
  var kn=A.invM+B.invM+raN*raN*A.invI+rbN*rbN*B.invI;
  if(kn<=1e-12)return;
  // 恢复系数在预处理时按初始接近速度定一次（c.vb），否则迭代中会被反复抵消
  var dj=(-vn+c.vb)/kn;
  var old=c.jn;c.jn=Math.max(old+dj,0);var jn=c.jn-old;
  sbApply(A,B,jn*n[0],jn*n[1],c.p[0],c.p[1]);
  // 穿透修正走"伪速度"（split impulse）：只改位置，绝不污染真实速度，
  // 因此不会像 Baumgarte 偏置那样持续注入能量导致堆叠微振
  var pvx=(B.pvx-B.pw*rby)-(A.pvx-A.pw*ray);
  var pvy=(B.pvy+B.pw*rbx)-(A.pvy+A.pw*rax);
  var vnp=pvx*n[0]+pvy*n[1];
  var bias=(0.2/h)*Math.max(0,c.depth-0.004);
  var djp=(bias-vnp)/kn;
  var oldp=c.jbn;c.jbn=Math.max(oldp+djp,0);var jp=c.jbn-oldp;
  sbApplyP(A,B,jp*n[0],jp*n[1],c.p[0],c.p[1]);
  // 库仑摩擦
  rvx=(B.vx-B.w*rby)-(A.vx-A.w*ray);
  rvy=(B.vy+B.w*rbx)-(A.vy+A.w*rax);
  var tx=-n[1],ty=n[0],vt=rvx*tx+rvy*ty;
  var raT=rax*ty-ray*tx,rbT=rbx*ty-rby*tx;
  var kt=A.invM+B.invM+raT*raT*A.invI+rbT*rbT*B.invI;
  if(kt<=1e-12)return;
  var djt=-vt/kt;
  var mx=Math.sqrt(A.mu*B.mu)*c.jn;
  var oldt=c.jt;c.jt=clamp(oldt+djt,-mx,mx);var jt=c.jt-oldt;
  sbApply(A,B,jt*tx,jt*ty,c.p[0],c.p[1]);
}
/* ==================================================================
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
  if(b.hp<=0){b.hp=0;if(!b.frag)SB.brk.push({b:b,px:px,py:py});}   // 碎块不再二次碎裂，物体总数才有上界
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
  if(b.nuke)sbNuke(b.x,b.y,b.nuke.kt||SB.nukeKt);
  else sbExplode(b.x,b.y,kg,R);
}
function sbDetonateAll(){
  var n=0,i;
  for(i=0;i<SB.bodies.length;i++){
    var b=SB.bodies[i];
    if(b.boom&&!b.boom.done){b.fuse=0;b.due=1;n++;}
  }
  if(!n){sbToast('场景里没有炸药/核弹，先点「＋炸药」或「＋原子弹」放一个');return;}
  sbToast('引爆 '+n+' 个炸药');
  sbFuse(0);
}
function sbFuse(dt){
  var i,b,bb,any=false;
  for(i=0;i<SB.bodies.length;i++){
    b=SB.bodies[i];
    if(!b.boom||b.boom.done)continue;
    if(b.fuse>=0){b.fuse-=dt;if(b.fuse<=0){b.due=1;any=true;}}
  }
  if(!any)return;
  /* 必须先拍一张快照：引爆过程中物体会被陆续删掉（核爆还会直接气化一片），
     边删边按下标遍历一定会踩到 undefined */
  var pend=[],k;
  for(k=0;k<SB.bodies.length;k++){
    bb=SB.bodies[k];
    if(bb&&bb.boom&&!bb.boom.done&&bb.due)pend.push(bb);
  }
  for(k=0;k<pend.length;k++){
    b=pend[k];
    if(!b.boom||b.boom.done)continue;
    sbDetonate(b);
  }
  sbFlushBreak();
}
function sbExplode(x,y,kg,R){
  R=R||sbBoomR(kg);
  var i,b,dx,dy,d,w,dv,ux,uy,nj;
  SB.fx.push({k:'boom',x:x,y:y,R:R,t:0,life:0.62,kg:kg});
  SB.fx.push({k:'ring',x:x,y:y,R:R,t:0,life:0.52});
  var FP=SB.fxP||1;
  SB.shake=Math.min(1.9,SB.shake+0.55*FP*Math.sqrt(Math.max(kg,0.05)));
  SB.flash=Math.min(1.25,SB.flash+0.7*FP*Math.sqrt(Math.max(kg,0.05)));
  var sp=sbFxN(26+Math.min(48,Math.round(kg*7))),a0,s0;
  for(i=0;i<sp;i++){
    a0=Math.random()*Math.PI*2;
    s0=(4+Math.random()*15)*Math.pow(Math.max(kg,0.1),0.35);
    SB.fx.push({k:'spark',x:x,y:y,vx:Math.cos(a0)*s0,vy:Math.sin(a0)*s0+2,
      t:0,life:0.45+Math.random()*0.7,c:(Math.random()<0.45?'#fde68a':'#fb923c')});
  }
  var sm=sbFxN(10+Math.min(22,Math.round(kg*3)));
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
    var dmg=900*kg*Math.pow(w,1.35);
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
   原子弹 / 点火器
   ================================================================== */
function sbFxN(n){
  var p=SB.fxP;
  if(p===undefined||!isFinite(p))p=1;
  return Math.max(1,Math.round(n*p));
}
/* 当量 → 火球半径（kt 的 0.42 次方，量感上比严格标度更像"核爆"） */
function sbNukeR(kt){return 8*Math.pow(Math.max(kt,0.02),0.42);}
/* 双击画布放什么：形状 / 炸药 / 原子弹 / 各种液体，全部在手指点的位置生成 */
var DBLS=[
  {k:'box',   n:'方块',  kind:'box'},
  {k:'circle',n:'圆球',  kind:'circle'},
  {k:'tri',   n:'三角',  kind:'tri'},
  {k:'rod',   n:'细杆',  kind:'rod'},
  {k:'ramp',  n:'斜面',  kind:'ramp'},
  {k:'wall',  n:'挡板',  kind:'wall'},
  {k:'bomb',  n:'炸药',  kind:'bomb'},
  {k:'nuke',  n:'原子弹',kind:'nuke'},
  {k:'water', n:'水',    liq:'water'},
  {k:'gas',   n:'汽油',  liq:'gas'},
  {k:'oil',   n:'油',    liq:'oil'},
  {k:'lava',  n:'岩浆',  liq:'lava'}
];
function sbDblDef(){
  var d=SB.dbl||'box',i;
  for(i=0;i<DBLS.length;i++)if(DBLS[i].k===d)return DBLS[i];
  return DBLS[0];
}
/* 手机工具栏上的循环切换：方块→…→原子弹→水→汽油→油→岩浆→方块 */
function sbDblCycle(){
  var i=0,d=(SB.dbl||'box');
  for(i=0;i<DBLS.length;i++)if(DBLS[i].k===d)break;
  var n=DBLS[(i+1)%DBLS.length];
  SB.dbl=n.k;
  sbToast('双击画布＝'+(n.liq?'倒'+n.n:'放'+n.n)+'（在手指点的位置生成）');
  sbMobBar();sbPanel();
}
/* 在 (wx,wy) 处生成当前「双击放置」的东西 —— 这是双击/连点两下的落点逻辑 */
function sbDblAt(wx,wy){
  var d=sbDblDef();
  if(!isFinite(wx)||!isFinite(wy)){wx=SB.view.cx;wy=SB.view.cy;}
  SB.mouse.wx=wx;SB.mouse.wy=wy;          // 让 sbFreeSpot 也用这个点当基准
  if(d.liq){
    var w=SB.pourW||2.0,hh=Math.max(0.5,w*0.42);
    var n=sbPartPour(d.liq,wx-w/2,wy,w,hh);
    if(n>0)sbToast('在点击处倒了 '+n+' 颗'+matDef(d.liq).n+
      (matDef(d.liq).fuel?'（点「火花点火」就能点着）':''));
    else sbToast('放不下了：液体已满（可把「液体上限」调大）');
    return null;
  }
  var b=sbAddAt(d.kind,wx,wy);
  if(b&&d.kind!=='nuke')sbToast('在点击处放了个'+d.n);
  return b;
}
function sbAddNuke(ax,ay){
  var x=(ax===undefined?NaN:ax),y=(ay===undefined?NaN:ay);
  if(!isFinite(x)||!isFinite(y)){x=SB.mouse.wx;y=SB.mouse.wy;}
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
   ================================================================== */
function sbFxShatter(b,px,py){
  var n=sbFxN(6+Math.floor(Math.random()*5)),i,a0,s0;
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
  SB.shake=Math.min(1.2,SB.shake+0.18*(SB.fxP||1));
}
function sbFxStep(dt){
  var out=[],i,f;
  for(i=0;i<SB.fx.length;i++){
    f=SB.fx[i];f.t+=dt;
    if(f.t>=f.life)continue;
    if(f.k==='spark'){f.vy-=9*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.985;f.vy*=0.985;}
    else if(f.k==='smoke'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.94;f.vy=f.vy*0.94+0.4*dt;}
    else if(f.k==='dust'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.93;f.vy*=0.93;}
    else if(f.k==='shroom'){f.y+=f.vy*dt;f.x+=(f.vx||0)*dt;f.vy=(f.vy-0.2*dt)*0.985;}
    else if(f.k==='wave'){f.x+=(f.vx||0)*dt;f.y+=(f.vy||0)*dt;}
    else if(f.k==='glow'){}
    else if(f.k==='ember'){f.vy-=9.8*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.986;f.vy*=0.986;
      if(SB.env==='ground'&&f.y<0.08&&f.vy<0){f.y=0.08;f.vy*=-0.26;f.vx*=0.72;}}
    else if(f.k==='jet'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.9;f.vy*=0.9;}
    else if(f.k==='sparkle'){if(f.t>=(f.d0||0)){f.vy-=6*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.975;f.vy*=0.975;}}
    out.push(f);
  }
  SB.fx=out;
  var capF=Math.round(600*Math.min(Math.max(SB.fxP||1,0.2),4));if(capF<260)capF=260;
  if(SB.fx.length>capF)SB.fx.splice(0,SB.fx.length-capF);
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
    }else if(f.k==='shroom'){
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
    }else if(f.k==='wave'){
      /* 厚冲击波：内侧余辉 + 外沿亮线 + 放射纹理，比普通 ring 更有"气浪"的实感 */
      var R4=f.R*SB.view.s*(0.12+1.05*Math.pow(u,0.62));
      var wpx=Math.max(1.2,(f.w||1.4)*SB.view.s*0.16*(1-u*0.55));
      var a4=(1-u)*(1-u);
      if(R4>0.8){
        var g4=g.createRadialGradient(X,Y,Math.max(R4-wpx*2.4,0),X,Y,Math.max(R4,0.8));
        if(f.emp){
          g4.addColorStop(0,'rgba(125,211,252,0)');
          g4.addColorStop(0.7,'rgba(125,211,252,'+(0.30*a4)+')');
          g4.addColorStop(1,'rgba(191,240,255,'+(0.85*a4)+')');
        }else{
          g4.addColorStop(0,'rgba(255,236,180,0)');
          g4.addColorStop(0.6,'rgba(255,205,120,'+(0.32*a4)+')');
          g4.addColorStop(1,'rgba(255,250,225,'+(0.90*a4)+')');
        }
        g.fillStyle=g4;g.beginPath();g.arc(X,Y,Math.max(R4,0.8),0,Math.PI*2);g.fill();
        g.strokeStyle=f.emp?('rgba(224,247,255,'+(0.72*a4)+')'):('rgba(255,252,235,'+(0.78*a4)+')');
        g.lineWidth=Math.max(0.8,1.6*(1-u));
        g.beginPath();g.arc(X,Y,Math.max(R4,0.8),0,Math.PI*2);g.stroke();
        if(!f.emp&&R4>11){
          g.strokeStyle='rgba(255,236,190,'+(0.26*a4)+')';
          g.lineWidth=Math.max(0.6,1*(1-u));
          for(k2=0;k2<14;k2++){
            a2=k2/14*Math.PI*2;
            g.beginPath();
            g.moveTo(X+Math.cos(a2)*R4*0.86,Y+Math.sin(a2)*R4*0.86);
            g.lineTo(X+Math.cos(a2)*R4*1.05,Y+Math.sin(a2)*R4*1.05);
            g.stroke();
          }
        }
      }
    }else if(f.k==='glow'){
      var R5=f.R*SB.view.s*(0.55+0.75*Math.pow(u,0.5));
      var a5=(1-u)*(1-u)*(f.hot?1:0.72);
      if(R5>0.8){
        var g5=g.createRadialGradient(X,Y,0,X,Y,Math.max(R5,1));
        if(f.hot){
          g5.addColorStop(0,'rgba(255,255,252,'+(0.95*a5)+')');
          g5.addColorStop(0.30,'rgba(255,236,170,'+(0.70*a5)+')');
          g5.addColorStop(0.66,'rgba(249,146,22,'+(0.32*a5)+')');
        }else{
          g5.addColorStop(0,'rgba(255,214,150,'+(0.40*a5)+')');
          g5.addColorStop(0.50,'rgba(249,146,22,'+(0.20*a5)+')');
        }
        g5.addColorStop(1,'rgba(120,40,10,0)');
        g.fillStyle=g5;g.beginPath();g.arc(X,Y,Math.max(R5,1),0,Math.PI*2);g.fill();
      }
    }else if(f.k==='ember'){
      /* 余烬：一闪一闪的暖火星，带拖尾 */
      var fl=0.55+0.45*Math.sin(f.t*11+(f.ph||0));
      var r6=Math.max(1.1,(1.7+1.1*fl)*(1-u*0.4));
      g.globalAlpha=Math.max(0,(1-u)*fl);
      var g6=g.createRadialGradient(X,Y,0,X,Y,Math.max(r6*2.4,1));
      g6.addColorStop(0,'rgba(255,247,214,1)');
      g6.addColorStop(0.35,'rgba(255,168,66,.85)');
      g6.addColorStop(1,'rgba(180,50,10,0)');
      g.fillStyle=g6;g.beginPath();g.arc(X,Y,Math.max(r6*2.4,1),0,Math.PI*2);g.fill();
      var ss6=Math.sqrt(f.vx*f.vx+f.vy*f.vy);
      if(ss6>1e-6){
        var L6=Math.min(0.5+ss6*0.03,1.1)*SB.view.s;
        g.strokeStyle='rgba(255,190,110,'+(0.45*(1-u))+')';
        g.lineWidth=Math.max(0.8,r6*0.7);g.lineCap='round';
        g.beginPath();g.moveTo(X,Y);g.lineTo(X-f.vx/ss6*L6,Y+f.vy/ss6*L6);g.stroke();
        g.lineCap='butt';
      }
      g.globalAlpha=1;
    }else if(f.k==='jet'){
      /* 火焰喷流：从爆心甩出去的一条锥形火舌 */
      var ss7=Math.sqrt(f.vx*f.vx+f.vy*f.vy)||1;
      var ux7=f.vx/ss7,uy7=f.vy/ss7;
      var L7=(0.55+Math.min(ss7*0.05,1.6))*SB.view.s*(0.6+0.9*u);
      var w7=Math.max(1.6,(f.r0||0.4)*SB.view.s*0.55*(1-u*0.6));
      var ex7=X+ux7*L7,ey7=Y-uy7*L7;
      var g7=g.createLinearGradient(X,Y,ex7,ey7);
      g7.addColorStop(0,'rgba(255,255,240,'+(0.88*(1-u))+')');
      g7.addColorStop(0.45,'rgba(253,186,116,'+(0.68*(1-u))+')');
      g7.addColorStop(1,'rgba(239,68,68,0)');
      g.fillStyle=g7;
      g.beginPath();
      g.moveTo(X-uy7*w7,Y-ux7*w7);
      g.lineTo(ex7-uy7*w7*0.2,ey7-ux7*w7*0.2);
      g.lineTo(ex7+uy7*w7*0.2,ey7+ux7*w7*0.2);
      g.lineTo(X+uy7*w7,Y+ux7*w7);
      g.closePath();g.fill();
    }else if(f.k==='sparkle'){
      /* 二次爆散：延迟一下再亮起来的小四角星 */
      var dz=(f.d0||0)/f.life;
      if(u>=dz){
        var uu=(u-dz)/Math.max(1e-6,1-dz);
        var fl2=0.6+0.4*Math.sin(f.t*17+f.x*3);
        var r8=Math.max(1.2,2.7*(1-uu*0.55))*fl2;
        g.globalAlpha=Math.max(0,(1-uu)*fl2);
        g.fillStyle=f.c||'#fff7cc';
        g.beginPath();
        g.moveTo(X-r8,Y);g.lineTo(X,Y-r8);g.lineTo(X+r8,Y);g.lineTo(X,Y+r8);
        g.closePath();g.fill();
        g.globalAlpha=1;
      }
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

/* ==================================================================
   液体 / 燃料：双密度松弛 SPH（Clavet 2005）
   几百颗粒子也能实时跑；和用户摆的刚体做单向碰撞（水能推动物体）
   ================================================================== */
function sbPartAdd(mat,x,y,vx,vy){
  if(SB.parts.length>=(SB.pmax||240))return null;
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
function sbPour(mat,ax,ay){
  var x=(ax===undefined?NaN:ax),y=(ay===undefined?NaN:ay);
  if(!isFinite(x)||!isFinite(y)){x=SB.mouse.wx;y=SB.mouse.wy;}
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
/* 选中物体 → 直接化成一滩液体（占它现在的体积） */
function sbSelToLiquid(b,mat){
  if(!b){sbToast('先选一个物体');return;}
  if(b.stat){sbToast('固定的地面/挡板化不成液体');return;}
  var w,h,x,y;
  if(b.shape==='circle'){w=b.r*2;h=b.r*2;}
  else{w=b.bw;h=b.bh;}
  w=Math.max(w,0.3);h=Math.max(h,0.3);
  x=b.x-w/2;y=b.y-h/2;
  if(SB.env!=='space')y=Math.max(y,0.06);
  var id=b.id;
  sbDel(b);
  var n=sbPartPour(mat,x,y,w,h);
  sbToast('把 #'+id+' 化成了 '+n+' 颗'+matDef(mat).n+(matDef(mat).fuel?'（可点燃）':''));
  SB.sel=null;
  sbSelPanel();sbAutoSave();
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
  var L=SB.pbodies,i,o,b,nx,ny,pen,dx,dy,d,res,M,rp=SBPR.rad,ins,sd2,rvx,rvy,vn,J,touchR=rp+0.28;
  if(!L)return;
  for(i=0;i<L.length;i++){
    o=L[i];b=o.b;
    dx=p.x-o.x;dy=p.y-o.y;d=Math.sqrt(dx*dx+dy*dy);
    if(d>o.brad+touchR)continue;
    pen=0;nx=0;ny=1;
    if(o.c){
      sd2=d-o.r;                                    // 到圆面的有符号距离
      if(sd2>=touchR)continue;
      if(sd2>=rp){ /* 只是贴近，不推出去 */ }
      else{
        pen=rp-sd2;
        nx=d>1e-9?dx/d:0;ny=d>1e-9?dy/d:1;
      }
    }else{
      res=sbPolyInfo(o,p.x,p.y);
      if(!res)continue;
      ins=sbInPoly([p.x,p.y],o.V);
      sd2=ins?-res.d:res.d;
      if(sd2>=touchR)continue;
      if(sd2<rp){
        pen=rp-sd2;dx=p.x-res.cx;dy=p.y-res.cy;
        d=Math.sqrt(dx*dx+dy*dy);
        if(d<1e-9){nx=0;ny=1;}
        else if(ins){nx=-dx/d;ny=-dy/d;}
        else{nx=dx/d;ny=dy/d;}
      }
    }
    if(pen>0){
      p.x+=nx*pen;p.y+=ny*pen;
      if(!isFinite(p.x)||!isFinite(p.y)){p.x=o.x;p.y=o.y+1;p.vx=0;p.vy=0;continue;}
      rvx=p.vx-o.vx;rvy=p.vy-o.vy;vn=rvx*nx+rvy*ny;
      if(vn<0){
        rvx-=nx*vn;rvy-=ny*vn;                      // 去掉法向来速
        rvx*=0.84;rvy*=0.84;                        // 切向摩擦：贴着壁面滑
        p.vx=rvx+o.vx;p.vy=rvy+o.vy;
        /* 给动态物体一点反作用力：水流真的能把东西推动 */
        if(!o.stat&&o.invM>0){
          J=Math.min(1.5,-vn)*0.024;
          b.vx-=nx*J*o.invM*8;b.vy-=ny*J*o.invM*8;
          if(!isFinite(b.vx))b.vx=0;
          if(!isFinite(b.vy))b.vy=0;
        }
      }
    }
    /* 水灭火 / 岩浆点火 / 烧着的液体点燃刚体（贴着就行，不一定要穿透） */
    M=matDef(p.mat);
    if(M.wet&&b.fire>0){b.fire=Math.max(0,b.fire-0.06);if(b.fire<0.05)b.fire=0;}
    else if((M.hot||p.burn>0)&&matDef(b.mat).flam&&!b.fire){b.fire=0.18;}
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
  /* 粒子多的时候自动只跑一个子步：手机上才不会掉帧 */
  var sub=(n>260)?1:2;
  h=dt/sub;
  for(s=0;s<sub;s++)sbPartSub(h);
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
/* 物体着火：掉血 + 冒火苗 + 引爆炸药 + 烧光后化成烟消失 */
function sbFireStep(dt){
  var i,b,M,FP=(SB.fxP||1),gone=[],f2,idx;
  for(i=0;i<SB.bodies.length;i++){
    b=SB.bodies[i];
    if(!b.fire||b.fire<=0)continue;
    M=matDef(b.mat);
    b.fire-=dt*(M.flam?0.05:0.5);
    if(b.fire<=0){b.fire=0;continue;}
    b.hp-=dt*(10+45*b.fire);
    if(Math.random()<0.5*FP){
      SB.fx.push({k:'spark',x:b.x+(Math.random()-0.5)*(b.bw||b.r||1),
        y:b.y+(Math.random()-0.5)*(b.bh||b.r||1),
        vx:(Math.random()-0.5)*1.4,vy:1.8+Math.random()*2.4,
        t:0,life:0.4+Math.random()*0.4,c:(Math.random()<0.5?'#fbbf24':'#f97316')});
    }
    if(Math.random()<0.10*FP)SB.fx.push({k:'smoke',x:b.x,y:b.y+((b.bh||b.r||1)/2),
      vx:(Math.random()-0.5),vy:1.4,t:0,life:1.4,r0:0.2,r1:1.0});
    if(b.hp<=0&&!b.stat&&!b.invul){
      /* 烧光＝直接化成烟（不再继续碎裂，否则一堆木柴能裂出上百个碎块） */
      gone.push(b);
    }
  }
  for(i=0;i<gone.length;i++){
    b=gone[i];
    if(SB.sel===b)SB.sel=null;
    if(SB.grab&&SB.grab.b===b)SB.grab=null;
    sbUnlink(b);
    idx=SB.bodies.indexOf(b);
    if(idx>=0)SB.bodies.splice(idx,1);
    b.gone=1;b.fire=0;
    for(f2=0;f2<3;f2++)SB.fx.push({k:'smoke',x:b.x+(Math.random()-0.5)*0.6,
      y:b.y+(Math.random()-0.5)*0.6,vx:(Math.random()-0.5)*0.7,vy:1.1,
      t:0,life:1.6+Math.random(),r0:0.22,r1:1.2});
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

function sbPosFix(c){
  var A=c.A,B=c.B,n=c.n,k=A.invM+B.invM;
  if(k<=1e-12)return;
  var corr=Math.max(c.depth-0.002,0)*0.3/k;
  A.x-=corr*n[0]*A.invM;A.y-=corr*n[1]*A.invM;
  B.x+=corr*n[0]*B.invM;B.y+=corr*n[1]*B.invM;
}
/* 铰链（ revolute joint ）：A 的局部锚点与世界点 / B 的局部锚点重合 */
function sbSolveJoint(j,h){
  var A=j.A;
  var c1=Math.cos(A.angle),s1=Math.sin(A.angle);
  var rax=j.ra[0]*c1-j.ra[1]*s1,ray=j.ra[0]*s1+j.ra[1]*c1;
  var pax=A.x+rax,pay=A.y+ray;
  var vax=A.vx-A.w*ray,vay=A.vy+A.w*rax;
  var B=j.B,rbx=0,rby=0,pbx=j.wx,pby=j.wy,vbx=0,vby=0,invMB=0,invIB=0;
  if(B){
    var c2=Math.cos(B.angle),s2=Math.sin(B.angle);
    rbx=j.rb[0]*c2-j.rb[1]*s2;rby=j.rb[0]*s2+j.rb[1]*c2;
    pbx=B.x+rbx;pby=B.y+rby;
    vbx=B.vx-B.w*rby;vby=B.vy+B.w*rbx;
    invMB=B.invM;invIB=B.invI;
  }
  var dx=pbx-pax,dy=pby-pay;
  var K11=A.invM+invMB+A.invI*ray*ray+invIB*rby*rby;
  var K12=-A.invI*rax*ray-invIB*rbx*rby;
  var K22=A.invM+invMB+A.invI*rax*rax+invIB*rbx*rbx;
  var det=K11*K22-K12*K12;
  if(Math.abs(det)<1e-12)return;
  var beta=0.08/h;
  var rx=-(vbx-vax+beta*dx),ry=-(vby-vay+beta*dy);
  var ix=(K22*rx-K12*ry)/det,iy=(K11*ry-K12*rx)/det;
  A.vx-=ix*A.invM;A.vy-=iy*A.invM;A.w-=(rax*iy-ray*ix)*A.invI;
  if(B){B.vx+=ix*B.invM;B.vy+=iy*B.invM;B.w+=(rbx*iy-rby*ix)*B.invI;}
}

/* ==================================================================
   约束：弹簧 / 绳索 / 滑轮
   links[i] = {kind:'spring'|'rope'|'pulley', A, B(null→世界锚点),
               ra[2], rb[2], wx,wy, L0, k, c, px,py,pr, acc}
   ra/rb 是物体局部坐标下的挂点；wx/wy 是 B 为空时的世界固定点
   ================================================================== */
function sbLinkPts(lk){
  var A=lk.A,c1=Math.cos(A.angle),s1=Math.sin(A.angle);
  var rax=lk.ra[0]*c1-lk.ra[1]*s1,ray=lk.ra[0]*s1+lk.ra[1]*c1;
  var o={A:A,rax:rax,ray:ray,ax:A.x+rax,ay:A.y+ray,
         vax:A.vx-A.w*ray,vay:A.vy+A.w*rax,invMA:A.invM,invIA:A.invI};
  var B=lk.B;
  if(B){
    var c2=Math.cos(B.angle),s2=Math.sin(B.angle);
    var rbx=lk.rb[0]*c2-lk.rb[1]*s2,rby=lk.rb[0]*s2+lk.rb[1]*c2;
    o.B=B;o.rbx=rbx;o.rby=rby;o.bx=B.x+rbx;o.by=B.y+rby;
    o.vbx=B.vx-B.w*rby;o.vby=B.vy+B.w*rbx;o.invMB=B.invM;o.invIB=B.invI;
  }else{
    o.B=null;o.rbx=0;o.rby=0;o.bx=lk.wx;o.by=lk.wy;o.vbx=0;o.vby=0;o.invMB=0;o.invIB=0;
  }
  return o;
}
/* 沿约束轴施加冲量：A 受 -P，B 受 +P（绳索：P = λ·u） */
function sbApplyAt(p,px,py){
  var A=p.A;
  A.vx-=px*A.invM;A.vy-=py*A.invM;A.w-=(p.rax*py-p.ray*px)*A.invI;
  if(p.B){var B=p.B;B.vx+=px*B.invM;B.vy+=py*B.invM;B.w+=(p.rbx*py-p.rby*px)*B.invI;}
}
/* 两端分别施加指定冲量（滑轮：两端梯度不同） */
function sbApplyTwo(p,ax_,ay_,bx_,by_){
  var A=p.A;
  A.vx+=ax_*A.invM;A.vy+=ay_*A.invM;A.w+=(p.rax*ay_-p.ray*ax_)*A.invI;
  if(p.B){var B=p.B;B.vx+=bx_*B.invM;B.vy+=by_*B.invM;B.w+=(p.rbx*by_-p.rby*bx_)*B.invI;}
}
/* 弹簧：显式胡克力 F = -k(L-L0) - c·dL/dt（h 已按刚度自适应加密，稳定） */
function sbSpringForce(lk,h){
  var p=sbLinkPts(lk);
  var dx=p.bx-p.ax,dy=p.by-p.ay,L=Math.sqrt(dx*dx+dy*dy);
  if(L<1e-6)return;
  var ux=dx/L,uy=dy/L;
  var cd=ux*(p.vbx-p.vax)+uy*(p.vby-p.vay);
  var C=L-lk.L0;
  // op: 0 双向 / 1 只推不拉（缓冲挡块，拉伸即脱开）/ 2 只拉不推
  if(lk.op===1&&C>0){lk.F=0;return;}
  if(lk.op===2&&C<0){lk.F=0;return;}
  var f=lk.k*C+lk.c*cd;
  if(f>2e4)f=2e4;else if(f<-2e4)f=-2e4;
  // A 被拉向 B(+u)，B 被拉向 A(-u)
  var A=p.A;
  A.vx+=f*ux*A.invM*h;A.vy+=f*uy*A.invM*h;A.w+=(p.rax*f*uy-p.ray*f*ux)*A.invI*h;
  if(p.B){var B=p.B;B.vx-=f*ux*B.invM*h;B.vy-=f*uy*B.invM*h;B.w-=(p.rbx*f*uy-p.rby*f*ux)*B.invI*h;}
  lk.F=f;                       // 供读数与力矢量显示
}
/* 绳索：单边距离约束，只拉不推 */
function sbSolveRope(lk,h){
  var p=sbLinkPts(lk);
  var dx=p.bx-p.ax,dy=p.by-p.ay,L=Math.sqrt(dx*dx+dy*dy);
  if(L<1e-6)return;
  var ux=dx/L,uy=dy/L;
  var C=L-lk.L0;
  var cd=ux*(p.vbx-p.vax)+uy*(p.vby-p.vay);
  var raN=p.rax*uy-p.ray*ux,rbN=p.rbx*uy-p.rby*ux;
  var kE=p.invMA+p.invMB+raN*raN*p.invIA+rbN*rbN*p.invIB;
  if(kE<=1e-12)return;
  var bias=(0.22/h)*Math.max(C,0);
  var lam=-(cd+bias)/kE;
  var old=lk.acc;
  lk.acc=Math.min(old+lam,0);      // 累积冲量只能为负（只拉近、不推开）
  lam=lk.acc-old;
  if(lam===0&&C<-0.02){lk.F=0;return;}
  sbApplyAt(p,lam*ux,lam*uy);
  lk.F=Math.abs(lk.acc/h);          // 用整步累积冲量，收敛后单次迭代的 λ≈0 会读成 0
}
/* 滑轮：C = |PA| + |PB| - Ltot，双边约束（绳总长不变） */
function sbSolvePulley(lk,h){
  var p=sbLinkPts(lk);
  var ax=p.ax-lk.px,ay=p.ay-lk.py,LA=Math.sqrt(ax*ax+ay*ay);
  var bx=p.bx-lk.px,by=p.by-lk.py,LB=Math.sqrt(bx*bx+by*by);
  if(LA<1e-6||LB<1e-6)return;
  var uax=ax/LA,uay=ay/LA,ubx=bx/LB,uby=by/LB;
  var C=LA+LB-lk.L0;
  var cd=uax*p.vax+uay*p.vay+ubx*p.vbx+uby*p.vby;
  var raN=p.rax*uay-p.ray*uax,rbN=p.rbx*uby-p.rby*ubx;
  var kE=p.invMA+p.invMB+raN*raN*p.invIA+rbN*rbN*p.invIB;
  if(kE<=1e-12)return;
  var lam=-(cd+(0.22/h)*C)/kE;
  sbApplyTwo(p,lam*uax,lam*uay,lam*ubx,lam*uby);
  lk.acc+=lam;                      // 累积整步冲量，才能读出真实张力
  lk.F=Math.abs(lk.acc/h);lk.LA=LA;lk.LB=LB;
}
/* 位置投影：绳索与滑轮在积分后做几轮硬修正，防止缓慢伸长 */
function sbLinkPosFix(){
  for(var i=0;i<SB.links.length;i++){
    var lk=SB.links[i];
    if(lk.kind!=='rope'&&lk.kind!=='pulley')continue;
    for(var it=0;it<3;it++){
      var p=sbLinkPts(lk),kE,corr;
      if(lk.kind==='rope'){
        var dx=p.bx-p.ax,dy=p.by-p.ay,L=Math.sqrt(dx*dx+dy*dy);
        if(L<1e-6||L<=lk.L0)break;
        var ux=dx/L,uy=dy/L;
        kE=p.invMA+p.invMB;if(kE<=1e-12)break;
        corr=(L-lk.L0)/kE;
        p.A.x+=corr*ux*p.invMA;p.A.y+=corr*uy*p.invMA;
        p.A.angle+=(p.rax*corr*uy-p.ray*corr*ux)*p.invIA*0.35;
        if(p.B){p.B.x-=corr*ux*p.invMB;p.B.y-=corr*uy*p.invMB;
                p.B.angle-=(p.rbx*corr*uy-p.rby*corr*ux)*p.invIB*0.35;}
      }else{
        var ax=p.ax-lk.px,ay=p.ay-lk.py,LA=Math.sqrt(ax*ax+ay*ay);
        var bx=p.bx-lk.px,by=p.by-lk.py,LB=Math.sqrt(bx*bx+by*by);
        if(LA<1e-6||LB<1e-6)break;
        var C=LA+LB-lk.L0;
        if(Math.abs(C)<1e-4)break;
        kE=p.invMA+p.invMB;if(kE<=1e-12)break;
        corr=-C/kE;
        p.A.x+=corr*(ax/LA)*p.invMA;p.A.y+=corr*(ay/LA)*p.invMA;
        if(p.B){p.B.x+=corr*(bx/LB)*p.invMB;p.B.y+=corr*(by/LB)*p.invMB;}
      }
    }
  }
}

/* ---------- 鼠标抓取（弹簧约束，松手带速度抛出） ---------- */
function sbGrabForce(h){
  var gb=SB.grab;if(!gb)return;
  var b=gb.b;
  if(b.stat){
    b.x=SB.mouse.wx-gb.off[0];b.y=SB.mouse.wy-gb.off[1];
    b.vx=0;b.vy=0;b.w=0;
    SB.needRedraw=true;
    return;
  }
  var c=Math.cos(b.angle),s=Math.sin(b.angle);
  var rx=gb.lo[0]*c-gb.lo[1]*s,ry=gb.lo[0]*s+gb.lo[1]*c;
  var dx=SB.mouse.wx-(b.x+rx),dy=SB.mouse.wy-(b.y+ry);
  var vax=b.vx-b.w*ry,vay=b.vy+b.w*rx;
  var k=340*b.m,cc=2*Math.sqrt(k*b.m)*0.85;
  var fx=k*dx-cc*vax,fy=k*dy-cc*vay;
  var fm=Math.sqrt(fx*fx+fy*fy),lim=5000*b.m;
  if(fm>lim){fx*=lim/fm;fy*=lim/fm;}
  b.vx+=fx*b.invM*h;b.vy+=fy*b.invM*h;
  b.w+=(rx*fy-ry*fx)*b.invI*h;
  b.w-=1.2*b.w*h;
}

/* 导轨约束：物体只能沿固定直线平移（阿特伍德机 / 斜面连接体 / 板块模型必需）
   b.ax = [dx, dy, x0, y0, angle0]，dx/dy 为单位方向，(x0,y0) 为轴上一点 */
function sbAxisFix(){
  var bs=SB.bodies;
  for(var i=0;i<bs.length;i++){
    var b=bs[i];
    if(!b.ax||b.stat)continue;
    var d=b.ax,ax=d[0],ay=d[1];
    var v=b.vx*ax+b.vy*ay;
    b.vx=v*ax;b.vy=v*ay;b.w=0;          // 只允许沿轴速度，且不自转
    if(d[4]!==undefined)b.angle=d[4];
    var t=(b.x-d[2])*ax+(b.y-d[3])*ay;
    b.x=d[2]+t*ax;b.y=d[3]+t*ay;        // 位置拉回轴线，杜绝横向漂移
  }
}
function sbSetAxis(b,dx,dy){
  if(!b)return;
  if(dx===null){b.ax=null;return;}
  var L=Math.sqrt(dx*dx+dy*dy)||1;
  b.ax=[dx/L,dy/L,b.x,b.y,b.angle];
}

/* ---------- 步进 ---------- */
function sbSub(h){
  var bs=SB.bodies,i;
  SB.gx=SB.g*Math.cos(SB.gdir);SB.gy=SB.g*Math.sin(SB.gdir);
  /* 弹簧力必须放在重力之前：阻尼项要用"上一步末的真实速度"，
     否则会看到本子步刚加进去的重力速度，产生 c·g·h/k 的稳态偏差 */
  for(i=0;i<SB.links.length;i++){
    if(SB.links[i].kind==='spring'){SB.links[i].acc=0;sbSpringForce(SB.links[i],h);}
  }
  for(i=0;i<bs.length;i++){
    var b=bs[i];
    if(b.stat)continue;
    b.vx+=SB.gx*h;b.vy+=SB.gy*h;
    /* 匀强电场 + 匀强磁场：一个子步内的解析解（漂移速度 + 匀速旋转），
       纯磁场时速率严格不变，速度选择器中 v=E/B 的粒子严格不偏转 */
    if(b.q&&(Math.abs(SB.Ex)>1e-9||Math.abs(SB.Ey)>1e-9||Math.abs(SB.Bz)>1e-9)){
      var aEx=b.q*SB.Ex*b.invM,aEy=b.q*SB.Ey*b.invM,w=b.q*SB.Bz*b.invM;
      if(Math.abs(w)>1e-9){
        var vdx=aEy/w,vdy=-aEx/w;               // E×B 漂移速度
        var th=w*h;if(th>1.2)th=1.2;else if(th<-1.2)th=-1.2;
        var cs=Math.cos(th),sn=Math.sin(th);
        var ux=b.vx-vdx,uy=b.vy-vdy;
        b.vx=ux*cs+uy*sn+vdx;
        b.vy=-ux*sn+uy*cs+vdy;
      }else{b.vx+=aEx*h;b.vy+=aEy*h;}
    }
    if(SB.air>0){var f=1-SB.air*h;if(f<0)f=0;b.vx*=f;b.vy*=f;b.w*=f;}
  }
  if(SB.grab)sbGrabForce(h);
  var cts=sbCollide();
  SB.nc=cts.length;
  SB.cts=cts;
  // 预处理：用初始接近速度确定恢复系数的目标分离速度（只算一次）+ 冲量热启动
  var warm=SB.warm||{};SB.warm={};
  var dmgSeen={};
  for(i=0;i<bs.length;i++)bs[i].touch=0;
  for(i=0;i<cts.length;i++){
    var ct=cts[i];
    ct.A.touch=1;ct.B.touch=1;
    var cax=ct.p[0]-ct.A.x,cay=ct.p[1]-ct.A.y;
    var cbx=ct.p[0]-ct.B.x,cby=ct.p[1]-ct.B.y;
    var cvx=(ct.B.vx-ct.B.w*cby)-(ct.A.vx-ct.A.w*cay);
    var cvy=(ct.B.vy+ct.B.w*cbx)-(ct.A.vy+ct.A.w*cax);
    var vn0=cvx*ct.n[0]+cvy*ct.n[1];
    var ee=(vn0<-1)?Math.max(ct.A.e,ct.B.e):0;
    ct.vb=(vn0<0)?(-ee*vn0):0;
    // 撞击损伤：只有"真的撞上去"（接近速度超过阈值）才扣血，堆叠静置不会掉血
    // 同一对物体在一步内可能有 2 个接触点，必须按"对"去重，否则一次撞击被算两遍
    if(SB.fragOn&&vn0<-SB.dmgV){
      var dk=ct.A.id+'_'+ct.B.id, sp=0.5*vn0*vn0*SB.dmgK, pv=dmgSeen[dk];
      if(!pv||sp>pv.s)dmgSeen[dk]={s:sp,A:ct.A,B:ct.B,iA:ct.A.invM,iB:ct.B.invM,
        im:Math.max(ct.A.invM+ct.B.invM,1e-9),px:ct.p[0],py:ct.p[1]};
    }
    ct.jn=0;ct.jt=0;ct.jbn=0;
    // 热启动：沿用上一子步的冲量作为初值，堆叠链才收敛得动
    var w=warm[ct.key];
    if(w&&Math.abs(w.p[0]-ct.p[0])<0.25&&Math.abs(w.p[1]-ct.p[1])<0.25&&w.nx*ct.n[0]+w.ny*ct.n[1]>0.7){
      ct.jn=w.jn;ct.jt=w.jt;
      var twx=-ct.n[1],twy=ct.n[0];
      sbApply(ct.A,ct.B,ct.jn*ct.n[0]+ct.jt*twx,ct.jn*ct.n[1]+ct.jt*twy,ct.p[0],ct.p[1]);
    }
  }
  // 损伤在这里统一结算：比动能 ½v² 按"谁软谁多挨"分配（invM 大的一方分到更多）
  for(var dk2 in dmgSeen){
    var dv2=dmgSeen[dk2];
    sbHurt(dv2.A,dv2.s*(dv2.iA/dv2.im),dv2.px,dv2.py);
    sbHurt(dv2.B,dv2.s*(dv2.iB/dv2.im),dv2.px,dv2.py);
  }
  for(i=0;i<bs.length;i++){bs[i].pvx=0;bs[i].pvy=0;bs[i].pw=0;}
  for(i=0;i<SB.links.length;i++){
    var lk=SB.links[i];
    if(lk.kind!=='spring'){lk.acc=0;lk.F=0;}
  }
  for(var it=0;it<SB.iters;it++){
    for(i=0;i<cts.length;i++)sbSolveContact(cts[i],h);
    for(i=0;i<SB.joints.length;i++)sbSolveJoint(SB.joints[i],h);
    for(i=0;i<SB.links.length;i++){
      var lk2=SB.links[i];
      if(lk2.kind==='rope')sbSolveRope(lk2,h);
      else if(lk2.kind==='pulley')sbSolvePulley(lk2,h);
    }
  }
  for(i=0;i<cts.length;i++){
    var cs=cts[i];
    SB.warm[cs.key]={jn:cs.jn,jt:cs.jt,p:[cs.p[0],cs.p[1]],nx:cs.n[0],ny:cs.n[1]};
  }
  sbAxisFix();             // 消掉导轨物体的横向速度
  for(i=0;i<bs.length;i++){
    var b2=bs[i];if(b2.stat)continue;
    // 伪速度只参与位置积分，速度本身不受穿透修正影响
    b2.x+=(b2.vx+b2.pvx)*h;b2.y+=(b2.vy+b2.pvy)*h;b2.angle+=(b2.w+b2.pw)*h;
    if(b2.touch){
      b2.w-=0.9*b2.w*h;   // 接触时的滚动阻尼
    }
    b2.vx=clamp(b2.vx,-90,90);b2.vy=clamp(b2.vy,-90,90);b2.w=clamp(b2.w,-45,45);
  }
  sbLinkPosFix();          // 绳索/滑轮硬修正，杜绝缓慢伸长
  sbAxisFix();             // 位置拉回导轨轴线
  sbFlushBreak();          // 本子步内被打碎的物体在这里统一替换成碎块
}
function sbStep(dt){
  sbTiltApply();
  // 子步按最硬弹簧自适应加密：显式积分要求 ω·h 足够小，否则会发散
  var need=0.0025,i;
  for(i=0;i<SB.links.length;i++){
    var lk=SB.links[i];
    if(lk.kind!=='spring')continue;
    var im=lk.A.invM+(lk.B?lk.B.invM:0);
    if(im<=1e-9)continue;
    var w=Math.sqrt(lk.k*im);
    if(w>1e-6){var hh=0.22/w;if(hh<need)need=hh;}
  }
  if(need<0.0005)need=0.0005;
  var n=Math.max(1,Math.min(Math.ceil(dt/need),48)),h=dt/n;
  for(i=0;i<n;i++){sbSub(h);SB.t+=h;}
  sbFuse(dt);
  sbFxStep(dt);
  sbPartStep(dt);
  sbPartBurn(dt);
  sbFireStep(dt);
  sbDecay(dt);
  sbHist();
}
function sbHist(){
  var px=0,py=0,Ek=0,Ep=0,bs=SB.bodies;
  for(var i=0;i<bs.length;i++){
    var b=bs[i];if(b.stat)continue;
    px+=b.m*b.vx;py+=b.m*b.vy;
    Ek+=0.5*b.m*(b.vx*b.vx+b.vy*b.vy)+0.5*b.I*b.w*b.w;
    // 电势能 U = -q·E·r，加上它之后在纯电场中机械能才守恒
    Ep+=-(b.m*(SB.gx*b.x+SB.gy*b.y))-(b.q?(b.q*(SB.Ex*b.x+SB.Ey*b.y)):0);
    // 运动轨迹（洛伦兹力圆周运动 / 类平抛 / 抛体必备）
    if(SB.showTrail){
      if(!b.trail)b.trail=[];
      b.trail.push(b.x,b.y);
      if(b.trail.length>900)b.trail.splice(0,2);
    }else if(b.trail)b.trail=null;
  }
  SB.px=px;SB.py=py;SB.Ek=Ek;SB.Ep=Ep;
  SB.hist.push({t:SB.t,v:[px,py],e:[Ek,Ep]});
  if(SB.hist.length>2000)SB.hist.shift();
}

/* ---------- 视图 ---------- */
function sbX(x){return SB.view.W/2+(x-SB.view.cx)*SB.view.s;}
function sbY(y){return SB.view.H/2-(y-SB.view.cy)*SB.view.s;}
function sbWX(sx){return (sx-SB.view.W/2)/SB.view.s+SB.view.cx;}
function sbWY(sy){return (SB.view.H/2-sy)/SB.view.s+SB.view.cy;}
/* 以屏幕点为锚点缩放 */
function sbZoomAt(sx,sy,f){
  var wx=sbWX(sx),wy=sbWY(sy);
  SB.view.s=clamp(SB.view.s*f,6,400);
  SB.view.cx=wx-(sx-SB.view.W/2)/SB.view.s;
  SB.view.cy=wy+(sy-SB.view.H/2)/SB.view.s;
}
function sbFitView(){
  var minx=1e18,maxx=-1e18,miny=1e18,maxy=-1e18,any=false;
  for(var i=0;i<SB.bodies.length;i++){
    var b=SB.bodies[i];if(b.nofit)continue;
    var r=sbRad(b);any=true;
    minx=Math.min(minx,b.x-r);maxx=Math.max(maxx,b.x+r);
    miny=Math.min(miny,b.y-r);maxy=Math.max(maxy,b.y+r);
  }
  if(!any){minx=0;maxx=16;miny=0;maxy=8;}
  var w=Math.max(maxx-minx,1.5),h=Math.max(maxy-miny,1.5);
  SB.view.cx=(minx+maxx)/2;SB.view.cy=(miny+maxy)/2;
  var W=SB.view.W||800,H=SB.view.H||420;
  SB.view.s=clamp(Math.min(W/(w+2.5),H/(h+2.5)),10,140);
}

/* ---------- 渲染 ---------- */
function sbRender(){
  var cv=$('#scene'),dpr=Math.min(window.devicePixelRatio||1,2);
  var W=cv.clientWidth||800;
  var H=(W<560)?Math.round(Math.min(Math.max(W*0.86,290),480))
              :Math.round(Math.min(Math.max(W*0.54,330),560));
  cv.style.height=H+'px';
  if(cv.height!==Math.round(H*dpr)||cv.width!==Math.round(W*dpr)){
    cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  }
  var g=cv.getContext('2d');
  g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,W,H);
  if(typeof V19!=='undefined'&&V19.grade){
    var bg19=g.createLinearGradient(0,0,0,H);
    if(SB.dark){bg19.addColorStop(0,'#0b1326');bg19.addColorStop(1,'#070b17');}
    else{bg19.addColorStop(0,'#f8fafd');bg19.addColorStop(1,'#edf2f9');}
    g.fillStyle=bg19;g.fillRect(0,0,W,H);
  }
  SB.view.W=W;SB.view.H=H;
  if(SB.dark)sbDrawSpace(g,W,H);
  if(SB.needFit){sbFitView();SB.needFit=false;}
  /* 爆炸的画面震动（只抖世界层，HUD 与读数不跟着抖） */
  var shk=SB.shake;
  g.save();
  if(shk>0.003){SB.shake=shk*0.87;g.translate((Math.random()-0.5)*18*shk,(Math.random()-0.5)*18*shk);}
  else SB.shake=0;

  /* 网格 */
  if(SB.showGrid){
    var s=SB.view.s,x0=Math.floor(sbWX(0)),x1=Math.ceil(sbWX(W));
    var y0=Math.floor(sbWY(H)),y1=Math.ceil(sbWY(0));
    g.strokeStyle=(SB.dark?'rgba(148,163,184,.12)':'#eef2f7');g.lineWidth=1;
    for(var x=x0;x<=x1;x++){
      var X=sbX(x);
      g.beginPath();g.moveTo(X,0);g.lineTo(X,H);g.stroke();
      if(x%2===0)label(g,X+2,H-4,x+'m',(SB.dark?'rgba(148,163,184,.55)':'#cbd5e1'),'left');
    }
    for(var y=y0;y<=y1;y++){
      var Y=sbY(y);
      g.beginPath();g.moveTo(0,Y);g.lineTo(W,Y);g.stroke();
      if(y%2===0)label(g,4,Y-2,y+'m',(SB.dark?'rgba(148,163,184,.55)':'#cbd5e1'),'left');
    }
    var gy=sbY(0);
    if(gy>=0&&gy<=H&&SB.env!=='space'){g.strokeStyle=(SB.dark?'rgba(148,163,184,.45)':'#94a3b8');g.lineWidth=1.5;g.beginPath();g.moveTo(0,gy);g.lineTo(W,gy);g.stroke();}
  }

  /* 场（背景层） */
  sbDrawField(g,W,H);

  /* 液体（画在刚体之下，看上去像是物体泡在水里） */
  if(SB.parts.length)sbPartDraw(g);

  /* 运动轨迹 */
  if(SB.showTrail){
    for(var ti=0;ti<SB.bodies.length;ti++){
      var tb=SB.bodies[ti];
      if(tb.stat||!tb.trail||tb.trail.length<6)continue;
      // trail 是扁平数组 [x0,y0,x1,y1,...]：偶数位取 x，奇数位才是 y
      g.strokeStyle=(tb.color||'#dc2626');g.globalAlpha=0.36;g.lineWidth=1.8;
      g.beginPath();g.moveTo(sbX(tb.trail[0]),sbY(tb.trail[1]));
      for(var tj=2;tj+1<tb.trail.length;tj+=2)g.lineTo(sbX(tb.trail[tj]),sbY(tb.trail[tj+1]));
      g.stroke();g.globalAlpha=1;
    }
  }

  /* 物体 */
  for(var i=0;i<SB.bodies.length;i++)sbDrawBody(g,SB.bodies[i]);

  /* 受力矢量 */
  if(SB.showF){
    for(var fi=0;fi<SB.bodies.length;fi++){
      if(!SB.bodies[fi].stat)sbDrawForces(g,SB.bodies[fi]);
    }
  }

  /* 约束（弹簧 / 绳索 / 滑轮） */
  for(var li=0;li<SB.links.length;li++)sbDrawLink(g,SB.links[li]);

  /* 铰链 */
  for(var j=0;j<SB.joints.length;j++){
    var jt=SB.joints[j];
    var c1=Math.cos(jt.A.angle),s1=Math.sin(jt.A.angle);
    var ax=jt.A.x+jt.ra[0]*c1-jt.ra[1]*s1,ay=jt.A.y+jt.ra[0]*s1+jt.ra[1]*c1;
    g.fillStyle='#0f172a';g.beginPath();g.arc(sbX(ax),sbY(ay),4,0,Math.PI*2);g.fill();
    g.strokeStyle='#fff';g.lineWidth=1.5;g.stroke();
  }

  /* 接触点 */
  if(SB.showCt&&SB.cts){
    g.fillStyle='#dc2626';
    for(var k=0;k<SB.cts.length;k++){
      var p=SB.cts[k].p;
      g.beginPath();g.arc(sbX(p[0]),sbY(p[1]),3,0,Math.PI*2);g.fill();
    }
  }

  /* 爆炸 / 火花 / 烟尘（画在物体之上，冲击波才压得住画面） */
  sbFxDraw(g);

  /* 抓取连线 */
  if(SB.grab){
    var b=SB.grab.b;
    var cg=Math.cos(b.angle),sg=Math.sin(b.angle);
    var rx=SB.grab.lo[0]*cg-SB.grab.lo[1]*sg,ry=SB.grab.lo[0]*sg+SB.grab.lo[1]*cg;
    g.strokeStyle='#f59e0b';g.lineWidth=1.5;g.setLineDash([4,3]);
    g.beginPath();g.moveTo(sbX(b.x+rx),sbY(b.y+ry));g.lineTo(SB.mouse.sx,SB.mouse.sy);g.stroke();
    g.setLineDash([]);
    g.fillStyle='#f59e0b';g.beginPath();g.arc(sbX(b.x+rx),sbY(b.y+ry),3.5,0,Math.PI*2);g.fill();
  }

  g.restore();
  /* 爆闪光（画在世界层之外，覆盖整个画布） */
  if(SB.flash>0.004){
    g.fillStyle='rgba(255,246,214,'+Math.min(0.42,SB.flash*0.42)+')';
    g.fillRect(0,0,W,H);
    SB.flash*=0.84;
  }else SB.flash=0;

  /* HUD */
  label(g,10,16,'物体 '+SB.bodies.length+' · 约束 '+SB.links.length+' · 接触 '+SB.nc+
    (SB.pcount?(' · 液体 '+SB.pcount):'')+' · '+fmt(SB.fps,0)+'fps · '+(SB.run?'运行中':'已暂停'),
    (SB.dark?'rgba(226,232,240,.85)':'#6b7280'),'left');
  if(SB.g>0){
    label(g,W-10,16,'g = '+fmt(SB.g,1)+' m/s²　'+sbGTxt(),
      (SB.dark?'rgba(226,232,240,.7)':'#94a3b8'),'right');
    if(SB.env==='space')label(g,10,32,'空间模式 · 失重（四周有看不见的边界）',
      (SB.dark?'rgba(148,197,253,.95)':'#2563eb'),'left');
  }
  if(SB.tiltMsg)label(g,W-10,H-84,SB.tiltMsg,'rgba(217,119,6,.9)','right');
  if(Math.abs(SB.Ex)>1e-6||Math.abs(SB.Ey)>1e-6)
    label(g,W-10,30,'E = ('+fmt(SB.Ex,1)+', '+fmt(SB.Ey,1)+') N/C','rgba(37,99,235,.75)','right');
  if(Math.abs(SB.Bz)>1e-9)
    label(g,W-10,44,'B = '+fmt(SB.Bz,2)+' T '+(SB.Bz>0?'⊗ 向里':'⊙ 向外'),'rgba(124,58,237,.8)','right');
  if(SB.pick)
    label(g,W/2,H-12,'连接模式：再点一个物体'+(SB.pick.kind==='spring'?'（弹簧）':(SB.pick.kind==='rope'?'（绳索）':'（滑轮）'))+'，点空白处取消','#f59e0b','center');

  /* 状态栏与数据 */
  $('#stageTag').textContent='自由沙盒 · '+SB.preset+(SB.sel?' · 已选中 #'+SB.sel.id:' · 点击物体选中')+(SB.links.length?' · 约束 '+SB.links.length:'');
  $('#timeTag').textContent='t = '+fmt(SB.t)+' s';
  sbReadout();
  drawChart($('#chV'),SB.hist,SB.hist.length-1,{field:'v',title:'系统动量',unit:'kg·m/s',
    keys:[{label:'px',color:'#2563eb'},{label:'py',color:'#16a34a'}]});
  drawChart($('#chE'),SB.hist,SB.hist.length-1,{field:'e',title:'系统能量',unit:'J',
    keys:[{label:'动能 Ek',color:'#2563eb'},{label:'势能 Ep',color:'#d97706'}]});
}
/* ---------- 场（电场箭头 / 磁场符号）背景 ---------- */
function sbDrawField(g,W,H){
  if(!SB.showField)return;
  var em=Math.sqrt(SB.Ex*SB.Ex+SB.Ey*SB.Ey);
  var step=Math.max(64,Math.min(W,H)/4);
  var X,Y;
  if(em>0.02){
    var ux=SB.Ex/em,uy=SB.Ey/em,L=Math.min(step*0.34,24);
    for(X=step*0.55;X<W;X+=step){
      for(Y=step*0.55;Y<H;Y+=step){
        arrow(g,X-ux*L*0.5,Y+uy*L*0.5,X+ux*L*0.5,Y-uy*L*0.5,'rgba(37,99,235,.26)',1.3);
      }
    }
  }
  if(Math.abs(SB.Bz)>0.005){
    var r=Math.min(step*0.17,9);
    for(X=step*0.55;X<W;X+=step){
      for(Y=step*0.55;Y<H;Y+=step){
        g.strokeStyle='rgba(124,58,237,.30)';g.lineWidth=1.2;
        g.beginPath();g.arc(X,Y,r,0,Math.PI*2);g.stroke();
        if(SB.Bz>0){   // 垂直纸面向里 ⊗
          g.beginPath();
          g.moveTo(X-r*0.7,Y-r*0.7);g.lineTo(X+r*0.7,Y+r*0.7);
          g.moveTo(X+r*0.7,Y-r*0.7);g.lineTo(X-r*0.7,Y+r*0.7);g.stroke();
        }else{         // 垂直纸面向外 ⊙
          g.fillStyle='rgba(124,58,237,.34)';
          g.beginPath();g.arc(X,Y,r*0.32,0,Math.PI*2);g.fill();
        }
      }
    }
  }
}
/* ---------- 约束绘制 ---------- */
function sbDrawLink(g,lk){
  var p=sbLinkPts(lk);
  var X1=sbX(p.ax),Y1=sbY(p.ay),X2=sbX(p.bx),Y2=sbY(p.by);
  var hot=(SB.selLink===lk);
  var i,t,px,py;
  if(lk.kind==='spring'){
    var dx=X2-X1,dy=Y2-Y1,L=Math.sqrt(dx*dx+dy*dy);
    if(L<1)return;
    var ux=dx/L,uy=dy/L,nx=-uy,ny=ux;
    var N=Math.max(6,Math.min(Math.round(L/9),20));
    var Lw=L/Math.max(SB.view.s,1e-6);
    var amp=Math.min(7.5,L/N*0.85)*clamp(lk.L0/Math.max(Lw,1e-6),0.4,1.35);
    g.strokeStyle=hot?'#f59e0b':'#0f172a';g.lineWidth=hot?2.6:1.8;
    g.beginPath();g.moveTo(X1,Y1);
    for(i=1;i<N;i++){
      t=i/N;var sgn=(i%2)?1:-1;
      g.lineTo(X1+dx*t+nx*amp*sgn,Y1+dy*t+ny*amp*sgn);
    }
    g.lineTo(X2,Y2);g.stroke();
  }else if(lk.kind==='rope'){
    var wx=p.bx-p.ax,wy=p.by-p.ay,L2=Math.sqrt(wx*wx+wy*wy);
    var tight=(L2>=lk.L0-0.015);
    g.strokeStyle=hot?'#f59e0b':(tight?'#dc2626':'#94a3b8');
    g.lineWidth=hot?2.6:(tight?2:1.6);
    g.beginPath();g.moveTo(X1,Y1);
    if(tight)g.lineTo(X2,Y2);
    else{    // 松弛：画一条下垂的弧
      var sag=Math.min((lk.L0-L2)*0.6*SB.view.s,90);
      g.quadraticCurveTo((X1+X2)/2,(Y1+Y2)/2+sag,X2,Y2);
    }
    g.stroke();
  }else if(lk.kind==='pulley'){
    var PX=sbX(lk.px),PY=sbY(lk.py),R=lk.pr*SB.view.s;
    var dxa=p.ax-lk.px,dya=p.ay-lk.py,LA=Math.sqrt(dxa*dxa+dya*dya)||1;
    var dxb=p.bx-lk.px,dyb=p.by-lk.py,LB=Math.sqrt(dxb*dxb+dyb*dyb)||1;
    var ta=[lk.px+lk.pr*dxa/LA,lk.py+lk.pr*dya/LA];
    var tb=[lk.px+lk.pr*dxb/LB,lk.py+lk.pr*dyb/LB];
    g.strokeStyle=hot?'#f59e0b':'#dc2626';g.lineWidth=hot?2.6:1.9;
    g.beginPath();g.moveTo(X1,Y1);g.lineTo(sbX(ta[0]),sbY(ta[1]));g.stroke();
    g.beginPath();g.moveTo(X2,Y2);g.lineTo(sbX(tb[0]),sbY(tb[1]));g.stroke();
    if(Math.abs(LA+LB-lk.L0)<0.02){   // 绷紧才画绕过滑轮的那段圆弧
      var a1=Math.atan2(sbY(ta[1])-PY,sbX(ta[0])-PX);
      var a2=Math.atan2(sbY(tb[1])-PY,sbX(tb[0])-PX);
      var da=a2-a1;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
      g.beginPath();g.arc(PX,PY,R,a1,a1+da,da<0);g.stroke();
    }
    // 滑轮本体
    g.fillStyle='#f1f5f9';g.beginPath();g.arc(PX,PY,R,0,Math.PI*2);g.fill();
    g.strokeStyle='#475569';g.lineWidth=2;g.stroke();
    g.fillStyle='#475569';g.beginPath();g.arc(PX,PY,Math.max(2,R*0.16),0,Math.PI*2);g.fill();
  }
  // 两端挂点
  g.fillStyle=hot?'#f59e0b':'#0f172a';
  g.beginPath();g.arc(X1,Y1,3.2,0,Math.PI*2);g.fill();
  if(lk.B||lk.kind!=='pulley'){g.beginPath();g.arc(X2,Y2,3.2,0,Math.PI*2);g.fill();}
  if(!lk.B){   // 世界固定锚点画成小三角支架
    g.fillStyle='#64748b';
    g.beginPath();g.moveTo(X2,Y2);g.lineTo(X2-5,Y2+8);g.lineTo(X2+5,Y2+8);g.closePath();g.fill();
  }
}
/* ---------- 受力分析 ---------- */
function sbForceList(b){
  var out=[],i;
  if(!b.stat){
    if(SB.g>0.001)out.push({n:'G',x:b.m*SB.gx,y:b.m*SB.gy,c:'#dc2626'});
    if(b.q&&(Math.abs(SB.Ex)>1e-6||Math.abs(SB.Ey)>1e-6))
      out.push({n:'F电',x:b.q*SB.Ex,y:b.q*SB.Ey,c:'#2563eb'});
    if(b.q&&Math.abs(SB.Bz)>1e-9)
      out.push({n:'F洛',x:b.q*SB.Bz*b.vy,y:-b.q*SB.Bz*b.vx,c:'#7c3aed'});
  }
  for(i=0;i<SB.links.length;i++){
    var lk=SB.links[i];
    if(lk.A!==b&&lk.B!==b)continue;
    var p=sbLinkPts(lk);
    var dx=p.bx-p.ax,dy=p.by-p.ay,L=Math.sqrt(dx*dx+dy*dy)||1;
    var ux=dx/L,uy=dy/L,sgn=(lk.A===b)?1:-1;
    if(lk.kind==='spring'){
      var f=(lk.F||0)*sgn;
      out.push({n:'F弹',x:f*ux,y:f*uy,c:'#0891b2'});
    }else if(lk.kind==='rope'){
      var tt=lk.F||0;
      if(tt>1e-6)out.push({n:'T',x:tt*ux*sgn,y:tt*uy*sgn,c:'#0891b2'});
    }else if(lk.kind==='pulley'){
      var t2=lk.F||0;
      if(t2>1e-6){
        if(lk.A===b){var ax=p.ax-lk.px,ay=p.ay-lk.py,LA=Math.sqrt(ax*ax+ay*ay)||1;
          out.push({n:'T',x:-t2*ax/LA,y:-t2*ay/LA,c:'#0891b2'});}
        else{var bx=p.bx-lk.px,by=p.by-lk.py,LB=Math.sqrt(bx*bx+by*by)||1;
          out.push({n:'T',x:-t2*bx/LB,y:-t2*by/LB,c:'#0891b2'});}
      }
    }
  }
  return out;
}
function sbDrawForces(g,b){
  var L=sbForceList(b);
  if(!L.length)return;
  var X=sbX(b.x),Y=sbY(b.y);
  // 以"重力箭头固定 30px"为比例尺，其余力按同一比例
  var sc=30/Math.max(b.m*Math.max(SB.g,0.001),1e-6);
  var sx=0,sy=0,i;
  for(i=0;i<L.length;i++){
    var f=L[i],fx=f.x*sc,fy=f.y*sc;
    sx+=fx;sy+=fy;
    var m=Math.sqrt(fx*fx+fy*fy);
    if(m>4){
      arrow(g,X,Y,X+fx,Y-fy,f.c,1.6);
      label(g,X+fx*1.06,Y-fy*1.06,f.n+' '+fmt(Math.sqrt(f.x*f.x+f.y*f.y),1)+'N',f.c,'center');
    }
  }
  var mm=Math.sqrt(sx*sx+sy*sy);
  if(mm>4&&L.length>1)arrow(g,X,Y,X+sx,Y-sy,'#0f172a',2.6);
}
/* 材质外观：渐变底色 + 程序化纹理（全部用 Canvas 2D 画，无贴图文件） */
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
  if(typeof sbSheen==='function')sbSheen(g,b,X,Y,M,R);
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
/* 空间模式的星空背景（带视差：拖动时星星会慢慢走） */
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
  var X=sbX(b.x),Y=sbY(b.y);
  var M=matDef(b.mat);
  if(typeof sbDropShadow==='function')sbDropShadow(g,b,X,Y);
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
  /* 着火：整体烤成橙色，还会一闪一闪 */
  if(b.fire>0){
    var fa=clamp(b.fire,0,1);
    g.fillStyle='rgba(249,115,22,'+(0.20+0.32*fa*(0.6+0.4*Math.sin(Date.now()*0.012)))+')';
    g.beginPath();g.arc(X,Y,sbRad(b)*SB.view.s*1.05,0,Math.PI*2);g.fill();
  }
  /* 炸药：外圈呼吸灯 + 引信读数 */
  if(b.boom&&!b.boom.done){
    var pl=0.5+0.5*Math.sin(Date.now()*0.006);
    g.strokeStyle='rgba(239,68,68,'+(0.32+0.5*pl)+')';g.lineWidth=2;
    g.beginPath();g.arc(X,Y,sbRad(b)*SB.view.s+5+3*pl,0,Math.PI*2);g.stroke();
    if(b.fuse>=0)label(g,X,Y-sbRad(b)*SB.view.s-8,fmt(Math.max(b.fuse,0),1)+'s','#dc2626','center');
  }
  /* 核弹：黄色脉冲 + 三颗转圈的辐射点 */
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
  g.fillStyle='#0f172a';
  g.beginPath();g.arc(X,Y,2,0,Math.PI*2);g.fill();
  /* 编号 */
  if(SB.showId)label(g,X,Y-9,'#'+b.id,'#374151','center');
  /* 速度矢量 */
  if(SB.showVec&&!b.stat){
    var sp=Math.sqrt(b.vx*b.vx+b.vy*b.vy);
    if(sp>0.05){
      var vl=Math.min(sp*SB.view.s*0.16,70);
      arrow(g,X,Y,X+b.vx/sp*vl,Y-b.vy/sp*vl,'#0891b2',2);
    }
    if(Math.abs(b.w)>0.05){
      label(g,X+8,Y+13,'ω='+fmt(b.w,1),'#0891b2','left');
    }
  }
  /* 选中高亮 */
  if(SB.sel===b){
    g.strokeStyle='#f59e0b';g.lineWidth=2;g.setLineDash([5,4]);
    var rr=sbRad(b)*SB.view.s+7;
    g.beginPath();g.arc(X,Y,rr,0,Math.PI*2);g.stroke();g.setLineDash([]);
  }
}
function sbReadout(){
  var rows=[['时间 t',fmt(SB.t)+' s'],
    ['物体数 / 接触',SB.bodies.length+' / '+SB.nc],
    ['环境',(SB.env==='space'?'空间（失重）':'地面')+' · g='+fmt(SB.g,1)],
    ['液体 / 着火',SB.pcount+' 颗 / '+(function(){
       var n=0;for(var i=0;i<SB.bodies.length;i++)if(SB.bodies[i].fire>0)n++;return n;})()+' 个'],
    ['系统动量 px',fmt(SB.px)+' kg·m/s'],
    ['系统动量 py',fmt(SB.py)+' kg·m/s'],
    ['总动能 Ek',fmt(SB.Ek)+' J'],
    ['总势能 Ep',fmt(SB.Ep)+' J'],
    ['机械能 E',fmt(SB.Ek+SB.Ep)+' J']];
  if(SB.links.length)rows.push(['约束',SB.links.length+' 个']);
  if(Math.abs(SB.Ex)>1e-6||Math.abs(SB.Ey)>1e-6)
    rows.push(['电场 E',fmt(SB.Ex,1)+' , '+fmt(SB.Ey,1)+' N/C']);
  if(Math.abs(SB.Bz)>1e-9)
    rows.push(['磁场 B',fmt(SB.Bz,2)+' T '+(SB.Bz>0?'⊗ 向里':'⊙ 向外')]);
  if(SB.sel){
    var b=SB.sel;
    rows.push(['—— 选中 #'+b.id+' ——','']);
    rows.push(['形状',b.shape==='circle'?'圆':(b.shape==='tri'?'三角':'矩形')]);
    rows.push(['质量',fmt(b.m,2)+' kg']);
    rows.push(['位置',fmt(b.x,2)+' , '+fmt(b.y,2)+' m']);
    rows.push(['速度',fmt(b.vx,2)+' , '+fmt(b.vy,2)+' m/s']);
    rows.push(['角速度 ω',fmt(b.w,2)+' rad/s']);
    rows.push(['角度',fmt(b.angle*180/Math.PI,1)+'°']);
    rows.push(['动能',fmt(0.5*b.m*(b.vx*b.vx+b.vy*b.vy)+0.5*b.I*b.w*b.w,2)+' J']);
    rows.push(['材质',matDef(b.mat).n+(b.frag?'（碎块）':'')]);
    rows.push(['强度 hp',fmt(b.hp,1)+' / '+fmt(b.hpmax,1)+'（撞到 '+fmt(Math.sqrt(2*b.hp),1)+' m/s 会碎）']);
    rows.push(['坚硬程度',hardDef(b.hard||'normal').n+(b.invul?'（打不碎）':'')+
      ' · hp '+fmt(b.hp,1)+'/'+fmt(b.hpmax,1)]);
    if(b.fire>0)rows.push(['着火','强度 '+fmt(b.fire,2)+'（正在掉血）']);
    if(b.boom)rows.push(['炸药',fmt(b.boom.kg,2)+' kg TNT · 半径 '+fmt(b.boom.R,2)+' m'+
      (b.fuse>=0?(' · 引信 '+fmt(Math.max(b.fuse,0),2)+' s'):' · 撞击起爆')]);
    if(b.nuke)rows.push(['核武器',fmt(b.nuke.kt,2)+' 千吨 TNT · 火球 '+fmt(sbNukeR(b.nuke.kt),1)+' m']);
    if(Math.abs(b.q)>1e-9){
      rows.push(['电荷 q',fmt(b.q,2)+' C']);
      var fx=b.q*SB.Ex+b.q*SB.Bz*b.vy, fy=b.q*SB.Ey-b.q*SB.Bz*b.vx;
      rows.push(['场力 F',fmt(fx,2)+' , '+fmt(fy,2)+' N']);
    }
  }
  if(SB.selLink){
    var lk=SB.selLink;
    rows.push(['—— 约束 ——','']);
    rows.push(['类型',sbLinkName(lk.kind)]);
    rows.push(['两端','#'+lk.A.id+' → '+(lk.B?'#'+lk.B.id:'固定支架')]);
    rows.push(['自然长度 L₀',fmt(lk.L0,3)+' m']);
    rows.push(['当前长度',fmt(sbLinkLen(lk),3)+' m']);
    if(lk.kind==='spring')rows.push(['劲度 k / 阻尼 c',fmt(lk.k,1)+' N/m / '+fmt(lk.c,2)]);
    if(lk.F)rows.push([lk.kind==='spring'?'弹力 F':'张力 T',fmt(lk.F,2)+' N']);
  }
  var h='';
  for(var i=0;i<rows.length;i++)h+='<tr><td class="k">'+rows[i][0]+'</td><td>'+rows[i][1]+'</td></tr>';
  $('#readout').innerHTML=h;
}

/* ---------- 增删物体 ---------- */
function sbAdd(o){
  if(SB.bodies.length>=SBMAX){sbToast('物体数量已达上限 '+SBMAX+' 个');return null;}
  sbPushUndo();
  var b=sbMake(o);
  SB.bodies.push(b);
  SB.sel=b;
  sbSelPanel();
  sbAutoSave();
  return b;
}
/* 这块地方能不能放东西：粗筛半径 + 采样点判定（矩形用四角+中心） */
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
function sbFreeSpot(o,ax,ay){
  var bw=o.bw||0,bh=o.bh||0,r=o.r||0,shape=o.shape||'box';
  var x=(ax===undefined?NaN:ax),y=(ay===undefined?NaN:ay),k,rad,ang,tx,ty;
  if(!isFinite(x)||!isFinite(y)){x=SB.mouse.wx;y=SB.mouse.wy;}
  if(!isFinite(x)||!isFinite(y)){x=SB.view.cx;y=SB.view.cy;}
  var lo=(shape==='circle'?r:bh/2)+0.03;
  for(k=0;k<33;k++){
    if(k===0){tx=x;ty=y;}
    else{
      rad=0.4+0.45*Math.floor((k-1)/8);ang=(k-1)%8/8*Math.PI*2;
      tx=x+Math.cos(ang)*rad;ty=y+Math.sin(ang)*rad;
    }
    if(SB.env!=='space'&&ty<lo)ty=lo;         // 别把物体埋进地面里
    tx=clamp(tx,-30,52);
    ty=clamp(ty,(SB.env==='space'?-26:-2),(SB.env==='space'?41:40));
    if(!sbBlocked(tx,ty,bw,bh,r,shape))return [tx,ty];
  }
  /* 螺旋找不着：就在整个世界扫一遍，挑离鼠标最近的那个空位 */
  var bestX=null,bestY=null,bd=1e18,gx2,gy2,dd2;
  for(gy2=(SB.env==='space'?-26:lo);gy2<=(SB.env==='space'?38:34);gy2+=0.55){
    for(gx2=-24;gx2<=48;gx2+=0.55){
      if(sbBlocked(gx2,gy2,bw,bh,r,shape))continue;
      dd2=(gx2-x)*(gx2-x)+(gy2-y)*(gy2-y);
      if(dd2<bd){bd=dd2;bestX=gx2;bestY=gy2;}
    }
  }
  if(bestX!==null)return [bestX,bestY];
  return [clamp(x,-30,52),clamp(Math.max(y,lo+0.8),-2,40)];
}
function sbAddAt(kind,ax,ay){
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
  var sp=sbFreeSpot(o,ax,ay);
  o.x=sp[0];o.y=sp[1];
  return sbAdd(o);
}
/* ================= 约束的创建 / 拾取 / 删除 ================= */
function sbLinkName(k){return k==='spring'?'弹簧':(k==='rope'?'绳索':'滑轮');}
function sbLinkStart(kind){
  SB.pick={kind:kind,a:null};SB.selLink=null;
  sbToast('【'+sbLinkName(kind)+'】先点第一个物体上的挂点');
  sbPanel();sbSelPanel();sbMobBar();
}
function sbLinkCancel(){SB.pick=null;sbPanel();sbSelPanel();sbMobBar();}
function sbHitLink(sx,sy){
  for(var i=SB.links.length-1;i>=0;i--){
    var p=sbLinkPts(SB.links[i]);
    var x1=sbX(p.ax),y1=sbY(p.ay),x2=sbX(p.bx),y2=sbY(p.by);
    var dx=x2-x1,dy=y2-y1,LL=dx*dx+dy*dy;
    var t=LL>0?clamp(((sx-x1)*dx+(sy-y1)*dy)/LL,0,1):0;
    var qx=x1+dx*t-sx,qy=y1+dy*t-sy;
    if(qx*qx+qy*qy<64)return SB.links[i];
  }
  return null;
}
/* 连接模式下的一次点击，返回 true 表示事件已被消费 */
function sbPickStep(wx,wy){
  if(!SB.pick)return false;
  var b=sbHit(wx,wy);
  if(!SB.pick.a){
    if(!b){sbToast('请点在物体上（挂点位置就是点击处）');return true;}
    var c=Math.cos(b.angle),s=Math.sin(b.angle);
    var lx=wx-b.x,ly=wy-b.y;
    SB.pick.a={b:b,ra:[lx*c+ly*s,-lx*s+ly*c]};
    sbToast('已定 #'+b.id+' 上的挂点，再点另一个物体'+(SB.pick.kind==='pulley'?'':'（点空白处＝连到固定支架）'));
    return true;
  }
  var A=SB.pick.a.b;
  if(b===A){sbToast('不能连到同一个物体，请点另一个');return true;}
  if(SB.pick.kind==='pulley'&&!b){sbToast('滑轮要连接两个物体，请点在另一个物体上');return true;}
  if(SB.pick.kind!=='pulley'&&b&&b.stat&&A.stat){sbToast('两端都是固定物体，没必要连');return true;}
  sbPushUndo();
  var lk={id:SB.linkId++,kind:SB.pick.kind,A:A,B:null,
          ra:[SB.pick.a.ra[0],SB.pick.a.ra[1]],rb:[0,0],
          wx:0,wy:0,px:0,py:0,pr:LINKDEF.pulley.pr,acc:0,F:0,L0:1,k:LINKDEF.spring.k,c:LINKDEF.spring.c};
  if(b){
    var c2=Math.cos(b.angle),s2=Math.sin(b.angle);
    var bx=wx-b.x,by=wy-b.y;
    lk.B=b;lk.rb=[bx*c2+by*s2,-bx*s2+by*c2];
  }else{
    lk.wx=wx;lk.wy=wy;
  }
  var p=sbLinkPts(lk);
  if(lk.kind==='pulley'){
    lk.px=(p.ax+p.bx)/2;
    lk.py=Math.max(p.ay,p.by)+1.6;
    lk.L0=Math.sqrt((p.ax-lk.px)*(p.ax-lk.px)+(p.ay-lk.py)*(p.ay-lk.py))
         +Math.sqrt((p.bx-lk.px)*(p.bx-lk.px)+(p.by-lk.py)*(p.by-lk.py));
  }else{
    lk.L0=Math.max(Math.sqrt((p.bx-p.ax)*(p.bx-p.ax)+(p.by-p.ay)*(p.by-p.ay)),0.05);
  }
  SB.links.push(lk);
  SB.selLink=lk;SB.pick=null;SB.sel=A;
  sbToast('已连接'+sbLinkName(lk.kind)+'：自然长度 '+fmt(lk.L0,2)+' m');
  sbSelPanel();sbMobBar();sbAutoSave();
  return true;
}
function sbDelLink(lk){
  if(!lk)return;
  sbPushUndo();
  var i=SB.links.indexOf(lk);
  if(i>=0)SB.links.splice(i,1);
  if(SB.selLink===lk)SB.selLink=null;
  sbSelPanel();sbAutoSave();
}
function sbDel(b){
  if(!b)return;
  sbPushUndo();
  var i=SB.bodies.indexOf(b);
  if(i>=0)SB.bodies.splice(i,1);
  var nj=[];
  for(var k=0;k<SB.joints.length;k++){
    if(SB.joints[k].A!==b&&SB.joints[k].B!==b)nj.push(SB.joints[k]);
  }
  SB.joints=nj;
  var nl=[];
  for(k=0;k<SB.links.length;k++){
    if(SB.links[k].A!==b&&SB.links[k].B!==b)nl.push(SB.links[k]);
  }
  SB.links=nl;
  if(SB.sel===b){SB.sel=null;sbSelPanel();}
  if(SB.grab&&SB.grab.b===b)SB.grab=null;
  sbAutoSave();
}
function sbClear(){
  sbPushUndo();
  var keep=[],i;
  for(i=0;i<SB.bodies.length;i++){if(SB.bodies[i].stat)keep.push(SB.bodies[i]);}
  SB.bodies=keep;
  var nj=[];
  for(i=0;i<SB.joints.length;i++){
    var j=SB.joints[i];
    if(keep.indexOf(j.A)>=0&&(!j.B||keep.indexOf(j.B)>=0))nj.push(j);
  }
  SB.joints=nj;
  var nl=[];
  for(i=0;i<SB.links.length;i++){
    var lk=SB.links[i];
    if(keep.indexOf(lk.A)>=0&&(!lk.B||keep.indexOf(lk.B)>=0))nl.push(lk);
  }
  SB.links=nl;
  SB.hist=[];SB.sel=null;SB.grab=null;SB.rot=null;SB.selLink=null;
  SB.fx=[];SB.brk=[];SB.shake=0;SB.flash=0;SB.parts=[];SB.pgrid=null;
  sbSelPanel();sbAutoSave();
}

/* ---------- 预设场景 ---------- */
function sbWorld(opt){
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
}
/* 建约束的快捷写法：L0 不传时自动取当前长度 */
function sbLink(kind,A,ra,B,rb,o){
  o=o||{};
  var lk={id:SB.linkId++,kind:kind,A:A,B:B,ra:ra||[0,0],rb:rb||[0,0],
          wx:o.wx||0,wy:o.wy||0,px:o.px||0,py:o.py||0,pr:o.pr||LINKDEF.pulley.pr,
          L0:o.L0,k:o.k||LINKDEF.spring.k,c:(o.c===undefined?LINKDEF.spring.c:o.c),
          op:o.op||0,acc:0,F:0};
  var p=sbLinkPts(lk);
  if(lk.L0===undefined||lk.L0===null){
    if(kind==='pulley')
      lk.L0=Math.sqrt((p.ax-lk.px)*(p.ax-lk.px)+(p.ay-lk.py)*(p.ay-lk.py))
           +Math.sqrt((p.bx-lk.px)*(p.bx-lk.px)+(p.by-lk.py)*(p.by-lk.py));
    else lk.L0=Math.max(Math.sqrt((p.bx-p.ax)*(p.bx-p.ax)+(p.by-p.ay)*(p.by-p.ay)),0.05);
  }
  SB.links.push(lk);
  return lk;
}
var SBPresets=[
  {name:'斜面',build:function(){
    SB.g=10;sbWorld();
    var a=25*Math.PI/180;
    SB.bodies.push(sbMake({shape:'box',stat:true,bw:9,bh:0.4,x:6,y:2.2,angle:a,mu:0.25,color:'#94a3b8'}));
    SB.bodies.push(sbMake({shape:'box',bw:0.8,bh:0.8,x:3.2,y:3.4,m:2,mu:0.25}));
    SB.bodies.push(sbMake({shape:'circle',r:0.4,x:3.4,y:5.0,m:1,mu:0.25}));
  }},
  {name:'堆叠塔',build:function(){
    SB.g=10;sbWorld();
    for(var i=0;i<6;i++)SB.bodies.push(sbMake({shape:'box',bw:0.9,bh:0.9,x:9+(i%2?0.06:-0.06),y:0.5+0.92*i,m:1,mu:0.5,e:0.02}));
    SB.bodies.push(sbMake({shape:'circle',r:0.45,x:9,y:6.4,m:2,mu:0.4}));
  }},
  {name:'单摆',build:function(){
    SB.g=10;sbWorld();
    SB.bodies.push(sbMake({shape:'circle',r:0.18,x:10,y:7,stat:true,color:'#94a3b8'}));
    var a=0.8;
    var rod=sbMake({shape:'box',bw:3,bh:0.16,x:10+1.5*Math.sin(a),y:7-1.5*Math.cos(a),m:1,mu:0.3,e:0.05});
    SB.bodies.push(rod);
    SB.joints.push({A:rod,ra:[0,1.5],wx:10,wy:7,B:null});
    var ball=sbMake({shape:'circle',r:0.42,m:2,mu:0.3,e:0.1,
      x:rod.x+Math.sin(a)*2.05,y:rod.y-Math.cos(a)*2.05});
    SB.bodies.push(ball);
    SB.joints.push({A:ball,ra:[0,0],B:rod,rb:[0,-2.05]});
  }},
  {name:'杠杆天平',build:function(){
    SB.g=10;sbWorld();
    SB.bodies.push(sbMake({shape:'tri',stat:true,bw:1.2,bh:1.2,x:10,y:0.6,color:'#94a3b8'}));
    var beam=sbMake({shape:'box',bw:9,bh:0.22,x:10,y:2.0,m:1,mu:0.6,e:0.05});
    SB.bodies.push(beam);
    SB.joints.push({A:beam,ra:[0,0],wx:10,wy:2.0,B:null});
    SB.bodies.push(sbMake({shape:'box',bw:0.9,bh:0.9,x:6.6,y:2.7,m:4,mu:0.6,e:0.02}));
    SB.bodies.push(sbMake({shape:'box',bw:0.9,bh:0.9,x:13.4,y:2.7,m:1,mu:0.6,e:0.02}));
  }},
  {name:'对撞（失重）',build:function(){
    SB.g=0;sbWorld({walls:false});
    SB.bodies.push(sbMake({shape:'circle',r:0.6,x:5,y:3,m:2,vx:4,e:0.95,mu:0}));
    SB.bodies.push(sbMake({shape:'circle',r:0.6,x:14,y:3,m:2,vx:-4,e:0.95,mu:0}));
    SB.bodies.push(sbMake({shape:'circle',r:0.5,x:9.5,y:6,m:1,e:0.6}));
  }},
  {name:'多米诺',build:function(){
    SB.g=10;sbWorld();
    for(var i=0;i<12;i++){
      SB.bodies.push(sbMake({shape:'box',bw:0.18,bh:1.3,x:3+i*0.8,y:0.65,m:0.4,mu:0.4,e:0.05,
        angle:i===0?0.3:0}));
    }
  }},
  {name:'板块模型',build:function(){
    SB.g=10;sbWorld({gmu:0.02});
    SB.bodies.push(sbMake({shape:'box',bw:7,bh:0.3,x:10,y:0.15,m:2,mu:0.02,e:0.05}));
    SB.bodies.push(sbMake({shape:'box',bw:0.8,bh:0.8,x:7,y:0.7,m:1,vx:5,mu:0.25,e:0.02}));
  }},
  {name:'抛体',build:function(){
    SB.g=10;sbWorld({walls:false});
    SB.bodies.push(sbMake({shape:'circle',r:0.4,x:1.5,y:0.6,m:1,vx:9,vy:12,e:0.4,mu:0.3}));
    SB.bodies.push(sbMake({shape:'box',bw:0.7,bh:0.7,x:4,y:0.5,m:1,vx:5,vy:10,e:0.3}));
  }},

  /* ===== 第 1 批内核扩展：弹簧 / 绳索滑轮 / 力场 ===== */
  {name:'弹簧振子',build:function(){
    SB.g=10;SB.air=0;sbWorld({walls:false});
    SB.bodies.push(sbMake({shape:'box',stat:true,nofit:true,bw:4,bh:0.4,x:10,y:6.2,color:'#94a3b8'}));
    var b=sbMake({shape:'box',bw:0.9,bh:0.9,x:10,y:3.2,m:1,mu:0,e:0.1});
    SB.bodies.push(b);
    sbLink('spring',b,[0,0.45],null,null,{wx:10,wy:6.0,L0:1.8,k:40,c:0});
  }},
  {name:'撞弹簧',build:function(){
    SB.g=10;SB.air=0;sbWorld({gmu:0.02});
    var wall=sbMake({shape:'box',stat:true,nofit:true,bw:0.5,bh:2.5,x:16,y:1.25,color:'#94a3b8'});
    SB.bodies.push(wall);
    var b=sbMake({shape:'box',bw:0.9,bh:0.9,x:4,y:0.45,m:2,vx:8,mu:0.02,e:0.05});
    SB.bodies.push(b);
    var lk=sbLink('spring',b,[0.45,0],wall,[-0.25,0],{k:150,c:0});
    lk.op=1;    // 只推不拉：真实弹簧被压缩才起作用，离开后自动脱开
  }},
  {name:'阿特伍德机',build:function(){
    SB.g=10;SB.air=0;sbWorld({walls:false});
    // 两物块分别悬在滑轮两侧的切线正下方（x=10±pr），绳段才是竖直的，
    // 加速度才严格等于 (m1-m2)g/(m1+m2)
    var pr=0.5,py=9.6;
    var A=sbMake({shape:'box',bw:0.7,bh:0.7,x:10-pr,y:4.6,m:2,mu:0,e:0.05});
    var B=sbMake({shape:'box',bw:0.7,bh:0.7,x:10+pr,y:4.6,m:1,mu:0,e:0.05});
    SB.bodies.push(A);SB.bodies.push(B);
    sbLink('pulley',A,[0,0.35],B,[0,0.35],{px:10,py:py,pr:pr});
    sbSetAxis(A,0,1);sbSetAxis(B,0,1);   // 两物体只能竖直运动，才是真正的阿特伍德机
  }},
  {name:'斜面连接体',build:function(){
    SB.g=10;SB.air=0;sbWorld({walls:false});
    var a=30*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a);
    var tx=7,ty=4.6;                       // 斜面顶端
    var nx=-sa,ny=ca,off=0.61;             // 斜面外法向（务必用 (-sa,ca)），物块中心离斜面中心线 0.61
    SB.bodies.push(sbMake({shape:'box',stat:true,bw:7,bh:0.4,
      x:tx-3.5*ca,y:ty-3.5*sa,angle:a,mu:0,color:'#94a3b8'}));
    // 滑轮放在"斜面延长线沿法向抬起 off"的位置：m1 到滑轮的绳段与斜面严格平行
    var px=tx+1.6*ca+off*nx, py=ty+1.6*sa+off*ny;
    var m1=sbMake({shape:'box',bw:0.8,bh:0.8,angle:a,
      x:tx-0.8*ca+off*nx,y:ty-0.8*sa+off*ny,m:2,mu:0,e:0.05});
    var m2=sbMake({shape:'box',bw:0.8,bh:0.8,x:px,y:py-2.4,m:0.5,mu:0,e:0.05});
    SB.bodies.push(m1);SB.bodies.push(m2);
    sbLink('pulley',m1,[0,0],m2,[0,0.4],{px:px,py:py,pr:0.45});
    sbSetAxis(m1,ca,sa);   // m1 只能沿斜面滑动
    sbSetAxis(m2,0,1);     // m2 只能竖直升降（悬在滑轮正下方，绳段竖直）
  }},
  {name:'电场偏转',build:function(){
    SB.g=0;SB.Ex=0;SB.Ey=-8;sbWorld({walls:false});
    SB.bodies.push(sbMake({shape:'circle',r:0.22,x:2,y:6,m:0.4,q:1,vx:7,vy:0,mu:0,e:0.2,color:'#7c3aed'}));
    SB.bodies.push(sbMake({shape:'circle',r:0.22,x:2,y:3,m:0.8,q:1,vx:7,vy:0,mu:0,e:0.2,color:'#2563eb'}));
  }},
  {name:'磁场圆周',build:function(){
    SB.g=0;SB.Bz=2;sbWorld({walls:false});
    SB.bodies.push(sbMake({shape:'circle',r:0.25,x:6,y:5.5,m:1,q:1,vx:5,vy:0,mu:0,e:0.2,color:'#7c3aed'}));
    SB.bodies.push(sbMake({shape:'circle',r:0.25,x:6,y:5.5,m:2,q:1,vx:5,vy:0,mu:0,e:0.2,color:'#2563eb'}));
  }},
  {name:'材质对比',build:function(){
    SB.g=10;sbWorld();
    var ms=[['glass',5],['ice',8],['wood',11],['steel',14]];
    for(var i=0;i<ms.length;i++){
      SB.bodies.push(sbMake({shape:'box',bw:1.1,bh:1.1,x:ms[i][1],y:3.4,mat:ms[i][0],mu:0.4,e:0.1}));
    }
  }},
  {name:'爆破实验',build:function(){
    SB.g=10;sbWorld();
    for(var i=0;i<5;i++)for(var j=0;j<4;j++){
      SB.bodies.push(sbMake({shape:'box',bw:0.66,bh:0.66,x:7.4+i*0.74,y:0.38+j*0.72,
        mat:(j>1?'wood':'glass'),mu:0.5,e:0.05}));
    }
    // 炸药单独摆在楼右侧，不会一进场就被压爆；点「全部引爆」或拿重物砸它才炸
    SB.bodies.push(sbMake({shape:'box',bw:0.6,bh:0.6,x:12.4,y:0.36,mat:'tnt',
      boom:{kg:4,R:sbBoomR(4)},fuse:-1}));
  }},
  {name:'火灾实验',build:function(){
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
  {name:'速度选择器',build:function(){
    SB.g=0;SB.Ex=0;SB.Ey=10;SB.Bz=2;sbWorld({walls:false});
    var vs=[['#16a34a',3,3.2],['#dc2626',5,4.6],['#2563eb',8,6.0]];
    for(var i=0;i<vs.length;i++){
      SB.bodies.push(sbMake({shape:'circle',r:0.2,x:1.6,y:vs[i][2],m:0.5,q:1,
        vx:vs[i][1],vy:0,mu:0,e:0.2,color:vs[i][0]}));
    }
  }}
];
function sbPreset(name){
  sbPushUndo();
  SB.bodies=[];SB.joints=[];SB.links=[];SB.hist=[];SB.t=0;SB.warm={};SB.undo=SB.undo||[];
  SB.sel=null;SB.grab=null;SB.pan=null;SB.rot=null;SB.selLink=null;SB.pick=null;
  SB.Ex=0;SB.Ey=0;SB.Bz=0;
  SB.fx=[];SB.brk=[];SB.shake=0;SB.flash=0;SB.parts=[];SB.pgrid=null;
  SB.preset=name;SB.needFit=true;
  for(var i=0;i<SBPresets.length;i++){
    if(SBPresets[i].name===name){SBPresets[i].build();break;}
  }
  if(SB.env==='space')SB.g=0;      // 空间模式里所有预设都按失重玩
  sbSelPanel();sbAutoSave();
}

/* ---------- 面板 ---------- */
function sbDownload(rows,fn){
  var csv=rows.map(function(r){return r.join(',');}).join('\n');
  var blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=fn;a.click();
}
function sbTools(list){
  var d=document.createElement('div');d.className='tools';
  list.forEach(function(it){
    var b=document.createElement('button');
    b.className='btn'+(it[2]?' '+it[2]:'');
    b.textContent=it[0];
    b.onclick=it[1];
    d.appendChild(b);
  });
  return d;
}
function sbSlider(par,label,minV,maxV,step,get,set){
  var row=document.createElement('div');row.className='prow';
  var lab=document.createElement('label');lab.textContent=label;
  var rg=document.createElement('input');rg.type='range';
  rg.min=minV;rg.max=maxV;rg.step=step;rg.value=get();
  var nb=document.createElement('input');nb.type='number';nb.step=step;nb.value=get();
  rg.addEventListener('input',function(){var v=parseFloat(rg.value);nb.value=v;set(v);});
  nb.addEventListener('input',function(){var v=parseFloat(nb.value);if(isNaN(v))return;rg.value=v;set(v);});
  row.appendChild(lab);row.appendChild(rg);row.appendChild(nb);
  par.appendChild(row);
  return row;
}
function sbPanel(){
  $('#pname').textContent='自由沙盒';
  $('#brief').innerHTML='<div class="hintbox">'+
    '<b>左键拖物体</b>：抓起并移动，松手按当前速度抛出<br>'+
    '<b>Shift + 拖动</b>：绕质心旋转（翻滚）<br>'+
    '<b>滚轮</b>：缩放；<b>Shift+滚轮</b>：旋转选中物体<br>'+
    '<b>空白/右键拖动</b>：平移画布；<b>双击空白</b>：在点击处放一个「双击放置」的东西（方块/炸药/原子弹/液体都能放）<br>'+
    '<b>Delete</b>：删除选中；<b>空格</b>：暂停/继续；<b>Ctrl+Z</b>：撤销<br>'+
    '<b>手机/平板</b>：单指拖＝抓取或平移，<b>双指捏合</b>＝缩放，<b>双指转动</b>＝让选中物体翻滚，<b>连点两下空白</b>＝在手指点的位置放当前选的东西<br>'+
    '<b>爆破玩法</b>：左下工具「＋炸药」放一个，点「引爆」；也可以把引信设成几秒，看它倒计时炸开<br>'+
    '<b>液体与点火</b>：先倒一滩水/汽油/油/岩浆（会流动），点「火花点火」后在汽油池或木堆上点一下就着<br>'+
    '<b>环境与硬度</b>：环境里可切「地面 / 空间（失重）」；坚硬程度决定新放的物体多容易被撞碎</div>';
  var box=$('#params');box.innerHTML='';
  box.appendChild(sbTools([
    ['＋方块',function(){sbAddAt('box');}],
    ['＋圆球',function(){sbAddAt('circle');}],
    ['＋三角',function(){sbAddAt('tri');}],
    ['＋细杆',function(){sbAddAt('rod');}],
    ['＋斜面',function(){sbAddAt('ramp');}],
    ['＋挡板',function(){sbAddAt('wall');}],
    ['＋炸药',function(){sbAddAt('bomb');}],
    ['＋原子弹',function(){sbAddAt('nuke');}],
    ['复制选中',function(){
      if(!SB.sel)return;
      var b=SB.sel;
      sbAdd({shape:b.shape,x:b.x+1,y:b.y+0.5,angle:b.angle,m:b.m,bw:b.bw,bh:b.bh,r:b.r,e:b.e,mu:b.mu,
             mat:b.mat,stat:false});
    }]
  ]));
  /* ---- 双击放置 ---- */
  var sD=document.createElement('div');sD.className='sec';
  sD.textContent='双击画布放什么（在手指点的位置生成）';
  box.appendChild(sD);
  box.appendChild(sbTools(DBLS.filter(function(D){return !D.liq;}).map(function(D){
    return [D.n,function(){SB.dbl=D.k;sbPanel();sbMobBar();},(SB.dbl||'box')===D.k?'on':''];
  })));
  box.appendChild(sbTools(DBLS.filter(function(D){return !!D.liq;}).map(function(D){
    return ['倒'+D.n,function(){SB.dbl=D.k;sbPanel();sbMobBar();},(SB.dbl||'box')===D.k?'on':''];
  })));
  var nD=document.createElement('div');nD.className='note';
  nD.innerHTML='选好之后，<b>在画布空白处双击</b>（手机上就是连点两下），东西就生成在<b>你点的那个位置</b>。<br>'+
    '<b>原子弹</b>和<b>水 / 汽油 / 油 / 岩浆</b>都能这么放：选「原子弹」双击＝指尖落一颗核弹；'+
    '选「倒汽油」双击＝指尖倒一滩汽油（再用「火花点火」点着）。<br>'+
    '倒多宽用下面的「倒液体的宽度」滑块调；<b>空间模式</b>里双击一样好使，液体会团成球漂着。';
  box.appendChild(nD);
  sbSlider(box,'重力 g (m/s²)',0,20,0.5,function(){return SB.g;},function(v){SB.g=v;});
  sbSlider(box,'重力偏角 (° · 0=正下方)',-180,180,5,function(){return Math.round(sbGDef());},
    function(v){sbGSet(v);});
  sbSlider(box,'空气阻力',0,2,0.05,function(){return SB.air;},function(v){SB.air=v;});
  sbSlider(box,'新物体弹性 e',0,1,0.05,function(){return SB.defE;},function(v){SB.defE=v;});
  sbSlider(box,'新物体摩擦 μ',0,1.2,0.05,function(){return SB.defMu;},function(v){SB.defMu=v;});
  box.appendChild(sbTools([
    ['重力↓复位',function(){sbGSet(0);SB.tiltG=0;sbUnTilt();sbPanel();}],
    [SB.tiltG?'倾斜跟随 开':'倾斜跟随 关',function(){sbTiltToggle();},SB.tiltG?'on':''],
    ['倾斜反向',function(){SB.tiltFlip=-SB.tiltFlip;sbTiltBase=null;sbPanel();}]
  ]));

  /* ---- 环境：地面 / 空间 ---- */
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

  /* ---- 材质 · 破碎 · 爆破 ---- */
  var sM=document.createElement('div');sM.className='sec';sM.textContent='材质 · 破碎 · 爆破';
  box.appendChild(sM);
  box.appendChild(sbTools(SOLIDS().map(function(M){
    return [M.n,function(){SB.defMat=M.k;sbPanel();},SB.defMat===M.k?'on':''];
  })));
  box.appendChild(sbTools([
    ['＋炸药',function(){sbAddBomb();}],
    ['全部引爆',function(){sbDetonateAll();}],
    ['全场换材质',function(){sbAllMat(SB.defMat);}]
  ]));
  sbSlider(box,'炸药当量 (kg TNT)',0.2,200,0.2,function(){return SB.boomKg;},
    function(v){SB.boomKg=clamp(v,0.05,2000);});
  sbSlider(box,'引信 (s，0=撞到就炸)',0,10,0.5,function(){return SB.boomFuse;},
    function(v){SB.boomFuse=v;});
  sbSlider(box,'核弹当量 (千吨 TNT)',0.5,2000,0.5,function(){return SB.nukeKt;},
    function(v){SB.nukeKt=clamp(v,0.1,50000);});
  sbSlider(box,'特效强度 (%)',20,400,10,function(){return Math.round((SB.fxP||1)*100);},
    function(v){SB.fxP=clamp(v/100,0.2,4);});
  box.appendChild(sbTools([
    ['＋原子弹',function(){sbAddNuke();}],
    ['全部引爆',function(){sbDetonateAll();}],
    ['液体上限 '+SB.pmax,function(){
      SB.pmax=(SB.pmax>=480)?120:(SB.pmax>=240?480:240);sbPanel();}]
  ]));
  var nMat=document.createElement('div');nMat.className='note';
  nMat.innerHTML='选好材质再放物体：<b>质量按密度自动算</b>，弹性摩擦也跟着变。<br>'+
    '会不会碎看<b>撞击速度</b>（强度 hp 就是 ½v² 的阈值）：玻璃约 2.8 m/s 就碎，'+
    '木约 9.5 m/s，钢要 100 m/s——所以<b>钢怎么砸都不烂</b>。<br>'+
    '炸药撞到就炸，也可以设引信延时；几个炸药放一起会<b>殉爆</b>。';
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
  box.appendChild(nQ);
  /* ---- 连接：弹簧 / 绳索 / 滑轮 ---- */
  var sL=document.createElement('div');sL.className='sec';sL.textContent='连接（依次点两个物体）';
  box.appendChild(sL);
  box.appendChild(sbTools([
    ['〰 弹簧',function(){sbLinkStart('spring');},SB.pick&&SB.pick.kind==='spring'?'on':''],
    ['⟋ 绳索',function(){sbLinkStart('rope');},SB.pick&&SB.pick.kind==='rope'?'on':''],
    ['◎ 滑轮',function(){sbLinkStart('pulley');},SB.pick&&SB.pick.kind==='pulley'?'on':''],
    ['取消连接',function(){sbLinkCancel();}]
  ]));
  var nt=document.createElement('div');nt.className='note';
  nt.innerHTML='弹簧：可拉伸压缩，F=−k(L−L₀)，含阻尼。<br>'+
    '绳索：不可伸长，<b>只拉不推</b>，松弛时不受力。<br>'+
    '滑轮：定滑轮，两段绳长之和不变（阿特伍德机 / 连接体）。';
  box.appendChild(nt);

  /* ---- 场：匀强电场 / 匀强磁场 ---- */
  var sF=document.createElement('div');sF.className='sec';sF.textContent='场（匀强电场 / 匀强磁场）';
  box.appendChild(sF);
  sbSlider(box,'电场 Ex (N/C)',-50,50,0.5,function(){return SB.Ex;},function(v){SB.Ex=v;});
  sbSlider(box,'电场 Ey (N/C)',-50,50,0.5,function(){return SB.Ey;},function(v){SB.Ey=v;});
  sbSlider(box,'磁场 Bz (T，＋向里)',-5,5,0.05,function(){return SB.Bz;},function(v){SB.Bz=v;});
  box.appendChild(sbTools([
    ['关闭所有场',function(){SB.Ex=0;SB.Ey=0;SB.Bz=0;sbPanel();}],
    ['E 竖直向下 10',function(){SB.Ex=0;SB.Ey=-10;SB.Bz=0;sbPanel();}],
    ['B 向里 1T',function(){SB.Ex=0;SB.Ey=0;SB.Bz=1;sbPanel();}],
    ['速度选择器',function(){SB.Ex=0;SB.Ey=10;SB.Bz=1;sbPanel();}]
  ]));
  var nf=document.createElement('div');nf.className='note';
  nf.innerHTML='给物体设上<b>电荷 q</b>（选中物体后可调），电场力 F=qE，洛伦兹力 F=qv×B。<br>'+
    '磁场只改变速度方向、<b>速率严格不变</b>（用精确旋转更新），可验证圆周运动半径 r=mv/(qB)。';
  box.appendChild(nf);

  var ck=document.createElement('div');ck.className='chkrow';
  [  ['矢量',function(v){SB.showVec=v;},SB.showVec],
   ['受力',function(v){SB.showF=v;},SB.showF],
   ['轨迹',function(v){SB.showTrail=v;},SB.showTrail],
   ['场',function(v){SB.showField=v;},SB.showField],
   ['网格',function(v){SB.showGrid=v;},SB.showGrid],
   ['接触点',function(v){SB.showCt=v;},SB.showCt],
   ['编号',function(v){SB.showId=v;},SB.showId],
   ['允许破碎',function(v){SB.fragOn=v;},SB.fragOn],
   ['碎片自动消失',function(v){SB.fragFade=v;},SB.fragFade]].forEach(function(it){
    var l=document.createElement('label');
    var i=document.createElement('input');i.type='checkbox';i.checked=it[2];
    i.onchange=function(){it[1](i.checked);};
    l.appendChild(i);l.appendChild(document.createTextNode(it[0]));
    ck.appendChild(l);
  });
  box.appendChild(ck);
  box.appendChild(sbTools([
    ['删除选中',function(){sbDel(SB.sel);}],
    ['清空物体',function(){sbClear();}],
    ['清轨迹',function(){
      for(var i=0;i<SB.bodies.length;i++)SB.bodies[i].trail=null;
      sbToast('轨迹已清除');
    }],
    ['适配视图',function(){SB.needFit=true;sbRender();}],
    ['暂停/继续',function(){SB.run=!SB.run;sbMobBar();}]
  ]));
  var s2=document.createElement('div');s2.className='sec';s2.textContent='撤销 / 存档 / 分享';
  box.appendChild(s2);
  box.appendChild(sbTools([
    ['↩ 撤销',function(){sbUndo();}],
    ['保存存档',function(){sbToast(sbSaveStore()?'已保存到本机，下次打开自动恢复':'保存失败（可能处于无痕模式）');}],
    ['复制分享链接',function(){sbShare();}],
    ['清空本机存档',function(){sbClearStore();sbToast('本机存档已清除');}]
  ]));
}
function sbSelPanel(){
  var box=$('#examples');box.innerHTML='';
  var ps=sbTools(SBPresets.map(function(p){
    return [p.name,function(){sbPreset(p.name);},SB.preset===p.name?'on':''];
  }));
  var s1=document.createElement('div');s1.className='sec';s1.textContent='预设场景（点击重建）';
  box.appendChild(s1);box.appendChild(ps);

  var b=SB.sel;
  var s2=document.createElement('div');s2.className='sec';
  s2.textContent=b?('选中物体 #'+b.id+'（可实时改形）'):'选中物体';
  box.appendChild(s2);
  sbLinkPanel(box);
  if(!b){
    var n=document.createElement('div');n.className='note';
    n.textContent='未选中。点击场景中任意物体即可选中并编辑。';
    box.appendChild(n);
    return;
  }
  box.appendChild(sbTools([
    ['矩形',function(){b.shape='box';b.bw=b.bw||0.9;b.bh=b.bh||0.9;sbMass(b);sbSelPanel();},b.shape==='box'?'on':''],
    ['圆形',function(){b.shape='circle';b.r=b.r||0.5;sbMass(b);sbSelPanel();},b.shape==='circle'?'on':''],
    ['三角',function(){b.shape='tri';sbMass(b);sbSelPanel();},b.shape==='tri'?'on':'']
  ]));
  if(b.shape==='circle'){
    sbSlider(box,'半径 r (m)',0.1,3,0.05,function(){return b.r;},function(v){b.r=Math.max(0.05,v);sbMass(b);});
  }else{
    sbSlider(box,'宽 (m)',0.1,10,0.1,function(){return b.bw;},function(v){b.bw=Math.max(0.05,v);sbMass(b);});
    sbSlider(box,'高 (m)',0.05,10,0.05,function(){return b.bh;},function(v){b.bh=Math.max(0.02,v);sbMass(b);});
  }
  var sM2=document.createElement('div');sM2.className='sec';sM2.textContent='材质（换材质会按密度重算质量）';
  box.appendChild(sM2);
  box.appendChild(sbTools(SOLIDS().map(function(M){
    return [M.n,function(){sbSetMat(b,M.k);sbSelPanel();},b.mat===M.k?'on':''];
  })));
  var sLq2=document.createElement('div');sLq2.className='sec';
  sLq2.textContent='把选中物体化成液体（体积按它现在的轮廓）';
  box.appendChild(sLq2);
  box.appendChild(sbTools(LIQS().map(function(M){
    return ['化'+M.n,function(){sbSelToLiquid(b,M.k);},''];
  })));
  var sHd2=document.createElement('div');sHd2.className='sec';sHd2.textContent='坚硬程度';
  box.appendChild(sHd2);
  box.appendChild(sbTools(HARDS.map(function(H){
    return [H.n,function(){sbSetHard(b,H.k);sbSelPanel();},(b.hard||'normal')===H.k?'on':''];
  })));
  sbSlider(box,'质量 m (kg)',0.05,600,0.1,function(){return b.m;},function(v){b.m=Math.max(0.05,v);sbMass(b);});
  sbSlider(box,'强度 hp（½v² 抗撞阈值）',0.5,6000,0.5,function(){return b.hpmax;},
    function(v){b.hpmax=Math.max(0.5,v);b.hp=Math.min(b.hp,b.hpmax);});
  sbSlider(box,'当前 hp（掉到 0 就碎）',0,6000,0.5,function(){return b.hp;},
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
  }
  sbSlider(box,'电荷 q (C)',-5,5,0.1,function(){return b.q;},function(v){b.q=v;});
  sbSlider(box,'角度 (°)',-180,180,1,function(){return b.angle*180/Math.PI;},function(v){b.angle=v*Math.PI/180;b.w=0;});
  var ck=document.createElement('div');ck.className='chkrow';
  var lf=document.createElement('label');
  var fi=document.createElement('input');fi.type='checkbox';fi.checked=b.stat;
  fi.onchange=function(){b.stat=fi.checked;sbMass(b);if(b.stat){b.vx=0;b.vy=0;b.w=0;}};
  lf.appendChild(fi);lf.appendChild(document.createTextNode('固定为静止（地面/支架）'));
  ck.appendChild(lf);
  box.appendChild(ck);
  var sa=document.createElement('div');sa.className='sec';
  sa.textContent='运动约束（导轨：只能沿一条直线平移）';
  box.appendChild(sa);
  box.appendChild(sbTools([
    ['自由运动',function(){sbSetAxis(b,null);sbSelPanel();},!b.ax?'on':''],
    ['竖直导轨',function(){sbSetAxis(b,0,1);sbSelPanel();},(b.ax&&Math.abs(b.ax[0])<1e-9)?'on':''],
    ['水平导轨',function(){sbSetAxis(b,1,0);sbSelPanel();},(b.ax&&Math.abs(b.ax[1])<1e-9)?'on':''],
    ['沿自身方向',function(){
      sbSetAxis(b,Math.cos(b.angle),Math.sin(b.angle));sbSelPanel();},
      (b.ax&&Math.abs(b.ax[0]-Math.cos(b.angle))<1e-9&&Math.abs(b.ax[1]-Math.sin(b.angle))<1e-9)?'on':''],
    ['沿斜面(30°)',function(){sbSetAxis(b,Math.cos(Math.PI/6),Math.sin(Math.PI/6));sbSelPanel();}]
  ]));
  box.appendChild(sbTools([
    ['旋转 -15°',function(){b.angle-=Math.PI/12;b.w=0;}],
    ['旋转 +15°',function(){b.angle+=Math.PI/12;b.w=0;}],
    ['速度归零',function(){b.vx=0;b.vy=0;b.w=0;}],
    ['删除',function(){sbDel(b);}]
  ]));
}

/* ---------- 约束面板 ---------- */
function sbLinkLabel(lk){
  var ic=(lk.kind==='spring')?'〰':((lk.kind==='rope')?'⟋':'◎');
  return ic+' #'+lk.A.id+'→'+(lk.B?'#'+lk.B.id:'支架')+' ('+sbLinkName(lk.kind)+')';
}
function sbLinkLen(lk){
  var p=sbLinkPts(lk);
  if(lk.kind==='pulley')
    return Math.sqrt((p.ax-lk.px)*(p.ax-lk.px)+(p.ay-lk.py)*(p.ay-lk.py))
          +Math.sqrt((p.bx-lk.px)*(p.bx-lk.px)+(p.by-lk.py)*(p.by-lk.py));
  return Math.sqrt((p.bx-p.ax)*(p.bx-p.ax)+(p.by-p.ay)*(p.by-p.ay));
}
function sbLinkPanel(box){
  var s=document.createElement('div');s.className='sec';
  s.textContent='约束 '+SB.links.length+' 个（点击选中可调参数）';
  box.appendChild(s);
  if(SB.pick){
    var pn=document.createElement('div');pn.className='note';
    pn.innerHTML='<b>连接中（'+sbLinkName(SB.pick.kind)+'）</b>：'+
      (SB.pick.a?('已定 #'+SB.pick.a.b.id+' 的挂点，再点另一个物体'+
        (SB.pick.kind==='pulley'?'':'或空白处')):'点第一个物体上的挂点');
    box.appendChild(pn);
    box.appendChild(sbTools([['取消连接',function(){sbLinkCancel();}]]));
  }
  if(!SB.links.length){
    var n=document.createElement('div');n.className='note';
    n.textContent='还没有约束。用左侧「连接」里的 弹簧 / 绳索 / 滑轮，依次点两个物体即可创建。';
    box.appendChild(n);return;
  }
  var items=[];
  for(var i=0;i<SB.links.length;i++){
    (function(lk){
      items.push([sbLinkLabel(lk),function(){SB.selLink=(SB.selLink===lk)?null:lk;sbSelPanel();},
                  SB.selLink===lk?'on':'']);
    })(SB.links[i]);
  }
  box.appendChild(sbTools(items));
  var lk=SB.selLink;
  if(!lk)return;
  var cur=sbLinkLen(lk);
  var nm=document.createElement('div');nm.className='note';
  nm.innerHTML='当前长度 '+fmt(cur,3)+' m · 自然长度 '+fmt(lk.L0,3)+' m · 形变量 '+fmt(cur-lk.L0,3)+' m'+
    (lk.F?(' · <b>'+(lk.kind==='spring'?'弹力':'张力')+' '+fmt(lk.F,2)+' N</b>'):'');
  box.appendChild(nm);
  var lab=lk.kind==='pulley'?'绳总长 (m)':(lk.kind==='spring'?'自然长度 L₀ (m)':'绳长 (m)');
  sbSlider(box,lab,0.05,25,0.05,function(){return lk.L0;},function(v){lk.L0=Math.max(0.02,v);sbAutoSave();});
  if(lk.kind==='spring'){
    sbSlider(box,'劲度系数 k (N/m)',1,2000,1,function(){return lk.k;},function(v){lk.k=Math.max(0.5,v);sbAutoSave();});
    sbSlider(box,'阻尼 c (N·s/m)',0,40,0.2,function(){return lk.c;},function(v){lk.c=Math.max(0,v);});
    box.appendChild(sbTools([
      ['k=50 软',function(){lk.k=50;sbSelPanel();}],
      ['k=200 中',function(){lk.k=200;sbSelPanel();}],
      ['k=800 硬',function(){lk.k=800;sbSelPanel();}],
      ['无阻尼',function(){lk.c=0;sbSelPanel();}]
    ]));
    box.appendChild(sbTools([
      ['可拉可压',function(){lk.op=0;sbSelPanel();},lk.op===0?'on':''],
      ['只推不拉',function(){lk.op=1;sbSelPanel();},lk.op===1?'on':''],
      ['只拉不推',function(){lk.op=2;sbSelPanel();},lk.op===2?'on':'']
    ]));
  }
  if(lk.kind==='pulley'){
    sbSlider(box,'滑轮 x (m)',-10,30,0.1,function(){return lk.px;},function(v){lk.px=v;});
    sbSlider(box,'滑轮 y (m)',-5,25,0.1,function(){return lk.py;},function(v){lk.py=v;});
    sbSlider(box,'滑轮半径 (m)',0.1,2,0.05,function(){return lk.pr;},function(v){lk.pr=Math.max(0.05,v);});
  }
  box.appendChild(sbTools([
    ['以当前长度作为自然长度',function(){lk.L0=sbLinkLen(lk);sbSelPanel();sbAutoSave();}],
    ['删除此约束',function(){sbDelLink(lk);}]
  ]));
}

/* ---------- 鼠标 / 触摸事件 ---------- */
function sbHit(x,y){
  for(var i=SB.bodies.length-1;i>=0;i--){
    if(sbPick(SB.bodies[i],x,y))return SB.bodies[i];
  }
  return null;
}
function sbBindEvents(){
  var cv=$('#scene');
  function pos(e){
    var r=cv.getBoundingClientRect();
    return {sx:e.clientX-r.left,sy:e.clientY-r.top};
  }
  cv.addEventListener('mousedown',function(e){
    if(App.mode!=='sandbox')return;
    var p=pos(e);
    var wx=sbWX(p.sx),wy=sbWY(p.sy);
    SB.mouse.sx=p.sx;SB.mouse.sy=p.sy;SB.mouse.wx=wx;SB.mouse.wy=wy;
    if(SB.sparkMode&&e.button!==1&&e.button!==2){
      sbIgniteAt(wx,wy,1.3);SB.sparkDrag=1;e.preventDefault();return;
    }
    if(e.button===1||e.button===2){
      SB.pan={sx:p.sx,sy:p.sy,cx:SB.view.cx,cy:SB.view.cy};
      return;
    }
    if(SB.pick&&sbPickStep(wx,wy)){e.preventDefault();return;}
    var b=sbHit(wx,wy);
    if(!b){
      var lkh=sbHitLink(p.sx,p.sy);
      if(lkh){SB.selLink=lkh;sbSelPanel();e.preventDefault();return;}
    }
    if(b){
      SB.sel=b;sbSelPanel();
      if(e.shiftKey){
        SB.rot={b:b,a0:b.angle-Math.atan2(wy-b.y,wx-b.x)};
      }else{
        var c=Math.cos(b.angle),s=Math.sin(b.angle);
        var lx=wx-b.x,ly=wy-b.y;
        SB.grab={b:b,lo:[lx*c+ly*s,-lx*s+ly*c],off:[lx,ly]};
      }
    }else{
      SB.sel=null;sbSelPanel();
      SB.pan={sx:p.sx,sy:p.sy,cx:SB.view.cx,cy:SB.view.cy};
    }
    e.preventDefault();
  });
  window.addEventListener('mousemove',function(e){
    if(App.mode!=='sandbox')return;
    var p=pos(e);
    SB.mouse.sx=p.sx;SB.mouse.sy=p.sy;
    SB.mouse.wx=sbWX(p.sx);SB.mouse.wy=sbWY(p.sy);
    if(SB.sparkMode&&SB.sparkDrag){
      var nt=Date.now();
      if(nt-(SB.sparkT||0)>70){SB.sparkT=nt;sbIgniteAt(SB.mouse.wx,SB.mouse.wy,1.1);}
      return;
    }
    if(SB.pan){
      SB.view.cx=SB.pan.cx-(p.sx-SB.pan.sx)/SB.view.s;
      SB.view.cy=SB.pan.cy+(p.sy-SB.pan.sy)/SB.view.s;
    }else if(SB.rot){
      SB.rot.b.angle=Math.atan2(SB.mouse.wy-SB.rot.b.y,SB.mouse.wx-SB.rot.b.x)+SB.rot.a0;
      SB.rot.b.w=0;
    }
  });
  window.addEventListener('mouseup',function(){
    if(App.mode!=='sandbox')return;
    SB.grab=null;SB.pan=null;SB.rot=null;SB.sparkDrag=0;
  });
  cv.addEventListener('wheel',function(e){
    if(App.mode!=='sandbox')return;
    e.preventDefault();
    if(e.shiftKey&&SB.sel){
      SB.sel.angle+=(e.deltaY>0?-0.09:0.09);SB.sel.w=0;return;
    }
    var p=pos(e);
    sbZoomAt(p.sx,p.sy,e.deltaY>0?0.9:1.11);
  },{passive:false});
  cv.addEventListener('dblclick',function(e){
    if(App.mode!=='sandbox')return;
    var p=pos(e);
    var wx=sbWX(p.sx),wy=sbWY(p.sy);
    if(!sbHit(wx,wy)){
      SB.mouse.wx=wx;SB.mouse.wy=wy;
      sbDblAt(wx,wy);
    }
  });
  cv.addEventListener('contextmenu',function(e){
    if(App.mode!=='sandbox')return;
    e.preventDefault();
  });
  window.addEventListener('keydown',function(e){
    if(App.mode!=='sandbox')return;
    var t=e.target&&e.target.tagName;
    if(t==='INPUT'||t==='SELECT'||t==='TEXTAREA')return;
    if((e.ctrlKey||e.metaKey)&&(e.key==='z'||e.key==='Z')){sbUndo();e.preventDefault();return;}
    if(e.key==='Delete'||e.key==='Backspace'){sbDel(SB.sel);e.preventDefault();}
    else if(e.key===' '){SB.run=!SB.run;sbMobBar();e.preventDefault();}
  });
  /* ---------- 触摸：单指抓取/平移，双指捏合缩放 + 旋转，双击加物体 ---------- */
  var TCH={n:0,dst:0,ang:0,cx:0,cy:0,lastTap:0,tapX:0,tapY:0};
  function tpts(e){
    var r=cv.getBoundingClientRect(),a=[];
    for(var i=0;i<e.touches.length;i++){
      a.push({x:e.touches[i].clientX-r.left,y:e.touches[i].clientY-r.top});
    }
    return a;
  }
  function tinfo(a){
    var dx=a[1].x-a[0].x,dy=a[1].y-a[0].y;
    return {dst:Math.max(Math.sqrt(dx*dx+dy*dy),1),ang:Math.atan2(dy,dx),
            cx:(a[0].x+a[1].x)/2,cy:(a[0].y+a[1].y)/2};
  }
  cv.addEventListener('touchstart',function(e){
    if(App.mode!=='sandbox')return;
    var a=tpts(e);
    if(a.length>=2){
      var t=tinfo(a);
      TCH.n=2;TCH.dst=t.dst;TCH.ang=t.ang;TCH.cx=t.cx;TCH.cy=t.cy;
      SB.grab=null;SB.rot=null;SB.pan=null;
      e.preventDefault();return;
    }
    if(!a.length)return;
    TCH.n=1;
    var now=Date.now();
    var dbl=(now-TCH.lastTap<400)&&Math.abs(a[0].x-TCH.tapX)<42&&Math.abs(a[0].y-TCH.tapY)<42;
    TCH.lastTap=now;TCH.tapX=a[0].x;TCH.tapY=a[0].y;
    SB.mouse.sx=a[0].x;SB.mouse.sy=a[0].y;
    SB.mouse.wx=sbWX(a[0].x);SB.mouse.wy=sbWY(a[0].y);
    if(SB.sparkMode){
      sbIgniteAt(SB.mouse.wx,SB.mouse.wy,1.3);SB.sparkDrag=1;TCH.lastTap=0;
      e.preventDefault();return;
    }
    if(dbl&&!SB.pick){
      TCH.lastTap=0;
      if(!sbHit(SB.mouse.wx,SB.mouse.wy))sbDblAt(SB.mouse.wx,SB.mouse.wy);
      e.preventDefault();return;
    }
    if(SB.pick&&sbPickStep(SB.mouse.wx,SB.mouse.wy)){TCH.lastTap=0;e.preventDefault();return;}
    var b=sbHit(SB.mouse.wx,SB.mouse.wy);
    if(b){
      SB.sel=b;sbSelPanel();sbMobBar();
      var c=Math.cos(b.angle),s=Math.sin(b.angle);
      var lx=SB.mouse.wx-b.x,ly=SB.mouse.wy-b.y;
      SB.grab={b:b,lo:[lx*c+ly*s,-lx*s+ly*c],off:[lx,ly]};
    }else{
      SB.sel=null;sbSelPanel();sbMobBar();
      SB.pan={sx:a[0].x,sy:a[0].y,cx:SB.view.cx,cy:SB.view.cy};
    }
    e.preventDefault();
  },{passive:false});
  cv.addEventListener('touchmove',function(e){
    if(App.mode!=='sandbox')return;
    var a=tpts(e);
    if(a.length>=2){
      var t=tinfo(a);
      if(TCH.n<2){  // 第二根手指刚落下：重置基准，避免跳变
        TCH.n=2;TCH.dst=t.dst;TCH.ang=t.ang;TCH.cx=t.cx;TCH.cy=t.cy;
        e.preventDefault();return;
      }
      if(TCH.dst>0)sbZoomAt(t.cx,t.cy,t.dst/TCH.dst);
      var da=t.ang-TCH.ang;
      if(da>Math.PI)da-=2*Math.PI;
      if(da<-Math.PI)da+=2*Math.PI;
      if(SB.sel&&!SB.sel.stat){SB.sel.angle+=da;SB.sel.w=0;}   // 双指旋转 = 让选中物体翻滚
      SB.view.cx-=(t.cx-TCH.cx)/SB.view.s;
      SB.view.cy+=(t.cy-TCH.cy)/SB.view.s;
      TCH.dst=t.dst;TCH.ang=t.ang;TCH.cx=t.cx;TCH.cy=t.cy;
      e.preventDefault();return;
    }
    if(a.length===1){
      var sx=a[0].x,sy=a[0].y;
      SB.mouse.sx=sx;SB.mouse.sy=sy;
      SB.mouse.wx=sbWX(sx);SB.mouse.wy=sbWY(sy);
      if(SB.sparkMode&&SB.sparkDrag){
        var nt2=Date.now();
        if(nt2-(SB.sparkT||0)>70){SB.sparkT=nt2;sbIgniteAt(SB.mouse.wx,SB.mouse.wy,1.1);}
        e.preventDefault();return;
      }
      if(SB.pan){
        SB.view.cx=SB.pan.cx-(sx-SB.pan.sx)/SB.view.s;
        SB.view.cy=SB.pan.cy+(sy-SB.pan.sy)/SB.view.s;
      }
      e.preventDefault();
    }
  },{passive:false});
  function tend(e){
    if(App.mode!=='sandbox')return;
    var a=(e&&e.touches)?tpts(e):[];
    if(!a.length){
      SB.grab=null;SB.pan=null;SB.rot=null;TCH.n=0;SB.sparkDrag=0;
      sbAutoSave();
    }else if(a.length===1){   // 双指抬起一根：转为单指平移
      TCH.n=1;SB.grab=null;SB.rot=null;
      SB.pan={sx:a[0].x,sy:a[0].y,cx:SB.view.cx,cy:SB.view.cy};
      SB.mouse.sx=a[0].x;SB.mouse.sy=a[0].y;
      SB.mouse.wx=sbWX(a[0].x);SB.mouse.wy=sbWY(a[0].y);
    }
  }
  cv.addEventListener('touchend',tend,{passive:false});
  cv.addEventListener('touchcancel',tend,{passive:false});
}

/* ==================================================================
   快照 / 撤销 / 本地存档 / 链接分享
   ================================================================== */
var SAVEKEY='physlab_v1';

/* 精简快照：只存物理状态，不存渲染态，可直接 JSON */
function sbSnap(noVel){
  var bs=[],js=[],i;
  for(i=0;i<SB.bodies.length;i++){
    var b=SB.bodies[i];
    var d={id:b.id,s:b.shape,x:+b.x.toFixed(4),y:+b.y.toFixed(4),a:+b.angle.toFixed(5),
           m:b.m,bw:b.bw,bh:b.bh,r:b.r,e:b.e,mu:b.mu,st:b.stat?1:0,nf:b.nofit?1:0,c:b.color,
           q:b.q||0,ax:b.ax?[b.ax[0],b.ax[1],b.ax[2],b.ax[3],b.ax[4]]:0,
           mt:b.mat||'wood',hp:(b.hp===undefined?0:+b.hp.toFixed(2)),
           bm:(b.boom?[+b.boom.kg.toFixed(3),+(b.boom.R||0).toFixed(3)]:0),fu:b.fuse,
           hd:(b.hard||'normal'),iv:b.invul?1:0,nk:(b.nuke?+b.nuke.kt.toFixed(3):0)};
    if(!noVel){d.vx=+b.vx.toFixed(4);d.vy=+b.vy.toFixed(4);d.w=+b.w.toFixed(4);}
    bs.push(d);
  }
  for(i=0;i<SB.joints.length;i++){
    var j=SB.joints[i];
    js.push({ai:j.A.id,bi:j.B?j.B.id:-1,ra:[j.ra[0],j.ra[1]],
             rb:j.rb?[j.rb[0],j.rb[1]]:null,wx:j.wx,wy:j.wy});
  }
  var ls=[];
  for(i=0;i<SB.links.length;i++){
    var lk=SB.links[i];
    ls.push({id:lk.id,kd:lk.kind,ai:lk.A.id,bi:lk.B?lk.B.id:-1,
             ra:[lk.ra[0],lk.ra[1]],rb:lk.rb?[lk.rb[0],lk.rb[1]]:[0,0],
             wx:lk.wx,wy:lk.wy,L0:lk.L0,k:lk.k,c:lk.c,px:lk.px,py:lk.py,pr:lk.pr,op:lk.op||0});
  }
  return {b:bs,j:js,l:ls,pt:sbPartSnap(),db:(SB.dbl||'box')};
}
function sbRestore(o){
  if(!o||!o.b)return false;
  if(o.db)SB.dbl=o.db;
  SB.bodies=[];SB.joints=[];SB.links=[];SB.warm={};
  SB.grab=null;SB.rot=null;SB.pan=null;SB.sel=null;SB.selLink=null;SB.pick=null;
  var map={},maxId=0,i;
  for(i=0;i<o.b.length;i++){
    var d=o.b[i];
    var b=sbMake({shape:d.s,x:d.x,y:d.y,angle:d.a,m:d.m,bw:d.bw,bh:d.bh,r:d.r,
                  e:d.e,mu:d.mu,stat:!!d.st,nofit:!!d.nf,color:d.c,q:d.q||0});
    b.id=d.id;
    if(d.ax)b.ax=[d.ax[0],d.ax[1],d.ax[2],d.ax[3],d.ax[4]];
    if(d.mt)b.mat=d.mt;
    if(d.hd)b.hard=d.hd;
    if(d.iv)b.invul=1;
    if(d.nk)b.nuke={kt:d.nk};
    if(d.bm)b.boom={kg:d.bm[0],R:d.bm[1]};
    if(d.fu!==undefined)b.fuse=d.fu;
    b.fuse0=(b.fuse>0?b.fuse:1);
    if(d.hp!==undefined&&d.hp>0){b.hp=d.hp;}
    sbHpInit(b);
    if(d.hp!==undefined&&d.hp>0){b.hp=Math.min(d.hp,b.hpmax);}
    if(d.vx!==undefined){b.vx=d.vx;b.vy=d.vy;b.w=d.w;}
    map[d.id]=b;SB.bodies.push(b);
    if(d.id>maxId)maxId=d.id;
  }
  if(SB.nextId<=maxId)SB.nextId=maxId+1;
  for(i=0;i<o.j.length;i++){
    var j=o.j[i],A=map[j.ai],B=j.bi>=0?map[j.bi]:null;
    if(!A)continue;
    if(j.bi>=0&&!B)continue;
    SB.joints.push({A:A,B:B,ra:[j.ra[0],j.ra[1]],rb:j.rb?[j.rb[0],j.rb[1]]:null,wx:j.wx,wy:j.wy});
  }
  if(o.l){
    for(i=0;i<o.l.length;i++){
      var l=o.l[i],LA=map[l.ai],LB=l.bi>=0?map[l.bi]:null;
      if(!LA)continue;
      if(l.bi>=0&&!LB)continue;
      SB.links.push({id:l.id,kind:l.kd,A:LA,B:LB,
        ra:[l.ra[0],l.ra[1]],rb:l.rb?[l.rb[0],l.rb[1]]:[0,0],
        wx:l.wx||0,wy:l.wy||0,L0:l.L0,k:l.k,c:l.c,op:l.op||0,
        px:l.px||0,py:l.py||0,pr:l.pr||LINKDEF.pulley.pr,acc:0,F:0});
      if(l.id>=SB.linkId)SB.linkId=l.id+1;
    }
  }
  if(o.pt)sbPartRestore(o.pt);
  sbSelPanel();
  return true;
}

/* ---------- 撤销 ---------- */
function sbPushUndo(){
  try{
    SB.undo.push(JSON.stringify(sbSnap(true)));
    if(SB.undo.length>50)SB.undo.shift();
  }catch(e){}
}
function sbUndo(){
  if(!SB.undo||!SB.undo.length){sbToast('没有可撤销的操作');return;}
  var s=SB.undo.pop();
  try{sbRestore(JSON.parse(s));}catch(e){}
  sbAutoSave();sbRender();
}

/* ---------- 轻提示 ---------- */
function sbToast(msg){
  var t=document.getElementById('toast');
  if(!t){
    t=document.createElement('div');t.id='toast';document.body.appendChild(t);
  }
  t.textContent=msg;t.className='show';
  clearTimeout(t._tm);t._tm=setTimeout(function(){t.className='';},1900);
}

/* ---------- 本地存档 ---------- */
function sbStoreObj(){
  return {v:1,mode:App.mode,scene:App.scene?App.scene.id:null,P:App.P,
          g:SB.g,air:SB.air,defE:SB.defE,defMu:SB.defMu,preset:SB.preset,
          Ex:SB.Ex,Ey:SB.Ey,Bz:SB.Bz,
          env:SB.env,fxP:SB.fxP,dh:SB.defHard,sw:SB.spaceWall?1:0,gd:SB.gdir,pw:SB.pourW,
          nk:SB.nukeKt,pm:SB.pmax,
          sv:{s:SB.view.s,cx:SB.view.cx,cy:SB.view.cy},
          sb:App.mode==='sandbox'?sbSnap():null};
}
function sbSaveStore(){
  try{localStorage.setItem(SAVEKEY,JSON.stringify(sbStoreObj()));return true;}
  catch(e){return false;}
}
function sbReadStore(){
  try{var s=localStorage.getItem(SAVEKEY);return s?JSON.parse(s):null;}catch(e){return null;}
}
function sbClearStore(){try{localStorage.removeItem(SAVEKEY);}catch(e){}}
var saveTm=0;
function sbAutoSave(){clearTimeout(saveTm);saveTm=setTimeout(sbSaveStore,700);}

/* ---------- 链接分享（把装置编码进 URL，微信里点开就是同一个装置） ---------- */
function b64enc(s){
  try{
    if(window.TextEncoder){
      var by=new TextEncoder().encode(s),bin='';
      for(var i=0;i<by.length;i++)bin+=String.fromCharCode(by[i]);
      return btoa(bin);
    }
  }catch(e){}
  return btoa(unescape(encodeURIComponent(s)));
}
function b64dec(s){
  var bin=atob(s);
  try{
    if(window.TextDecoder){
      var by=new Uint8Array(bin.length);
      for(var i=0;i<bin.length;i++)by[i]=bin.charCodeAt(i);
      return new TextDecoder().decode(by);
    }
  }catch(e){}
  return decodeURIComponent(escape(bin));
}
function sbShareCode(){
  var o={g:+SB.g.toFixed(2),a:+SB.air.toFixed(2),p:SB.preset,
         e:[+SB.Ex.toFixed(2),+SB.Ey.toFixed(2),+SB.Bz.toFixed(3)],sb:sbSnap(true)};
  return b64enc(JSON.stringify(o)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function sbApplyCode(code){
  try{
    var s=String(code).replace(/-/g,'+').replace(/_/g,'/');
    while(s.length%4)s+='=';
    var o=JSON.parse(b64dec(s));
    if(!o||!o.sb)return false;
    if(o.g!==undefined)SB.g=o.g;
    if(o.a!==undefined)SB.air=o.a;
    if(o.p)SB.preset=o.p;
    if(o.e){SB.Ex=o.e[0]||0;SB.Ey=o.e[1]||0;SB.Bz=o.e[2]||0;}
    sbRestore(o.sb);SB.needFit=true;
    return true;
  }catch(e){return false;}
}
function sbShare(){
  var url=location.href.split('#')[0]+'#s='+sbShareCode();
  if(url.length>8000)sbToast('装置较大，链接可能过长，建议删掉一些物体');
  function fallback(){
    var ok=false;
    try{
      var ta=document.createElement('textarea');ta.value=url;
      ta.style.cssText='position:fixed;top:0;left:0;opacity:0;font-size:16px';
      document.body.appendChild(ta);ta.focus();ta.select();ta.setSelectionRange(0,url.length);
      ok=document.execCommand('copy');document.body.removeChild(ta);
    }catch(e){}
    if(ok)sbToast('链接已复制，微信里粘贴即可打开同一个装置');
    else window.prompt('复制下面的链接（微信里粘贴即可打开你的装置）：',url);
  }
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(
        function(){sbToast('链接已复制，微信里粘贴即可打开同一个装置');},
        function(){fallback();});
      return;
    }
  }catch(e){}
  fallback();
}

/* ---------- 手触 / 体感陀螺仪：用手机倾斜改沙盒的重力方向 ---------- */
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

/* ---------- 手机端浮动工具条 ---------- */
function sbMobBar(){
  var box=$('#mobBar');if(!box)return;
  box.innerHTML='';
  if(App.mode!=='sandbox'){box.style.display='none';return;}
  box.style.display='';
  var items=[
    ['＋方块',function(){sbAddAt('box');}],
    ['＋圆球',function(){sbAddAt('circle');}],
    ['＋三角',function(){sbAddAt('tri');}],
    ['＋挡板',function(){sbAddAt('wall');}],
    ['＋炸药',function(){sbAddAt('bomb');}],
    ['＋核弹',function(){sbAddAt('nuke');}],
    ['双击:'+sbDblDef().n,function(){sbDblCycle();}],
    ['引爆',function(){sbDetonateAll();},'pri'],
    ['点火'+(SB.sparkMode?'·开':''),function(){sbSparkToggle();},SB.sparkMode?'pri':''],
    [SB.env==='space'?'回地面':'进空间',function(){
      sbSetEnv(SB.env==='space'?'ground':'space');}],
    ['倒汽油',function(){sbPour('gas');}],
    ['倒水',function(){sbPour('water');}],
    ['sep'],
    ['〰 弹簧',function(){sbLinkStart('spring');},SB.pick&&SB.pick.kind==='spring'?'pri':''],
    ['⟋ 绳索',function(){sbLinkStart('rope');},SB.pick&&SB.pick.kind==='rope'?'pri':''],
    ['◎ 滑轮',function(){sbLinkStart('pulley');},SB.pick&&SB.pick.kind==='pulley'?'pri':''],
    ['sep'],
    ['删除',function(){if(SB.selLink)sbDelLink(SB.selLink);else if(SB.sel)sbDel(SB.sel);else sbToast('先点一下要删的物体');}],
    ['撤销',function(){sbUndo();}],
    ['sep'],
    [SB.run?'⏸ 暂停':'▶ 播放',function(){SB.run=!SB.run;sbMobBar();},SB.run?'':'pri'],
    ['适配视图',function(){SB.needFit=true;sbRender();}],
    ['清空',function(){sbClear();}]
  ];
  items.forEach(function(it){
    if(it[0]==='sep'){var s=document.createElement('div');s.className='sep';box.appendChild(s);return;}
    var b=document.createElement('button');
    b.className='btn'+(it[2]?' '+it[2]:'');
    b.textContent=it[0];
    b.onclick=it[1];
    box.appendChild(b);
  });
}

/* ---------- 进入 / 离开 ---------- */
function sbEnter(){
  App.playing=false;
  if(!SB.bodies.length)sbPreset(SB.preset||'斜面');   // 首次进入 / 存档被清空时，给个默认装置，别让用户面对一块空白
  $('#bPlay').textContent=SB.run?'⏸ 暂停':'▶ 播放';
  $('#bEnd').textContent='清空物体';
  $('#timeline').style.display='none';
  $('#charts').style.display='';       // 沙盒照样显示 系统动量 / 机械能 曲线
  if(!SB.ready){
    sbBindEvents();
    SB.ready=true;
  }
  sbMobBar();sbPanel();sbSelPanel();sbRender();
}
function sbLeaveUI(){
  $('#timeline').style.display='';
  $('#charts').style.display='';
  $('#bEnd').textContent='运行到底';
  sbMobBar();
}

/* ---------- 场景三：运动图像实验室 v-t / a-t ---------- */
Scenes.kinema={
  id:'kinema',name:'运动图像 v-t / a-t',
  brief:'用「分段加速度」拼出任意直线运动：斜率先加后匀、刹车陷阱、竖直上抛往返都能摆出来。位移＝v-t 图面积，右边两张图随仿真同步生长，随时拿面积公式核对。',
  params:[
    {key:'v0',label:'初速度 v₀',min:-25,max:25,step:0.5,def:0,unit:'m/s'},
    {key:'a1',label:'第①段加速度 a₁',min:-12,max:12,step:0.5,def:2,unit:'m/s²'},
    {key:'t1',label:'第①段时长 t₁',min:0,max:12,step:0.5,def:3,unit:'s'},
    {key:'a2',label:'第②段加速度 a₂',min:-12,max:12,step:0.5,def:0,unit:'m/s²'},
    {key:'t2',label:'第②段时长 t₂',min:0,max:12,step:0.1,def:4,unit:'s'},
    {key:'a3',label:'第③段（之后）a₃',min:-12,max:12,step:0.5,def:0,unit:'m/s²'},
    {key:'T',label:'总时长 T',min:1,max:24,step:0.5,def:10,unit:'s'},
    {key:'brake',label:'刹车锁（速度到 0 即停）',min:0,max:1,step:1,def:0,unit:'关/开'}
  ],
  // 按时刻取当前所处阶段的加速度
  acc:function(t,P){
    if(t<P.t1)return P.a1;
    if(t<P.t1+P.t2)return P.a2;
    return P.a3;
  },
  // 单个子步的精确匀变速积分；刹车锁打开时，速度过零会被精确停在 v=0
  // 注意：t 由外层 advance() 统一累加，这里绝不自己推进时间，否则阶段切换会整体提前一半
  integrate:function(st,P,h){
    var a=Scenes.kinema.acc(st.t,P);
    st.a=a;
    if(P.brake>0.5&&a!==0&&st.v!==0){
      var tStop=-st.v/a;
      if(tStop>0&&tStop<=h){
        var dx2=st.v*tStop+0.5*a*tStop*tStop;
        st.x+=dx2;st.dist+=Math.abs(dx2);
        st.v=0;st.stopped=true;st.a=0;
        return;
      }
    }
    var vNew=st.v+a*h,dx=(st.v+vNew)*0.5*h;
    st.x+=dx;st.dist+=Math.abs(dx);st.v=vNew;
  },
  init:function(P){
    var st={t:0,x:0,v:P.v0,a:Scenes.kinema.acc(0,P),dist:0,stopped:false};
    // 先空跑一遍，拿到全程 x / v 的极值，保证坐标标尺稳定不随物体抽动
    var pb={t:0,x:0,v:P.v0,a:0,dist:0,stopped:false};
    var h=0.02,n=Math.ceil(P.T/h),xmin=0,xmax=0,vmin=P.v0,vmax=P.v0;
    for(var i=0;i<n&&!pb.stopped;i++){
      Scenes.kinema.integrate(pb,P,h);
      pb.t+=h;                       // 预扫时手动推进时间（正式运行由 advance 负责）
      if(pb.x<xmin)xmin=pb.x;
      if(pb.x>xmax)xmax=pb.x;
      if(pb.v<vmin)vmin=pb.v;
      if(pb.v>vmax)vmax=pb.v;
    }
    st.xmin=xmin;st.xmax=xmax;st.vmin=vmin;st.vmax=vmax;
    // 分段交界处的解析值（读数面板直接给出，可与面积法互校）
    st.vAt1=P.v0+P.a1*P.t1;
    st.vAt2=st.vAt1+P.a2*P.t2;
    st.xAt1=P.v0*P.t1+0.5*P.a1*P.t1*P.t1;
    st.xAt2=st.xAt1+st.vAt1*P.t2+0.5*P.a2*P.t2*P.t2;
    return st;
  },
  step:function(st,P,h){Scenes.kinema.integrate(st,P,h);},
  finished:function(st,P){return st.stopped||st.t>=P.T;},
  stage:function(st,P){
    if(st.stopped)return '已停下：刹车锁生效，v=0 后保持静止 —— 题目问的位移不能超出实际运动时间';
    if(st.t<P.t1)return '阶段①：匀变速　a₁='+fmt(P.a1)+' m/s²';
    if(st.t<P.t1+P.t2)return '阶段②：匀变速　a₂='+fmt(P.a2)+' m/s²';
    return '阶段③：匀变速　a₃='+fmt(P.a3)+' m/s²';
  },
  vel:function(st,P){return [{label:'速度 v',color:'#2563eb',value:st.v}];},
  en:function(st,P){return [{label:'加速度 a',color:'#dc2626',value:st.a}];},
  info:function(st,P){
    var tm=Math.max(st.t,1e-9);
    var rows=[
      ['时间 t',fmt(st.t)+' s'],
      ['位置 x（相对起点）',fmt(st.x)+' m'],
      ['速度 v',fmt(st.v)+' m/s'],
      ['加速度 a',fmt(st.a)+' m/s²'],
      ['路程（标量累积）',fmt(st.dist)+' m'],
      ['位移÷时间＝平均速度',fmt(st.x/tm)+' m/s'],
      ['路程÷时间＝平均速率',fmt(st.dist/tm)+' m/s'],
      ['①段末 v(t₁)',fmt(st.vAt1)+' m/s'],
      ['①段末 x(t₁)',fmt(st.xAt1)+' m']
    ];
    if(P.t2>0)rows.push(['②段末 x(t₁+t₂)',fmt(st.xAt2)+' m']);
    if(st.dist-Math.abs(st.x)>1e-6)
      rows.push(['⚠ 往返提示','路程 '+fmt(st.dist)+' > 位移大小 '+fmt(Math.abs(st.x))+'，中途反向了']);
    return rows;
  },
  bounds:function(st,P){
    var span=Math.max(st.xmax-st.xmin,2),pad=span*0.16+0.6;
    return {x:[st.xmin-pad,st.xmax+pad],y:[-1.35,1.6]};
  },
  draw:function(g,st,P,V,opt){
    var yl=V.sy(0);
    var span=Math.max(st.xmax-st.xmin,2),pad=span*0.16+0.6;
    var lo=st.xmin-pad,hi=st.xmax+pad;
    var X0=V.sx(0),Xn=V.sx(st.x);
    // 轨道
    g.strokeStyle='#cbd5e1';g.lineWidth=2;
    g.beginPath();g.moveTo(V.sx(lo),yl);g.lineTo(V.sx(hi),yl);g.stroke();
    // 刻度：按跨度选 1/2/5 的整齐步长
    var raw=(hi-lo)/8,mag=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)),nm=raw/mag;
    var stepx=(nm>5)?5*mag:((nm>2)?2*mag:mag);
    for(var xv=Math.ceil(lo/stepx)*stepx;xv<=hi;xv+=stepx){
      var Xk=V.sx(xv);
      g.strokeStyle='#cbd5e1';g.lineWidth=1.4;
      g.beginPath();g.moveTo(Xk,yl);g.lineTo(Xk,yl+7);g.stroke();
      label(g,Xk,yl+18,fmt(xv,stepx<1?1:0)+'m','#94a3b8','center');
    }
    // 起点 O
    g.fillStyle='#64748b';g.beginPath();g.arc(X0,yl,3.4,0,6.283);g.fill();
    label(g,X0,yl+32,'O','#94a3b8','center');
    // 位移指示条
    if(Math.abs(Xn-X0)>1.5){
      g.strokeStyle='rgba(37,99,235,.45)';g.lineWidth=3.4;g.lineCap='round';
      g.beginPath();g.moveTo(X0,yl-30);g.lineTo(Xn,yl-30);g.stroke();g.lineCap='butt';
      label(g,(X0+Xn)/2,yl-39,'位移 x = '+fmt(st.x)+' m','#2563eb','center');
    }
    // 物体
    var bw=Math.max(15,V.scale*0.5),bh=bw*0.66;
    g.fillStyle='#2563eb';
    roundRect(g,Xn-bw/2,yl-bh,bw,bh,4);g.fill();
    // 矢量
    if(opt&&opt.vec){
      var unit=Math.max(14,V.scale*0.42);
      if(Math.abs(st.v)>1e-6)arrow(g,Xn,yl-bh*0.5,Xn+clamp(st.v*unit,-78,78),yl-bh*0.5,'#2563eb',2.6);
      if(Math.abs(st.a)>1e-6)arrow(g,Xn,yl-bh*1.5,Xn+clamp(st.a*unit*2.2,-78,78),yl-bh*1.5,'#dc2626',2.3);
    }
  },
  charts:{
    vel:{field:'v',title:'速度—时间 v-t（斜率＝加速度，面积＝位移）',unit:'m/s',area:true,
         keys:[{label:'速度 v',color:'#2563eb'}]},
    en:{field:'e',title:'加速度—时间 a-t（面积＝速度变化量）',unit:'m/s²',
        keys:[{label:'加速度 a',color:'#dc2626'}]}
  },
  examples:[
    {level:'基础',title:'例1 · 先匀加速再匀速（面积法求位移）',
     q:'汽车从静止以 a=2 m/s² 匀加速 5 s，之后匀速。求 0~10 s 内总位移与全程平均速度。',
     params:{v0:0,a1:2,t1:5,a2:0,t2:5,a3:0,T:10,brake:0},
     answer:'①段：v(5)=at=10 m/s，x₁=½at²=25 m\n②段：匀速前进 x₂=v·t=10×5=50 m\n总位移 x=75 m\n'+
            '【面积法】v-t 图是梯形：½×(5+10)×10=75 m，与积分一致\n平均速度=x/t=75/10=7.5 m/s（匀变速段的平均速度才是(v₀+v)/2，全程不能这么算）'},
    {level:'中档',title:'例2 · 刹车陷阱（问 6 s，其实 4 s 就停了）',
     q:'汽车以 20 m/s 行驶，刹车加速度大小 5 m/s²。求刹车后 6 s 内的位移。（刹车锁已打开）',
     params:{v0:20,a1:-5,t1:6,a2:0,t2:0,a3:0,T:6,brake:1},
     answer:'先判停止时间：t停=v₀/a=20/5=4 s < 6 s\n真实位移 x=v₀²/(2a)=400/10=40 m\n'+
            '【易错】若盲目套 s=v₀t+½at²：20×6−½×5×36=120−90=30 m ✗\n那个结果等价于车停后被反向加速倒回来，物理上不成立\n'+
            '把刹车锁关掉再跑一遍，就能看到车在 4 s 后折返、"位移"开始变小——这就是错解的来源'},
    {level:'高考',title:'例3 · 竖直上抛（全程同一个 g，含往返）',
     q:'以 20 m/s 竖直上抛，g=10 m/s²不变。求上升时间、最大高度，以及抛出后 5 s 的位移、路程与速度。',
     params:{v0:20,a1:-10,t1:8,a2:0,t2:0,a3:0,T:8,brake:0},
     answer:'上升時間 t=v₀/g=2 s，最大高度 H=v₀²/(2g)=20 m\n'+
            '5 s 时：x=v₀t−½gt²=100−125=−25 m（在抛出点下方 25 m）\n　v=v₀−gt=20−50=−30 m/s（向下 30 m/s）\n'+
            '注意｜路程 ≠ 位移｜：上升 20 m + 下降 45 m = 路程 65 m\n'+
            '【图像】全程 a=−10 恒定，a-t 是一条水平线；v-t 是一条穿过 t 轴的斜线，t 轴上下两块面积之差才是位移'},
    {level:'变式',title:'例4 · 加速后又减速，恰好回到出发点',
     q:'质点从静止以 a₁=2 m/s² 加速 3 s，随即改以 a₂=−3 m/s² 运动。求从改向起经过多久回到出发点，以及此时的速度。',
     params:{v0:0,a1:2,t1:3,a2:-3,t2:5.2,a3:0,T:8.5,brake:0},
     answer:'①段末：v=6 m/s，x₁=9 m\n②段位移为零：x₁+v·t+½a₂t²=0 → 9+6t−1.5t²=0\n'+
            '→ t²−4t−6=0 → t=2+√10≈5.16 s（滑块取 5.2 s，接近回到原点）\n此时速度 v=6−3×5.16≈−9.5 m/s\n'+
            '【要点】整个过程位移为 0，但路程=9+9=18 m ≠ 0\n'+
            '右边面板会自动弹出「⚠ 往返提示」——路程大于位移大小，就是回头过的信号'}
  ]
};

/* ---------- 场景四：静力学受力台 ---------- */
Scenes.statics={
  id:'statics',name:'静力学受力台',
  brief:'把「静止还是滑动」的临界条件摆到明面上：拖动任一滑块，全部受力瞬间重算，并实时对比「摩擦需求」与「上限 μN」。按播放＝松手：不平衡的物体会真的按牛顿第二定律滑出去。',
  params:[
    {key:'mode',label:'情景（0斜面 / 1水平 / 2悬绳 / 3墙面）',min:0,max:3,step:1,def:0,unit:'0~3'},
    {key:'m',label:'质量 m',min:0.5,max:20,step:0.5,def:5,unit:'kg'},
    {key:'mu',label:'动摩擦因数 μ',min:0,max:1,step:0.05,def:0.4,unit:''},
    {key:'th',label:'斜面倾角 θ',min:0,max:80,step:1,def:30,unit:'°'},
    {key:'F',label:'外力大小 F',min:0,max:200,step:5,def:0,unit:'N'},
    {key:'al',label:'外力方向 α（相对水平）',min:-80,max:80,step:5,def:0,unit:'°'},
    {key:'g',label:'重力加速度 g',min:9.8,max:10,step:0.2,def:10,unit:'m/s²'}
  ],
  rad:function(d){return d*Math.PI/180;},
  deg:function(r){return r*180/Math.PI;},
  PLANE:4.4,        // 斜面长度（m）
  ROP:1.15,         // 悬绳长度（m）
  R0:0.42,          // 物体半高（m）
  MODE:['斜面上的物体','水平面上的拉与推','悬绳三力平衡','竖直墙面上的挤压'],
  /* 几何约定：tan = 允许运动的方向单位矢量，nor = 约束面外法向，A = 悬点 */
  geo:function(P){
    if(P.mode===0){var t=Scenes.statics.rad(P.th);
      return {tan:[Math.cos(t),Math.sin(t)],nor:[-Math.sin(t),Math.cos(t)],r0:Scenes.statics.R0,s0:2.2,A:null};}
    if(P.mode===1)return {tan:[1,0],nor:[0,1],r0:Scenes.statics.R0,s0:0,A:null};
    if(P.mode===2)return {tan:[1,0],nor:[0,1],r0:0,s0:0,A:[0,2.4]};
    return {tan:[0,1],nor:[1,0],r0:Scenes.statics.R0,s0:1.7,A:null};
  },
  /* 核心：纯函数解算当前受力。st 只用到速度（判断滑动摩擦方向），不依赖 t */
  solve:function(st,P){
    var S=Scenes.statics,G=P.m*P.g,al=S.rad(P.al);
    var Gv=[0,-G],Fv=[P.F*Math.cos(al),P.F*Math.sin(al)];
    /* 情景 3：物体在墙的右侧，外力是「压向墙」的，故 x 分量取负号 */
    if(P.mode===3)Fv=[-P.F*Math.cos(al),P.F*Math.sin(al)];
    var R={G:G,Gv:Gv,Fv:Fv,T:0,Tv:[0,0],N:0,Nv:[0,0],f:0,fv:[0,0],
           fmax:0,req:0,Gt:0,Ft:0,Gn:0,Fn:0,tan:[1,0],nor:[0,1],
           lift:false,slack:false,state:'rest',beta:0};
    /* ---- 悬绳：三力平衡（绳只能拉不能推） ---- */
    if(P.mode===2){
      var Ty=G-Fv[1],Tx=-Fv[0],Tm=Math.sqrt(Tx*Tx+Ty*Ty);
      if(Ty<=1e-9||Tm<=1e-9){R.slack=true;R.state='off';return R;}
      R.T=Tm;R.Tv=[Tx,Ty];R.state='rest';
      R.beta=S.deg(Math.atan2(-Tx,Ty));
      return R;
    }
    var geo=S.geo(P),tan=geo.tan,nor=geo.nor;
    R.tan=tan;R.nor=nor;
    R.Gn=Gv[0]*nor[0]+Gv[1]*nor[1];
    R.Fn=Fv[0]*nor[0]+Fv[1]*nor[1];
    R.Gt=Gv[0]*tan[0]+Gv[1]*tan[1];
    R.Ft=Fv[0]*tan[0]+Fv[1]*tan[1];
    var Nreq=-(R.Gn+R.Fn);            // 接触且法向无加速度时：N = -(Gn+Fn)
    if(Nreq<=0){R.lift=true;Nreq=0;}  // 支持面只推不拉 → 脱离
    R.N=Nreq;R.fmax=P.mu*Nreq;R.req=R.Gt+R.Ft;
    R.Nv=[nor[0]*R.N,nor[1]*R.N];
    var vt=st.vx*tan[0]+st.vy*tan[1];
    var need=Math.abs(R.req);
    if(R.lift||R.fmax<=0){
      R.f=0;
      R.state=(need<1e-9?'rest':(R.req>0?'up':'down'));
    }else if(need<=R.fmax+1e-9){
      R.state='rest';R.f=-R.req;      // 静摩擦「按需」提供，方向同趋势相反
    }else{
      var dir=(Math.abs(vt)>1e-4)?((vt>0)?-1:1):(-sign(R.req));
      R.f=dir*R.fmax;
      R.state=(R.req>0?'up':'down');
    }
    R.fv=[tan[0]*R.f,tan[1]*R.f];
    return R;
  },
  net:function(R,P){
    if(P.mode===2)return [R.Gv[0]+R.Fv[0]+R.Tv[0],R.Gv[1]+R.Fv[1]+R.Tv[1]];
    return [R.Gv[0]+R.Fv[0]+R.Nv[0]+R.fv[0],R.Gv[1]+R.Fv[1]+R.Nv[1]+R.fv[1]];
  },
  init:function(P){
    var S=Scenes.statics,geo=S.geo(P),st={t:0,x:0,y:0,vx:0,vy:0,dist:0};
    if(P.mode===2){
      var R=S.solve(st,P);
      if(R.slack){st.x=geo.A[0];st.y=geo.A[1]-S.ROP;}
      else{st.x=geo.A[0]-S.ROP*(R.Tv[0]/R.T);st.y=geo.A[1]-S.ROP*(R.Tv[1]/R.T);}
    }else{
      st.x=geo.tan[0]*geo.s0+geo.nor[0]*geo.r0;
      st.y=geo.tan[1]*geo.s0+geo.nor[1]*geo.r0;
    }
    st.s0x=st.x;st.s0y=st.y;
    return st;
  },
  step:function(st,P,h){
    var S=Scenes.statics,R=S.solve(st,P),net=S.net(R,P);
    st.vx+=net[0]/P.m*h; st.vy+=net[1]/P.m*h;
    st.x+=st.vx*h; st.y+=st.vy*h;
    if(P.mode===2&&!R.slack){
      /* 绳不可伸长：把小球拉回以悬点为心、绳长为半径的圆上，并去掉径向速度 */
      var A=S.geo(P).A,L=S.ROP;
      var dx=st.x-A[0],dy=st.y-A[1],d=Math.sqrt(dx*dx+dy*dy)||1e-9;
      var ur=[dx/d,dy/d];
      st.x=A[0]+ur[0]*L; st.y=A[1]+ur[1]*L;
      var vr=st.vx*ur[0]+st.vy*ur[1];
      st.vx-=vr*ur[0]; st.vy-=vr*ur[1];
    }else if(!R.lift&&P.mode!==2){
      /* 面约束：保持法向坐标不变，并去掉法向速度 */
      var nor=S.geo(P).nor,r0=S.geo(P).r0;
      var err=r0-(st.x*nor[0]+st.y*nor[1]);
      st.x+=err*nor[0]; st.y+=err*nor[1];
      var vn=st.vx*nor[0]+st.vy*nor[1];
      st.vx-=vn*nor[0]; st.vy-=vn*nor[1];
    }
    st.dist=Math.sqrt((st.x-st.s0x)*(st.x-st.s0x)+(st.y-st.s0y)*(st.y-st.s0y));
  },
  finished:function(st,P){
    if(P.mode===2)return st.t>=0.3;
    if(st.t>=6||st.dist>7)return true;
    var R=Scenes.statics.solve(st,P);
    return R.state==='rest'&&st.t>0.3&&Math.abs(st.vx)<1e-6&&Math.abs(st.vy)<1e-6;
  },
  stage:function(st,P){
    var S=Scenes.statics,R=S.solve(st,P);
    if(P.mode===2){
      if(R.slack)return '绳松了：外力竖直分量已托住足够重力，绳不再绷紧，球被推上去';
      return '三力平衡 ✓　T='+fmt(R.T,1)+' N，绳与竖直方向偏角 β='+fmt(R.beta,1)+'°';
    }
    if(R.lift)return '脱离接触！法向力 N=0 —— 外力把物体提离了支持面，之后做抛体运动';
    if(R.state==='rest')
      return '静止 ✓　静摩擦 f='+fmt(Math.abs(R.f),1)+' N ≤ 上限 μN='+fmt(R.fmax,1)+' N';
    var dn=(P.mode===0?'沿斜面':(P.mode===1?'水平':'竖直'));
    return (R.state==='up'?'向上':'向下')+'滑动！'+dn+'方向需求 '+fmt(Math.abs(R.req),1)+
           ' N ＞ 上限 μN='+fmt(R.fmax,1)+' N';
  },
  vel:function(st,P){
    var S=Scenes.statics,geo=S.geo(P);
    var vt=st.vx*geo.tan[0]+st.vy*geo.tan[1];
    if(P.mode===2)vt=Math.sqrt(st.vx*st.vx+st.vy*st.vy);
    return [{label:'沿运动方向速度 v',color:'#2563eb',value:vt}];
  },
  en:function(st,P){
    var R=Scenes.statics.solve(st,P);
    return [{label:'摩擦力 f',color:'#dc2626',value:(P.mode===2?0:R.f)}];
  },
  info:function(st,P){
    var S=Scenes.statics,R=S.solve(st,P);
    var rows=[['情景',S.MODE[P.mode]],['重力 G = mg',fmt(R.G,1)+' N']];
    if(P.mode===2){
      rows.push(['水平另一端的拉力/推力 F',fmt(P.F,1)+' N（方向 α='+fmt(P.al,0)+'°）'],
        ['绳子偏角 β',fmt(R.beta,2)+'°'],
        ['绳的张力 T',fmt(R.T,2)+' N'],
        ['校验 T·cosβ 与 mg',fmt(R.T*Math.cos(S.rad(R.beta)),2)+' N ／ '+fmt(R.G,1)+' N'],
        ['校验 T·sinβ 与 F 水平分量',fmt(R.T*Math.sin(S.rad(R.beta)),2)+' N ／ '+fmt(P.F*Math.cos(S.rad(P.al)),2)+' N'],
        ['三力关系','T² = (mg)² + F²　→　'+fmt(Math.sqrt(R.G*R.G+P.F*P.F),2)+' N']);
      if(R.slack)rows.push(['⚠ 状态','绳已松弛：T=0，此时不再是三力平衡']);
      return rows;
    }
    var fdir=(Math.abs(R.f)<1e-9)?'无摩擦':((R.f>0)?'沿 +tan 方向':'沿 −tan 方向');
    rows.push(['重力垂直于面 mg⊥',fmt(Math.abs(R.Gn),2)+' N'],
              ['重力平行于面 mg∥',fmt(R.Gt,2)+' N　（负号表示指向下滑侧）'],
              ['外力垂直于面 F⊥',fmt(R.Fn,2)+' N　（正号表示把物体提离接触面）'],
              ['外力平行于面 F∥',fmt(R.Ft,2)+' N'],
              ['支持力 N',fmt(R.N,2)+' N'+(R.lift?'　→ 已脱离':'')],
              ['最大摩擦力 μN',fmt(R.fmax,2)+' N'],
              ['摩擦需求（除 f 外的合力）',fmt(R.req,2)+' N'],
              ['摩擦力 f',fmt(R.f,2)+' N　'+fdir],
              ['状态',(R.state==='rest'?'静止（静摩擦）':(R.state==='up'?'向 +tan 滑动':'向 −tan 滑动'))]);
    return rows;
  },
  bounds:function(st,P){
    if(P.mode===2)return {x:[-1.9,1.9],y:[0.75,2.9]};
    if(P.mode===3)return {x:[-0.45,2.4],y:[-1.1,2.6]};
    if(P.mode===1)return {x:[-2.3,3.3],y:[-0.35,2.3]};
    var th=Scenes.statics.rad(P.th),L=Scenes.statics.PLANE;
    return {x:[-0.7,L*Math.cos(th)+1.1],y:[-0.55,Math.max(L*Math.sin(th)+0.9,2.4)]};
  },
  draw:function(g,st,P,V,opt){
    var S=Scenes.statics,R=S.solve(st,P);
    if(P.mode===0)S.sceneIncline(g,st,P,V,R);
    else if(P.mode===1)S.sceneFlat(g,st,P,V,R);
    else if(P.mode===2)S.sceneRope(g,st,P,V,R);
    else S.sceneWall(g,st,P,V,R);
    if(P.mode!==2)S.meter(g,st,P,V,R);
    if(opt.vec)S.forces(g,st,P,V,R);
  },
  /* ---- 通用：单物体（可旋转） ---- */
  drawBody:function(g,V,x,y,rot,hw,hh,fill,stroke){
    var X=V.sx(x),Y=V.sy(y),sc=V.scale;
    g.save();g.translate(X,Y);g.rotate(-rot);
    roundRect(g,-hw*sc,-hh*sc,hw*sc*2,hh*sc*2,Math.min(4,hw*sc*0.25));
    g.fillStyle=fill;g.fill();
    g.strokeStyle=stroke;g.lineWidth=2;g.stroke();
    g.beginPath();g.arc(0,0,2.2,0,6.283);g.fillStyle=stroke;g.fill();
    g.restore();
  },
  /* ---- 通用：淡色虚线轴（过物体、沿 tan 与 nor） ---- */
  axes:function(g,V,x,y,th){
    var X=V.sx(x),Y=V.sy(y),dx=Math.cos(th),dy=Math.sin(th),rr=118;
    g.save();g.setLineDash([4,3]);g.strokeStyle='rgba(148,163,184,.55)';g.lineWidth=1.2;
    g.beginPath();g.moveTo(X-dx*rr,Y+dy*rr);g.lineTo(X+dx*rr,Y-dy*rr);g.stroke();
    g.beginPath();g.moveTo(X+dy*rr,Y+dx*rr);g.lineTo(X-dy*rr,Y-dx*rr);g.stroke();
    g.restore();
  },
  /* ---- 通用：力矢量箭头（起点为世界坐标，矢量单位为牛顿） ---- */
  fArrow:function(g,V,x,y,fx,fy,k,color,txt,wd){
    var len=Math.sqrt(fx*fx+fy*fy)*k;
    if(len<3)return;
    var X=V.sx(x),Y=V.sy(y);
    var ux=fx/(Math.sqrt(fx*fx+fy*fy)||1),uy=fy/(Math.sqrt(fx*fx+fy*fy)||1);
    arrow(g,X,Y,X+ux*len,Y-uy*len,color,wd||2.4);
    var ex=X+ux*len,ey=Y-uy*len,al=(ux>=0.15?'left':(ux<=-0.15?'right':'center'));
    if(txt)label(g,ex+(ux>=0.15?5:(ux<=-0.15?-5:0)),ey+(uy>=0.15?-8:(uy<=-0.15?12:-12)),txt,color,al);
  },
  ref:function(R,P){
    var m=Math.max(R.G,P.F,R.N,Math.abs(R.f),R.T,10);
    return 66/m;
  },
  /* ---- 力矢量总绘 ---- */
  forces:function(g,st,P,V,R){
    var S=Scenes.statics,k=S.ref(R,P),geo=S.geo(P);
    var cx=st.x,cy=st.y;
    var px=cx-geo.nor[0]*geo.r0,py=cy-geo.nor[1]*geo.r0;   // 接触点
    if(P.mode===2){
      S.fArrow(g,V,cx,cy,R.Gv[0],R.Gv[1],k,'#334155','G '+fmt(R.G,1)+' N',2.4);
      if(P.F>1e-6)S.fArrow(g,V,cx,cy,R.Fv[0],R.Fv[1],k,'#7c3aed','F '+fmt(P.F,1)+' N',2.4);
      if(!R.slack)S.fArrow(g,V,cx,cy,R.Tv[0],R.Tv[1],k,'#d97706','T '+fmt(R.T,1)+' N',2.4);
      return;
    }
    S.fArrow(g,V,cx,cy,R.Gv[0],R.Gv[1],k,'#334155','G '+fmt(R.G,1)+' N',2.4);
    if(P.F>1e-6)S.fArrow(g,V,cx,cy,R.Fv[0],R.Fv[1],k,'#7c3aed','F '+fmt(P.F,1)+' N',2.4);
    if(!R.lift&&R.N>1e-6)S.fArrow(g,V,px,py,R.Nv[0],R.Nv[1],k,'#059669','N '+fmt(R.N,1)+' N',2.4);
    if(Math.abs(R.f)>1e-6&&!R.lift)S.fArrow(g,V,px,py,R.fv[0],R.fv[1],k,'#dc2626','f '+fmt(Math.abs(R.f),1)+' N',2.6);
  },
  /* ---- 「摩擦需求 / 上限 μN」对比条 + 状态徽标 ---- */
  meter:function(g,st,P,V,R){
    var X=14,Y=16,W=Math.min(190,Math.max(140,V.W*0.42));
    roundRect(g,X,Y,W,44,9);
    g.fillStyle='rgba(255,255,255,.9)';g.fill();
    g.strokeStyle='rgba(148,163,184,.5)';g.lineWidth=1;g.stroke();
    var col,txt,txt2;
    if(R.lift){col='#dc2626';txt='已脱离接触';txt2='N = 0，支持面不再作用';}
    else if(R.state==='rest'){col='#059669';txt='静止 ✓';txt2='静摩擦 '+fmt(Math.abs(R.f),1)+' / 上限 '+fmt(R.fmax,1)+' N';}
    else{col='#dc2626';txt=(R.state==='up'?'向上滑动':'向下滑动');txt2='需求 '+fmt(Math.abs(R.req),1)+' / 上限 '+fmt(R.fmax,1)+' N';}
    g.font='bold 13px -apple-system,"Microsoft YaHei",sans-serif';g.textAlign='left';g.textBaseline='middle';
    g.fillText(txt,X+10,Y+14);
    g.font='11px -apple-system,"Microsoft YaHei",sans-serif';g.fillStyle='#64748b';
    g.fillText(txt2,X+10,Y+31);
    var barW=W-20,frac=R.fmax>0?Math.min(Math.abs(R.req)/R.fmax,1):(R.lift?1:0);
    roundRect(g,X+10,Y+36,barW,5,2.5);g.fillStyle='#e2e8f0';g.fill();
    roundRect(g,X+10,Y+36,Math.max(barW*frac,2),5,2.5);g.fillStyle=col;g.fill();
  },
  /* ---- 情景 0：斜面 ---- */
  sceneIncline:function(g,st,P,V,R){
    var S=Scenes.statics,th=S.rad(P.th),L=S.PLANE;
    var p0=[0,0],p1=[L*Math.cos(th),L*Math.sin(th)],p2=[L*Math.cos(th),0];
    // 地面
    g.strokeStyle='#cbd5e1';g.lineWidth=2;
    g.beginPath();g.moveTo(V.sx(-0.6),V.sy(0));g.lineTo(V.sx(p2[0]+0.6),V.sy(0));g.stroke();
    // 楔块
    g.beginPath();
    g.moveTo(V.sx(p0[0]),V.sy(p0[1]));g.lineTo(V.sx(p1[0]),V.sy(p1[1]));g.lineTo(V.sx(p2[0]),V.sy(p2[1]));
    g.closePath();g.fillStyle='#f1f5f9';g.fill();
    g.strokeStyle='#94a3b8';g.lineWidth=2;g.stroke();
    // 角度 θ 弧
    g.strokeStyle='#a3a3a3';g.lineWidth=1.4;
    g.beginPath();g.arc(V.sx(0),V.sy(0),34,-th,0);g.stroke();
    label(g,V.sx(0)+46,V.sy(0)-14,'θ='+fmt(P.th,0)+'°','#64748b','left');
    this.axes(g,V,st.x,st.y,th);
    this.drawBody(g,V,st.x,st.y,th,S.R0,S.R0,'#eff6ff','#2563eb');
  },
  /* ---- 情景 1：水平面 ---- */
  sceneFlat:function(g,st,P,V,R){
    var S=Scenes.statics;
    g.strokeStyle='#94a3b8';g.lineWidth=2.4;
    g.beginPath();g.moveTo(V.sx(-2.2),V.sy(0));g.lineTo(V.sx(3.2),V.sy(0));g.stroke();
    g.save();g.strokeStyle='#cbd5e1';g.lineWidth=1.2;
    for(var x=-2.0;x<=3.0;x+=0.5){
      g.beginPath();g.moveTo(V.sx(x),V.sy(0));g.lineTo(V.sx(x-0.16),V.sy(0)+7);g.stroke();
    }
    g.restore();
    this.axes(g,V,st.x,st.y,0);
    this.drawBody(g,V,st.x,st.y,0,S.R0,S.R0,'#eff6ff','#2563eb');
  },
  /* ---- 情景 2：悬绳 ---- */
  sceneRope:function(g,st,P,V,R){
    var S=Scenes.statics,A=S.geo(P).A;
    // 支架
    g.strokeStyle='#94a3b8';g.lineWidth=3;
    g.beginPath();g.moveTo(V.sx(A[0]),V.sy(A[1]));g.lineTo(V.sx(A[0]+0.9),V.sy(A[1]+0.5));g.stroke();
    g.beginPath();g.moveTo(V.sx(A[0]-0.02),V.sy(A[1]));g.lineTo(V.sx(A[0]-0.02),V.sy(A[1]+0.85));g.stroke();
    // 绳
    g.strokeStyle=R.slack?'#f59e0b':'#475569';g.lineWidth=2.2;
    if(R.slack)g.setLineDash([5,4]);
    g.beginPath();g.moveTo(V.sx(A[0]),V.sy(A[1]));g.lineTo(V.sx(st.x),V.sy(st.y));g.stroke();
    g.setLineDash([]);
    // 竖直参考虚线
    g.save();g.setLineDash([3,4]);g.strokeStyle='rgba(148,163,184,.6)';g.lineWidth=1.2;
    g.beginPath();g.moveTo(V.sx(A[0]),V.sy(A[1]));g.lineTo(V.sx(A[0]),V.sy(A[1]-S.ROP-0.15));g.stroke();
    g.restore();
    if(!R.slack){
      g.strokeStyle='#a3a3a3';g.lineWidth=1.4;
      g.beginPath();g.arc(V.sx(A[0]),V.sy(A[1]),38,-Math.PI/2,-Math.PI/2+S.rad(R.beta),R.beta<0);g.stroke();
      label(g,V.sx(A[0])+(R.beta>=0?12:-12),V.sy(A[1])-30,'β='+fmt(R.beta,1)+'°','#64748b',R.beta>=0?'left':'right');
    }
    // 球
    var rr=Math.max(9,Math.min(0.3*V.scale,20));
    g.beginPath();g.arc(V.sx(st.x),V.sy(st.y),rr,0,6.283);
    g.fillStyle='#eff6ff';g.fill();g.strokeStyle='#2563eb';g.lineWidth=2;g.stroke();
  },
  /* ---- 情景 3：竖直墙 ---- */
  sceneWall:function(g,st,P,V,R){
    var S=Scenes.statics;
    g.fillStyle='#f1f5f9';
    g.beginPath();g.rect(0,0,V.sx(0),V.H);g.fill();
    g.strokeStyle='#94a3b8';g.lineWidth=2.4;
    g.beginPath();g.moveTo(V.sx(0),V.sy(-1.1));g.lineTo(V.sx(0),V.sy(2.6));g.stroke();
    g.save();g.strokeStyle='#cbd5e1';g.lineWidth=1.2;
    for(var y=2.4;y>=-1.0;y-=0.5){
      g.beginPath();g.moveTo(V.sx(0),V.sy(y));g.lineTo(V.sx(0)-8,V.sy(y)+7);g.stroke();
    }
    g.restore();
    this.axes(g,V,st.x,st.y,Math.PI/2);
    this.drawBody(g,V,st.x,st.y,0,S.R0,S.R0,'#eff6ff','#2563eb');
  },
  charts:{
    vel:{field:'v',title:'速度—时间 v-t（静止则恒为 0）',unit:'m/s',
         keys:[{label:'沿运动方向速度 v',color:'#2563eb'}]},
    en:{field:'e',title:'摩擦力—时间 f-t（静止时随需求变化，滑动后锁死在 μN）',unit:'N',
        keys:[{label:'摩擦力 f',color:'#dc2626'}]}
  },
  examples:[
    {level:'高考',title:'例1 · 斜面自锁：μ 一道之隔，动与不动',
     q:'质量 5 kg 的物块放在倾角 30° 的斜面上，μ=0.4，g=10 m/s²，无外力。判断它是否下滑；若下滑求加速度。再把 μ 调到 0.6 看看。',
     params:{mode:0,m:5,mu:0.4,th:30,F:0,al:0,g:10},
     answer:'沿斜面：mg sin30° = 50×0.5 = 25 N\n垂直斜面：mg cos30° = 50×0.866 = 43.3 N，N = 43.3 N\n'+'最大静摩擦 μN = 0.4×43.3 = 17.3 N\n'+'因为 25 N ＞ 17.3 N → 下滑\n'+'a = (25 − 17.3)/5 = 1.54 m/s²\n\n'+'【自锁判据】无外力时只看 tanθ 与 μ：tan30° = 0.577 ＞ μ = 0.4 → 必滑\n'+'把 μ 拖到 0.6：tan30° = 0.577 ＜ 0.6 → 立刻静止，f = 25 N（不是 17.3 N！静摩擦按需给）\n'+'【易错】别把 f 一律写成 μN：只有滑动时 f = μN；静止时 f 由平衡方程解出'},
    {level:'中档',title:'例2 · 拉比推省力：同一个 F，方向一改天地之差',
     q:'10 kg 的箱子，μ=0.3，g=10 m/s²。斜向上 30° 拉它，F=35 N，箱子动不动？若改成斜向下 30° 推，同样 35 N 呢？',
     params:{mode:1,m:10,mu:0.3,th:30,F:35,al:30,g:10},
     answer:'斜向上拉：N = mg − F sin30° = 100 − 17.5 = 82.5 N\n　μN = 24.75 N，水平需求 F cos30° = 30.3 N\n　30.3 ＞ 24.75 → 动了，a = (30.3−24.75)/10 ≈ 0.56 m/s²\n\n'+'改成斜向下推：把 α 拖到 −30°\n　N = mg + F sin30° = 117.5 N，μN = 35.3 N\n　需求仍是 30.3 N ＜ 35.3 N → 推不动\n\n'+'【结论】斜拉能减小 N 从而减小摩擦，所以拉比推省力；这就是为什么行李箱要拉不要推\n'+'刚好的临界力：拉动需 F = μmg/(cosα + μ sinα)，推行需 μmg/(cosα − μ sinα)'},
    {level:'高考',title:'例3 · 悬绳三力平衡：3-4-5 里的必考题',
     q:'质量 2 kg 的小球用细绳悬挂，现用 F=15 N 的水平力把它拉至平衡，g=10 m/s²。求绳的偏角 β 与张力 T。',
     params:{mode:2,m:2,mu:0.4,th:30,F:15,al:0,g:10},
     answer:'三力：重力 mg=20 N（↓）、水平拉力 F=15 N（→）、绳张力 T（沿绳指向悬点）\n'+'平衡 → T 的水平分量抵消 F、竖直分量抵消 mg：\n　 tanβ = F/mg = 15/20 = 0.75 → β = 36.9°\n　 T = √(20² + 15²) = 25 N　（3-4-5 直角三角形）\n\n'+'【要点】这里的三个力构成直角三角形，画出力三角形比列方程快得多\n'+'【动态】把 F 变大 → β 变大、T 变大；β 越接近 90°，T 增长越快（T = mg/cosβ）\n'+'把 α 拖成负值试试：外力斜向下拉时，偏角会变小'},
    {level:'基础',title:'例4 · 墙面自锁：多大的力才压得住',
     q:'质量 1 kg 的物块被水平力压在竖直墙上，μ=0.4，g=10 m/s²。要压住不掉下来，F 至少多大？取 F=20 N 时会怎样？',
     params:{mode:3,m:1,mu:0.4,th:30,F:20,al:0,g:10},
     answer:'水平方向：N = F（墙对物块的支持力）\n最大静摩擦 μN = 0.4F\n竖直方向要压住重力：μF ≥ mg\n→ F ≥ mg/μ = 10/0.4 = 25 N\n\n'+'取 F = 20 N：μN = 8 N ＜ 10 N → 撑不住，下滑\n　a = (mg − μN)/m = (10 − 8)/1 = 2 m/s²\n\n'+'【要点】静摩擦有上限，超过就滑——这类题先算 μN 再和 mg 比大小\n'+'【自锁】F 越大越安全：它不是「力太大反而推动」，而是压得越紧摩擦越大\n'+'把 α 拖到正值（斜向上压）会更轻松，拖到负值（斜向下压）反而更危险'}
  ]
};


/* ===== LINK-BEGIN ===== */
/* ===================== 连接体与极值实验台 ===================== */
Scenes.link={
  id:'link',name:'连接体与极值实验台',
  brief:'连接体抓两件事：整体法求加速度（几个物体当一个看，内力全部抵消）、隔离法求内力（单独拎出来，内力就变成外力）。极值题则把「恰好」「至少」「刚好不滑」翻译成临界条件——摩擦力顶到 μN，或加速度取 0——再解不等式。开「惯性力」就能跳进跟着物体一起加速的参考系，加上 F惯 = −ma 之后，动力学题当场变成静力平衡题。',
  params:[
    {key:'mode',label:'情景（0-3 连接体 / 4-7 极值）',min:0,max:7,step:1,def:0,unit:'0~7'},
    {key:'m1',label:'质量 m₁（桌上 / 斜面上 / 上层 / 被拉的）',min:0.5,max:20,step:0.5,def:4,unit:'kg'},
    {key:'m2',label:'质量 m₂（悬挂 / 下层 / 被顶的）',min:0.5,max:20,step:0.5,def:2,unit:'kg'},
    {key:'mu',label:'动摩擦因数 μ',min:0,max:1,step:0.05,def:0.3,unit:''},
    {key:'th',label:'斜面倾角 θ',min:0,max:80,step:1,def:30,unit:'°'},
    {key:'F',label:'外力 F（大小）',min:0,max:200,step:5,def:30,unit:'N'},
    {key:'al',label:'外力方向 α（相对水平）',min:-80,max:80,step:1,def:0,unit:'°'},
    {key:'g',label:'重力加速度 g',min:9.8,max:10,step:0.2,def:10,unit:'m/s²'}
  ],
  toggles:[
    {key:'inert',label:'① 画出惯性力 F惯 = −ma',def:0},
    {key:'nif',label:'② 用惯性力抽象成受力平衡',def:0}
  ],
  MODE:[
    '定滑轮连接体（水平 m₁ + 悬挂 m₂）',
    '叠加体（m₁ 在 m₂ 上，F 拉下层，地面光滑）',
    '斜面连接体（斜面 m₁ + 悬挂 m₂）',
    '接触挤压（F 推 m₁，m₁ 顶着 m₂）',
    '极值 · 拉还是推？最小力与最优角',
    '极值 · 斜面上「恰好不滑」的 F 区间',
    '极值 · 悬挂质量 m₂ 的临界值',
    '极值 · 叠加体不相对滑动的最大外力'
  ],
  rad:function(d){return d*Math.PI/180;},
  deg:function(r){return r*180/Math.PI;},
  /* 各情景用的质量别名：返回 [上方/被拉物体的质量, 另一个物体的质量] */
  /* ---------- 核心解算（纯函数） ---------- */
  solve:function(P,st){
    var S=Scenes.link,g=P.g;
    st=st||{};
    var v=st.v||0,v1=st.v1||0,v2=st.v2||0;
    var R={mode:P.mode,a:0,a1:0,a2:0,T:0,f:0,f1:0,f2:0,N1:0,N2:0,Nin:0,
           state:'rest',lift:false,fmax:0,req:0,optA:0,Fmin:0,Fmax:0,Fstar:0,
           Fc:0,Tinf:0,m2c:0,scan:null,acc1:[0,0],acc2:[0,0],
           m1:P.m1,m2:P.m2,G1:P.m1*g,G2:P.m2*g,th:S.rad(P.th),mu:P.mu};
    /* ---- 0 / 6：定滑轮（m₁ 在水平面，m₂ 悬挂）---- */
    if(P.mode===0||P.mode===6){
      var D=P.m2*g, fmax=P.mu*P.m1*g;
      var dir=(Math.abs(v)>1e-6)?sign(v):sign(D);
      if(Math.abs(D)<=fmax+1e-9&&Math.abs(v)<=1e-6){R.a=0;R.f=-D;R.state='静止';}
      else{R.a=(D-dir*fmax)/(P.m1+P.m2);R.f=-dir*fmax;
           R.state=(Math.abs(R.a)<1e-9?'匀速':(R.a>0?'m₂ 下落':'m₁ 后退'));}
      R.T=P.m2*(g-R.a);
      R.N1=P.m1*g;R.fmax=fmax;R.req=D;R.m2c=P.mu*P.m1;
      R.Tinf=(1+P.mu)*P.m1*g;
      R.acc1=[R.a,0];R.acc2=[0,-R.a];
      if(P.mode===6)R.scan=S.scan6(P);
      return R;
    }
    /* ---- 1 / 7：叠加体（m₁ 在上，m₂ 在下，拉 m₂，地面光滑）---- */
    if(P.mode===1||P.mode===7){
      var Fs=P.mu*P.m1*g, Fstar=P.mu*(P.m1+P.m2)*g;
      var rel=v2-v1;
      R.Fstar=Fstar;R.fmax=Fs;R.m2c=0;
      if(Math.abs(P.F)<=Fstar+1e-9&&Math.abs(rel)<=1e-6){
        var aa=P.F/(P.m1+P.m2);
        R.a1=aa;R.a2=aa;R.f=P.m1*aa;
        R.state=(Math.abs(aa)<1e-9?'静止':'共同运动（无相对滑动）');
      }else{
        var s1=(Math.abs(rel)>1e-6)?sign(rel):((P.F>=0)?1:-1);
        R.a1=P.mu*g*s1;R.a2=(P.F-P.m1*R.a1)/P.m2;R.f=P.m1*R.a1;
        R.state='相对滑动';
      }
      R.N1=P.m1*g;R.N2=(P.m1+P.m2)*g;R.T=0;R.req=P.F;
      R.acc1=[R.a1,0];R.acc2=[R.a2,0];
      if(P.mode===7)R.scan=S.scan7(P);
      return R;
    }
    /* ---- 2：斜面连接体 ---- */
    if(P.mode===2){
      var th=S.rad(P.th),Gt=P.m1*g*Math.sin(th),N1=P.m1*g*Math.cos(th),fm=P.mu*N1;
      var D2=P.m2*g, d2=(Math.abs(v)>1e-6)?sign(v):sign(D2-Gt);
      if(Math.abs(D2-Gt)<=fm+1e-9&&Math.abs(v)<=1e-6){R.a=0;R.f=Gt-D2;R.state='静止';}
      else{R.f=-d2*fm;R.a=(D2-Gt-d2*fm)/(P.m1+P.m2);
           R.state=(R.a>0?'m₂ 下落（m₁ 上滑）':'m₁ 下滑（m₂ 上升）');}
      R.T=P.m2*(g-R.a);R.N1=N1;R.fmax=fm;R.req=D2-Gt;R.th=th;
      R.acc1=[R.a*Math.cos(th),R.a*Math.sin(th)];R.acc2=[0,-R.a];
      return R;
    }
    /* ---- 3：接触挤压（F 推 m₁，m₁ 顶 m₂）---- */
    if(P.mode===3){
      var M=P.m1+P.m2,fm3=P.mu*M*g;
      var d3=(Math.abs(v)>1e-6)?sign(v):sign(P.F);
      if(Math.abs(P.F)<=fm3+1e-9&&Math.abs(v)<=1e-6){R.a=0;R.state='静止';}
      else{R.a=(P.F-d3*fm3)/M;R.state=(Math.abs(R.a)<1e-9?'匀速':(R.a>0?'向右加速':'减速'));}
      if(R.state==='静止'){R.f1=-P.F*P.m1/M;R.f2=-P.F*P.m2/M;}
      else{R.f1=-d3*P.mu*P.m1*g;R.f2=-d3*P.mu*P.m2*g;}
      R.Nin=P.F*P.m2/M;R.N1=P.m1*g;R.N2=P.m2*g;R.fmax=fm3;R.req=P.F;
      R.acc1=[R.a,0];R.acc2=[R.a,0];
      return R;
    }
    /* ---- 4：极值 · 水平面拉/推的最小力 ---- */
    if(P.mode===4){
      var m=P.m1,al=S.rad(P.al),G=m*g;
      var N=Math.max(0,G-P.F*Math.sin(al));
      R.lift=(P.F*Math.sin(al)>=G-1e-9)&&(P.F*Math.sin(al)>0);
      var fm4=P.mu*N,Fx=P.F*Math.cos(al);
      var d4=(Math.abs(v)>1e-6)?sign(v):sign(Fx);
      if(R.lift){R.a=Fx/m;R.f=0;R.state='已被拉离地面';}
      else if(Math.abs(Fx)<=fm4+1e-9&&Math.abs(v)<=1e-6){R.a=0;R.f=-Fx;R.state='静止';}
      else{R.a=(Fx-d4*fm4)/m;R.f=-d4*fm4;R.state=(Math.abs(R.a)<1e-9?'匀速':(R.a>0?'向右加速':'向左加速'));}
      R.N1=N;R.fmax=fm4;R.req=Fx;R.m1=m;R.G1=G;R.m2=0;R.G2=0;
      R.optA=S.deg(Math.atan(P.mu));
      R.Fmin=P.mu*G/Math.sqrt(1+P.mu*P.mu);
      var fc=S.critF(P,P.al);
      R.Fc=(fc===null)?-1:fc;          // -1 表示这个角度压根拉不动
      R.acc1=[R.a,0];R.acc2=[0,0];
      R.scan=S.scan4(P);
      return R;
    }
    /* ---- 5：极值 · 斜面上「恰好不滑」的 F 区间（F 沿斜面向上）---- */
    var th5=S.rad(P.th),G5=P.m1*g,Gt5=G5*Math.sin(th5),N5=G5*Math.cos(th5),fm5=P.mu*N5;
    var Fmin=Gt5-fm5,Fmax=Gt5+fm5;
    var d5=(Math.abs(v)>1e-6)?sign(v):sign(P.F-Gt5);
    if(P.F>=Fmin-1e-9&&P.F<=Fmax+1e-9&&Math.abs(v)<=1e-6){R.a=0;R.f=Gt5-P.F;R.state='静止';}
    else{R.a=(P.F-Gt5-d5*fm5)/P.m1;R.f=-d5*fm5;R.state=(R.a>0?'沿斜面上滑':'沿斜面下滑');}
    R.Fmin=Fmin;R.Fmax=Fmax;R.N1=N5;R.fmax=fm5;R.req=P.F-Gt5;R.th=th5;
    R.m1=P.m1;R.m2=0;R.G1=G5;R.G2=0;
    R.acc1=[R.a*Math.cos(th5),R.a*Math.sin(th5)];R.acc2=[0,0];
    R.scan=S.scan5(P);
    return R;
  },
  /* 情景 4：恰好要动所需要的力（与当前 F 无关，只跟 α 有关） */
  critF:function(P,alDeg){
    var S=Scenes.link,al=S.rad(alDeg),den=Math.cos(al)+P.mu*Math.sin(al);
    if(den<=1e-6)return null;
    return P.mu*P.m1*P.g/den;
  },
  scan4:function(P){
    var out=[];
    for(var a=-80;a<=80.001;a+=2){
      var fc=this.critF(P,a);
      out.push({x:a,y:(fc===null?null:fc)});
    }
    return {kind:'F-alpha',pts:out,xlab:'α（外力与水平的夹角）',ylab:'恰好拉动所需的 F'};
  },
  scan5:function(P){
    var S=this,g=P.g,th=S.rad(P.th),Gt=P.m1*g*Math.sin(th),fm=P.mu*P.m1*g*Math.cos(th);
    var Fmin=Gt-fm,Fmax=Gt+fm,top=Math.max(2*Fmax,12),out=[];
    for(var i=0;i<=80;i++){
      var F=top*i/80,a=0;
      if(F<Fmin)a=(F-Gt+fm)/P.m1;
      else if(F>Fmax)a=(F-Gt-fm)/P.m1;
      out.push({x:F,y:a});
    }
    return {kind:'a-F',pts:out,xlab:'沿斜面向上的外力 F',ylab:'加速度 a（正=上滑）',
            Fmin:Fmin,Fmax:Fmax};
  },
  scan6:function(P){
    var g=P.g,fm=P.mu*P.m1*g,out=[];
    for(var i=0;i<=78;i++){
      var m2=0.5+(20-0.5)*i/78,D=m2*g,a,T;
      if(D<=fm){a=0;T=D;}else{a=(D-fm)/(P.m1+m2);T=m2*(g-a);}
      out.push({x:m2,y:a,y2:T});
    }
    return {kind:'a-m2',pts:out,xlab:'悬挂质量 m₂',ylab:'加速度 a（蓝）/ 张力 T（橙）'};
  },
  scan7:function(P){
    var g=P.g,Fstar=P.mu*(P.m1+P.m2)*g,Fs=P.mu*P.m1*g;
    var top=Math.max(2*Fstar,20),out=[];
    for(var i=0;i<=80;i++){
      var F=top*i/80,a1,a2;
      if(F<=Fstar){a1=F/(P.m1+P.m2);a2=a1;}
      else{a1=P.mu*g;a2=(F-Fs)/P.m2;}
      out.push({x:F,y:a1,y2:a2});
    }
    return {kind:'a-F2',pts:out,xlab:'外力 F',ylab:'加速度（蓝=m₁，橙=m₂）',Fstar:Fstar};
  },
  /* ---------- 两套方程（惯性系 vs 非惯性系） ---------- */
  eqns:function(R,P){
    var S=Scenes.link,g=P.g,n=[];
    if(P.mode===0||P.mode===6){
      n.push({o:'m₁（水平方向）',i:'T + f = m₁a',v:'T − f′ = m₁a　→　'+fmt(R.T,1)+' − '+fmt(Math.abs(R.f),1)+' = '+fmt(P.m1*Math.abs(R.a),1)},
             {o:'m₂（竖直方向）',i:'m₂g − T = m₂a',v:fmt(R.G2,1)+' − '+fmt(R.T,1)+' = '+fmt(P.m2*Math.abs(R.a),1)});
    }else if(P.mode===1||P.mode===7){
      n.push({o:'m₁（水平）',i:'f = m₁a₁',v:'f = '+fmt(Math.abs(R.f),1)+' N　→　a₁ = '+fmt(R.a1,2)+' m/s²'},
             {o:'m₂（水平）',i:'F − f = m₂a₂',v:fmt(P.F,1)+' − '+fmt(Math.abs(R.f),1)+' = '+fmt(P.m2*R.a2,1)});
    }else if(P.mode===2){
      n.push({o:'m₁（沿斜面）',i:'T + f − m₁g sinθ = m₁a',v:fmt(R.T,1)+' + ('+fmt(R.f,1)+') − '+fmt(P.m1*g*Math.sin(R.th),1)+' = '+fmt(P.m1*R.a,2)},
             {o:'m₂（竖直）',i:'m₂g − T = m₂a',v:fmt(R.G2,1)+' − '+fmt(R.T,1)+' = '+fmt(P.m2*R.a,2)});
    }else if(P.mode===3){
      n.push({o:'整体（水平）',i:'F − f₁ − f₂ = (m₁+m₂)a',v:fmt(P.F,1)+' − '+fmt(Math.abs(R.f1),1)+' − '+fmt(Math.abs(R.f2),1)+' = '+fmt((P.m1+P.m2)*R.a,1)},
             {o:'隔离 m₂',i:'N内 + f₂ = m₂a',v:fmt(R.Nin,1)+' − '+fmt(Math.abs(R.f2),1)+' = '+fmt(P.m2*R.a,1)});
    }else if(P.mode===4){
      n.push({o:'水平',i:'F cosα + f = m₁a',v:fmt(P.F*Math.cos(S.rad(P.al)),1)+' + ('+fmt(R.f,1)+') = '+fmt(P.m1*R.a,2)},
             {o:'竖直',i:'N + F sinα − m₁g = 0',v:fmt(R.N1,1)+' + '+fmt(P.F*Math.sin(S.rad(P.al)),1)+' − '+fmt(R.G1,1)+' = 0'});
    }else{
      n.push({o:'沿斜面',i:'F + f − m₁g sinθ = m₁a',v:fmt(P.F,1)+' + ('+fmt(R.f,1)+') − '+fmt(P.m1*g*Math.sin(R.th),1)+' = '+fmt(P.m1*R.a,2)},
             {o:'垂直斜面',i:'N − m₁g cosθ = 0',v:fmt(R.N1,1)+' − '+fmt(P.m1*g*Math.cos(R.th),1)+' = 0'});
    }
    var out=[];
    for(var i=0;i<n.length;i++){
      var e=n[i];
      out.push(['【惯性系】'+e.o,e.i+'　　'+e.v]);
      if(P.nif){
        var ax=(i===0)?R.acc1[0]:R.acc2[0],ay=(i===0)?R.acc1[1]:R.acc2[1];
        var mm=(i===0)?(P.mode===4||P.mode===5?P.m1:P.m1):P.m2;
        if(P.mode===4||P.mode===5){
          out.push(['【非惯性系】'+e.o+' + 惯性力',
            'ΣF′ = ΣF + (−m a) = 0　→　−m₁a = ('+fmt(-mm*ax,1)+', '+fmt(-mm*ay,1)+') N']);
        }else{
          out.push(['【非惯性系】'+e.o+' + 惯性力',
            'ΣF′ = 0：F惯 = −m a = ('+fmt(-mm*ax,1)+', '+fmt(-mm*ay,1)+') N']);
        }
      }
    }
    return out;
  },
  init:function(P){
    return {t:0,s:0,v:0,x:0,x1:0,x2:0,v1:0,v2:0};
  },
  step:function(st,P,h){
    var R=this.solve(P,st);
    if(P.mode===1||P.mode===7){
      st.v1+=R.a1*h;st.x1+=st.v1*h;
      st.v2+=R.a2*h;st.x2+=st.v2*h;
      if(Math.abs(st.v1-st.v2)<1e-4&&Math.abs(st.x1-st.x2)<1e-4){
        var av=(st.v1*P.m1+st.v2*P.m2)/(P.m1+P.m2);
        st.v1=av;st.v2=av;st.x1=st.x2;
      }
    }else if(P.mode===4){
      st.v+=R.a*h;st.x+=st.v*h;
    }else{
      st.v+=R.a*h;st.s+=st.v*h;
    }
  },
  finished:function(st,P){
    if(st.t>=6)return true;
    if(P.mode===1||P.mode===7)return Math.abs(st.x2)>3.2||Math.abs(st.x1)>3.2;
    if(P.mode===4)return Math.abs(st.x)>3.0;
    return Math.abs(st.s)>2.6;
  },
  stage:function(st,P){
    var R=this.solve(P,st),S=Scenes.link;
    if(P.mode===4){
      if(R.lift)return '外力竖直分量已把物体提离地面（N = 0）';
      return '当前 α='+fmt(P.al,0)+'°：拉动它至少需要 F = '+(R.Fc>0?fmt(R.Fc,1)+' N':'（这个角度拉不动）')+
             '　最优角 α* = arctan μ = '+fmt(R.optA,1)+'°　→　F_min = '+fmt(R.Fmin,1)+' N';
    }
    if(P.mode===5)return '恰好不滑的区间：'+fmt(R.Fmin,1)+' N ≤ F ≤ '+fmt(R.Fmax,1)+' N（当前 F = '+fmt(P.F,1)+' N → '+R.state+'）';
    if(P.mode===6)return '临界悬挂质量 m₂* = μ m₁ = '+fmt(R.m2c,2)+' kg；m₂ → ∞ 时 T → (1+μ)m₁g = '+fmt(R.Tinf,1)+' N';
    if(P.mode===7)return '共同运动的临界外力 F* = μ(m₁+m₂)g = '+fmt(R.Fstar,1)+' N（当前 F = '+fmt(P.F,1)+' N → '+R.state+'）';
    if(P.mode===3)return '整体 a = '+fmt(R.a,2)+' m/s²，两物间的内力 N内 = '+fmt(R.Nin,1)+' N（与 μ 无关！）';
    return R.state+'　→　a = '+fmt(R.a,2)+' m/s²，绳张力 T = '+fmt(R.T,1)+' N';
  },
  vel:function(st,P){
    if(P.mode===1||P.mode===7)
      return [{label:'m₁ 速度 v₁',color:'#2563eb',value:st.v1},
              {label:'m₂ 速度 v₂',color:'#22d3ee',value:st.v2}];
    return [{label:'m₁ 速度（沿运动方向）',color:'#2563eb',value:st.v},
            {label:'m₂ 速度（无第二个物体则为 0）',color:'#22d3ee',value:st.v}];
  },
  en:function(st,P){
    var R=this.solve(P,st);
    return [{label:'绳的张力 T（无绳则 0）',color:'#d97706',value:R.T},
            {label:'摩擦力 f',color:'#dc2626',value:Math.abs(R.f)}];
  },
  info:function(st,P){
    var S=this,R=S.solve(P,st),rows=[],g=P.g;
    rows.push(['情景',S.MODE[P.mode]]);
    rows.push(['已知','m₁='+fmt(P.m1,1)+' kg　m₂='+fmt(P.m2,1)+' kg　μ='+fmt(P.mu,2)+
               '　θ='+fmt(P.th,0)+'°　F='+fmt(P.F,1)+' N　α='+fmt(P.al,0)+'°　g='+fmt(g,2)]);
    rows.push(['状态',R.state]);
    if(P.mode===0||P.mode===6){
      rows.push(['m₂ 的重力（动力）m₂g',fmt(R.G2,2)+' N'],
        ['最大摩擦 μ m₁g（阻力上限）',fmt(R.fmax,2)+' N'],
        ['比较','m₂g = '+fmt(R.G2,2)+' '+(Math.abs(R.G2)<=R.fmax+1e-9?'≤':'＞')+' μ m₁g = '+fmt(R.fmax,2)+'　→　'+(R.state==='静止'?'静止':'运动')],
        ['加速度 a',fmt(R.a,3)+' m/s²　（m₂ 向下 / m₁ 向右为正）'],
        ['绳的张力 T',fmt(R.T,2)+' N'],
        ['摩擦力 f',fmt(Math.abs(R.f),2)+' N'],
        ['支持力 N',fmt(R.N1,2)+' N'],
        ['★ 临界悬挂质量 m₂*','μ m₁ = '+fmt(R.m2c,2)+' kg'],
        ['★ m₂ → ∞ 时的极限','a → g = '+fmt(g,2)+' m/s²，T → (1+μ)m₁g = '+fmt(R.Tinf,2)+' N']);
    }else if(P.mode===1||P.mode===7){
      rows.push(['整体法：a = F/(m₁+m₂)','假设不相对滑动 → a = '+fmt(P.F/(P.m1+P.m2),3)+' m/s²'],
        ['隔离 m₁：需要的摩擦','f = m₁a = '+fmt(P.m1*P.F/(P.m1+P.m2),2)+' N'],
        ['层间最大静摩擦 μ m₁g',fmt(R.fmax,2)+' N'],
        ['比较',(P.m1*P.F/(P.m1+P.m2)<=R.fmax+1e-9?'够 → 共同运动':'不够 → 相对滑动')],
        ['★ 临界外力 F*','μ(m₁+m₂)g = '+fmt(R.Fstar,2)+' N　（F ≤ F* 才不相对滑动）'],
        ['m₁ 的加速度 a₁',fmt(R.a1,3)+' m/s²'],
        ['m₂ 的加速度 a₂',fmt(R.a2,3)+' m/s²'],
        ['相对加速度 a₂−a₁',fmt(R.a2-R.a1,3)+' m/s²'],
        ['摩擦力 f',fmt(Math.abs(R.f),2)+' N'],
        ['★ 惯性力视角（在 m₂ 上看 m₁）','m₁ 受惯性力 m₁a₂ = '+fmt(P.m1*R.a2,2)+' N 向后，'+
          (P.m1*R.a2<=R.fmax+1e-9?'≤ μ m₁g → 摩擦拉得住，不相对滑动':'＞ μ m₁g → 拉不住，开始打滑')]);
    }else if(P.mode===2){
      rows.push(['m₁ 沿斜面重力分量 m₁g sinθ',fmt(P.m1*g*Math.sin(R.th),2)+' N'],
        ['m₁ 垂直斜面 m₁g cosθ',fmt(P.m1*g*Math.cos(R.th),2)+' N　→　N = '+fmt(R.N1,2)+' N'],
        ['最大静摩擦 μN',fmt(R.fmax,2)+' N'],
        ['m₂ 的重力 m₂g',fmt(R.G2,2)+' N'],
        ['★ 静止区间','m₁g sinθ − μN ≤ m₂g ≤ m₁g sinθ + μN　→　'+
          fmt(P.m1*g*Math.sin(R.th)-R.fmax,2)+' ≤ '+fmt(R.G2,2)+' ≤ '+fmt(P.m1*g*Math.sin(R.th)+R.fmax,2)+
          '　'+(R.state==='静止'?'✓ 落在区间内 → 静止':'✗ 落在区间外 → 运动')],
        ['加速度 a',fmt(R.a,3)+' m/s²'],
        ['绳的张力 T',fmt(R.T,2)+' N'],
        ['摩擦力 f',fmt(Math.abs(R.f),2)+' N']);
    }else if(P.mode===3){
      rows.push(['整体法：a','(F − μ(m₁+m₂)g)/(m₁+m₂) = '+fmt(R.a,3)+' m/s²'],
        ['各物所受摩擦','f₁ = '+fmt(Math.abs(R.f1),2)+' N　f₂ = '+fmt(Math.abs(R.f2),2)+' N'],
        ['★ 两物间的内力 N内','F·m₂/(m₁+m₂) = '+fmt(R.Nin,2)+' N'],
        ['★ 内力与 μ 无关','把 μ 从 0 拖到 1，N内 始终 = '+fmt(R.Nin,2)+' N（整体法与隔离法联立的必然结果）'],
        ['隔离 m₂ 校验','N内 − f₂ = '+fmt(R.Nin-Math.abs(R.f2)*(R.a>=0?1:-1),2)+' N　应等于 m₂a = '+fmt(P.m2*R.a,2)+' N']);
    }else if(P.mode===4){
      rows.push(['水平分量 F cosα',fmt(P.F*Math.cos(S.rad(P.al)),2)+' N'],
        ['竖直分量 F sinα',fmt(P.F*Math.sin(S.rad(P.al)),2)+' N　（向上为正 → 减小 N）'],
        ['支持力 N','m₁g − F sinα = '+fmt(R.N1,2)+' N'+(R.lift?'　→ 已离地':'')],
        ['最大静摩擦 μN',fmt(R.fmax,2)+' N'],
        ['★ 恰好拉动的临界力 F(α)','μ m₁g /(cosα + μ sinα) = '+(R.Fc>0?fmt(R.Fc,2)+' N':'这个角度拉不动（越压越紧）')],
        ['★ 最优角 α*','tan α* = μ → α* = '+fmt(R.optA,2)+'°'],
        ['★ 最小力 F_min','μ m₁g/√(1+μ²) = '+fmt(R.Fmin,2)+' N'],
        ['与水平拉对比','水平拉需 μ m₁g = '+fmt(P.mu*R.G1,2)+' N，斜着拉省 '+fmt(P.mu*R.G1-R.Fmin,2)+' N'],
        ['加速度 a',fmt(R.a,3)+' m/s²'],
        ['摩擦力 f',fmt(Math.abs(R.f),2)+' N']);
    }else{
      rows.push(['m₁g sinθ',fmt(P.m1*g*Math.sin(R.th),2)+' N'],
        ['N = m₁g cosθ',fmt(R.N1,2)+' N'],
        ['最大静摩擦 μN',fmt(R.fmax,2)+' N'],
        ['★ 恰好不下滑的 F_min','m₁g sinθ − μN = '+fmt(R.Fmin,2)+' N'+(R.Fmin<0?'（为负 → 不用力也滑不下去，自锁）':'')],
        ['★ 恰好不上滑的 F_max','m₁g sinθ + μN = '+fmt(R.Fmax,2)+' N'],
        ['★ 静止区间',fmt(R.Fmin,2)+' N ≤ F ≤ '+fmt(R.Fmax,2)+' N　（宽度 = 2μN = '+fmt(2*R.fmax,2)+' N）'],
        ['当前 F',fmt(P.F,2)+' N　→　'+R.state],
        ['摩擦力 f',fmt(Math.abs(R.f),2)+' N'],
        ['加速度 a',fmt(R.a,3)+' m/s²']);
    }
    if(P.inert||P.nif){
      rows.push(['— 惯性力 —','']);
      var e=S.eqns(R,P);
      for(var i=0;i<e.length;i++)rows.push(e[i]);
      rows.push(['惯性力 F惯（m₁）','−m₁a₁ = ('+fmt(-P.m1*R.acc1[0],2)+', '+fmt(-P.m1*R.acc1[1],2)+') N　大小 '+fmt(P.m1*Math.sqrt(R.acc1[0]*R.acc1[0]+R.acc1[1]*R.acc1[1]),2)+' N']);
      if(!(P.mode===4||P.mode===5))
        rows.push(['惯性力 F惯（m₂）','−m₂a₂ = ('+fmt(-P.m2*R.acc2[0],2)+', '+fmt(-P.m2*R.acc2[1],2)+') N　大小 '+fmt(P.m2*Math.sqrt(R.acc2[0]*R.acc2[0]+R.acc2[1]*R.acc2[1]),2)+' N']);
      if(P.nif)rows.push(['✓ 非惯性系判据','加上惯性力后每个物体都"静止"，于是 ΣF′ = 0——动力学题就这样变成了静力平衡题']);
    }
    return rows;
  },
  bounds:function(st,P){
    if(P.mode===0||P.mode===6)return {x:[-1.5,3.7],y:[-3.5,1.9]};
    if(P.mode===1||P.mode===7)return {x:[-1.9,4.6],y:[-0.8,1.9]};
    if(P.mode===3)return {x:[-1.9,4.6],y:[-0.8,1.7]};
    if(P.mode===4)return {x:[-1.9,3.9],y:[-0.8,2.3]};
    if(P.mode===2){
      var th=this.rad(P.th),L=2.6;
      return {x:[-0.8,L*Math.cos(th)+2.0],y:[-1.8,Math.max(L*Math.sin(th)+1.0,2.8)]};
    }
    var th5=this.rad(P.th),L5=3.0;
    return {x:[-0.8,L5*Math.cos(th5)+1.4],y:[-0.8,Math.max(L5*Math.sin(th5)+1.0,2.6)]};
  },
  draw:function(g,st,P,V,opt){
    var S=this,R=S.solve(P,st);
    if(P.mode===0||P.mode===6)S.scPulley(g,st,P,V,R,false);
    else if(P.mode===1||P.mode===7)S.scStack(g,st,P,V,R);
    else if(P.mode===2)S.scPulley(g,st,P,V,R,true);
    else if(P.mode===3)S.scPush(g,st,P,V,R);
    else if(P.mode===4)S.scPull(g,st,P,V,R);
    else S.scIncline(g,st,P,V,R);
    if(opt.vec)S.forces(g,st,P,V,R);
    S.badge(g,st,P,V,R);
    if(R.scan&&P.mode>=4)S.scanDraw(g,P,R,V);
    if(P.nif)S.fbd(g,P,R,V);
  },
  /* ---------- 绘图工具 ---------- */
  blk:function(g,V,x,y,hw,hh,rot,fill,stroke,txt){
    var X=V.sx(x),Y=V.sy(y),sc=V.scale;
    g.save();g.translate(X,Y);g.rotate(-rot);
    roundRect(g,-hw*sc,-hh*sc,hw*sc*2,hh*sc*2,3);
    g.fillStyle=fill;g.fill();
    g.strokeStyle=stroke;g.lineWidth=2;g.stroke();
    g.restore();
    if(txt)label(g,X,Y+3,txt,'#1f2937','center');
  },
  pulley:function(g,V,x,y,r){
    g.beginPath();g.arc(V.sx(x),V.sy(y),r*V.scale,0,6.283);
    g.fillStyle='#e2e8f0';g.fill();g.strokeStyle='#64748b';g.lineWidth=2;g.stroke();
    g.beginPath();g.arc(V.sx(x),V.sy(y),2,0,6.283);g.fillStyle='#64748b';g.fill();
  },
  rope:function(g,V,pts){
    g.strokeStyle='#475569';g.lineWidth=2;
    g.beginPath();
    for(var i=0;i<pts.length;i++){
      if(i===0)g.moveTo(V.sx(pts[i][0]),V.sy(pts[i][1]));
      else g.lineTo(V.sx(pts[i][0]),V.sy(pts[i][1]));
    }
    g.stroke();
  },
  ground:function(g,V,x0,x1,y){
    g.strokeStyle='#94a3b8';g.lineWidth=2.4;
    g.beginPath();g.moveTo(V.sx(x0),V.sy(y));g.lineTo(V.sx(x1),V.sy(y));g.stroke();
    g.save();g.strokeStyle='#cbd5e1';g.lineWidth=1.2;
    for(var x=x0+0.2;x<=x1;x+=0.45){
      g.beginPath();g.moveTo(V.sx(x),V.sy(y));g.lineTo(V.sx(x-0.14),V.sy(y)+7);g.stroke();
    }
    g.restore();
  },
  ref:function(R,P){
    var m=Math.max(R.G1,R.G2,P.F,R.N1,Math.abs(R.f),R.T,10);
    return 60/m;
  },
  fArr:function(g,V,x,y,fx,fy,k,color,txt,dash){
    var L=Math.sqrt(fx*fx+fy*fy);
    if(L*k<3)return;
    var X=V.sx(x),Y=V.sy(y),ux=fx/L,uy=fy/L,len=L*k;
    if(dash)g.save(),g.setLineDash([5,3]);
    arrow(g,X,Y,X+ux*len,Y-uy*len,color,dash?2.2:2.6);
    if(dash)g.restore();
    if(txt)label(g,X+ux*len+(ux>=0?6:-6),Y-uy*len+(uy>=0?-9:14),txt,color,ux>=0?'left':'right');
  },
  /* ---------- 情景 0/6：定滑轮 ---------- */
  scPulley:function(g,st,P,V,R,onIncline){
    var S=this,th=onIncline?S.rad(P.th):0;
    var m1x,m1y,m2x,m2y,px,py,r=0.2;
    if(onIncline){
      var L=2.6,r0=0.26,s0=1.1;
      var sPos=s0+st.s;
      m1x=sPos*Math.cos(th)-0*r0*Math.sin(th);
      m1y=sPos*Math.sin(th)+r0*Math.cos(th);
      px=L*Math.cos(th)+0.34;py=L*Math.sin(th)+0.36;
      m2x=px;m2y=py-0.55-st.s;
      // 斜面
      g.beginPath();
      g.moveTo(V.sx(-0.3),V.sy(0));g.lineTo(V.sx(L*Math.cos(th)),V.sy(L*Math.sin(th)));
      g.lineTo(V.sx(L*Math.cos(th)),V.sy(0));g.closePath();
      g.fillStyle='#f1f5f9';g.fill();g.strokeStyle='#94a3b8';g.lineWidth=2;g.stroke();
      g.strokeStyle='#a3a3a3';g.lineWidth=1.4;
      g.beginPath();g.arc(V.sx(0),V.sy(0),32,-th,0);g.stroke();
      label(g,V.sx(0)+44,V.sy(0)-13,'θ='+fmt(P.th,0)+'°','#64748b','left');
      S.pulley(g,V,px,py,r);
      S.rope(g,V,[[m1x,m1y],[px-r*Math.sin(th),py+r*Math.cos(th)],[m2x,m2y+0.26]]);
      S.blk(g,V,m1x,m1y,0.3,0.22,th,'#eff6ff','#2563eb','m₁');
      S.blk(g,V,m2x,m2y,0.26,0.26,0,'#fff7ed','#ea580c','m₂');
    }else{
      m1x=0.15+st.s;m1y=0.3;px=2.45;py=0.42;
      m2x=px;m2y=py-0.62-st.s;
      // 桌面
      S.ground(g,V,-1.3,px-0.28,0);
      g.strokeStyle='#94a3b8';g.lineWidth=2.4;
      g.beginPath();g.moveTo(V.sx(px-0.28),V.sy(0));g.lineTo(V.sx(px-0.28),V.sy(-0.4));g.stroke();
      S.pulley(g,V,px,py,r);
      S.rope(g,V,[[m1x,m1y],[px,py],[m2x,m2y+0.28]]);
      S.blk(g,V,m1x,m1y,0.32,0.28,0,'#eff6ff','#2563eb','m₁');
      S.blk(g,V,m2x,m2y,0.28,0.28,0,'#fff7ed','#ea580c','m₂');
    }
    S.m1x=m1x;S.m1y=m1y;S.m2x=m2x;S.m2y=m2y;S.rot1=th;S.rot2=0;
  },
  /* ---------- 情景 1/7：叠加体 ---------- */
  scStack:function(g,st,P,V,R){
    var S=this;
    var y2=0.3,x2=0.3+st.x2;
    var y1=y2+0.3+0.24,x1=0.3+st.x1;
    S.ground(g,V,-1.6,4.2,0);
    S.blk(g,V,x2,y2,0.75,0.3,0,'#f0fdf4','#16a34a','m₂');
    S.blk(g,V,x1,y1,0.32,0.24,0,'#eff6ff','#2563eb','m₁');
    S.m1x=x1;S.m1y=y1;S.m2x=x2;S.m2y=y2;S.rot1=0;S.rot2=0;
  },
  /* ---------- 情景 3：接触挤压 ---------- */
  scPush:function(g,st,P,V,R){
    var S=this,s=st.s;
    var x1=-0.35+s,y1=0.32,hw1=0.34,hh1=0.3;
    var x2=x1+hw1+0.42,y2=0.36,hw2=0.42,hh2=0.34;
    S.ground(g,V,-1.6,4.2,0);
    S.blk(g,V,x1,y1,hw1,hh1,0,'#eff6ff','#2563eb','m₁');
    S.blk(g,V,x2,y2,hw2,hh2,0,'#f0fdf4','#16a34a','m₂');
    S.m1x=x1;S.m1y=y1;S.m2x=x2;S.m2y=y2;S.rot1=0;S.rot2=0;
  },
  /* ---------- 情景 4：水平拉 ---------- */
  scPull:function(g,st,P,V,R){
    var S=this,x=0.2+st.x,y=0.3;
    S.ground(g,V,-1.6,3.6,0);
    S.blk(g,V,x,y,0.32,0.3,0,'#eff6ff','#2563eb','m₁');
    S.m1x=x;S.m1y=y;S.m2x=null;S.rot1=0;S.rot2=0;
  },
  /* ---------- 情景 5：斜面 + 沿斜面 F ---------- */
  scIncline:function(g,st,P,V,R){
    var S=this,th=S.rad(P.th),L=3.0,r0=0.26,sPos=1.3+st.s;
    var x=sPos*Math.cos(th)-0*Math.sin(th),y=sPos*Math.sin(th)+r0*Math.cos(th);
    g.beginPath();
    g.moveTo(V.sx(-0.3),V.sy(0));g.lineTo(V.sx(L*Math.cos(th)),V.sy(L*Math.sin(th)));
    g.lineTo(V.sx(L*Math.cos(th)),V.sy(0));g.closePath();
    g.fillStyle='#f1f5f9';g.fill();g.strokeStyle='#94a3b8';g.lineWidth=2;g.stroke();
    g.strokeStyle='#a3a3a3';g.lineWidth=1.4;
    g.beginPath();g.arc(V.sx(0),V.sy(0),32,-th,0);g.stroke();
    label(g,V.sx(0)+44,V.sy(0)-13,'θ='+fmt(P.th,0)+'°','#64748b','left');
    S.blk(g,V,x,y,0.3,0.24,th,'#eff6ff','#2563eb','m₁');
    S.m1x=x;S.m1y=y;S.m2x=null;S.rot1=th;S.rot2=0;
  },
  /* ---------- 力矢量 ---------- */
  forces:function(g,st,P,V,R){
    var S=this,k=S.ref(R,P),nif=!!P.nif,inert=!!P.inert;
    var cx=S.m1x,cy=S.m1y,rot=S.rot1||0;
    var G=[0,-R.G1];
    // m₁
    S.fArr(g,V,cx,cy,G[0],G[1],k,'#334155','G '+fmt(R.G1,1)+' N');
    if(P.mode===0||P.mode===6||P.mode===2){
      var Tv=(P.mode===2)?[R.T*Math.cos(rot),R.T*Math.sin(rot)]:[R.T,0];
      S.fArr(g,V,cx,cy,Tv[0],Tv[1],k,'#d97706','T '+fmt(R.T,1)+' N');
    }
    if(P.mode===1||P.mode===7)
      S.fArr(g,V,cx,cy,R.f,0,k,'#dc2626','f '+fmt(Math.abs(R.f),1)+' N');
    else if(P.mode===3){
      S.fArr(g,V,cx,cy,P.F,0,k,'#7c3aed','F '+fmt(P.F,1)+' N');
      S.fArr(g,V,cx,cy,0,R.N1,k,'#059669','N₁ '+fmt(R.N1,1)+' N');
      if(Math.abs(R.f1)>1e-6)S.fArr(g,V,cx,cy,R.f1,0,k,'#dc2626','f₁ '+fmt(Math.abs(R.f1),1)+' N');
    }
    else if(P.mode===4){
      var al=S.rad(P.al);
      S.fArr(g,V,cx,cy,P.F*Math.cos(al),P.F*Math.sin(al),k,'#7c3aed','F '+fmt(P.F,1)+' N');
      if(!R.lift)S.fArr(g,V,cx,cy,0,R.N1,k,'#059669','N '+fmt(R.N1,1)+' N');
      if(Math.abs(R.f)>1e-6)S.fArr(g,V,cx,cy,R.f,0,k,'#dc2626','f '+fmt(Math.abs(R.f),1)+' N');
    }else if(P.mode===5){
      S.fArr(g,V,cx,cy,P.F*Math.cos(rot),P.F*Math.sin(rot),k,'#7c3aed','F '+fmt(P.F,1)+' N');
      S.fArr(g,V,cx,cy,-R.N1*Math.sin(rot),R.N1*Math.cos(rot),k,'#059669','N '+fmt(R.N1,1)+' N');
      if(Math.abs(R.f)>1e-6)
        S.fArr(g,V,cx,cy,R.f*Math.cos(rot),R.f*Math.sin(rot),k,'#dc2626','f '+fmt(Math.abs(R.f),1)+' N');
    }else{
      var nr=(P.mode===2)?[-Math.sin(rot),Math.cos(rot)]:[0,1];
      if(!R.lift&&R.N1>1e-6)S.fArr(g,V,cx,cy,nr[0]*R.N1,nr[1]*R.N1,k,'#059669','N '+fmt(R.N1,1)+' N');
      if(Math.abs(R.f)>1e-6){
        var tr=(P.mode===2)?[Math.cos(rot),Math.sin(rot)]:[1,0];
        S.fArr(g,V,cx,cy,tr[0]*R.f,tr[1]*R.f,k,'#dc2626','f '+fmt(Math.abs(R.f),1)+' N');
      }
    }
    if(P.mode===3){
      S.fArr(g,V,S.m2x,S.m2y,R.Nin,0,k,'#0891b2','N内 '+fmt(R.Nin,1)+' N');
      S.fArr(g,V,S.m2x,S.m2y,R.f2,0,k,'#dc2626','f₂ '+fmt(Math.abs(R.f2),1)+' N');
      S.fArr(g,V,S.m2x,S.m2y,0,-R.G2,k,'#334155','G₂ '+fmt(R.G2,1)+' N');
      S.fArr(g,V,S.m2x,S.m2y,0,R.N2,k,'#059669','N₂ '+fmt(R.N2,1)+' N');
    }else if(S.m2x!==null&&S.m2x!==undefined&&(P.mode===0||P.mode===6||P.mode===2||P.mode===1||P.mode===7)){
      S.fArr(g,V,S.m2x,S.m2y,0,-R.G2,k,'#334155','G₂ '+fmt(R.G2,1)+' N');
      if(P.mode===0||P.mode===6||P.mode===2)
        S.fArr(g,V,S.m2x,S.m2y,0,R.T,k,'#d97706','T '+fmt(R.T,1)+' N');
      if(P.mode===1||P.mode===7){
        S.fArr(g,V,S.m2x,S.m2y,P.F,0,k,'#7c3aed','F '+fmt(P.F,1)+' N');
        S.fArr(g,V,S.m2x,S.m2y,-R.f,0,k,'#dc2626','f '+fmt(Math.abs(R.f),1)+' N');
        S.fArr(g,V,S.m2x,S.m2y,0,R.N2,k,'#059669','N '+fmt(R.N2,1)+' N');
      }
    }
    if(inert||nif){
      var f1=[-P.m1*R.acc1[0],-P.m1*R.acc1[1]];
      S.fArr(g,V,cx,cy,f1[0],f1[1],k,'#e11d48','F惯 '+fmt(Math.sqrt(f1[0]*f1[0]+f1[1]*f1[1]),1)+' N',true);
      if(!(P.mode===4||P.mode===5)&&S.m2x!==null&&S.m2x!==undefined){
        var f2=[-P.m2*R.acc2[0],-P.m2*R.acc2[1]];
        S.fArr(g,V,S.m2x,S.m2y,f2[0],f2[1],k,'#e11d48','F惯₂ '+fmt(Math.sqrt(f2[0]*f2[0]+f2[1]*f2[1]),1)+' N',true);
      }
    }
  },
  /* ---------- 状态徽标 ---------- */
  badge:function(g,st,P,V,R){
    var X=12,Y=14,W=Math.min(236,Math.max(172,V.W*0.48));
    var extra='';
    if(P.mode===6)extra='临界 m₂* = '+fmt(R.m2c,2)+' kg';
    if(P.mode===7)extra='临界外力 F* = '+fmt(R.Fstar,1)+' N';
    if(P.mode===4)extra='最优 α* = '+fmt(R.optA,1)+'°　F_min = '+fmt(R.Fmin,1)+' N';
    if(P.mode===5)extra='静止区间 '+fmt(R.Fmin,1)+' ~ '+fmt(R.Fmax,1)+' N';
    var H=44+(extra?15:0)+(P.nif?20:0);
    roundRect(g,X,Y,W,H,9);
    g.fillStyle='rgba(255,255,255,.92)';g.fill();
    g.strokeStyle='rgba(148,163,184,.5)';g.lineWidth=1;g.stroke();
    var col=(R.state==='静止'||R.state==='匀速')?'#059669':(R.state==='相对滑动'?'#d97706':'#dc2626');
    g.font='bold 13px -apple-system,"Microsoft YaHei",sans-serif';
    g.textAlign='left';g.textBaseline='middle';
    g.fillStyle=col;g.fillText(R.state,X+10,Y+14);
    g.font='11px -apple-system,"Microsoft YaHei",sans-serif';g.fillStyle='#64748b';
    var t2=(P.mode===1||P.mode===7)?('a₁='+fmt(R.a1,2)+'　a₂='+fmt(R.a2,2)+' m/s²')
          :(P.mode===3?('a='+fmt(R.a,2)+'　N内='+fmt(R.Nin,1)+' N')
          :('a='+fmt(R.a,2)+' m/s²　T='+fmt(R.T,1)+' N'));
    if(P.mode===4)t2='当前 α='+fmt(P.al,0)+'°　需 F ≥ '+(R.Fc>0?fmt(R.Fc,1)+' N':'∞（这个角拉不动）');
    g.fillText(t2,X+10,Y+31);
    if(extra){
      g.fillStyle='#0891b2';g.font='bold 11px -apple-system,"Microsoft YaHei",sans-serif';
      g.fillText(extra,X+10,Y+46);
    }
    if(P.nif){
      var ny=Y+44+(extra?15:0);
      g.fillStyle='rgba(225,29,72,.10)';
      roundRect(g,X+4,ny,W-8,17,5);g.fill();
      g.fillStyle='#e11d48';g.font='bold 11px -apple-system,"Microsoft YaHei",sans-serif';
      g.fillText('非惯性系：ΣF + F惯 = 0（动力学 → 静力平衡）',X+10,ny+9);
    }
  },
  /* ---------- 极值扫描曲线 ---------- */
  scanDraw:function(g,P,R,V){
    var S=this,sc=R.scan;
    var w=Math.min(178,Math.max(132,V.W*0.34)),h=96;
    var X=V.W-w-12,Y=68;
    roundRect(g,X,Y,w,h,8);
    g.fillStyle='rgba(255,255,255,.93)';g.fill();
    g.strokeStyle='rgba(148,163,184,.55)';g.lineWidth=1;g.stroke();
    var pad=26,xs,ys=[],pts=sc.pts,hasY2=false;
    var xmin=pts[0].x,xmax=pts[pts.length-1].x,ymin=Infinity,ymax=-Infinity;
    for(var i=0;i<pts.length;i++){
      var p=pts[i];
      if(p.y!==null){if(p.y<ymin)ymin=p.y;if(p.y>ymax)ymax=p.y;}
      if(p.y2!==undefined){hasY2=true;if(p.y2<ymin)ymin=p.y2;if(p.y2>ymax)ymax=p.y2;}
    }
    if(!isFinite(ymin)){ymin=0;ymax=1;}
    if(ymax-ymin<1e-6){ymax=ymin+1;}
    var padY=(ymax-ymin)*0.12;ymin-=padY;ymax+=padY;
    var px=function(x){return X+pad+(w-pad-8)*(x-xmin)/(xmax-xmin||1);};
    var py=function(y){return Y+h-20-(h-32)*(y-ymin)/(ymax-ymin||1);};
    // 坐标轴
    g.strokeStyle='#cbd5e1';g.lineWidth=1;
    g.beginPath();g.moveTo(X+pad,Y+8);g.lineTo(X+pad,Y+h-20);g.lineTo(X+w-8,Y+h-20);g.stroke();
    // 零线
    if(ymin<0&&ymax>0){
      g.save();g.setLineDash([3,3]);g.strokeStyle='#94a3b8';
      g.beginPath();g.moveTo(X+pad,py(0));g.lineTo(X+w-8,py(0));g.stroke();g.restore();
      label(g,X+pad-3,py(0),'0','#94a3b8','right');
    }
    // 曲线
    var draw1=function(get,color,dash){
      g.strokeStyle=color;g.lineWidth=2;
      if(dash)g.setLineDash([4,3]);
      g.beginPath();
      var started=false;
      for(var i=0;i<pts.length;i++){
        var y=get(pts[i]);
        if(y===null||y===undefined){started=false;continue;}
        if(!started){g.moveTo(px(pts[i].x),py(y));started=true;}
        else g.lineTo(px(pts[i].x),py(y));
      }
      g.stroke();g.setLineDash([]);
    };
    if(hasY2)draw1(function(p){return p.y2;},'#f59e0b',true);
    draw1(function(p){return p.y;},'#2563eb',false);
    // 当前位置竖线
    var cur=null;
    if(sc.kind==='F-alpha')cur=P.al;
    else if(sc.kind==='a-m2')cur=P.m2;
    else cur=P.F;
    if(cur!==null&&cur>=xmin&&cur<=xmax){
      g.save();g.setLineDash([2,3]);g.strokeStyle='#0891b2';g.lineWidth=1.4;
      g.beginPath();g.moveTo(px(cur),Y+8);g.lineTo(px(cur),Y+h-20);g.stroke();g.restore();
    }
    // 极值点
    var mk=function(x,y,color,txt){
      if(y===null||y===undefined)return;
      var XX=px(x),YY=py(y);
      if(XX<X+pad-1||XX>X+w-7)return;
      g.fillStyle=color;g.beginPath();g.arc(XX,YY,3.4,0,6.283);g.fill();
      g.strokeStyle='#fff';g.lineWidth=1.4;g.beginPath();g.arc(XX,YY,3.4,0,6.283);g.stroke();
      if(txt)label(g,XX,YY-9,txt,color,'center');
    };
    if(sc.kind==='F-alpha')mk(R.optA,R.Fmin,'#dc2626','最小 '+fmt(R.Fmin,1)+' N');
    if(sc.kind==='a-F'){mk(sc.Fmin,0,'#dc2626','F_min');mk(sc.Fmax,0,'#dc2626','F_max');}
    if(sc.kind==='a-m2')mk(R.m2c,0,'#dc2626','m₂*');
    if(sc.kind==='a-F2')mk(sc.Fstar,P.mu*P.g,'#dc2626','F*');
    // 标题
    g.font='10px -apple-system,"Microsoft YaHei",sans-serif';
    g.fillStyle='#64748b';g.textAlign='left';g.textBaseline='top';
    g.fillText(sc.ylab,X+6,Y+4);
    g.fillText(sc.xlab+' →',X+6,Y+h-13);
  },
  /* ---------- 非惯性系：把动力学抽象成受力平衡 ---------- */
  fbd:function(g,P,R,V){
    var S=this;
    var n=(P.mode===4||P.mode===5)?1:2;
    var bw=Math.min(112,Math.max(88,V.W/(n+0.6))),bh=96;
    var total=n*bw+(n-1)*10;
    var X0=(V.W-total)/2,Y0=V.H-bh-10;
    g.font='bold 11px -apple-system,"Microsoft YaHei",sans-serif';
    for(var i=0;i<n;i++){
      var X=X0+i*(bw+10);
      roundRect(g,X,Y0,bw,bh,8);
      g.fillStyle='rgba(255,253,253,.95)';g.fill();
      g.strokeStyle='#e11d48';g.lineWidth=1.4;g.setLineDash([4,3]);g.stroke();g.setLineDash([]);
      var cx=X+bw/2,cy=Y0+bh/2+4;
      g.fillStyle='#1f2937';g.textAlign='center';g.textBaseline='top';
      g.fillText('隔离体 m'+(i===0?'₁':'₂')+'（非惯性系）',X+bw/2,Y0+5);
      // 质点
      g.beginPath();g.arc(cx,cy,4,0,6.283);g.fillStyle='#1f2937';g.fill();
      // 力箭头（含惯性力）
      var mm=(i===0)?P.m1:P.m2;
      var acc=(i===0)?R.acc1:R.acc2;
      var L=26;
      var ar=function(dx,dy,color,txt){
        var m=Math.sqrt(dx*dx+dy*dy);
        if(m<1e-9)return;
        var ux=dx/m,uy=dy/m;
        arrow(g,cx,cy,cx+ux*L,cy-uy*L,color,2);
        label(g,cx+ux*(L+9),cy-uy*(L+9)+3,txt,color,'center');
      };
      ar(0,-1,'#334155','G');
      ar(-acc[0],-acc[1],'#e11d48','F惯');
      if(i===0){
        if(P.mode===0||P.mode===6||P.mode===2)ar(1,0,'#d97706','T');
        if(P.mode===1||P.mode===7)ar(sign(R.f),0,'#dc2626','f');
        if(P.mode===3)ar(sign(R.f1),0,'#dc2626','f');
        if(P.mode===4)ar(Math.cos(S.rad(P.al)),Math.sin(S.rad(P.al)),'#7c3aed','F');
        if(P.mode===5)ar(Math.cos(R.th),Math.sin(R.th),'#7c3aed','F');
      }else{
        if(P.mode===0||P.mode===6||P.mode===2)ar(0,1,'#d97706','T');
        if(P.mode===1||P.mode===7){ar(1,0,'#7c3aed','F');ar(-sign(R.f),0,'#dc2626','f');}
        if(P.mode===3)ar(1,0,'#0891b2','N内');
      }
      g.font='10px -apple-system,"Microsoft YaHei",sans-serif';
      g.fillStyle='#e11d48';g.textAlign='center';g.textBaseline='bottom';
      g.fillText('ΣF′ = 0 ✓',X+bw/2,Y0+bh-4);
    }
  },
  charts:{
    vel:{field:'v',title:'速度—时间 v-t（m₁ 与 m₂）',unit:'m/s',
         keys:[{label:'m₁ 速度 v₁',color:'#2563eb'},{label:'m₂ 速度 v₂',color:'#22d3ee',dash:true}]},
    en:{field:'e',title:'张力与摩擦力—时间',unit:'N',
        keys:[{label:'绳的张力 T（无绳则 0）',color:'#d97706'},{label:'摩擦力 f',color:'#dc2626',dash:true}]}
  },
  examples:[
    {level:'基础',title:'例1 · 定滑轮连接体：整体法求 a，隔离法求 T',
     q:'m₁=4 kg 放在水平桌面上，μ=0.2；m₂=2 kg 悬挂，绳与滑轮均理想，g=10 m/s²。求加速度 a 与绳张力 T。',
     params:{mode:0,m1:4,m2:2,mu:0.2,th:30,F:30,al:0,g:10,inert:0,nif:0},
     answer:'动力：m₂g = 20 N；阻力上限：μ m₁g = 0.2×40 = 8 N\n'+'20 N ＞ 8 N → 动\n\n'+
      '整体法（把 m₁、m₂ 当一个整体，绳的张力是内力，抵消）：\n'+'　a = (m₂g − μ m₁g)/(m₁+m₂) = (20 − 8)/6 = 2 m/s²\n\n'+
      '隔离法（单独拎出 m₂ 求张力）：\n'+'　m₂g − T = m₂a　→　T = m₂(g − a) = 2×8 = 16 N\n\n'+
      '校验（隔离 m₁）：T − f = 16 − 8 = 8 N = m₁a = 4×2 ✓\n\n'+
      '【要点】连接体的通法就是这两步：整体法求 a（内力不出现），隔离法求内力（内力变成外力）\n'+
      '【易错】别对 m₁ 写 T = m₂g：m₂ 在加速下落，它处于失重状态，T ＜ m₂g（16 ＜ 20）'},
    {level:'高考',title:'例2 · 叠加体：先假设共同运动，再回头查摩擦够不够',
     q:'m₁=2 kg 叠在 m₂=4 kg 上，层间 μ=0.3，地面光滑。用 F=20 N 拉下层的 m₂。判断是否相对滑动，并求两者的加速度。',
     params:{mode:1,m1:2,m2:4,mu:0.3,th:30,F:20,al:0,g:10,inert:0,nif:0},
     answer:'第一步：假设不相对滑动，整体法\n'+'　a = F/(m₁+m₂) = 20/6 = 3.33 m/s²\n'+
      '第二步：隔离上面的 m₁，看它需要多少摩擦才能跟上\n'+'　f = m₁a = 2×3.33 = 6.67 N\n'+
      '　上限：μ m₁g = 0.3×20 = 6 N\n'+
      '　6.67 N ＞ 6 N → 摩擦不够 → 相对滑动\n\n'+
      '第三步：滑动后摩擦力锁死在 μ m₁g = 6 N\n'+'　a₁ = μ m₁g/m₁ = μ g = 3 m/s²\n'+
      '　a₂ = (F − μ m₁g)/m₂ = (20 − 6)/4 = 3.5 m/s²\n\n'+
      '★ 临界外力：F* = μ(m₁+m₂)g = 0.3×60 = 18 N　（20 ＞ 18 → 必滑，与上面一致）\n\n'+
      '【要点】叠加体三步走：整体法猜 a → 隔离上层查摩擦 → 不够就锁死 μmg 重算\n'+
      '【惯性力视角】站到 m₂ 上看 m₁：m₁ 受向后的惯性力 m₁a₂，只要 m₁a₂ ≤ μ m₁g 就不打滑，\n'+'　即 a₂ ≤ μg —— 这正好把动力学问题变成了"静力平衡"问题（点下方「② 用惯性力抽象成受力平衡」试试）'},
    {level:'高考',title:'例3 · 斜面连接体：看着像要动，其实静止',
     q:'θ=30°，m₁=5 kg 在斜面上，μ=0.2；m₂=3 kg 悬挂。g=10 m/s²。判断运动状态，求 T 与摩擦。',
     params:{mode:2,m1:5,m2:3,mu:0.2,th:30,F:30,al:0,g:10,inert:0,nif:0},
     answer:'m₁ 沿斜面重力分量：m₁g sin30° = 25 N\n'+'垂直斜面：N = m₁g cos30° = 43.3 N，μN = 8.66 N\n'+
      'm₂ 的重力：m₂g = 30 N\n\n'+
      '★ 静止区间：m₁g sinθ − μN ≤ m₂g ≤ m₁g sinθ + μN\n'+'　即 25 − 8.66 = 16.34 N ≤ 30 N ≤ 33.66 N ✓ 落在区间内 → 静止！\n\n'+
      '所以 a = 0，T = m₂g = 30 N\n'+'摩擦：T − m₁g sinθ + f = 0　→　f = 25 − 30 = −5 N\n'+
      '　即摩擦大小 5 N，方向沿斜面向下（因为 m₂ 有把 m₁ 往上拉的趋势）\n\n'+
      '【要点】连接体第一件事永远是"先判静止"：静摩擦会按需给，只要不超过 μN 就能撑住\n'+
      '【易错】别一上来就套 a = (m₂g − m₁g sinθ)/(m₁+m₂)，那样会得到 a = 0.625 m/s² 的错答案\n'+
      '【动态】把 m₂ 拖到 4 kg（m₂g=40 N ＞ 33.66 N）它才会真的动起来'},
    {level:'中档',title:'例4 · 接触挤压：内力与 μ 无关',
     q:'m₁=3 kg、m₂=6 kg 并排在水平面上，μ=0.2，用 F=30 N 水平推 m₁。求加速度与两物之间的相互作用力 N内。',
     params:{mode:3,m1:3,m2:6,mu:0.2,th:30,F:30,al:0,g:10,inert:0,nif:0},
     answer:'整体法：\n'+'　f总 = μ(m₁+m₂)g = 0.2×90 = 18 N\n'+'　a = (F − f总)/(m₁+m₂) = (30 − 18)/9 = 1.33 m/s²\n\n'+
      '隔离 m₂（它只受 m₁ 的推力 N内 和摩擦）：\n'+'　N内 − μ m₂g = m₂a\n'+'　N内 = m₂a + μ m₂g = 6×1.33 + 12 = 20 N\n\n'+
      '★ 把 a 代进去化简，摩擦项正好抵消：\n'+'　N内 = F·m₂/(m₁+m₂) = 30×6/9 = 20 N　—— 与 μ 完全无关！\n\n'+
      '【验证】把 μ 从 0.2 拖到 0.6：a 会变小，但 N内 始终是 20 N\n'+
      '【结论】接触连接体的内力按质量分配：N内 = F·m₂/(m₁+m₂)。推谁都一样（推 m₂ 就换成 F·m₁/(m₁+m₂)）'},
    {level:'高考',title:'例5 · 极值：最小拉力与最优角（辅助角公式）',
     q:'m₁=10 kg，μ=0.5，g=10 m/s²。用多大的力、沿什么方向拉，才能最省力地让它动起来？和水平拉比省多少？',
     params:{mode:4,m1:10,m2:2,mu:0.5,th:30,F:50,al:0,g:10,inert:0,nif:0},
     answer:'设拉力与水平成 α 角（斜向上）：\n'+'　N = mg − F sinα　　水平：F cosα = μN\n'+
      '→　F(α) = μmg/(cosα + μ sinα)\n\n'+
      '★ 用辅助角公式：cosα + μ sinα = √(1+μ²)·cos(α − α*)，其中 tanα* = μ\n'+
      '　α* = arctan 0.5 = 26.6°\n'+
      '　分母最大 = √(1+0.25) = 1.118\n'+
      '　F_min = μmg/√(1+μ²) = 50/1.118 = 44.7 N\n\n'+
      '对比水平拉（α=0）：F = μmg = 50 N　→　斜着拉省了 5.3 N（约 10.6%）\n\n'+
      '【要点】这是极值题的标准套路：写出 F(自变量)，再用辅助角公式 / 配方法 / 求导找最值\n'+
      '【动态】把 α 拖到 26.6°：所需 F 从 50 N 降到 44.7 N；再拖大反而又变大——曲线上那个最低点就是极值\n'+
      '【陷阱】α 太大也不行：F sinα 把物体往上提，N 变小，但水平分量也小了；最优解是两者的平衡'},
    {level:'高考',title:'例6 · 极值：斜面上「恰好不滑」的 F 区间',
     q:'θ=37°（sin37°=0.6，cos37°=0.8），m₁=2 kg，μ=0.5，g=10 m/s²。沿斜面方向的外力 F 在什么范围内物体能静止？',
     params:{mode:5,m1:2,m2:2,mu:0.5,th:37,F:10,al:0,g:10,inert:0,nif:0},
     answer:'沿斜面：m₁g sinθ = 20×0.6 = 12 N\n'+'垂直斜面：N = m₁g cosθ = 20×0.8 = 16 N，μN = 8 N\n\n'+
      '★ 恰好不下滑（摩擦向上顶到最大）：\n'+'　F_min = m₁g sinθ − μN = 12 − 8 = 4 N\n'+
      '★ 恰好不上滑（摩擦向下顶到最大）：\n'+'　F_max = m₁g sinθ + μN = 12 + 8 = 20 N\n\n'+
      '→ 静止区间：4 N ≤ F ≤ 20 N（宽度 = 2μN = 16 N）\n\n'+
      '取 F = 10 N：在区间内 → 静止，摩擦 f = m₁g sinθ − F = 2 N（沿斜面向上）\n\n'+
      '【要点】"恰好"＝摩擦取到 μN；"范围"＝两个极值之间。这类题先找两个临界，再夹出区间\n'+
      '【特例】若 m₁g sinθ ≤ μN（即 tanθ ≤ μ），F_min ≤ 0 —— 这就是斜面自锁，不用力也滑不下去\n'+
      '【动态】把 θ 拖大到 arctan μ = 26.6° 以上，F_min 就变成正数了'},
    {level:'中档',title:'例7 · 极值：悬挂质量 m₂ 的临界值与极限',
     q:'水平桌面上的 m₁=5 kg，μ=0.4，g=10 m/s²。悬挂的 m₂ 多大时系统开始动？m₂ 无限大时，加速度和张力趋向多少？',
     params:{mode:6,m1:5,m2:5,mu:0.4,th:30,F:30,al:0,g:10,inert:0,nif:0},
     answer:'★ 临界：系统刚要动时静摩擦取到最大\n'+'　m₂g = μ m₁g　→　m₂* = μ m₁ = 0.4×5 = 2 kg\n'+
      '　m₂ ≤ 2 kg 静止；m₂ ＞ 2 kg 开始动\n\n'+
      '取 m₂ = 5 kg：\n'+'　a = (m₂g − μ m₁g)/(m₁+m₂) = (50 − 20)/10 = 3 m/s²\n'+
      '　T = m₂(g − a) = 5×7 = 35 N\n\n'+
      '★ m₂ → ∞ 的极限（这是最值题里最常问的"趋于多少"）：\n'+
      '　a = (m₂ − μ m₁)g/(m₁+m₂)　→　g = 10 m/s²\n'+
      '　T = m₂m₁(1+μ)g/(m₁+m₂)　→　(1+μ)m₁g = 1.4×50 = 70 N\n\n'+
      '【要点】极限法：m₂ → ∞ 时把 m₁ 忽略，a → g；T 不能直接令 m₂=∞，要先代数化简再取极限\n'+
      '【易错】T 不是无穷大！它单调趋近 70 N（扫描曲线里那条橙色线就是它的渐近线）'},
    {level:'高考',title:'例8 · 方法：惯性力法——把动力学当静力学做',
     q:'m₁=2 kg 叠在 m₂=4 kg 上，层间 μ=0.3，地面光滑。用 F=15 N 拉下层 m₂。站在 m₂ 上（非惯性系）看，m₁ 受惯性力多大？会不会相对滑动？',
     params:{mode:7,m1:2,m2:4,mu:0.3,th:30,F:15,al:0,g:10,inert:1,nif:1},
     answer:'★ 先判是否共同运动：F* = μ(m₁+m₂)g = 0.3×60 = 18 N\n'+'　F = 15 N ＜ 18 N → 共同运动，a = F/(m₁+m₂) = 15/6 = 2.5 m/s²\n\n'+
      '★ 跳到跟着 m₂ 一起加速的参考系（非惯性系）：\n'+
      '　在这个系里 m₂ 是"静止"的，m₁ 也"静止"（因为共同运动）\n'+
      '　但牛顿定律不成立，要补一个惯性力：F惯 = −m₁a，方向向后\n'+
      '　F惯 = 2×2.5 = 5 N（向后）\n\n'+
      '★ 于是 m₁ 的受力变成静力平衡问题：\n'+
      '　水平：摩擦 f 与惯性力平衡 → f = F惯 = 5 N\n'+
      '　不滑动条件：f ≤ μ m₁g = 0.3×20 = 6 N\n'+
      '　5 N ≤ 6 N ✓ → 不相对滑动\n\n'+
      '★ 写成不等式就是常见结论：m₁a ≤ μ m₁g　→　a ≤ μg　→　F ≤ μ(m₁+m₂)g\n\n'+
      '【要点】惯性力法的三步：① 选定跟着谁加速的参考系；② 给每个物体加 F惯 = −ma；\n'+
      '　③ 之后就是纯静力学列平衡方程 ΣF′ = 0\n'+
      '【什么时候用】只要题目里有"相对静止""恰好不滑动""角度不变"这类"一起动"的条件，\n'+
      '　用惯性力法通常比在地面系列两遍牛顿第二定律快得多\n'+
      '【注意】惯性力不是真实力：它没有施力物体，也不能出现在地面（惯性）系的三力平衡里\n\n'+
      '👉 本例已自动打开「① 画出惯性力」和「② 用惯性力抽象成受力平衡」，画布下方会给出两个隔离体的受力图'}
  ]
};
/* ===== LINK-END ===== */




/* ===================== 圆周运动实验台 ===================== */
Scenes.circ={
  id:'circ',name:'圆周运动实验台',
  brief:'把「到底是谁在提供向心力」摆到明面上：转盘上靠静摩擦、圆锥摆靠绳的水平分量、过最高点靠重力加张力。'
       +'拖动任一滑块，「需要的 mv²/R」与「能提供的上限」立刻左右对比；按播放就真的动起来——'
       +'摩擦不够会沿螺旋线甩出去，绳不够会当场松掉改成斜抛，车速太快会从桥顶飞出去。',
  params:[
    {key:'mode',label:'情景（0转盘 1圆锥摆 2竖直绳 3竖直杆 4过桥 5传动）',min:0,max:5,step:1,def:0,unit:'0~5'},
    {key:'m',label:'质量 m',min:0.2,max:20,step:0.2,def:2,unit:'kg'},
    {key:'r',label:'半径 / 绳长 / 轨道半径 R',min:0.2,max:5,step:0.1,def:1,unit:'m'},
    {key:'v',label:'速率 v（竖直情景＝最低点速度）',min:0,max:30,step:0.5,def:5,unit:'m/s'},
    {key:'mu',label:'摩擦因数 μ（转盘）',min:0,max:1,step:0.05,def:0.4,unit:''},
    {key:'r2',label:'从动轮半径 r₂（传动）',min:0.1,max:3,step:0.1,def:0.5,unit:'m'},
    {key:'tt',label:'传动类型（0皮带 1齿轮 2共轴）',min:0,max:2,step:1,def:0,unit:'0~2'},
    {key:'bt',label:'桥型（0凸桥 1凹坑）',min:0,max:1,step:1,def:0,unit:'0~1'},
    {key:'g',label:'重力加速度 g',min:9.8,max:10,step:0.1,def:10,unit:'m/s²'}
  ],
  rad:function(d){return d*Math.PI/180;},
  deg:function(r){return r*180/Math.PI;},
  A0:40,                       // 过桥：桥面张角（度）（别开太大，否则桥的侧面本来就该飞车了）
  MODE:['水平转盘（静摩擦提供向心力）','圆锥摆','竖直圆周 · 绳模型','竖直圆周 · 杆模型',
        '汽车过桥（超重与失重）','传动装置（皮带 / 齿轮 / 共轴）'],
  discR:function(P){return Math.max(P.r*1.35,P.r+0.35);},   // 转盘半径（比物体所在半径大一圈，方便看甩出）
  /* 竖直圆周：沿角度 φ（从最低点起算）的瞬时量 */
  at:function(P,phi){
    var m=P.m,g=P.g,R0=P.r,v0=P.v;
    var v2=v0*v0-2*g*R0*(1-Math.cos(phi));
    if(v2<0)v2=0;
    return {v2:v2,v:Math.sqrt(v2),Fn:m*v2/R0,F:m*v2/R0+m*g*Math.cos(phi)};
  },
  /* 传动的两个轮心 */
  wheels:function(P){
    var r=P.r,r2=Math.max(P.r2,0.05);
    if(P.tt===2)return {o1:[0,0],o2:[0,0],r:r,rr:r2,coax:1};
    var gap=(P.tt===1)?0.02:0.55;
    var D=r+r2+gap;
    return {o1:[-D*r/(r+r2)*0.5-D*0.0,0],o2:[0,0],r:r,rr:r2,coax:0,D:D,gap:gap};
  },
  /* ---------- 核心解算（纯函数；转盘/桥会用到 st 里的实时位置） ---------- */
  solve:function(st,P){
    var S=Scenes.circ,m=P.m,g=P.g,r=Math.max(P.r,0.05),v=Math.max(P.v,0);
    var R={mode:P.mode,m:m,g:g,r:r,v:v};
    R.w=v/r;                                   // 角速度 ω = v/r
    R.per=(v>1e-9)?2*Math.PI*r/v:0;            // 周期 T = 2πr/v
    R.a=v*v/r;                                 // 向心加速度
    R.Fn=m*v*v/r;                              // 所需向心力 mv²/R
    if(P.mode===0){
      R.fmax=P.mu*m*g;R.need=R.Fn;
      R.slip=R.need>R.fmax+1e-9;               // 站在 r 处够不够
      R.vc=Math.sqrt(P.mu*g*r);                // 临界线速度 √(μgr)
      R.wc=Math.sqrt(P.mu*g/r);                // 临界角速度 √(μg/r)
      R.rd=S.discR(P);
      var d=(st&&isFinite(st.d))?st.d:r;
      R.d=d;R.needD=m*R.w*R.w*d;               // 当前半径处的实际需求（甩出去的过程中 d 在变）
      R.slipD=R.needD>R.fmax+1e-9;
      R.f=Math.min(R.needD,R.fmax);
    }else if(P.mode===1){
      var L=r,k=v*v/(g*L);
      var c=clamp((-k+Math.sqrt(k*k+4))/2,1e-9,1);   // cosθ：由 sin²θ/cosθ = v²/(gL) 解出
      R.th=S.deg(Math.acos(c));               // 绳与竖直方向的夹角
      R.rc=L*Math.sin(S.rad(R.th));           // 圆周半径
      R.hh=L*Math.cos(S.rad(R.th));           // 悬点到圆心的竖直距离
      R.om=(R.rc>1e-6)?v/R.rc:0;
      R.w=R.om;                               // 圆锥摆的 ω 是绕竖直轴转的角速度 v/R
      R.Fn=m*v*v/Math.max(R.rc,1e-9);         // 向心力用圆周半径 R=L sinθ，不是绳长
      R.a=v*v/Math.max(R.rc,1e-9);
      R.per=(R.rc>1e-6&&v>1e-9)?2*Math.PI*R.rc/v:0;
      R.Tt=m*g/c;                             // T = mg/cosθ
      R.Tw=R.Tt*Math.sin(S.rad(R.th));        // 张力的水平分量 = 向心力
      R.wc=Math.sqrt(g/L);                    // 最小角速度（θ→0 的极限）
    }else if(P.mode===2||P.mode===3){
      var v0=v;R.v0=v0;
      R.vtop2=v0*v0-4*g*r;                    // 最高点速度平方（机械能守恒）
      R.vtop=(R.vtop2>0)?Math.sqrt(R.vtop2):0;
      R.Tlow=m*v0*v0/r+m*g;                   // 最低点：F = mv²/R + mg
      R.Thigh=m*R.vtop2/r-m*g;                // 最高点：F = mv²/R − mg（负＝杆在"推"）
      if(P.mode===2){
        R.v0c=Math.sqrt(5*g*r);               // 绳：过最高点所需的最低点速度 √(5gR)
        R.vtopc=Math.sqrt(g*r);
        R.full=R.vtop2>=g*r-1e-9;
        var cs=(2*g*r-v0*v0)/(3*g*r);         // 绳松弛处的 cosφ
        R.leave=R.full?null:S.deg(Math.acos(clamp(cs,-1,1)));
        R.hold=R.vtop2>=2*g*r;                // 能摆到等高（φ=90°）以上
      }else{
        R.v0c=Math.sqrt(4*g*r);               // 杆：最高点 v=0 即可
        R.vtopc=0;R.full=R.vtop2>=-1e-9;R.leave=null;R.hold=R.vtop2>=0;
      }
      var q=S.at(P,(st&&isFinite(st.phi)&&!st.free)?st.phi:0);
      R.curv=q.v;R.curF=q.F;R.curFn=q.Fn;
    }else if(P.mode===4){
      var al=(st&&isFinite(st.al))?st.al:0;
      R.al=al;R.bt=P.bt;R.G=m*g;
      R.N=m*g*Math.cos(al)+((P.bt===0)?(-m*v*v/r):(m*v*v/r));
      R.vc=Math.sqrt(g*r);                    // 凸桥飞车的临界速度 √(gR)
      R.fly=(P.bt===0)&&(R.N<=-1e-9);
      R.ratio=(R.G>0)?R.N/R.G:0;
      R.dN=R.N-R.G;                           // 与平地相比的"超重/失重"量
    }else{
      var w1=v/r,w2,r2=Math.max(P.r2,0.05);
      if(P.tt===2)w2=w1; else w2=v/r2*((P.tt===1)?-1:1);
      R.w1=w1;R.w2=w2;R.r2=r2;R.tt=P.tt;
      R.v1=v;R.v2=Math.abs(w2)*r2;
      R.a1=v*v/r;R.a2=R.v2*R.v2/r2;
      R.F1=m*R.a1;R.F2=m*R.a2;
      R.ratioW=(Math.abs(w2)>1e-9)?Math.abs(w1/w2):0;
    }
    return R;
  },
  /* ---------- 状态 ---------- */
  init:function(P){
    var S=Scenes.circ;
    var st={t:0,x:0,y:0,vx:0,vy:0,ang:0,phi:0,dir:1,free:0,off:0,slip:0,
            al:-S.rad(S.A0),a1:0,a2:0,d:P.r,laps:0};
    var R=S.solve(st,P);
    if(P.mode===0){st.x=P.r;st.y=0;st.vx=0;st.vy=P.v;st.d=P.r;st.ang=0;}
    else if(P.mode===1){st.ang=0;st.x=R.rc;st.y=-R.hh;}
    else if(P.mode===2||P.mode===3){st.phi=0;st.x=0;st.y=0;st.vx=P.v;st.vy=0;}
    else if(P.mode===4){
      if(P.bt===0){st.x=P.r*Math.sin(st.al);st.y=P.r*Math.cos(st.al);}
      else{st.x=P.r*Math.sin(st.al);st.y=2*P.r-P.r*Math.cos(st.al);}
    }
    st.s0x=st.x;st.s0y=st.y;
    return st;
  },
  step:function(st,P,h){
    var S=Scenes.circ,R=S.solve(st,P),g=P.g;
    if(P.mode===0){
      var w=(P.r>1e-6)?P.v/P.r:0;                 // 盘的角速度恒定
      if(st.off){st.x+=st.vx*h;st.y+=st.vy*h;st.d=Math.hypot(st.x,st.y);return;}
      var d=Math.hypot(st.x,st.y)||1e-9;
      var px=-w*st.y,py=w*st.x;                   // 盘面上这一点的速度
      var rvx=st.vx-px,rvy=st.vy-py,rs=Math.hypot(rvx,rvy);
      if(rs>1e-4){                                // 已经在滑：动摩擦沿相对速度的反方向
        var a=P.mu*g;
        st.vx-=a*rvx/rs*h;st.vy-=a*rvy/rs*h;st.slip=1;
      }else{
        var need=w*w*d;
        if(need<=P.mu*g+1e-9){                    // 静摩擦够：跟着盘转
          var ca=Math.cos(w*h),sa=Math.sin(w*h);  // 直接转角度，避免欧拉积分把半径越走越大
          var nx=st.x*ca-st.y*sa,ny=st.x*sa+st.y*ca;
          st.x=nx;st.y=ny;
          st.vx=-w*st.y;st.vy=w*st.x;             // 速度也要按「转完之后」的位置取，否则会被误判成打滑
          st.slip=0;st.ang=Math.atan2(st.y,st.x);st.d=d;
          return;
        }
        else{st.vx+=(st.x/d)*1e-3;st.vy+=(st.y/d)*1e-3;st.slip=1;} // 不够：开始往外滑
      }
      st.x+=st.vx*h;st.y+=st.vy*h;
      st.d=Math.hypot(st.x,st.y);st.ang=Math.atan2(st.y,st.x);
      if(st.d>R.rd)st.off=1;                      // 滑出盘边 → 之后走直线
      return;
    }
    if(P.mode===1){                               // 圆锥摆：匀速转圈
      st.ang+=(R.om||0)*h;
      st.x=R.rc*Math.cos(st.ang);st.y=-R.hh+0.34*R.rc*Math.sin(st.ang);
      return;
    }
    if(P.mode===2||P.mode===3){
      if(st.free){st.vy-=g*h;st.x+=st.vx*h;st.y+=st.vy*h;return;}
      var q=S.at(P,st.phi),R0=P.r;
      if(P.mode===2&&q.F<-1e-9){                  // 绳松了 → 就地改成斜抛
        st.free=1;
        st.vx=Math.cos(st.phi)*q.v*st.dir;st.vy=Math.sin(st.phi)*q.v*st.dir;
        st.x=R0*Math.sin(st.phi);st.y=R0*(1-Math.cos(st.phi));
        return;
      }
      if(q.v<=1e-6&&st.dir>0)st.dir=-1;           // 杆：爬到最高处速度耗尽，往回摆
      if(st.phi<=0&&st.dir<0){st.phi=0;st.dir=1;}
      st.phi+=st.dir*(q.v/R0)*h;
      if(st.phi<0){st.phi=0;st.dir=1;}
      if(st.phi>=Math.PI*2){st.phi-=Math.PI*2;st.laps++;}
      var q2=S.at(P,st.phi);                      // 用「更新后」的 φ 重算，位置与速度才自洽（能量严格守恒）
      st.x=R0*Math.sin(st.phi);st.y=R0*(1-Math.cos(st.phi));
      st.vx=Math.cos(st.phi)*q2.v*st.dir;st.vy=Math.sin(st.phi)*q2.v*st.dir;
      return;
    }
    if(P.mode===4){
      if(st.free){st.vy-=g*h;st.x+=st.vx*h;st.y+=st.vy*h;return;}
      st.al+=((P.r>1e-6)?P.v/P.r:0)*h;
      if(P.bt===0){st.x=P.r*Math.sin(st.al);st.y=P.r*Math.cos(st.al);}
      else{st.x=P.r*Math.sin(st.al);st.y=2*P.r-P.r*Math.cos(st.al);}
      var N=P.m*g*Math.cos(st.al)-P.m*P.v*P.v/P.r;
      if(P.bt===0&&N<-1e-9){                      // 凸桥：支持力归零就飞出去了
        st.free=1;st.vx=P.v*Math.cos(st.al);st.vy=-P.v*Math.sin(st.al);
      }
      return;
    }
    var w1=(P.r>1e-6)?P.v/P.r:0,w2;
    if(P.tt===2)w2=w1; else w2=(P.r2>1e-6?P.v/P.r2:0)*((P.tt===1)?-1:1);
    st.a1+=w1*h;st.a2+=w2*h;
  },
  finished:function(st,P){
    var S=Scenes.circ;
    if(P.mode===0)return st.t>=16||(st.off&&Math.hypot(st.x,st.y)>S.discR(P)*2.2);
    if(P.mode===1)return st.ang>=Math.PI*6||st.t>=16;
    if(P.mode===2||P.mode===3)return (st.free&&st.y<-1.4)||st.t>=24||(st.laps>=2);
    if(P.mode===4)return st.al>=S.rad(S.A0)||(st.free&&st.y<-1.5)||st.t>=24;
    return st.t>=16;
  },
  trailPoint:function(st,P){
    if(P.mode===5)return null;
    return [st.x,st.y];
  },
  /* ---------- 输出 ---------- */
  stage:function(st,P){
    var S=Scenes.circ,R=S.solve(st,P);
    if(P.mode===0){
      if(st.off)return '已经甩出转盘！摩擦根本拉不住——之后沿切线方向做匀速直线运动（离心不是"离心力"）';
      if(R.slipD)return '正在打滑：需要 mv²/r='+fmt(R.needD,1)+' N ＞ 上限 μmg='+fmt(R.fmax,1)+' N，'+
        '半径越大越拉不住，于是沿螺旋线甩出去';
      return '静摩擦够用：f='+fmt(R.needD,1)+' N ≤ μmg='+fmt(R.fmax,1)+' N，物体随转盘匀速转动；'+
        '临界 v=√(μgr)='+fmt(R.vc,2)+' m/s';
    }
    if(P.mode===1)return '圆锥摆：绳与竖直成 θ='+fmt(R.th,1)+'°，张力 T='+fmt(R.Tt,2)+' N，'+
      'T 的水平分量 '+fmt(R.Tw,2)+' N 正好等于向心力 '+fmt(R.Fn,2)+' N';
    if(P.mode===2){
      if(st.free)return '绳松了！张力归零后小球不再受约束，就地改成斜抛运动';
      if(!R.full)return '过不了最高点：最高点需要 v≥√(gR)='+fmt(R.vtopc,2)+' m/s，'+
        '而它只能带到 '+fmt(R.vtop,2)+' m/s，会在 φ≈'+fmt(R.leave,0)+'° 附近松绳';
      return '完整圆周 ✓　最低点张力 '+fmt(R.Tlow,1)+' N，最高点 '+fmt(Math.max(R.Thigh,0),1)+' N'+
        '（临界最低点速度 √(5gR)='+fmt(R.v0c,2)+' m/s）';
    }
    if(P.mode===3){
      return '杆模型：'+(R.full?'能过最高点（最高点 v='+fmt(R.vtop,2)+' m/s）'
        :'到不了最高点，会摆回来（最高只能到 φ≈'+fmt(S.deg(Math.acos(clamp(1-P.v*P.v/(2*P.g*P.r),-1,1))),0)+'°）')+
        '；杆的弹力可为负（在"推"小球）—— 这是它和绳唯一的差别';
    }
    if(P.mode===4){
      if(st.free)return '飞车了！桥顶 N 归零，车脱离桥面做平抛——这就是"失重到极致"';
      return (P.bt===0?'凸桥':'凹坑')+'：支持力 N='+fmt(R.N,1)+' N（平地是 '+fmt(R.G,1)+' N）→ '+
        (R.N>R.G+1e-6?'超重':(R.N<R.G-1e-6?'失重':'刚好等于重力'));
    }
    var tp=(P.tt===0?'皮带':(P.tt===1?'齿轮':'共轴'));
    return tp+'传动：ω₁='+fmt(R.w1,2)+' rad/s，ω₂='+fmt(Math.abs(R.w2),2)+' rad/s；'+
      '边缘线速度 '+(P.tt===2?'不等（v=ωr）':'相等 v='+fmt(R.v1,2)+' m/s')+
      '；向心加速度 '+fmt(R.a1,2)+' / '+fmt(R.a2,2)+' m/s²';
  },
  vel:function(st,P){
    var S=Scenes.circ,R=S.solve(st,P),v=0,w=0;
    if(P.mode===5){v=R.v1;w=Math.abs(R.w1);}
    else if(P.mode===0){v=Math.hypot(st.vx,st.vy);w=(st.d>1e-6)?v/st.d:R.w;}
    else if(P.mode===2||P.mode===3){
      v=st.free?Math.hypot(st.vx,st.vy):S.at(P,st.phi).v;w=(P.r>1e-6)?v/P.r:0;
    }
    else{v=R.v;w=R.w;}
    return [{label:'速率 v',color:'#2563eb',value:v},
            {label:'角速度 ω',color:'#22d3ee',value:w}];
  },
  en:function(st,P){
    var S=Scenes.circ,R=S.solve(st,P);
    if(P.mode===0)return [{label:'摩擦力 f',color:'#dc2626',value:R.f},
                          {label:'向心力需求 mv²/r',color:'#16a34a',value:R.needD}];
    if(P.mode===1)return [{label:'绳张力 T',color:'#dc2626',value:R.Tt},
                          {label:'向心力 mv²/R',color:'#16a34a',value:R.Fn}];
    if(P.mode===2||P.mode===3){
      var q=st.free?{Fn:0,F:0}:S.at(P,st.phi);
      return [{label:(P.mode===2?'绳张力 T':'杆的弹力 N'),color:'#dc2626',value:q.F},
              {label:'向心力 mv²/R',color:'#16a34a',value:q.Fn}];
    }
    if(P.mode===4)return [{label:'支持力 N',color:'#dc2626',value:Math.max(R.N,0)},
                          {label:'向心力 mv²/R',color:'#16a34a',value:R.Fn}];
    return [{label:'轮1 向心力',color:'#dc2626',value:R.F1},
            {label:'轮2 向心力',color:'#16a34a',value:R.F2}];
  },
  info:function(st,P){
    var S=Scenes.circ,R=S.solve(st,P),rows=[['情景',S.MODE[P.mode]]];
    if(P.mode===0){
      rows.push(['角速度 ω = v/r',fmt(R.w,3)+' rad/s'],
        ['周期 T = 2πr/v',fmt(R.per,3)+' s　转速 n='+fmt(R.w/(2*Math.PI),2)+' r/s'],
        ['向心加速度 a = v²/r',fmt(R.a,3)+' m/s²'],
        ['需要的向心力 mv²/r',fmt(R.needD,2)+' N'],
        ['静摩擦上限 μmg',fmt(R.fmax,2)+' N'],
        ['当前摩擦力 f',fmt(R.f,2)+' N'+(R.slipD?'　→ 已打滑':'')],
        ['临界线速度 √(μgr)',fmt(R.vc,3)+' m/s'],
        ['临界角速度 √(μg/r)',fmt(R.wc,3)+' rad/s'],
        ['离轴距离 r',fmt(R.d,2)+' m（盘半径 '+fmt(R.rd,2)+' m）'],
        ['状态',R.slipD?'打滑 → 离心运动':'随盘匀速圆周运动'],
        ['⚠ 易错','离心运动不是"受到离心力"，而是摩擦不够、物体因惯性沿切线飞出']);
      return rows;
    }
    if(P.mode===1){
      rows.push(['绳长 L',fmt(P.r,2)+' m'],
        ['绳与竖直方向夹角 θ',fmt(R.th,2)+'°'],
        ['圆周半径 R = L sinθ',fmt(R.rc,3)+' m'],
        ['悬点到圆心的高度 h = L cosθ',fmt(R.hh,3)+' m'],
        ['角速度 ω = v/R',fmt(R.om,3)+' rad/s'],
        ['周期 T = 2πR/v',fmt(R.per,3)+' s'],
        ['向心力 mv²/R',fmt(R.Fn,3)+' N'],
        ['张力 T = mg/cosθ',fmt(R.Tt,3)+' N'],
        ['校验：T 的水平分量 = 向心力',fmt(R.Tw,3)+' N ／ '+fmt(R.Fn,3)+' N'],
        ['校验：T 的竖直分量 = mg',fmt(R.Tt*Math.cos(S.rad(R.th)),3)+' N ／ '+fmt(P.m*P.g,3)+' N'],
        ['最小角速度 √(g/L)',fmt(R.wc,3)+' rad/s　（θ→0 的极限，ω 再小就摆不起来）'],
        ['⚠ 易错','向心力是合力（= T 的水平分量），不是某个单独的力；T ≠ mv²/R']);
      return rows;
    }
    if(P.mode===2||P.mode===3){
      var isR=(P.mode===2),q=st.free?{v:Math.hypot(st.vx,st.vy),F:0,Fn:0}:S.at(P,st.phi);
      rows.push(['轨道半径 R',fmt(P.r,2)+' m'],
        ['最低点速度 v₀',fmt(P.v,2)+' m/s'],
        ['当前位置 φ（离最低点）',st.free?'已脱离圆周':fmt(S.deg(st.phi),1)+'°'],
        ['当前速率 v',fmt(q.v,3)+' m/s'],
        ['当前向心力 mv²/R',fmt(q.Fn,3)+' N'],
        ['当前'+(isR?'绳张力 T':'杆的弹力 N'),fmt(q.F,3)+' N'+(q.F<-1e-9?'（负＝杆在推）':'')],
        ['最低点作用力（mv₀²/R + mg）',fmt(R.Tlow,3)+' N'],
        ['最高点速度 v顶',fmt(R.vtop,3)+' m/s'+(R.vtop2<0?'（到不了）':'')],
        ['最高点作用力（mv顶²/R − mg）',fmt(R.Thigh,3)+' N'],
        [isR?'过最高点条件':'过最高点条件',
         isR?('v顶 ≥ √(gR) = '+fmt(R.vtopc,3)+' m/s　⇔　v₀ ≥ √(5gR) = '+fmt(R.v0c,3)+' m/s')
            :('v顶 ≥ 0　⇔　v₀ ≥ √(4gR) = '+fmt(R.v0c,3)+' m/s')],
        ['状态',st.free?'绳已松弛 → 斜抛':(R.full?'能完成完整圆周':(isR?('会在 φ≈'+fmt(R.leave,1)+'° 处松绳'):'到不了最高点，往复摆动'))],
        ['⚠ 易错',isR?'绳只能拉不能推：张力一归零就松，之后是斜抛不是圆周'
                     :'杆既能拉也能推：弹力可以为负，所以最高点速度可以为 0']);
      return rows;
    }
    if(P.mode===4){
      rows.push(['桥的半径 R',fmt(P.r,2)+' m'],
        ['车速 v',fmt(P.v,2)+' m/s'],
        ['当前位置 α（离桥顶/坑底）',st.free?'已脱离桥面':fmt(S.deg(Math.abs(R.al)),1)+'°'],
        ['向心力 mv²/R',fmt(R.Fn,2)+' N'],
        ['重力 mg',fmt(R.G,2)+' N'],
        ['支持力 N',fmt(Math.max(R.N,0),2)+' N'],
        ['N / mg（视重比）',fmt(R.ratio,3)+(R.N>R.G+1e-6?'　超重':(R.N<R.G-1e-6?'　失重':'　等重'))],
        ['飞车临界速度 √(gR)',fmt(R.vc,3)+' m/s'+(P.bt===0?'':'（凹坑不会飞车，只会越来越重）')],
        ['状态',st.free?'N=0 → 车已飞离桥面，做平抛':(P.bt===0?'贴着凸桥面走':'贴着凹坑底走')],
        ['⚠ 易错','失重不是"重力变小"，重力仍是 mg，变小的是支持力 N（视重）']);
      return rows;
    }
    rows.push(['主动轮半径 r₁',fmt(P.r,2)+' m'],
      ['从动轮半径 r₂',fmt(P.r2,2)+' m'],
      ['主动轮角速度 ω₁ = v/r₁',fmt(R.w1,3)+' rad/s'],
      ['从动轮角速度 ω₂',fmt(R.w2,3)+' rad/s'+(P.tt===1?'（齿轮啮合：反向）':(P.tt===2?'（共轴：同速）':'（皮带：同向）'))],
      ['轮1 边缘线速度 v₁',fmt(R.v1,3)+' m/s'],
      ['轮2 边缘线速度 v₂',fmt(R.v2,3)+' m/s'],
      ['向心加速度 a₁ = v₁²/r₁',fmt(R.a1,3)+' m/s²'],
      ['向心加速度 a₂ = v₂²/r₂',fmt(R.a2,3)+' m/s²'],
      ['传动比 ω₁:ω₂',fmt(Math.abs(R.ratioW),3)+' : 1'],
      ['结论',(P.tt===2?'共轴：ω 相同 → a ∝ r（半径大的向心加速度大）'
                     :'皮带/齿轮：边缘线速度 v 相同 → a ∝ 1/r（半径大的向心加速度小）')],
      ['⚠ 易错','同一根皮带上的各点线速度相等；但同一轮上除同轴外各点角速度相等——先判"谁跟谁相等"']);
    return rows;
  },
  bounds:function(st,P){
    var S=Scenes.circ,R=S.solve(st,P);
    if(P.mode===0){var q=Math.max(R.rd,P.r)*1.3;return {x:[-q,q],y:[-q,q]};}
    if(P.mode===1){var w=Math.max(R.rc*1.35,0.7);return {x:[-w,w],y:[-R.hh-P.r*0.16-0.55,0.4]};}
    if(P.mode===2||P.mode===3)return {x:[-P.r-0.9,P.r+1.5],y:[-0.7,2*P.r+1.0]};
    if(P.mode===4){
      var ww=P.r*Math.sin(S.rad(S.A0))+0.8;
      if(P.bt===0)return {x:[-ww,ww],y:[P.r*Math.cos(S.rad(S.A0))-0.7,P.r+0.8]};
      return {x:[-ww,ww],y:[P.r-0.8,2*P.r+0.5]};
    }
    if(P.tt===2){var e=Math.max(P.r,P.r2)+0.7;return {x:[-e,e],y:[-e,e]};}
    var D=P.r+Math.max(P.r2,0.05)+((P.tt===1)?0.02:0.55);
    var o1x=-D/2,o2x=D/2,ex=Math.max(P.r,P.r2)+0.7;
    return {x:[o1x-ex,o2x+ex],y:[-ex,ex]};
  },
  /* ---------- 绘制 ---------- */
  draw:function(g,st,P,V,opt){
    var S=Scenes.circ,R=S.solve(st,P);
    if(P.mode===0)S.sceneDisc(g,st,P,V,R,opt);
    else if(P.mode===1)S.sceneCone(g,st,P,V,R,opt);
    else if(P.mode===2||P.mode===3)S.sceneVert(g,st,P,V,R,opt);
    else if(P.mode===4)S.sceneBridge(g,st,P,V,R,opt);
    else S.sceneGear(g,st,P,V,R,opt);
  },
  ball:function(g,X,Y,rr,col){
    var gr=g.createRadialGradient(X-rr*0.35,Y-rr*0.4,rr*0.15,X,Y,rr);
    gr.addColorStop(0,'#fff');gr.addColorStop(0.45,col||'#93c5fd');gr.addColorStop(1,'#1d4ed8');
    g.beginPath();g.arc(X,Y,rr,0,6.2832);g.fillStyle=gr;g.fill();
    g.strokeStyle='#1e40af';g.lineWidth=1.6;g.stroke();
  },
  /* ---- 情景 0：水平转盘（俯视） ---- */
  sceneDisc:function(g,st,P,V,R,opt){
    var S=this,cx=V.sx(0),cy=V.sy(0),rd=R.rd*V.scale;
    var gr=g.createRadialGradient(cx,cy,rd*0.1,cx,cy,rd);
    gr.addColorStop(0,'#f8fafc');gr.addColorStop(1,'#dbe3ec');
    g.beginPath();g.arc(cx,cy,rd,0,6.2832);g.fillStyle=gr;g.fill();
    g.strokeStyle='#94a3b8';g.lineWidth=2;g.stroke();
    g.save();g.strokeStyle='rgba(148,163,184,.5)';g.lineWidth=1;
    for(var i=1;i<=3;i++){g.beginPath();g.arc(cx,cy,rd*i/4,0,6.2832);g.stroke();}
    g.restore();
    g.save();g.setLineDash([3,4]);g.strokeStyle='rgba(100,116,139,.55)';g.lineWidth=1.2;
    g.beginPath();g.moveTo(cx,cy);g.lineTo(V.sx(st.x),V.sy(st.y));g.stroke();g.restore();
    g.beginPath();g.arc(cx,cy,4,0,6.2832);g.fillStyle='#475569';g.fill();
    label(g,cx+8,cy+2,'转轴','#64748b','left');
    label(g,(cx+V.sx(st.x))/2+6,(cy+V.sy(st.y))/2-8,'r='+fmt(R.d,2)+' m','#64748b','left');
    var X=V.sx(st.x),Y=V.sy(st.y);
    this.ball(g,X,Y,Math.max(8,Math.min(0.22*V.scale,17)),st.slip?'#fca5a5':'#93c5fd');
    if(opt.vec){
      var d=Math.max(Math.hypot(st.x,st.y),1e-6),ux=st.x/d,uy=st.y/d;
      var sc=Math.min(0.9*V.scale,46)/Math.max(Math.hypot(st.vx,st.vy),1e-6);
      if(isFinite(sc))arrow(g,X,Y,X+st.vx*sc,Y-st.vy*sc,'#2563eb',2.2);
      label(g,X+st.vx*sc+6,Y-st.vy*sc-6,'v','#2563eb','left');
      var fl=Math.min(R.f*0.55+10,60);
      arrow(g,X,Y,X-ux*fl,Y+uy*fl,'#16a34a',2.2);
      label(g,X-ux*fl-4,Y+uy*fl+10,'f（指向心）','#16a34a','center');
    }
    label(g,V.sx(-R.rd)+4,V.sy(R.rd)+14,'转盘 ω='+fmt(R.w,2)+' rad/s','#64748b','left');
  },
  /* ---- 情景 1：圆锥摆（斜二测） ---- */
  sceneCone:function(g,st,P,V,R,opt){
    var S=this,AX=V.sx(0),AY=V.sy(0);
    g.strokeStyle='#94a3b8';g.lineWidth=3;
    g.beginPath();g.moveTo(AX,AY);g.lineTo(AX+16,V.sy(0)-14);g.stroke();
    g.beginPath();g.moveTo(AX-1,AY);g.lineTo(AX-1,AY-30);g.stroke();
    var X=V.sx(st.x),Y=V.sy(st.y);
    var ey=V.sy(-R.hh),rx=R.rc*V.scale,ry=0.34*R.rc*V.scale;
    g.save();g.setLineDash([4,4]);g.strokeStyle='rgba(37,99,235,.45)';g.lineWidth=1.4;
    g.beginPath();g.ellipse(V.sx(0),ey,rx,ry,0,0,6.2832);g.stroke();g.restore();
    g.save();g.setLineDash([2,4]);g.strokeStyle='rgba(148,163,184,.7)';g.lineWidth=1;
    g.beginPath();g.moveTo(AX,AY);g.lineTo(AX,V.sy(-R.hh));g.stroke();g.restore();
    g.strokeStyle='#475569';g.lineWidth=2.2;
    g.beginPath();g.moveTo(AX,AY);g.lineTo(X,Y);g.stroke();
    var rrp=Math.abs(R.th)>0.5?Math.min(34,Math.abs(R.th)*0.9+12):0;
    if(rrp>4){
      g.strokeStyle='#a3a3a3';g.lineWidth=1.4;
      g.beginPath();g.arc(AX,AY,rrp,-Math.PI/2,-Math.PI/2+S.rad(R.th),R.th<0);g.stroke();
      label(g,AX+rrp*0.75,AY-rrp*0.55,'θ='+fmt(R.th,1)+'°','#64748b','left');
    }
    if(opt.vec){
      var d=Math.max(Math.abs(st.x),1e-6),sgn=(st.x>=0?1:-1);
      var vl=Math.min(0.8*V.scale,42);
      var tvx=(Math.sin(st.ang)>0?1:-1);
      arrow(g,X,Y,X-tvx*vl*0.5,Y-vl*0.34*0.5,'#2563eb',2.2);
      label(g,X-tvx*vl*0.5,Y-vl*0.17-8,'v','#2563eb','left');
      arrow(g,X,Y,X+Math.cos(Math.atan2(Y-AY,X-AX))*vl*0.6,Y+Math.sin(Math.atan2(Y-AY,X-AX))*vl*0.6,'#dc2626',2.2);
      label(g,X+10,Y+22,'T','#dc2626','left');
      arrow(g,X,Y,X,Y+Math.min(R.Fn*0.5+10,50),'#94a3b8',2);
      label(g,X+8,Y+Math.min(R.Fn*0.5+10,50)+10,'mg','#64748b','left');
    }
    this.ball(g,X,Y,Math.max(9,Math.min(0.24*V.scale,18)));
    label(g,V.sx(0)+6,V.sy(-R.hh)-ry-8,'R='+fmt(R.rc,2)+' m','#64748b','left');
    label(g,V.sx(0)-10,(AY+V.sy(-R.hh))/2,'h='+fmt(R.hh,2)+' m','#64748b','right');
  },
  /* ---- 情景 2/3：竖直圆周 ---- */
  sceneVert:function(g,st,P,V,R,opt){
    var S=this,cx=V.sx(0),cy=V.sy(P.r),rr=P.r*V.scale,isR=(P.mode===2);
    g.save();g.setLineDash([6,5]);g.strokeStyle='rgba(148,163,184,.75)';g.lineWidth=1.6;
    g.beginPath();g.arc(cx,cy,rr,0,6.2832);g.stroke();g.restore();
    g.beginPath();g.arc(cx,cy,3.5,0,6.2832);g.fillStyle='#94a3b8';g.fill();
    label(g,cx+6,cy-8,'O','#94a3b8','left');
    var X=V.sx(st.x),Y=V.sy(st.y);
    if(!st.free){
      if(isR){g.strokeStyle='#475569';g.lineWidth=2.2;
        g.beginPath();g.moveTo(cx,cy);g.lineTo(X,Y);g.stroke();}
      else{var dx=X-cx,dy=Y-cy,dd=Math.hypot(dx,dy)||1;
        g.strokeStyle='#0f766e';g.lineWidth=5;g.lineCap='round';
        g.beginPath();g.moveTo(cx,cy);g.lineTo(X,Y);g.stroke();g.lineCap='butt';}
      g.save();g.setLineDash([3,4]);g.strokeStyle='rgba(148,163,184,.6)';g.lineWidth=1;
      g.beginPath();g.moveTo(cx,V.sy(0));g.lineTo(cx,V.sy(2*P.r));g.stroke();g.restore();
      g.fillStyle='#94a3b8';
      g.beginPath();g.arc(cx,V.sy(0),3,0,6.2832);g.fill();
      g.beginPath();g.arc(cx,V.sy(2*P.r),3,0,6.2832);g.fill();
      label(g,cx-8,V.sy(0)-12,'最低点','#94a3b8','right');
      label(g,cx-8,V.sy(2*P.r)+12,'最高点','#94a3b8','right');
      var q=S.at(P,st.phi);
      label(g,cx+10,V.sy(2*P.r)+24,'v顶='+fmt(R.vtop,2)+' m/s　'+(isR?'T':'N')+'顶='+fmt(R.Thigh,2)+' N','#64748b','left');
      label(g,cx+10,V.sy(0)-24,'v₀='+fmt(P.v,2)+' m/s　'+(isR?'T':'N')+'低='+fmt(R.Tlow,2)+' N','#64748b','left');
      if(opt.vec){
        var vl=Math.min(0.75*V.scale,40),sp=Math.hypot(st.vx,st.vy)||1;
        arrow(g,X,Y,X+st.vx/sp*vl,Y-st.vy/sp*vl,'#2563eb',2.2);
        label(g,X+st.vx/sp*vl+6,Y-st.vy/sp*vl-6,'v','#2563eb','left');
        var ux=(cx-X)/dd,uy=(Y-cy)/dd;      // 指向圆心（屏幕坐标）
        var fl=Math.min(Math.abs(q.F)*0.5+12,58);
        if(q.F>=0){arrow(g,X,Y,X+ux*fl,Y-uy*fl,'#dc2626',2.2);
          label(g,X+ux*fl+6,Y-uy*fl,(isR?'T':'N'),'#dc2626','left');}
        else{arrow(g,X,Y,X-ux*fl,Y+uy*fl,'#dc2626',2.2);
          label(g,X-ux*fl+6,Y+uy*fl,(isR?'T':'N（杆在推）'),'#dc2626','left');}
        arrow(g,X,Y,X,Y+Math.min(P.m*P.g*0.5+10,48),'#94a3b8',2);
        label(g,X+8,Y+Math.min(P.m*P.g*0.5+10,48)+10,'mg','#64748b','left');
      }
    }else{
      g.save();g.setLineDash([4,4]);g.strokeStyle='rgba(220,38,38,.5)';g.lineWidth=1.4;
      g.beginPath();g.arc(cx,cy,rr,0,6.2832);g.stroke();g.restore();
      label(g,cx,cy-rr-10,(isR?'绳已松弛 → 斜抛':'已脱离轨道'),'#dc2626','center');
    }
    this.ball(g,X,Y,Math.max(9,Math.min(0.24*V.scale,18)));
  },
  /* ---- 情景 4：汽车过桥 ---- */
  sceneBridge:function(g,st,P,V,R,opt){
    var S=this,a0=S.rad(S.A0),i,n=26;
    var ox=(P.bt===0)?0:0,oy=(P.bt===0)?0:2*P.r;
    var pts=[];
    for(i=0;i<=n;i++){
      var al=-a0+2*a0*i/n;
      if(P.bt===0)pts.push([P.r*Math.sin(al),P.r*Math.cos(al)]);
      else pts.push([P.r*Math.sin(al),2*P.r-P.r*Math.cos(al)]);
    }
    g.strokeStyle='#94a3b8';g.lineWidth=9;g.lineCap='round';
    g.beginPath();
    for(i=0;i<pts.length;i++){var X=V.sx(pts[i][0]),Y=V.sy(pts[i][1]);
      if(i===0)g.moveTo(X,Y);else g.lineTo(X,Y);}
    g.stroke();g.lineCap='butt';
    g.strokeStyle='#cbd5e1';g.lineWidth=2.5;
    g.beginPath();
    for(i=0;i<pts.length;i++){var X2=V.sx(pts[i][0]),Y2=V.sy(pts[i][1])+5;
      if(i===0)g.moveTo(X2,Y2);else g.lineTo(X2,Y2);}
    g.stroke();
    if(P.bt===0){
      g.fillStyle='#e2e8f0';
      g.fillRect(0,V.sy(0),V.W,Math.max(4,(V.sy(-1)-V.sy(0))));
    }
    var X=V.sx(st.x),Y=V.sy(st.y);
    var bw=Math.max(26,Math.min(0.62*V.scale,54)),bh=bw*0.52;
    g.fillStyle='#2563eb';roundRect(g,X-bw/2,Y-bh,bw,bh,4);g.fill();
    g.fillStyle='#1e3a8a';roundRect(g,X-bw*0.28,Y-bh*0.62,bw*0.5,bh*0.5,2);g.fill();
    g.beginPath();g.arc(X-bw*0.3,Y,Math.max(3,bw*0.13),0,6.2832);g.fillStyle='#0f172a';g.fill();
    g.beginPath();g.arc(X+bw*0.3,Y,Math.max(3,bw*0.13),0,6.2832);g.fill();
    if(opt.vec&&!st.free){
      var al2=R.al,ux,uy;
      if(P.bt===0){ux=-Math.sin(al2);uy=-Math.cos(al2);}   // 指向圆心（桥顶上方圆心在 (0,0)）
      else{ux=-Math.sin(al2);uy=Math.cos(al2);}
      var gl=Math.min(P.m*P.g*0.45+10,48);
      arrow(g,X,Y-bh*0.5,X,Y-bh*0.5+gl,'#94a3b8',2);
      label(g,X+8,Y-bh*0.5+gl+8,'mg','#64748b','left');
      var nl=Math.min(Math.max(R.N,0)*0.45+10,52);
      arrow(g,X,Y-bh*0.5,X-ux*nl,Y+uy*nl,'#dc2626',2.2);
      label(g,X-ux*nl-6,Y+uy*nl-6,'N','#dc2626','center');
    }
    label(g,V.sx(0),V.sy((P.bt===0?P.r:2*P.r))+16,
      (P.bt===0?'凸桥':'凹坑')+' R='+fmt(P.r,2)+' m','#64748b','center');
    if(st.free)label(g,X,Y-bh-14,'飞起来了！','#dc2626','center');
  },
  /* ---- 情景 5：传动 ---- */
  sceneGear:function(g,st,P,V,R,opt){
    var S=this,r=P.r,r2=Math.max(P.r2,0.05),i;
    var D=(P.tt===2)?0:(r+r2+((P.tt===1)?0.02:0.55));
    var o1x=(P.tt===2)?0:(-D/2),o2x=(P.tt===2)?0:(D/2);
    function wheel(cx,cy,rad,ang,col,teeth){
      var X=V.sx(cx),Y=V.sy(cy),rr=rad*V.scale;
      var gr=g.createRadialGradient(X-rr*0.3,Y-rr*0.3,rr*0.1,X,Y,rr);
      gr.addColorStop(0,'#f1f5f9');gr.addColorStop(1,'#cbd5e1');
      g.beginPath();g.arc(X,Y,rr,0,6.2832);g.fillStyle=gr;g.fill();
      g.strokeStyle=col;g.lineWidth=2.4;g.stroke();
      if(teeth){                       // 齿轮：外圈一圈小齿
        g.fillStyle=col;
        for(var k=0;k<14;k++){
          var a=ang+k/14*6.2832,tw=Math.max(2.5,rr*0.045);
          g.beginPath();
          g.arc(X,Y,rr+tw*1.1,a-0.055,a+0.055);
          g.arc(X,Y,rr,a+0.075,a+0.145);
          g.closePath();g.fill();
        }
      }
      g.strokeStyle='rgba(71,85,105,.55)';g.lineWidth=1.6;
      for(var j=0;j<4;j++){var aa=ang+j/4*Math.PI;
        g.beginPath();g.moveTo(X,Y);
        g.lineTo(X+Math.cos(aa)*rr*0.9,Y-Math.sin(aa)*rr*0.9);g.stroke();}
      g.beginPath();g.arc(X,Y,Math.max(3,rr*0.09),0,6.2832);g.fillStyle='#475569';g.fill();
    }
    if(P.tt===0){                       // 皮带：两轮的外公切线
      var al=Math.acos(clamp((r-r2)/Math.max(D,1e-6),-1,1));
      var p1a=[o1x+r*Math.cos(al),r*Math.sin(al)],p2a=[o2x+r2*Math.cos(al),r2*Math.sin(al)];
      var p1b=[o1x+r*Math.cos(-al),r*Math.sin(-al)],p2b=[o2x+r2*Math.cos(-al),r2*Math.sin(-al)];
      g.strokeStyle='#475569';g.lineWidth=3.4;
      g.beginPath();g.moveTo(V.sx(p1a[0]),V.sy(p1a[1]));g.lineTo(V.sx(p2a[0]),V.sy(p2a[1]));g.stroke();
      g.beginPath();g.moveTo(V.sx(p1b[0]),V.sy(p1b[1]));g.lineTo(V.sx(p2b[0]),V.sy(p2b[1]));g.stroke();
    }
    if(P.tt===2){wheel(0,0,Math.max(r,r2),st.a2,'#64748b',0);wheel(0,0,r,st.a1,'#2563eb',0);}
    else{
      wheel(o1x,0,r,st.a1,'#2563eb',P.tt===1?1:0);
      wheel(o2x,0,r2,st.a2,'#0f766e',P.tt===1?1:0);
    }
    var X1=V.sx(o1x),Y1=V.sy(0),rr1=r*V.scale;
    if(opt.vec){
      var vl=Math.min(0.7*V.scale,38);
      var e1x=X1+Math.cos(st.a1)*rr1,e1y=Y1-Math.sin(st.a1)*rr1;
      arrow(g,e1x,e1y,e1x-Math.sin(st.a1)*vl,e1y-Math.cos(st.a1)*vl,'#2563eb',2);
      label(g,e1x-Math.sin(st.a1)*vl,e1y-Math.cos(st.a1)*vl-10,'v₁='+fmt(R.v1,2),'#2563eb','center');
      var X2=V.sx(o2x),rr2=r2*V.scale;
      var e2x=X2+Math.cos(st.a2)*rr2,e2y=V.sy(0)-Math.sin(st.a2)*rr2;
      var s2=(R.w2>=0?1:-1);
      arrow(g,e2x,e2y,e2x-Math.sin(st.a2)*vl*s2,e2y-Math.cos(st.a2)*vl*s2,'#0f766e',2);
      label(g,e2x-Math.sin(st.a2)*vl*s2,e2y-Math.cos(st.a2)*vl*s2-10,'v₂='+fmt(R.v2,2),'#0f766e','center');
    }
    label(g,V.sx(o1x),V.sy(0)+Math.max(r,r2)*V.scale+16,'ω₁='+fmt(R.w1,2)+' rad/s　r₁='+fmt(r,2)+' m','#2563eb','center');
    if(P.tt!==2)label(g,V.sx(o2x),V.sy(0)+Math.max(r,r2)*V.scale+16,'ω₂='+fmt(R.w2,2)+' rad/s　r₂='+fmt(r2,2)+' m','#0f766e','center');
  },
  charts:{
    vel:{field:'v',title:'速率 v 与角速度 ω',unit:'m/s · rad/s',
         keys:[{label:'速率 v',color:'#2563eb'},{label:'角速度 ω',color:'#22d3ee',dash:true}]},
    en:{field:'e',title:'约束力与向心力',unit:'N',
        keys:[{label:'约束力（张力 / 支持力 / 摩擦）',color:'#dc2626'},
              {label:'向心力 mv²/R（传动情景为第 2 个轮）',color:'#16a34a',dash:true}]}
  },
  examples:[
   {level:'高考',title:'例1 · 转盘上的临界：ω 一超，人就滑',
    q:'水平转盘半径 0.8 m，物块距轴 0.5 m，μ=0.4，g=10 m/s²。物块不滑动的最大角速度是多少？取 ω=2 rad/s 与 ω=4 rad/s 分别会怎样？',
    params:{mode:0,m:2,r:0.5,v:1,mu:0.4,r2:0.5,tt:0,bt:0,g:10},
    answer:'静摩擦提供向心力：mω²r ≤ μmg　→　ω ≤ √(μg/r)\n'
      +'　ω_max = √(0.4×10/0.5) = √8 = 2.83 rad/s\n'
      +'　对应的临界线速度 v = ωr = 2.83×0.5 = 1.41 m/s\n\n'
      +'【ω = 2 rad/s】v = 1 m/s，需要 mv²/r = 2×1/0.5 = 4 N\n'
      +'　上限 μmg = 0.4×2×10 = 8 N，4 N ＜ 8 N → 稳稳跟着转\n\n'
      +'【ω = 4 rad/s】v = 2 m/s（把 v 滑块拖到 2）\n'
      +'　需要 mv²/r = 2×4/0.5 = 16 N ＞ 8 N → 打滑，沿螺旋线甩出去\n\n'
      +'【要点】判据只看 μ 与 ω²r/g 谁大，与质量无关（m 两边约掉了）\n'
      +'【易错】打滑后不是"沿半径直线飞出"，而是被摩擦拖着走一段螺旋；'
      +'滑出盘边后才沿切线做匀速直线——所谓"离心运动"就是惯性，不存在离心力'},
   {level:'高考',title:'例2 · 圆锥摆：向心力是合出来的，不是多出来的',
    q:'长 1 m 的细绳拴 0.5 kg 小球，在水平面内做匀速圆周运动。若绳与竖直方向成 37°（cos37°=0.8），求小球的线速度、角速度与绳的张力。g=10 m/s²。',
    params:{mode:1,m:0.5,r:1,v:2.12,r2:0.5,tt:0,bt:0,g:10},
    answer:'受力只有两个：重力 mg（↓）和绳的张力 T（沿绳指向悬点）\n'
      +'竖直：T cosθ = mg　水平：T sinθ = mv²/R，且 R = L sinθ\n'
      +'两式相除：tanθ = v²/(gR) = v²/(gL sinθ)　→　sin²θ/cosθ = v²/(gL)\n\n'
      +'代入 θ = 37°：(0.6)²/0.8 = 0.45 = v²/(10×1)　→　v = √4.5 = 2.12 m/s\n'
      +'　R = L sin37° = 0.6 m　→　ω = v/R = 2.12/0.6 = 3.54 rad/s\n'
      +'　T = mg/cos37° = 5/0.8 = 6.25 N\n\n'
      +'【要点】向心力 mv²/R = 0.5×4.5/0.6 = 3.75 N，它恰好等于 T 的水平分量\n'
      +'　（T sinθ = 6.25×0.6 = 3.75 N ✓）—— 向心力是合力的"效果"，不是第三个力\n'
      +'【易错】别写成 T = mv²/R，那是水平分量；也别漏掉 R = L sinθ ≠ L'},
   {level:'高考',title:'例3 · 竖直圆周·绳：√(5gR) 是怎么来的',
    q:'长 0.5 m 的细绳拴 1 kg 小球，在竖直平面内做圆周运动，g=10 m/s²。'+
      '要使小球能过最高点，最低点速度至少多大？此时最高点的张力是多少？再求最低点时绳的张力。',
    params:{mode:2,m:1,r:0.5,v:5,r2:0.5,tt:0,bt:0,g:10},
    answer:'最高点临界：重力恰好全部充当向心力，绳张力刚好为 0\n'
      +'　mg = mv顶²/R　→　v顶_min = √(gR) = √5 = 2.24 m/s\n'
      +'最低点 → 最高点，机械能守恒（升高 2R）：\n'
      +'　½mv₀² = ½mv顶² + mg·2R　→　v₀² = v顶² + 4gR = 5 + 20 = 25\n'
      +'　v₀_min = √25 = 5 m/s = √(5gR) ✓\n\n'
      +'【最高点】T顶 = mv顶²/R − mg = 1×5/0.5 − 10 = 0 N（刚好为 0，绳不松）\n'
      +'【最低点】T低 = mv₀²/R + mg = 1×25/0.5 + 10 = 60 N = 6mg\n'
      +'　→ 最低点与最高点张力差 6mg − 0 = 6mg，这是一条常用结论（差 6mg）\n\n'
      +'【易错】若 v₀ ＜ √(2gR)，小球连等高点（φ=90°）都到不了；\n'
      +'　√(2gR) ≤ v₀ ＜ √(5gR) 时会先在某个 φ 处松绳，然后做斜抛——不是继续转'},
   {level:'中档',title:'例4 · 竖直圆周·杆：最高点速度可以为 0',
    q:'长 0.5 m 的轻杆固定 1 kg 小球，在竖直平面内转动，g=10 m/s²。'+
      '要能过最高点，最低点速度至少多大？此时最高点杆对小球的作用力大小和方向？',
    params:{mode:3,m:1,r:0.5,v:4.47,r2:0.5,tt:0,bt:0,g:10},
    answer:'杆与绳唯一的差别：绳只能拉，杆既能拉也能推（弹力可以为负）\n'
      +'最高点允许 v顶 = 0（杆可以顶住小球不让它掉下来）\n'
      +'机械能守恒：½mv₀² = 0 + mg·2R　→　v₀ = √(4gR) = √20 = 4.47 m/s\n\n'
      +'此时最高点：N = mv顶²/R − mg = 0 − 10 = −10 N\n'
      +'　负号表示杆对小球的作用力方向"背离圆心"，即竖直向上、大小 10 N = mg（在托着它）\n\n'
      +'【对比】同一个 R：绳要 √(5gR)=5 m/s，杆只要 √(4gR)=4.47 m/s\n'
      +'【再想一步】若 v₀ 刚好等于 √(2gR) 与 √(4gR) 之间（比如 4 m/s），\n'
      +'　小球到不了最高点，会先减速到 0 再沿原路摆回来——这就是一个单摆'},
   {level:'高考',title:'例5 · 汽车过凸桥：失重与"飞车"',
    q:'质量 1000 kg 的汽车以 10 m/s 驶过半径 20 m 的凸形桥顶部，g=10 m/s²。'+
      '求桥面对车的支持力，并判断车是否离开桥面；多大速度会飞出去？（本模块 R 上限 5 m，用 R=5 m、m=10 kg、v=5 m/s 看同样的规律）',
    params:{mode:4,m:10,r:5,v:5,r2:0.5,tt:0,bt:0,g:10},
    answer:'在桥顶（或任意位置 α）：指向圆心方向的合力提供向心力\n'
      +'　mg cosα − N = mv²/R　→　N = mg cosα − mv²/R\n'
      +'桥顶 α = 0：N = mg − mv²/R\n\n'
      +'【原题】N = 1000×10 − 1000×100/20 = 10000 − 5000 = 5000 N\n'
      +'　N ＜ mg → 失重（视重只有真实重力的一半），但没飞起来\n\n'
      +'【飞车临界】N = 0 → v = √(gR) = √(10×20) = 14.1 m/s\n'
      +'　超过这个速度，车在到桥顶之前就脱离桥面做平抛\n\n'
      +'【本模块参数】R=5 m、m=10 kg、v=5 m/s：\n'
      +'　N = 100 − 10×25/5 = 100 − 50 = 50 N，正好是 mg 的一半（失重 50%）\n'
      +'　把 v 拖到 7.1 m/s（= √(gR) = √50）：N → 0，车飞起来\n'
      +'　把"桥型"改成 1（凹坑）：N = mg cosα + mv²/R ＞ mg → 超重，永远不会飞车'},
   {level:'中档',title:'例6 · 皮带传动：先判"谁跟谁相等"',
    q:'主动轮半径 0.2 m，从动轮半径 0.4 m，用皮带传动，主动轮边缘线速度 2 m/s。'+
      '求两轮角速度之比、周期之比，以及边缘上各点的向心加速度之比。',
    params:{mode:5,m:2,r:0.2,v:2,r2:0.4,tt:0,bt:0,g:10},
    answer:'皮带传动（不打滑）→ 两轮边缘的【线速度相等】：v₁ = v₂ = 2 m/s\n'
      +'　ω₁ = v/r₁ = 2/0.2 = 10 rad/s　ω₂ = v/r₂ = 2/0.4 = 5 rad/s\n'
      +'　ω₁ : ω₂ = 2 : 1 = r₂ : r₁　（角速度与半径成反比）\n'
      +'　T = 2π/ω　→　T₁ : T₂ = 1 : 2　（周期与角速度成反比）\n'
      +'　a = v²/r　→　a₁ = 4/0.2 = 20，a₂ = 4/0.4 = 10　→　a₁ : a₂ = 2 : 1\n\n'
      +'【一句话】皮带/齿轮传动：v 相等，所以 ω ∝ 1/r、a ∝ 1/r\n'
      +'　共轴传动（把类型改成 2）：ω 相等，所以 v ∝ r、a ∝ r —— 正好反过来\n\n'
      +'【易错】"皮带上的点"和"轮边缘上的点"线速度相等，但轮心和边缘并不相等；\n'
      +'　同一轮上不同半径的两点只能用 ω 相等去联立'}
  ]
};


/* 注册为标签页 */
Scenes.sandbox={id:'sandbox',name:'自由沙盒'};

/* ==================================================================
   天体物理模块  ——  模型台 + 自由天体沙盒
   ================================================================== */
var ASTRO={
  G:6.674e-11, C:2.99792458e8, AU:1.495979e11,
  DAY:86400, YR:3.15576e7, T:null
};
ASTRO.BODY=[
  {n:'太阳',   M:1.989e30, R:6.957e8, c:'#fde047', c2:'#f59e0b', ty:'star'},
  {n:'水星',   M:3.301e23, R:2.4397e6,c:'#c4bfb6', c2:'#78716c', ty:'rock'},
  {n:'金星',   M:4.867e24, R:6.0518e6,c:'#fdba74', c2:'#ea580c', ty:'rock'},
  {n:'地球',   M:5.972e24, R:6.371e6, c:'#60a5fa', c2:'#1d4ed8', ty:'earth'},
  {n:'月球',   M:7.342e22, R:1.7374e6,c:'#d8dce3', c2:'#94a3b8', ty:'rock'},
  {n:'火星',   M:6.417e23, R:3.3895e6,c:'#f87171', c2:'#b91c1c', ty:'rock'},
  {n:'木星',   M:1.898e27, R:6.9911e7,c:'#fbbf24', c2:'#b45309', ty:'band'},
  {n:'土星',   M:5.683e26, R:5.8232e7,c:'#fcd34d', c2:'#a16207', ty:'ring'},
  {n:'天王星', M:8.681e25, R:2.5362e7,c:'#67e8f9', c2:'#0e7490', ty:'ice'},
  {n:'海王星', M:1.024e26, R:2.4622e7,c:'#818cf8', c2:'#4338ca', ty:'ice'},
  {n:'中子星', M:2.786e30, R:1.2e4,   c:'#f5d0fe', c2:'#c026d3', ty:'ns'},
  {n:'恒星级黑洞',M:1.989e31,R:2.953e4,c:'#0b1020', c2:'#a855f7', ty:'bh'}
];
function aBody(i){return ASTRO.BODY[clamp(Math.round(i),0,ASTRO.BODY.length-1)];}

/* View 逆变换（供指针拾取，纯增量） */
View.prototype.ix=function(X){return (X-this.ox)/this.scale;};
View.prototype.iy=function(Y){return (this.oy-Y)/this.scale;};

/* ---------- 天体通用工具 ---------- */
function abPix(rm){return clamp(9.5*Math.pow(Math.max(rm,1)/6.371e6,0.42),3.2,30);}
function abD(a,b){var dz=(a.z||0)-(b.z||0);return Math.sqrt((a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y)+dz*dz);}
function abV(b){var vz=b.vz||0;return Math.sqrt(b.vx*b.vx+b.vy*b.vy+vz*vz);}
function abMtot(bs){var s=0;for(var i=0;i<bs.length;i++)s+=bs[i].m;return s;}
function abZeroMom(bs){
  abNorm(bs);
  var M=0,cx=0,cy=0,cz=0,px=0,py=0,pz=0,i;
  for(i=0;i<bs.length;i++){M+=bs[i].m;cx+=bs[i].m*bs[i].x;cy+=bs[i].m*bs[i].y;cz+=bs[i].m*bs[i].z;
    px+=bs[i].m*bs[i].vx;py+=bs[i].m*bs[i].vy;pz+=bs[i].m*bs[i].vz;}
  cx/=M;cy/=M;cz/=M;px/=M;py/=M;pz/=M;
  for(i=0;i<bs.length;i++){bs[i].x-=cx;bs[i].y-=cy;bs[i].z-=cz;bs[i].vx-=px;bs[i].vy-=py;bs[i].vz-=pz;}
}
function abAcc(bs,soft2){
  var n=bs.length,ac=[],i,j;
  for(i=0;i<n*3;i++)ac.push(0);
  for(i=0;i<n;i++)for(j=i+1;j<n;j++){
    var dx=bs[j].x-bs[i].x,dy=bs[j].y-bs[i].y,dz=(bs[j].z||0)-(bs[i].z||0),r2=dx*dx+dy*dy+dz*dz;
    if(r2<soft2)r2=soft2;
    var inv=1/(r2*Math.sqrt(r2));
    var fa=ASTRO.G*bs[j].m*inv, fb=ASTRO.G*bs[i].m*inv;
    ac[i*3]+=fa*dx; ac[i*3+1]+=fa*dy; ac[i*3+2]+=fa*dz;
    ac[j*3]-=fb*dx; ac[j*3+1]-=fb*dy; ac[j*3+2]-=fb*dz;
  }
  return ac;
}
function abStepBS(bs,h,soft2){        // 速度 Verlet（三维）
  abNorm(bs);
  var n=bs.length,a=abAcc(bs,soft2),i;
  for(i=0;i<n;i++){bs[i].vx+=a[i*3]*h*0.5;bs[i].vy+=a[i*3+1]*h*0.5;bs[i].vz+=a[i*3+2]*h*0.5;
                   bs[i].x+=bs[i].vx*h;  bs[i].y+=bs[i].vy*h;  bs[i].z+=bs[i].vz*h;}
  a=abAcc(bs,soft2);
  for(i=0;i<n;i++){bs[i].vx+=a[i*3]*h*0.5;bs[i].vy+=a[i*3+1]*h*0.5;bs[i].vz+=a[i*3+2]*h*0.5;}
}
function abNorm(bs){                  // 二维预设补齐 z / vz，避免在三维内核里算出 NaN
  for(var i=0;i<bs.length;i++){
    if(!isFinite(bs[i].z))bs[i].z=0;
    if(!isFinite(bs[i].vz))bs[i].vz=0;
  }
  return bs;
}
// 自适应子步长：保证任一对天体的间距不会在一步内缩小到 60% 以下（防高速穿模、防近距离爆炸）
function abSafeH(bs,hz){
  if(bs.length<2)return hz;
  var i,j,dx,dy,dz,d2,d,vc,lim=hz;
  for(i=0;i<bs.length;i++)for(j=i+1;j<bs.length;j++){
    dx=bs[j].x-bs[i].x;dy=bs[j].y-bs[i].y;dz=(bs[j].z||0)-(bs[i].z||0);
    d2=dx*dx+dy*dy+dz*dz;d=Math.sqrt(d2);
    if(d<1)continue;
    // 径向接近速度
    vc=((bs[j].vx-bs[i].vx)*dx+(bs[j].vy-bs[i].vy)*dy+((bs[j].vz||0)-(bs[i].vz||0))*dz)/d;
    if(vc>0){                                  // vc>0 表示在远离，只有接近时才需要限制
      continue;
    }
    var t=0.4*d/Math.max(-vc,1e-9);            // 从 d 缩到 0.6d 所需时间
    if(t<lim)lim=t;
  }
  return Math.max(lim,hz/3000);                // 兜底：不让步数无限爆炸
}
function abEnergy(bs){
  var Ek=0,Ep=0,i,j;
  for(i=0;i<bs.length;i++){var vz=bs[i].vz||0;Ek+=0.5*bs[i].m*(bs[i].vx*bs[i].vx+bs[i].vy*bs[i].vy+vz*vz);}
  for(i=0;i<bs.length;i++)for(j=i+1;j<bs.length;j++)
    Ep-=ASTRO.G*bs[i].m*bs[j].m/Math.max(abD(bs[i],bs[j]),1);
  return {Ek:Ek,Ep:Ep,E:Ek+Ep};
}

/* ---------- 绘制工具 ---------- */
function abSky(g,W,H){
  var s=20771;
  function pad(){s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;}
  g.fillStyle='#060a17';g.fillRect(0,0,W,H);
  var i,x,y,r,a;
  for(i=0;i<170;i++){
    x=pad()*W;y=pad()*H;r=pad()*1.1+0.25;a=0.2+pad()*0.55;
    g.fillStyle='rgba(226,232,240,'+a.toFixed(2)+')';
    g.beginPath();g.arc(x,y,r,0,6.2832);g.fill();
  }
}
// 以焦点为中心画圆锥曲线：a 半长轴、e 偏心率、rot 近日点方向
function abPath(g,view,fx,fy,a,e,rot,col,dash,unit){
  if(!(a>0)||!isFinite(a))return;
  var p=a*(1-e*e),n=200,i,th,r,X,Y;
  g.save();g.strokeStyle=col;g.lineWidth=1.4;
  if(dash)g.setLineDash([5,4]);else g.setLineDash([]);
  g.beginPath();
  for(i=0;i<=n;i++){
    th=6.283185307*i/n;r=p/(1+e*Math.cos(th));
    X=view.sx((fx+r*Math.cos(th+rot))/unit);
    Y=view.sy((fy+r*Math.sin(th+rot))/unit);
    if(i===0)g.moveTo(X,Y);else g.lineTo(X,Y);
  }
  g.stroke();g.restore();
}
function abDrawBody(g,view,b,unit,opt){
  opt=opt||{};
  var X=view.sx(b.x/unit),Y=view.sy(b.y/unit),R=abPix(b.rm),rg;
  if(b.ty==='star'||b.ty==='ns'){
    rg=g.createRadialGradient(X,Y,R*0.3,X,Y,R*4.2);
    rg.addColorStop(0,'rgba(253,224,71,0.5)');rg.addColorStop(0.45,'rgba(245,158,11,0.18)');
    rg.addColorStop(1,'rgba(245,158,11,0)');
    g.fillStyle=rg;g.beginPath();g.arc(X,Y,R*4.2,0,6.2832);g.fill();
  }
  if(b.ty==='bh'){
    rg=g.createRadialGradient(X,Y,R*0.9,X,Y,R*3.4);
    rg.addColorStop(0,'rgba(168,85,247,0.5)');rg.addColorStop(1,'rgba(168,85,247,0)');
    g.fillStyle=rg;g.beginPath();g.arc(X,Y,R*3.4,0,6.2832);g.fill();
    g.strokeStyle='#c084fc';g.lineWidth=1.6;g.setLineDash([3,3]);
    g.beginPath();g.arc(X,Y,R*1.7,0,6.2832);g.stroke();g.setLineDash([]);
  }
  if(b.ty==='ring'){
    g.save();g.strokeStyle='rgba(252,211,77,0.7)';g.lineWidth=Math.max(1.5,R*0.3);
    g.beginPath();
    if(g.ellipse)g.ellipse(X,Y,R*2.1,R*0.66,0,0,6.2832);else g.arc(X,Y,R*2.1,0,6.2832);
    g.stroke();g.restore();
  }
  rg=g.createRadialGradient(X-R*0.35,Y-R*0.4,R*0.1,X,Y,R*1.05);
  rg.addColorStop(0,b.c);rg.addColorStop(1,b.c2||b.c);
  g.fillStyle=rg;g.beginPath();g.arc(X,Y,R,0,6.2832);g.fill();
  if(b.ty==='band'){
    g.save();g.beginPath();g.arc(X,Y,R,0,6.2832);g.clip();
    g.strokeStyle='rgba(120,53,15,0.4)';g.lineWidth=Math.max(1,R*0.2);
    for(var k=-2;k<=2;k++){g.beginPath();g.moveTo(X-R,Y+k*R*0.42);g.lineTo(X+R,Y+k*R*0.42);g.stroke();}
    g.restore();
  }
  if(b.ty==='earth'){
    g.fillStyle='rgba(134,239,172,0.5)';
    g.beginPath();g.arc(X-R*0.25,Y-R*0.35,R*0.5,0,6.2832);g.fill();
    g.beginPath();g.arc(X+R*0.3,Y+R*0.25,R*0.36,0,6.2832);g.fill();
  }
  if(opt.name)label(g,X,Y-R-(opt.up||7),opt.name,opt.ncol||'rgba(226,232,240,0.9)','center');
  return {X:X,Y:Y,R:R};
}
function abDrawTrails(g,view,T,unit,maxlen){
  if(!T)return;
  for(var i=0;i<T.length;i++){
    var t=T[i];if(!t||t.length<2)continue;
    var s0=Math.max(0,t.length-(maxlen||900));
    g.strokeStyle='rgba(125,211,252,0.4)';g.lineWidth=1.3;
    g.beginPath();
    for(var j=s0;j<t.length;j++){
      var X=view.sx(t[j][0]/unit),Y=view.sy(t[j][1]/unit);
      if(j===s0)g.moveTo(X,Y);else g.lineTo(X,Y);
    }
    g.stroke();
  }
}
function abVecArrow(g,view,b,vx,vy,vref,unit,col){
  var X=view.sx(b.x/unit),Y=view.sy(b.y/unit);
  var n=Math.sqrt(vx*vx+vy*vy);
  if(n<1e-9)return;
  var L=clamp(n/Math.max(vref,1e-9)*44,12,64);
  arrow(g,X,Y,X+vx/n*L,Y-vy/n*L,col,1.8);
}
function abTimeStr(sec){
  if(!isFinite(sec))return '--';
  if(sec<90)return fmt(sec,1)+' s';
  if(sec<5.4e5)return fmt(sec/3600,2)+' h';
  if(sec<3.2e7)return fmt(sec/ASTRO.DAY,2)+' d';
  return fmt(sec/ASTRO.YR,3)+' yr';
}
function abDistStr(m){
  if(!isFinite(m))return '--';
  if(m<1e6)return fmt(m/1e3,1)+' km';
  if(m<1.5e11)return fmt(m/1e6,2)+' 万 km';
  return fmt(m/ASTRO.AU,3)+' AU';
}

/* ==================================================================
   板块一：天体模型台 Scenes.astro
   ================================================================== */
Scenes.astro={
id:'astro',name:'天体物理模型台',
brief:'六个常考模型共用一套二体积分：环绕、逃逸、椭圆开普勒、双星、霍曼变轨、贴地飞行。轨道半径用中心天体半径 R 作单位，地球填 6.62 就是同步轨道；换天体改半径，右边的量跟着重算。',
params:[
  {key:'mon',label:'模型（0环绕 1逃逸 2椭圆 3双星 4变轨 5贴地）',min:0,max:5,step:1,def:0,unit:''},
  {key:'body',label:'中心天体（0太阳 3地球 4月球 11黑洞）',min:0,max:11,step:1,def:3,unit:''},
  {key:'h',label:'轨道半径',min:1.05,max:300,step:0.05,def:6.62,unit:'R'},
  {key:'h2',label:'变轨目标半径',min:1.05,max:300,step:0.05,def:15,unit:'R'},
  {key:'e',label:'偏心率（椭圆模型）',min:0,max:0.9,step:0.01,def:0.5,unit:''},
  {key:'vratio',label:'发射速度',min:0.05,max:2.4,step:0.01,def:1.41,unit:'×v₀'},
  {key:'mRatio',label:'双星质量比 m₂/m₁',min:0.05,max:2,step:0.05,def:1,unit:''},
  {key:'spd',label:'时间流速',min:0.2,max:5,step:0.1,def:1,unit:'×'}
],

init:function(P){
  var G=ASTRO.G, b=aBody(P.body), M=b.M, R=b.R;
  var mon=clamp(Math.round(P.mon),0,5);
  var r1=R*P.h, r2=R*P.h2, bs=[], st={};
  var core,sat,a,v,w,L,w2,rr1,rr2,v1,v2,m2,ee,vp,vc,vv,vt,vr;
  core={x:0,y:0,vx:0,vy:0,m:M,rm:R,c:b.c,c2:b.c2,ty:b.ty,n:b.n};
  function mk(x,y,vx,vy,m,rm,c,c2,ty,n){
    return {x:x,y:y,vx:vx,vy:vy,m:m,rm:rm,c:c,c2:c2,ty:ty,n:n};
  }
  if(mon===3){                                   /* 双星 */
    L=Math.max(r1,R*3,1e6); m2=M*P.mRatio;
    w=Math.sqrt(G*(M+m2)/(L*L*L));
    rr1=m2*L/(M+m2); rr2=M*L/(M+m2);
    v1=w*rr1; v2=w*rr2; a=L;
    bs=[mk(-rr1,0,0,-v1,M,R,b.c,b.c2,b.ty,b.n),
        mk(rr2,0,0,v2,m2,Math.max(R*Math.pow(P.mRatio,1/3),R*0.2),
           '#86efac','#16a34a','rock','伴星')];
  }else if(mon===5){                             /* 贴地飞行 */
    r1=R*1.05; a=r1; v=Math.sqrt(G*M/r1);
    bs=[core,mk(r1,0,0,v,1e3,3.2e6,'#e2e8f0','#94a3b8','rock','近地卫星')];
  }else if(mon===1){                             /* 逃逸 / 宇宙速度 */
    a=r1; vc=Math.sqrt(G*M/r1); vv=P.vratio*vc;
    vt=vv*0.06; vr=Math.sqrt(Math.max(vv*vv-vt*vt,0));
    bs=[core,mk(r1,0,vr,vt,1e3,3.2e6,'#e2e8f0','#94a3b8','rock','飞行器')];
  }else if(mon===2){                             /* 椭圆 · 开普勒 */
    ee=clamp(P.e,0,0.9); a=r1/(1-ee);
    if(!(a>0)||a>r1*60)a=r1*2;
    ee=1-r1/a;
    vp=Math.sqrt(G*M*(2/r1-1/a));
    bs=[core,mk(r1,0,0,vp,1e3,3.2e6,'#7dd3fc','#38bdf8','rock','行星/彗星')];
  }else if(mon===4){                             /* 霍曼变轨 */
    if(r2<r1*1.08)r2=r1*1.6;
    a=(r1+r2)/2; v=Math.sqrt(G*M/r1);
    bs=[core,mk(r1,0,0,v,1e3,3.2e6,'#fca5a5','#f87171','rock','航天器')];
  }else{                                         /* 圆轨道卫星 */
    a=r1; v=Math.sqrt(G*M/r1);
    bs=[core,mk(r1,0,0,v,1e3,3.2e6,'#e2e8f0','#94a3b8','rock','卫星')];
  }
  abZeroMom(bs);
  var Mtot=abMtot(bs);
  var Tref=2*Math.PI*Math.sqrt(Math.pow(Math.max(a,r1),3)/(G*Mtot));
  st={
    t:0,simT:0,mon:mon,unit:1,soft2:Math.pow(Math.max(R*0.02,1),2),
    bs:bs,B:b,R:R,M:M,r1:r1,r2:r2,a:a,e:(mon===2?(1-r1/a):0),
    Mtot:Mtot,Tref:Tref,dtMax:Math.max(Tref/1400,1e-4),
    ts:Tref/8*clamp(P.spd,0.05,10),
    T1:2*Math.PI*Math.sqrt(Math.pow(r1,3)/(G*M)),
    dv1:0,dv2:0,ttr:0,ae:0,phase:0,dLast:1,end:false,note:''
  };
  if(mon===4){
    var at=(r1+r2)/2;
    st.ae=at;
    st.dv1=Math.sqrt(G*M*(2/r1-1/at))-Math.sqrt(G*M/r1);
    st.dv2=Math.sqrt(G*M/r2)-Math.sqrt(G*M*(2/r2-1/at));
    st.ttr=Math.PI*Math.sqrt(Math.pow(at,3)/(G*M));
  }
  // 视野范围
  var mx,my,rr=Math.max(r1,r2,1);
  if(mon===2){mx=a*(1+st.e)*1.05;my=Math.max(a*Math.sqrt(1-st.e*st.e),r1)*1.05;}
  else if(mon===1){mx=rr*3.2;my=rr*3.2;}
  else if(mon===4){mx=Math.max(r1,r2)*1.15;my=mx;}
  else if(mon===5){mx=6.62*R*1.15;my=mx;}
  else if(mon===3){mx=L*0.72;my=mx;}
  else{mx=rr*1.15;my=mx;}
  var span=Math.max(mx,my,1);
  st.unit=span/1.15;
  st.bx=[-span/st.unit,span/st.unit];
  st.by=[-span/st.unit,span/st.unit];
  ASTRO.T=[];
  for(var i=0;i<bs.length;i++)ASTRO.T.push([[bs[i].x,bs[i].y]]);
  return st;
},

step:function(st,P,h){
  if(st.end)return;
  var G=ASTRO.G,total=h*st.ts,nsub=Math.min(Math.ceil(total/st.dtMax),240),hb=total/nsub,i,k;
  for(i=0;i<nsub;i++){
    var sat=st.bs[st.bs.length-1], c=st.bs[0];
    var rA=abD(sat,c);
    // 变轨：延迟 1/4 周期后第一次点火（顺行切线方向）
    if(st.mon===4&&st.phase===0&&st.simT>st.T1*0.25){
      var d0=Math.max(rA,1), ox=sat.x/d0, oy=sat.y/d0;
      sat.vx+=st.dv1*(-oy); sat.vy+=st.dv1*(ox);
      st.phase=1;st.dLast=1;
    }
    abStepBS(st.bs,hb,st.soft2);
    st.simT+=hb;
    // 到达另一拱点 → 自动二次点火圆化
    if(st.mon===4&&st.phase===1){
      var rB=abD(sat,c);
      if(st.dLast>0&&(rB-rA)<0&&Math.abs(rB-st.r2)<st.r2*0.15){
        var d1=Math.max(rB,1), tx=-sat.y/d1, ty=sat.x/d1;
        if(sat.vx*tx+sat.vy*ty<0){tx=-tx;ty=-ty;}
        sat.vx+=st.dv2*tx; sat.vy+=st.dv2*ty;
        st.phase=2;
      }
      st.dLast=rB-rA;
    }
    if(st.mon===1){
      if(abD(sat,c)<=st.R*1.0001){st.end=true;st.note='✗ 速度不足，坠回天体表面';}
      else if(abD(sat,c)>st.r1*9){st.end=true;st.note='✓ 已逃逸，轨道不再闭合';}
    }else if(st.mon===0||st.mon===2||st.mon===5){
      if(abD(sat,c)<st.R*1.0001){st.end=true;st.note='✗ 轨道过低，撞上天体';}
    }
    if(st.end)break;
    if(i%Math.max(1,Math.floor(nsub/6))===0){
      for(k=0;k<st.bs.length;k++){
        if(!ASTRO.T[k])ASTRO.T[k]=[];
        ASTRO.T[k].push([st.bs[k].x,st.bs[k].y]);
        if(ASTRO.T[k].length>1100)ASTRO.T[k].shift();
      }
    }
  }
  for(k=0;k<st.bs.length;k++){
    if(!ASTRO.T[k])ASTRO.T[k]=[];
    ASTRO.T[k].push([st.bs[k].x,st.bs[k].y]);
    if(ASTRO.T[k].length>1100)ASTRO.T[k].shift();
  }
},
finished:function(st){return st.end;},
stage:function(st){
  if(st.end)return st.note;
  if(st.mon===4)return ['① 低圆轨道 · 待点火','② 转移椭圆 · 已 Δv₁','③ 高圆轨道 · 已 Δv₂'][st.phase]+
    '　Δv₁='+fmt(st.dv1/1e3,2)+'　Δv₂='+fmt(st.dv2/1e3,2)+' km/s';
  return '运行中 · 模拟时间 '+abTimeStr(st.simT);
},
vel:function(st){
  return [st.bs.length>1?abV(st.bs[st.bs.length-1])/1e3:0, abV(st.bs[0])/1e3];
},
en:function(st){
  var m=st.bs[st.bs.length-1].m, E=abEnergy(st.bs);
  return [E.Ek/m/1e6,E.Ep/m/1e6,E.E/m/1e6];
},
info:function(st,P){
  var G=ASTRO.G,b=st.B,M=st.M,R=st.R,sat=st.bs[st.bs.length-1],c=st.bs[0];
  var r=Math.max(abD(sat,c),1), v=abV(sat), r1=Math.max(st.r1,1), rows=[];
  rows.push(['中心天体',b.n+'　M='+b.M.toExponential(3)+' kg　R='+fmt(R/1e3,0)+' km']);
  rows.push(['模拟时间',abTimeStr(st.simT)+'　当前 r = '+abDistStr(r)]);
  if(st.mon===0){
    rows.push(['环绕速度 v','= √(GM/r) = '+fmt(Math.sqrt(G*M/r1)/1e3,3)+' km/s　（当前 '+fmt(v/1e3,3)+'）']);
    rows.push(['周期 T','= 2π√(r³/GM) = '+abTimeStr(2*Math.PI*Math.sqrt(Math.pow(r1,3)/(G*M)))]);
    rows.push(['向心加速度 a','= GM/r² = '+fmt(G*M/(r1*r1),3)+' m/s²']);
    rows.push(['角速度 ω','= '+fmt(Math.sqrt(G*M/Math.pow(r1,3)),7)+' rad/s']);
    rows.push(['该处重力 g′','= '+fmt(G*M/(r1*r1),3)+' m/s²　= 地面 g 的 '+fmt(G*M/(r1*r1)/9.8*100,1)+'%']);
    rows.push(['比机械能 ε','= −GM/(2a) = '+fmt(-G*M/(2*r1)/1e6,2)+' MJ/kg']);
    rows.push(['越高越慢','r 变大：v↓ ω↓ a↓ T↑（唯一变大的是周期）']);
  }else if(st.mon===1){
    var vc1=Math.sqrt(G*M/r1);
    rows.push(['发射点 r','= '+abDistStr(r1)+'　当地环绕速度 '+fmt(vc1/1e3,3)+' km/s']);
    rows.push(['发射速度','= '+fmt(P.vratio,3)+' v₀ = '+fmt(vc1*P.vratio/1e3,3)+' km/s']);
    rows.push(['逃逸速度 v₂','= √(2GM/r) = '+fmt(Math.SQRT2*vc1/1e3,3)+' km/s']);
    rows.push(['临界倍数','√2 ≈ 1.414（当前 '+fmt(P.vratio,3)+'）']);
    rows.push(['轨道类型',P.vratio<1.414?(P.vratio<1?'椭圆（发射点是远地点）':'椭圆'):
               (Math.abs(P.vratio-1.414)<0.02?'抛物线 · 恰好逃逸':'双曲线 · 逃逸')]);
    rows.push(['当前状态','r = '+abDistStr(r)+'　v = '+fmt(v/1e3,3)+' km/s']);
  }else if(st.mon===2){
    var aa=st.a,ee=Math.max(st.e,1e-9);
    rows.push(['近日点 r_p','= '+abDistStr(aa*(1-ee))+'　v_p = '+fmt(Math.sqrt(G*M*(2/(aa*(1-ee))-1/aa))/1e3,3)+' km/s']);
    rows.push(['远日点 r_a','= '+abDistStr(aa*(1+ee))+'　v_a = '+fmt(Math.sqrt(G*M*(2/(aa*(1+ee))-1/aa))/1e3,3)+' km/s']);
    rows.push(['速度比 v_p/v_a','= (1+e)/(1−e) = '+fmt((1+ee)/(1-ee),3)]);
    rows.push(['周期 T','= 2π√(a³/GM) = '+abTimeStr(2*Math.PI*Math.sqrt(Math.pow(aa,3)/(G*M)))]);
    rows.push(['开普勒Ⅱ','面积速度恒定：|r×v|/2 = '+fmt(Math.abs(sat.x*sat.vy-sat.y*sat.vx)/2/1e9,3)+'×10⁹ m²/s']);
    rows.push(['开普勒Ⅲ','a³/T² = GM/4π² = '+(G*M/(4*Math.PI*Math.PI)).toExponential(3)+'　（只由中心天体决定）']);
  }else if(st.mon===3){
    var b2=st.bs[1],L=Math.max(abD(st.bs[0],b2),1),mt=abMtot(st.bs);
    var w3=Math.sqrt(G*mt/Math.pow(L,3));
    rows.push(['两星间距 L','= '+abDistStr(L)]);
    rows.push(['质心关系','m₁r₁ = m₂r₂　→　r₁ : r₂ = m₂ : m₁ = '+fmt(b2.m/st.bs[0].m,3)+' : 1']);
    rows.push(['r₁ / r₂','= '+abDistStr(abD(st.bs[0],{x:0,y:0}))+' / '+abDistStr(abD(b2,{x:0,y:0}))]);
    rows.push(['共同角速度 ω','= √(G(m₁+m₂)/L³) = '+fmt(w3,8)+' rad/s']);
    rows.push(['共同周期 T','= '+abTimeStr(2*Math.PI/w3)]);
    rows.push(['两星速率','v₁ = '+fmt(abV(st.bs[0])/1e3,3)+' km/s　v₂ = '+fmt(abV(b2)/1e3,3)+' km/s']);
    rows.push(['可反求总质量','m₁+m₂ = 4π²L³/(GT²) = '+mt.toExponential(3)+' kg']);
  }else if(st.mon===4){
    rows.push(['起点轨道 r₁','= '+abDistStr(st.r1)+'　v = '+fmt(Math.sqrt(G*M/st.r1)/1e3,3)+' km/s']);
    rows.push(['目标轨道 r₂','= '+abDistStr(st.r2)+'　v = '+fmt(Math.sqrt(G*M/st.r2)/1e3,3)+' km/s']);
    rows.push(['转移椭圆半长轴','= '+abDistStr(st.ae)]);
    rows.push(['Δv₁（低轨点火）','= '+fmt(st.dv1/1e3,3)+' km/s']);
    rows.push(['Δv₂（远地点圆化）','= '+fmt(st.dv2/1e3,3)+' km/s']);
    rows.push(['总 Δv','= '+fmt((Math.abs(st.dv1)+Math.abs(st.dv2))/1e3,3)+' km/s']);
    rows.push(['转移耗时','= ½T椭圆 = '+abTimeStr(st.ttr)]);
    rows.push(['要记的结论','变高轨要加速两次，末态速率反而更小：'+fmt(Math.sqrt(G*M/st.r1)/1e3,2)+' → '+fmt(Math.sqrt(G*M/st.r2)/1e3,2)+' km/s']);
  }else{
    var g0=G*M/(R*R);
    rows.push(['表面重力 g','= GM/R² = '+fmt(g0,3)+' m/s²']);
    rows.push(['第一宇宙速度','= √(gR) = '+fmt(Math.sqrt(g0*R)/1e3,3)+' km/s']);
    rows.push(['第二宇宙速度','= √(2gR) = '+fmt(Math.sqrt(2*g0*R)/1e3,3)+' km/s']);
    rows.push(['黄金代换','GM = gR² = '+(g0*R*R).toExponential(4)+' m³/s²']);
    rows.push(['平均密度 ρ','= 3M/(4πR³) = '+fmt(3*M/(4*Math.PI*Math.pow(R,3)),0)+' kg/m³']);
    rows.push(['同步轨道半径','= '+fmt(Math.pow(G*M*Math.pow(86164,2)/(4*Math.PI*Math.PI),1/3)/1e3,0)+' km，离地 '+fmt((Math.pow(G*M*Math.pow(86164,2)/(4*Math.PI*Math.PI),1/3)-R)/1e3,0)+' km']);
    rows.push(['近地卫星周期','≈ '+fmt(2*Math.PI*Math.sqrt(Math.pow(R*1.05,3)/(G*M))/60,1)+' min']);
  }
  if(st.end)rows.push(['⏹ 结束',st.note]);
  return rows;
},
bounds:function(st){
  if(st.mon===1&&!st.end){
    var r=Math.max(abD(st.bs[0],st.bs[st.bs.length-1]),st.r1);
    var s=Math.max(r,st.r1)*1.7;
    st._s=st._s?(st._s+(s-st._s)*0.05):s;
    return {x:[-st._s/st.unit,st._s/st.unit],y:[-st._s/st.unit,st._s/st.unit]};
  }
  return {x:st.bx,y:st.by};
},
draw:function(g,st,P,view,opts){
  var W=view.W,H=view.H,G=ASTRO.G,i,b,X,Y,sat,c,L,vref,n,LG;
  opts=opts||{};
  abSky(g,W,H);
  c=st.bs[0];sat=st.bs[st.bs.length-1];
  if(st.mon===0){
    abPath(g,view,c.x,c.y,st.r1,0,0,'rgba(148,163,184,0.55)',true,st.unit);
    var rs=Math.pow(G*st.M*Math.pow(86164,2)/(4*Math.PI*Math.PI),1/3);
    if(rs<st.r1*8&&rs>st.r1*1.06)abPath(g,view,c.x,c.y,rs,0,0,'rgba(250,204,21,0.45)',true,st.unit);
  }
  if(st.mon===2)abPath(g,view,c.x,c.y,st.a,st.e,0,'rgba(125,211,252,0.55)',true,st.unit);
  if(st.mon===4){
    abPath(g,view,c.x,c.y,st.r1,0,0,'rgba(248,113,113,0.5)',true,st.unit);
    abPath(g,view,c.x,c.y,st.r2,0,0,'rgba(134,239,172,0.5)',true,st.unit);
    abPath(g,view,c.x,c.y,st.ae,Math.abs(st.r2-st.r1)/(st.r1+st.r2),0,'rgba(253,224,71,0.7)',true,st.unit);
  }
  if(st.mon===5){
    var rsn=Math.pow(G*st.M*Math.pow(86164,2)/(4*Math.PI*Math.PI),1/3);
    abPath(g,view,c.x,c.y,rsn,0,0,'rgba(250,204,21,0.45)',true,st.unit);
    label(g,view.sx(0)+6,view.sy(rsn/st.unit)-6,'同步轨道','#facc15','left');
    abPath(g,view,c.x,c.y,st.R*1.05,0,0,'rgba(226,232,240,0.35)',true,st.unit);
  }
  if(st.mon===1)abPath(g,view,c.x,c.y,st.r1,0,0,'rgba(148,163,184,0.35)',true,st.unit);
  if(st.mon===3){
    abPath(g,view,0,0,Math.max(abD(st.bs[0],{x:0,y:0}),1),0,0,'rgba(148,163,184,0.35)',true,st.unit);
    abPath(g,view,0,0,Math.max(abD(st.bs[1],{x:0,y:0}),1),0,0,'rgba(134,239,172,0.35)',true,st.unit);
    g.fillStyle='rgba(226,232,240,0.9)';g.beginPath();
    g.arc(view.sx(0),view.sy(0),3,0,6.2832);g.fill();
    label(g,view.sx(0),view.sy(0)-9,'质心','rgba(148,163,184,0.95)','center');
  }
  abDrawTrails(g,view,ASTRO.T,st.unit,900);
  for(i=0;i<st.bs.length;i++){
    b=st.bs[i];
    abDrawBody(g,view,b,st.unit,{name:(b.n||''),up:9});
  }
  if(opts.vec&&sat){
    vref=Math.max(Math.sqrt(G*st.M/st.r1),1e-6);
    n=Math.max(abV(sat),1e-9);L=clamp(abV(sat)/vref*46,16,74);
    X=view.sx(sat.x/st.unit);Y=view.sy(sat.y/st.unit);
    arrow(g,X,Y,X+sat.vx/n*L,Y-sat.vy/n*L,'#22d3ee',1.8);
    if(!(st.mon===3)){
      n=Math.max(abD(sat,c),1);LG=34;
      arrow(g,X,Y,X+(-sat.x/n)*LG,Y-(-sat.y/n)*LG,'#fb923c',1.8);
    }
  }
  g.font='bold 12px -apple-system,"Microsoft YaHei",sans-serif';g.textAlign='left';
  g.fillStyle='rgba(148,163,184,0.95)';
  g.fillText('模型 '+st.mon+'：'+['圆轨道卫星环绕','宇宙速度与逃逸','椭圆轨道 · 开普勒定律','双星系统','霍曼变轨 · 两次点火','贴地飞行 · 黄金代换'][st.mon],10,16);
}
};
Scenes.astro.charts={vel:{field:'v',title:'速率',unit:'km/s',
  keys:[{label:'伴星 v',color:'#22d3ee'},{label:'中心天体 v',color:'#facc15',dash:true}]},
  en:{field:'e',title:'比机械能',unit:'MJ/kg',
  keys:[{label:'动能 Ek',color:'#2563eb'},{label:'势能 Ep',color:'#7c3aed',dash:true},{label:'总机械能 E',color:'#16a34a'}]}};
Scenes.astro.examples=[
 {title:'例1 · 地球同步卫星轨道',level:'高考',
  q:'地球自转周期 24 h，求同步卫星的轨道半径与离地高度（GM = 3.986×10¹⁴ m³/s²）。',
  answer:'r = 4.22×10⁷ m ≈ 6.6 R地，离地高度 h ≈ 3.58×10⁷ m（3.6 万 km）',
  params:{mon:0,body:3,h:6.62,h2:15,e:0.5,vratio:1.41,mRatio:1,spd:1}},
 {title:'例2 · 月球上的重力与第一宇宙速度',level:'高考',
  q:'月球质量 7.34×10²² kg、半径 1.737×10⁶ m，求月面 g 与贴月环绕速度。',
  answer:'g = GM/R² ≈ 1.62 m/s²（约为地球的 1/6）；v₁ = √(gR) ≈ 1.68 km/s',
  params:{mon:5,body:4,h:6.62,h2:15,e:0.5,vratio:1.41,mRatio:1,spd:1}},
 {title:'例3 · 第二宇宙速度：恰好逃逸',level:'高考',
  q:'从地球表面发射，速度多大才能不再落回？此时轨道是什么形状？',
  answer:'v₂ = √(2GM/R) = √2 v₁ ≈ 11.2 km/s，轨道是抛物线。把 ⑥ 调到 1.30 试试——会掉回来',
  params:{mon:1,body:3,h:1.05,h2:15,e:0.5,vratio:1.414,mRatio:1,spd:1}},
 {title:'例4 · 双星：由周期和间距称质量',level:'高考',
  q:'两颗恒星相距 L，绕质心做圆周运动周期为 T，证明 m₁+m₂ = 4π²L³/(GT²)。',
  answer:'本例两颗 1 M☉ 相距 1 AU（≈215 R☉）时，T ≈ 0.707 年 ≈ 258 天',
  params:{mon:3,body:0,h:215,h2:15,e:0.5,vratio:1.41,mRatio:1,spd:1}},
 {title:'例5 · 近地轨道 → 同步轨道',level:'高考',
  q:'卫星从近地圆轨道变到同步圆轨道，两次加速各需要多少？',
  answer:'Δv₁ ≈ 2.33 km/s（低轨点火），Δv₂ ≈ 1.43 km/s（远地点圆化），合计约 3.77 km/s；注意末态速率反而更小',
  params:{mon:4,body:3,h:1.1,h2:6.62,e:0.5,vratio:1.41,mRatio:1,spd:1}},
 {title:'例6 · 史瓦西半径（拓展）',level:'拓展',
  q:'把太阳压到多大半径以内，连光都逃不出去？',
  answer:'R_s = 2GM/c² ≈ 2.95 km。选 ⑪ 恒星级黑洞，它的「逃逸速度」正好等于 c = 3.0×10⁸ m/s',
  params:{mon:1,body:11,h:1.05,h2:15,e:0.5,vratio:1.414,mRatio:1,spd:1}}
];

/* ==================================================================
   板块二：天体沙盒（三维） Scenes.cosmos
   ================================================================== */
var COS={ps:-1};
var COSNAME=['内太阳系','地月 + 低轨卫星','等质量双星','双星 + 绕行行星','三星 8 字轨道','随机小星团','单次撞击实验','空白 · 自己搭'];

/* ---------- 三维相机 ---------- */
var C3={
  yaw:-0.62, pitch:0.34, zk:1, tgt:{x:0,y:0,z:0}, Rv:1,
  W:0, H:0, S:1, view:null,
  gy:0, gyBase:null, gyY0:0, gyP0:0, gyMsg:'', gyLive:0,
  tp:0, tpC:null,
  btn:[], hit:null
};

function c3Basis(){
  var y=C3.yaw, p=C3.pitch, cy=Math.cos(y), sy=Math.sin(y), cp=Math.cos(p), sp=Math.sin(p);
  // 右向、上向、以及由物体指向相机的方向
  return {
    rx:cy, ry:0, rz:-sy,
    ux:-sy*sp, uy:cp, uz:-cy*sp,
    bx:-cp*sy, by:-sp, bz:-cp*cy      // = -f，朝向观察者
  };
}
function c3SetD(){ C3.D=C3.Rv*3.1; }                     // 相机距离：视野半径的 3 倍
function c3Scale(){ var W=C3.W||760,H=C3.H||420; return 0.44*Math.min(W,H)/Math.max(C3.Rv,1e-9); }  // z=D 平面上的像素/世界比
function c3Proj(p){
  var b=c3Basis(), dx=p.x-C3.tgt.x, dy=p.y-C3.tgt.y, dz=(p.z||0)-C3.tgt.z;
  var cx=dx*b.rx+dy*b.ry+dz*b.rz;
  var cy=dx*b.ux+dy*b.uy+dz*b.uz;
  var cz=dx*b.bx+dy*b.by+dz*b.bz+C3.D;
  if(!(cz>0.02*C3.D))return null;
  var k=C3.D/cz, S=c3Scale();
  return {X:C3.W/2+cx*k*S, Y:C3.H/2-cy*k*S, z:cz, k:k};
}
function c3Unproj(px,py){                                // 屏幕点 → 过质心、正对相机的平面
  var b=c3Basis(), S=c3Scale();
  var cx=(px-C3.W/2)/S, cy=(C3.H/2-py)/S;
  return {x:C3.tgt.x+cx*b.rx+cy*b.ux, y:C3.tgt.y+cx*b.ry+cy*b.uy, z:C3.tgt.z+cx*b.rz+cy*b.uz};
}
function c3Fit(st){                                      // 自动取景：质心 + 包住所有天体
  var M=0,cx=0,cy=0,cz=0,i,mx=1;
  for(i=0;i<st.bs.length;i++){
    var b=st.bs[i];M+=b.m;cx+=b.m*b.x;cy+=b.m*b.y;cz+=b.m*(b.z||0);
    mx=Math.max(mx,Math.abs(b.x),Math.abs(b.y),Math.abs(b.z||0));
  }
  if(!st.bs.length){C3.Rv=1;return;}
  cx/=M;cy/=M;cz/=M;
  var k=0.08;
  C3.tgt.x+=((st.fix?0:cx)-C3.tgt.x)*k;
  C3.tgt.y+=((st.fix?0:cy)-C3.tgt.y)*k;
  C3.tgt.z+=((st.fix?0:cz)-C3.tgt.z)*k;
  var tgt=mx*1.35/Math.max(C3.zk,0.12);
  if(!C3.Rv||!isFinite(C3.Rv))C3.Rv=tgt;
  C3.Rv+= (tgt-C3.Rv)*0.06;
  if(C3.Rv<1)C3.Rv=1;
  c3SetD();
}

/* ---------- 星空：给一批固定方向，随视角一起转 ---------- */
var C3STAR=null;
function c3Stars(){
  if(C3STAR)return C3STAR;
  var s=9301,i,a,b,r,out=[];
  function rnd(){s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;}
  for(i=0;i<260;i++){
    a=rnd()*6.2832; b=Math.asin(rnd()*2-1); r=rnd();
    out.push({x:Math.cos(b)*Math.cos(a), y:Math.sin(b), z:Math.cos(b)*Math.sin(a),
              m:0.18+r*r*0.72, s:0.35+r*1.15});
  }
  C3STAR=out;return out;
}
function c3DrawStars(g){
  var b=c3Basis(),st=c3Stars(),i,p,cx,cy,cz,k,S=c3Scale(),X,Y;
  g.fillStyle='#05070f';g.fillRect(0,0,C3.W,C3.H);
  for(i=0;i<st.length;i++){
    cz=st[i].x*b.bx+st[i].y*b.by+st[i].z*b.bz;
    if(cz<-0.15)continue;
    cx=st[i].x*b.rx+st[i].y*b.ry+st[i].z*b.rz;
    cy=st[i].x*b.ux+st[i].y*b.uy+st[i].z*b.uz;
    k=C3.D/(C3.D+cz*C3.Rv*2.6);
    X=C3.W/2+cx*k*S*C3.Rv*2.6*3.1; Y=C3.H/2-cy*k*S*C3.Rv*2.6*3.1;
    if(X<-4||X>C3.W+4||Y<-4||Y>C3.H+4)continue;
    g.fillStyle='rgba(214,226,245,'+(st[i].m*(0.55+0.45*C3.zk>=1?1:1)).toFixed(2)+')';
    g.globalAlpha=clamp(st[i].m,0.1,1);
    g.beginPath();g.arc(X,Y,st[i].s,0,6.2832);g.fill();
  }
  g.globalAlpha=1;
}

/* ---------- 程序化球面贴图 ---------- */
var C3TX={};
var C3RT=(function(){
  try{
    var c=document.createElement('canvas');c.width=c.height=4;
    var x=c.getContext('2d');
    if(!x||!x.createImageData)return false;
    var im=x.createImageData(4,4);
    return !!(im&&im.data&&im.data.length===64);
  }catch(e){return false;}
})();
function txKey(b){return b.ty+'|'+b.c+'|'+b.c2;}
function txGet(b){
  var k=txKey(b);
  if(C3TX[k])return C3TX[k];
  var t=null;
  if(C3RT){try{t=txGen(b);}catch(e){t=null;}}
  C3TX[k]=t;return t;
}
function txGen(b){
  var W=200,H=100,i,j,x,y,r,n;
  var cv=document.createElement('canvas');cv.width=W;cv.height=H;
  var g=cv.getContext('2d');if(!g)return null;
  var s=0;for(i=0;i<b.n.length;i++)s=(s*31+b.n.charCodeAt(i))&0x7fffffff;
  s=s||17;
  function rnd(){s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;}
  function blob(cx,cy,rr,col,al){                       // 一团带毛边的斑块
    g.fillStyle=col;g.globalAlpha=al;
    for(j=0;j<7;j++){
      var a=rnd()*6.2832,d=rnd()*rr*0.55;
      g.beginPath();g.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,rr*(0.45+rnd()*0.6),0,6.2832);g.fill();
    }
    g.globalAlpha=1;
  }
  var ty=b.ty;
  if(ty==='earth'){
    var og=g.createLinearGradient(0,0,0,H);
    og.addColorStop(0,'#0b2f6b');og.addColorStop(0.5,'#12508f');og.addColorStop(1,'#0b2f6b');
    g.fillStyle=og;g.fillRect(0,0,W,H);
    for(i=0;i<9;i++){                                   // 大陆
      var lx=rnd()*W, ly=22+rnd()*(H-44), lr=10+rnd()*20;
      blob(lx,ly,lr,'#2f6b34',0.95);
      blob(lx+rnd()*8-4,ly+rnd()*8-4,lr*0.7,'#3f7a35',0.9);
      blob(lx+rnd()*10-5,ly+rnd()*6-3,lr*0.4,'#8a7a3e',0.55);
    }
    for(i=0;i<16;i++)blob(rnd()*W,rnd()*H,4+rnd()*9,'#2b5f2f',0.5);
    g.fillStyle='#e8f1f8';g.globalAlpha=0.85;           // 极冠
    g.fillRect(0,0,W,7);g.fillRect(0,H-7,W,7);g.globalAlpha=1;
    for(i=0;i<26;i++){                                  // 云带
      g.fillStyle='rgba(255,255,255,'+(0.10+rnd()*0.22).toFixed(2)+')';
      g.beginPath();g.ellipse?g.ellipse(rnd()*W,rnd()*H,6+rnd()*22,1.5+rnd()*3.5,0,0,6.2832):g.arc(rnd()*W,rnd()*H,6,0,6.2832);
      g.fill();
    }
  }else if(ty==='band'||ty==='ring'){
    var base=ty==='band'?['#c98a3c','#e6d2ab','#a9662e','#f0dcbb','#b87a45']
                        :['#e3c88a','#f3e3b8','#d4b571','#efe0b3'];
    for(y=0;y<H;y++){
      var t=y/H, w1=Math.sin(t*22+1.3)*0.5+0.5, w2=Math.sin(t*7.5)*0.5+0.5;
      var idx=Math.floor((w1*0.6+w2*0.4)*(base.length-1)+0.0)+0;
      g.fillStyle=base[clamp(idx,0,base.length-1)];
      g.fillRect(0,y,W,1);
    }
    for(i=0;i<200;i++){                                 // 湍流细节
      g.fillStyle='rgba(255,255,255,'+(rnd()*0.10).toFixed(2)+')';
      g.fillRect(rnd()*W,rnd()*H,4+rnd()*16,1);
    }
    if(ty==='band'){                                    // 大红斑
      g.globalAlpha=0.9;
      blob(W*0.62,H*0.63,13,'#c1440e',1);
      blob(W*0.62,H*0.63,7,'#e07a3a',1);
      g.globalAlpha=1;
    }
  }else if(ty==='ice'){
    var ig=g.createLinearGradient(0,0,0,H);
    ig.addColorStop(0,'#7fd8e8');ig.addColorStop(0.5,'#4aa8d8');ig.addColorStop(1,'#6fc9e0');
    g.fillStyle=ig;g.fillRect(0,0,W,H);
    for(i=0;i<40;i++){
      g.fillStyle='rgba(255,255,255,'+(rnd()*0.16).toFixed(2)+')';
      g.fillRect(0,rnd()*H,W,1+rnd()*2);
    }
    for(i=0;i<8;i++)blob(rnd()*W,rnd()*H,5+rnd()*8,'#e8fbff',0.35);
  }else if(ty==='star'){
    var sg=g.createLinearGradient(0,0,0,H);
    sg.addColorStop(0,'#ffcf5c');sg.addColorStop(0.5,'#fff2b8');sg.addColorStop(1,'#ffcf5c');
    g.fillStyle=sg;g.fillRect(0,0,W,H);
    for(i=0;i<420;i++){                                 // 米粒组织
      var gr=1.4+rnd()*3.4;
      g.fillStyle=rnd()>0.5?'rgba(255,246,200,0.5)':'rgba(226,140,20,0.32)';
      g.beginPath();g.arc(rnd()*W,rnd()*H,gr,0,6.2832);g.fill();
    }
    for(i=0;i<5;i++){                                   // 黑子
      var sx2=rnd()*W, sy2=18+rnd()*(H-36), sr=3+rnd()*6;
      g.fillStyle='rgba(120,60,10,0.55)';g.beginPath();g.arc(sx2,sy2,sr*1.8,0,6.2832);g.fill();
      g.fillStyle='rgba(40,18,4,0.85)';g.beginPath();g.arc(sx2,sy2,sr,0,6.2832);g.fill();
    }
  }else if(ty==='ns'){
    g.fillStyle='#f7e8ff';g.fillRect(0,0,W,H);
    for(i=0;i<60;i++)blob(rnd()*W,rnd()*H,3+rnd()*7,'#c026d3',0.35);
    for(i=0;i<10;i++)blob(rnd()*W,rnd()*H,2+rnd()*3,'#ffffff',0.8);
  }else if(ty==='bh'){
    g.fillStyle='#05070c';g.fillRect(0,0,W,H);
    for(i=0;i<40;i++)blob(rnd()*W,rnd()*H,2+rnd()*5,'#7c3aed',0.22);
  }else{                                                // rock：水星/金星/月球/火星
    g.fillStyle=b.c;g.fillRect(0,0,W,H);
    var dark=(b.n==='火星');
    for(i=0;i<12;i++)blob(rnd()*W,rnd()*H,12+rnd()*22,'#5b5750',0.30);   // 月海／暗原
    for(i=0;i<70;i++){                                  // 陨石坑：暗底 + 亮边
      var kx=rnd()*W, ky=rnd()*H, kr=1.6+rnd()*7;
      g.fillStyle='rgba(0,0,0,'+(0.10+rnd()*0.20).toFixed(2)+')';
      g.beginPath();g.arc(kx,ky,kr,0,6.2832);g.fill();
      g.strokeStyle='rgba(255,255,255,0.20)';g.lineWidth=0.9;
      g.beginPath();g.arc(kx,ky,kr*0.92,0,6.2832);g.stroke();
    }
    if(b.n==='金星'){
      for(i=0;i<70;i++){
        g.fillStyle='rgba(255,232,190,'+(rnd()*0.30).toFixed(2)+')';
        g.beginPath();g.ellipse?g.ellipse(rnd()*W,rnd()*H,8+rnd()*20,2+rnd()*4,0,0,6.2832):g.arc(rnd()*W,rnd()*H,8,0,6.2832);
        g.fill();
      }
    }
    if(dark){
      g.fillStyle='#f5f1ec';g.globalAlpha=0.9;
      g.fillRect(0,0,W,6);g.fillRect(0,H-6,W,6);g.globalAlpha=1;
      for(i=0;i<9;i++)blob(rnd()*W,20+rnd()*(H-40),6+rnd()*12,'#8a3b22',0.35);
    }
  }
  var d=g.getImageData(0,0,W,H);
  return {w:W,h:H,d:d.data};
}

/* ---------- 球体着色：球面贴图 + 漫反射 + 高光 ---------- */
var C3BUF=null,C3IM=null;
function sphUV(nx,ny,nz,cph,sph,ct,st){        // 相机法线 → 天体本地经纬度 → 贴图 uv
  var x1=nx*cph+nz*sph, z1=-nx*sph+nz*cph;      // 先绕 Y 转 -phase（自转）
  var x2=x1*ct-ny*st,  y2=x1*st+ny*ct;          // 再绕 Z 转 -tilt（自转轴倾角）
  var la=Math.asin(clamp(y2,-1,1));
  var lo=Math.atan2(x2,z1);
  return {u:lo/6.283185307+0.5, v:0.5-la/3.14159265};
}
function sphPix(g,SX,SY,R,b,tex,lit){
  var R2=Math.round(R*2)+2, w=R2, h=R2;
  if(!C3BUF)C3BUF=document.createElement('canvas');
  if(C3BUF.width<w||C3BUF.height<h){C3BUF.width=Math.max(w,64);C3BUF.height=Math.max(h,64);}
  var bg=C3BUF.getContext('2d');
  bg.clearRect(0,0,w,h);
  var ck='w'+w;
  if(!C3IM)C3IM={};
  if(!C3IM[ck]||C3IM[ck].width!==w)C3IM[ck]=bg.createImageData(w,h);
  var im=C3IM[ck], D=im.data, i,j;
  var cx=w/2, cy=h/2;
  var lx=lit.x, ly=lit.y, lz=lit.z, ll=Math.sqrt(lx*lx+ly*ly+lz*lz)||1;
  lx/=ll;ly/=ll;lz/=ll;
  var self=(b.ty==='star'||b.ty==='ns'||b.ty==='bh');
  var ph=b.sp||0, tl=b.tilt||0;
  var cph=Math.cos(-ph), sph=Math.sin(-ph), ct=Math.cos(-tl), st=Math.sin(-tl);
  var TW=tex.w, TH=tex.h, TD=tex.d;
  var amb=self?0.92:0.13, dif=self?0.15:0.95, spk=(b.ty==='earth')?0.42:0.16;
  var rim=(b.ty==='earth'||b.ty==='ice')?0.55:0.16;
  for(j=0;j<h;j++){
    var v=(cy-j)/R;
    for(i=0;i<w;i++){
      var u=(i-cx)/R, q=u*u+v*v;
      var o=(j*w+i)*4;
      if(q>1){D[o+3]=0;continue;}
      var cov=R-R*Math.sqrt(q)+0.5; if(cov>1)cov=1; if(cov<0)cov=0;
      var nz=Math.sqrt(1-q);
      var nx=u, ny=v;
      var uv=sphUV(nx,ny,nz,cph,sph,ct,st);
      var tu=uv.u, tv=uv.v;
      var px=clamp(Math.floor(tu*TW),0,TW-1), py=clamp(Math.floor(tv*TH),0,TH-1);
      var q2=(py*TW+px)*4;
      var cr=TD[q2], cg=TD[q2+1], cb=TD[q2+2];
      var d2=nx*lx+ny*ly+nz*lz; if(d2<0)d2=0;
      if(self)d2=1;
      var sh=amb+dif*d2;
      // 镜面：半程向量与法线
      var hx=lx, hy=ly, hz=lz+1, hl=Math.sqrt(hx*hx+hy*hy+hz*hz)||1;
      var sd=(nx*hx+ny*hy+nz*hz)/hl; if(sd<0)sd=0;
      var sp2=Math.pow(sd,26)*spk*(1-(self?1:0));
      var rr=1-Math.sqrt(q), rimg=rim*Math.pow(rr,3.2);
      var R1=cr*sh+255*sp2+120*rimg;
      var G1=cg*sh+255*sp2+170*rimg;
      var B1=cb*sh+255*sp2+255*rimg;
      if(self){R1=Math.min(255,cr*1.12+40);G1=Math.min(255,cg*1.1+26);B1=Math.min(255,cb*1.05+10);}
      D[o]=R1>255?255:R1; D[o+1]=G1>255?255:G1; D[o+2]=B1>255?255:B1;
      D[o+3]=cov*255;
    }
  }
  bg.putImageData(im,0,0);
  g.drawImage(C3BUF,0,0,w,h,SX-cx,SY-cy,w,h);
}
function sphFlat(g,SX,SY,R,b,lit){
  var rg=g.createRadialGradient(SX-lit.x*R*0.42,SY+lit.y*R*0.42,R*0.08,SX,SY,R*1.06);
  rg.addColorStop(0,b.c);rg.addColorStop(0.62,b.c);rg.addColorStop(1,b.c2);
  g.fillStyle=rg;g.beginPath();g.arc(SX,SY,R,0,6.2832);g.fill();
  if(b.ty==='star'||b.ty==='ns'){
    var rg2=g.createRadialGradient(SX,SY,R*0.2,SX,SY,R*3.4);
    rg2.addColorStop(0,'rgba(255,236,150,0.42)');rg2.addColorStop(1,'rgba(255,236,150,0)');
    g.fillStyle=rg2;g.beginPath();g.arc(SX,SY,R*3.4,0,6.2832);g.fill();
  }
}

/* ---------- 三维轨迹 ---------- */
function c3Trail(g,st){
  var i,j,b,p0,p1,a,n;
  g.lineWidth=1;
  for(i=0;i<ASTRO.T.length;i++){
    var T=ASTRO.T[i];if(!T||T.length<2)continue;
    var col=st.bs[i]?st.bs[i].c:'#94a3b8';
    g.strokeStyle=col;g.globalAlpha=0.34;
    g.beginPath();n=0;
    for(j=0;j<T.length;j++){
      var p=c3Proj({x:T[j][0],y:T[j][1],z:T[j][2]||0});
      if(!p){n=0;continue;}
      if(n===0)g.moveTo(p.X,p.Y);else g.lineTo(p.X,p.Y);
      n++;
    }
    g.stroke();
  }
  g.globalAlpha=1;
}

/* ---------- 土星环（跟随倾角，按深度分片插入排序） ---------- */
function c3Ring(g,b,items,tilt){
  var N=54,i,a1,a2,pA,pB,r0=b.rm*1.55,r1=b.rm*2.35;
  var ct=Math.cos(tilt),st2=Math.sin(tilt);
  for(i=0;i<N;i++){
    a1=6.2832*i/N; a2=6.2832*(i+1)/N;
    var A={x:b.x+Math.cos(a1)*r0,y:b.y+Math.sin(a1)*r0*st2,z:(b.z||0)+Math.sin(a1)*r0*ct};
    var B={x:b.x+Math.cos(a2)*r0,y:b.y+Math.sin(a2)*r0*st2,z:(b.z||0)+Math.sin(a2)*r0*ct};
    var C={x:b.x+Math.cos(a2)*r1,y:b.y+Math.sin(a2)*r1*st2,z:(b.z||0)+Math.sin(a2)*r1*ct};
    var D={x:b.x+Math.cos(a1)*r1,y:b.y+Math.sin(a1)*r1*st2,z:(b.z||0)+Math.sin(a1)*r1*ct};
    pA=c3Proj(A);pB=c3Proj(B);
    var pC=c3Proj(C),pD=c3Proj(D);
    if(!pA||!pB||!pC||!pD)continue;
    var zz=(pA.z+pB.z+pC.z+pD.z)/4;
    var mid=Math.cos((a1+a2)/2), sh=0.35+0.65*Math.abs(Math.sin((a1+a2)/2));
    items.push({z:zz,f:function(g,pA,pB,pC,pD,sh){
      g.fillStyle='rgba(238,214,158,'+(0.10+0.30*sh).toFixed(3)+')';
      g.beginPath();g.moveTo(pA.X,pA.Y);g.lineTo(pB.X,pB.Y);g.lineTo(pC.X,pC.Y);g.lineTo(pD.X,pD.Y);g.closePath();g.fill();
    }.bind(null,g,pA,pB,pC,pD,sh)});
  }
}

/* ---------- 黑洞吸积盘 ---------- */
function c3Disk(g,b,items){
  var N=40,i,a1,a2,pA,pB,r0=b.rm*2.2,r1=b.rm*4.4;
  for(i=0;i<N;i++){
    a1=6.2832*i/N;a2=6.2832*(i+1)/N;
    var A={x:b.x+Math.cos(a1)*r0,y:b.y,z:(b.z||0)+Math.sin(a1)*r0};
    var B={x:b.x+Math.cos(a2)*r0,y:b.y,z:(b.z||0)+Math.sin(a2)*r0};
    var C={x:b.x+Math.cos(a2)*r1,y:b.y,z:(b.z||0)+Math.sin(a2)*r1};
    var D={x:b.x+Math.cos(a1)*r1,y:b.y,z:(b.z||0)+Math.sin(a1)*r1};
    var pA=c3Proj(A),pB=c3Proj(B),pC=c3Proj(C),pD=c3Proj(D);
    if(!pA||!pB||!pC||!pD)continue;
    var t=i/N, hot=t<0.5?1:0.5;
    items.push({z:(pA.z+pB.z+pC.z+pD.z)/4-0.001,f:function(g,pA,pB,pC,pD,hot){
      g.fillStyle='rgba('+(255)+','+(150+70*hot)+','+(60+120*hot)+','+(0.16+0.22*hot).toFixed(3)+')';
      g.beginPath();g.moveTo(pA.X,pA.Y);g.lineTo(pB.X,pB.Y);g.lineTo(pC.X,pC.Y);g.lineTo(pD.X,pD.Y);g.closePath();g.fill();
    }.bind(null,g,pA,pB,pC,pD,hot)});
  }
}

/* ---------- 板块定义 ---------- */
Scenes.cosmos={
id:'cosmos',name:'天体沙盒（三维）',
brief:'放几个天体进去，看它们互相拽着跑。点一下放一个，拖一下给它初速度——拖出去大约四分之一屏宽，就是那个位置的环绕速度，画面上会直接标出来。视角可以拖着转、滚轮缩放；手机上打开陀螺仪，转一下手机视角就跟着动。',
params:[
  {key:'preset',label:'预设（0内太阳系 1地月 2双星 3双星+行星 4三星8字 5星团 6撞击 7空白）',min:0,max:7,step:1,def:0,unit:''},
  {key:'mode',label:'操作（0拖动摆位 1添加/甩出 2删除 3转视角）',min:0,max:3,step:1,def:1,unit:''},
  {key:'newB',label:'要放的天体（编号同模型台）',min:0,max:11,step:1,def:3,unit:''},
  {key:'spd',label:'时间流速',min:0.1,max:6,step:0.1,def:1,unit:'×'},
  {key:'coll',label:'碰撞后（0合并 1弹开）',min:0,max:1,step:1,def:0,unit:''}
],
init:function(P){
  var st={t:0,simT:0,Rv:1,bs:[],soft2:1e8,dtMax:1,Tref:1,ts:1,vref:1e3,
          r0:1e11,eRef:1,drag:null,cmsg:'',events:[],fix:0};
  cosLoad(st,clamp(Math.round(P.preset),0,7));
  st.ts=st.Tref/8*clamp(P.spd,0.05,20);
  C3.zk=1;C3.yaw=-0.62;C3.pitch=0.34;C3.tgt={x:0,y:0,z:0};
  c3Fit(st);C3.Rv=C3.Rv||1;c3SetD();
  ASTRO.T=[];
  for(var i=0;i<st.bs.length;i++)ASTRO.T.push([[st.bs[i].x,st.bs[i].y,st.bs[i].z||0]]);
  COS.ps=st.bs.length-1;
  return st;
},
step:function(st,P,h){
  if(st.bs.length===0||st.drag)return;
  var left=h*st.ts,i=0,k,hh,base=Math.min(st.dtMax,h*st.ts);
  while(left>0&&i<2000){
    hh=Math.min(left,abSafeH(st.bs,base));
    if(!(hh>0))hh=left;
    abStepBS(st.bs,hh,st.soft2);
    st.simT+=hh;left-=hh;i++;
    if(i%6===0||left<=0){
      for(k=0;k<st.bs.length;k++){
        if(!ASTRO.T[k])ASTRO.T[k]=[];
        ASTRO.T[k].push([st.bs[k].x,st.bs[k].y,st.bs[k].z||0]);
        if(ASTRO.T[k].length>700)ASTRO.T[k].shift();
      }
    }
    if(cosCollide(st,P))break;
  }
  for(k=0;k<st.bs.length;k++)st.bs[k].sp=(st.bs[k].sp||0)+hh*0;
  cosCull(st);
  c3Fit(st);
},
finished:function(st){return false;},
stage:function(st){
  var base=st.bs.length+' 个天体 · '+abTimeStr(st.simT);
  if(st.drag&&st.drag.kind==='vel')return base+'　｜　松手发射：'+st.drag.msg;
  var op=['拖动摆位','点空白添加 · 拖一下给速度','点天体删除','拖动转视角'][clamp(Math.round(App.P.mode),0,3)];
  return base+'　｜　'+op+(st.cmsg?'　｜　'+st.cmsg:'');
},
vel:function(st){
  return [st.bs.length>0?abV(st.bs[0])/1e3:0, st.bs.length>1?abV(st.bs[1])/1e3:0];
},
en:function(st){
  var E=abEnergy(st.bs),ref=Math.max(st.eRef,1e-30);
  return [E.Ek/ref,E.Ep/ref,E.E/ref];
},
info:function(st,P){
  var rows=[],i,E=abEnergy(st.bs);
  rows.push(['天体数量',st.bs.length+' 个　总质量 '+abMtot(st.bs).toExponential(3)+' kg']);
  rows.push(['模拟时间',abTimeStr(st.simT)]);
  rows.push(['系统动能',E.Ek.toExponential(3)+' J']);
  rows.push(['系统势能',E.Ep.toExponential(3)+' J']);
  rows.push(['总机械能',E.E.toExponential(3)+' J'+(E.E>=0?'　（不受束缚，会有天体飞走）':'　（束缚系统）')]);
  rows.push(['当前操作',['拖动摆位','添加 / 甩出速度','点选删除','拖动转视角'][clamp(Math.round(P.mode),0,3)]+
             '　｜　待放置：'+aBody(P.newB).n]);
  rows.push(['怎么用','拖到约 1/4 屏宽就是该处环绕速度；小于 0.35 倍会掉下去，超过 1.41 倍会飞走']);
  rows.push(['视角','方位 '+fmt(C3.yaw*57.3,0)+'°　俯仰 '+fmt(C3.pitch*57.3,0)+'°　视野半径 '+abDistStr(C3.Rv)+
             (C3.gy?'　陀螺仪开':'')]);
  for(i=0;i<Math.min(st.bs.length,8);i++){
    var b=st.bs[i];
    rows.push(['#'+i+' '+b.n,'m='+b.m.toExponential(2)+' kg　r='+abDistStr(Math.sqrt(b.x*b.x+b.y*b.y+b.z*b.z))+'　v='+fmt(abV(b)/1e3,2)+' km/s']);
  }
  if(st.events.length)rows.push(['最近事件',st.events[st.events.length-1]]);
  return rows;
},
bounds:function(st){
  return {x:[-1.28,1.28],y:[-1.28,1.28]};
},
draw:function(g,st,P,view,opts){
  var W=view.W,H=view.H,i,b,p,sel;
  opts=opts||{};
  C3.W=W;C3.H=H;C3.view=view;
  c3Fit(st);
  c3DrawStars(g);
  c3Trail(g,st);

  /* 光源：取质量最大的天体作为照明方向 */
  var li=-1,mm=-1;
  for(i=0;i<st.bs.length;i++)if(st.bs[i].m>mm){mm=st.bs[i].m;li=i;}
  var Lp=li>=0?st.bs[li]:{x:0,y:1,z:1};

  var items=[],bs=c3Basis();
  function toCam(v){
    return {x:v.x*bs.rx+v.y*bs.ry+v.z*bs.rz, y:v.x*bs.ux+v.y*bs.uy+v.z*bs.uz, z:v.x*bs.bx+v.y*bs.by+v.z*bs.bz};
  }
  var proj=[],Rb=[],q3,ord=[],used=0,rt=[];
  for(i=0;i<st.bs.length;i++){
    b=st.bs[i];
    p=c3Proj({x:b.x,y:b.y,z:b.z||0});
    proj.push(p);
    Rb.push(p?clamp(abPix(b.rm)*Math.pow(p.k,0.35)*0.78,1.1,48):0);
    if(p)ord.push(i);
  }
  ord.sort(function(a,c){return Rb[c]-Rb[a];});          // 大的先精细，超预算的退回渐变球
  for(q3=0;q3<ord.length;q3++){
    var cost=4*Rb[ord[q3]]*Rb[ord[q3]]+200;
    if(used+cost<=110000){used+=cost;rt[ord[q3]]=1;}
  }
  for(i=0;i<st.bs.length;i++){
    p=proj[i];if(!p)continue;
    b=st.bs[i];
    var R=Rb[i];
    var dv={x:Lp.x-b.x,y:Lp.y-b.y,z:(Lp.z||0)-(b.z||0)};
    var lit=toCam(dv);
    var ll=Math.sqrt(lit.x*lit.x+lit.y*lit.y+lit.z*lit.z)||1;
    lit={x:lit.x/ll,y:lit.y/ll,z:lit.z/ll};
    if(i===li)lit={x:-0.45,y:0.5,z:0.74};
    var tex=txGet(b);
    if(b.ty==='ring')c3Ring(g,b,items,0.42);
    if(b.ty==='bh')c3Disk(g,b,items);
    items.push({z:p.z,f:mk(g,p.X,p.Y,R,b,lit,tex,i,st,!!rt[i])});
  }
  items.sort(function(a,c){return c.z-a.z;});
  for(i=0;i<items.length;i++)items[i].f();

  /* 拖拽中的速度箭头 */
  if(st.drag&&st.drag.kind==='vel'&&proj[st.drag.i]){
    var s=st.drag, pb=proj[s.i], pe=c3Proj({x:s.cx,y:s.cy,z:s.cz||0});
    if(pb&&pe){
      arrow(g,pb.X,pb.Y,pe.X,pe.Y,'#fde047',2);
      label(g,pe.X+8,pe.Y-8,s.msg,'#fde047','left');
    }
  }
  /* 角标与按钮 */
  g.font='bold 12px -apple-system,"Microsoft YaHei",sans-serif';g.textAlign='left';
  g.fillStyle='rgba(148,163,184,0.95)';
  g.fillText('天体沙盒 · '+COSNAME[clamp(Math.round(P.preset),0,7)],10,16);
  if(C3.gyMsg){g.fillStyle='rgba(253,224,71,0.95)';g.fillText(C3.gyMsg,10,32);}
  C3.btn=[];
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
    g.lineWidth=1;rrect(g,bt.x,bt.y,bt.w,bt.h,6);g.stroke();
    g.fillStyle='rgba(226,232,240,0.95)';g.textAlign='center';
    g.font='12px -apple-system,"Microsoft YaHei",sans-serif';
    g.fillText(bt.t,bt.x+bt.w/2,bt.y+16);
    g.textAlign='left';
  }
  /* 手触陀螺盘：手指在圆盘上滑动就转视角，没有体感陀螺仪的设备也能用 */
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
  label(g,10,H-10,tip+(C3.tp?'；右下角圆盘也能转视角':''),'rgba(148,163,184,0.7)','left');
}
};

/* 天体绘制闭包（放在外面，避免循环内建函数） */
function mk(g,X,Y,R,b,lit,tex,i,st,doRT){
  return function(){
    var sel=(st.drag&&st.drag.i===i);
    var glow=(b.ty==='star'||b.ty==='ns');
    if(glow){
      var rg=g.createRadialGradient(X,Y,R*0.4,X,Y,R*4.6);
      rg.addColorStop(0,b.ty==='ns'?'rgba(233,213,255,0.42)':'rgba(255,224,120,0.34)');
      rg.addColorStop(1,'rgba(255,224,120,0)');
      g.fillStyle=rg;g.beginPath();g.arc(X,Y,R*4.6,0,6.2832);g.fill();
    }
    if(b.ty==='bh'){
      var rg2=g.createRadialGradient(X,Y,R*0.9,X,Y,R*3.6);
      rg2.addColorStop(0,'rgba(124,58,237,0.42)');rg2.addColorStop(1,'rgba(124,58,237,0)');
      g.fillStyle=rg2;g.beginPath();g.arc(X,Y,R*3.6,0,6.2832);g.fill();
    }
    if(tex&&R>=7&&doRT)sphPix(g,X,Y,R,b,tex,lit);
    else sphFlat(g,X,Y,R,b,lit);
    if(sel){
      g.strokeStyle='#facc15';g.lineWidth=1.4;g.setLineDash([3,3]);
      g.beginPath();g.arc(X,Y,R+6,0,6.2832);g.stroke();g.setLineDash([]);
    }
  };
}
function rrect(g,x,y,w,h,r){
  g.beginPath();
  g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);
  g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);
  g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();
}

/* ---------- 指针：屏幕像素 ↔ 三维世界 ---------- */
function c3Pix(wx,wy){
  var v=C3.view;
  if(!v)return {x:C3.W/2,y:C3.H/2};
  return {x:wx*v.scale+v.ox, y:wy*(-v.scale)+v.oy};
}
Scenes.cosmos.pointerDown=function(wx,wy,st,P){
  var q=c3Pix(wx,wy),i,bt;
  for(i=0;i<C3.btn.length;i++){
    bt=C3.btn[i];
    if(q.x>=bt.x&&q.x<=bt.x+bt.w&&q.y>=bt.y&&q.y<=bt.y+bt.h){
      if(bt.a===1)gyToggle();
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
  var md=clamp(Math.round(P.mode),0,3);
  if(md===3)return {kind:'cam',px:q.x,py:q.y,y0:C3.yaw,p0:C3.pitch};
  var w=c3Unproj(q.x,q.y), hit=cosPick(st,q);
  if(md===2){
    if(hit>=0){var nm=st.bs[hit].n;st.bs.splice(hit,1);ASTRO.T.splice(hit,1);COS.ps=st.bs.length-1;
      st.cmsg='已删除 '+nm;st.events.push('删除了 '+nm);}
    return null;
  }
  if(md===0){
    if(hit<0)return null;
    return {kind:'move',i:hit,x:w.x,y:w.y,z:w.z};
  }
  if(hit<0){
    var nb=aBody(P.newB);
    st.bs.push({x:w.x,y:w.y,z:w.z,vx:0,vy:0,vz:0,m:nb.M,rm:nb.R,c:nb.c,c2:nb.c2,ty:nb.ty,n:nb.n,
                sp:0,tilt:(nb.ty==='earth'?0.41:(nb.ty==='ring'?0.47:0.12))});
    ASTRO.T.push([[w.x,w.y,w.z]]);
    hit=st.bs.length-1;COS.ps=hit;
    st.events.push('放置了 '+nb.n);
    cosRetune(st);c3Fit(st);
  }
  return {kind:'vel',i:hit,cx:w.x,cy:w.y,cz:w.z,msg:'',vx:0,vy:0,vz:0};
};
Scenes.cosmos.pointerMove=function(wx,wy,st,P,dr){
  var q=c3Pix(wx,wy);
  if(dr.kind==='tilt'){
    C3.yaw+=(q.x-dr.lx)*0.011;
    C3.pitch=clamp(C3.pitch-(q.y-dr.ly)*0.011,-1.45,1.45);
    dr.lx=q.x;dr.ly=q.y;
    return;
  }
  if(dr.kind==='cam'){
    C3.yaw=dr.y0-(q.x-dr.px)*0.007;
    C3.pitch=clamp(dr.p0+(q.y-dr.py)*0.007,-1.45,1.45);
    C3.gy=0;
    return;
  }
  var w=c3Unproj(q.x,q.y);
  if(dr.kind==='move'){
    var b0=st.bs[dr.i];
    b0.x=w.x;b0.y=w.y;b0.z=w.z;
    b0.vx=0;b0.vy=0;b0.vz=0;
    return;
  }
  var b=st.bs[dr.i], pb=c3Proj({x:b.x,y:b.y,z:b.z||0});
  if(!pb)return;
  var S=c3Scale(), kk=Math.max(pb.k,0.05);
  var ux=(q.x-pb.X)/(S*kk), uy=-(q.y-pb.Y)/(S*kk);      // 屏幕像素 → 该深度处的世界长度
  var kv=0.25*Math.min(C3.W||760,C3.H||420)/S;          // 拖 1/4 画面 ≈ 该处环绕速度
  var vc=cosVcirc(st,b), sc2=vc/Math.max(kv,1e-9);
  var bs2=c3Basis();
  var dx=bs2.rx*ux+bs2.ux*uy, dy=bs2.ry*ux+bs2.uy*uy, dz=bs2.rz*ux+bs2.uz*uy;
  var vx=dx*sc2, vy=dy*sc2, vz=dz*sc2;
  var vv=Math.sqrt(vx*vx+vy*vy+vz*vz), ratio=vv/Math.max(vc,1e-9);
  dr.cx=b.x+dx;dr.cy=b.y+dy;dr.cz=(b.z||0)+dz;
  dr.vx=vx;dr.vy=vy;dr.vz=vz;
  dr.msg=fmt(vv/1e3,2)+' km/s = '+fmt(ratio,2)+'×环绕'+
         (ratio>=1.414?' · 会飞走':(ratio<0.35?' · 会掉下去':' · 椭圆轨道'));
  st.drag=dr;
};
Scenes.cosmos.pointerUp=function(st,P,dr){
  if(dr.kind==='vel'&&st.bs[dr.i]){
    var b=st.bs[dr.i];
    b.vx=dr.vx||0;b.vy=dr.vy||0;b.vz=dr.vz||0;
    st.events.push(b.n+' 以 '+fmt(abV(b)/1e3,2)+' km/s 甩出');
  }
  st.drag=null;st.cmsg='';
  cosRetune(st);c3Fit(st);
  ASTRO.T=[];
  for(var i=0;i<st.bs.length;i++)ASTRO.T.push([[st.bs[i].x,st.bs[i].y,st.bs[i].z||0]]);
};

Scenes.cosmos.charts={
  vel:{field:'v',title:'速率',unit:'km/s',
    keys:[{label:'天体① v',color:'#22d3ee'},{label:'天体② v',color:'#f59e0b',dash:true}]},
  en:{field:'e',title:'机械能（以初始势能为 1）',unit:'E / |Ep₀|',
    keys:[{label:'动能 Ek',color:'#2563eb'},{label:'势能 Ep',color:'#7c3aed',dash:true},{label:'总机械能 E',color:'#16a34a'}]}
};

/* ---------- 陀螺仪 ---------- */
function gyToggle(){
  if(C3.gy){C3.gy=0;C3.gyMsg='陀螺仪已关';gyUnbind();return;}
  if(typeof window==='undefined'||typeof window.DeviceOrientationEvent==='undefined'){
    C3.gyMsg='这个设备没有陀螺仪，用「转视角」模式或鼠标拖画面';return;
  }
  var R=window.DeviceOrientationEvent.requestPermission;
  if(typeof R==='function'){
    R().then(function(r){
      if(r==='granted'){gyBind();}
      else C3.gyMsg='没拿到陀螺仪权限';
    })['catch'](function(){C3.gyMsg='陀螺仪权限被拒绝';});
  }else gyBind();
}
function gyBind(){
  C3.gy=1;C3.gyBase=null;C3.gyMsg='陀螺仪已开，转一下手机';
  window.addEventListener('deviceorientation',gyOri,false);
  setTimeout(function(){if(!C3.gyLive)C3.gyMsg='没读到陀螺仪数据，可能是桌面设备';},1200);
}
function gyUnbind(){
  try{window.removeEventListener('deviceorientation',gyOri,false);}catch(e){}
  C3.gyLive=0;
}
function gyOri(e){
  if(e.alpha==null&&e.beta==null&&e.gamma==null)return;
  C3.gyLive=1;
  if(!C3.gyBase){C3.gyBase={a:e.alpha||0,b:e.beta||0};C3.gyY0=C3.yaw;C3.gyP0=C3.pitch;return;}
  var da=(e.alpha||0)-C3.gyBase.a, db=(e.beta||0)-C3.gyBase.b;
  while(da>180)da-=360;while(da<-180)da+=360;
  while(db>180)db-=360;while(db<-180)db+=360;
  C3.yaw=C3.gyY0-da*0.0174533;
  C3.pitch=clamp(C3.gyP0+db*0.0174533,-1.45,1.45);
}

/* ---------- 预设：带一点轨道倾角，三维里更好看 ---------- */
function cosLoad(st,k){
  var G=ASTRO.G,i,au=ASTRO.AU,E,Moon,dM,vM,rS,vS,S,L,w,b2,rr,vv,M0,L0,sc,px,py,vx,vy,T,Imp,pl;
  function B(o,x,y,z,vx2,vy2,vz2,nm){
    return {x:x,y:y,z:z,vx:vx2,vy:vy2,vz:vz2,m:o.M,rm:o.R,c:o.c,c2:o.c2,ty:o.ty,
            n:nm||o.n,sp:0,tilt:(o.ty==='earth'?0.41:(o.ty==='ring'?0.47:0.15))};
  }
  function sun(){return B(aBody(0),0,0,0,0,0,0,'太阳');}
  st.bs=[];st.events=[];
  if(k===0){
    st.bs.push(sun());
    pl=[[1,0.387,0.06],[2,0.723,-0.04],[3,1.0,0.02],[5,1.524,0.05]];
    for(i=0;i<pl.length;i++){
      b2=aBody(pl[i][0]);rr=pl[i][1]*au;vv=Math.sqrt(G*1.989e30/rr);
      var an=i*1.9, inc=pl[i][2];
      st.bs.push(B(b2,rr*Math.cos(an),rr*Math.sin(an)*Math.sin(inc),rr*Math.sin(an)*Math.cos(inc),
                   -vv*Math.sin(an),vv*Math.cos(an)*Math.sin(inc),vv*Math.cos(an)*Math.cos(inc)));
    }
  }else if(k===1){
    E=aBody(3);Moon=aBody(4);
    dM=3.844e8;vM=Math.sqrt(G*E.M/dM);rS=E.R*2.4;vS=Math.sqrt(G*E.M/rS);
    st.bs.push(B(E,0,0,0,0,0,0,'地球'));
    st.bs.push(B(Moon,dM,0,0,0,0,vM,'月球'));
    st.bs.push({x:0,y:0,z:-rS,vx:vS,vy:0,vz:0,m:1e3,rm:2.2e6,c:'#e2e8f0',c2:'#94a3b8',ty:'rock',n:'人造卫星',sp:0,tilt:0});
  }else if(k===2){
    S=aBody(0);L=1.2e10;w=Math.sqrt(G*(S.M*2)/(L*L*L));
    st.bs.push(B(S,-L/2,0,0,0,0,-w*L/2,'星 A'));
    st.bs.push(B(S,L/2,0,0,0,0,w*L/2,'星 B'));
  }else if(k===3){
    S=aBody(0);var mA=S.M,mB=S.M*0.6,mt=mA+mB;
    L=8e9;w=Math.sqrt(G*mt/(L*L*L));rr=L*4.2;vv=Math.sqrt(G*mt/rr);b2=aBody(6);
    st.bs.push(B(S,-mB*L/mt,0,0,0,0,-w*(mB*L/mt),'主星'));
    st.bs.push(B(S,mA*L/mt,0,0,0,0,w*(mA*L/mt),'伴星'));
    st.bs.push(B(b2,0,rr*0.55,rr*0.83,0,-vv*0.83,vv*0.55,'木星'));
  }else if(k===4){
    M0=1.2e30;L0=1.1e11;sc=Math.sqrt(G*M0/L0);
    px=0.97000436;py=-0.24308753;vx=0.93240737;vy=0.86473146;
    st.bs.push({x:px*L0,y:py*L0,z:0,vx:vx/2*sc,vy:vy/2*sc,vz:0,m:M0,rm:6e8,c:'#fde047',c2:'#f59e0b',ty:'star',n:'星 1',sp:0,tilt:0});
    st.bs.push({x:-px*L0,y:-py*L0,z:0,vx:vx/2*sc,vy:vy/2*sc,vz:0,m:M0,rm:6e8,c:'#7dd3fc',c2:'#0ea5e9',ty:'star',n:'星 2',sp:0,tilt:0});
    st.bs.push({x:0,y:0,z:0,vx:-vx*sc,vy:-vy*sc,vz:0,m:M0,rm:6e8,c:'#fca5a5',c2:'#ef4444',ty:'star',n:'星 3',sp:0,tilt:0});
  }else if(k===5){
    st.bs.push(sun());
    var sd=11;
    function rnd(){sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;}
    for(i=0;i<7;i++){
      b2=aBody([1,2,3,5,6,7,8,9][i%8]);
      rr=(0.25+0.75*rnd())*au;var an=rnd()*6.2832, inc=(rnd()-0.5)*0.34;
      vv=Math.sqrt(G*1.989e30/rr)*(0.78+0.3*rnd());
      st.bs.push(B(b2,rr*Math.cos(an),rr*Math.sin(an)*Math.sin(inc),rr*Math.sin(an)*Math.cos(inc),
                     -vv*Math.sin(an),vv*Math.cos(an)*Math.sin(inc),vv*Math.cos(an)*Math.cos(inc)));
    }
  }else if(k===6){
    T=aBody(3);Imp=aBody(5);
    st.bs.push(B(T,0,0,0,0,0,0,'地球'));
    st.bs.push(B(Imp,-2.6e8,2.0e8,3.1e7,5.6e3,-4.3e3,-5.5e2,'火星'));
  }else{
    C3.Rv=1.5e9;
  }
  if(st.bs.length){
    abZeroMom(st.bs);
    st.r0=1;
    for(i=0;i<st.bs.length;i++)
      st.r0=Math.max(st.r0,Math.sqrt(st.bs[i].x*st.bs[i].x+st.bs[i].y*st.bs[i].y+(st.bs[i].z||0)*(st.bs[i].z||0)));
    st.r0=Math.max(st.r0,1);
    for(i=0;i<st.bs.length;i++)st.bs[i].sp=(i*1.37)%6.2832;   // 自转相位：按序号定，保证每次载入一致
    cosRetune(st);
    c3Fit(st);
  }
  st.simT=0;
}
function cosRetune(st){
  if(!st.bs.length){st.Tref=1;st.dtMax=1e3;st.ts=1e3;st.vref=1e3;return;}
  var G=ASTRO.G,M=0,i,mx=1,rm=1e30;
  for(i=0;i<st.bs.length;i++)M+=st.bs[i].m;
  for(i=0;i<st.bs.length;i++)mx=Math.max(mx,Math.sqrt(st.bs[i].x*st.bs[i].x+st.bs[i].y*st.bs[i].y+(st.bs[i].z||0)*(st.bs[i].z||0)));
  for(i=0;i<st.bs.length;i++)rm=Math.min(rm,st.bs[i].rm);
  st.vref=Math.sqrt(G*M/Math.max(mx,1));
  st.Tref=Math.max(2*Math.PI*Math.sqrt(Math.pow(Math.max(mx,1),3)/(G*M)),1e-6);
  st.dtMax=Math.max(st.Tref/900,1e-4);
  st.soft2=Math.pow(Math.max(rm*0.02,1),2);
  var E=abEnergy(st.bs);
  st.eRef=Math.max(Math.abs(E.Ep),Math.abs(E.Ek),1e-30);
  st.ts=st.Tref/8*(clamp(App.P.spd,0.05,20)||1);
}
function cosPick(st,q){
  var best=-1,bd=1e30,i,p,d,td,S=c3Scale();
  for(i=st.bs.length-1;i>=0;i--){
    var b=st.bs[i];
    p=c3Proj({x:b.x,y:b.y,z:b.z||0});
    if(!p)continue;
    var R=Math.max(abPix(b.rm)*Math.pow(p.k,0.35),3);
    d=Math.sqrt(Math.pow(p.X-q.x,2)+Math.pow(p.Y-q.y,2));
    td=Math.max(R*1.7,14);
    if(d<td&&d<bd){bd=d;best=i;}
  }
  return best;
}
function cosVcirc(st,b){
  var G=ASTRO.G,i,best=-1,mm=-1,d;
  for(i=0;i<st.bs.length;i++){
    if(st.bs[i]!==b&&st.bs[i].m>mm){mm=st.bs[i].m;best=i;}
  }
  if(best<0)return Math.sqrt(G*st.bs[0].m/Math.max(C3.Rv*0.5,1));
  d=Math.max(abD(st.bs[best],b),st.bs[best].rm,1);
  return Math.sqrt(G*st.bs[best].m/d);
}
function cosCollide(st,P){
  var re=clamp(Math.round(P.coll),0,1),i,j,A,B,d,nx,ny,nz,m,nvx,nvy,nvz,nx2,ny2,nz2,nr,os,bm,v1n,v2n,p1,p2,m1,m2;
  for(i=0;i<st.bs.length;i++)for(j=i+1;j<st.bs.length;j++){
    A=st.bs[i];B=st.bs[j];d=abD(A,B);
    if(d<Math.max(A.rm,B.rm)*1.05){
      nx=(B.x-A.x)/(d||1);ny=(B.y-A.y)/(d||1);nz=((B.z||0)-(A.z||0))/(d||1);
      if(re===1){
        v1n=A.vx*nx+A.vy*ny+(A.vz||0)*nz;
        v2n=B.vx*nx+B.vy*ny+(B.vz||0)*nz;
        m1=A.m;m2=B.m;
        p1=(2*m2*v2n+(m1-m2)*v1n)/(m1+m2);p2=(2*m1*v1n+(m2-m1)*v2n)/(m1+m2);
        A.vx+=(p1-v1n)*nx;A.vy+=(p1-v1n)*ny;A.vz=(A.vz||0)+(p1-v1n)*nz;
        B.vx+=(p2-v2n)*nx;B.vy+=(p2-v2n)*ny;B.vz=(B.vz||0)+(p2-v2n)*nz;
        var push=Math.max(A.rm,B.rm)*1.1-d;
        A.x-=nx*push;A.y-=ny*push;A.z=(A.z||0)-nz*push;
        B.x+=nx*push;B.y+=ny*push;B.z=(B.z||0)+nz*push;
        st.events.push(A.n+' 与 '+B.n+' 弹开');
        return false;
      }else{
        m=A.m+B.m;
        nvx=(A.m*A.vx+B.m*B.vx)/m;nvy=(A.m*A.vy+B.m*B.vy)/m;nvz=(A.m*(A.vz||0)+B.m*(B.vz||0))/m;
        nx2=(A.m*A.x+B.m*B.x)/m;ny2=(A.m*A.y+B.m*B.y)/m;nz2=(A.m*(A.z||0)+B.m*(B.z||0))/m;
        nr=Math.pow(Math.pow(A.rm,3)+Math.pow(B.rm,3),1/3);
        bm=(A.m>=B.m)?A:B;os=(A.m>=B.m)?B:A;
        st.events.push(os.n+' 撞上 '+bm.n+' → 合并 m='+m.toExponential(2)+' kg');
        st.cmsg=os.n+' 撞上 '+bm.n+'，合并了';
        var drop=(A.m>=B.m)?j:i, live=(A.m>=B.m)?A:B;
        st.bs.splice(drop,1);if(ASTRO.T[drop]!=null)ASTRO.T.splice(drop,1);
        live.m=m;live.vx=nvx;live.vy=nvy;live.vz=nvz;
        live.x=nx2;live.y=ny2;live.z=nz2;live.rm=nr;live.n=bm.n+'+';
        COS.ps=st.bs.length-1;
        ASTRO.T=[];
        for(var k=0;k<st.bs.length;k++)ASTRO.T.push([[st.bs[k].x,st.bs[k].y,st.bs[k].z||0]]);
        cosRetune(st);
        return true;
      }
    }
  }
  return false;
}
function cosCull(st){
  if(st.bs.length<2)return;
  var i,r,lim=Math.max(st.r0,1)*45;
  for(i=st.bs.length-1;i>=0;i--){
    r=Math.sqrt(st.bs[i].x*st.bs[i].x+st.bs[i].y*st.bs[i].y+(st.bs[i].z||0)*(st.bs[i].z||0));
    if(r>lim){st.events.push(st.bs[i].n+' 飞得太远，已移出视野');
      st.bs.splice(i,1);if(ASTRO.T[i])ASTRO.T.splice(i,1);
      COS.ps=st.bs.length-1;}
  }
}

/* ---------- 滚轮缩放（只在本板块生效） ---------- */
(function(){
  var cv=$('#scene');if(!cv)return;
  cv.addEventListener('wheel',function(e){
    if(App.mode!=='scene'||!App.scene||App.scene.id!=='cosmos')return;
    var k=Math.exp(-(e.deltaY||0)*0.0012);
    C3.zk=clamp(C3.zk*k,0.25,6);
    e.preventDefault();
  },{passive:false});
})();

/* ---------- 场景画布指针（仅当当前板块提供 pointer* 时生效） ---------- */
(function(){
  var cv=$('#scene');if(!cv)return;
  var dr=null;
  function wc(e){
    var t=(e.touches&&e.touches.length)?e.touches[0]:e;
    var r=cv.getBoundingClientRect();
    return {x:t.clientX-r.left,y:t.clientY-r.top};
  }
  function begin(e){
    if(App.mode!=='scene'||!App.scene||!App.scene.pointerDown)return;
    var p=wc(e),wx=App.view.ix(p.x),wy=App.view.iy(p.y);
    dr=App.scene.pointerDown(wx,wy,App.state,App.P);
    if(dr){App.state.drag=dr;e.preventDefault();}
  }
  function move(e){
    if(!dr||App.mode!=='scene')return;
    var p=wc(e),wx=App.view.ix(p.x),wy=App.view.iy(p.y);
    if(App.scene.pointerMove)App.scene.pointerMove(wx,wy,App.state,App.P,dr);
    e.preventDefault();
  }
  function end(e){
    if(!dr)return;
    if(App.scene.pointerUp)App.scene.pointerUp(App.state,App.P,dr);
    if(App.state)App.state.drag=null;
    dr=null;
    if(e&&e.preventDefault)e.preventDefault();
  }
  cv.addEventListener('mousedown',begin);
  window.addEventListener('mousemove',move);
  window.addEventListener('mouseup',end);
  cv.addEventListener('touchstart',function(e){if(e.touches.length===1)begin(e);},{passive:false});
  cv.addEventListener('touchmove',function(e){if(e.touches.length===1)move(e);},{passive:false});
  cv.addEventListener('touchend',function(e){end(e);},{passive:false});
  cv.addEventListener('touchcancel',function(e){end(e);},{passive:false});
})();


/* ---------- 启动 ---------- */
function loadScene(id){
  if(id==='sandbox'){App.mode='sandbox';sbEnter();return;}
  App.mode='scene';sbLeaveUI();
  var sc=Scenes[id];
  App.scene=sc;
  App.P={};
  sc.params.forEach(function(p){App.P[p.key]=p.def;});
  if(sc.toggles)sc.toggles.forEach(function(t){App.P[t.key]=t.def?1:0;});
  App.playing=false;
  $('#bPlay').textContent='▶ 播放';
  buildParams();buildExamples();resetSim();render();
}
function setTab(id){
  var box=$('#tabs');if(!box)return;
  var all=box.querySelectorAll('.tab');
  for(var i=0;i<all.length;i++){
    if(all[i].getAttribute('data-id')===id)all[i].classList.add('on');
    else all[i].classList.remove('on');
  }
}
function buildTabs(){
  var box=$('#tabs');box.innerHTML='';
  Object.keys(Scenes).forEach(function(k){
    var b=document.createElement('div');b.className='tab';b.textContent=Scenes[k].name;
    b.setAttribute('data-id',k);
    b.onclick=function(){enterScene(k);};
    box.appendChild(b);
  });
}
buildTabs();

/* ============ App 外壳：首屏 · 入口 · 路由 ============ */
var ICO={
 logo:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5"><circle cx="12" cy="12" r="2.6"/><ellipse cx="12" cy="12" rx="10" ry="4.4" transform="rotate(-30 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4.4" transform="rotate(30 12 12)"/></svg>',
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 4l9 6.5V20h-6v-5H9v5H3z"/></svg>',
 circ:'<svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7.4" stroke-dasharray="3 2.8"/><circle cx="12" cy="4.6" r="1.9" fill="#22d3ee" stroke="none"/><path d="M12 12l5.9 3.2"/><path d="M16.6 13.6l1.5 2.1-2.6-.1"/></svg>',
 conveyor:'<svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.2" cy="15.5" r="2.7"/><circle cx="18.8" cy="15.5" r="2.7"/><path d="M5.2 12.8h13.6M5.2 18.2h13.6"/><rect x="9.3" y="6.2" width="5.4" height="4.4" rx="1.1"/></svg>',
 blockBoard:'<svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.6" y="14.6" width="18.8" height="3.1" rx="1.3"/><rect x="5.2" y="9.2" width="5.3" height="4.2" rx="1"/><path d="M12.8 12.4h5.6M16.6 10.5l2 1.9-2 1.9"/></svg>',
 kinema:'<svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3.6v16.8h16.6"/><path d="M6.4 18.2l4.2-7.6 3.8 2.3 3.6-6.2"/></svg>',
 sandbox:'<svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.6 18.4L12 5.9l9.4 12.5z"/><circle cx="12" cy="13.4" r="2.3"/></svg>',
 statics:'<svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.4 19.4L12.6 9.2l9 10.2z"/><rect x="8.5" y="10.4" width="5.2" height="4" rx="1" transform="rotate(-45 11.1 12.4)"/><path d="M11.1 16.2v3M9.4 17.7l1.7 1.7 1.7-1.7"/></svg>', link:'<svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.2" y="13.2" width="7.6" height="6.2" rx="1.1"/><rect x="13.4" y="4.4" width="6.4" height="5.4" rx="1"/><path d="M12.4 7.1h1.6a2 2 0 012 2v6.2"/><path d="M9.8 16.3H8.2a2 2 0 01-2-2V9.8"/></svg>', astro:'<svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4.6"/><ellipse cx="12" cy="12" rx="10" ry="4.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4.6" transform="rotate(-60 12 12)"/></svg>',
 cosmos:'<svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.6" stroke-linecap="round"><circle cx="6.5" cy="8.5" r="2.2"/><circle cx="16.5" cy="15.5" r="3"/><circle cx="18.5" cy="6.5" r="1.3"/><path d="M8.2 10.3l5.8 3.6M17.4 8.1l-1.6 5" stroke-dasharray="2 2"/></svg>'
};
var SHORT={link:'连接体',circ:'圆周',conveyor:'传送带',blockBoard:'板块',kinema:'图像',sandbox:'沙盒',statics:'静力',astro:'天体',cosmos:'星系'};
var MODULES=[
 {id:'conveyor',name:'传送带模型',
  desc:'相对滑动→共速的全过程。划痕长度、摩擦生热 Q、电动机多耗电能自动算给你。',
  tags:['水平 / 倾斜','μ 与 tanθ','划痕与 Q']},
 {id:'blockBoard',name:'板块模型',
  desc:'滑块与木板的相对滑动与共速判据，含外力拉板、滑块会不会滑落的临界条件。',
  tags:['滑块—木板','共速条件','外力 F']},
 {id:'kinema',name:'运动图像 v-t / a-t',
  desc:'用分段加速度拼出任意直线运动。斜率看加速度，面积看位移，刹车陷阱与往返都能摆。',
  tags:['v-t 面积','a-t 斜率','刹车陷阱']},
 {id:'statics',name:'静力学受力台',
  desc:'斜面、水平推拉、悬绳三力平衡、墙面自锁四个情景。摩擦「需求 / 上限 μN」实时对比，按播放就松手让它真的滑出去。',
  tags:['受力分析','静摩擦上限','自锁与临界']},
 {id:'sandbox',name:'自由沙盒',
  desc:'任意拼装斜面、滑轮、弹簧、绳索，加电场磁场，还能放炸药。八种材质各有密度弹性强度，玻璃一摔就碎、钢怎么砸都不烂，爆炸有火球冲击波和碎片。',
  tags:['弹簧 / 绳索','电场磁场','材质与爆破']},
 {id:'circ',name:'圆周运动实验台',
  desc:'转盘、圆锥摆、竖直圆周的绳与杆、汽车过桥、皮带齿轮传动六个情景。「需要的 mv²/R」和「能提供的上限」实时对着比，按播放看它甩出去、松绳飞车。',
  tags:['向心力来源','临界速度','超重失重']},
 {id:'link',name:'连接体与极值实验台',
  desc:'连接体：整体法求加速度、隔离法求内力。极值：把「恰好」「至少」翻译成临界条件，再解不等式。还能开惯性力，跳进加速的参考系当静力平衡来做。',
  tags:['整体法/隔离法','临界与极值','惯性力系']},
 {id:'astro',name:'天体物理模型台',
  desc:'环绕、逃逸、椭圆·开普勒、双星、霍曼变轨、贴地飞行六个模型。12 个真实天体数据，换天体改轨道，所有导出量即时重算。',
  tags:['万有引力','变轨 Δv','双星与同步']},
 {id:'cosmos',name:'天体沙盒（三维）',
  desc:'放几个天体进去，看它们互相拽着跑。点一下放一个，拖一下给速度，能斜着看、转着看；手机上可以开体感陀螺仪晃着看，没有陀螺仪就用「手触陀螺」圆盘滑着转。',
  tags:['N 体积分','自己搭系统','碰撞合并']}
];
var UI={home:false};
function buildHome(){
  var nEx=0;
  Object.keys(Scenes).forEach(function(k){nEx+=(Scenes[k].examples||[]).length;});
  $('#home').innerHTML=
    '<div class="hbrand"><div class="hlogo">'+ICO.logo+'</div>'+
    '<div><div class="htitle">高考物理<span> 仿真实验室</span></div>'+
    '<div class="hsub">力学 · 能量动量 · 运动图像 · 天体　交互实验平台</div></div></div>'+
    '<div class="hlead">'+MODULES.length+' 个实验模块，'+nEx+' 道高考情景例题。手机点开即玩，'+
    '曲线和数据都是实时积分算出来的，<b>看到哪个数都能拿公式核对回去</b>。</div>'+
    '<div class="hgrid" id="hgrid"></div>';
  var grid=$('#hgrid');
  MODULES.forEach(function(m){
    var c=document.createElement('div');
    c.className='mcard';c.setAttribute('data-id',m.id);
    c.innerHTML='<div class="mico">'+ICO[m.id]+'</div>'+
      '<div class="mtitle">'+m.name+'</div>'+
      '<div class="mdesc">'+m.desc+'</div>'+
      '<div class="mrow">'+m.tags.map(function(t){return '<span class="mtag">'+t+'</span>';}).join('')+'</div>'+
            '<div class="mgo">进入 →</div>';
    c.onclick=function(){enterScene(m.id);};
    grid.appendChild(c);
  });
}
function buildTabbar(){
  var nav=$('#tabbar');if(!nav)return;
  nav.innerHTML='';
  var list=[{id:'',name:'首页'}];
  for(var i=0;i<MODULES.length;i++)list.push({id:MODULES[i].id,name:SHORT[MODULES[i].id]||MODULES[i].name});
  list.forEach(function(it){
    var d=document.createElement('div');
    d.setAttribute('data-id',it.id);
    d.innerHTML='<b>'+((it.id==='')?ICO.home:ICO[it.id])+'</b>'+it.name;
    d.onclick=function(){if(it.id==='')showHome();else enterScene(it.id);};
    nav.appendChild(d);
  });
}
function syncNav(cur){
  var nav=$('#tabbar');if(!nav)return;
  var items=nav.querySelectorAll('div[data-id]');
  for(var i=0;i<items.length;i++){
    if(items[i].getAttribute('data-id')===cur)items[i].classList.add('on');
    else items[i].classList.remove('on');
  }
}
function showHome(){
  sfx('close');
  UI.home=true;
  $('#home').style.display='';
  $('.app').style.display='none';
  $('#charts').style.display='none';
  $('#bHome').style.display='none';
  syncNav('');
  window.scrollTo(0,0);
}
function enterScene(id){
  sfx('open');
  UI.home=false;
  $('#home').style.display='none';
  $('.app').style.display='';
  $('#charts').style.display='';
  $('#bHome').style.display='';
  setTab(id);loadScene(id);syncNav(id);
  window.scrollTo(0,0);
}
buildHome();buildTabbar();
$('#bHome').onclick=function(){showHome();};

/* ---------- 启动：优先分享链接 > 本机存档 > 默认 ---------- */
(function boot(){
  var st=sbReadStore();
  var hash=location.hash||'';
  var shared=(hash.indexOf('#s=')===0)?hash.slice(3):'';
  if(shared){
    setTab('sandbox');loadScene('sandbox');
    if(sbApplyCode(shared)&&SB.bodies.length){sbToast('已打开分享链接中的装置');}
    else{sbPreset('斜面');}
  }else if(st&&st.mode==='sandbox'&&st.sb&&st.sb.b&&st.sb.b.length){
    setTab('sandbox');loadScene('sandbox');
    if(st.g!==undefined)SB.g=st.g;
    if(st.air!==undefined)SB.air=st.air;
    if(st.Ex!==undefined)SB.Ex=st.Ex;
    if(st.Ey!==undefined)SB.Ey=st.Ey;
    if(st.Bz!==undefined)SB.Bz=st.Bz;
    if(st.defE!==undefined)SB.defE=st.defE;
    if(st.defMu!==undefined)SB.defMu=st.defMu;
    if(st.env==='space'){SB.env='space';SB.dark=1;}else{SB.env='ground';SB.dark=0;}
    if(st.fxP!==undefined)SB.fxP=st.fxP;
    if(st.dh!==undefined)SB.defHard=st.dh;
    if(st.sw!==undefined)SB.spaceWall=!!st.sw;
    if(st.gd!==undefined)SB.gdir=st.gd;
    if(st.pw!==undefined)SB.pourW=st.pw;
    if(st.nk!==undefined)SB.nukeKt=st.nk;
    if(st.pm!==undefined)SB.pmax=st.pm;
    if(st.sv&&st.sv.s){SB.view.s=st.sv.s;SB.view.cx=st.sv.cx;SB.view.cy=st.sv.cy;SB.needFit=false;}
    sbRestore(st.sb);
    if(SB.env==='space'){            // 空间模式读档后，把隐形边界补回来
      var hasG=0;
      for(var gi=0;gi<SB.bodies.length;gi++)if(SB.bodies[gi].ghost)hasG=1;
      if(!hasG)sbSpaceBox();
    }
  }else{
    var sid=(st&&st.scene&&Scenes[st.scene])?st.scene:'conveyor';
    setTab(sid);loadScene(sid);
    if(st&&st.P){
      for(var k in st.P){if(Object.prototype.hasOwnProperty.call(App.P,k))App.P[k]=st.P[k];}
      buildParams();resetSim();render();
    }
  }
  if(App.mode==='sandbox'&&!SB.bodies.length)sbPreset('斜面');
  if(App.mode==='sandbox'){sbPanel();sbSelPanel();sbMobBar();sbRender();}
})();

/* ---------- 路由：#m=模块 直达 / #s= 分享装置 / 否则进 App 首屏 ---------- */
(function route(){
  var h=location.hash||'';
  if(h.indexOf('#m=')===0&&Scenes[h.slice(3)]){enterScene(h.slice(3));return;}
  if(h.indexOf('#s=')===0){enterScene('sandbox');return;}
  showHome();
})();
/* 离开页面 / 切后台时落盘（微信内置浏览器里 beforeunload 不可靠） */
window.addEventListener('pagehide',sbSaveStore);
document.addEventListener('visibilitychange',function(){if(document.hidden)sbSaveStore();});

// 控件
$('#bPlay').onclick=function(){
  if(App.mode==='sandbox'){SB.run=!SB.run;this.textContent=SB.run?'⏸ 暂停':'▶ 播放';sbMobBar();return;}
  App.playing=!App.playing;
  this.textContent=App.playing?'⏸ 暂停':'▶ 播放';
};
$('#bStep').onclick=function(){
  if(App.mode==='sandbox'){SB.run=false;$('#bPlay').textContent='▶ 播放';sbStep(0.02);return;}
  App.playing=false;$('#bPlay').textContent='▶ 播放';stepOnce();
};
$('#bReset').onclick=function(){
  if(App.mode==='sandbox'){sbPreset(SB.preset);return;}
  App.playing=false;$('#bPlay').textContent='▶ 播放';resetSim();
};
$('#bEnd').onclick=function(){
  if(App.mode==='sandbox'){sbClear();return;}
  App.playing=false;$('#bPlay').textContent='▶ 播放';runToEnd();
};
$('#selSpeed').onchange=function(){App.speed=parseFloat(this.value);};
$('#ckVec').onchange=function(){App.showVec=this.checked;};
$('#ckTrail').onchange=function(){App.showTrail=this.checked;if(!this.checked)App.trail=[];};
$('#tl').oninput=function(){
  App.playing=false;$('#bPlay').textContent='▶ 播放';
  var i=clamp(parseInt(this.value,10),0,App.hist.length-1);
  App.hist=App.hist.slice(0,i+1);   // 截断后续记录，避免时间轴回退后数据错乱
  App.cursor=i;
  App.state=App.hist[i].snap;
  App.trail=[];
  syncTL();
};
$('#bCsv').onclick=function(){
  if(App.mode==='sandbox'){
    var rr=[['t','px','py','Ek','Ep']];
    for(var q=0;q<SB.hist.length;q++){
      var hh=SB.hist[q];
      rr.push([fmt(hh.t,4),fmt(hh.v[0],4),fmt(hh.v[1],4),fmt(hh.e[0],4),fmt(hh.e[1],4)]);
    }
    sbDownload(rr,'sandbox_data.csv');
    return;
  }
  var sc=App.scene,rows=[['t'].concat(sc.charts.vel.keys.map(function(k){return k.label;})).concat(sc.charts.en.keys.map(function(k){return k.label;}))];
  for(var i=0;i<App.hist.length;i++){
    var h=App.hist[i];
    rows.push([fmt(h.t,4)].concat(h.v.map(function(v){return fmt(v,4);})).concat(h.e.map(function(v){return fmt(v,4);})));
  }
  var csv=rows.map(function(r){return r.join(',');}).join('\n');
  var blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=sc.id+'_data.csv';a.click();
};
window.addEventListener('resize',render);
loop();
/* ===================== SYS-BEGIN ===================== */
/* ==================================================================
   SYS：声效 · 账号 · 反馈 · 设置抽屉（APP 化外壳）
   设计原则：零外部资源（音效用 Web Audio 现场合成，账号/反馈存本地）
   v14：音频总线（限幅 + 混响 + 声场）、41 种音效、材质化碰撞声、
        空间感（左右声道 + 远近衰减）、管理员账号完全隐形
   ================================================================== */

/* ---------------- 音效：Web Audio 程序化合成 ---------------- */
var SND = {
  ctx: null, master: null, comp: null, dry: null, conv: null, revG: null, nzb: null,
  on: 1, vol: 0.55, mute: 0, ui: 1, phys: 1, spat: 1, rev: 0.3,
  _t: {}, _r: {}, _v: 0, _vw: 0, srcs: null, MAXV: 10,
  init: function () {
    if (this.ctx) return this.ctx;
    var C = (typeof AudioContext !== 'undefined') ? AudioContext
      : (typeof webkitAudioContext !== 'undefined') ? webkitAudioContext : null;
    if (!C) return null;
    try {
      var c = new C();
      this.ctx = c;
      /* 总线：各音源 → 干声/混响 → 主音量 → 限幅器 → 输出
         限幅器负责：一堆碰撞同时炸开时不破音、不刺耳 */
      this.comp = null;
      try { this.comp = c.createDynamicsCompressor(); } catch (e) { }
      this.master = c.createGain();
      this.master.gain.value = (this.mute || !this.on) ? 0 : this.vol;
      if (this.comp) {
        try {
          this.comp.threshold.value = -15; this.comp.knee.value = 24;
          this.comp.ratio.value = 9; this.comp.attack.value = 0.004; this.comp.release.value = 0.22;
        } catch (e) { }
        try { this.master.connect(this.comp); this.comp.connect(c.destination); }
        catch (e) { this.master.connect(c.destination); }
      } else {
        this.master.connect(c.destination);
      }
      this.dry = c.createGain(); this.dry.gain.value = 1;
      try { this.dry.connect(this.master); } catch (e) { }
      /* 混响：现场合成一段脉冲响应（早期反射 + 指数衰减噪声尾巴） */
      this.conv = null;
      try {
        this.conv = c.createConvolver();
        var sr = c.sampleRate, n = Math.max(1, Math.floor(sr * 0.95));
        var b = c.createBuffer(2, n, sr), ch, i;
        for (ch = 0; ch < 2; ch++) {
          var d = b.getChannelData(ch);
          for (i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.9) * 0.9;
          var e1 = Math.floor(sr * (ch ? 0.021 : 0.017)), e2 = Math.floor(sr * (ch ? 0.038 : 0.044));
          if (e1 < n) d[e1] += 0.5;
          if (e2 < n) d[e2] += 0.32;
        }
        this.conv.buffer = b;
        this.revG = c.createGain(); this.revG.gain.value = this.rev;
        this.conv.connect(this.revG);
        this.revG.connect(this.master);
      } catch (e) { this.conv = null; this.revG = null; }
      /* 白噪声底料（所有摩擦/爆炸/水声都由它过滤而来） */
      var sr2 = c.sampleRate, n2 = Math.max(1, Math.floor(sr2 * 1.8));
      var nb = c.createBuffer(1, n2, sr2), nd = nb.getChannelData(0);
      for (var j = 0; j < n2; j++) nd[j] = Math.random() * 2 - 1;
      this.nzb = nb;
    } catch (e) { this.ctx = null; }
    return this.ctx;
  },
  resume: function () {
    var c = this.init();
    if (c && c.state === 'suspended' && c.resume) { try { c.resume(); } catch (e) { } }
  },
  apply: function () {
    if (!this.ctx) return;
    try { this.master.gain.value = (this.mute || !this.on) ? 0 : this.vol; } catch (e) { }
    try { if (this.revG) this.revG.gain.value = this.rev; } catch (e) { }
  },
  /* 声场：返回"该接到哪儿"的节点，顺手做声像与混响发送 */
  _send: function (node, amt) {
    var c = this.ctx;
    try {
      var s = c.createGain(); s.gain.value = Math.max(0, Math.min(1, amt));
      node.connect(s); s.connect(this.conv);
    } catch (e) { }
  },
  node: function (pan, rev) {
    var c = this.ctx; if (!c) return null;
    var g = null;
    try { g = c.createGain(); g.gain.value = 1; } catch (e) { return null; }
    var last = g;
    if (pan && c.createStereoPanner) {
      try {
        var p = c.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan));
        last.connect(p); last = p;
      } catch (e) { }
    }
    try { last.connect(this.dry); } catch (e) { }
    if (rev > 0 && this.conv) this._send(last, rev);
    return g;
  },
  tone: function (c, f0, f1, dur, type, amp, delay, pan, rev) {
    if (!isFinite(amp) || amp <= 0) amp = 0.08;
    if (!isFinite(dur) || dur <= 0) dur = 0.06;
    var out = this.node(pan, rev); if (!out) return;
    var t = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    var ff = Math.max(f0, 1) * (1 + (Math.random() - 0.5) * 0.014);   /* 微失谐，避免机械感 */
    o.frequency.setValueAtTime(ff, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(amp, 0.0002), t + Math.min(0.014, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(out);
    try { o.start(t); o.stop(t + dur + 0.03); this._live(o); } catch (e) { }
  },
  nz: function (c, dur, amp, ftype, freq, delay, pan, rev) {
    if (!this.nzb) return;
    if (!isFinite(amp) || amp <= 0) amp = 0.08;
    if (!isFinite(dur) || dur <= 0) dur = 0.06;
    var out = this.node(pan, rev); if (!out) return;
    var t = c.currentTime + (delay || 0);
    var s = c.createBufferSource(); s.buffer = this.nzb;
    s.playbackRate.value = 0.85 + Math.random() * 0.3;
    var f = c.createBiquadFilter(); f.type = ftype || 'lowpass';
    try { f.frequency.value = Math.max(freq || 900, 20); f.Q.value = 0.9; } catch (e) { }
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(amp, 0.0002), t + Math.min(0.025, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(out);
    try { s.start(t); s.stop(t + dur + 0.03); this._live(s); } catch (e) { }
  },
  /* 扫频噪声：呼啸、风声、爆炸冲击波都靠它 */
  sw: function (c, dur, amp, f0, f1, q, pan, rev, delay) {
    if (!this.nzb) return;
    var out = this.node(pan, rev); if (!out) return;
    var t = c.currentTime + (delay || 0);
    var s = c.createBufferSource(); s.buffer = this.nzb;
    s.playbackRate.value = 0.9 + Math.random() * 0.2;
    var f = c.createBiquadFilter(); f.type = 'bandpass';
    try {
      f.Q.value = q || 1.2;
      f.frequency.setValueAtTime(Math.max(f0, 20), t);
      f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    } catch (e) { try { f.frequency.value = Math.max(f0, 20); } catch (e2) { } }
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(amp, 0.0002), t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(out);
    try { s.start(t); s.stop(t + dur + 0.03); this._live(s); } catch (e) { }
  },
  _live: function (n) {
    try {
      if (!this.srcs) this.srcs = [];
      this.srcs.push(n);
      if (this.srcs.length > 160) this.srcs.splice(0, 80);
    } catch (e) { }
  },
  stopAll: function () {
    var a = this.srcs || [], i;
    for (i = 0; i < a.length; i++) { try { a[i].stop(0); } catch (e) { } }
    this.srcs = [];
  },
  play: function (n, o) {
    if (!this.on || this.mute) return 0;
    o = o || {};
    if (!o.force && SNDU[n] && !this.ui) return 0;      /* 只关界面音，物理声照常 */
    if (!o.force && !SNDU[n] && !this.phys) return 0;   /* 只关物理音，界面音照常 */
    var v = (o.v === undefined) ? 1 : o.v;
    if (!(v > 0)) return 0;
    var gap = o.gap || 0, now = Date.now();
    if (gap) { var p = this._t[n] || 0; if (now - p < gap) return 0; this._t[n] = now; }
    /* 连发抑制：同一个音在 win 毫秒里最多响 run 次。
       燃烧、倒水、堆叠碰撞这类"每帧都在触发"的动作就靠它不再响个不停 */
    var run = o.run || 0, win = o.win || 0;
    if (run && !o.force) {
      var rr = this._r[n];
      if (!rr || now - rr.t > win) { rr = { t: now, c: 0 }; this._r[n] = rr; }
      if (rr.c >= run) return 0;
      rr.c++;
    }
    /* 并发上限：一堆碎块同时炸开时，丢掉一部分，既不破音也不掉帧 */
    if (now - this._vw > 100) { this._vw = now; this._v = 0; }
    if (this._v >= this.MAXV) return 0;
    this._v++;
    var c = this.init(); if (!c) return 0;
    if (c.state === 'suspended' && c.resume) { try { c.resume(); } catch (e) { } }
    var f = SNDV[n]; if (!f) return 0;
    try { f(c, Math.max(0.05, Math.min(v, 4)), o); return 1; } catch (e) { return 0; }
  }
};
/* 界面类音效（关掉「界面音效」时这些不响，物理声不受影响） */
var SNDU = {
  tick: 1, tap: 1, slide: 1, toggle: 1, sel: 1, open: 1, close: 1, back: 1, ok: 1,
  err: 1, pop: 1, login: 1, logout: 1, send: 1, del: 1, warn: 1, unlock: 1, chime: 1
};
function _pan(o) { return (o && o.pan !== undefined) ? o.pan : 0; }
function _rev(o, d) { return (o && o.rev !== undefined) ? o.rev : d; }
var SNDV = {
  /* ---------------- 界面 ---------------- */
  tick: function (c, v, o) { SND.tone(c, 1500, 1040, .05, 'sine', .12 * v, 0, _pan(o), _rev(o, .05)); },
  tap: function (c, v, o) { SND.tone(c, 880, 660, .042, 'sine', .10 * v, 0, _pan(o), _rev(o, .05)); },
  slide: function (c, v, o) { SND.tone(c, 1180, 900, .03, 'sine', .05 * v, 0, _pan(o), _rev(o, .04)); },
  toggle: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .06);
    SND.tone(c, 500, 760, .045, 'triangle', .085 * v, 0, p, r);
    SND.tone(c, 760, 520, .055, 'triangle', .085 * v, .05, p, r);
  },
  sel: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .10);
    SND.tone(c, 1320, 1760, .05, 'sine', .085 * v, 0, p, r);
    SND.nz(c, .03, .03 * v, 'highpass', 3000, 0, p, r);
  },
  open: function (c, v, o) { SND.tone(c, 430, 770, .18, 'sine', .12 * v, 0, _pan(o), _rev(o, .10)); },
  close: function (c, v, o) { SND.tone(c, 700, 400, .15, 'sine', .10 * v, 0, _pan(o), _rev(o, .08)); },
  back: function (c, v, o) { SND.tone(c, 520, 300, .12, 'sine', .09 * v, 0, _pan(o), _rev(o, .06)); },
  ok: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .10);
    SND.tone(c, 523, 523, .09, 'triangle', .13 * v, 0, p, r);
    SND.tone(c, 784, 784, .16, 'triangle', .14 * v, .085, p, r);
  },
  err: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .08);
    SND.tone(c, 330, 180, .24, 'triangle', .12 * v, 0, p, r);
    SND.nz(c, .08, .05 * v, 'lowpass', 900, .02, p, r);
  },
  pop: function (c, v, o) { SND.tone(c, 520, 1180, .07, 'sine', .12 * v, 0, _pan(o), _rev(o, .08)); },
  login: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .12);
    SND.tone(c, 392, 392, .10, 'triangle', .12 * v, 0, p, r);
    SND.tone(c, 523, 523, .10, 'triangle', .12 * v, .09, p, r);
    SND.tone(c, 784, 784, .22, 'triangle', .13 * v, .18, p, r);
  },
  logout: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .10);
    SND.tone(c, 660, 392, .16, 'triangle', .11 * v, 0, p, r);
    SND.tone(c, 392, 280, .20, 'triangle', .10 * v, .13, p, r);
  },
  send: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .10);
    SND.tone(c, 660, 700, .05, 'sine', .09 * v, 0, p, r);
    SND.tone(c, 880, 900, .05, 'sine', .09 * v, .06, p, r);
    SND.tone(c, 1180, 1180, .10, 'sine', .09 * v, .12, p, r);
    SND.nz(c, .06, .03 * v, 'highpass', 2600, .10, p, r);
  },
  del: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .10);
    SND.tone(c, 300, 120, .20, 'sawtooth', .07 * v, 0, p, r);
    SND.nz(c, .16, .10 * v, 'lowpass', 1200, 0, p, r);
  },
  warn: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .08);
    SND.tone(c, 220, 208, .10, 'square', .07 * v, 0, p, r);
    SND.tone(c, 180, 170, .13, 'square', .07 * v, .13, p, r);
  },
  unlock: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .18), f = [523, 659, 784, 1046], i;
    for (i = 0; i < f.length; i++) SND.tone(c, f[i], f[i], .16, 'sine', .09 * v, i * .075, p, r);
  },
  chime: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .30);
    SND.tone(c, 1568, 1560, .50, 'sine', .09 * v, 0, p, r);
    SND.tone(c, 2349, 2340, .34, 'sine', .05 * v, .01, p, r);
    SND.tone(c, 3136, 3120, .22, 'sine', .03 * v, .02, p, r);
  },
  /* ---------------- 碰撞（按材质分开） ---------------- */
  knock: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .18);
    SND.tone(c, 205, 74, .14, 'triangle', .40 * v, 0, p, r);
    SND.nz(c, .07, .18 * v, 'highpass', 1900, 0, p, r);
  },
  wood: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .16);
    SND.tone(c, 262, 108, .12, 'triangle', .34 * v, 0, p, r);
    SND.nz(c, .06, .10 * v, 'bandpass', 1200, 0, p, r);
  },
  stone: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .20);
    SND.tone(c, 150, 58, .16, 'sine', .42 * v, 0, p, r);
    SND.nz(c, .10, .14 * v, 'lowpass', 700, 0, p, r);
  },
  metal: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .34);
    SND.tone(c, 1830, 1750, .45, 'triangle', .10 * v, 0, p, r);
    SND.tone(c, 2470, 2400, .35, 'triangle', .07 * v, .005, p, r);
    SND.tone(c, 3310, 3200, .28, 'sine', .05 * v, .01, p, r);
    SND.nz(c, .05, .08 * v, 'highpass', 3000, 0, p, r);
  },
  glass: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .30);
    SND.tone(c, 2900, 2850, .13, 'sine', .10 * v, 0, p, r);
    SND.tone(c, 4100, 4040, .10, 'sine', .06 * v, .005, p, r);
    SND.nz(c, .04, .05 * v, 'highpass', 5200, 0, p, r);
  },
  ice: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .28);
    SND.tone(c, 2200, 1400, .09, 'sine', .11 * v, 0, p, r);
    SND.nz(c, .12, .13 * v, 'highpass', 4200, 0, p, r);
  },
  soft: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .10);
    SND.tone(c, 120, 70, .13, 'sine', .30 * v, 0, p, r);
    SND.nz(c, .09, .07 * v, 'lowpass', 380, 0, p, r);
  },
  /* ---------------- 破坏 ---------------- */
  crack: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .22);
    SND.nz(c, .24, .30 * v, 'highpass', 2500, 0, p, r);
    SND.tone(c, 2400, 760, .11, 'square', .06 * v, .02, p, r);
  },
  shatter: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .34), i;
    for (i = 0; i < 3; i++) SND.nz(c, .13, .16 * v, 'highpass', 3200 + i * 700, i * .055, p, r);
    SND.tone(c, 3800, 1500, .10, 'sine', .05 * v, 0, p, r);
    SND.tone(c, 2600, 1200, .12, 'sine', .04 * v, .14, p, r);
  },
  snap: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .20);
    SND.nz(c, .07, .18 * v, 'bandpass', 1800, 0, p, r);
    SND.tone(c, 900, 140, .13, 'triangle', .12 * v, .01, p, r);
  },
  boom: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .42);
    SND.tone(c, 96, 26, .95, 'sine', .55 * v, 0, p, r);
    SND.nz(c, .78, .34 * v, 'lowpass', 760, 0, p, r);
    SND.tone(c, 58, 20, 1.4, 'sine', .28 * v, .05, p, r);
    SND.nz(c, .50, .12 * v, 'lowpass', 320, .26, p, r);
  },
  nuke: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .55);
    SND.tone(c, 82, 18, 2.4, 'sine', .60 * v, 0, p, r);
    SND.nz(c, 1.8, .40 * v, 'lowpass', 520, 0, p, r);
    SND.tone(c, 240, 1700, .85, 'sawtooth', .09 * v, 0, p, r);
    SND.nz(c, .9, .15 * v, 'bandpass', 1400, .95, p, r);
    SND.nz(c, 1.6, .20 * v, 'lowpass', 170, 1.4, p, r);
  },
  rumble: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .40);
    SND.nz(c, 1.6, .20 * v, 'lowpass', 180, 0, p, r);
    SND.tone(c, 48, 30, 1.5, 'sine', .18 * v, 0, p, r);
  },
  /* ---------------- 液体 / 火 ---------------- */
  pour: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .16);
    SND.nz(c, .45, .14 * v, 'bandpass', 1500, 0, p, r);
    SND.nz(c, .30, .06 * v, 'bandpass', 2400, .10, p, r);
  },
  splash: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .22);
    SND.nz(c, .26, .20 * v, 'bandpass', 900, 0, p, r);
    SND.tone(c, 500, 1200, .12, 'sine', .07 * v, 0, p, r);
  },
  bubble: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .14);
    SND.tone(c, 600, 900, .07, 'sine', .05 * v, 0, p, r);
    SND.tone(c, 700, 1050, .07, 'sine', .05 * v, .06, p, r);
    SND.tone(c, 560, 860, .07, 'sine', .05 * v, .13, p, r);
  },
  steam: function (c, v, o) { SND.nz(c, .7, .12 * v, 'highpass', 2600, 0, _pan(o), _rev(o, .22)); },
  fire: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .20);
    SND.nz(c, .55, .20 * v, 'bandpass', 780, 0, p, r);
    SND.nz(c, .30, .06 * v, 'bandpass', 2100, .12, p, r);
  },
  fuse: function (c, v, o) { SND.nz(c, .14, .10 * v, 'bandpass', 3200, 0, _pan(o), _rev(o, .12)); },
  spark: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .22), i;
    for (i = 0; i < 4; i++) SND.nz(c, .035, .09 * v, 'highpass', 5200, Math.random() * .18, p, r);
  },
  /* ---------------- 运动 ---------------- */
  whoosh: function (c, v, o) { SND.sw(c, .40, .16 * v, 420, 2400, 1.2, _pan(o), _rev(o, .22), 0); },
  spring: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .16);
    SND.tone(c, 180, 620, .16, 'sine', .12 * v, 0, p, r);
    SND.tone(c, 620, 260, .22, 'sine', .10 * v, .12, p, r);
  },
  launch: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .34);
    SND.tone(c, 110, 900, .75, 'sawtooth', .10 * v, 0, p, r);
    SND.nz(c, .75, .16 * v, 'lowpass', 600, 0, p, r);
    SND.tone(c, 900, 300, .50, 'sine', .08 * v, .60, p, r);
  }
};
/* 试听面板：分类 + 显示名（顺便保证每个键都在 SNDV 里有定义） */
var SNDCAT = [
  ['界面', [['tick', '按钮'], ['tap', '轻点'], ['slide', '滑块'], ['toggle', '开关'], ['sel', '选中'],
  ['open', '打开'], ['close', '关闭'], ['back', '返回'], ['ok', '成功'], ['err', '失败'],
  ['pop', '弹出'], ['login', '登录'], ['logout', '退出'], ['send', '发送'], ['del', '删除'],
  ['warn', '警告'], ['unlock', '解锁'], ['chime', '清脆']]],
  ['碰撞', [['wood', '木'], ['stone', '石'], ['metal', '金属'], ['glass', '玻璃'], ['ice', '冰'],
  ['soft', '软'], ['knock', '通用']]],
  ['破坏', [['crack', '裂纹'], ['shatter', '碎裂'], ['snap', '断裂'], ['boom', '爆炸'],
  ['nuke', '核爆'], ['rumble', '余震']]],
  ['液体与火', [['pour', '倒水'], ['splash', '水花'], ['bubble', '气泡'], ['steam', '蒸汽'],
  ['fire', '点火'], ['fuse', '引信'], ['spark', '火花']]],
  ['运动', [['whoosh', '呼啸'], ['spring', '弹簧'], ['launch', '发射']]]
];
/* 材质 → 碰撞音效（撞什么材质的东西，就发什么声音） */
var MATSND = {
  wood: 'wood', stone: 'stone', steel: 'metal', rubber: 'soft', ice: 'ice', glass: 'glass',
  foam: 'soft', tnt: 'wood', water: 'splash', gas: 'splash', oil: 'splash', lava: 'steam'
};
/* 注意：showHome / enterScene 在脚本里比本模块更早被执行，
   而 var SND 只提升声明不提升赋值，所以这里必须做存在性保护 */
function sfx(n, o) {
  if (typeof SND === 'undefined' || !SND) return 0;
  return SND.play(n, o);
}
/* 带位置的声音：世界坐标 → 左右声道 + 远近衰减（空间感） */
function sfxAt(n, wx, wy, o) {
  if (typeof SND === 'undefined' || !SND) return 0;
  o = o || {};
  if (SND.spat) {
    try {
      var v = SB.view, s = Math.max(v.s, 1e-6);
      var hx = (v.W / 2) / s, hy = (v.H / 2) / s;
      var dx = (wx - v.cx) / Math.max(hx, 1e-6), dy = (wy - v.cy) / Math.max(hy, 1e-6);
      var d = Math.sqrt(dx * dx + dy * dy);
      o.pan = Math.max(-1, Math.min(1, dx)) * 0.85;
      o.v = (o.v === undefined ? 1 : o.v) / (1 + 0.5 * d * d);
    } catch (e) { }
  }
  return SND.play(n, o);
}

/* ---------------- 账号（本地账号库；密码只做不可逆摘要，不明文落盘） ---------------- */
function accHash(s, salt) {
  var str = (salt || 'fz::') + String(s);
  var h = 2166136261, g = 5381, i;
  for (i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0;
    g = ((g << 5) + g + str.charCodeAt(i)) >>> 0;
  }
  return ('0000000' + h.toString(16)).slice(-8) + ('0000000' + g.toString(16)).slice(-8);
}
function accSalt() {
  return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
/* 级别：数字越大权限越高。内置管理账号是最高级（owner），admin 是它可以授出的次一级管理员 */
var ACCLV = { guest: 0, user: 1, admin: 2, owner: 3 };
function accLv(u) { return ACCLV[(u && u.role) || 'guest'] || 0; }
var ACC = {
  UK: 'fz_acc_v1', SK: 'fz_sess_v1', users: null, sess: null,
  /* 内置管理账号只存口令摘要，源码里不出现任何明文口令 */
  APW: 'cf8cae6081a5c1ec',
  seed: function () {
    this.users['admin'] = {
      name: 'admin', pw: this.APW, role: 'owner', salt: '', ct: 0, note: '',
      lt: 0, lg: 0, ban: 0, banR: '', banT: 0, sc: '', stat: {}
    };
  },
  load: function () {
    if (this.users) return this.users;
    this.users = null;
    try { this.users = JSON.parse(localStorage.getItem(this.UK) || 'null') || null; } catch (e) { this.users = null; }
    if (!this.users || typeof this.users !== 'object') { this.users = {}; this.seed(); this.save(); }
    if (!this.users['admin']) { this.seed(); this.save(); }
    /* 老版本账号库：内置账号统一升成 owner（最高权限），并清掉带说明的备注
       （不把账号信息写在明处） */
    if (this.users['admin']) {
      var ad = this.users['admin'], ch = 0;
      if (ad.note) { ad.note = ''; ch = 1; }
      if (ad.role !== 'owner') { ad.role = 'owner'; ch = 1; }
      if (ch) this.save();
    }
    return this.users;
  },
  save: function () { try { localStorage.setItem(this.UK, JSON.stringify(this.users || {})); return 1; } catch (e) { return 0; } },
  get: function (n) { this.load(); return this.users[String(n || '').toLowerCase()] || null; },
  count: function () { this.load(); var k = 0; for (var i in this.users) if (Object.prototype.hasOwnProperty.call(this.users, i)) k++; return k; },
  reg: function (name, pw) {
    name = String(name || '').trim(); pw = String(pw || '');
    if (name.length < 2 || name.length > 16) return { ok: 0, msg: '用户名要 2~16 个字符' };
    if (!/^[\w\u4e00-\u9fa5.-]+$/.test(name)) return { ok: 0, msg: '用户名只能用中英文、数字、._-' };
    if (pw.length < 4) return { ok: 0, msg: '密码至少 4 位' };
    var k = name.toLowerCase();
    if (k === 'admin') return { ok: 0, msg: '这个用户名不可用' };   /* 不暴露内置账号的存在 */
    this.load();
    if (this.users[k]) return { ok: 0, msg: '这个用户名已被占用' };
    var salt = accSalt();
    this.users[k] = { name: name, pw: accHash(pw, salt), role: 'user', salt: salt, ct: Date.now(), note: '' };
    this.save();
    this.login(name, pw);
    return { ok: 1, msg: '注册成功，已自动登录' };
  },
  login: function (name, pw) {
    name = String(name || '').trim(); pw = String(pw || '');
    var u = this.get(name);
    if (!u) return { ok: 0, msg: '账号不存在' };
    if (u.pw !== accHash(pw, u.salt || '')) return { ok: 0, msg: '密码不对' };
    try { localStorage.setItem(this.SK, u.name); } catch (e) { }
    this.sess = u.name;
    return { ok: 1, msg: '欢迎回来，' + u.name, role: u.role };
  },
  logout: function () { try { localStorage.removeItem(this.SK); } catch (e) { } this.sess = null; },
  cur: function () {
    if (this.sess) { var u = this.get(this.sess); if (u) return u; }
    var n = null;
    try { n = localStorage.getItem(this.SK); } catch (e) { }
    if (!n) { this.sess = null; return null; }
    var u2 = this.get(n); this.sess = u2 ? u2.name : null; return u2;
  },
  isAdmin: function () { return accLv(this.cur()) >= 2; },
  isOwner: function () { return accLv(this.cur()) >= 3; },
  /* 我能不能管这个账号：级别必须严格高于对方，且对方不能是最高权限账号，也不能是自己 */
  canOn: function (n) {
    var a = this.cur(), t = this.get(n);
    if (!a || !t) return 0;
    if (accLv(a) < 2) return 0;
    if (accLv(t) >= 3) return 0;
    if (String(t.name).toLowerCase() === String(a.name).toLowerCase()) return 0;
    return accLv(a) > accLv(t) ? 1 : 0;
  },
  resetAll: function () { this.users = {}; this.seed(); this.save(); this.logout(); }
};

/* ---------------- 反馈（发现 bug） ---------------- */
var BUGS = {
  K: 'fz_bug_v1', list: null,
  load: function () {
    if (this.list) return this.list;
    try { this.list = JSON.parse(localStorage.getItem(this.K) || 'null') || null; } catch (e) { this.list = null; }
    if (!this.list || Object.prototype.toString.call(this.list) !== '[object Array]') this.list = [];
    return this.list;
  },
  save: function () { try { localStorage.setItem(this.K, JSON.stringify(this.list || [])); return 1; } catch (e) { return 0; } },
  add: function (cat, txt) {
    txt = String(txt || '').trim();
    if (txt.length < 3) return { ok: 0, msg: '再多写几个字吧（至少 3 个字）' };
    var u = ACC.cur();
    var P = {};
    try { P = (App && App.P) ? App.P : {}; } catch (e) { P = {}; }
    var ps = ''; try { ps = JSON.stringify(P); } catch (e) { ps = ''; }
    this.load();
    this.list.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      t: Date.now(), cat: String(cat || '其他'), txt: txt.slice(0, 600),
      user: u ? u.name : '游客', role: u ? u.role : 'guest',
      scene: (App && App.scene && App.scene.id) ? App.scene.id : (App && App.mode === 'sandbox' ? 'sandbox' : '-'),
      P: ps.slice(0, 300),
      ua: (typeof navigator !== 'undefined' && navigator.userAgent) ? String(navigator.userAgent).slice(0, 110) : '-',
      scr: (typeof innerWidth !== 'undefined') ? (innerWidth + '×' + innerHeight) : '-'
    });
    while (this.list.length > 200) this.list.pop();
    this.save();
    return { ok: 1, msg: '已记录，谢谢你！' };
  },
  del: function (id) {
    this.load();
    for (var i = 0; i < this.list.length; i++) if (this.list[i].id === id) { this.list.splice(i, 1); this.save(); return 1; }
    return 0;
  },
  clear: function () { this.list = []; this.save(); }
};

/* ---------------- 设置（持久化） ---------------- */
var SYSK = 'fz_set_v1';
var SYS = {
  tab: 'acc', open: 0, bugCat: '显示错误', autosave: 1, hiQ: 1, slowmo: 1, decal: 1, _k: 0, _tm: null,
  load: function () {
    try {
      var o = JSON.parse(localStorage.getItem(SYSK) || 'null') || {};
      if (o.on !== undefined) SND.on = o.on ? 1 : 0;
      if (o.vol !== undefined) SND.vol = Math.max(0, Math.min(1, o.vol));
      if (o.mute !== undefined) SND.mute = o.mute ? 1 : 0;
      if (o.ui !== undefined) SND.ui = o.ui ? 1 : 0;
      if (o.spat !== undefined) SND.spat = o.spat ? 1 : 0;
      if (o.rev !== undefined) SND.rev = Math.max(0, Math.min(1, o.rev));
      if (o.tab) SYS.tab = o.tab;
      if (o.autosave !== undefined) SYS.autosave = o.autosave ? 1 : 0;
      if (o.hiQ !== undefined) SYS.hiQ = o.hiQ ? 1 : 0;
      if (o.slowmo !== undefined) SYS.slowmo = o.slowmo ? 1 : 0;
      if (o.decal !== undefined) SYS.decal = Math.max(0, Math.min(2, o.decal | 0));
      if (o.phys !== undefined) SND.phys = o.phys ? 1 : 0;
    } catch (e) { }
    SND.apply();
  },
  save: function () {
    try {
      localStorage.setItem(SYSK, JSON.stringify({
        on: SND.on ? 1 : 0, vol: SND.vol, mute: SND.mute ? 1 : 0,
        ui: SND.ui ? 1 : 0, spat: SND.spat ? 1 : 0, rev: SND.rev,
        tab: SYS.tab, autosave: SYS.autosave ? 1 : 0, hiQ: SYS.hiQ ? 1 : 0,
        slowmo: SYS.slowmo ? 1 : 0, decal: SYS.decal | 0, phys: SND.phys ? 1 : 0
      }));
    } catch (e) { }
  }
};

/* ---------------- 抽屉 UI ---------------- */
function sysEl(tag, cls, html) {
  var d = document.createElement(tag);
  if (cls) d.className = cls;
  if (html !== undefined) {
    d.innerHTML = html;
    /* 同时给一份纯文本：便于无障碍朗读，也方便自动化检查内容 */
    d.textContent = String(html).replace(/<[^>]*>/g, '');
  }
  return d;
}
function sysRow(label, right, desc, id) {
  var r = sysEl('div', 'srow');
  var l = sysEl('div', 'sl');
  var lb = sysEl('b', '', label);
  if (id) lb.id = id;
  l.appendChild(lb);
  if (desc) l.appendChild(sysEl('i', '', desc));
  r.appendChild(l);
  var rr = sysEl('div', 'sr');
  if (typeof right === 'string') rr.innerHTML = right;
  else if (right) rr.appendChild(right);
  r.appendChild(rr);
  return r;
}
function sysBtn(txt, act, cls, v) {
  var b = sysEl('button', 'sbtn' + (cls ? ' ' + cls : ''));
  b.textContent = txt; b.setAttribute('data-a', act);
  if (v !== undefined) b.setAttribute('data-v', v);
  return b;
}
function sysSec(title) { return sysEl('div', 'ssec', title); }

function sysBuildShell() {
  if (SYS.built) return;                 /* 用自带标志判重，别靠 getElementById 的副作用 */
  SYS.built = 1;
  var m = sysEl('div', 'msk'); m.id = 'sysMsk'; m.setAttribute('data-a', 'close');
  var d = sysEl('aside', 'drw'); d.id = 'sysDrw';
  var h = sysEl('div', 'drwt');
  h.appendChild(sysEl('b', '', '设置'));
  var x = sysEl('button', 'ibtn'); x.setAttribute('data-a', 'close');
  x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  h.appendChild(x);
  d.appendChild(h);
  d.appendChild(sysEl('div', 'drwtab'));
  d.appendChild(sysEl('div', 'drwb'));
  document.body.appendChild(m);
  document.body.appendChild(d);
  m.onclick = function () { sysClose(); };          /* 点遮罩关闭 */
  d.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== d && !t.getAttribute('data-a')) t = t.parentNode;
    if (!t || t === d) return;
    sysAct(t.getAttribute('data-a'), t.getAttribute('data-v'), t);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && SYS.open) sysClose(); });
}

function sysOpen(tab) {
  sysBuildShell();
  if (tab) SYS.tab = tab;
  SYS.open = 1;
  document.getElementById('sysMsk').className = 'msk on';
  document.getElementById('sysDrw').className = 'drw on';
  try { document.body.style.overflow = 'hidden'; } catch (e) { }   /* 抽屉打开时锁住背景滚动 */
  sfx('open');
  sysRender();
}
function sysClose() {
  SYS.open = 0;
  var m = document.getElementById('sysMsk'), d = document.getElementById('sysDrw');
  if (m) m.className = 'msk';
  if (d) d.className = 'drw';
  try { document.body.style.overflow = ''; } catch (e) { }
  sysStopAll();
  sfx('close'); SYS.save();
}

function sysRender() {
  var d = document.getElementById('sysDrw'); if (!d) return;
  var tabs = [['acc', '账号'], ['snd', '声音'], ['view', '画面'], ['about', '关于']];
  var tt = d.querySelector('.drwtab'); tt.innerHTML = '';
  tabs.forEach(function (t) {
    var b = sysEl('button', 'dtb' + (SYS.tab === t[0] ? ' on' : ''), t[1]);
    b.setAttribute('data-a', 'tab'); b.setAttribute('data-v', t[0]);
    tt.appendChild(b);
  });
  var body = d.querySelector('.drwb'); body.innerHTML = '';
  if (SYS.tab === 'acc') sysRenderAcc(body);
  else if (SYS.tab === 'snd') sysRenderSnd(body);
  else if (SYS.tab === 'view') sysRenderView(body);
  else sysRenderAbout(body);
  sysTopbar();
}

function sysRenderAcc(b) {
  var u = ACC.cur();
  b.appendChild(sysSec('账号'));
  if (u) {
    var card = sysEl('div', 'scar');
    var av = sysEl('div', 'sava big', u.name.slice(0, 1).toUpperCase());
    card.appendChild(av);
    var info = sysEl('div', 'sinfo');
    info.appendChild(sysEl('b', '', u.name));
    info.appendChild(sysEl('i', '',
      accLv(u) >= 3 ? '最高权限 · 可管理全部账号' : (accLv(u) >= 2 ? '管理员 · 可管理普通账号' : '已登录用户')));
    if (u.note) info.appendChild(sysEl('i', '', u.note));
    card.appendChild(info);
    b.appendChild(card);
    if (accLv(u) >= 2) {
      b.appendChild(sysRow('管理控制台', sysEl('span', 'sadm', '已启用'), '可查看全部反馈、管理账号与数据'));
      var g1 = sysEl('div', 'sgrp');
      g1.appendChild(sysBtn('查看反馈（' + BUGS.load().length + '）', 'adm:bugs', 'pri'));
      g1.appendChild(sysBtn('清空全部反馈', 'adm:bugclear'));
      g1.appendChild(sysBtn('重置账号库', 'adm:reset'));
      b.appendChild(g1);
    }
    var g2 = sysEl('div', 'sgrp');
    g2.appendChild(sysBtn('退出登录', 'logout', 'warn'));
    b.appendChild(g2);
  } else {
    var ip1 = sysEl('input', 'sinp'); ip1.id = 'sysUser'; ip1.placeholder = '用户名（2~16 字）';
    var ip2 = sysEl('input', 'sinp'); ip2.id = 'sysPw'; ip2.type = 'password'; ip2.placeholder = '密码（至少 4 位）';
    b.appendChild(sysRow('用户名', ip1));
    b.appendChild(sysRow('密码', ip2));
    var g3 = sysEl('div', 'sgrp');
    g3.appendChild(sysBtn('登录', 'login', 'pri'));
    g3.appendChild(sysBtn('注册并登录', 'reg'));
    b.appendChild(g3);
    b.appendChild(sysEl('div', 'stip',
      '<b>登录是可选的</b>：不登录也能用全部 ' + MODULES.length + ' 个模块，包括沙盒爆破和天体沙盒。' +
      '登录后会保存你的个人设置、使用记录，也能提交反馈。<br>' +
      '账号只存在这台设备的浏览器里，不上传任何服务器。'));
  }
  b.appendChild(sysSec('我的反馈'));
  var mine = BUGS.load().filter(function (x) { return u && x.user === u.name; });
  if (!mine.length) b.appendChild(sysEl('div', 'sempty', '还没有提交过问题。'));
  else mine.slice(0, 6).forEach(function (x) {
    b.appendChild(sysEl('div', 'sbug',
      '<b>' + x.cat + '</b><i>' + new Date(x.t).toLocaleString() + ' · ' + x.scene + '</i><p>' +
      String(x.txt).replace(/[<>&]/g, '') + '</p>'));
  });
  var g4 = sysEl('div', 'sgrp');
  g4.appendChild(sysBtn('报告问题 / 发现 bug', 'bug:form', 'pri'));
  b.appendChild(g4);
}

function sysRenderSnd(b) {
  b.appendChild(sysSec('声音'));
  var cb = sysEl('input'); cb.type = 'checkbox'; cb.checked = !!SND.on;
  cb.setAttribute('data-a', 'snd:on');
  b.appendChild(sysRow('音效', cb, '碰撞、碎裂、爆炸、点火、按钮音（Web Audio 实时合成）'));
  var rg = sysEl('input'); rg.type = 'range'; rg.min = '0'; rg.max = '100'; rg.step = '1';
  rg.value = String(Math.round(SND.vol * 100));
  rg.setAttribute('data-a', 'snd:vol');
  b.appendChild(sysRow('音量 ' + Math.round(SND.vol * 100) + '%', rg, '', 'sndVolLb'));
  var cm = sysEl('input'); cm.type = 'checkbox'; cm.checked = !!SND.mute;
  cm.setAttribute('data-a', 'snd:mute');
  b.appendChild(sysRow('静音', cm));

  b.appendChild(sysSec('细分'));
  var cu = sysEl('input'); cu.type = 'checkbox'; cu.checked = !!SND.ui;
  cu.setAttribute('data-a', 'snd:ui');
  b.appendChild(sysRow('界面音效', cu, '按钮、开关、提示音；关掉后只保留物理声'));
  var cp = sysEl('input'); cp.type = 'checkbox'; cp.checked = !!SND.phys;
  cp.setAttribute('data-a', 'snd:phys');
  b.appendChild(sysRow('物理音效', cp, '碰撞、碎裂、爆炸、水与火；关掉后只保留界面音'));
  var cs = sysEl('input'); cs.type = 'checkbox'; cs.checked = !!SND.spat;
  cs.setAttribute('data-a', 'snd:spat');
  b.appendChild(sysRow('空间感', cs, '按事件位置分左右声道，远处的声音更小更闷'));
  var rr2 = sysEl('input'); rr2.type = 'range'; rr2.min = '0'; rr2.max = '100'; rr2.step = '5';
  rr2.value = String(Math.round(SND.rev * 100));
  rr2.setAttribute('data-a', 'snd:rev');
  b.appendChild(sysRow('空间混响 ' + Math.round(SND.rev * 100) + '%', rr2, '', 'sndRevLb'));

  b.appendChild(sysSec('试听'));
  SNDCAT.forEach(function (grp) {
    b.appendChild(sysEl('div', 'slab', grp[0]));
    var g = sysEl('div', 'sgrp');
    grp[1].forEach(function (c) {
      g.appendChild(sysBtn(c[1], 'snd:test', 'tny', c[0]));
    });
    b.appendChild(g);
  });
  var gc = sysEl('div', 'sgrp');
  gc.appendChild(sysBtn('依次试听全部', 'snd:all', 'pri'));
  gc.appendChild(sysBtn('停止', 'snd:stop'));
  b.appendChild(gc);
  b.appendChild(sysEl('div', 'stip', '声音全部是实时合成出来的，没有下载任何音频文件，所以' +
    '<b>不耗流量也不占空间</b>。首次点击页面任意位置后浏览器才允许出声。'));
}

function sysRenderView(b) {
  b.appendChild(sysSec('画面'));
  var rg = sysEl('input'); rg.type = 'range'; rg.min = '20'; rg.max = '400'; rg.step = '10';
  rg.value = String(Math.round((SB.fxP || 1) * 100));
  rg.setAttribute('data-a', 'view:fxp');
  b.appendChild(sysRow('特效强度 ' + Math.round((SB.fxP || 1) * 100) + '%', rg,
    '火花 / 烟尘 / 冲击波 / 余烬数量、震动、爆闪（最高 400%）', 'viewFxpLb'));
  var cs = sysEl('input'); cs.type = 'checkbox'; cs.checked = SYS.slowmo ? true : false;
  cs.setAttribute('data-a', 'view:slowmo');
  b.appendChild(sysRow('大爆炸慢动作', cs, '当量够大时自动进入零点几秒的子弹时间'));
  var cd = sysEl('input'); cd.type = 'range'; cd.min = '0'; cd.max = '2'; cd.step = '1';
  cd.value = String(SYS.decal | 0);
  cd.setAttribute('data-a', 'view:decal');
  b.appendChild(sysRow('爆炸焦痕 ' + (['关', '淡出', '保留'][SYS.decal | 0]), cd,
    '地面上的爆炸痕迹：关掉 / 几秒后淡出 / 一直留着', 'viewDecalLb'));
  var ch = sysEl('input'); ch.type = 'checkbox'; ch.checked = !!SYS.hiQ;
  ch.setAttribute('data-a', 'view:hiq');
  b.appendChild(sysRow('高画质', ch, '关掉后减少渐变与光晕，低端机更流畅'));
  var cv = sysEl('input'); cv.type = 'checkbox'; cv.checked = !!App.showVec;
  cv.setAttribute('data-a', 'view:vec');
  b.appendChild(sysRow('显示矢量箭头', cv));
  var ct = sysEl('input'); ct.type = 'checkbox'; ct.checked = !!App.showTrail;
  ct.setAttribute('data-a', 'view:trail');
  b.appendChild(sysRow('显示运动轨迹', ct));
  b.appendChild(sysSec('实验'));
  var ca = sysEl('input'); ca.type = 'checkbox'; ca.checked = !!SYS.autosave;
  ca.setAttribute('data-a', 'sys:autosave');
  b.appendChild(sysRow('自动保存实验进度', ca, '关掉后刷新页面会回到默认装置'));
  var g = sysEl('div', 'sgrp');
  g.appendChild(sysBtn('把当前视图居中', 'view:fit'));
  g.appendChild(sysBtn('重置所有设置', 'sys:reset'));
  b.appendChild(g);
}

function sysRenderAbout(b) {
  var nEx = 0;
  try { Object.keys(Scenes).forEach(function (k) { nEx += (Scenes[k].examples || []).length; }); } catch (e) { }
  b.appendChild(sysSec('关于'));
  var card = sysEl('div', 'scar',
    '<div class="sava big">物</div><div class="sinfo"><b>高考物理仿真实验室</b>' +
    '<i>v19 · 单文件离线版</i><i>' + MODULES.length + ' 个模块 · ' + nEx + ' 道例题</i></div>');
  card.setAttribute('data-a', 'adm:secret');
  b.appendChild(card);
  b.appendChild(sysEl('div', 'stip',
    '整站就是<b>一个 HTML 文件</b>，没有后端、没有外部图片和音频，曲线与数据都是实时积分算出来的。' +
    '手机上把它加到主屏幕，就像一个真的 App。'));
  b.appendChild(sysSec('发现 bug'));
  b.appendChild(sysEl('div', 'stip', '哪个数不对、哪块花屏、哪里卡顿，都可以记下来。' +
    '提交时会自动带上<b>当前模块和参数</b>，方便复现。'));
  var g = sysEl('div', 'sgrp');
  g.appendChild(sysBtn('报告问题', 'bug:form', 'pri'));
  b.appendChild(g);
  b.appendChild(sysSec('数据'));
  var g2 = sysEl('div', 'sgrp');
  g2.appendChild(sysBtn('清空本机实验存档', 'sys:clear'));
  b.appendChild(g2);
  b.appendChild(sysEl('div', 'stip', '所有数据都只存在这台设备的浏览器里（localStorage），' +
    '清除浏览器数据会一起清掉，不会上传到任何服务器。'));
}

/* ---------------- 反馈表单 ---------------- */
function sysBugForm(pre) {
  var d = document.getElementById('sysDrw'); if (!d) return;
  var body = d.querySelector('.drwb'); body.innerHTML = '';
  body.appendChild(sysSec('报告问题'));
  var cats = ['显示错误', '计算错误', '效果 bug', '卡顿/性能', '操作不顺', '功能建议', '其他'];
  var box = sysEl('div', 'schips');
  cats.forEach(function (c) {
    var b = sysEl('button', 'schip' + (SYS.bugCat === c ? ' on' : ''), c);
    b.setAttribute('data-a', 'bug:cat'); b.setAttribute('data-v', c);
    box.appendChild(b);
  });
  body.appendChild(box);
  var ta = sysEl('textarea', 'sta'); ta.id = 'sysBugTxt'; ta.rows = '5';
  ta.placeholder = '比如：切到「竖直圆周·绳」，v 拖到 3.5 松绳的位置看着偏上 / 手机上倒汽油后帧率明显掉……';
  if (pre) ta.value = pre;
  body.appendChild(ta);
  body.appendChild(sysEl('div', 'stip', '会自动附带：当前模块、参数、屏幕尺寸、浏览器信息。'));
  var g = sysEl('div', 'sgrp');
  g.appendChild(sysBtn('提交', 'bug:submit', 'pri'));
  g.appendChild(sysBtn('返回', 'bug:back'));
  body.appendChild(g);
}
function sysBugList() {
  var d = document.getElementById('sysDrw'); if (!d) return;
  var body = d.querySelector('.drwb'); body.innerHTML = '';
  body.appendChild(sysSec('全部反馈（管理员）'));
  var L = BUGS.load();
  if (!L.length) body.appendChild(sysEl('div', 'sempty', '还没有收到反馈。'));
  L.slice(0, 40).forEach(function (x) {
    var el = sysEl('div', 'sbug adm',
      '<b>' + x.cat + '</b><i>' + new Date(x.t).toLocaleString() + ' · ' + x.user +
      (x.role === 'admin' ? '（管理员）' : '') + ' · ' + x.scene + ' · ' + x.scr + '</i><p>' +
      String(x.txt).replace(/[<>&]/g, '') + '</p><u>' + String(x.ua).replace(/[<>&]/g, '') + '</u>');
    var del = sysBtn('删除', 'adm:bugdel', 'mini', x.id);
    el.appendChild(del);
    body.appendChild(el);
  });
  var g = sysEl('div', 'sgrp');
  g.appendChild(sysBtn('返回', 'bug:back'));
  g.appendChild(sysBtn('清空全部', 'adm:bugclear', 'warn'));
  body.appendChild(g);
}
/* ---------------- 隐藏的管理员入口（不写在任何看得见的地方） ---------------- */
function sysAdmForm(msg) {
  var d = document.getElementById('sysDrw'); if (!d) return;
  var body = d.querySelector('.drwb'); body.innerHTML = '';
  body.appendChild(sysSec('管理员'));
  var ip = sysEl('input', 'sinp'); ip.id = 'sysAdmPw'; ip.type = 'password'; ip.placeholder = '口令';
  body.appendChild(sysRow('口令', ip));
  if (msg) b1(body, msg);
  var g = sysEl('div', 'sgrp');
  g.appendChild(sysBtn('进入', 'adm:key', 'pri'));
  g.appendChild(sysBtn('返回', 'bug:back'));
  body.appendChild(g);
}
function b1(body, msg) { body.appendChild(sysEl('div', 'stip', msg)); }

/* ---------------- 试听全部 ---------------- */
function sysStopAll() {
  try { if (SYS._tm) { clearInterval(SYS._tm); SYS._tm = null; } } catch (e) { }
  try { SND.stopAll(); } catch (e) { }
}
function sysPlayAll() {
  sysStopAll();
  var seq = [], i, j;
  for (i = 0; i < SNDCAT.length; i++) for (j = 0; j < SNDCAT[i][1].length; j++) seq.push(SNDCAT[i][1][j][0]);
  var k = 0;
  SYS._tm = setInterval(function () {
    if (k >= seq.length) { sysStopAll(); return; }
    try { SND.play(seq[k], { gap: 0, force: 1 }); } catch (e) { }
    k++;
  }, 620);
}

/* ---------------- 动作分发 ---------------- */
function sysAct(a, v, el) {
  if (!a) return;
  if (a === 'close') { sysClose(); return; }
  if (a === 'tab') { sysStopAll(); SYS.tab = v; sfx('tap'); sysRender(); SYS.save(); return; }
  if (a.indexOf('snd:') === 0) {
    if (a === 'snd:on') { SND.on = SND.on ? 0 : 1; SND.apply(); sfx('tap'); if (SND.on) sfx('ok'); }
    else if (a === 'snd:mute') { SND.mute = SND.mute ? 0 : 1; SND.apply(); if (!SND.mute) sfx('pop'); }
    else if (a === 'snd:vol') {
      SND.vol = Math.max(0, Math.min(1, (parseFloat(el.value) || 0) / 100)); SND.apply();
      sysLb('sndVolLb', '音量 ' + Math.round(SND.vol * 100) + '%');
      sfx('slide', { gap: 40 });
    }
    else if (a === 'snd:ui') { SND.ui = SND.ui ? 0 : 1; sfx('toggle', { force: 1 }); }
    else if (a === 'snd:spat') { SND.spat = SND.spat ? 0 : 1; sfx('toggle', { force: 1 }); }
    else if (a === 'snd:phys') {
      SND.phys = SND.phys ? 0 : 1;
      if (!SND.phys) SND.stopAll();                 /* 立刻掐掉正在响的碰撞 / 燃烧声 */
      sfx('toggle', { force: 1 });
    }
    else if (a === 'snd:rev') {
      SND.rev = Math.max(0, Math.min(1, (parseFloat(el.value) || 0) / 100)); SND.apply();
      sysLb('sndRevLb', '空间混响 ' + Math.round(SND.rev * 100) + '%');
      sfx('slide', { gap: 40 });
    }
    else if (a === 'snd:test') { SND.resume(); SND.play(v || 'tick', { gap: 0, force: 1 }); SYS.save(); return; }
    else if (a === 'snd:all') { SND.resume(); sysPlayAll(); return; }
    else if (a === 'snd:stop') { sysStopAll(); return; }
    SYS.save(); sysRender(); return;
  }
  if (a.indexOf('view:') === 0) {
    if (a === 'view:fxp') {
      SB.fxP = Math.max(0.2, Math.min(4, (parseFloat(el.value) || 100) / 100));
      sysLb('viewFxpLb', '特效强度 ' + Math.round(SB.fxP * 100) + '%');
      sbAutoSave(); sfx('slide', { gap: 40 });
      if (App.mode === 'sandbox') sbRender(); else render();
      return;
    }
    else if (a === 'view:hiq') { SYS.hiQ = SYS.hiQ ? 0 : 1; }
    else if (a === 'view:slowmo') { SYS.slowmo = el.checked ? 1 : 0; }
    else if (a === 'view:decal') {
      SYS.decal = Math.max(0, Math.min(2, parseInt(el.value, 10) || 0));
      if (!SYS.decal && SB.decals) SB.decals.length = 0;
      sysLb('viewDecalLb', '爆炸焦痕 ' + (['关', '淡出', '保留'][SYS.decal]));
      if (App.mode === 'sandbox') sbRender();
      SYS.save(); return;
    }
    else if (a === 'view:vec') { App.showVec = el.checked; var c1 = document.getElementById('ckVec'); if (c1) c1.checked = el.checked; }
    else if (a === 'view:trail') { App.showTrail = el.checked; if (!el.checked) App.trail = []; var c2 = document.getElementById('ckTrail'); if (c2) c2.checked = el.checked; }
    else if (a === 'view:fit') { SB.needFit = 1; }
    sfx('tap'); SYS.save(); sysRender(); if (App.mode === 'sandbox') sbRender(); else render();
    return;
  }
  if (a === 'sys:autosave') { SYS.autosave = el.checked ? 1 : 0; SYS.save(); sysRender(); return; }
  if (a === 'sys:reset') {
    SND.on = 1; SND.vol = 0.55; SND.mute = 0; SND.ui = 1; SND.spat = 1; SND.rev = 0.3;
    SYS.autosave = 1; SYS.hiQ = 1; SYS.slowmo = 1;
    SND.apply(); SYS.save(); sfx('ok'); sysRender(); sbToast('已恢复默认设置'); return;
  }
  if (a === 'sys:clear') { sbClearStore(); App.hist = []; sfx('ok'); sbToast('本机实验存档已清空'); return; }
  if (a === 'login' || a === 'reg') {
    var u = document.getElementById('sysUser'), p = document.getElementById('sysPw');
    var un = u ? (u.value || '').trim() : '', pw = p ? (p.value || '') : '';
    var r = (a === 'login') ? ACC.login(un, pw) : ACC.reg(un, pw);
    if (r.ok) { sfx(r.role === 'admin' ? 'unlock' : 'login'); sbToast(r.msg); SYS.tab = 'acc'; sysRender(); }
    else { sfx('err'); sbToast(r.msg); }
    return;
  }
  if (a === 'logout') { ACC.logout(); sfx('logout'); sbToast('已退出登录'); sysRender(); return; }
  if (a === 'bug:form') { sfx('open'); sysBugForm(); return; }
  if (a === 'bug:back') { sysRender(); return; }
  if (a === 'bug:cat') { SYS.bugCat = v; sfx('tap'); sysBugForm((document.getElementById('sysBugTxt') || {}).value || ''); return; }
  if (a === 'bug:submit') {
    var t = document.getElementById('sysBugTxt');
    var r2 = BUGS.add(SYS.bugCat, t ? t.value : '');
    if (r2.ok) { sfx('send'); sbToast(r2.msg); sysRender(); }
    else { sfx('err'); sbToast(r2.msg); }
    return;
  }
  if (a === 'adm:secret') {                    /* 隐藏入口：连点关于页的卡片 5 次 */
    SYS._k = (SYS._k || 0) + 1;
    if (SYS._k >= 5) { SYS._k = 0; sfx('unlock'); sysAdmForm(); }
    else sfx('tap');
    return;
  }
  if (a === 'adm:key') {
    var ip = document.getElementById('sysAdmPw');
    var r3 = ACC.login('admin', ip ? (ip.value || '') : '');
    if (r3.ok) { sfx('unlock'); sbToast('已进入管理权限'); SYS.tab = 'acc'; sysRender(); }
    else { sfx('err'); sysAdmForm('口令不对'); }
    return;
  }
  if (a === 'adm:bugs') { sfx('open'); sysBugList(); return; }
  if (a === 'adm:bugdel') { BUGS.del(v); sfx('del'); sysBugList(); return; }
  if (a === 'adm:bugclear') { BUGS.clear(); sfx('ok'); sbToast('反馈已清空'); sysRender(); return; }
  if (a === 'adm:reset') {
    ACC.resetAll(); sfx('err'); sbToast('账号库已重置'); sysRender(); return;
  }
}
/* 只改文字，不重建整页（拖滑块时不会卡，也不会丢焦点） */
function sysLb(id, txt) {
  var e = document.getElementById(id);
  if (e) { try { e.textContent = txt; } catch (err) { } }
}

/* ---------------- 顶栏按钮状态 ---------------- */
function sysTopbar() {
  var b = document.getElementById('sysAcc'); if (!b) return;
  var u = ACC.cur();
  if (u) {
    b.className = 'ibtn ava' + (accLv(u) >= 2 ? ' adm' : '');
    b.innerHTML = u.name.slice(0, 1).toUpperCase();
    b.title = u.name + (accLv(u) >= 3 ? '（最高权限）' : (accLv(u) >= 2 ? '（管理员）' : ''));
  } else {
    b.className = 'ibtn';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    b.title = '账号（未登录）';
  }
}

/* ---------------- 音效钩子：把声音挂到已有动作上 ---------------- */
(function sysHooks() {
  /* 函数声明创建的是可变绑定，直接包一层即可（别用 new Function，它看不到 IIFE 作用域） */
  var _e = sbExplode;
  sbExplode = function () {
    var r = _e.apply(null, arguments);
    sfxAt('boom', arguments[0], arguments[1], { v: Math.min(1.6, 0.5 + (arguments[2] || 1) * 0.12), gap: 60 });
    return r;
  };

  var _n = sbNuke;
  sbNuke = function () {
    var r = _n.apply(null, arguments);
    sfxAt('nuke', arguments[0], arguments[1], { v: 1.5, gap: 200 });
    return r;
  };

  var _f = sbFlushBreak;                       /* sbBreak 由 sbFlushBreak 调用，只挂外层避免双响 */
  sbFlushBreak = function () {
    var q = SB.brk, i, glass = 0, x = 0, y = 0, n = 0;
    if (q) for (i = 0; i < q.length; i++) {
      var m = q[i].b && q[i].b.mat;
      if (m === 'glass' || m === 'ice') glass = 1;
      if (q[i].b) { x += q[i].b.x; y += q[i].b.y; n++; }
    }
    var r = _f.apply(null, arguments);
    if (n) sfxAt(glass ? 'shatter' : 'crack', x / n, y / n, { gap: 110, run: 5, win: 1800 });
    return r;
  };

  var _pp = sbPartPour;                        /* sbPour 内部也走这里 */
  sbPartPour = function () {
    var r = _pp.apply(null, arguments);
    sfxAt('pour', arguments[1], arguments[2], { gap: 260, run: 5, win: 2600 });
    if (Math.random() < 0.25) sfxAt('bubble', arguments[1], arguments[2], { v: 0.7, gap: 520, run: 3, win: 3000 });
    return r;
  };

  var _ig = sbIgniteAt;
  sbIgniteAt = function () {
    var r = _ig.apply(null, arguments);
    sfxAt('fire', arguments[0], arguments[1], { gap: 340, run: 3, win: 2600 });
    sfxAt('spark', arguments[0], arguments[1], { v: 0.8, gap: 420, run: 3, win: 2600 });
    return r;
  };

  var _da = sbDetonateAll;
  sbDetonateAll = function () { var r = _da.apply(null, arguments); sfx('fuse', { gap: 120 }); return r; };

  /* 碰撞：按材质发声，木头闷、金属亮、玻璃脆 */
  var _h = sbHurt;
  sbHurt = function () {
    var r = _h.apply(null, arguments), b = arguments[0], d = arguments[1] || 0;
    /* 声音不断的根因：堆叠/静置的接触点每个物理子步都会结算一次微小损伤，
       于是"咚咚咚"响个不停。三重闸门：损伤阈值 + 单个物体冷却 + 连发抑制 */
    if (d > 1.1 && b && !b.stat && !b.part) {
      var now = Date.now();
      if (!b._sn || now - b._sn > 420) {
        var sp = Math.abs(b.vx || 0) + Math.abs(b.vy || 0);
        if (sp > 0.4 || d > 4) {                  /* 几乎不动、又是轻轻蹭一下的，不发声 */
          var m = b.mat ? (MATSND[b.mat] || 'knock') : 'knock';
          sfxAt(m, b.x || 0, b.y || 0,
            { v: Math.min(1.2, 0.25 + d / 60), gap: 70, run: 4, win: 1200 });
          b._sn = now;                            /* 响了才记冷却，避免"哑掉"真正的撞击 */
        }
      }
    }
    return r;
  };

  var _ps = sbPreset;
  sbPreset = function () { var r = _ps.apply(null, arguments); sfx('pop', { gap: 90 }); return r; };

  /* ---- 下面这些是 v14 新增的"手感音" ---- */
  var _add = sbAdd;
  sbAdd = function () { var r = _add.apply(null, arguments); sfx('sel', { v: 0.8, gap: 60 }); return r; };

  var _del = sbDel;
  sbDel = function () { var r = _del.apply(null, arguments); sfx('del', { gap: 90 }); return r; };

  var _clr = sbClear;
  sbClear = function () { var r = _clr.apply(null, arguments); sfx('del', { gap: 90 }); return r; };

  var _undo = sbUndo;
  sbUndo = function () { var r = _undo.apply(null, arguments); sfx('back', { gap: 90 }); return r; };

  var _env = sbSetEnv;
  sbSetEnv = function () { var r = _env.apply(null, arguments); sfx('whoosh', { gap: 200 }); return r; };

  var _liq = sbSelToLiquid;
  sbSelToLiquid = function () { var r = _liq.apply(null, arguments); sfx('splash', { gap: 120 }); return r; };

  var _lk = sbLink;
  sbLink = function () {
    var r = _lk.apply(null, arguments);
    sfx(arguments[0] === 'spring' ? 'spring' : 'pop', { gap: 80 });
    return r;
  };

  var _dlk = sbDelLink;
  sbDelLink = function () { var r = _dlk.apply(null, arguments); sfx('snap', { gap: 80 }); return r; };

  var _spk = sbSparkToggle;
  sbSparkToggle = function () { var r = _spk.apply(null, arguments); sfx('spark', { gap: 90 }); return r; };

  var _sh = sbShare;
  sbShare = function () { var r = _sh.apply(null, arguments); sfx('send', { gap: 120 }); return r; };

  var _ac = sbApplyCode;
  sbApplyCode = function () {
    var r = _ac.apply(null, arguments);
    sfx(r === false ? 'err' : 'ok', { gap: 120 });
    return r;
  };

  var _tt = sbTiltToggle;
  sbTiltToggle = function () { var r = _tt.apply(null, arguments); sfx('toggle', { gap: 90 }); return r; };

  var _zm = sbZoomAt;
  sbZoomAt = function () { var r = _zm.apply(null, arguments); sfx('slide', { v: 0.7, gap: 110 }); return r; };

  /* 燃烧时的持续噼啪 */
  var _pb = sbPartBurn;
  sbPartBurn = function () { var r = _pb.apply(null, arguments); sfx('fire', { v: 0.35, gap: 900, run: 2, win: 5000 }); return r; };

  /* 引信燃烧的滋滋声 */
  var _fu = sbFuse;
  sbFuse = function () {
    var r = _fu.apply(null, arguments);
    /* 声音不断的真凶：sbFuse 每个物理步都会跑一次，原来是无条件「滋」一声，
       于是只要沙盒在跑，引信声就永远停不下来。改成：只有真的有引信在烧才响 */
    var i, b, on = 0;
    for (i = 0; i < SB.bodies.length; i++) {
      b = SB.bodies[i];
      if (b && b.boom && !b.boom.done && b.fuse >= 0) { on = 1; break; }
    }
    if (on) sfx('fuse', { v: 0.5, gap: 420, run: 3, win: 3000 });
    return r;
  };

  /* 设置里的「自动保存」开关 */
  var _sv = sbSaveStore;
  sbSaveStore = function () { if (!SYS.autosave) return 0; return _sv.apply(null, arguments); };
})();

/* ---------------- 启动 ---------------- */
(function sysBoot() {
  SYS.load();
  sysBuildShell();
  sysTopbar();
  var bS = document.getElementById('sysSet'), bA = document.getElementById('sysAcc'),
    bB = document.getElementById('sysBug');
  if (bS) bS.onclick = function () { sysOpen(SYS.tab); };
  if (bA) bA.onclick = function () { sysOpen('acc'); };
  if (bB) bB.onclick = function () { sysOpen('about'); SYS.tab = 'about'; sysBugForm(); };
  /* 所有按钮的点击音（含面板、工具栏、抽屉） */
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t.tagName !== 'BUTTON' && t.tagName !== 'LABEL' && t !== document.body) t = t.parentNode;
    if (t && (t.tagName === 'BUTTON' || t.tagName === 'LABEL')) sfx('tick', { v: 0.85, gap: 24 });
    SND.resume();
  }, true);
  document.addEventListener('touchstart', function () { SND.resume(); }, { passive: true });
  /* 滑块与开关的手感音（抽屉里的由 sysAct 自己处理，这里跳过，免得响两遍） */
  function inDrw(e) {
    var t = e;
    while (t) { if (t.className && String(t.className).indexOf('drw') >= 0) return 1; t = t.parentNode; }
    return 0;
  }
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t || t.type !== 'range' || inDrw(t)) return;
    sfx('slide', { v: 0.8, gap: 55 });
  }, true);
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || t.type !== 'checkbox' || inDrw(t)) return;
    sfx('toggle', { v: 0.8, gap: 40 });
  }, true);
  /* 第一次进来给个中性引导（不提任何账号信息） */
  try {
    if (!localStorage.getItem('fz_tip_acc')) {
      localStorage.setItem('fz_tip_acc', '1');
      setTimeout(function () {
        if (!ACC.cur()) sbToast('右上角 ⚙ 里可以调声音、特效和反馈');
      }, 2800);
    }
  } catch (e) { }
})();
/* ===================== SYS-END ===================== */
/* ===================== V15-BEGIN ===================== */
/* ==================================================================
   v15：重力方向修复 · 爆炸与特效增强 · 强制登录门禁 · 管理员账号管理
   ================================================================== */

/* ==================================================================
   一、重力方向：受力箭头 / 罗盘 / 陀螺仪符号
   ================================================================== */

/* 重力相对"正下方"的偏角（°）：0=正下方，正=向右偏 */
function sbGDef() {
  var d = (SB.gdir + Math.PI / 2) * 180 / Math.PI;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}
function sbGSet(v) {
  var d = ((((v + 180) % 360) + 360) % 360) - 180;
  SB.gdir = -Math.PI / 2 + d * Math.PI / 180;
  SB.tiltG = 0; sbUnTilt();
}
function sbGTxt() {
  var d = sbGDef(), a = Math.round(Math.abs(d));
  if (Math.abs(d) < 3) return '↓ 正下方';
  if (Math.abs(Math.abs(d) - 180) < 3) return '↑ 完全倒转（失重天花板）';
  return (d > 0 ? ('向右偏 ' + a + '°') : ('向左偏 ' + a + '°'));
}
/* 受力箭头：原版把重力写死成"世界系正下方"，改了重力方向后箭头不跟着歪，这里纠正 */
var _sbForceListV15 = sbForceList;
sbForceList = function (b) {
  var L = _sbForceListV15(b), i;
  for (i = 0; i < L.length; i++) {
    if (L[i].n === 'G') {
      L[i].x = b.m * SB.gx;
      L[i].y = b.m * SB.gy;
    }
  }
  return L;
};
/* 陀螺仪：原来符号写反了，手机右倾重力却往左跑 */
var _sbTiltApplyV15 = sbTiltApply;
sbTiltApply = function () {
  if (!SB.tiltG) return;
  var r = sbTiltRoll();
  if (SB.tiltBase === null) SB.tiltBase = r;
  var d = (r - SB.tiltBase);
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  SB.gdir = -Math.PI / 2 + SB.tiltFlip * d * Math.PI / 180;
  if (typeof _sbTiltApplyV15 === 'function' && _sbTiltApplyV15 !== sbTiltApply) { /* 已完全接管 */ }
};

/* 重力罗盘：右下角一个小仪表，箭头永远指着"真实的下面" */
function sbGCompass(g, W, H) {
  if (!SB.g || SB.g <= 0.001) return;
  var R = 23, cx = W - R - 16, cy = H - R - 16;
  g.save();
  g.beginPath(); g.arc(cx, cy, R + 5, 0, Math.PI * 2);
  g.fillStyle = (SB.dark ? 'rgba(10,17,33,.62)' : 'rgba(255,255,255,.62)'); g.fill();
  g.strokeStyle = 'rgba(148,178,230,.30)'; g.lineWidth = 1; g.stroke();
  /* 水平参照线 */
  g.strokeStyle = 'rgba(148,178,230,.26)';
  g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.stroke();
  /* 刻度 */
  var i, a2;
  g.strokeStyle = 'rgba(148,178,230,.22)';
  for (i = 0; i < 12; i++) {
    a2 = i / 12 * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a2) * (R - 3), cy + Math.sin(a2) * (R - 3));
    g.lineTo(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R);
    g.stroke();
  }
  /* 重力方向箭头（世界 y 向上 → 屏幕 y 向下） */
  var ux = SB.gx, uy = SB.gy, m = Math.sqrt(ux * ux + uy * uy) || 1;
  ux /= m; uy /= m;
  var ex = cx + ux * (R - 5), ey = cy - uy * (R - 5);
  g.strokeStyle = '#dc2626'; g.lineWidth = 2.4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey); g.stroke();
  g.fillStyle = '#dc2626';
  g.beginPath();
  g.moveTo(ex + ux * 5, ey - uy * 5);
  g.lineTo(ex - uy * 4, ey - ux * 4);
  g.lineTo(ex + uy * 4, ey + ux * 4);
  g.closePath(); g.fill();
  g.lineCap = 'butt';
  g.beginPath(); g.arc(cx, cy, 2.6, 0, Math.PI * 2); g.fillStyle = '#dc2626'; g.fill();
  g.font = '600 10px system-ui,-apple-system,Segoe UI,sans-serif';
  g.fillStyle = (SB.dark ? 'rgba(226,232,240,.9)' : '#475569');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('g ' + Math.round(SB.g), cx, cy + R + 12);
  g.restore();
}

/* ==================================================================
   二、爆炸限度与特效增强
   ================================================================== */
function sbFxN2(n) {
  var p = SB.fxP;
  if (p === undefined || !isFinite(p)) p = 1;
  return Math.max(1, Math.round(n * Math.min(Math.max(p, 0.2), 4)));
}
/* 焦痕：世界坐标的持久贴花，画在最底层 */
function sbScorch(x, y, r) {
  if (!SB.decals) SB.decals = [];
  SB.decals.push({ x: x, y: y, r: r, a: 0.42, s: Math.random() * 6.28 });
  if (SB.decals.length > 70) SB.decals.splice(0, SB.decals.length - 70);
}
function sbDrawDecals(g) {
  if (!SB.decals || !SB.decals.length) return;
  var i, d, X, Y, R, gr;
  g.save();
  for (i = 0; i < SB.decals.length; i++) {
    d = SB.decals[i];
    X = sbX(d.x); Y = sbY(d.y); R = Math.max(d.r * SB.view.s, 1);
    if (X < -R || X > SB.view.W + R || Y < -R || Y > SB.view.H + R) continue;
    gr = g.createRadialGradient(X, Y, 0, X, Y, R);
    gr.addColorStop(0, 'rgba(24,18,15,' + (d.a * 0.95) + ')');
    gr.addColorStop(0.55, 'rgba(46,32,24,' + (d.a * 0.6) + ')');
    gr.addColorStop(1, 'rgba(60,44,32,0)');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(X, Y, R, R * 0.42, 0, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
/* 大爆炸的短暂子弹时间 */
function sbSlowmo(kg) {
  if (!SYS.slowmo) return;
  var k = Math.max(kg, 0.05);
  if (k < 6) return;
  var dur = Math.min(0.55, 0.16 + Math.log10(k / 5) * 0.34);
  SB.slow = Math.max(SB.slow || 0, dur);
  SB.slowR = Math.max(0.22, 0.5 - Math.min(0.24, Math.log10(k / 5) * 0.13));
}
var _sbStepV15 = sbStep;
sbStep = function (dt) {
  var d = dt;
  if (SB.slow > 0) { SB.slow -= dt; d = dt * (SB.slowR || 0.4); }
  else SB.slow = 0;
  _sbStepV15(d);
};

/* 在原有爆炸之上加一整套分层特效（不改动原物理冲量，只加视觉） */
function sbBoomPlus(x, y, kg, R) {
  R = R || sbBoomR(kg);
  var P = Math.pow(Math.max(kg, 0.05), 0.34), i, a0, s0;
  /* 白热核心 → 两层余晖 */
  SB.fx.push({ k: 'glow', x: x, y: y, R: R * 0.55, t: 0, life: 0.26 + 0.18 * Math.min(1, P / 3), hot: 1 });
  SB.fx.push({ k: 'glow', x: x, y: y, R: R * 1.7, t: 0, life: 0.85 + 0.7 * Math.min(1, P / 4) });
  /* 三道厚冲击波：快而薄 → 慢而宽 */
  SB.fx.push({ k: 'wave', x: x, y: y, R: R * 1.20, t: 0, life: 0.40, w: 0.9 });
  SB.fx.push({ k: 'wave', x: x, y: y, R: R * 1.95, t: 0, life: 0.88, w: 1.8 });
  SB.fx.push({ k: 'wave', x: x, y: y, R: R * 3.00, t: 0, life: 1.60, w: 2.8 });
  /* 火焰喷流：沿几个方向甩出去 */
  var nj = Math.max(4, Math.round(7 * Math.min(Math.max(SB.fxP || 1, 0.2), 4)));
  for (i = 0; i < nj; i++) {
    a0 = i / nj * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
    s0 = (5 + Math.random() * 11) * P;
    SB.fx.push({
      k: 'jet', x: x, y: y, vx: Math.cos(a0) * s0, vy: Math.sin(a0) * s0 + 1.2,
      t: 0, life: 0.15 + Math.random() * 0.2, r0: R * 0.34
    });
  }
  /* 余烬：慢落、带余温的小火星 */
  var ne = sbFxN2(12 + Math.min(70, Math.round(kg * 4)));
  for (i = 0; i < ne; i++) {
    a0 = Math.random() * Math.PI * 2;
    s0 = (3 + Math.random() * 13) * P;
    SB.fx.push({
      k: 'ember', x: x, y: y, vx: Math.cos(a0) * s0, vy: Math.sin(a0) * s0 + 3,
      t: 0, life: 1.1 + Math.random() * 2.2, ph: Math.random() * 6.28
    });
  }
  /* 二次爆散：延迟一小会儿再向外飞，像礼花 */
  var nk = sbFxN2(5 + Math.min(34, Math.round(kg * 2)));
  for (i = 0; i < nk; i++) {
    a0 = Math.random() * Math.PI * 2;
    s0 = (2 + Math.random() * 7) * P;
    SB.fx.push({
      k: 'sparkle', x: x, y: y, vx: Math.cos(a0) * s0, vy: Math.sin(a0) * s0 + 2,
      t: 0, life: 0.7 + Math.random() * 0.9, d0: 0.10 + Math.random() * 0.34,
      c: (Math.random() < 0.5 ? '#fff7cc' : '#fdba74')
    });
  }
  /* 地面尘环 + 焦痕 */
  sbScorch(x, y, R * 1.05);
  if (SB.env === 'ground') {
    var nd = sbFxN2(9);
    for (i = 0; i < nd; i++) {
      var sgn = (i % 2) ? 1 : -1;
      SB.fx.push({
        k: 'dust', x: x + sgn * (0.2 + Math.random() * 0.6), y: y + 0.1,
        vx: sgn * (3 + Math.random() * 7) * P, vy: 0.4 + Math.random() * 1.4,
        t: 0, life: 0.8 + Math.random() * 0.7, r: 0.22 + Math.random() * 0.3
      });
    }
  }
  sbSlowmo(kg);
}
/* 核爆之上再叠一层：电磁脉冲环 + 热辐射线 + 余晖 + 余烬雨 */
function sbNukePlus(x, y, kt) {
  var R = sbNukeR(kt), i, a0, s0;
  var P = Math.pow(Math.max(kt, 0.02), 0.42);
  SB.fx.push({ k: 'glow', x: x, y: y, R: R * 0.9, t: 0, life: 0.5, hot: 1 });
  SB.fx.push({ k: 'glow', x: x, y: y, R: R * 3.4, t: 0, life: 2.6 });
  /* 电磁脉冲环（偏冷色，扩得极快） */
  SB.fx.push({ k: 'wave', x: x, y: y, R: R * 6.5, t: 0, life: 1.5, w: 3.4, emp: 1 });
  SB.fx.push({ k: 'wave', x: x, y: y, R: R * 4.2, t: 0, life: 2.2, w: 2.2 });
  /* 热辐射线：从爆心向外的放射亮线 */
  var nr = Math.max(6, Math.round(10 * Math.min(Math.max(SB.fxP || 1, 0.2), 4)));
  for (i = 0; i < nr; i++) {
    a0 = i / nr * Math.PI * 2 + Math.random() * 0.2;
    SB.fx.push({
      k: 'jet', x: x, y: y, vx: Math.cos(a0) * (16 + Math.random() * 12) * (0.6 + P * 0.2),
      vy: Math.sin(a0) * (16 + Math.random() * 12) * (0.6 + P * 0.2),
      t: 0, life: 0.22 + Math.random() * 0.18, r0: R * 0.5
    });
  }
  /* 余烬雨 */
  var ne = sbFxN2(26 + Math.min(90, Math.round(kt * 1.4)));
  for (i = 0; i < ne; i++) {
    a0 = Math.random() * Math.PI * 2;
    s0 = (2 + Math.random() * 16) * (0.6 + P * 0.3);
    SB.fx.push({
      k: 'ember', x: x, y: y, vx: Math.cos(a0) * s0, vy: Math.sin(a0) * s0 + 6,
      t: 0, life: 2.0 + Math.random() * 3.2, ph: Math.random() * 6.28
    });
  }
  sbScorch(x, y, R * 1.5);
  sbSlowmo(kt * 60);
}
var _sbExplodeV15 = sbExplode;
sbExplode = function (x, y, kg, R) {
  var r = _sbExplodeV15.apply(null, arguments);
  try { sbBoomPlus(x, y, kg, R || sbBoomR(kg)); } catch (e) { }
  return r;
};
var _sbNukeV15 = sbNuke;
sbNuke = function (x, y, kt) {
  var r = _sbNukeV15.apply(null, arguments);
  try { sbNukePlus(x, y, kt); } catch (e) { }
  return r;
};

/* 渲染挂钩：焦痕画在网格之上、液体与刚体之下；重力罗盘画在读数那一步（不受震动影响） */
var _sbDrawFieldV15 = sbDrawField;
sbDrawField = function (g, W, H) {
  try { if (SB.decals && SB.decals.length) sbDrawDecals(g); } catch (e) { }
  return _sbDrawFieldV15.apply(null, arguments);
};
var _sbReadoutV15 = sbReadout;
sbReadout = function () {
  var r = _sbReadoutV15.apply(null, arguments);
  try {
    var cv = $('#scene');
    if (cv) sbGCompass(cv.getContext('2d'), SB.view.W, SB.view.H);
  } catch (e) { }
  return r;
};

/* ==================================================================
   三、账号 v2：统计 / 封禁 / 管理员管理
   ================================================================== */
var _accRegV15 = ACC.reg, _accLoginV15 = ACC.login, _accCurV15 = ACC.cur;

ACC.mk = function (name, pw, role) {
  var salt = accSalt();
  return {
    name: name, pw: accHash(pw, salt), role: role || 'user', salt: salt,
    ct: Date.now(), lt: 0, lg: 0, ban: 0, banR: '', banT: 0, sc: '', stat: {}, note: ''
  };
};
ACC.reg = function (name, pw) {
  var r = _accRegV15.call(this, name, pw);
  if (r.ok) {
    var u = this.get(name);
    if (u) { u.lt = Date.now(); u.lg = 1; u.ct = u.ct || Date.now(); if (!u.stat) u.stat = {}; this.save(); }
    gateAfter();
  }
  return r;
};
ACC.login = function (name, pw) {
  var u = this.get(name);
  if (u && u.ban) return { ok: 0, msg: '这个账号已被封禁' + (u.banR ? ('（' + u.banR + '）') : '') };
  var r = _accLoginV15.apply(this, arguments);
  if (r.ok && u) {
    u.lt = Date.now(); u.lg = (u.lg || 0) + 1;
    if (!u.stat) u.stat = {};
    this.save();
    gateAfter();
  }
  return r;
};
/* 每次进入一个模块记一笔，管理员能看到大家都在玩什么 */
ACC.touch = function (id) {
  var u = this.cur();
  if (!u || !id) return;
  u.sc = id; u.lt = Date.now();
  if (!u.stat) u.stat = {};
  u.stat[id] = (u.stat[id] || 0) + 1;
  this.save();
};
ACC.checkBan = function () {
  var u = this.cur();
  if (!u) return 0;
  if (u.ban) {
    this.logout();
    try { sfx('err'); } catch (e) { }
    try { sbToast('账号已被封禁' + (u.banR ? ('：' + u.banR) : '')); } catch (e2) { }
    return 1;
  }
  return 0;
};
ACC.list = function () {
  this.load();
  var out = [], k;
  for (k in this.users) if (Object.prototype.hasOwnProperty.call(this.users, k)) out.push(this.users[k]);
  out.sort(function (a, b) { return (b.ct || 0) - (a.ct || 0); });
  return out;
};
ACC.setBan = function (n, on, reason) {
  var u = this.get(n);
  if (!u || u.role === 'admin') return 0;      /* 内置管理员不可封禁 */
  u.ban = on ? 1 : 0;
  u.banR = on ? String(reason || '违反使用规则').slice(0, 40) : '';
  u.banT = on ? Date.now() : 0;
  this.save();
  return 1;
};
ACC.del = function (n) {
  var k = String(n || '').toLowerCase();
  if (k === 'admin') return 0;
  this.load();
  if (!this.users[k]) return 0;
  delete this.users[k];
  if (this.sess && this.sess.toLowerCase() === k) this.logout();
  this.save();
  return 1;
};
ACC.setRole = function (n, role) {
  var u = this.get(n);
  if (!u) return 0;
  u.role = (role === 'admin') ? 'admin' : 'user';
  this.save();
  return 1;
};
ACC.setPw = function (n, pw) {
  var u = this.get(n);
  if (!u || String(pw || '').length < 4) return 0;
  u.salt = accSalt(); u.pw = accHash(String(pw), u.salt);
  this.save();
  return 1;
};
ACC.sum = function () {
  var L = this.list(), i, s = { all: L.length, admin: 0, user: 0, ban: 0, today: 0 };
  var d0 = new Date(); d0.setHours(0, 0, 0, 0);
  for (i = 0; i < L.length; i++) {
    if (L[i].role === 'admin') s.admin++; else s.user++;
    if (L[i].ban) s.ban++;
    if ((L[i].lt || 0) >= d0.getTime()) s.today++;
  }
  return s;
};

/* ==================================================================
   四、登录（不再强制）：任何人打开就能用全部模块，
   登录只用来保存个人设置、参与反馈、领取管理员授权。
   ================================================================== */
var GATE = {
  FREE: [],                          /* v18：取消强制登录，不再有只能游客试用的模块 */
  want: '',
  built: 0,
  can: function (id) { return true; },
  closed: 1                          /* 已不再自动弹登录卡 */
};
/* 首页卡片在脚本初始化时就会渲染，那时 GATE 还没赋值；用函数声明保证它一定存在 */
function gateCan(id) { return true; }
function gateBuild() {
  if (GATE.built) return;
  if (document.getElementById('gateMsk')) { GATE.built = 1; return; }
  GATE.built = 1;
  var m = document.createElement('div');
  m.id = 'gateMsk'; m.className = 'msk gmsk';
  m.innerHTML = '<div class="gcard" id="gateCard"></div>';
  document.body.appendChild(m);
  m.addEventListener('click', function (e) {
    if (e.target === m) gateClose();
  });
  document.addEventListener('keydown', function (e) {
    var mm = document.getElementById('gateMsk');
    if (e.key === 'Escape' && mm && mm.classList.contains('on')) gateClose();
  });
}
function gateShow(why, want) {
  gateBuild();
  GATE.want = want || '';
  var m = document.getElementById('gateMsk');
  if (!m) return;
  gateRender(why);
  m.classList.add('on');
  try { sfx('open'); } catch (e) { }
  setTimeout(function () {
    var u = document.getElementById('gateUser');
    if (u && !('ontouchstart' in window)) u.focus();
  }, 260);
}
function gateClose() {
  var m = document.getElementById('gateMsk');
  if (m) m.classList.remove('on');
  GATE.closed++;
  try { sfx('close'); } catch (e) { }
}
function gateRender(why) {
  var c = document.getElementById('gateCard');
  if (!c) return;
  c.innerHTML =
    '<div class="glogo">' + (typeof ICO !== 'undefined' && ICO.logo ? ICO.logo : '物') + '</div>' +
    '<div class="gtitle">登录（可选）</div>' +
    '<div class="gsub">' + (why ? ('「' + why + '」<br>') : '') +
    '不登录也能用全部功能。登录后会保存你的个人设置、使用记录，' +
    '也可以提交反馈让管理员看到。</div>' +
    '<div class="gf"><label>用户名</label><input id="gateUser" class="ginp" placeholder="2~16 字，中英文数字" autocomplete="username"></div>' +
    '<div class="gf"><label>密码</label><input id="gatePw" class="ginp" type="password" placeholder="至少 4 位" autocomplete="current-password"></div>' +
    '<div class="gerr" id="gateErr"></div>' +
    '<div class="gbtns">' +
    '<button class="gbtn pri" data-g="login">登录</button>' +
    '<button class="gbtn" data-g="reg">注册并登录</button>' +
    '</div>' +
    '<button class="glater" data-g="later">不用了，直接用 →</button>' +
    '<div class="gtip">账号保存在<b>这台设备的浏览器</b>里，不上传服务器，也不要求邮箱手机。</div>';
  var pw = document.getElementById('gatePw');
  if (pw) pw.onkeydown = function (e) { if (e.key === 'Enter') gateDo('login'); };
}
function gateErr(msg) {
  var e = document.getElementById('gateErr');
  if (e) e.textContent = msg || '';
}
function gateDo(a) {
  var u = document.getElementById('gateUser'), p = document.getElementById('gatePw');
  var un = u ? (u.value || '').trim() : '', pw = p ? (p.value || '') : '';
  if (a === 'later') { gateClose(); return; }
  if (!un) { gateErr('先填个用户名'); try { sfx('err'); } catch (e) { } return; }
  if (String(pw).length < 4) { gateErr('密码至少 4 位'); try { sfx('err'); } catch (e) { } return; }
  var r = (a === 'login') ? ACC.login(un, pw) : ACC.reg(un, pw);
  if (!r.ok) { gateErr(r.msg); try { sfx('err'); } catch (e) { } return; }
  gateErr('');
  try { sfx(r.role === 'admin' ? 'unlock' : 'login'); } catch (e) { }
  try { sbToast(r.msg); } catch (e2) { }
  gateAfter();
}
/* 登录成功后：关卡片 → 补进之前被拦下的模块 */
function gateAfter() {
  var m = document.getElementById('gateMsk');
  if (m) m.classList.remove('on');
  try { sysTopbar(); } catch (e) { }
  try { sysRender(); } catch (e2) { }
  try { buildHome(); } catch (e3) { }
  var w = GATE.want;
  GATE.want = '';
  if (w && GATE.can(w)) { try { enterScene(w); } catch (e4) { } }
}
document.addEventListener('click', function (e) {
  var t = e.target, g = null, i = 0;
  while (t && i < 5) {
    if (t.getAttribute && t.getAttribute('data-g')) { g = t.getAttribute('data-g'); break; }
    t = t.parentNode; i++;
  }
  if (g) { e.preventDefault(); gateDo(g); }
});

/* 进模块：不再拦登录，只记录使用统计 + 检查封禁 */
var _enterSceneV15 = enterScene;
enterScene = function (id) {
  ACC.checkBan();
  _enterSceneV15(id);
  ACC.touch(id);
  try { sysTopbar(); } catch (e) { }
};

/* ==================================================================
   五、管理员：账号管理页
   ================================================================== */
SYS.uview = 0; SYS.banN = ''; SYS.infoN = '';
function sysFmtT(ms) {
  if (!ms) return '从未';
  var d = new Date(ms), p = function (n) { return (n < 10 ? '0' : '') + n; };
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function sysUserList(b) {
  var s = ACC.sum(), i, u, L = ACC.list();
  b.appendChild(sysSec('账号管理 · 共 ' + s.all + ' 个账号'));
  var st = sysEl('div', 'stip',
    '管理员 <b>' + s.admin + '</b> · 普通 <b>' + s.user + '</b> · 已封禁 <b>' + s.ban +
    '</b> · 今日活跃 <b>' + s.today + '</b>　（数据存在本机浏览器）');
  b.appendChild(st);
  var g0 = sysEl('div', 'sgrp');
  g0.appendChild(sysBtn('← 回到账号页', 'adm:back'));
  g0.appendChild(sysBtn('刷新', 'adm:users'));
  b.appendChild(g0);
  for (i = 0; i < L.length; i++) {
    u = L[i];
    var cd = sysEl('div', 'susr' + (u.ban ? ' ban' : ''));
    var top = sysEl('div', 'sutop');
    top.appendChild(sysEl('div', 'sava' + (u.role === 'admin' ? ' adm' : ''), u.name.slice(0, 1).toUpperCase()));
    var inf = sysEl('div', 'sinfo');
    inf.appendChild(sysEl('b', '', u.name +
      (u.role === 'admin' ? '　<span class="sadm">管理员</span>' : '') +
      (u.ban ? '　<span class="sbad">已封禁</span>' : '')));
    var keys = [], kk, best = '', bn = 0;
    if (u.stat) for (kk in u.stat) if (Object.prototype.hasOwnProperty.call(u.stat, kk)) {
      keys.push(kk); if (u.stat[kk] > bn) { bn = u.stat[kk]; best = kk; }
    }
    inf.appendChild(sysEl('i', '', '登录 ' + (u.lg || 0) + ' 次 · 最近 ' + sysFmtT(u.lt) +
      ' · 创建 ' + sysFmtT(u.ct)));
    inf.appendChild(sysEl('i', '', '最近模块：' + (u.sc || '—') + (best ? ('　最常玩：' + (SHORT[best] || best) + ' ×' + bn) : '')));
    if (u.ban && u.banR) inf.appendChild(sysEl('i', '', '封禁理由：' + u.banR));
    top.appendChild(inf);
    cd.appendChild(top);

    /* 使用明细（展开） */
    if (SYS.infoN === u.name && keys.length) {
      var bars = sysEl('div', 'sstat');
      keys.sort(function (a2, b2) { return u.stat[b2] - u.stat[a2]; });
      var mx = Math.max(u.stat[keys[0]], 1), j;
      for (j = 0; j < keys.length && j < 10; j++) {
        var row = sysEl('div', 'ssrow');
        row.appendChild(sysEl('span', 'ssn', SHORT[keys[j]] || keys[j]));
        var bar = sysEl('span', 'ssb');
        var fill = sysEl('i', 'ssf');
        fill.style.width = Math.round(u.stat[keys[j]] / mx * 100) + '%';
        bar.appendChild(fill);
        row.appendChild(bar);
        row.appendChild(sysEl('span', 'ssv', String(u.stat[keys[j]])));
        bars.appendChild(row);
      }
      cd.appendChild(bars);
    }

    /* 操作 */
    var g = sysEl('div', 'sgrp');
    var kk2 = String(u.name);
    if (u.role !== 'admin') {
      if (u.ban) g.appendChild(sysBtn('解除封禁', 'adm:unban', 'ok', kk2));
      else g.appendChild(sysBtn('封禁', 'adm:ban', 'warn', kk2));
      g.appendChild(sysBtn('重置密码', 'adm:pw', '', kk2));
      g.appendChild(sysBtn('删号', 'adm:del', 'warn', kk2));
      g.appendChild(sysBtn(u.role === 'admin' ? '取消管理' : '设为管理', 'adm:role', '', kk2));
    } else {
      g.appendChild(sysEl('span', 'smini', '内置账号 · 不可封禁 / 删除'));
    }
    if (keys.length) g.appendChild(sysBtn(SYS.infoN === u.name ? '收起明细' : '查看明细', 'adm:info', '', kk2));
    cd.appendChild(g);

    /* 封禁理由输入 */
    if (SYS.banN === u.name) {
      var ip = sysEl('input', 'sinp'); ip.id = 'sysBanR'; ip.placeholder = '封禁理由（可留空）';
      cd.appendChild(sysRow('封禁理由', ip));
      var g2 = sysEl('div', 'sgrp');
      g2.appendChild(sysBtn('确认封禁', 'adm:banok', 'warn', kk2));
      g2.appendChild(sysBtn('取消', 'adm:bancancel', '', kk2));
      cd.appendChild(g2);
    }
    if (SYS.pwN === u.name) {
      var ip2 = sysEl('input', 'sinp'); ip2.id = 'sysNewPw'; ip2.type = 'text'; ip2.placeholder = '新密码（≥4 位）';
      cd.appendChild(sysRow('新密码', ip2));
      var g3 = sysEl('div', 'sgrp');
      g3.appendChild(sysBtn('确认修改', 'adm:pwok', 'pri', kk2));
      g3.appendChild(sysBtn('取消', 'adm:pwcancel', '', kk2));
      cd.appendChild(g3);
    }
    b.appendChild(cd);
  }
  if (!L.length) b.appendChild(sysEl('div', 'sempty', '还没有账号。'));
}
/* 账号页：管理员多一个「账号管理」入口 */
var _sysRenderAccV15 = sysRenderAcc;
sysRenderAcc = function (b) {
  if (SYS.uview && ACC.isAdmin()) { sysUserList(b); return; }
  _sysRenderAccV15(b);
  if (ACC.isAdmin()) {
    var g = sysEl('div', 'sgrp');
    g.appendChild(sysBtn('账号管理（' + ACC.count() + ' 个账号）', 'adm:users', 'pri'));
    b.appendChild(g);
  }
};
/* sysAct 扩展：adm:* 走 v15 的分支 */
var _sysActV15 = sysAct;
sysAct = function (a, v, el) {
  if (a === 'adm:users') { SYS.uview = 1; SYS.banN = ''; SYS.pwN = ''; sfx('open'); sysRender(); return; }
  if (a === 'adm:back') { SYS.uview = 0; SYS.banN = ''; SYS.pwN = ''; sfx('close'); sysRender(); return; }
  if (a === 'adm:ban') { SYS.banN = v; SYS.pwN = ''; sfx('open'); sysRender(); return; }
  if (a === 'adm:bancancel') { SYS.banN = ''; sfx('close'); sysRender(); return; }
  if (a === 'adm:banok') {
    var ip = document.getElementById('sysBanR');
    ACC.setBan(v, 1, ip ? ip.value : '');
    SYS.banN = ''; sfx('err'); sbToast('已封禁 ' + v); sysRender(); return;
  }
  if (a === 'adm:unban') { ACC.setBan(v, 0); sfx('ok'); sbToast('已解除封禁 ' + v); sysRender(); return; }
  if (a === 'adm:pw') { SYS.pwN = v; SYS.banN = ''; sfx('open'); sysRender(); return; }
  if (a === 'adm:pwcancel') { SYS.pwN = ''; sfx('close'); sysRender(); return; }
  if (a === 'adm:pwok') {
    var ip2 = document.getElementById('sysNewPw');
    var r = ACC.setPw(v, ip2 ? ip2.value : '');
    SYS.pwN = '';
    if (r) { sfx('ok'); sbToast('已重置 ' + v + ' 的密码'); }
    else { sfx('err'); sbToast('新密码至少 4 位'); }
    sysRender(); return;
  }
  if (a === 'adm:del') {
    if (ACC.del(v)) { sfx('del'); sbToast('已删除账号 ' + v); }
    else { sfx('err'); sbToast('删不掉（内置账号不可删）'); }
    sysRender(); return;
  }
  if (a === 'adm:role') {
    var u = ACC.get(v);
    if (u && u.role !== 'admin') { ACC.setRole(v, 'admin'); sfx('unlock'); sbToast(v + ' 已是管理员'); }
    else if (u) { ACC.setRole(v, 'user'); sfx('ok'); sbToast(v + ' 已取消管理员'); }
    sysRender(); return;
  }
  if (a === 'adm:info') { SYS.infoN = (SYS.infoN === v) ? '' : v; sfx('tap'); sysRender(); return; }
  _sysActV15(a, v, el);
  /* 抽屉里登录 / 退出后，首页的锁标和顶栏也要跟着变 */
  if (a === 'login' || a === 'reg' || a === 'logout' || a === 'adm:key' || a === 'adm:reset') {
    try { buildHome(); } catch (e) { }
    try { sysTopbar(); } catch (e2) { }
  }
};
/* 顶栏账号按钮：未登录加个提示点 */
var _sysTopbarV15 = sysTopbar;
sysTopbar = function () {
  _sysTopbarV15();
  var b = document.getElementById('sysAcc');
  if (!b) return;
  var u = ACC.cur();
  if (!u) { b.classList.remove('need'); b.title = '未登录 · 点这里可以注册或登录（不登录也能用全部功能）'; }
  else b.classList.remove('need');
};

/* ==================================================================
   六、启动：首次进入弹登录卡片；封禁秒踢
   ================================================================== */
function v15Boot() {
  ACC.checkBan();
  sysTopbar();
  /* v18：不再自动弹登录卡，打开即用；想登录的话去设置 → 账号 */
  try { buildHome(); } catch (e2) { }
}
if (typeof document !== 'undefined' && document.body) v15Boot();
else if (typeof window !== 'undefined') window.addEventListener('load', v15Boot);
/* ===================== V15-END ===================== */
/* ===================== V16-BEGIN ===================== */
/* ==================================================================
   v16：爆炸焦痕不再残留 · 管理员分级与撤销 · 沙盒声音不再响个不停
   ================================================================== */

/* ==================================================================
   一、爆炸焦痕：几秒内淡出，不再留在原地变成一片阴影
   SYS.decal  0=关  1=淡出（默认）  2=一直留着
   ================================================================== */
sbScorch = function (x, y, r) {
  if (!SYS.decal) return;                       /* 0：干脆不留 */
  if (!SB.decals) SB.decals = [];
  var fd = (SYS.decal === 2) ? 0 : (3.8 + Math.min(6.5, (r || 1) * 0.55));
  SB.decals.push({
    x: x, y: y, r: (r || 1) * 0.8, a: 0.34,
    s: Math.random() * 6.28, t: 0, fd: fd
  });
  if (SB.decals.length > 70) SB.decals.splice(0, SB.decals.length - 70);
};
/* 焦痕随时间淡出：fd=0 表示永久保留 */
function sbDecalStep(dt) {
  var d = SB.decals;
  if (!d || !d.length) return;
  var i, out = [], ch = 0;
  for (i = 0; i < d.length; i++) {
    if (!d[i].fd) { out.push(d[i]); continue; }
    d[i].t += (dt || 0);
    if (d[i].t < d[i].fd) out.push(d[i]); else ch = 1;
  }
  if (ch) SB.decals = out;
}
sbDrawDecals = function (g) {
  if (!SYS.decal) return;
  if (!SB.decals || !SB.decals.length) return;
  var i, d, X, Y, R, gr, k, a;
  g.save();
  for (i = 0; i < SB.decals.length; i++) {
    d = SB.decals[i];
    X = sbX(d.x); Y = sbY(d.y); R = Math.max(d.r * SB.view.s, 1);
    if (X < -R || X > SB.view.W + R || Y < -R || Y > SB.view.H + R) continue;
    k = d.fd ? Math.max(0, 1 - d.t / d.fd) : 1;
    if (k <= 0.01) continue;
    a = d.a * k * (0.5 + 0.5 * k);            /* 越到后面淡得越快，不留残影 */
    gr = g.createRadialGradient(X, Y, 0, X, Y, R);
    gr.addColorStop(0, 'rgba(24,18,15,' + (a * 0.95).toFixed(3) + ')');
    gr.addColorStop(0.55, 'rgba(46,32,24,' + (a * 0.6).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(60,44,32,0)');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(X, Y, R, R * 0.42, 0, 0, Math.PI * 2); g.fill();
  }
  g.restore();
};
var _sbStepV16 = sbStep;
sbStep = function (dt) {
  try { sbDecalStep(dt || 0); } catch (e) { }
  return _sbStepV16.apply(null, arguments);
};
/* 清空场景 / 换环境时，痕迹也一起清掉 */
var _sbClearV16 = sbClear;
sbClear = function () {
  var r = _sbClearV16.apply(null, arguments);
  if (SB.decals) SB.decals.length = 0;
  return r;
};
var _sbSetEnvV16 = sbSetEnv;
sbSetEnv = function () {
  var r = _sbSetEnvV16.apply(null, arguments);
  if (SB.decals) SB.decals.length = 0;
  return r;
};

/* ==================================================================
   二、管理员分级：最高权限 owner > 管理员 admin > 普通用户 user
   · 只有最高权限账号能把别人设成管理员，级别永远低于最高权限
   · 最高权限账号随时可以撤销管理员
   · 管理员可以管普通用户，但动不了同级管理员，更动不了最高权限账号
   ================================================================== */
var _accSetRoleV15 = ACC.setRole, _accSetBanV15 = ACC.setBan,
  _accDelV15 = ACC.del, _accSetPwV15 = ACC.setPw, _accSumV15 = ACC.sum;

ACC.setRole = function (n, role) {
  var a = this.cur(), t = this.get(n);
  if (!a || !t) return 0;
  if (String(role) === 'owner') return 0;                /* 最高权限授不出去 */
  if (role !== 'admin' && role !== 'user') return 0;      /* 只认这两个角色，别的一律不动 */
  var al = accLv(a), tl = accLv(t), nl = (role === 'admin') ? 2 : 1;
  if (al < 2) return 0;                                  /* 不是管理员就别想改 */
  if (tl >= 3) return 0;                                 /* 最高权限账号不可被改动 */
  if (String(t.name).toLowerCase() === String(a.name).toLowerCase()) return 0;  /* 不能改自己 */
  if (nl >= 3) return 0;                                 /* 谁都不能授出最高权限 */
  if (nl > al) return 0;                                 /* 不能授予比自己更高的级别 */
  if (nl < tl && al <= tl) return 0;                     /* 撤管理员要求级别严格更高 */
  if (nl >= tl && tl >= al) return 0;                    /* 不能给同级或更高级的人升权 */
  t.role = (nl === 2) ? 'admin' : 'user';
  this.save();
  return 1;
};
ACC.setBan = function (n, on, reason) {
  if (!this.canOn(n)) return 0;
  var u = this.get(n);
  if (!u) return 0;
  u.ban = on ? 1 : 0;
  u.banR = on ? String(reason || '违反使用规则').slice(0, 40) : '';
  u.banT = on ? Date.now() : 0;
  this.save();
  return 1;
};
ACC.del = function (n) {
  if (!this.canOn(n)) return 0;
  var k = String(n || '').toLowerCase();
  this.load();
  if (!this.users[k]) return 0;
  delete this.users[k];
  if (this.sess && this.sess.toLowerCase() === k) this.logout();
  this.save();
  return 1;
};
ACC.setPw = function (n, pw) {
  if (!this.canOn(n)) return 0;
  var u = this.get(n);
  if (!u || String(pw || '').length < 4) return 0;
  u.salt = accSalt(); u.pw = accHash(String(pw), u.salt);
  this.save();
  return 1;
};
ACC.sum = function () {
  var s = _accSumV15.call(this), L = this.list(), i, o = 0, a = 0;
  for (i = 0; i < L.length; i++) {
    if (accLv(L[i]) >= 3) { o++; a++; }
    else if (accLv(L[i]) >= 2) a++;
  }
  s.owner = o; s.admin = a; s.user = L.length - a;
  return s;
};

/* ==================================================================
   三、账号管理页：显示级别，按权限给出可操作的按钮
   ================================================================== */
function sysRoleBadge(u) {
  var l = accLv(u);
  if (l >= 3) return '　<span class="sown">最高权限</span>';
  if (l >= 2) return '　<span class="sadm">管理员</span>';
  return '　<span class="susr2">普通用户</span>';
}
sysUserList = function (b) {
  var s = ACC.sum(), i, u, L = ACC.list(), me = ACC.cur(), al = accLv(me);
  b.appendChild(sysSec('账号管理 · 共 ' + s.all + ' 个账号'));
  b.appendChild(sysEl('div', 'stip',
    '最高权限 <b>' + s.owner + '</b> · 管理员 <b>' + s.admin + '</b> · 普通 <b>' + s.user +
    '</b> · 已封禁 <b>' + s.ban + '</b> · 今日活跃 <b>' + s.today + '</b>　（数据存在本机浏览器）'));
  b.appendChild(sysEl('div', 'stip',
    '级别：<b>最高权限 &gt; 管理员 &gt; 普通用户</b>。可以把别人设为管理员，' +
    '但级别永远低于最高权限账号；最高权限账号随时可以撤销管理员。'));
  var g0 = sysEl('div', 'sgrp');
  g0.appendChild(sysBtn('← 回到账号页', 'adm:back'));
  g0.appendChild(sysBtn('刷新', 'adm:users'));
  b.appendChild(g0);
  for (i = 0; i < L.length; i++) {
    u = L[i];
    var tl = accLv(u), mine = me && String(u.name).toLowerCase() === String(me.name).toLowerCase();
    var cd = sysEl('div', 'susr' + (u.ban ? ' ban' : ''));
    var top = sysEl('div', 'sutop');
    top.appendChild(sysEl('div', 'sava' + (tl >= 3 ? ' own' : (tl >= 2 ? ' adm' : '')),
      u.name.slice(0, 1).toUpperCase()));
    var inf = sysEl('div', 'sinfo');
    inf.appendChild(sysEl('b', '', u.name + sysRoleBadge(u) +
      (u.ban ? '　<span class="sbad">已封禁</span>' : '') + (mine ? '　<span class="smini">我自己</span>' : '')));
    var keys = [], kk, best = '', bn = 0;
    if (u.stat) for (kk in u.stat) if (Object.prototype.hasOwnProperty.call(u.stat, kk)) {
      keys.push(kk); if (u.stat[kk] > bn) { bn = u.stat[kk]; best = kk; }
    }
    inf.appendChild(sysEl('i', '', '登录 ' + (u.lg || 0) + ' 次 · 最近 ' + sysFmtT(u.lt) +
      ' · 创建 ' + sysFmtT(u.ct)));
    inf.appendChild(sysEl('i', '', '最近模块：' + (u.sc || '—') +
      (best ? ('　最常玩：' + (SHORT[best] || best) + ' ×' + bn) : '')));
    if (u.ban && u.banR) inf.appendChild(sysEl('i', '', '封禁理由：' + u.banR));
    top.appendChild(inf);
    cd.appendChild(top);

    if (SYS.infoN === u.name && keys.length) {
      var bars = sysEl('div', 'sstat');
      keys.sort(function (a2, b2) { return u.stat[b2] - u.stat[a2]; });
      var mx = Math.max(u.stat[keys[0]], 1), j;
      for (j = 0; j < keys.length && j < 10; j++) {
        var row = sysEl('div', 'ssrow');
        row.appendChild(sysEl('span', 'ssn', SHORT[keys[j]] || keys[j]));
        var bar = sysEl('span', 'ssb');
        var fill = sysEl('i', 'ssf');
        fill.style.width = Math.round(u.stat[keys[j]] / mx * 100) + '%';
        bar.appendChild(fill);
        row.appendChild(bar);
        row.appendChild(sysEl('span', 'ssv', String(u.stat[keys[j]])));
        bars.appendChild(row);
      }
      cd.appendChild(bars);
    }

    var g = sysEl('div', 'sgrp'), kk2 = String(u.name), can = al > tl && tl < 3 && !mine;
    if (tl >= 3) {
      g.appendChild(sysEl('span', 'smini', '最高权限账号 · 不可封禁 / 删除 / 变动'));
    } else if (mine) {
      g.appendChild(sysEl('span', 'smini', '这是你自己 · 不能改自己的权限'));
    } else if (can) {
      if (u.ban) g.appendChild(sysBtn('解除封禁', 'adm:unban', 'ok', kk2));
      else g.appendChild(sysBtn('封禁', 'adm:ban', 'warn', kk2));
      g.appendChild(sysBtn('重置密码', 'adm:pw', '', kk2));
      g.appendChild(sysBtn('删号', 'adm:del', 'warn', kk2));
      if (tl >= 2) g.appendChild(sysBtn('撤销管理员', 'adm:role', 'warn', kk2));
      else if (al >= 2) g.appendChild(sysBtn('设为管理员', 'adm:role', 'pri', kk2));
    } else if (tl >= 2) {
      g.appendChild(sysEl('span', 'smini', '同级管理员 · 只有最高权限账号能撤销'));
    } else {
      g.appendChild(sysEl('span', 'smini', '权限不足'));
    }
    if (keys.length) g.appendChild(sysBtn(SYS.infoN === u.name ? '收起明细' : '查看明细', 'adm:info', '', kk2));
    cd.appendChild(g);

    if (SYS.banN === u.name) {
      var ip = sysEl('input', 'sinp'); ip.id = 'sysBanR'; ip.placeholder = '封禁理由（可留空）';
      cd.appendChild(sysRow('封禁理由', ip));
      var g2 = sysEl('div', 'sgrp');
      g2.appendChild(sysBtn('确认封禁', 'adm:banok', 'warn', kk2));
      g2.appendChild(sysBtn('取消', 'adm:bancancel', '', kk2));
      cd.appendChild(g2);
    }
    if (SYS.pwN === u.name) {
      var ip2 = sysEl('input', 'sinp'); ip2.id = 'sysNewPw'; ip2.type = 'text'; ip2.placeholder = '新密码（≥4 位）';
      cd.appendChild(sysRow('新密码', ip2));
      var g3 = sysEl('div', 'sgrp');
      g3.appendChild(sysBtn('确认修改', 'adm:pwok', 'pri', kk2));
      g3.appendChild(sysBtn('取消', 'adm:pwcancel', '', kk2));
      cd.appendChild(g3);
    }
    b.appendChild(cd);
  }
  if (!L.length) b.appendChild(sysEl('div', 'sempty', '还没有账号。'));
};

/* sysAct：adm:role 改成带级别的判断，其余分支照旧 */
var _sysActV16 = sysAct;
sysAct = function (a, v, el) {
  if (a === 'adm:role') {
    var u = ACC.get(v);
    if (!u) { sfx('err'); sbToast('账号不存在'); }
    else if (accLv(u) >= 2) {
      if (ACC.setRole(v, 'user')) { sfx('ok'); sbToast('已撤销 ' + v + ' 的管理员'); }
      else { sfx('err'); sbToast('撤不了：只有最高权限账号能撤销管理员'); }
    } else {
      if (ACC.setRole(v, 'admin')) { sfx('unlock'); sbToast(v + ' 已是管理员（级别低于最高权限）'); }
      else { sfx('err'); sbToast('设不了：权限不足'); }
    }
    sysRender(); return;
  }
  if (a === 'adm:banok' || a === 'adm:unban' || a === 'adm:del' || a === 'adm:pwok') {
    /* 这几个操作现在可能被权限挡下，失败时给一句明确的提示 */
    var nm = String(v || ''), ok = 0;
    if (a === 'adm:banok') {
      var ip = document.getElementById('sysBanR');
      ok = ACC.setBan(nm, 1, ip ? ip.value : '');
      SYS.banN = '';
      if (ok) { sfx('err'); sbToast('已封禁 ' + nm); } else { sfx('err'); sbToast('封不了：只能封级别比自己低的账号'); }
    } else if (a === 'adm:unban') {
      ok = ACC.setBan(nm, 0);
      if (ok) { sfx('ok'); sbToast('已解除封禁 ' + nm); } else { sfx('err'); sbToast('解不了：权限不足'); }
    } else if (a === 'adm:del') {
      ok = ACC.del(nm);
      if (ok) { sfx('del'); sbToast('已删除账号 ' + nm); } else { sfx('err'); sbToast('删不了：只能删级别比自己低的账号'); }
    } else {
      var ip2 = document.getElementById('sysNewPw');
      ok = ACC.setPw(nm, ip2 ? ip2.value : '');
      SYS.pwN = '';
      if (ok) { sfx('ok'); sbToast('已重置 ' + nm + ' 的密码'); }
      else { sfx('err'); sbToast('改不了：权限不足，或新密码少于 4 位'); }
    }
    sysRender(); return;
  }
  _sysActV16(a, v, el);
};

/* 老账号库迁移：内置账号统一升成最高权限 */
ACC.load();
if (ACC.users && ACC.users['admin'] && ACC.users['admin'].role !== 'owner') {
  ACC.users['admin'].role = 'owner'; ACC.save();
}
/* ===================== V16-END ===================== */
/* ===================== V17-BEGIN ===================== */
/* ==================================================================
   v17 · 用户管理中心
   站长视角：看到所有在本机注册 / 登录过的用户，能封禁、能授予权限。
   · 搜索 / 筛选 / 排序 / 批量操作
   · 封禁可带期限，到期自动解除
   · 名单导出与导入合并（把别的设备上的用户并进来一起管）
   ================================================================== */

/* ---------------- 界面状态 ---------------- */
SYS.uq = '';          /* 搜索词 */
SYS.uflt = 'all';     /* 筛选：all / adm / user / ban / live / new */
SYS.uord = 'lt';      /* 排序：lt / lg / ct / name */
SYS.usel = {};        /* 批量选择的账号名 */
SYS.banD = 0;         /* 封禁天数：0=永久，1/7/30 */
SYS.expN = 0; SYS.impN = 0; SYS.wipeN = 0; SYS.noteN = ''; SYS.impTxt = '';
SYS._ul = null;       /* 列表容器，重填时不用重画整个抽屉 */

var FLTS = [['all', '全部'], ['adm', '管理员'], ['user', '普通'],
['ban', '已封禁'], ['live', '今日活跃'], ['new', '新注册']];
var ORDS = [['lt', '最近登录'], ['lg', '登录次数'], ['ct', '注册时间'], ['name', '名称']];
var DURS = [[0, '永久'], [1, '1 天'], [7, '7 天'], [30, '30 天']];

/* ---------------- 使用人次（含没登录的访客） ---------------- */
var VIS = {
  K: 'fz_vis_v1', data: null,
  load: function () {
    if (this.data) return this.data;
    this.data = null;
    try { this.data = JSON.parse(localStorage.getItem(this.K) || 'null') || null; } catch (e) { this.data = null; }
    if (!this.data || typeof this.data !== 'object') this.data = { d: '', n: 0, tot: 0, mod: {} };
    if (!this.data.mod) this.data.mod = {};
    return this.data;
  },
  save: function () { try { localStorage.setItem(this.K, JSON.stringify(this.data)); return 1; } catch (e) { return 0; } },
  hit: function (id) {
    var d = this.load(), t = new Date(), day = t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate();
    if (d.d !== day) { d.d = day; d.n = 0; }
    d.n++; d.tot++;
    if (id) d.mod[id] = (d.mod[id] || 0) + 1;
    this.save();
    return d;
  },
  reset: function () { this.data = { d: '', n: 0, tot: 0, mod: {} }; this.save(); }
};
var _enterSceneV17 = enterScene;
enterScene = function (id) {
  var r = _enterSceneV17.apply(null, arguments);
  try { VIS.hit(id); } catch (e) { }
  return r;
};

/* ---------------- 账号：查询 / 批量 / 期限 / 备注 / 导入导出 ---------------- */
var _accSetBanV16 = ACC.setBan, _accCheckBanV16 = ACC.checkBan,
  _accLoginV17 = ACC.login, _accSumV16 = ACC.sum;

ACC.view = function () {
  var L = this.list(), q = String(SYS.uq || '').trim().toLowerCase(),
    f = SYS.uflt || 'all', o = SYS.uord || 'lt', out = [], i, u, lv,
    day = 86400000, now = Date.now();
  for (i = 0; i < L.length; i++) {
    u = L[i]; lv = accLv(u);
    if (q && String(u.name).toLowerCase().indexOf(q) < 0) continue;
    if (f === 'adm' && lv < 2) continue;
    if (f === 'user' && lv >= 2) continue;
    if (f === 'ban' && !u.ban) continue;
    if (f === 'live' && !(u.lt && now - u.lt < day)) continue;
    if (f === 'new' && !(u.ct && now - u.ct < day)) continue;
    out.push(u);
  }
  out.sort(function (a, b) {
    if (o === 'lg') return (b.lg || 0) - (a.lg || 0);
    if (o === 'ct') return (b.ct || 0) - (a.ct || 0);
    if (o === 'name') return String(a.name) < String(b.name) ? -1 : (String(a.name) > String(b.name) ? 1 : 0);
    return (b.lt || 0) - (a.lt || 0);
  });
  return out;
};

/* 封禁可以带期限：days>0 时记下到期时刻，到点自动解除 */
ACC.setBan = function (n, on, reason, days) {
  if (!this.canOn(n)) return 0;
  var u = this.get(n);
  if (!u) return 0;
  u.ban = on ? 1 : 0;
  u.banR = on ? String(reason || '违反使用规则').slice(0, 40) : '';
  u.banT = on ? Date.now() : 0;
  u.banU = (on && days > 0) ? (Date.now() + days * 86400000) : 0;
  this.save();
  return 1;
};
ACC.banMany = function (names, on, reason, days) {
  var n = 0, i;
  for (i = 0; i < names.length; i++) if (this.setBan(names[i], on, reason, days)) n++;
  return n;
};
ACC.delMany = function (names) {
  var n = 0, i;
  for (i = 0; i < names.length; i++) if (this.del(names[i])) n++;
  return n;
};
/* 到期自动解除 */
ACC.expire = function () {
  var L = this.list(), i, u, n = 0, now = Date.now();
  for (i = 0; i < L.length; i++) {
    u = L[i];
    if (u.ban && u.banU && now >= u.banU) { u.ban = 0; u.banR = ''; u.banU = 0; u.banT = 0; n++; }
  }
  if (n) this.save();
  return n;
};
ACC.checkBan = function () { this.expire(); return _accCheckBanV16.apply(this, arguments); };
ACC.login = function () { this.expire(); return _accLoginV17.apply(this, arguments); };

/* 备注：管理员给某个用户记一笔（自己也行） */
ACC.setNote = function (n, txt) {
  var a = this.cur(), t = this.get(n);
  if (!a || !t) return 0;
  if (accLv(a) < 2) return 0;
  var mine = String(t.name).toLowerCase() === String(a.name).toLowerCase();
  if (!mine && !this.canOn(n)) return 0;
  t.note = String(txt || '').slice(0, 60);
  this.save();
  return 1;
};

/* 名单导出：完整账号数据（含口令摘要），用于备份或搬到别的设备 */
ACC.exportTxt = function () {
  this.load();
  var L = this.list(), out = [], i, u;
  for (i = 0; i < L.length; i++) {
    u = L[i];
    out.push({
      n: u.name, r: u.role, p: u.pw, s: u.salt || '', ct: u.ct || 0,
      lt: u.lt || 0, lg: u.lg || 0, sc: u.sc || '', st: u.stat || {},
      b: u.ban ? 1 : 0, br: u.banR || '', bu: u.banU || 0, nt: u.note || ''
    });
  }
  return JSON.stringify({ v: 1, app: 'fz', n: out.length, at: Date.now(), u: out });
};
/* 名单导入：新账号直接加入（最高权限不会被带进来），已有账号只并统计与封禁 */
ACC.importTxt = function (txt) {
  var o = null;
  try { o = JSON.parse(String(txt || '')); } catch (e) { return { err: '这段文本不是有效的名单数据' }; }
  if (!o || !o.u || !o.u.length) return { err: '名单里没有账号' };
  this.load();
  var L = o.u, i, x, k, u, kk, add = 0, upd = 0, ch = 0;
  for (i = 0; i < L.length; i++) {
    x = L[i];
    if (!x || !x.n) continue;
    k = String(x.n).toLowerCase();
    u = this.users[k];
    if (!u) {
      this.users[k] = {
        name: String(x.n).slice(0, 16), pw: String(x.p || ''), salt: String(x.s || ''),
        role: (x.r === 'admin') ? 'admin' : 'user',
        ct: x.ct || Date.now(), lt: x.lt || 0, lg: x.lg || 0, ban: x.b ? 1 : 0,
        banR: x.br || '', banT: 0, banU: x.bu || 0, sc: x.sc || '',
        stat: (x.st && typeof x.st === 'object') ? x.st : {}, note: String(x.nt || '').slice(0, 60)
      };
      add++; ch = 1; continue;
    }
    /* 已存在的账号：绝不覆盖本机密码与角色，只把更大的统计和封禁并进来 */
    if ((x.lg || 0) > (u.lg || 0)) { u.lg = x.lg; ch = 1; }
    if ((x.lt || 0) > (u.lt || 0)) { u.lt = x.lt; if (x.sc) u.sc = x.sc; ch = 1; }
    if (x.st && typeof x.st === 'object') {
      u.stat = u.stat || {};
      for (kk in x.st) if (Object.prototype.hasOwnProperty.call(x.st, kk)) {
        if ((x.st[kk] || 0) > (u.stat[kk] || 0)) { u.stat[kk] = x.st[kk]; ch = 1; }
      }
    }
    if (x.b && !u.ban && accLv(u) < 3) {
      u.ban = 1; u.banR = String(x.br || '违反使用规则').slice(0, 40); u.banU = x.bu || 0; ch = 1;
    }
    if (ch) upd++;
  }
  if (ch) this.save();
  return { add: add, upd: upd };
};
/* 清空账号库，但保留最高权限账号 */
ACC.wipe = function () {
  this.load();
  var k, n = 0;
  for (k in this.users) if (Object.prototype.hasOwnProperty.call(this.users, k)) {
    if (k === 'admin') continue;
    delete this.users[k]; n++;
  }
  if (!this.users['admin']) this.seed();
  if (this.sess && String(this.sess).toLowerCase() !== 'admin') this.logout();
  SYS.usel = {};
  this.save();
  return n;
};
ACC.sum = function () {
  var s = _accSumV16.call(this), L = this.list(), i, w = 0, now = Date.now();
  for (i = 0; i < L.length; i++) if (L[i].lt && now - L[i].lt < 7 * 86400000) w++;
  s.week = w;
  return s;
};

/* ---------------- 页面 ---------------- */
function sysChips(act, cur, items) {
  var g = sysEl('div', 'uchips'), i;
  for (i = 0; i < items.length; i++) {
    g.appendChild(sysBtn(items[i][1], act, items[i][0] === cur ? 'on' : '', items[i][0]));
  }
  return g;
}
function sysSelNames() {
  var k, out = [];
  for (k in SYS.usel) if (Object.prototype.hasOwnProperty.call(SYS.usel, k) && SYS.usel[k]) out.push(k);
  return out;
}

function sysUCard(u, me, al) {
  var lv = accLv(u), key = String(u.name),
    mine = me && String(u.name).toLowerCase() === String(me.name).toLowerCase();
  var cd = sysEl('div', 'susr' + (u.ban ? ' ban' : '') + (SYS.usel[key] ? ' sel' : ''));
  var top = sysEl('div', 'sutop');
  if (!mine && lv < 3 && al > lv) {
    var ck = sysEl('input', 'uck'); ck.type = 'checkbox'; ck.checked = !!SYS.usel[key];
    ck.setAttribute('data-a', 'adm:sel'); ck.setAttribute('data-v', key);
    ck.onchange = function () {
      if (this.checked) SYS.usel[key] = 1; else delete SYS.usel[key];
      sfx('tap'); sysUserFill();
    };
    top.appendChild(ck);
  }
  top.appendChild(sysEl('div', 'sava' + (lv >= 3 ? ' own' : (lv >= 2 ? ' adm' : '')),
    u.name.slice(0, 1).toUpperCase()));
  var inf = sysEl('div', 'sinfo');
  inf.appendChild(sysEl('b', '', u.name + sysRoleBadge(u) +
    (u.ban ? '　<span class="sbad">已封禁</span>' : '') + (mine ? '　<span class="smini">我自己</span>' : '')));
  var keys = [], kk, best = '', bn = 0;
  if (u.stat) for (kk in u.stat) if (Object.prototype.hasOwnProperty.call(u.stat, kk)) {
    keys.push(kk); if (u.stat[kk] > bn) { bn = u.stat[kk]; best = kk; }
  }
  inf.appendChild(sysEl('i', '', '登录 ' + (u.lg || 0) + ' 次 · 最近 ' + sysFmtT(u.lt) +
    ' · 创建 ' + sysFmtT(u.ct)));
  inf.appendChild(sysEl('i', '', '最近模块：' + (u.sc || '—') +
    (best ? ('　最常玩：' + (SHORT[best] || best) + ' ×' + bn) : '')));
  if (u.ban) {
    inf.appendChild(sysEl('i', '', '封禁理由：' + (u.banR || '未填写') +
      (u.banU ? ('　到期：' + sysFmtT(u.banU)) : '　永久')));
  }
  if (u.note) inf.appendChild(sysEl('i', '', '备注：' + u.note));
  top.appendChild(inf);
  cd.appendChild(top);

  if (SYS.infoN === u.name && keys.length) {
    var bars = sysEl('div', 'sstat');
    keys.sort(function (a2, b2) { return u.stat[b2] - u.stat[a2]; });
    var mx = Math.max(u.stat[keys[0]], 1), j;
    for (j = 0; j < keys.length && j < 10; j++) {
      var row = sysEl('div', 'ssrow');
      row.appendChild(sysEl('span', 'ssn', SHORT[keys[j]] || keys[j]));
      var bar = sysEl('span', 'ssb');
      var fill = sysEl('i', 'ssf');
      fill.style.width = Math.round(u.stat[keys[j]] / mx * 100) + '%';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(sysEl('span', 'ssv', String(u.stat[keys[j]])));
      bars.appendChild(row);
    }
    cd.appendChild(bars);
  }

  var g = sysEl('div', 'sgrp'), can = al > lv && lv < 3 && !mine;
  if (lv >= 3) {
    g.appendChild(sysEl('span', 'smini', '最高权限账号 · 不可封禁 / 删除 / 变动'));
  } else if (mine) {
    g.appendChild(sysEl('span', 'smini', '这是你自己 · 不能改自己的权限'));
  } else if (can) {
    if (u.ban) g.appendChild(sysBtn('解除封禁', 'adm:unban', 'ok', key));
    else g.appendChild(sysBtn('封禁', 'adm:ban', 'warn', key));
    g.appendChild(sysBtn('重置密码', 'adm:pw', '', key));
    g.appendChild(sysBtn('删号', 'adm:del', 'warn', key));
    if (lv >= 2) g.appendChild(sysBtn('撤销管理员', 'adm:role', 'warn', key));
    else if (al >= 2) g.appendChild(sysBtn('设为管理员', 'adm:role', 'pri', key));
    g.appendChild(sysBtn('备注', 'adm:note', '', key));
  } else if (lv >= 2) {
    g.appendChild(sysEl('span', 'smini', '同级管理员 · 只有最高权限账号能撤销'));
  } else {
    g.appendChild(sysEl('span', 'smini', '权限不足'));
  }
  if (keys.length) g.appendChild(sysBtn(SYS.infoN === u.name ? '收起明细' : '查看明细', 'adm:info', '', key));
  cd.appendChild(g);

  if (SYS.banN === u.name) {
    var ip = sysEl('input', 'sinp'); ip.id = 'sysBanR'; ip.placeholder = '封禁理由（可留空）';
    cd.appendChild(sysRow('封禁理由', ip));
    cd.appendChild(sysEl('i', 'stip', '封禁多久：'));
    cd.appendChild(sysChips('adm:dur', SYS.banD, DURS));
    var g2 = sysEl('div', 'sgrp');
    g2.appendChild(sysBtn('确认封禁', 'adm:banok', 'warn', key));
    g2.appendChild(sysBtn('取消', 'adm:bancancel', '', key));
    cd.appendChild(g2);
  }
  if (SYS.pwN === u.name) {
    var ip2 = sysEl('input', 'sinp'); ip2.id = 'sysNewPw'; ip2.type = 'text'; ip2.placeholder = '新密码（≥4 位）';
    cd.appendChild(sysRow('新密码', ip2));
    var g3 = sysEl('div', 'sgrp');
    g3.appendChild(sysBtn('确认修改', 'adm:pwok', 'pri', key));
    g3.appendChild(sysBtn('取消', 'adm:pwcancel', '', key));
    cd.appendChild(g3);
  }
  if (SYS.noteN === u.name) {
    var ip3 = sysEl('input', 'sinp'); ip3.id = 'sysNote'; ip3.placeholder = '给这个用户记一笔（可留空）';
    ip3.value = u.note || '';
    cd.appendChild(sysRow('备注', ip3));
    var g4 = sysEl('div', 'sgrp');
    g4.appendChild(sysBtn('保存', 'adm:noteok', 'pri', key));
    g4.appendChild(sysBtn('取消', 'adm:notecancel', '', key));
    cd.appendChild(g4);
  }
  return cd;
}

/* 只重填列表：搜索时不会把输入框的焦点弄丢 */
function sysUserFill() {
  var box = SYS._ul;
  if (!box) return;
  box.innerHTML = '';
  var L = ACC.view(), me = ACC.cur(), al = accLv(me), i, names = sysSelNames();
  var bulk = sysEl('div', 'ubulk');
  bulk.appendChild(sysEl('span', 'smini', '已选 ' + names.length + ' 个'));
  bulk.appendChild(sysBtn('全选', 'adm:selall'));
  bulk.appendChild(sysBtn('不选', 'adm:selno'));
  if (names.length) {
    bulk.appendChild(sysBtn('批量封禁', 'adm:banmany', 'warn'));
    bulk.appendChild(sysBtn('批量解封', 'adm:unbanmany', 'ok'));
    bulk.appendChild(sysBtn('批量删号', 'adm:delmany', 'warn'));
  }
  box.appendChild(bulk);
  if (!L.length) { box.appendChild(sysEl('div', 'sempty', '没有符合条件的账号')); return; }
  for (i = 0; i < L.length; i++) box.appendChild(sysUCard(L[i], me, al));
}

var _sysUserListV16 = sysUserList;
sysUserList = function (b) {
  var s = ACC.sum(), me = ACC.cur(), al = accLv(me), i;
  b.appendChild(sysSec('用户管理中心'));

  var st = sysEl('div', 'ustat'), cells = [
    ['账号', s.all, ''], ['最高权限', s.owner, ''], ['管理员', s.admin - s.owner, ''],
    ['普通', s.user, ''], ['已封禁', s.ban, 'warn'], ['今日活跃', s.today, ''], ['7 日活跃', s.week, '']
  ];
  for (i = 0; i < cells.length; i++) {
    var d = sysEl('div', 'ustc' + (cells[i][2] ? ' warn' : ''));
    d.appendChild(sysEl('b', '', String(cells[i][1])));
    d.appendChild(sysEl('i', '', cells[i][0]));
    st.appendChild(d);
  }
  b.appendChild(st);

  var v = VIS.load();
  b.appendChild(sysEl('div', 'stip',
    '使用人次：<b>今日 ' + v.n + ' 次</b> · <b>累计 ' + v.tot + ' 次</b>（含没登录的访客）'));
  b.appendChild(sysEl('div', 'stip',
    '账号数据存在使用者各自设备的浏览器里，所以这里看到的是<b>这台设备上注册 / 登录过的所有人</b>。' +
    '想知道别的设备上有哪些人：让对方在设置里「导出名单」把那段文本发给你，再用这里的「导入名单」并进来，' +
    '就能一起看到、一起封禁。'));
  b.appendChild(sysEl('div', 'stip',
    '级别：<b>最高权限 &gt; 管理员 &gt; 普通用户</b>。可以把别人设为管理员（级别永远低于最高权限），' +
    '也能随时撤销；管理员能管普通用户，但动不了同级管理员，更动不了最高权限账号。'));

  var tb = sysEl('div', 'utbar');
  var ip = sysEl('input', 'sinp uq'); ip.id = 'sysUq'; ip.placeholder = '搜用户名…';
  ip.value = SYS.uq || '';
  ip.setAttribute('data-a', 'adm:q');
  ip.oninput = function () { SYS.uq = String(this.value || ''); sysUserFill(); };
  tb.appendChild(ip);
  b.appendChild(tb);
  b.appendChild(sysChips('adm:flt', SYS.uflt, FLTS));
  b.appendChild(sysChips('adm:ord', SYS.uord, ORDS));

  var box = sysEl('div', 'ulist');
  SYS._ul = box;
  b.appendChild(box);
  sysUserFill();

  var gf = sysEl('div', 'sgrp');
  gf.appendChild(sysBtn(SYS.expN ? '收起名单' : '导出名单', 'adm:exp'));
  gf.appendChild(sysBtn(SYS.impN ? '收起导入' : '导入名单', 'adm:imp'));
  gf.appendChild(sysBtn('← 回到账号页', 'adm:back'));
  gf.appendChild(sysBtn('刷新', 'adm:users'));
  if (al >= 3) gf.appendChild(sysBtn(SYS.wipeN ? '取消清空' : '清空账号库', 'adm:wipe', 'warn'));
  b.appendChild(gf);

  if (SYS.expN) {
    var ta = sysEl('textarea', 'sta'); ta.id = 'sysExpTa'; ta.readOnly = true;
    ta.value = ACC.exportTxt();
    b.appendChild(sysRow('账号名单（复制走可备份 / 搬设备）', ta,
      '含账号名、角色、统计、封禁与口令摘要，别公开发'));
  }
  if (SYS.impN) {
    var ta2 = sysEl('textarea', 'sta'); ta2.id = 'sysImpTa';
    ta2.placeholder = '把别的设备导出的名单粘贴到这里';
    ta2.value = SYS.impTxt || '';
    ta2.oninput = function () { SYS.impTxt = String(this.value || ''); };
    b.appendChild(sysRow('粘贴名单', ta2,
      '新账号直接加进来；已有的只并统计与封禁，不覆盖本机密码和角色'));
    var gi = sysEl('div', 'sgrp');
    gi.appendChild(sysBtn('确认导入', 'adm:impok', 'pri'));
    gi.appendChild(sysBtn('取消', 'adm:impcancel'));
    b.appendChild(gi);
  }
  if (SYS.wipeN) {
    b.appendChild(sysEl('div', 'stip',
      '确定清空除最高权限账号以外的全部账号吗？此操作不可撤销。'));
    var gw = sysEl('div', 'sgrp');
    gw.appendChild(sysBtn('确认清空', 'adm:wipeok', 'warn'));
    gw.appendChild(sysBtn('取消', 'adm:wipecancel'));
    b.appendChild(gw);
  }
};

/* ---------------- 动作 ---------------- */
var _sysActV17 = sysAct;
sysAct = function (a, v, el) {
  var i, names, n;
  if (a === 'adm:users') {
    SYS.uview = 1; SYS.banN = ''; SYS.pwN = ''; SYS.noteN = ''; SYS.infoN = '';
    SYS.usel = {}; SYS.expN = 0; SYS.impN = 0; SYS.wipeN = 0; SYS.impTxt = '';
    sfx('open'); sysRender(); return;
  }
  if (a === 'adm:q') {
    var q = document.getElementById('sysUq');
    SYS.uq = q ? String(q.value || '') : '';
    sysUserFill(); return;
  }
  if (a === 'adm:flt') { SYS.uflt = v; sfx('tap'); sysUserFill(); return; }
  if (a === 'adm:ord') { SYS.uord = v; sfx('tap'); sysUserFill(); return; }
  if (a === 'adm:dur') { SYS.banD = parseInt(v, 10) || 0; sfx('tap'); sysRender(); return; }
  if (a === 'adm:selall') {
    var L = ACC.view(), me = ACC.cur(), al = accLv(me);
    for (i = 0; i < L.length; i++) {
      if (accLv(L[i]) >= 3) continue;
      if (me && String(L[i].name).toLowerCase() === String(me.name).toLowerCase()) continue;
      if (al <= accLv(L[i])) continue;
      SYS.usel[String(L[i].name)] = 1;
    }
    sfx('tap'); sysUserFill(); return;
  }
  if (a === 'adm:selno') { SYS.usel = {}; sfx('tap'); sysUserFill(); return; }
  if (a === 'adm:banmany') {
    names = sysSelNames();
    n = ACC.banMany(names, 1, '批量封禁', SYS.banD);
    SYS.usel = {};
    if (n) { sfx('err'); sbToast('已封禁 ' + n + ' 个账号' + (SYS.banD ? ('，' + SYS.banD + ' 天后自动解除') : '')); }
    else { sfx('err'); sbToast('没有能封禁的账号（最高权限 / 同级 / 自己都封不了）'); }
    sysRender(); return;
  }
  if (a === 'adm:unbanmany') {
    names = sysSelNames();
    n = 0;
    for (i = 0; i < names.length; i++) if (ACC.setBan(names[i], 0)) n++;
    SYS.usel = {};
    if (n) { sfx('ok'); sbToast('已解除 ' + n + ' 个账号的封禁'); }
    else { sfx('err'); sbToast('没有能解除的账号'); }
    sysRender(); return;
  }
  if (a === 'adm:delmany') {
    names = sysSelNames();
    n = ACC.delMany(names);
    SYS.usel = {};
    if (n) { sfx('del'); sbToast('已删除 ' + n + ' 个账号'); }
    else { sfx('err'); sbToast('没有能删除的账号'); }
    sysRender(); return;
  }
  if (a === 'adm:note') { SYS.noteN = (SYS.noteN === v) ? '' : v; sfx('open'); sysRender(); return; }
  if (a === 'adm:notecancel') { SYS.noteN = ''; sfx('close'); sysRender(); return; }
  if (a === 'adm:noteok') {
    var ni = document.getElementById('sysNote');
    if (ACC.setNote(v, ni ? ni.value : '')) { sfx('ok'); sbToast('备注已保存'); }
    else { sfx('err'); sbToast('存不了：权限不足'); }
    SYS.noteN = ''; sysRender(); return;
  }
  if (a === 'adm:exp') { SYS.expN = SYS.expN ? 0 : 1; SYS.impN = 0; sfx('open'); sysRender(); return; }
  if (a === 'adm:imp') { SYS.impN = SYS.impN ? 0 : 1; SYS.expN = 0; sfx('open'); sysRender(); return; }
  if (a === 'adm:impcancel') { SYS.impN = 0; SYS.impTxt = ''; sfx('close'); sysRender(); return; }
  if (a === 'adm:impok') {
    var ti = document.getElementById('sysImpTa');
    if (ti) SYS.impTxt = String(ti.value || '');
    var r = ACC.importTxt(SYS.impTxt);
    if (r.err) { sfx('err'); sbToast(r.err); }
    else {
      sfx('unlock');
      sbToast('导入完成：新增 ' + r.add + ' 个，更新 ' + r.upd + ' 个');
      SYS.impN = 0; SYS.impTxt = '';
    }
    sysRender(); return;
  }
  if (a === 'adm:wipe') { SYS.wipeN = SYS.wipeN ? 0 : 1; sfx('tap'); sysRender(); return; }
  if (a === 'adm:wipecancel') { SYS.wipeN = 0; sfx('close'); sysRender(); return; }
  if (a === 'adm:wipeok') {
    n = ACC.wipe();
    SYS.wipeN = 0;
    sfx('del'); sbToast('已清空 ' + n + ' 个账号（最高权限账号保留）');
    sysRender(); return;
  }
  /* 封禁沿用当前选择的期限 */
  if (a === 'adm:banok') {
    var nm = String(v || ''), ip = document.getElementById('sysBanR');
    var ok = ACC.setBan(nm, 1, ip ? ip.value : '', SYS.banD);
    SYS.banN = '';
    if (ok) {
      sfx('err');
      sbToast('已封禁 ' + nm + (SYS.banD ? ('，' + SYS.banD + ' 天后自动解除') : ''));
    } else { sfx('err'); sbToast('封不了：只能封级别比自己低的账号'); }
    sysRender(); return;
  }
  _sysActV17(a, v, el);
};
/* ===================== V17-END ===================== */
/* ===================== V19-BEGIN ===================== */
/* ==================================================================
   v19 · 3A 级精修
   五个维度全面打磨，不新增大系统，只把已有体验推到"精品"档：
   · 声效：爆炸/碎裂低频冲击层 + 闪避（boom 时短暂压低其他声音）+
     触感震动（与音效同步）+ 场景化混响（空间感随模块切换）
   · 图形：物体高光质感（受光面高光 + 背光面环境光遮蔽）、
     接触投影、画面暗角、场景色阶（背景渐变）
   · 机制：触感反馈（爆炸/碎裂/核心弹时轻微震动，特效强度联动）
   · 排版 / 美观：CSS 注入（字体栈升级、等宽数字、焦点环、
     按压反馈、滚动条、卡片微动效、减少动效适配）
   所有新效果都可在 设置 → 声音 →「v19 精修」里单独开关。
   ================================================================== */

/* ---------------- 开关与持久化 ---------------- */
var V19 = {
  vib: 1, sheen: 1, csh: 1, vig: 1, grade: 1,
  K: 'fz_v19',
  KEYS: ['vib', 'sheen', 'csh', 'vig', 'grade'],
  load: function () {
    try {
      var o = JSON.parse(localStorage.getItem(this.K) || 'null'), i, k;
      if (o && typeof o === 'object') {
        for (i = 0; i < this.KEYS.length; i++) {
          k = this.KEYS[i];
          if (o[k] !== undefined) this[k] = o[k] ? 1 : 0;
        }
      }
    } catch (e) { }
  },
  save: function () {
    try {
      var o = {}, i;
      for (i = 0; i < this.KEYS.length; i++) o[this.KEYS[i]] = this[this.KEYS[i]] ? 1 : 0;
      localStorage.setItem(this.K, JSON.stringify(o));
    } catch (e) { }
  }
};
V19.load();

/* ---------------- 机制：触感反馈 ----------------
   navigator.vibrate 只有安卓 Chrome / 部分 WebView 支持，
   iOS Safari 没有这个 API —— 全部静默降级，绝不报错。 */
SND.vibe = function (pat, kind) {
  if (!V19.vib) return 0;
  try {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return 0;
    var x = (typeof SB !== 'undefined' && SB.fxP) ? SB.fxP : 1;
    if (x < 0.25) return 0;                       /* 特效强度调太低就不震了 */
    var p = [], i, m = Math.min(x, 1.6);
    for (i = 0; i < pat.length; i++) p.push(Math.max(8, Math.round(pat[i] * m)));
    navigator.vibrate(p);
    return 1;
  } catch (e) { return 0; }
};

/* ---------------- 声效：闪避（sidechain ducking） ----------------
   大爆炸响起的瞬间把干声总线压低再缓缓放开，
   低频冲击层不会被其他声音糊掉，整段混音更有"电影感"。 */
SND.duck = function (c, amt, dur) {
  try {
    if (!this.dry || !this.ctx) return;
    var t = c.currentTime, g = this.dry.gain;
    if (g.cancelScheduledValues) g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(g.value || 1, 0.001), t);
    g.linearRampToValueAtTime(amt, t + 0.035);
    g.linearRampToValueAtTime(1, t + dur);
  } catch (e) { }
};

/* 给重头音效包一层：闪避 + 触感 + 原声 */
(function () {
  /* [名字, 干声压到, 闪避时长, 震动节奏(ms)] */
  var specs = [
    ['boom',    0.50, 1.10, [70, 50, 90]],
    ['nuke',    0.38, 1.70, [130, 80, 170, 80, 220]],
    ['shatter', 0.72, 0.55, [16, 26]],
    ['crack',   0.80, 0.40, [14]],
    ['rumble',  0.62, 1.00, [36, 60, 80]]
  ], i, sp, f;
  for (i = 0; i < specs.length; i++) {
    (function (sp) {
      f = SNDV[sp[0]];
      if (!f) return;
      SNDV[sp[0]] = function (c, v, o) {
        try { SND.duck(c, sp[1], sp[2]); SND.vibe(sp[3], sp[0]); } catch (e) { }
        return f(c, v, o);
      };
    })(specs[i]);
  }
})();

/* ---------------- 声效：场景化混响 ----------------
   天体沙盒 / 三维天体 = 空旷宇宙（混响大）；
   自由沙盒地面 = 敞开仓库（中等）；
   数据图表、受力图这类"教学台" = 干净教室（混响小）。
   进场景时自动换挡，用户随后仍可用混响滑杆微调。 */
var _enterSceneV19 = enterScene;
enterScene = function (id) {
  var r = _enterSceneV19.apply(null, arguments);
  try {
    var rev = 0.24;
    if (id === 'cosmos' || id === 'astro') rev = 0.42;
    else if (id === 'sandbox') rev = (SB && SB.dark) ? 0.40 : 0.30;
    SND.rev = rev; SND.apply();
  } catch (e) { }
  return r;
};

/* ---------------- 图形：物体高光质感 ----------------
   在材质底色上叠两笔：左上受光高光、右下环境光遮蔽。
   圆和多边形都各自重建路径再 clip，不影响原绘制。 */
function sbSheen(g, b, X, Y, M, R) {
  try {
    g.save();
    g.beginPath();
    if (b.shape === 'circle') {
      g.arc(X, Y, R, 0, Math.PI * 2);
    } else {
      var V = sbVerts(b), i, px, py;
      for (i = 0; i < V.length; i++) {
        px = sbX(V[i][0]); py = sbY(V[i][1]);
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
    }
    g.clip();
    var hx = X - R * 0.38, hy = Y - R * 0.44;
    var gr = g.createRadialGradient(hx, hy, 0, hx, hy, R * 0.95);
    gr.addColorStop(0, 'rgba(255,255,255,.20)');
    gr.addColorStop(0.55, 'rgba(255,255,255,.05)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(X - R, Y - R, R * 2, R * 2);
    var gr2 = g.createRadialGradient(X + R * 0.42, Y + R * 0.5, R * 0.1, X + R * 0.42, Y + R * 0.5, R * 1.1);
    gr2.addColorStop(0, 'rgba(2,6,20,.13)');
    gr2.addColorStop(1, 'rgba(2,6,20,0)');
    g.fillStyle = gr2; g.fillRect(X - R, Y - R, R * 2, R * 2);
    g.restore();
  } catch (e) { }
}

/* ---------------- 图形：接触投影 ----------------
   地面环境下物体脚下垫一圈柔和的椭圆软阴影，
   空间失重环境不画（没有"下"的概念）。 */
function sbDropShadow(g, b, X, Y) {
  try {
    if (SB.env === 'space' || !V19.csh) return;
    var s = SB.view.s;
    var hw = (b.shape === 'circle' ? b.r : b.bw / 2) * s;
    var hh = (b.shape === 'circle' ? b.r : b.bh / 2) * s;
    var yb = Y + hh + 2, w2 = Math.max(hw * 1.18, 6);
    if (yb < 4 || yb > (SB.view.H || 420) + 30) return;
    var gr = g.createRadialGradient(X, yb, 0, X, yb, w2);
    gr.addColorStop(0, 'rgba(2,6,20,.26)');
    gr.addColorStop(0.65, 'rgba(2,6,20,.10)');
    gr.addColorStop(1, 'rgba(2,6,20,0)');
    g.save();
    g.translate(X, yb); g.scale(1, Math.max(hw * 0.24, 2.4) / w2); g.translate(-X, -yb);
    g.fillStyle = gr;
    g.beginPath(); g.arc(X, yb, w2, 0, Math.PI * 2); g.fill();
    g.restore();
  } catch (e) { }
}

/* ---------------- 图形：画面暗角 ----------------
   包一层 sbRender：世界与 HUD 画完后叠一圈向四角渐暗的
   电影暗角（亮色教室环境更淡，深色空间环境更浓）。 */
var _sbRenderV19 = sbRender;
sbRender = function () {
  _sbRenderV19.apply(null, arguments);
  try {
    if (!V19.vig) return;
    var cv = $('#scene'); if (!cv || !cv.getContext) return;
    var g = cv.getContext('2d');
    var W = SB.view.W || 800, H = SB.view.H || 420;
    var rr = Math.sqrt(W * W + H * H) * 0.5;
    var gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.44, W / 2, H / 2, rr);
    gr.addColorStop(0, 'rgba(2,6,20,0)');
    gr.addColorStop(1, 'rgba(2,6,20,' + (SB.dark ? 0.40 : 0.15) + ')');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  } catch (e) { }
};

/* ---------------- 设置面板：v19 精修区 ---------------- */
var _sysRenderSndV19 = sysRenderSnd;
sysRenderSnd = function (b) {
  _sysRenderSndV19(b);
  try {
    b.appendChild(sysSec('v19 精修'));
    var mk = function (key, name, desc) {
      var cb = sysEl('input'); cb.type = 'checkbox'; cb.checked = !!V19[key];
      cb.setAttribute('data-a', 'v19:' + key);
      b.appendChild(sysRow(name, cb, desc));
    };
    mk('sheen', '物体高光质感', '受光面高光 + 背光面环境光遮蔽，物体更有立体感');
    mk('csh', '接触投影', '地面物体脚下垫一圈柔和软阴影；空间环境自动关闭');
    mk('vig', '画面暗角', '四角轻微渐暗，把视线往画面中心收');
    mk('grade', '场景色阶', '背景换成上下渐变的天空色，深色模式更沉稳');
    mk('vib', '触感反馈', '爆炸、碎裂时手机轻微震动（安卓 Chrome 支持；iOS 静默关闭）');
  } catch (e) { }
};

var _sysActV19 = sysAct;
sysAct = function (a, v, el) {
  if (a && a.indexOf('v19:') === 0) {
    var k = a.slice(4), i;
    for (i = 0; i < V19.KEYS.length; i++) {
      if (V19.KEYS[i] === k) {
        V19[k] = V19[k] ? 0 : 1;
        V19.save();
        sfx('toggle', { force: 1 });
        try { if (App.mode === 'sandbox') sbRender(); else render(); } catch (e) { }
        return;
      }
    }
    return;
  }
  return _sysActV19.apply(null, arguments);
};
/* ===================== V19-END ===================== */



/* ================= 导出给小程序页面 ================= */
__env.__engine = {
  App: (typeof App !== 'undefined' ? App : null),
  Scenes: (typeof Scenes !== 'undefined' ? Scenes : null),
  MODULES: (typeof MODULES !== 'undefined' ? MODULES : null),
  UI: (typeof UI !== 'undefined' ? UI : null),
  render: (typeof render !== 'undefined' ? render : null),
  resetSim: (typeof resetSim !== 'undefined' ? resetSim : null),
  stepOnce: (typeof stepOnce !== 'undefined' ? stepOnce : null),
  runToEnd: (typeof runToEnd !== 'undefined' ? runToEnd : null),
  advance: (typeof advance !== 'undefined' ? advance : null),
  pushHist: (typeof pushHist !== 'undefined' ? pushHist : null),
  syncTL: (typeof syncTL !== 'undefined' ? syncTL : null),
  loop: (typeof loop !== 'undefined' ? loop : null),
  loadScene: (typeof loadScene !== 'undefined' ? loadScene : null),
  enterScene: (typeof enterScene !== 'undefined' ? enterScene : null),
  buildHome: (typeof buildHome !== 'undefined' ? buildHome : null),
  showHome: (typeof showHome !== 'undefined' ? showHome : null),
  drawReadout: (typeof drawReadout !== 'undefined' ? drawReadout : null),
  View: (typeof View !== 'undefined' ? View : null),
  fmt: (typeof fmt !== 'undefined' ? fmt : null),
  clamp: (typeof clamp !== 'undefined' ? clamp : null),
  sign: (typeof sign !== 'undefined' ? sign : null),
  label: (typeof label !== 'undefined' ? label : null),
  arrow: (typeof arrow !== 'undefined' ? arrow : null),
  roundRect: (typeof roundRect !== 'undefined' ? roundRect : null),
  drawChart: (typeof drawChart !== 'undefined' ? drawChart : null),
  SB: (typeof SB !== 'undefined' ? SB : null),
  sbStep: (typeof sbStep !== 'undefined' ? sbStep : null),
  sbRender: (typeof sbRender !== 'undefined' ? sbRender : null),
  sbPanel: (typeof sbPanel !== 'undefined' ? sbPanel : null),
  sbClear: (typeof sbClear !== 'undefined' ? sbClear : null),
  sbWorld: (typeof sbWorld !== 'undefined' ? sbWorld : null),
  sbPreset: (typeof sbPreset !== 'undefined' ? sbPreset : null),
  sbMake: (typeof sbMake !== 'undefined' ? sbMake : null),
  sbAdd: (typeof sbAdd !== 'undefined' ? sbAdd : null),
  sbAddAt: (typeof sbAddAt !== 'undefined' ? sbAddAt : null),
  sbAddBomb: (typeof sbAddBomb !== 'undefined' ? sbAddBomb : null),
  sbAddNuke: (typeof sbAddNuke !== 'undefined' ? sbAddNuke : null),
  sbSetMat: (typeof sbSetMat !== 'undefined' ? sbSetMat : null),
  sbSetHard: (typeof sbSetHard !== 'undefined' ? sbSetHard : null),
  sbSetEnv: (typeof sbSetEnv !== 'undefined' ? sbSetEnv : null),
  sbExplode: (typeof sbExplode !== 'undefined' ? sbExplode : null),
  sbNuke: (typeof sbNuke !== 'undefined' ? sbNuke : null),
  sbDetonateAll: (typeof sbDetonateAll !== 'undefined' ? sbDetonateAll : null),
  sbIgniteAll: (typeof sbIgniteAll !== 'undefined' ? sbIgniteAll : null),
  sbPour: (typeof sbPour !== 'undefined' ? sbPour : null),
  sbPartPour: (typeof sbPartPour !== 'undefined' ? sbPartPour : null),
  sbDblAt: (typeof sbDblAt !== 'undefined' ? sbDblAt : null),
  sbDel: (typeof sbDel !== 'undefined' ? sbDel : null),
  sbUndo: (typeof sbUndo !== 'undefined' ? sbUndo : null),
  sbSaveStore: (typeof sbSaveStore !== 'undefined' ? sbSaveStore : null),
  sbClearStore: (typeof sbClearStore !== 'undefined' ? sbClearStore : null),
  sbTiltApply: (typeof sbTiltApply !== 'undefined' ? sbTiltApply : null),
  sbDblCycle: (typeof sbDblCycle !== 'undefined' ? sbDblCycle : null),
  sbSparkToggle: (typeof sbSparkToggle !== 'undefined' ? sbSparkToggle : null),
  sbLinkStart: (typeof sbLinkStart !== 'undefined' ? sbLinkStart : null),
  sbDelLink: (typeof sbDelLink !== 'undefined' ? sbDelLink : null),
  sbToast: (typeof sbToast !== 'undefined' ? sbToast : null),
  sbSelToLiquid: (typeof sbSelToLiquid !== 'undefined' ? sbSelToLiquid : null),
  sbTiltToggle: (typeof sbTiltToggle !== 'undefined' ? sbTiltToggle : null),
  sbDblDef: (typeof sbDblDef !== 'undefined' ? sbDblDef : null),
  sbGDef: (typeof sbGDef !== 'undefined' ? sbGDef : null),
  sbGSet: (typeof sbGSet !== 'undefined' ? sbGSet : null),
  sbGTxt: (typeof sbGTxt !== 'undefined' ? sbGTxt : null),
  MATS: (typeof MATS !== 'undefined' ? MATS : null),
  HARDS: (typeof HARDS !== 'undefined' ? HARDS : null),
  SOLIDS: (typeof SOLIDS !== 'undefined' ? SOLIDS : null),
  LIQS: (typeof LIQS !== 'undefined' ? LIQS : null),
  SBPresets: (typeof SBPresets !== 'undefined' ? SBPresets : null),
  DBLS: (typeof DBLS !== 'undefined' ? DBLS : null),
  ASTRO: (typeof ASTRO !== 'undefined' ? ASTRO : null),
  C3: (typeof C3 !== 'undefined' ? C3 : null),
  ScenesCosmos: (typeof ScenesCosmos !== 'undefined' ? ScenesCosmos : null),
  SYS: (typeof SYS !== 'undefined' ? SYS : null),
  ACC: (typeof ACC !== 'undefined' ? ACC : null),
  BUGS: (typeof BUGS !== 'undefined' ? BUGS : null),
  SND: (typeof SND !== 'undefined' ? SND : null),
  sfx: (typeof sfx !== 'undefined' ? sfx : null),
  sfxAt: (typeof sfxAt !== 'undefined' ? sfxAt : null),
  GATE: (typeof GATE !== 'undefined' ? GATE : null),
  gateCan: (typeof gateCan !== 'undefined' ? gateCan : null),
  sysRender: (typeof sysRender !== 'undefined' ? sysRender : null),
  sysAct: (typeof sysAct !== 'undefined' ? sysAct : null),
  sysOpen: (typeof sysOpen !== 'undefined' ? sysOpen : null),
  sysClose: (typeof sysClose !== 'undefined' ? sysClose : null),
  sysTopbar: (typeof sysTopbar !== 'undefined' ? sysTopbar : null)
};
module.exports = __env.__engine;

})();
