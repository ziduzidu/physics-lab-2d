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
