# -*- coding: utf-8 -*-
"""v8c：
   1) 液体与刚体的"贴靠判定"和"碰撞推出"分开：贴着就能发生水/火交互，
      之前只有真正穿透才算接触，所以岩浆浇在木头上点不着火
   2) 岩浆/燃着的液体也能点燃旁边的易燃刚体（半径放宽一点）"""
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

rep("""function sbPartPush(p){
  var L=SB.pbodies,i,o,b,nx,ny,pen,dx,dy,d,res,M,rp=SBPR.rad,ins,rvx,rvy,vn,J;
  if(!L)return;
  for(i=0;i<L.length;i++){
    o=L[i];b=o.b;
    dx=p.x-o.x;dy=p.y-o.y;d=Math.sqrt(dx*dx+dy*dy);
    if(d>o.brad+rp+0.05)continue;
    if(o.c){
      if(d>=o.r+rp)continue;
      nx=d>1e-9?dx/d:0;ny=d>1e-9?dy/d:1;
      pen=o.r+rp-d;
    }else{
      res=sbPolyInfo(o,p.x,p.y);
      if(!res)continue;
      ins=sbInPoly([p.x,p.y],o.V);
      var sd=ins?-res.d:res.d;
      if(sd>=rp)continue;
      pen=rp-sd;dx=p.x-res.cx;dy=p.y-res.cy;
      d=Math.sqrt(dx*dx+dy*dy);
      if(d<1e-9){nx=0;ny=1;}
      else if(ins){nx=-dx/d;ny=-dy/d;}
      else{nx=dx/d;ny=dy/d;}
    }
    p.x+=nx*pen;p.y+=ny*pen;
    if(!isFinite(p.x)||!isFinite(p.y)){p.x=o.x;p.y=o.y+1;p.vx=0;p.vy=0;continue;}
    rvx=p.vx-o.vx;rvy=p.vy-o.vy;vn=rvx*nx+rvy*ny;
    if(vn<0){
      rvx-=nx*vn;rvy-=ny*vn;                 // 去掉法向来速
      rvx*=0.84;rvy*=0.84;                   // 切向摩擦：贴着壁面滑
      p.vx=rvx+o.vx;p.vy=rvy+o.vy;
      /* 给动态物体一点反作用力：水流真的能把东西推动 */
      if(!o.stat&&o.invM>0){
        J=Math.min(1.5,-vn)*0.024;
        b.vx-=nx*J*o.invM*8;b.vy-=ny*J*o.invM*8;
        if(!isFinite(b.vx))b.vx=0;
        if(!isFinite(b.vy))b.vy=0;
      }
    }
    /* 水灭火 / 岩浆点火 / 烧着的液体点燃刚体 */
    M=matDef(p.mat);
    if(M.wet&&b.fire>0){b.fire=Math.max(0,b.fire-0.06);if(b.fire<0.05)b.fire=0;}
    else if(M.hot&&matDef(b.mat).flam&&!b.fire){b.fire=0.15;}
    else if(p.burn>0&&matDef(b.mat).flam&&!b.fire){b.fire=0.2;}
  }
}""",
"""function sbPartPush(p){
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
}""")

io.open(P, 'w', encoding='utf-8').write(src)
print('v8c 补丁完成：%d 处' % k)
