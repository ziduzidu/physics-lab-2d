# -*- coding: utf-8 -*-
"""v9: \u53cc\u51fb\u753b\u5e03 = \u5728\u70b9\u51fb\u5904\u751f\u6210\u300c\u53cc\u51fb\u653e\u7f6e\u300d\u7684\u4e1c\u897f\uff08\u542b\u539f\u5b50\u5f39 + 4 \u79cd\u6db2\u4f53\uff09"""
import io

P = 'index.html'
src = io.open(P, encoding='utf-8').read()
orig_len = len(src)
applied = 0


def rep(old, new, count=1):
    global src, applied
    c = src.count(old)
    assert c == count, 'expect %d got %d for: %s' % (count, c, old[:70].replace('\n', '\\n'))
    src = src.replace(old, new)
    applied += 1


# ---------------------------------------------------------------- 1. \u53cc\u51fb\u653e\u7f6e\u8868
rep("""function sbAddNuke(){""",
"""/* \u53cc\u51fb\u753b\u5e03\u653e\u4ec0\u4e48\uff1a\u5f62\u72b6 / \u70b8\u836f / \u539f\u5b50\u5f39 / \u5404\u79cd\u6db2\u4f53\uff0c\u5168\u90e8\u5728\u624b\u6307\u70b9\u7684\u4f4d\u7f6e\u751f\u6210 */
var DBLS=[
  {k:'box',   n:'\u65b9\u5757',  kind:'box'},
  {k:'circle',n:'\u5706\u7403',  kind:'circle'},
  {k:'tri',   n:'\u4e09\u89d2',  kind:'tri'},
  {k:'rod',   n:'\u7ec6\u6746',  kind:'rod'},
  {k:'ramp',  n:'\u659c\u9762',  kind:'ramp'},
  {k:'wall',  n:'\u6321\u677f',  kind:'wall'},
  {k:'bomb',  n:'\u70b8\u836f',  kind:'bomb'},
  {k:'nuke',  n:'\u539f\u5b50\u5f39',kind:'nuke'},
  {k:'water', n:'\u6c34',    liq:'water'},
  {k:'gas',   n:'\u6c7d\u6cb9',  liq:'gas'},
  {k:'oil',   n:'\u6cb9',    liq:'oil'},
  {k:'lava',  n:'\u5ca9\u6d46',  liq:'lava'}
];
function sbDblDef(){
  var d=SB.dbl||'box',i;
  for(i=0;i<DBLS.length;i++)if(DBLS[i].k===d)return DBLS[i];
  return DBLS[0];
}
/* \u624b\u673a\u5de5\u5177\u680f\u4e0a\u7684\u5faa\u73af\u5207\u6362\uff1a\u65b9\u5757\u2192\u2026\u2192\u539f\u5b50\u5f39\u2192\u6c34\u2192\u6c7d\u6cb9\u2192\u6cb9\u2192\u5ca9\u6d46\u2192\u65b9\u5757 */
function sbDblCycle(){
  var i=0,d=(SB.dbl||'box');
  for(i=0;i<DBLS.length;i++)if(DBLS[i].k===d)break;
  var n=DBLS[(i+1)%DBLS.length];
  SB.dbl=n.k;
  sbToast('\u53cc\u51fb\u753b\u5e03\uff1d'+(n.liq?'\u5012'+n.n:'\u653e'+n.n)+'\uff08\u5728\u624b\u6307\u70b9\u7684\u4f4d\u7f6e\u751f\u6210\uff09');
  sbMobBar();sbPanel();
}
/* \u5728 (wx,wy) \u5904\u751f\u6210\u5f53\u524d\u300c\u53cc\u51fb\u653e\u7f6e\u300d\u7684\u4e1c\u897f \u2014\u2014 \u8fd9\u662f\u53cc\u51fb/\u8fde\u70b9\u4e24\u4e0b\u7684\u843d\u70b9\u903b\u8f91 */
function sbDblAt(wx,wy){
  var d=sbDblDef();
  if(!isFinite(wx)||!isFinite(wy)){wx=SB.view.cx;wy=SB.view.cy;}
  SB.mouse.wx=wx;SB.mouse.wy=wy;          // \u8ba9 sbFreeSpot \u4e5f\u7528\u8fd9\u4e2a\u70b9\u5f53\u57fa\u51c6
  if(d.liq){
    var w=SB.pourW||2.0,hh=Math.max(0.5,w*0.42);
    var n=sbPartPour(d.liq,wx-w/2,wy,w,hh);
    if(n>0)sbToast('\u5728\u70b9\u51fb\u5904\u5012\u4e86 '+n+' \u9897'+matDef(d.liq).n+
      (matDef(d.liq).fuel?'\uff08\u70b9\u300c\u706b\u82b1\u70b9\u706b\u300d\u5c31\u80fd\u70b9\u7740\uff09':''));
    else sbToast('\u653e\u4e0d\u4e0b\u4e86\uff1a\u6db2\u4f53\u5df2\u6ee1\uff08\u53ef\u628a\u300c\u6db2\u4f53\u4e0a\u9650\u300d\u8c03\u5927\uff09');
    return null;
  }
  var b=sbAddAt(d.kind,wx,wy);
  if(b&&d.kind!=='nuke')sbToast('\u5728\u70b9\u51fb\u5904\u653e\u4e86\u4e2a'+d.n);
  return b;
}
function sbAddNuke(){""")

# ---------------------------------------------------------------- 2. \u5750\u6807\u53c2\u6570\u5316
rep("""function sbAddNuke(){
  var x=SB.mouse.wx,y=SB.mouse.wy;
  if(!isFinite(x)){x=SB.view.cx;y=SB.view.cy;}""",
"""function sbAddNuke(ax,ay){
  var x=(ax===undefined?NaN:ax),y=(ay===undefined?NaN:ay);
  if(!isFinite(x)||!isFinite(y)){x=SB.mouse.wx;y=SB.mouse.wy;}
  if(!isFinite(x)){x=SB.view.cx;y=SB.view.cy;}""")

rep("""function sbPour(mat){
  var x=SB.mouse.wx,y=SB.mouse.wy;
  if(!isFinite(x)||!isFinite(y)){x=SB.view.cx;y=(SB.env==='space'?SB.view.cy:1.2);}""",
"""function sbPour(mat,ax,ay){
  var x=(ax===undefined?NaN:ax),y=(ay===undefined?NaN:ay);
  if(!isFinite(x)||!isFinite(y)){x=SB.mouse.wx;y=SB.mouse.wy;}
  if(!isFinite(x)||!isFinite(y)){x=SB.view.cx;y=(SB.env==='space'?SB.view.cy:1.2);}""")

rep("""function sbFreeSpot(o){
  var bw=o.bw||0,bh=o.bh||0,r=o.r||0,shape=o.shape||'box';
  var x=SB.mouse.wx,y=SB.mouse.wy,k,rad,ang,tx,ty;
  if(!isFinite(x)||!isFinite(y)){x=SB.view.cx;y=SB.view.cy;}""",
"""function sbFreeSpot(o,ax,ay){
  var bw=o.bw||0,bh=o.bh||0,r=o.r||0,shape=o.shape||'box';
  var x=(ax===undefined?NaN:ax),y=(ay===undefined?NaN:ay),k,rad,ang,tx,ty;
  if(!isFinite(x)||!isFinite(y)){x=SB.mouse.wx;y=SB.mouse.wy;}
  if(!isFinite(x)||!isFinite(y)){x=SB.view.cx;y=SB.view.cy;}""")

rep("""function sbAddAt(kind){
  var o={e:SB.defE,mu:SB.defMu};""",
"""function sbAddAt(kind,ax,ay){
  var o={e:SB.defE,mu:SB.defMu};""")
rep("""  o.hard=(o.hard||SB.defHard||'normal');
  var sp=sbFreeSpot(o);
  o.x=sp[0];o.y=sp[1];
  return sbAdd(o);
}""",
"""  o.hard=(o.hard||SB.defHard||'normal');
  var sp=sbFreeSpot(o,ax,ay);
  o.x=sp[0];o.y=sp[1];
  return sbAdd(o);
}""")

# ---------------------------------------------------------------- 3. \u684c\u9762\u53cc\u51fb
rep("""    if(!sbHit(wx,wy)){
      SB.mouse.wx=wx;SB.mouse.wy=wy;
      sbAddAt('box');
    }""",
"""    if(!sbHit(wx,wy)){
      SB.mouse.wx=wx;SB.mouse.wy=wy;
      sbDblAt(wx,wy);
    }""")

# ---------------------------------------------------------------- 4. \u624b\u673a\u8fde\u70b9\u4e24\u4e0b\uff08\u987a\u624b\u653e\u5bbd\u9608\u503c\uff09
rep("""    var dbl=(now-TCH.lastTap<330)&&Math.abs(a[0].x-TCH.tapX)<34&&Math.abs(a[0].y-TCH.tapY)<34;""",
"""    var dbl=(now-TCH.lastTap<400)&&Math.abs(a[0].x-TCH.tapX)<42&&Math.abs(a[0].y-TCH.tapY)<42;""")
rep("""    if(dbl&&!SB.pick){
      TCH.lastTap=0;
      if(!sbHit(SB.mouse.wx,SB.mouse.wy)){sbAddAt('box');sbToast('\u5df2\u6dfb\u52a0\u4e00\u4e2a\u65b9\u5757');}
      e.preventDefault();return;
    }""",
"""    if(dbl&&!SB.pick){
      TCH.lastTap=0;
      if(!sbHit(SB.mouse.wx,SB.mouse.wy))sbDblAt(SB.mouse.wx,SB.mouse.wy);
      e.preventDefault();return;
    }""")

# ---------------------------------------------------------------- 5. SB \u72b6\u6001\u5b57\u6bb5
rep("""  parts:[], pmax:240, pcount:0, pgrid:null, pbodies:null, pourW:2.0,""",
"""  parts:[], pmax:240, pcount:0, pgrid:null, pbodies:null, pourW:2.0,
  dbl:'box',""")

io.open(P,'w',encoding='utf-8').write(src)
print('v9a: %d ops, %d -> %d bytes'%(applied,orig_len,len(src)))
