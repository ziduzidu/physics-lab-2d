# -*- coding: utf-8 -*-
"""v15：重力方向修复 · 爆炸限度与特效增强 · 管理员账号管理（v18 起不再强制登录）"""
import io, re, sys

P = 'index.html'
src = io.open(P, encoding='utf-8').read()
orig_len = len(src)
applied = []
fail = []


def rep(tag, old, new, cnt=1):
    """精确替换，失败就记下来（不静默放过）"""
    global src
    if old in src:
        src = src.replace(old, new, cnt)
        applied.append(tag)
    else:
        fail.append(tag)


def rex(tag, pat, new, cnt=1):
    global src
    p = re.compile(pat)
    if p.search(src):
        src = p.sub(lambda m: new, src, count=cnt)
        applied.append(tag)
    else:
        fail.append(tag)


# ================================================================ 1. 重力 bug
rep('重力箭头用真实方向',
    u"if(SB.g>0.001)out.push({n:'G',x:0,y:-b.m*SB.g,c:'#dc2626'});",
    u"if(SB.g>0.001)out.push({n:'G',x:b.m*SB.gx,y:b.m*SB.gy,c:'#dc2626'});")

rep('重力滑块改偏角语义',
    u"""  sbSlider(box,'重力方向 (°)',-180,180,5,function(){return Math.round(SB.gdir*180/Math.PI);},
    function(v){SB.gdir=v*Math.PI/180;SB.tiltG=0;sbUnTilt();});""",
    u"""  sbSlider(box,'重力偏角 (° · 0=正下方)',-180,180,5,function(){return Math.round(sbGDef());},
    function(v){sbGSet(v);});""")

rep('重力复位按钮走新函数',
    u"    ['重力↓复位',function(){SB.gdir=-Math.PI/2;SB.tiltG=0;sbUnTilt();sbPanel();}],",
    u"    ['重力↓复位',function(){sbGSet(0);SB.tiltG=0;sbUnTilt();sbPanel();}],")

rep('HUD 重力文案带方向',
    u"""    var gdeg=Math.round(SB.gdir*180/Math.PI);
    label(g,W-10,16,'g = '+fmt(SB.g,1)+' m/s² '+(Math.abs(gdeg+90)<3?'↓':(gdeg+'°')),
      (SB.dark?'rgba(226,232,240,.7)':'#94a3b8'),'right');""",
    u"""    label(g,W-10,16,'g = '+fmt(SB.g,1)+' m/s²　'+sbGTxt(),
      (SB.dark?'rgba(226,232,240,.7)':'#94a3b8'),'right');""")

rep('倾斜提示挪开罗盘',
    u"  if(SB.tiltMsg)label(g,W-10,H-12,SB.tiltMsg,'rgba(217,119,6,.9)','right');",
    u"  if(SB.tiltMsg)label(g,W-10,H-84,SB.tiltMsg,'rgba(217,119,6,.9)','right');")

# ================================================================ 2. 爆炸限度
rep('炸药当量上限 20→200 kg',
    u"""  sbSlider(box,'炸药当量 (kg TNT)',0.2,20,0.2,function(){return SB.boomKg;},
    function(v){SB.boomKg=clamp(v,0.05,50);});""",
    u"""  sbSlider(box,'炸药当量 (kg TNT)',0.2,200,0.2,function(){return SB.boomKg;},
    function(v){SB.boomKg=clamp(v,0.05,2000);});""")

rep('核弹当量上限 100→2000 千吨',
    u"""  sbSlider(box,'核弹当量 (千吨 TNT)',0.5,100,0.5,function(){return SB.nukeKt;},
    function(v){SB.nukeKt=clamp(v,0.1,500);});""",
    u"""  sbSlider(box,'核弹当量 (千吨 TNT)',0.5,2000,0.5,function(){return SB.nukeKt;},
    function(v){SB.nukeKt=clamp(v,0.1,50000);});""")

rep('特效强度上限 200→400%',
    u"""  sbSlider(box,'特效强度 (%)',20,200,10,function(){return Math.round((SB.fxP||1)*100);},
    function(v){SB.fxP=clamp(v/100,0.2,2);});""",
    u"""  sbSlider(box,'特效强度 (%)',20,400,10,function(){return Math.round((SB.fxP||1)*100);},
    function(v){SB.fxP=clamp(v/100,0.2,4);});""")

# ================================================================ 3. 特效：更新分支
rep('fx 更新分支',
    u"""    else if(f.k==='shroom'){f.y+=f.vy*dt;f.x+=(f.vx||0)*dt;f.vy=(f.vy-0.2*dt)*0.985;}
    out.push(f);""",
    u"""    else if(f.k==='shroom'){f.y+=f.vy*dt;f.x+=(f.vx||0)*dt;f.vy=(f.vy-0.2*dt)*0.985;}
    else if(f.k==='wave'){f.x+=(f.vx||0)*dt;f.y+=(f.vy||0)*dt;}
    else if(f.k==='glow'){}
    else if(f.k==='ember'){f.vy-=9.8*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.986;f.vy*=0.986;
      if(SB.env==='ground'&&f.y<0.08&&f.vy<0){f.y=0.08;f.vy*=-0.26;f.vx*=0.72;}}
    else if(f.k==='jet'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.9;f.vy*=0.9;}
    else if(f.k==='sparkle'){if(f.t>=(f.d0||0)){f.vy-=6*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=0.975;f.vy*=0.975;}}
    out.push(f);""")

rep('fx 数量上限放宽',
    u"  var capF=Math.round(420*(SB.fxP||1));if(capF<200)capF=200;",
    u"  var capF=Math.round(600*Math.min(Math.max(SB.fxP||1,0.2),4));if(capF<260)capF=260;")

# ================================================================ 4. 特效：绘制分支
DRAW_OLD = u"""    }else if(f.k==='dust'){
      var r3=f.r*SB.view.s*(1+u*1.7);
      g.fillStyle='rgba(203,213,225,'+(0.42*(1-u))+')';
      g.beginPath();g.arc(X,Y,Math.max(r3,0.4),0,Math.PI*2);g.fill();
    }
  }
}"""
DRAW_NEW = u"""    }else if(f.k==='dust'){
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
}"""
rep('fx 绘制新增 5 类', DRAW_OLD, DRAW_NEW)

# ================================================================ 5. 首页锁标
rex('首页模块卡加锁标',
    u"'<div class=\"mgo\">[^\\n]{0,160}?</div>';\n    c\\.onclick=function\\(\\)\\{enterScene\\(m\\.id\\);\\};",
    u"      '<div class=\"mgo\">进入 \u2192</div>';\n    c.onclick=function(){enterScene(m.id);};")

# ================================================================ 6. CSS
CSSVER = u'V15-CSS v15.1'
CSS = u"""
/* ===== V15-CSS-BEGIN ===== */
/* """ + CSSVER + u""" */
.gmsk{display:flex;align-items:center;justify-content:center;padding:18px;z-index:70}
.gcard{width:100%;max-width:392px;max-height:92vh;overflow-y:auto;padding:22px 20px 18px;border-radius:20px;
  background:linear-gradient(180deg,#132043,#0a1226);border:1px solid rgba(148,178,230,.22);
  box-shadow:0 30px 80px rgba(0,0,0,.62);color:#e2e8f0;text-align:center;
  transform:translateY(14px) scale(.97);opacity:0;transition:transform .26s cubic-bezier(.32,.72,0,1),opacity .26s}
.gmsk.on .gcard{transform:none;opacity:1}
.glogo{width:52px;height:52px;margin:0 auto 10px;border-radius:16px;display:flex;align-items:center;
  justify-content:center;color:#fff;background:linear-gradient(135deg,var(--acc2),var(--pri));
  box-shadow:0 10px 26px rgba(37,99,235,.4)}
.glogo svg{width:26px;height:26px}
.gtitle{font-size:19px;font-weight:800;color:#fff;letter-spacing:.5px}
.gsub{margin:7px 2px 15px;font-size:12.5px;line-height:1.8;color:#9db2d8}
.gsub b{color:#7dd3fc}
.gf{display:flex;align-items:center;gap:9px;margin:8px 0}
.gf label{width:52px;flex:0 0 auto;text-align:left;font-size:12px;color:#8fa6cc}
.ginp{flex:1 1 auto;min-width:0;padding:10px 12px;border-radius:11px;border:1px solid rgba(148,178,230,.24);
  background:rgba(255,255,255,.06);color:#e2e8f0;font-size:14px;outline:none;font-family:inherit}
.ginp:focus{border-color:var(--acc);background:rgba(255,255,255,.1)}
.gerr{min-height:16px;font-size:12px;color:#fca5a5;margin:2px 0 4px}
.gbtns{display:flex;gap:9px;margin-top:6px}
.gbtn{flex:1;padding:11px 0;border-radius:12px;border:1px solid rgba(148,178,230,.24);
  background:rgba(255,255,255,.07);color:#cbd5e1;font-size:14px;font-weight:600;cursor:pointer;
  font-family:inherit;transition:.16s}
.gbtn:hover{color:#fff;background:rgba(255,255,255,.13)}
.gbtn.pri{background:linear-gradient(135deg,var(--acc2),var(--pri));color:#fff;border-color:transparent;
  box-shadow:0 8px 22px rgba(37,99,235,.4)}
.glater{display:block;width:100%;margin-top:10px;padding:8px 0;border:none;background:none;
  color:#7f93b8;font-size:12.5px;cursor:pointer;font-family:inherit}
.glater:hover{color:#cbd5e1}
.gtip{margin-top:12px;padding-top:11px;border-top:1px solid rgba(148,178,230,.13);
  font-size:11px;line-height:1.7;color:#7f93b8}
.gtip b{color:#9db2d8}
.ibtn.need{position:relative;border-color:rgba(251,146,60,.55);color:#fdba74}
.ibtn.need::after{content:'';position:absolute;top:5px;right:5px;width:7px;height:7px;border-radius:50%;
  background:#fb923c;box-shadow:0 0 0 2px rgba(10,18,38,.9)}
.susr{padding:10px 11px;margin:9px 0;border-radius:12px;border:1px solid rgba(148,178,230,.14);
  background:rgba(255,255,255,.04)}
.susr.ban{border-color:rgba(225,29,72,.36);background:rgba(225,29,72,.08)}
.sutop{display:flex;align-items:center;gap:10px}
.sava.adm{background:linear-gradient(135deg,#b45309,#e11d48)}
.sbad{font-size:10.5px;color:#fca5a5;background:rgba(225,29,72,.16);border:1px solid rgba(225,29,72,.32);
  padding:2px 7px;border-radius:999px}
.smini{font-size:11px;color:#7f93b8;align-self:center;padding:0 4px}
.sbtn.ok{color:#86efac;border-color:rgba(34,197,94,.4);background:rgba(34,197,94,.12)}
.sstat{margin:8px 0 2px;padding:8px 9px;border-radius:9px;background:rgba(0,0,0,.22)}
.ssrow{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:11px;color:#9db2d8}
.ssn{width:66px;flex:0 0 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ssb{flex:1 1 auto;height:7px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden}
.ssf{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--acc2),var(--pri))}
.ssv{width:26px;flex:0 0 auto;text-align:right;color:#7dd3fc;font-weight:700}
@media(max-width:600px){
  .gcard{max-width:none;padding:18px 16px 14px;border-radius:18px}
  .ssn{width:54px}
}
/* ===== V15-CSS-END ===== */
"""
if CSSVER not in src:
    src = re.sub(re.escape(u'/* ===== V15-CSS-BEGIN ===== */') + u'[\\s\\S]*?' +
                 re.escape(u'/* ===== V15-CSS-END ===== */') + u'\\n?', u'', src)
    i = src.find('</style>')
    assert i > 0, '</style> not found'
    src = src[:i] + CSS + src[i:]
    applied.append('css(%s)' % CSSVER)
else:
    applied.append('css(exists)')

# ================================================================ 7. 注入模块
try:
    mod = io.open('_mod_v15.js', encoding='utf-8').read().rstrip() + u'\n'
except Exception as e:
    print('!! cannot read _mod_v15.js: %s' % e)
    sys.exit(1)

BEG = u'/* ===================== V15-BEGIN ===================== */'
END = u'/* ===================== V15-END ===================== */'
block = BEG + u'\n' + mod + END
pat = re.compile(re.escape(BEG) + u'[\\s\\S]*?' + re.escape(END))

SEND = u'/* ===================== SYS-END ===================== */'
if BEG in src:
    src = pat.sub(lambda m: block, src, count=1)
    applied.append('module(replace)')
elif SEND in src:
    j = src.find(SEND) + len(SEND)
    src = src[:j] + u'\n' + block + src[j:]
    applied.append('module(after sys)')
else:
    ii = src.rfind('})();')
    assert ii > 0, 'IIFE end not found'
    src = src[:ii] + block + u'\n\n' + src[ii:]
    applied.append('module(insert)')

io.open(P, 'w', encoding='utf-8').write(src)
print('v15 patched: %s' % ', '.join(applied))
if fail:
    print('!! 未匹配（需检查）：%s' % ' | '.join(fail))
print('   %d -> %d bytes' % (orig_len, len(src)))
