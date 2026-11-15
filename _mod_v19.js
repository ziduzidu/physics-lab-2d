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
