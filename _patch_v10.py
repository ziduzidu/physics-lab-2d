# -*- coding: utf-8 -*-
"""v10: 新增「圆周运动实验台」板块（6 个情景 + 6 道例题）"""
import io

P = 'index.html'
src = io.open(P, encoding='utf-8').read()
orig_len = len(src)
applied = 0


def rep(old, new, cnt=1):
    global src, applied
    c = src.count(old)
    assert c == cnt, 'expect %d got %d for %r' % (cnt, c, old[:70])
    src = src.replace(old, new)
    applied += 1


MOD = r"""
/* ===================== 圆周运动实验台 ===================== */
Scenes.circular={
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
  A0:62,                       // 过桥：桥面张角（度）
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
    var S=Scenes.circular,m=P.m,g=P.g,r=Math.max(P.r,0.05),v=Math.max(P.v,0);
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
    var S=Scenes.circular;
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
    var S=Scenes.circular,R=S.solve(st,P),g=P.g;
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
        if(need<=P.mu*g+1e-9){st.vx=px;st.vy=py;st.slip=0;}   // 静摩擦够：跟着盘转
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
      st.x=R0*Math.sin(st.phi);st.y=R0*(1-Math.cos(st.phi));
      st.vx=Math.cos(st.phi)*q.v*st.dir;st.vy=Math.sin(st.phi)*q.v*st.dir;
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
    var S=Scenes.circular;
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
    var S=Scenes.circular,R=S.solve(st,P);
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
    var S=Scenes.circular,R=S.solve(st,P);
    if(P.mode===5)return [{label:'主动轮边缘 v₁',color:'#2563eb',value:R.v1},
                          {label:'从动轮边缘 v₂',color:'#22d3ee',value:R.v2}];
    if(P.mode===0)return [{label:'速率 v',color:'#2563eb',value:Math.hypot(st.vx,st.vy)}];
    if(P.mode===2||P.mode===3)
      return [{label:'速率 v',color:'#2563eb',value:(st.free?Math.hypot(st.vx,st.vy):S.at(P,st.phi).v)}];
    return [{label:'速率 v',color:'#2563eb',value:R.v}];
  },
  en:function(st,P){
    var S=Scenes.circular,R=S.solve(st,P);
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
    var S=Scenes.circular,R=S.solve(st,P),rows=[['情景',S.MODE[P.mode]]];
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
        ['当前'+(isR?'绳张力 T':'杆的弹力 N'),fmt(q.F,3)+' N'+(q.F<-1e-9?（'（负＝杆在“推”）'）:'')],
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
    var S=Scenes.circular,R=S.solve(st,P);
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
    var S=Scenes.circular,R=S.solve(st,P);
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
    vel:{field:'v',title:'速率—时间 v-t',unit:'m/s',
         keys:[{label:'主动轮边缘 v₁',color:'#2563eb'},{label:'从动轮边缘 v₂',color:'#22d3ee',dash:true}]},
    en:{field:'e',title:'向心力与约束力—时间',unit:'N',
        keys:[{label:'约束力（张力 / 支持力 / 摩擦）',color:'#dc2626'},{label:'向心力 mv²/R',color:'#16a34a',dash:true}]}
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
      +'　√(2gR) ≤ v₀ ＜ √(5gR) 时会先在某个 φ 处松绳，然后做斜抛——不是继续转',
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
      +'　小球到不了最高点，会先减速到 0 再沿原路摆回来——这就是一个单摆',
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
      +'　把"桥型"改成 1（凹坑）：N = mg cosα + mv²/R ＞ mg → 超重，永远不会飞车',
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
      +'　同一轮上不同半径的两点只能用 ω 相等去联立'
  ]
};

"""

rep("/* 注册为标签页 */", MOD + "\n/* 注册为标签页 */")

# 图标
rep(" conveyor:'<svg",
    " circ:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#22d3ee\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\">"
    "<circle cx=\"12\" cy=\"12\" r=\"7.4\" stroke-dasharray=\"3 2.8\"/>"
    "<circle cx=\"12\" cy=\"4.6\" r=\"1.9\" fill=\"#22d3ee\" stroke=\"none\"/>"
    "<path d=\"M12 12l5.9 3.2\"/><path d=\"M16.6 13.6l1.5 2.1-2.6-.1\"/></svg>',\n"
    " conveyor:'<svg")

rep("var SHORT={conveyor:'传送带',",
    "var SHORT={circ:'圆周',conveyor:'传送带',")

rep(" {id:'astro',name:'天体物理模型台',",
    " {id:'circ',name:'圆周运动实验台',\n"
    "  desc:'转盘、圆锥摆、竖直圆周的绳与杆、汽车过桥、皮带齿轮传动六个情景。"
    "「需要的 mv²/R」和「能提供的上限」实时对着比，按播放看它甩出去、松绳飞车。',\n"
    "  tags:['向心力来源','临界速度','超重失重']},\n"
    " {id:'astro',name:'天体物理模型台',")

io.open(P, 'w', encoding='utf-8').write(src)
print('v10: %d ops, %d -> %d bytes' % (applied, orig_len, len(src)))
