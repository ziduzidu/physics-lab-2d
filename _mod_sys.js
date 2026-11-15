/* ==================================================================
   SYS：声效 · 账号 · 反馈 · 设置抽屉（APP 化外壳）
   设计原则：零外部资源（音效用 Web Audio 现场合成，账号/反馈存本地）
   v14：音频总线（限幅 + 混响 + 声场）、41 种音效、材质化碰撞声、
        空间感（左右声道 + 远近衰减）、管理员账号完全隐形
   ================================================================== */

/* ---------------- 音效：Web Audio 程序化合成 ---------------- */
var SND = {
  ctx: null, master: null, comp: null, dry: null, conv: null, revG: null, nzb: null,
  on: 1, vol: 0.55, mute: 0, ui: 1, phys: 1, spat: 1, rev: 0.3,
  _t: {}, _r: {}, _v: 0, _vw: 0, srcs: null, MAXV: 10,
  init: function () {
    if (this.ctx) return this.ctx;
    var C = (typeof AudioContext !== 'undefined') ? AudioContext
      : (typeof webkitAudioContext !== 'undefined') ? webkitAudioContext : null;
    if (!C) return null;
    try {
      var c = new C();
      this.ctx = c;
      /* 总线：各音源 → 干声/混响 → 主音量 → 限幅器 → 输出
         限幅器负责：一堆碰撞同时炸开时不破音、不刺耳 */
      this.comp = null;
      try { this.comp = c.createDynamicsCompressor(); } catch (e) { }
      this.master = c.createGain();
      this.master.gain.value = (this.mute || !this.on) ? 0 : this.vol;
      if (this.comp) {
        try {
          this.comp.threshold.value = -15; this.comp.knee.value = 24;
          this.comp.ratio.value = 9; this.comp.attack.value = 0.004; this.comp.release.value = 0.22;
        } catch (e) { }
        try { this.master.connect(this.comp); this.comp.connect(c.destination); }
        catch (e) { this.master.connect(c.destination); }
      } else {
        this.master.connect(c.destination);
      }
      this.dry = c.createGain(); this.dry.gain.value = 1;
      try { this.dry.connect(this.master); } catch (e) { }
      /* 混响：现场合成一段脉冲响应（早期反射 + 指数衰减噪声尾巴） */
      this.conv = null;
      try {
        this.conv = c.createConvolver();
        var sr = c.sampleRate, n = Math.max(1, Math.floor(sr * 0.95));
        var b = c.createBuffer(2, n, sr), ch, i;
        for (ch = 0; ch < 2; ch++) {
          var d = b.getChannelData(ch);
          for (i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.9) * 0.9;
          var e1 = Math.floor(sr * (ch ? 0.021 : 0.017)), e2 = Math.floor(sr * (ch ? 0.038 : 0.044));
          if (e1 < n) d[e1] += 0.5;
          if (e2 < n) d[e2] += 0.32;
        }
        this.conv.buffer = b;
        this.revG = c.createGain(); this.revG.gain.value = this.rev;
        this.conv.connect(this.revG);
        this.revG.connect(this.master);
      } catch (e) { this.conv = null; this.revG = null; }
      /* 白噪声底料（所有摩擦/爆炸/水声都由它过滤而来） */
      var sr2 = c.sampleRate, n2 = Math.max(1, Math.floor(sr2 * 1.8));
      var nb = c.createBuffer(1, n2, sr2), nd = nb.getChannelData(0);
      for (var j = 0; j < n2; j++) nd[j] = Math.random() * 2 - 1;
      this.nzb = nb;
    } catch (e) { this.ctx = null; }
    return this.ctx;
  },
  resume: function () {
    var c = this.init();
    if (c && c.state === 'suspended' && c.resume) { try { c.resume(); } catch (e) { } }
  },
  apply: function () {
    if (!this.ctx) return;
    try { this.master.gain.value = (this.mute || !this.on) ? 0 : this.vol; } catch (e) { }
    try { if (this.revG) this.revG.gain.value = this.rev; } catch (e) { }
  },
  /* 声场：返回"该接到哪儿"的节点，顺手做声像与混响发送 */
  _send: function (node, amt) {
    var c = this.ctx;
    try {
      var s = c.createGain(); s.gain.value = Math.max(0, Math.min(1, amt));
      node.connect(s); s.connect(this.conv);
    } catch (e) { }
  },
  node: function (pan, rev) {
    var c = this.ctx; if (!c) return null;
    var g = null;
    try { g = c.createGain(); g.gain.value = 1; } catch (e) { return null; }
    var last = g;
    if (pan && c.createStereoPanner) {
      try {
        var p = c.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan));
        last.connect(p); last = p;
      } catch (e) { }
    }
    try { last.connect(this.dry); } catch (e) { }
    if (rev > 0 && this.conv) this._send(last, rev);
    return g;
  },
  tone: function (c, f0, f1, dur, type, amp, delay, pan, rev) {
    if (!isFinite(amp) || amp <= 0) amp = 0.08;
    if (!isFinite(dur) || dur <= 0) dur = 0.06;
    var out = this.node(pan, rev); if (!out) return;
    var t = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    var ff = Math.max(f0, 1) * (1 + (Math.random() - 0.5) * 0.014);   /* 微失谐，避免机械感 */
    o.frequency.setValueAtTime(ff, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(amp, 0.0002), t + Math.min(0.014, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(out);
    try { o.start(t); o.stop(t + dur + 0.03); this._live(o); } catch (e) { }
  },
  nz: function (c, dur, amp, ftype, freq, delay, pan, rev) {
    if (!this.nzb) return;
    if (!isFinite(amp) || amp <= 0) amp = 0.08;
    if (!isFinite(dur) || dur <= 0) dur = 0.06;
    var out = this.node(pan, rev); if (!out) return;
    var t = c.currentTime + (delay || 0);
    var s = c.createBufferSource(); s.buffer = this.nzb;
    s.playbackRate.value = 0.85 + Math.random() * 0.3;
    var f = c.createBiquadFilter(); f.type = ftype || 'lowpass';
    try { f.frequency.value = Math.max(freq || 900, 20); f.Q.value = 0.9; } catch (e) { }
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(amp, 0.0002), t + Math.min(0.025, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(out);
    try { s.start(t); s.stop(t + dur + 0.03); this._live(s); } catch (e) { }
  },
  /* 扫频噪声：呼啸、风声、爆炸冲击波都靠它 */
  sw: function (c, dur, amp, f0, f1, q, pan, rev, delay) {
    if (!this.nzb) return;
    var out = this.node(pan, rev); if (!out) return;
    var t = c.currentTime + (delay || 0);
    var s = c.createBufferSource(); s.buffer = this.nzb;
    s.playbackRate.value = 0.9 + Math.random() * 0.2;
    var f = c.createBiquadFilter(); f.type = 'bandpass';
    try {
      f.Q.value = q || 1.2;
      f.frequency.setValueAtTime(Math.max(f0, 20), t);
      f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    } catch (e) { try { f.frequency.value = Math.max(f0, 20); } catch (e2) { } }
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(amp, 0.0002), t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(out);
    try { s.start(t); s.stop(t + dur + 0.03); this._live(s); } catch (e) { }
  },
  _live: function (n) {
    try {
      if (!this.srcs) this.srcs = [];
      this.srcs.push(n);
      if (this.srcs.length > 160) this.srcs.splice(0, 80);
    } catch (e) { }
  },
  stopAll: function () {
    var a = this.srcs || [], i;
    for (i = 0; i < a.length; i++) { try { a[i].stop(0); } catch (e) { } }
    this.srcs = [];
  },
  play: function (n, o) {
    if (!this.on || this.mute) return 0;
    o = o || {};
    if (!o.force && SNDU[n] && !this.ui) return 0;      /* 只关界面音，物理声照常 */
    if (!o.force && !SNDU[n] && !this.phys) return 0;   /* 只关物理音，界面音照常 */
    var v = (o.v === undefined) ? 1 : o.v;
    if (!(v > 0)) return 0;
    var gap = o.gap || 0, now = Date.now();
    if (gap) { var p = this._t[n] || 0; if (now - p < gap) return 0; this._t[n] = now; }
    /* 连发抑制：同一个音在 win 毫秒里最多响 run 次。
       燃烧、倒水、堆叠碰撞这类"每帧都在触发"的动作就靠它不再响个不停 */
    var run = o.run || 0, win = o.win || 0;
    if (run && !o.force) {
      var rr = this._r[n];
      if (!rr || now - rr.t > win) { rr = { t: now, c: 0 }; this._r[n] = rr; }
      if (rr.c >= run) return 0;
      rr.c++;
    }
    /* 并发上限：一堆碎块同时炸开时，丢掉一部分，既不破音也不掉帧 */
    if (now - this._vw > 100) { this._vw = now; this._v = 0; }
    if (this._v >= this.MAXV) return 0;
    this._v++;
    var c = this.init(); if (!c) return 0;
    if (c.state === 'suspended' && c.resume) { try { c.resume(); } catch (e) { } }
    var f = SNDV[n]; if (!f) return 0;
    try { f(c, Math.max(0.05, Math.min(v, 4)), o); return 1; } catch (e) { return 0; }
  }
};
/* 界面类音效（关掉「界面音效」时这些不响，物理声不受影响） */
var SNDU = {
  tick: 1, tap: 1, slide: 1, toggle: 1, sel: 1, open: 1, close: 1, back: 1, ok: 1,
  err: 1, pop: 1, login: 1, logout: 1, send: 1, del: 1, warn: 1, unlock: 1, chime: 1
};
function _pan(o) { return (o && o.pan !== undefined) ? o.pan : 0; }
function _rev(o, d) { return (o && o.rev !== undefined) ? o.rev : d; }
var SNDV = {
  /* ---------------- 界面 ---------------- */
  tick: function (c, v, o) { SND.tone(c, 1500, 1040, .05, 'sine', .12 * v, 0, _pan(o), _rev(o, .05)); },
  tap: function (c, v, o) { SND.tone(c, 880, 660, .042, 'sine', .10 * v, 0, _pan(o), _rev(o, .05)); },
  slide: function (c, v, o) { SND.tone(c, 1180, 900, .03, 'sine', .05 * v, 0, _pan(o), _rev(o, .04)); },
  toggle: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .06);
    SND.tone(c, 500, 760, .045, 'triangle', .085 * v, 0, p, r);
    SND.tone(c, 760, 520, .055, 'triangle', .085 * v, .05, p, r);
  },
  sel: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .10);
    SND.tone(c, 1320, 1760, .05, 'sine', .085 * v, 0, p, r);
    SND.nz(c, .03, .03 * v, 'highpass', 3000, 0, p, r);
  },
  open: function (c, v, o) { SND.tone(c, 430, 770, .18, 'sine', .12 * v, 0, _pan(o), _rev(o, .10)); },
  close: function (c, v, o) { SND.tone(c, 700, 400, .15, 'sine', .10 * v, 0, _pan(o), _rev(o, .08)); },
  back: function (c, v, o) { SND.tone(c, 520, 300, .12, 'sine', .09 * v, 0, _pan(o), _rev(o, .06)); },
  ok: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .10);
    SND.tone(c, 523, 523, .09, 'triangle', .13 * v, 0, p, r);
    SND.tone(c, 784, 784, .16, 'triangle', .14 * v, .085, p, r);
  },
  err: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .08);
    SND.tone(c, 330, 180, .24, 'triangle', .12 * v, 0, p, r);
    SND.nz(c, .08, .05 * v, 'lowpass', 900, .02, p, r);
  },
  pop: function (c, v, o) { SND.tone(c, 520, 1180, .07, 'sine', .12 * v, 0, _pan(o), _rev(o, .08)); },
  login: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .12);
    SND.tone(c, 392, 392, .10, 'triangle', .12 * v, 0, p, r);
    SND.tone(c, 523, 523, .10, 'triangle', .12 * v, .09, p, r);
    SND.tone(c, 784, 784, .22, 'triangle', .13 * v, .18, p, r);
  },
  logout: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .10);
    SND.tone(c, 660, 392, .16, 'triangle', .11 * v, 0, p, r);
    SND.tone(c, 392, 280, .20, 'triangle', .10 * v, .13, p, r);
  },
  send: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .10);
    SND.tone(c, 660, 700, .05, 'sine', .09 * v, 0, p, r);
    SND.tone(c, 880, 900, .05, 'sine', .09 * v, .06, p, r);
    SND.tone(c, 1180, 1180, .10, 'sine', .09 * v, .12, p, r);
    SND.nz(c, .06, .03 * v, 'highpass', 2600, .10, p, r);
  },
  del: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .10);
    SND.tone(c, 300, 120, .20, 'sawtooth', .07 * v, 0, p, r);
    SND.nz(c, .16, .10 * v, 'lowpass', 1200, 0, p, r);
  },
  warn: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .08);
    SND.tone(c, 220, 208, .10, 'square', .07 * v, 0, p, r);
    SND.tone(c, 180, 170, .13, 'square', .07 * v, .13, p, r);
  },
  unlock: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .18), f = [523, 659, 784, 1046], i;
    for (i = 0; i < f.length; i++) SND.tone(c, f[i], f[i], .16, 'sine', .09 * v, i * .075, p, r);
  },
  chime: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .30);
    SND.tone(c, 1568, 1560, .50, 'sine', .09 * v, 0, p, r);
    SND.tone(c, 2349, 2340, .34, 'sine', .05 * v, .01, p, r);
    SND.tone(c, 3136, 3120, .22, 'sine', .03 * v, .02, p, r);
  },
  /* ---------------- 碰撞（按材质分开） ---------------- */
  knock: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .18);
    SND.tone(c, 205, 74, .14, 'triangle', .40 * v, 0, p, r);
    SND.nz(c, .07, .18 * v, 'highpass', 1900, 0, p, r);
  },
  wood: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .16);
    SND.tone(c, 262, 108, .12, 'triangle', .34 * v, 0, p, r);
    SND.nz(c, .06, .10 * v, 'bandpass', 1200, 0, p, r);
  },
  stone: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .20);
    SND.tone(c, 150, 58, .16, 'sine', .42 * v, 0, p, r);
    SND.nz(c, .10, .14 * v, 'lowpass', 700, 0, p, r);
  },
  metal: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .34);
    SND.tone(c, 1830, 1750, .45, 'triangle', .10 * v, 0, p, r);
    SND.tone(c, 2470, 2400, .35, 'triangle', .07 * v, .005, p, r);
    SND.tone(c, 3310, 3200, .28, 'sine', .05 * v, .01, p, r);
    SND.nz(c, .05, .08 * v, 'highpass', 3000, 0, p, r);
  },
  glass: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .30);
    SND.tone(c, 2900, 2850, .13, 'sine', .10 * v, 0, p, r);
    SND.tone(c, 4100, 4040, .10, 'sine', .06 * v, .005, p, r);
    SND.nz(c, .04, .05 * v, 'highpass', 5200, 0, p, r);
  },
  ice: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .28);
    SND.tone(c, 2200, 1400, .09, 'sine', .11 * v, 0, p, r);
    SND.nz(c, .12, .13 * v, 'highpass', 4200, 0, p, r);
  },
  soft: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .10);
    SND.tone(c, 120, 70, .13, 'sine', .30 * v, 0, p, r);
    SND.nz(c, .09, .07 * v, 'lowpass', 380, 0, p, r);
  },
  /* ---------------- 破坏 ---------------- */
  crack: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .22);
    SND.nz(c, .24, .30 * v, 'highpass', 2500, 0, p, r);
    SND.tone(c, 2400, 760, .11, 'square', .06 * v, .02, p, r);
  },
  shatter: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .34), i;
    for (i = 0; i < 3; i++) SND.nz(c, .13, .16 * v, 'highpass', 3200 + i * 700, i * .055, p, r);
    SND.tone(c, 3800, 1500, .10, 'sine', .05 * v, 0, p, r);
    SND.tone(c, 2600, 1200, .12, 'sine', .04 * v, .14, p, r);
  },
  snap: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .20);
    SND.nz(c, .07, .18 * v, 'bandpass', 1800, 0, p, r);
    SND.tone(c, 900, 140, .13, 'triangle', .12 * v, .01, p, r);
  },
  boom: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .42);
    SND.tone(c, 96, 26, .95, 'sine', .55 * v, 0, p, r);
    SND.nz(c, .78, .34 * v, 'lowpass', 760, 0, p, r);
    SND.tone(c, 58, 20, 1.4, 'sine', .28 * v, .05, p, r);
    SND.nz(c, .50, .12 * v, 'lowpass', 320, .26, p, r);
  },
  nuke: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .55);
    SND.tone(c, 82, 18, 2.4, 'sine', .60 * v, 0, p, r);
    SND.nz(c, 1.8, .40 * v, 'lowpass', 520, 0, p, r);
    SND.tone(c, 240, 1700, .85, 'sawtooth', .09 * v, 0, p, r);
    SND.nz(c, .9, .15 * v, 'bandpass', 1400, .95, p, r);
    SND.nz(c, 1.6, .20 * v, 'lowpass', 170, 1.4, p, r);
  },
  rumble: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .40);
    SND.nz(c, 1.6, .20 * v, 'lowpass', 180, 0, p, r);
    SND.tone(c, 48, 30, 1.5, 'sine', .18 * v, 0, p, r);
  },
  /* ---------------- 液体 / 火 ---------------- */
  pour: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .16);
    SND.nz(c, .45, .14 * v, 'bandpass', 1500, 0, p, r);
    SND.nz(c, .30, .06 * v, 'bandpass', 2400, .10, p, r);
  },
  splash: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .22);
    SND.nz(c, .26, .20 * v, 'bandpass', 900, 0, p, r);
    SND.tone(c, 500, 1200, .12, 'sine', .07 * v, 0, p, r);
  },
  bubble: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .14);
    SND.tone(c, 600, 900, .07, 'sine', .05 * v, 0, p, r);
    SND.tone(c, 700, 1050, .07, 'sine', .05 * v, .06, p, r);
    SND.tone(c, 560, 860, .07, 'sine', .05 * v, .13, p, r);
  },
  steam: function (c, v, o) { SND.nz(c, .7, .12 * v, 'highpass', 2600, 0, _pan(o), _rev(o, .22)); },
  fire: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .20);
    SND.nz(c, .55, .20 * v, 'bandpass', 780, 0, p, r);
    SND.nz(c, .30, .06 * v, 'bandpass', 2100, .12, p, r);
  },
  fuse: function (c, v, o) { SND.nz(c, .14, .10 * v, 'bandpass', 3200, 0, _pan(o), _rev(o, .12)); },
  spark: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .22), i;
    for (i = 0; i < 4; i++) SND.nz(c, .035, .09 * v, 'highpass', 5200, Math.random() * .18, p, r);
  },
  /* ---------------- 运动 ---------------- */
  whoosh: function (c, v, o) { SND.sw(c, .40, .16 * v, 420, 2400, 1.2, _pan(o), _rev(o, .22), 0); },
  spring: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .16);
    SND.tone(c, 180, 620, .16, 'sine', .12 * v, 0, p, r);
    SND.tone(c, 620, 260, .22, 'sine', .10 * v, .12, p, r);
  },
  launch: function (c, v, o) {
    var p = _pan(o), r = _rev(o, .34);
    SND.tone(c, 110, 900, .75, 'sawtooth', .10 * v, 0, p, r);
    SND.nz(c, .75, .16 * v, 'lowpass', 600, 0, p, r);
    SND.tone(c, 900, 300, .50, 'sine', .08 * v, .60, p, r);
  }
};
/* 试听面板：分类 + 显示名（顺便保证每个键都在 SNDV 里有定义） */
var SNDCAT = [
  ['界面', [['tick', '按钮'], ['tap', '轻点'], ['slide', '滑块'], ['toggle', '开关'], ['sel', '选中'],
  ['open', '打开'], ['close', '关闭'], ['back', '返回'], ['ok', '成功'], ['err', '失败'],
  ['pop', '弹出'], ['login', '登录'], ['logout', '退出'], ['send', '发送'], ['del', '删除'],
  ['warn', '警告'], ['unlock', '解锁'], ['chime', '清脆']]],
  ['碰撞', [['wood', '木'], ['stone', '石'], ['metal', '金属'], ['glass', '玻璃'], ['ice', '冰'],
  ['soft', '软'], ['knock', '通用']]],
  ['破坏', [['crack', '裂纹'], ['shatter', '碎裂'], ['snap', '断裂'], ['boom', '爆炸'],
  ['nuke', '核爆'], ['rumble', '余震']]],
  ['液体与火', [['pour', '倒水'], ['splash', '水花'], ['bubble', '气泡'], ['steam', '蒸汽'],
  ['fire', '点火'], ['fuse', '引信'], ['spark', '火花']]],
  ['运动', [['whoosh', '呼啸'], ['spring', '弹簧'], ['launch', '发射']]]
];
/* 材质 → 碰撞音效（撞什么材质的东西，就发什么声音） */
var MATSND = {
  wood: 'wood', stone: 'stone', steel: 'metal', rubber: 'soft', ice: 'ice', glass: 'glass',
  foam: 'soft', tnt: 'wood', water: 'splash', gas: 'splash', oil: 'splash', lava: 'steam'
};
/* 注意：showHome / enterScene 在脚本里比本模块更早被执行，
   而 var SND 只提升声明不提升赋值，所以这里必须做存在性保护 */
function sfx(n, o) {
  if (typeof SND === 'undefined' || !SND) return 0;
  return SND.play(n, o);
}
/* 带位置的声音：世界坐标 → 左右声道 + 远近衰减（空间感） */
function sfxAt(n, wx, wy, o) {
  if (typeof SND === 'undefined' || !SND) return 0;
  o = o || {};
  if (SND.spat) {
    try {
      var v = SB.view, s = Math.max(v.s, 1e-6);
      var hx = (v.W / 2) / s, hy = (v.H / 2) / s;
      var dx = (wx - v.cx) / Math.max(hx, 1e-6), dy = (wy - v.cy) / Math.max(hy, 1e-6);
      var d = Math.sqrt(dx * dx + dy * dy);
      o.pan = Math.max(-1, Math.min(1, dx)) * 0.85;
      o.v = (o.v === undefined ? 1 : o.v) / (1 + 0.5 * d * d);
    } catch (e) { }
  }
  return SND.play(n, o);
}

/* ---------------- 账号（本地账号库；密码只做不可逆摘要，不明文落盘） ---------------- */
function accHash(s, salt) {
  var str = (salt || 'fz::') + String(s);
  var h = 2166136261, g = 5381, i;
  for (i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0;
    g = ((g << 5) + g + str.charCodeAt(i)) >>> 0;
  }
  return ('0000000' + h.toString(16)).slice(-8) + ('0000000' + g.toString(16)).slice(-8);
}
function accSalt() {
  return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
/* 级别：数字越大权限越高。内置管理账号是最高级（owner），admin 是它可以授出的次一级管理员 */
var ACCLV = { guest: 0, user: 1, admin: 2, owner: 3 };
function accLv(u) { return ACCLV[(u && u.role) || 'guest'] || 0; }
var ACC = {
  UK: 'fz_acc_v1', SK: 'fz_sess_v1', users: null, sess: null,
  /* 内置管理账号只存口令摘要，源码里不出现任何明文口令 */
  APW: 'cf8cae6081a5c1ec',
  seed: function () {
    this.users['admin'] = {
      name: 'admin', pw: this.APW, role: 'owner', salt: '', ct: 0, note: '',
      lt: 0, lg: 0, ban: 0, banR: '', banT: 0, sc: '', stat: {}
    };
  },
  load: function () {
    if (this.users) return this.users;
    this.users = null;
    try { this.users = JSON.parse(localStorage.getItem(this.UK) || 'null') || null; } catch (e) { this.users = null; }
    if (!this.users || typeof this.users !== 'object') { this.users = {}; this.seed(); this.save(); }
    if (!this.users['admin']) { this.seed(); this.save(); }
    /* 老版本账号库：内置账号统一升成 owner（最高权限），并清掉带说明的备注
       （不把账号信息写在明处） */
    if (this.users['admin']) {
      var ad = this.users['admin'], ch = 0;
      if (ad.note) { ad.note = ''; ch = 1; }
      if (ad.role !== 'owner') { ad.role = 'owner'; ch = 1; }
      if (ch) this.save();
    }
    return this.users;
  },
  save: function () { try { localStorage.setItem(this.UK, JSON.stringify(this.users || {})); return 1; } catch (e) { return 0; } },
  get: function (n) { this.load(); return this.users[String(n || '').toLowerCase()] || null; },
  count: function () { this.load(); var k = 0; for (var i in this.users) if (Object.prototype.hasOwnProperty.call(this.users, i)) k++; return k; },
  reg: function (name, pw) {
    name = String(name || '').trim(); pw = String(pw || '');
    if (name.length < 2 || name.length > 16) return { ok: 0, msg: '用户名要 2~16 个字符' };
    if (!/^[\w\u4e00-\u9fa5.-]+$/.test(name)) return { ok: 0, msg: '用户名只能用中英文、数字、._-' };
    if (pw.length < 4) return { ok: 0, msg: '密码至少 4 位' };
    var k = name.toLowerCase();
    if (k === 'admin') return { ok: 0, msg: '这个用户名不可用' };   /* 不暴露内置账号的存在 */
    this.load();
    if (this.users[k]) return { ok: 0, msg: '这个用户名已被占用' };
    var salt = accSalt();
    this.users[k] = { name: name, pw: accHash(pw, salt), role: 'user', salt: salt, ct: Date.now(), note: '' };
    this.save();
    this.login(name, pw);
    return { ok: 1, msg: '注册成功，已自动登录' };
  },
  login: function (name, pw) {
    name = String(name || '').trim(); pw = String(pw || '');
    var u = this.get(name);
    if (!u) return { ok: 0, msg: '账号不存在' };
    if (u.pw !== accHash(pw, u.salt || '')) return { ok: 0, msg: '密码不对' };
    try { localStorage.setItem(this.SK, u.name); } catch (e) { }
    this.sess = u.name;
    return { ok: 1, msg: '欢迎回来，' + u.name, role: u.role };
  },
  logout: function () { try { localStorage.removeItem(this.SK); } catch (e) { } this.sess = null; },
  cur: function () {
    if (this.sess) { var u = this.get(this.sess); if (u) return u; }
    var n = null;
    try { n = localStorage.getItem(this.SK); } catch (e) { }
    if (!n) { this.sess = null; return null; }
    var u2 = this.get(n); this.sess = u2 ? u2.name : null; return u2;
  },
  isAdmin: function () { return accLv(this.cur()) >= 2; },
  isOwner: function () { return accLv(this.cur()) >= 3; },
  /* 我能不能管这个账号：级别必须严格高于对方，且对方不能是最高权限账号，也不能是自己 */
  canOn: function (n) {
    var a = this.cur(), t = this.get(n);
    if (!a || !t) return 0;
    if (accLv(a) < 2) return 0;
    if (accLv(t) >= 3) return 0;
    if (String(t.name).toLowerCase() === String(a.name).toLowerCase()) return 0;
    return accLv(a) > accLv(t) ? 1 : 0;
  },
  resetAll: function () { this.users = {}; this.seed(); this.save(); this.logout(); }
};

/* ---------------- 反馈（发现 bug） ---------------- */
var BUGS = {
  K: 'fz_bug_v1', list: null,
  load: function () {
    if (this.list) return this.list;
    try { this.list = JSON.parse(localStorage.getItem(this.K) || 'null') || null; } catch (e) { this.list = null; }
    if (!this.list || Object.prototype.toString.call(this.list) !== '[object Array]') this.list = [];
    return this.list;
  },
  save: function () { try { localStorage.setItem(this.K, JSON.stringify(this.list || [])); return 1; } catch (e) { return 0; } },
  add: function (cat, txt) {
    txt = String(txt || '').trim();
    if (txt.length < 3) return { ok: 0, msg: '再多写几个字吧（至少 3 个字）' };
    var u = ACC.cur();
    var P = {};
    try { P = (App && App.P) ? App.P : {}; } catch (e) { P = {}; }
    var ps = ''; try { ps = JSON.stringify(P); } catch (e) { ps = ''; }
    this.load();
    this.list.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      t: Date.now(), cat: String(cat || '其他'), txt: txt.slice(0, 600),
      user: u ? u.name : '游客', role: u ? u.role : 'guest',
      scene: (App && App.scene && App.scene.id) ? App.scene.id : (App && App.mode === 'sandbox' ? 'sandbox' : '-'),
      P: ps.slice(0, 300),
      ua: (typeof navigator !== 'undefined' && navigator.userAgent) ? String(navigator.userAgent).slice(0, 110) : '-',
      scr: (typeof innerWidth !== 'undefined') ? (innerWidth + '×' + innerHeight) : '-'
    });
    while (this.list.length > 200) this.list.pop();
    this.save();
    return { ok: 1, msg: '已记录，谢谢你！' };
  },
  del: function (id) {
    this.load();
    for (var i = 0; i < this.list.length; i++) if (this.list[i].id === id) { this.list.splice(i, 1); this.save(); return 1; }
    return 0;
  },
  clear: function () { this.list = []; this.save(); }
};

/* ---------------- 设置（持久化） ---------------- */
var SYSK = 'fz_set_v1';
var SYS = {
  tab: 'acc', open: 0, bugCat: '显示错误', autosave: 1, hiQ: 1, slowmo: 1, decal: 1, _k: 0, _tm: null,
  load: function () {
    try {
      var o = JSON.parse(localStorage.getItem(SYSK) || 'null') || {};
      if (o.on !== undefined) SND.on = o.on ? 1 : 0;
      if (o.vol !== undefined) SND.vol = Math.max(0, Math.min(1, o.vol));
      if (o.mute !== undefined) SND.mute = o.mute ? 1 : 0;
      if (o.ui !== undefined) SND.ui = o.ui ? 1 : 0;
      if (o.spat !== undefined) SND.spat = o.spat ? 1 : 0;
      if (o.rev !== undefined) SND.rev = Math.max(0, Math.min(1, o.rev));
      if (o.tab) SYS.tab = o.tab;
      if (o.autosave !== undefined) SYS.autosave = o.autosave ? 1 : 0;
      if (o.hiQ !== undefined) SYS.hiQ = o.hiQ ? 1 : 0;
      if (o.slowmo !== undefined) SYS.slowmo = o.slowmo ? 1 : 0;
      if (o.decal !== undefined) SYS.decal = Math.max(0, Math.min(2, o.decal | 0));
      if (o.phys !== undefined) SND.phys = o.phys ? 1 : 0;
    } catch (e) { }
    SND.apply();
  },
  save: function () {
    try {
      localStorage.setItem(SYSK, JSON.stringify({
        on: SND.on ? 1 : 0, vol: SND.vol, mute: SND.mute ? 1 : 0,
        ui: SND.ui ? 1 : 0, spat: SND.spat ? 1 : 0, rev: SND.rev,
        tab: SYS.tab, autosave: SYS.autosave ? 1 : 0, hiQ: SYS.hiQ ? 1 : 0,
        slowmo: SYS.slowmo ? 1 : 0, decal: SYS.decal | 0, phys: SND.phys ? 1 : 0
      }));
    } catch (e) { }
  }
};

/* ---------------- 抽屉 UI ---------------- */
function sysEl(tag, cls, html) {
  var d = document.createElement(tag);
  if (cls) d.className = cls;
  if (html !== undefined) {
    d.innerHTML = html;
    /* 同时给一份纯文本：便于无障碍朗读，也方便自动化检查内容 */
    d.textContent = String(html).replace(/<[^>]*>/g, '');
  }
  return d;
}
function sysRow(label, right, desc, id) {
  var r = sysEl('div', 'srow');
  var l = sysEl('div', 'sl');
  var lb = sysEl('b', '', label);
  if (id) lb.id = id;
  l.appendChild(lb);
  if (desc) l.appendChild(sysEl('i', '', desc));
  r.appendChild(l);
  var rr = sysEl('div', 'sr');
  if (typeof right === 'string') rr.innerHTML = right;
  else if (right) rr.appendChild(right);
  r.appendChild(rr);
  return r;
}
function sysBtn(txt, act, cls, v) {
  var b = sysEl('button', 'sbtn' + (cls ? ' ' + cls : ''));
  b.textContent = txt; b.setAttribute('data-a', act);
  if (v !== undefined) b.setAttribute('data-v', v);
  return b;
}
function sysSec(title) { return sysEl('div', 'ssec', title); }

function sysBuildShell() {
  if (SYS.built) return;                 /* 用自带标志判重，别靠 getElementById 的副作用 */
  SYS.built = 1;
  var m = sysEl('div', 'msk'); m.id = 'sysMsk'; m.setAttribute('data-a', 'close');
  var d = sysEl('aside', 'drw'); d.id = 'sysDrw';
  var h = sysEl('div', 'drwt');
  h.appendChild(sysEl('b', '', '设置'));
  var x = sysEl('button', 'ibtn'); x.setAttribute('data-a', 'close');
  x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  h.appendChild(x);
  d.appendChild(h);
  d.appendChild(sysEl('div', 'drwtab'));
  d.appendChild(sysEl('div', 'drwb'));
  document.body.appendChild(m);
  document.body.appendChild(d);
  m.onclick = function () { sysClose(); };          /* 点遮罩关闭 */
  d.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== d && !t.getAttribute('data-a')) t = t.parentNode;
    if (!t || t === d) return;
    sysAct(t.getAttribute('data-a'), t.getAttribute('data-v'), t);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && SYS.open) sysClose(); });
}

function sysOpen(tab) {
  sysBuildShell();
  if (tab) SYS.tab = tab;
  SYS.open = 1;
  document.getElementById('sysMsk').className = 'msk on';
  document.getElementById('sysDrw').className = 'drw on';
  try { document.body.style.overflow = 'hidden'; } catch (e) { }   /* 抽屉打开时锁住背景滚动 */
  sfx('open');
  sysRender();
}
function sysClose() {
  SYS.open = 0;
  var m = document.getElementById('sysMsk'), d = document.getElementById('sysDrw');
  if (m) m.className = 'msk';
  if (d) d.className = 'drw';
  try { document.body.style.overflow = ''; } catch (e) { }
  sysStopAll();
  sfx('close'); SYS.save();
}

function sysRender() {
  var d = document.getElementById('sysDrw'); if (!d) return;
  var tabs = [['acc', '账号'], ['snd', '声音'], ['view', '画面'], ['about', '关于']];
  var tt = d.querySelector('.drwtab'); tt.innerHTML = '';
  tabs.forEach(function (t) {
    var b = sysEl('button', 'dtb' + (SYS.tab === t[0] ? ' on' : ''), t[1]);
    b.setAttribute('data-a', 'tab'); b.setAttribute('data-v', t[0]);
    tt.appendChild(b);
  });
  var body = d.querySelector('.drwb'); body.innerHTML = '';
  if (SYS.tab === 'acc') sysRenderAcc(body);
  else if (SYS.tab === 'snd') sysRenderSnd(body);
  else if (SYS.tab === 'view') sysRenderView(body);
  else sysRenderAbout(body);
  sysTopbar();
}

function sysRenderAcc(b) {
  var u = ACC.cur();
  b.appendChild(sysSec('账号'));
  if (u) {
    var card = sysEl('div', 'scar');
    var av = sysEl('div', 'sava big', u.name.slice(0, 1).toUpperCase());
    card.appendChild(av);
    var info = sysEl('div', 'sinfo');
    info.appendChild(sysEl('b', '', u.name));
    info.appendChild(sysEl('i', '',
      accLv(u) >= 3 ? '最高权限 · 可管理全部账号' : (accLv(u) >= 2 ? '管理员 · 可管理普通账号' : '已登录用户')));
    if (u.note) info.appendChild(sysEl('i', '', u.note));
    card.appendChild(info);
    b.appendChild(card);
    if (accLv(u) >= 2) {
      b.appendChild(sysRow('管理控制台', sysEl('span', 'sadm', '已启用'), '可查看全部反馈、管理账号与数据'));
      var g1 = sysEl('div', 'sgrp');
      g1.appendChild(sysBtn('查看反馈（' + BUGS.load().length + '）', 'adm:bugs', 'pri'));
      g1.appendChild(sysBtn('清空全部反馈', 'adm:bugclear'));
      g1.appendChild(sysBtn('重置账号库', 'adm:reset'));
      b.appendChild(g1);
    }
    var g2 = sysEl('div', 'sgrp');
    g2.appendChild(sysBtn('退出登录', 'logout', 'warn'));
    b.appendChild(g2);
  } else {
    var ip1 = sysEl('input', 'sinp'); ip1.id = 'sysUser'; ip1.placeholder = '用户名（2~16 字）';
    var ip2 = sysEl('input', 'sinp'); ip2.id = 'sysPw'; ip2.type = 'password'; ip2.placeholder = '密码（至少 4 位）';
    b.appendChild(sysRow('用户名', ip1));
    b.appendChild(sysRow('密码', ip2));
    var g3 = sysEl('div', 'sgrp');
    g3.appendChild(sysBtn('登录', 'login', 'pri'));
    g3.appendChild(sysBtn('注册并登录', 'reg'));
    b.appendChild(g3);
    b.appendChild(sysEl('div', 'stip',
      '<b>登录是可选的</b>：不登录也能用全部 ' + MODULES.length + ' 个模块，包括沙盒爆破和天体沙盒。' +
      '登录后会保存你的个人设置、使用记录，也能提交反馈。<br>' +
      '账号只存在这台设备的浏览器里，不上传任何服务器。'));
  }
  b.appendChild(sysSec('我的反馈'));
  var mine = BUGS.load().filter(function (x) { return u && x.user === u.name; });
  if (!mine.length) b.appendChild(sysEl('div', 'sempty', '还没有提交过问题。'));
  else mine.slice(0, 6).forEach(function (x) {
    b.appendChild(sysEl('div', 'sbug',
      '<b>' + x.cat + '</b><i>' + new Date(x.t).toLocaleString() + ' · ' + x.scene + '</i><p>' +
      String(x.txt).replace(/[<>&]/g, '') + '</p>'));
  });
  var g4 = sysEl('div', 'sgrp');
  g4.appendChild(sysBtn('报告问题 / 发现 bug', 'bug:form', 'pri'));
  b.appendChild(g4);
}

function sysRenderSnd(b) {
  b.appendChild(sysSec('声音'));
  var cb = sysEl('input'); cb.type = 'checkbox'; cb.checked = !!SND.on;
  cb.setAttribute('data-a', 'snd:on');
  b.appendChild(sysRow('音效', cb, '碰撞、碎裂、爆炸、点火、按钮音（Web Audio 实时合成）'));
  var rg = sysEl('input'); rg.type = 'range'; rg.min = '0'; rg.max = '100'; rg.step = '1';
  rg.value = String(Math.round(SND.vol * 100));
  rg.setAttribute('data-a', 'snd:vol');
  b.appendChild(sysRow('音量 ' + Math.round(SND.vol * 100) + '%', rg, '', 'sndVolLb'));
  var cm = sysEl('input'); cm.type = 'checkbox'; cm.checked = !!SND.mute;
  cm.setAttribute('data-a', 'snd:mute');
  b.appendChild(sysRow('静音', cm));

  b.appendChild(sysSec('细分'));
  var cu = sysEl('input'); cu.type = 'checkbox'; cu.checked = !!SND.ui;
  cu.setAttribute('data-a', 'snd:ui');
  b.appendChild(sysRow('界面音效', cu, '按钮、开关、提示音；关掉后只保留物理声'));
  var cp = sysEl('input'); cp.type = 'checkbox'; cp.checked = !!SND.phys;
  cp.setAttribute('data-a', 'snd:phys');
  b.appendChild(sysRow('物理音效', cp, '碰撞、碎裂、爆炸、水与火；关掉后只保留界面音'));
  var cs = sysEl('input'); cs.type = 'checkbox'; cs.checked = !!SND.spat;
  cs.setAttribute('data-a', 'snd:spat');
  b.appendChild(sysRow('空间感', cs, '按事件位置分左右声道，远处的声音更小更闷'));
  var rr2 = sysEl('input'); rr2.type = 'range'; rr2.min = '0'; rr2.max = '100'; rr2.step = '5';
  rr2.value = String(Math.round(SND.rev * 100));
  rr2.setAttribute('data-a', 'snd:rev');
  b.appendChild(sysRow('空间混响 ' + Math.round(SND.rev * 100) + '%', rr2, '', 'sndRevLb'));

  b.appendChild(sysSec('试听'));
  SNDCAT.forEach(function (grp) {
    b.appendChild(sysEl('div', 'slab', grp[0]));
    var g = sysEl('div', 'sgrp');
    grp[1].forEach(function (c) {
      g.appendChild(sysBtn(c[1], 'snd:test', 'tny', c[0]));
    });
    b.appendChild(g);
  });
  var gc = sysEl('div', 'sgrp');
  gc.appendChild(sysBtn('依次试听全部', 'snd:all', 'pri'));
  gc.appendChild(sysBtn('停止', 'snd:stop'));
  b.appendChild(gc);
  b.appendChild(sysEl('div', 'stip', '声音全部是实时合成出来的，没有下载任何音频文件，所以' +
    '<b>不耗流量也不占空间</b>。首次点击页面任意位置后浏览器才允许出声。'));
}

function sysRenderView(b) {
  b.appendChild(sysSec('画面'));
  var rg = sysEl('input'); rg.type = 'range'; rg.min = '20'; rg.max = '400'; rg.step = '10';
  rg.value = String(Math.round((SB.fxP || 1) * 100));
  rg.setAttribute('data-a', 'view:fxp');
  b.appendChild(sysRow('特效强度 ' + Math.round((SB.fxP || 1) * 100) + '%', rg,
    '火花 / 烟尘 / 冲击波 / 余烬数量、震动、爆闪（最高 400%）', 'viewFxpLb'));
  var cs = sysEl('input'); cs.type = 'checkbox'; cs.checked = SYS.slowmo ? true : false;
  cs.setAttribute('data-a', 'view:slowmo');
  b.appendChild(sysRow('大爆炸慢动作', cs, '当量够大时自动进入零点几秒的子弹时间'));
  var cd = sysEl('input'); cd.type = 'range'; cd.min = '0'; cd.max = '2'; cd.step = '1';
  cd.value = String(SYS.decal | 0);
  cd.setAttribute('data-a', 'view:decal');
  b.appendChild(sysRow('爆炸焦痕 ' + (['关', '淡出', '保留'][SYS.decal | 0]), cd,
    '地面上的爆炸痕迹：关掉 / 几秒后淡出 / 一直留着', 'viewDecalLb'));
  var ch = sysEl('input'); ch.type = 'checkbox'; ch.checked = !!SYS.hiQ;
  ch.setAttribute('data-a', 'view:hiq');
  b.appendChild(sysRow('高画质', ch, '关掉后减少渐变与光晕，低端机更流畅'));
  var cv = sysEl('input'); cv.type = 'checkbox'; cv.checked = !!App.showVec;
  cv.setAttribute('data-a', 'view:vec');
  b.appendChild(sysRow('显示矢量箭头', cv));
  var ct = sysEl('input'); ct.type = 'checkbox'; ct.checked = !!App.showTrail;
  ct.setAttribute('data-a', 'view:trail');
  b.appendChild(sysRow('显示运动轨迹', ct));
  b.appendChild(sysSec('实验'));
  var ca = sysEl('input'); ca.type = 'checkbox'; ca.checked = !!SYS.autosave;
  ca.setAttribute('data-a', 'sys:autosave');
  b.appendChild(sysRow('自动保存实验进度', ca, '关掉后刷新页面会回到默认装置'));
  var g = sysEl('div', 'sgrp');
  g.appendChild(sysBtn('把当前视图居中', 'view:fit'));
  g.appendChild(sysBtn('重置所有设置', 'sys:reset'));
  b.appendChild(g);
}

function sysRenderAbout(b) {
  var nEx = 0;
  try { Object.keys(Scenes).forEach(function (k) { nEx += (Scenes[k].examples || []).length; }); } catch (e) { }
  b.appendChild(sysSec('关于'));
  var card = sysEl('div', 'scar',
    '<div class="sava big">物</div><div class="sinfo"><b>高考物理仿真实验室</b>' +
    '<i>v18 · 单文件离线版</i><i>' + MODULES.length + ' 个模块 · ' + nEx + ' 道例题</i></div>');
  card.setAttribute('data-a', 'adm:secret');
  b.appendChild(card);
  b.appendChild(sysEl('div', 'stip',
    '整站就是<b>一个 HTML 文件</b>，没有后端、没有外部图片和音频，曲线与数据都是实时积分算出来的。' +
    '手机上把它加到主屏幕，就像一个真的 App。'));
  b.appendChild(sysSec('发现 bug'));
  b.appendChild(sysEl('div', 'stip', '哪个数不对、哪块花屏、哪里卡顿，都可以记下来。' +
    '提交时会自动带上<b>当前模块和参数</b>，方便复现。'));
  var g = sysEl('div', 'sgrp');
  g.appendChild(sysBtn('报告问题', 'bug:form', 'pri'));
  b.appendChild(g);
  b.appendChild(sysSec('数据'));
  var g2 = sysEl('div', 'sgrp');
  g2.appendChild(sysBtn('清空本机实验存档', 'sys:clear'));
  b.appendChild(g2);
  b.appendChild(sysEl('div', 'stip', '所有数据都只存在这台设备的浏览器里（localStorage），' +
    '清除浏览器数据会一起清掉，不会上传到任何服务器。'));
}

/* ---------------- 反馈表单 ---------------- */
function sysBugForm(pre) {
  var d = document.getElementById('sysDrw'); if (!d) return;
  var body = d.querySelector('.drwb'); body.innerHTML = '';
  body.appendChild(sysSec('报告问题'));
  var cats = ['显示错误', '计算错误', '效果 bug', '卡顿/性能', '操作不顺', '功能建议', '其他'];
  var box = sysEl('div', 'schips');
  cats.forEach(function (c) {
    var b = sysEl('button', 'schip' + (SYS.bugCat === c ? ' on' : ''), c);
    b.setAttribute('data-a', 'bug:cat'); b.setAttribute('data-v', c);
    box.appendChild(b);
  });
  body.appendChild(box);
  var ta = sysEl('textarea', 'sta'); ta.id = 'sysBugTxt'; ta.rows = '5';
  ta.placeholder = '比如：切到「竖直圆周·绳」，v 拖到 3.5 松绳的位置看着偏上 / 手机上倒汽油后帧率明显掉……';
  if (pre) ta.value = pre;
  body.appendChild(ta);
  body.appendChild(sysEl('div', 'stip', '会自动附带：当前模块、参数、屏幕尺寸、浏览器信息。'));
  var g = sysEl('div', 'sgrp');
  g.appendChild(sysBtn('提交', 'bug:submit', 'pri'));
  g.appendChild(sysBtn('返回', 'bug:back'));
  body.appendChild(g);
}
function sysBugList() {
  var d = document.getElementById('sysDrw'); if (!d) return;
  var body = d.querySelector('.drwb'); body.innerHTML = '';
  body.appendChild(sysSec('全部反馈（管理员）'));
  var L = BUGS.load();
  if (!L.length) body.appendChild(sysEl('div', 'sempty', '还没有收到反馈。'));
  L.slice(0, 40).forEach(function (x) {
    var el = sysEl('div', 'sbug adm',
      '<b>' + x.cat + '</b><i>' + new Date(x.t).toLocaleString() + ' · ' + x.user +
      (x.role === 'admin' ? '（管理员）' : '') + ' · ' + x.scene + ' · ' + x.scr + '</i><p>' +
      String(x.txt).replace(/[<>&]/g, '') + '</p><u>' + String(x.ua).replace(/[<>&]/g, '') + '</u>');
    var del = sysBtn('删除', 'adm:bugdel', 'mini', x.id);
    el.appendChild(del);
    body.appendChild(el);
  });
  var g = sysEl('div', 'sgrp');
  g.appendChild(sysBtn('返回', 'bug:back'));
  g.appendChild(sysBtn('清空全部', 'adm:bugclear', 'warn'));
  body.appendChild(g);
}
/* ---------------- 隐藏的管理员入口（不写在任何看得见的地方） ---------------- */
function sysAdmForm(msg) {
  var d = document.getElementById('sysDrw'); if (!d) return;
  var body = d.querySelector('.drwb'); body.innerHTML = '';
  body.appendChild(sysSec('管理员'));
  var ip = sysEl('input', 'sinp'); ip.id = 'sysAdmPw'; ip.type = 'password'; ip.placeholder = '口令';
  body.appendChild(sysRow('口令', ip));
  if (msg) b1(body, msg);
  var g = sysEl('div', 'sgrp');
  g.appendChild(sysBtn('进入', 'adm:key', 'pri'));
  g.appendChild(sysBtn('返回', 'bug:back'));
  body.appendChild(g);
}
function b1(body, msg) { body.appendChild(sysEl('div', 'stip', msg)); }

/* ---------------- 试听全部 ---------------- */
function sysStopAll() {
  try { if (SYS._tm) { clearInterval(SYS._tm); SYS._tm = null; } } catch (e) { }
  try { SND.stopAll(); } catch (e) { }
}
function sysPlayAll() {
  sysStopAll();
  var seq = [], i, j;
  for (i = 0; i < SNDCAT.length; i++) for (j = 0; j < SNDCAT[i][1].length; j++) seq.push(SNDCAT[i][1][j][0]);
  var k = 0;
  SYS._tm = setInterval(function () {
    if (k >= seq.length) { sysStopAll(); return; }
    try { SND.play(seq[k], { gap: 0, force: 1 }); } catch (e) { }
    k++;
  }, 620);
}

/* ---------------- 动作分发 ---------------- */
function sysAct(a, v, el) {
  if (!a) return;
  if (a === 'close') { sysClose(); return; }
  if (a === 'tab') { sysStopAll(); SYS.tab = v; sfx('tap'); sysRender(); SYS.save(); return; }
  if (a.indexOf('snd:') === 0) {
    if (a === 'snd:on') { SND.on = SND.on ? 0 : 1; SND.apply(); sfx('tap'); if (SND.on) sfx('ok'); }
    else if (a === 'snd:mute') { SND.mute = SND.mute ? 0 : 1; SND.apply(); if (!SND.mute) sfx('pop'); }
    else if (a === 'snd:vol') {
      SND.vol = Math.max(0, Math.min(1, (parseFloat(el.value) || 0) / 100)); SND.apply();
      sysLb('sndVolLb', '音量 ' + Math.round(SND.vol * 100) + '%');
      sfx('slide', { gap: 40 });
    }
    else if (a === 'snd:ui') { SND.ui = SND.ui ? 0 : 1; sfx('toggle', { force: 1 }); }
    else if (a === 'snd:spat') { SND.spat = SND.spat ? 0 : 1; sfx('toggle', { force: 1 }); }
    else if (a === 'snd:phys') {
      SND.phys = SND.phys ? 0 : 1;
      if (!SND.phys) SND.stopAll();                 /* 立刻掐掉正在响的碰撞 / 燃烧声 */
      sfx('toggle', { force: 1 });
    }
    else if (a === 'snd:rev') {
      SND.rev = Math.max(0, Math.min(1, (parseFloat(el.value) || 0) / 100)); SND.apply();
      sysLb('sndRevLb', '空间混响 ' + Math.round(SND.rev * 100) + '%');
      sfx('slide', { gap: 40 });
    }
    else if (a === 'snd:test') { SND.resume(); SND.play(v || 'tick', { gap: 0, force: 1 }); SYS.save(); return; }
    else if (a === 'snd:all') { SND.resume(); sysPlayAll(); return; }
    else if (a === 'snd:stop') { sysStopAll(); return; }
    SYS.save(); sysRender(); return;
  }
  if (a.indexOf('view:') === 0) {
    if (a === 'view:fxp') {
      SB.fxP = Math.max(0.2, Math.min(4, (parseFloat(el.value) || 100) / 100));
      sysLb('viewFxpLb', '特效强度 ' + Math.round(SB.fxP * 100) + '%');
      sbAutoSave(); sfx('slide', { gap: 40 });
      if (App.mode === 'sandbox') sbRender(); else render();
      return;
    }
    else if (a === 'view:hiq') { SYS.hiQ = SYS.hiQ ? 0 : 1; }
    else if (a === 'view:slowmo') { SYS.slowmo = el.checked ? 1 : 0; }
    else if (a === 'view:decal') {
      SYS.decal = Math.max(0, Math.min(2, parseInt(el.value, 10) || 0));
      if (!SYS.decal && SB.decals) SB.decals.length = 0;
      sysLb('viewDecalLb', '爆炸焦痕 ' + (['关', '淡出', '保留'][SYS.decal]));
      if (App.mode === 'sandbox') sbRender();
      SYS.save(); return;
    }
    else if (a === 'view:vec') { App.showVec = el.checked; var c1 = document.getElementById('ckVec'); if (c1) c1.checked = el.checked; }
    else if (a === 'view:trail') { App.showTrail = el.checked; if (!el.checked) App.trail = []; var c2 = document.getElementById('ckTrail'); if (c2) c2.checked = el.checked; }
    else if (a === 'view:fit') { SB.needFit = 1; }
    sfx('tap'); SYS.save(); sysRender(); if (App.mode === 'sandbox') sbRender(); else render();
    return;
  }
  if (a === 'sys:autosave') { SYS.autosave = el.checked ? 1 : 0; SYS.save(); sysRender(); return; }
  if (a === 'sys:reset') {
    SND.on = 1; SND.vol = 0.55; SND.mute = 0; SND.ui = 1; SND.spat = 1; SND.rev = 0.3;
    SYS.autosave = 1; SYS.hiQ = 1; SYS.slowmo = 1;
    SND.apply(); SYS.save(); sfx('ok'); sysRender(); sbToast('已恢复默认设置'); return;
  }
  if (a === 'sys:clear') { sbClearStore(); App.hist = []; sfx('ok'); sbToast('本机实验存档已清空'); return; }
  if (a === 'login' || a === 'reg') {
    var u = document.getElementById('sysUser'), p = document.getElementById('sysPw');
    var un = u ? (u.value || '').trim() : '', pw = p ? (p.value || '') : '';
    var r = (a === 'login') ? ACC.login(un, pw) : ACC.reg(un, pw);
    if (r.ok) { sfx(r.role === 'admin' ? 'unlock' : 'login'); sbToast(r.msg); SYS.tab = 'acc'; sysRender(); }
    else { sfx('err'); sbToast(r.msg); }
    return;
  }
  if (a === 'logout') { ACC.logout(); sfx('logout'); sbToast('已退出登录'); sysRender(); return; }
  if (a === 'bug:form') { sfx('open'); sysBugForm(); return; }
  if (a === 'bug:back') { sysRender(); return; }
  if (a === 'bug:cat') { SYS.bugCat = v; sfx('tap'); sysBugForm((document.getElementById('sysBugTxt') || {}).value || ''); return; }
  if (a === 'bug:submit') {
    var t = document.getElementById('sysBugTxt');
    var r2 = BUGS.add(SYS.bugCat, t ? t.value : '');
    if (r2.ok) { sfx('send'); sbToast(r2.msg); sysRender(); }
    else { sfx('err'); sbToast(r2.msg); }
    return;
  }
  if (a === 'adm:secret') {                    /* 隐藏入口：连点关于页的卡片 5 次 */
    SYS._k = (SYS._k || 0) + 1;
    if (SYS._k >= 5) { SYS._k = 0; sfx('unlock'); sysAdmForm(); }
    else sfx('tap');
    return;
  }
  if (a === 'adm:key') {
    var ip = document.getElementById('sysAdmPw');
    var r3 = ACC.login('admin', ip ? (ip.value || '') : '');
    if (r3.ok) { sfx('unlock'); sbToast('已进入管理权限'); SYS.tab = 'acc'; sysRender(); }
    else { sfx('err'); sysAdmForm('口令不对'); }
    return;
  }
  if (a === 'adm:bugs') { sfx('open'); sysBugList(); return; }
  if (a === 'adm:bugdel') { BUGS.del(v); sfx('del'); sysBugList(); return; }
  if (a === 'adm:bugclear') { BUGS.clear(); sfx('ok'); sbToast('反馈已清空'); sysRender(); return; }
  if (a === 'adm:reset') {
    ACC.resetAll(); sfx('err'); sbToast('账号库已重置'); sysRender(); return;
  }
}
/* 只改文字，不重建整页（拖滑块时不会卡，也不会丢焦点） */
function sysLb(id, txt) {
  var e = document.getElementById(id);
  if (e) { try { e.textContent = txt; } catch (err) { } }
}

/* ---------------- 顶栏按钮状态 ---------------- */
function sysTopbar() {
  var b = document.getElementById('sysAcc'); if (!b) return;
  var u = ACC.cur();
  if (u) {
    b.className = 'ibtn ava' + (accLv(u) >= 2 ? ' adm' : '');
    b.innerHTML = u.name.slice(0, 1).toUpperCase();
    b.title = u.name + (accLv(u) >= 3 ? '（最高权限）' : (accLv(u) >= 2 ? '（管理员）' : ''));
  } else {
    b.className = 'ibtn';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    b.title = '账号（未登录）';
  }
}

/* ---------------- 音效钩子：把声音挂到已有动作上 ---------------- */
(function sysHooks() {
  /* 函数声明创建的是可变绑定，直接包一层即可（别用 new Function，它看不到 IIFE 作用域） */
  var _e = sbExplode;
  sbExplode = function () {
    var r = _e.apply(null, arguments);
    sfxAt('boom', arguments[0], arguments[1], { v: Math.min(1.6, 0.5 + (arguments[2] || 1) * 0.12), gap: 60 });
    return r;
  };

  var _n = sbNuke;
  sbNuke = function () {
    var r = _n.apply(null, arguments);
    sfxAt('nuke', arguments[0], arguments[1], { v: 1.5, gap: 200 });
    return r;
  };

  var _f = sbFlushBreak;                       /* sbBreak 由 sbFlushBreak 调用，只挂外层避免双响 */
  sbFlushBreak = function () {
    var q = SB.brk, i, glass = 0, x = 0, y = 0, n = 0;
    if (q) for (i = 0; i < q.length; i++) {
      var m = q[i].b && q[i].b.mat;
      if (m === 'glass' || m === 'ice') glass = 1;
      if (q[i].b) { x += q[i].b.x; y += q[i].b.y; n++; }
    }
    var r = _f.apply(null, arguments);
    if (n) sfxAt(glass ? 'shatter' : 'crack', x / n, y / n, { gap: 110, run: 5, win: 1800 });
    return r;
  };

  var _pp = sbPartPour;                        /* sbPour 内部也走这里 */
  sbPartPour = function () {
    var r = _pp.apply(null, arguments);
    sfxAt('pour', arguments[1], arguments[2], { gap: 260, run: 5, win: 2600 });
    if (Math.random() < 0.25) sfxAt('bubble', arguments[1], arguments[2], { v: 0.7, gap: 520, run: 3, win: 3000 });
    return r;
  };

  var _ig = sbIgniteAt;
  sbIgniteAt = function () {
    var r = _ig.apply(null, arguments);
    sfxAt('fire', arguments[0], arguments[1], { gap: 340, run: 3, win: 2600 });
    sfxAt('spark', arguments[0], arguments[1], { v: 0.8, gap: 420, run: 3, win: 2600 });
    return r;
  };

  var _da = sbDetonateAll;
  sbDetonateAll = function () { var r = _da.apply(null, arguments); sfx('fuse', { gap: 120 }); return r; };

  /* 碰撞：按材质发声，木头闷、金属亮、玻璃脆 */
  var _h = sbHurt;
  sbHurt = function () {
    var r = _h.apply(null, arguments), b = arguments[0], d = arguments[1] || 0;
    /* 声音不断的根因：堆叠/静置的接触点每个物理子步都会结算一次微小损伤，
       于是"咚咚咚"响个不停。三重闸门：损伤阈值 + 单个物体冷却 + 连发抑制 */
    if (d > 1.1 && b && !b.stat && !b.part) {
      var now = Date.now();
      if (!b._sn || now - b._sn > 420) {
        var sp = Math.abs(b.vx || 0) + Math.abs(b.vy || 0);
        if (sp > 0.4 || d > 4) {                  /* 几乎不动、又是轻轻蹭一下的，不发声 */
          var m = b.mat ? (MATSND[b.mat] || 'knock') : 'knock';
          sfxAt(m, b.x || 0, b.y || 0,
            { v: Math.min(1.2, 0.25 + d / 60), gap: 70, run: 4, win: 1200 });
          b._sn = now;                            /* 响了才记冷却，避免"哑掉"真正的撞击 */
        }
      }
    }
    return r;
  };

  var _ps = sbPreset;
  sbPreset = function () { var r = _ps.apply(null, arguments); sfx('pop', { gap: 90 }); return r; };

  /* ---- 下面这些是 v14 新增的"手感音" ---- */
  var _add = sbAdd;
  sbAdd = function () { var r = _add.apply(null, arguments); sfx('sel', { v: 0.8, gap: 60 }); return r; };

  var _del = sbDel;
  sbDel = function () { var r = _del.apply(null, arguments); sfx('del', { gap: 90 }); return r; };

  var _clr = sbClear;
  sbClear = function () { var r = _clr.apply(null, arguments); sfx('del', { gap: 90 }); return r; };

  var _undo = sbUndo;
  sbUndo = function () { var r = _undo.apply(null, arguments); sfx('back', { gap: 90 }); return r; };

  var _env = sbSetEnv;
  sbSetEnv = function () { var r = _env.apply(null, arguments); sfx('whoosh', { gap: 200 }); return r; };

  var _liq = sbSelToLiquid;
  sbSelToLiquid = function () { var r = _liq.apply(null, arguments); sfx('splash', { gap: 120 }); return r; };

  var _lk = sbLink;
  sbLink = function () {
    var r = _lk.apply(null, arguments);
    sfx(arguments[0] === 'spring' ? 'spring' : 'pop', { gap: 80 });
    return r;
  };

  var _dlk = sbDelLink;
  sbDelLink = function () { var r = _dlk.apply(null, arguments); sfx('snap', { gap: 80 }); return r; };

  var _spk = sbSparkToggle;
  sbSparkToggle = function () { var r = _spk.apply(null, arguments); sfx('spark', { gap: 90 }); return r; };

  var _sh = sbShare;
  sbShare = function () { var r = _sh.apply(null, arguments); sfx('send', { gap: 120 }); return r; };

  var _ac = sbApplyCode;
  sbApplyCode = function () {
    var r = _ac.apply(null, arguments);
    sfx(r === false ? 'err' : 'ok', { gap: 120 });
    return r;
  };

  var _tt = sbTiltToggle;
  sbTiltToggle = function () { var r = _tt.apply(null, arguments); sfx('toggle', { gap: 90 }); return r; };

  var _zm = sbZoomAt;
  sbZoomAt = function () { var r = _zm.apply(null, arguments); sfx('slide', { v: 0.7, gap: 110 }); return r; };

  /* 燃烧时的持续噼啪 */
  var _pb = sbPartBurn;
  sbPartBurn = function () { var r = _pb.apply(null, arguments); sfx('fire', { v: 0.35, gap: 900, run: 2, win: 5000 }); return r; };

  /* 引信燃烧的滋滋声 */
  var _fu = sbFuse;
  sbFuse = function () {
    var r = _fu.apply(null, arguments);
    /* 声音不断的真凶：sbFuse 每个物理步都会跑一次，原来是无条件「滋」一声，
       于是只要沙盒在跑，引信声就永远停不下来。改成：只有真的有引信在烧才响 */
    var i, b, on = 0;
    for (i = 0; i < SB.bodies.length; i++) {
      b = SB.bodies[i];
      if (b && b.boom && !b.boom.done && b.fuse >= 0) { on = 1; break; }
    }
    if (on) sfx('fuse', { v: 0.5, gap: 420, run: 3, win: 3000 });
    return r;
  };

  /* 设置里的「自动保存」开关 */
  var _sv = sbSaveStore;
  sbSaveStore = function () { if (!SYS.autosave) return 0; return _sv.apply(null, arguments); };
})();

/* ---------------- 启动 ---------------- */
(function sysBoot() {
  SYS.load();
  sysBuildShell();
  sysTopbar();
  var bS = document.getElementById('sysSet'), bA = document.getElementById('sysAcc'),
    bB = document.getElementById('sysBug');
  if (bS) bS.onclick = function () { sysOpen(SYS.tab); };
  if (bA) bA.onclick = function () { sysOpen('acc'); };
  if (bB) bB.onclick = function () { sysOpen('about'); SYS.tab = 'about'; sysBugForm(); };
  /* 所有按钮的点击音（含面板、工具栏、抽屉） */
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t.tagName !== 'BUTTON' && t.tagName !== 'LABEL' && t !== document.body) t = t.parentNode;
    if (t && (t.tagName === 'BUTTON' || t.tagName === 'LABEL')) sfx('tick', { v: 0.85, gap: 24 });
    SND.resume();
  }, true);
  document.addEventListener('touchstart', function () { SND.resume(); }, { passive: true });
  /* 滑块与开关的手感音（抽屉里的由 sysAct 自己处理，这里跳过，免得响两遍） */
  function inDrw(e) {
    var t = e;
    while (t) { if (t.className && String(t.className).indexOf('drw') >= 0) return 1; t = t.parentNode; }
    return 0;
  }
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t || t.type !== 'range' || inDrw(t)) return;
    sfx('slide', { v: 0.8, gap: 55 });
  }, true);
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || t.type !== 'checkbox' || inDrw(t)) return;
    sfx('toggle', { v: 0.8, gap: 40 });
  }, true);
  /* 第一次进来给个中性引导（不提任何账号信息） */
  try {
    if (!localStorage.getItem('fz_tip_acc')) {
      localStorage.setItem('fz_tip_acc', '1');
      setTimeout(function () {
        if (!ACC.cur()) sbToast('右上角 ⚙ 里可以调声音、特效和反馈');
      }, 2800);
    }
  } catch (e) { }
})();
