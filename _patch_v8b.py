# -*- coding: utf-8 -*-
"""v8b：修 3 个在测试里暴露出来的真问题"""
import io

P = 'index.html'
src = io.open(P, encoding='utf-8').read()
n = 0

def rep(old, new, count=1):
    global src, n
    c = src.count(old)
    assert c == count, 'count mismatch %d vs %d\n%s' % (count, c, old[:300])
    src = src.replace(old, new)
    n += 1

# 1) 同时引爆多个炸药/核弹时会崩：sbFuse 的倒序循环用的是旧长度，
#    中间这个 sbDetonate 可能删掉下标更小的物体，下一次取到的就是 undefined
rep("""  if(!any)return;
  for(i=SB.bodies.length-1;i>=0;i--){
    b=SB.bodies[i];
    if(b.boom&&!b.boom.done&&b.due)sbDetonate(b);
  }""",
"""  if(!any)return;
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
  }""")
rep("""function sbFuse(dt){
  var i,b,any=false;""",
"""function sbFuse(dt){
  var i,b,bb,any=false;""")

# 2) 让 hard:'invul' 自动等价于无敌（之前只改了强度，不改 immune 标记）
rep("""  if(o.nuke)b.nuke={kt:(o.nuke.kt||SB.nukeKt)};""",
"""  if(b.hard==='invul')b.invul=true;
  if(o.nuke)b.nuke={kt:(o.nuke.kt||SB.nukeKt)};""")

# 3) 默认当量下的火球太大（15 kt 曾经有 65 m，整个场景一次清空）
rep("""function sbNukeR(kt){return 20*Math.pow(Math.max(kt,0.02),0.42);}""",
    """function sbNukeR(kt){return 8*Math.pow(Math.max(kt,0.02),0.42);}""")

# 4) 附近实在挤不下时：扫一遍整个可视世界找最近的空位，而不是硬抬一下
rep("""  return [clamp(x,-30,52),clamp(Math.max(y,lo+0.8),-2,40)];
}""",
"""  /* 螺旋找不着：就在整个世界扫一遍，挑离鼠标最近的那个空位 */
  var bestX=null,bestY=null,bd=1e18,gx2,gy2,dd2;
  for(gy2=lo;gy2<=34;gy2+=0.55){
    for(gx2=-24;gx2<=48;gx2+=0.55){
      if(sbBlocked(gx2,gy2,bw,bh,r,shape))continue;
      dd2=(gx2-x)*(gx2-x)+(gy2-y)*(gy2-y);
      if(dd2<bd){bd=dd2;bestX=gx2;bestY=gy2;}
    }
  }
  if(bestX!==null)return [bestX,bestY];
  return [clamp(x,-30,52),clamp(Math.max(y,lo+0.8),-2,40)];
}""")

io.open(P, 'w', encoding='utf-8').write(src)
print('v8b 补丁完成：%d 处' % n)
