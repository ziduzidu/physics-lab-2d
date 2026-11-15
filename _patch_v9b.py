# -*- coding: utf-8 -*-
"""v9 第二部分：面板 / 手机栏 / 提示文案 / 存档 —— 双击放置类型"""
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


# ---------------------------------------------------- 6. 面板：双击放置分区
rep("""    }]
  ]));""",
"""    }]
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
  box.appendChild(nD);""")

# ---------------------------------------------------- 7. 手机工具栏循环按钮
rep("""    ['＋核弹',function(){sbAddAt('nuke');}],""",
"""    ['＋核弹',function(){sbAddAt('nuke');}],
    ['双击:'+sbDblDef().n,function(){sbDblCycle();}],""")

# ---------------------------------------------------- 8. 顶部操作提示
rep("""'<b>空白/右键拖动</b>：平移画布；<b>双击空白</b>：加一个方块<br>'+""",
"""'<b>空白/右键拖动</b>：平移画布；<b>双击空白</b>：在点击处放一个「双击放置」的东西（方块/炸药/原子弹/液体都能放）<br>'+""")
rep("""<b>双击空白</b>＝加方块<br>'+""",
"""<b>连点两下空白</b>＝在手指点的位置放当前选的东西<br>'+""")

# ---------------------------------------------------- 9. 存档
rep("""  return {b:bs,j:js,l:ls,pt:sbPartSnap()};""",
"""  return {b:bs,j:js,l:ls,pt:sbPartSnap(),db:(SB.dbl||'box')};""")
rep("""function sbRestore(o){
  if(!o||!o.b)return false;""",
"""function sbRestore(o){
  if(!o||!o.b)return false;
  if(o.db)SB.dbl=o.db;""")

io.open(P, 'w', encoding='utf-8').write(src)
print('v9b: %d ops, %d -> %d bytes' % (applied, orig_len, len(src)))
