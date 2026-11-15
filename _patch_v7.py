# -*- coding: utf-8 -*-
"""v7：把破碎判据从「动能」改成「比动能 ½v²」，砸不碎的才真的砸不碎"""
import io, sys, os

SRC = 'index.html'
s = io.open(SRC, encoding='utf-8').read()
R = []

# 1) 材质强度改成「抗撞阈值 ½v²」
R.append(('材质表强度重标定', """var MATS=[
 {k:'wood',  n:'木',   rho:0.62,e:0.30,mu:0.45,hp:58, c:'#dda86a',c2:'#9a6535',tex:'grain',edge:'#6b4423'},
 {k:'stone', n:'石',   rho:2.40,e:0.18,mu:0.62,hp:140,c:'#aab2bf',c2:'#69717f',tex:'speck',edge:'#4b5563'},
 {k:'steel', n:'钢',   rho:7.80,e:0.52,mu:0.20,hp:620,c:'#d3dbe7',c2:'#8492a6',tex:'metal',edge:'#475569'},
 {k:'rubber',n:'橡胶', rho:1.10,e:0.86,mu:0.88,hp:300,c:'#4a515e',c2:'#252b34',tex:'plain',edge:'#111827'},
 {k:'ice',   n:'冰',   rho:0.92,e:0.14,mu:0.05,hp:26, c:'#dbf2fc',c2:'#8ed3ea',tex:'shine',edge:'#5aa9c4'},
 {k:'glass', n:'玻璃', rho:2.50,e:0.12,mu:0.30,hp:13, c:'#e3f5fd',c2:'#a7dcec',tex:'shine',edge:'#5aa9c4'},
 {k:'foam',  n:'泡沫', rho:0.06,e:0.05,mu:0.72,hp:340,c:'#f5eddd',c2:'#d8c8a8',tex:'pore', edge:'#b9a67f'},
 {k:'tnt',   n:'炸药', rho:1.60,e:0.10,mu:0.50,hp:7,  c:'#e8503f',c2:'#8f1d16',tex:'tnt',  edge:'#5b1410'}
];""",
"""/* hp = 抗撞阈值，单位是「比动能 ½v²」：
   玻璃 4 → 撞到约 2.8 m/s 就碎；木 45 → 约 9.5 m/s；钢 5000 → 约 100 m/s（实际砸不烂）
   用比动能而不是动能，是为了让「大铁块」不会因为质量大就自己把自己砸碎 */
var MATS=[
 {k:'wood',  n:'木',   rho:0.62,e:0.30,mu:0.45,hp:45,  c:'#dda86a',c2:'#9a6535',tex:'grain',edge:'#6b4423'},
 {k:'stone', n:'石',   rho:2.40,e:0.18,mu:0.62,hp:90,  c:'#aab2bf',c2:'#69717f',tex:'speck',edge:'#4b5563'},
 {k:'steel', n:'钢',   rho:7.80,e:0.52,mu:0.20,hp:5000,c:'#d3dbe7',c2:'#8492a6',tex:'metal',edge:'#475569'},
 {k:'rubber',n:'橡胶', rho:1.10,e:0.86,mu:0.88,hp:2200,c:'#4a515e',c2:'#252b34',tex:'plain',edge:'#111827'},
 {k:'ice',   n:'冰',   rho:0.92,e:0.14,mu:0.05,hp:10,  c:'#dbf2fc',c2:'#8ed3ea',tex:'shine',edge:'#5aa9c4'},
 {k:'glass', n:'玻璃', rho:2.50,e:0.12,mu:0.30,hp:4,   c:'#e3f5fd',c2:'#a7dcec',tex:'shine',edge:'#5aa9c4'},
 {k:'foam',  n:'泡沫', rho:0.06,e:0.05,mu:0.72,hp:3000,c:'#f5eddd',c2:'#d8c8a8',tex:'pore', edge:'#b9a67f'},
 {k:'tnt',   n:'炸药', rho:1.60,e:0.10,mu:0.50,hp:1.6, c:'#e8503f',c2:'#8f1d16',tex:'tnt',  edge:'#5b1410'}
];"""))

# 2) hpmax 公式：越大越脆 + 单位换成比动能
R.append(('sbHpMax 公式', """function sbHpMax(b){return Math.max(1.5,matDef(b.mat).hp*sbArea(b)*0.9);}""",
"""/* 同材质下，块越大越脆（缺陷更多）；area=1 时刚好等于材质标称值 */
function sbHpMax(b){
  var A=Math.max(sbArea(b),1e-4);
  return Math.max(0.8,matDef(b.mat).hp*1.35/(1+0.35*Math.sqrt(A)));
}"""))

# 3) 撞击损伤：改用比动能，不再乘 2
R.append(('撞击损伤改为比动能', """    if(SB.fragOn&&vn0<-SB.dmgV){
      var iA=ct.A.invM,iB=ct.B.invM,im=Math.max(iA+iB,1e-9);
      var meff=1/im, Ek=0.5*meff*vn0*vn0, dmg=Ek*SB.dmgK;
      sbHurt(ct.A,dmg*2*(iA/im),ct.p[0],ct.p[1]);
      sbHurt(ct.B,dmg*2*(iB/im),ct.p[0],ct.p[1]);
    }""",
"""    if(SB.fragOn&&vn0<-SB.dmgV){
      var iA=ct.A.invM,iB=ct.B.invM,im=Math.max(iA+iB,1e-9);
      // 比动能 ½v² 按"谁软谁多挨"分配：软的（invM 大）分到的份额更多
      var spec=0.5*vn0*vn0*SB.dmgK;
      sbHurt(ct.A,spec*(iA/im),ct.p[0],ct.p[1]);
      sbHurt(ct.B,spec*(iB/im),ct.p[0],ct.p[1]);
    }"""))

R.append(('dmgK 调到 1', """  dmgK:0.18, dmgV:1.5,""", """  dmgK:1, dmgV:1.5,"""))

# 4) 爆炸伤害重新标定
R.append(('爆炸伤害重标定', """    var dmg=260*kg*Math.pow(w,1.35);""",
"""    var dmg=900*kg*Math.pow(w,1.35);"""))

# 5) 面板文案：强度单位说明
R.append(('强度滑块文案', """  sbSlider(box,'强度 hp (J)',1,2000,1,function(){return b.hpmax;},
    function(v){b.hpmax=Math.max(1,v);b.hp=Math.min(b.hp,b.hpmax);});
  sbSlider(box,'当前损伤 hp',0,2000,1,function(){return b.hp;},
    function(v){b.hp=clamp(v,0,b.hpmax);});""",
"""  sbSlider(box,'强度 hp（½v² 抗撞阈值）',0.5,6000,0.5,function(){return b.hpmax;},
    function(v){b.hpmax=Math.max(0.5,v);b.hp=Math.min(b.hp,b.hpmax);});
  sbSlider(box,'当前 hp（掉到 0 就碎）',0,6000,0.5,function(){return b.hp;},
    function(v){b.hp=clamp(v,0,b.hpmax);});"""))

R.append(('读数强度文案', """    rows.push(['强度 hp',fmt(b.hp,1)+' / '+fmt(b.hpmax,1)+' J']);""",
"""    rows.push(['强度 hp',fmt(b.hp,1)+' / '+fmt(b.hpmax,1)+'（撞到 '+fmt(Math.sqrt(2*b.hp),1)+' m/s 会碎）']);"""))

R.append(('材质说明文案', """  nMat.innerHTML='选好材质再放物体：<b>质量按密度自动算</b>，弹性摩擦也跟着变。<br>'+
    '<b>玻璃 / 冰</b>一摔就碎，<b>木</b>要狠狠砸，<b>钢 / 泡沫 / 橡胶</b>基本砸不烂。<br>'+
    '炸药撞到就炸，也可以设引信延时；几个炸药放一起会<b>殉爆</b>。';""",
"""  nMat.innerHTML='选好材质再放物体：<b>质量按密度自动算</b>，弹性摩擦也跟着变。<br>'+
    '会不会碎看<b>撞击速度</b>（强度 hp 就是 ½v² 的阈值）：玻璃约 2.8 m/s 就碎，'+
    '木约 9.5 m/s，钢要 100 m/s——所以<b>钢怎么砸都不烂</b>。<br>'+
    '炸药撞到就炸，也可以设引信延时；几个炸药放一起会<b>殉爆</b>。';"""))

bad = []
for name, old, new in R:
    c = s.count(old)
    if c != 1:
        bad.append('%s -> %d 次' % (name, c)); continue
    s = s.replace(old, new, 1)

if bad:
    print('失败：'); [print('  ' + b) for b in bad]; sys.exit(1)

io.open(SRC, 'w', encoding='utf-8').write(s)
print('v7 已应用 %d 处，%d 字节' % (len(R), os.path.getsize(SRC)))
