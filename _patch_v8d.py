# -*- coding: utf-8 -*-
"""v8d：木头/燃料烧到 0 应该"烧成烟消失"，而不是炸成更多碎块
   （之前会顺着碎裂逻辑继续分裂，一堆木柴能裂出上百个碎块，顶到物体上限）"""
import io

P = 'index.html'
src = io.open(P, encoding='utf-8').read()
k = 0

def rep(old, new, count=1):
    global src, k
    c = src.count(old)
    assert c == count, 'count mismatch %d vs %d\n%s' % (count, c, old[:300])
    src = src.replace(old, new)
    k += 1

rep("""/* 物体着火：掉血 + 冒火苗 + 引爆炸药 */
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
}""",
"""/* 物体着火：掉血 + 冒火苗 + 引爆炸药 + 烧光后化成烟消失 */
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
}""")

io.open(P, 'w', encoding='utf-8').write(src)
print('v8d 补丁完成：%d 处' % k)
