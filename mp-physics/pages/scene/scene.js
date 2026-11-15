/*
 * 通用实验台页面
 * 9 个模块共用这一个页面：canvas 交给引擎画，面板数据从引擎里读出来渲染。
 */
const env = require('../../utils/env.js');

let engine = null;
let booted = false;

function fmtNum(v, step) {
  if (v === undefined || v === null || !isFinite(v)) return '--';
  const s = Math.abs(step || 0.1);
  let d = 0;
  if (s < 1) d = 1;
  if (s < 0.1) d = 2;
  if (s < 0.01) d = 3;
  const t = Number(v).toFixed(d);
  return String(parseFloat(t));
}

Page({
  data: {
    sid: '',
    title: '',
    brief: '',
    cvW: 340,
    cvH: 300,
    hasCharts: false,
    chH: 140,
    isSandbox: false,
    stage: '',
    timeTxt: 't = 0.00 s',
    playing: false,
    speedIdx: 3,
    speeds: ['0.1x', '0.25x', '0.5x', '1x', '2x'],
    speedVals: [0.1, 0.25, 0.5, 1, 2],
    showVec: true,
    showTrail: true,
    params: [],
    toggles: [],
    rows: [],
    examples: [],
    sbRun: false,
    sbEnvTxt: '进空间',
    sbSpark: false,
    sbDbl: '',
    err: ''
  },

  onLoad(query) {
    const id = (query && query.id) || 'kinema';
    this.sid = id;
    let name = '实验台';
    try {
      const list = (engine || require('../../utils/engine.js')).MODULES || [];
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === id) name = list[i].name;
      }
    } catch (e) { }
    this.setData({ sid: id, title: name });
    wx.setNavigationBarTitle({ title: name });
  },

  onReady() {
    const sys = wx.getSystemInfoSync();
    const W = Math.max(280, (sys.windowWidth || 375) - 24);
    const H = Math.round(Math.min(Math.max(W * 0.78, 260), 430));
    this.setData({ cvW: W, cvH: H, chH: 140 });
    /* 等 canvas 真正按新尺寸布局完成再取节点 */
    setTimeout(() => { this.bindAndStart(); }, 60);
  },

  onShow() {
    if (!booted) return;
    this.startLoop();
    this.startSync();
  },

  onHide() {
    this.stopLoop();
    this.stopSync();
  },

  onUnload() {
    this.stopLoop();
    this.stopSync();
    try { engine.sbSaveStore(); } catch (e) { }
  },

  /* ---------------- 初始化 ---------------- */
  bindAndStart() {
    if (booted) return;
    const that = this;
    let hasCharts = false;
    try {
      engine = engine || require('../../utils/engine.js');
      const s = engine.Scenes[this.sid];
      hasCharts = !!(s && s.charts && s.charts.vel);
    } catch (e) {
      this.setData({ err: e.message || '引擎加载失败' });
      return;
    }
    this.setData({ hasCharts: hasCharts });

    const q = wx.createSelectorQuery().in(this);
    q.select('#scene').fields({ node: true, size: true });
    if (hasCharts) {
      q.select('#chV').fields({ node: true, size: true });
      q.select('#chE').fields({ node: true, size: true });
    }
    q.exec(function (res) {
      if (!res || !res[0] || !res[0].node) {
        that.setData({ err: '画布初始化失败，请退出重进' });
        return;
      }
      env.bindCanvas('scene', res[0].node, res[0].width, res[0].height);
      if (hasCharts && res[1] && res[1].node) {
        env.bindCanvas('chV', res[1].node, res[1].width, res[1].height);
      }
      if (hasCharts && res[2] && res[2].node) {
        env.bindCanvas('chE', res[2].node, res[2].width, res[2].height);
      }
      try {
        engine.UI.home = false;
        engine.enterScene(that.sid);
      } catch (e) {
        that.setData({ err: '进入模块失败：' + e.message });
        return;
      }
      booted = true;
      that.afterSceneChange();
      that.startLoop();
      that.startSync();
    });
  },

  afterSceneChange() {
    try {
      const A = engine.App;
      const isSandbox = (A.mode === 'sandbox');
      const sc = A.scene;
      const data = {
        isSandbox: isSandbox,
        brief: sc ? (sc.brief || '') : '',
        playing: !!A.playing,
        params: [],
        toggles: [],
        examples: []
      };
      if (!isSandbox && sc) {
        data.params = (sc.params || []).map(function (p) {
          return {
            key: p.key,
            label: p.label + (p.unit ? ' (' + p.unit + ')' : ''),
            min: p.min,
            max: p.max,
            step: p.step > 0 ? p.step : 0.1,
            value: A.P[p.key],
            valueText: fmtNum(A.P[p.key], p.step)
          };
        });
        data.toggles = (sc.toggles || []).map(function (t) {
          return { key: t.key, label: t.label, on: !!A.P[t.key] };
        });
        data.examples = (sc.examples || []).map(function (ex, i) {
          return {
            i: i,
            title: ex.title,
            level: ex.level,
            hot: ex.level === '高考',
            q: ex.q,
            answer: ex.answer,
            open: false
          };
        });
      }
      if (isSandbox) data.sbRun = !!engine.SB.run;
      this.setData(data);
      this.syncUI(true);
    } catch (e) { }
  },

  /* ---------------- 渲染循环 ---------------- */
  startLoop() {
    if (this.looping) return;
    this.looping = true;
    try {
      env.startLoop();
      engine.loop();
    } catch (e) { this.looping = false; }
  },

  stopLoop() {
    this.looping = false;
    env.stopLoop();
  },

  startSync() {
    if (this.syncTimer) return;
    const that = this;
    this.syncTimer = setInterval(function () { that.syncUI(false); }, 200);
  },

  stopSync() {
    if (this.syncTimer) { clearInterval(this.syncTimer); this.syncTimer = null; }
  },

  /* 把引擎里的当前状态搬到界面上 */
  syncUI(full) {
    try {
      const A = engine.App;
      if (!A) return;
      const isSandbox = A.mode === 'sandbox';
      if (isSandbox) {
        this.setData({
          stage: '自由沙盒 · ' + (engine.SB.run ? '运行中' : '已暂停'),
          timeTxt: '物体 ' + engine.SB.bodies.length + ' 个',
          sbRun: !!engine.SB.run,
          sbEnvTxt: engine.SB.env === 'space' ? '回地面' : '进空间',
          sbSpark: !!engine.SB.sparkMode
        });
        return;
      }
      const sc = A.scene;
      if (!sc || !A.state) return;
      let rows = [];
      try {
        rows = (sc.info(A.state, A.P) || []).map(function (r) { return { k: r[0], v: r[1] }; });
      } catch (e) { }
      this.setData({
        stage: sc.stage ? sc.stage(A.state, A.P) : '',
        timeTxt: 't = ' + (A.state.t).toFixed(2) + ' s',
        playing: !!A.playing,
        rows: rows
      });
      if (full) { /* 参数与例题在切换模块时已经填过，这里不重复 setData */ }
    } catch (e) { }
  },

  /* ---------------- 控件 ---------------- */
  onPlay() {
    const A = engine.App;
    if (A.mode === 'sandbox') {
      engine.SB.run = !engine.SB.run;
      this.setData({ sbRun: !!engine.SB.run, playing: !!engine.SB.run });
      return;
    }
    if (A.playing) {
      A.playing = false;
    } else {
      if (A.scene.finished(A.state, A.P)) engine.resetSim();
      A.playing = true;
    }
    this.setData({ playing: !!A.playing });
  },

  onStep() {
    try {
      const A = engine.App;
      if (A.mode === 'sandbox') { engine.sbStep(1 / 60); engine.sbRender(); return; }
      engine.stepOnce();
      engine.render();
      this.syncUI(false);
    } catch (e) { }
  },

  onReset() {
    try {
      const A = engine.App;
      if (A.mode === 'sandbox') { engine.sbClear(); engine.sbPreset('斜面'); engine.sbRender(); return; }
      A.playing = false;
      engine.resetSim();
      engine.render();
      this.setData({ playing: false });
      this.syncUI(false);
    } catch (e) { }
  },

  onEnd() {
    try {
      const A = engine.App;
      if (A.mode === 'sandbox') return;
      A.playing = false;
      engine.runToEnd();
      engine.render();
      this.setData({ playing: false });
      this.syncUI(false);
    } catch (e) { }
  },

  onSpeed(e) {
    const i = Number(e.detail.value) || 0;
    engine.App.speed = this.data.speedVals[i];
    this.setData({ speedIdx: i });
  },

  onVec() {
    const v = !engine.App.showVec;
    engine.App.showVec = v;
    this.setData({ showVec: v });
  },

  onTrail() {
    const v = !engine.App.showTrail;
    engine.App.showTrail = v;
    this.setData({ showTrail: v });
  },

  /* 参数：拖动时只改引擎里的值，松手才刷新读数，避免滑块被 setData 拽回去 */
  onParamLive(e) {
    const i = Number(e.currentTarget.dataset.i);
    const item = this.data.params[i];
    if (!item) return;
    const v = Number(e.detail.value);
    engine.App.P[item.key] = v;
    const path = 'params[' + i + '].valueText';
    const obj = {};
    obj[path] = fmtNum(v, item.step);
    this.setData(obj);
  },

  onParamSet(e) {
    const i = Number(e.currentTarget.dataset.i);
    const item = this.data.params[i];
    if (!item) return;
    const v = Number(e.detail.value);
    const A = engine.App;
    A.P[item.key] = v;
    const wasPlaying = A.playing;
    A.playing = false;
    try {
      engine.resetSim();
      engine.render();
    } catch (err) { }
    A.playing = wasPlaying;
    const obj = {};
    obj['params[' + i + '].value'] = v;
    obj['params[' + i + '].valueText'] = fmtNum(v, item.step);
    obj.playing = wasPlaying;
    this.setData(obj);
    this.syncUI(false);
  },

  onToggle(e) {
    const key = e.currentTarget.dataset.key;
    const A = engine.App;
    A.P[key] = A.P[key] ? 0 : 1;
    const list = this.data.toggles.map(function (t) {
      return { key: t.key, label: t.label, on: !!A.P[t.key] };
    });
    this.setData({ toggles: list });
    const wasPlaying = A.playing;
    A.playing = false;
    try { engine.resetSim(); engine.render(); } catch (err) { }
    A.playing = wasPlaying;
    this.syncUI(false);
  },

  onLoadExample(e) {
    const i = Number(e.currentTarget.dataset.i);
    const ex = this.data.examples[i];
    const sc = engine.App.scene;
    if (!ex || !sc || !sc.examples || !sc.examples[i]) return;
    const P = engine.App.P;
    const src = sc.examples[i].params || {};
    Object.keys(src).forEach(function (k) { P[k] = src[k]; });
    const params = this.data.params.map(function (p) {
      return {
        key: p.key, label: p.label, min: p.min, max: p.max, step: p.step,
        value: P[p.key], valueText: fmtNum(P[p.key], p.step)
      };
    });
    const obj = { params: params };
    obj['examples[' + i + '].open'] = true;
    this.setData(obj);
    engine.App.playing = false;
    try { engine.resetSim(); engine.render(); } catch (err) { }
    this.syncUI(false);
    wx.showToast({ title: '已载入这组参数', icon: 'none' });
  },

  onToggleAnswer(e) {
    const i = Number(e.currentTarget.dataset.i);
    const obj = {};
    obj['examples[' + i + '].open'] = !this.data.examples[i].open;
    this.setData(obj);
  },

  /* ---------------- 沙盒工具 ---------------- */
  onAdd(e) {
    const k = e.currentTarget.dataset.k;
    try {
      engine.sbAddAt(k);
      engine.SB.run = true;
      engine.sbRender();
      this.setData({ sbRun: true });
    } catch (err) {
      wx.showToast({ title: '添加失败', icon: 'none' });
    }
  },

  onDetonate() {
    try { engine.sbDetonateAll(); engine.sbRender(); } catch (e) { }
  },

  onSpark() {
    try {
      engine.sbSparkToggle();
      this.setData({ sbSpark: !!engine.SB.sparkMode });
    } catch (e) { }
  },

  onEnv() {
    try {
      engine.sbSetEnv(engine.SB.env === 'space' ? 'ground' : 'space');
      engine.sbRender();
      this.setData({ sbEnvTxt: engine.SB.env === 'space' ? '回地面' : '进空间' });
    } catch (e) { }
  },

  onPour(e) {
    try {
      engine.sbPour(e.currentTarget.dataset.k);
      engine.sbRender();
    } catch (err) { }
  },

  onLink(e) {
    try { engine.sbLinkStart(e.currentTarget.dataset.k); } catch (err) { }
    wx.showToast({ title: '点两个物体上的挂点', icon: 'none' });
  },

  onDel() {
    try { engine.sbDel(engine.SB.sel); engine.sbRender(); } catch (e) { }
  },

  onUndo() {
    try { engine.sbUndo(); engine.sbRender(); } catch (e) { }
  },

  onFit() {
    try { engine.SB.needFit = true; engine.sbRender(); } catch (e) { }
  },

  onClear() {
    const that = this;
    wx.showModal({
      title: '清空沙盒',
      content: '会把场景里的物体全部删掉，确定吗？',
      success(res) {
        if (!res.confirm) return;
        try {
          engine.sbClear();
          engine.sbPreset('斜面');
          engine.sbRender();
          that.syncUI(false);
        } catch (e) { }
      }
    });
  },

  onDblCycle() {
    try {
      engine.sbDblCycle();
      this.setData({ sbDbl: engine.sbDblDef().n });
    } catch (e) { }
  },

  /* ---------------- 触摸：转给引擎 ---------------- */
  toEngineTouches(e) {
    const list = (e.touches || []).map(function (t) {
      return { clientX: t.x, clientY: t.y, pageX: t.x, pageY: t.y };
    });
    const changed = (e.changedTouches || []).map(function (t) {
      return { clientX: t.x, clientY: t.y, pageX: t.x, pageY: t.y };
    });
    return {
      touches: list,
      changedTouches: changed,
      target: null,
      currentTarget: null,
      preventDefault: function () { },
      stopPropagation: function () { }
    };
  },

  onTS(e) { this.fire('touchstart', e); },
  onTM(e) { this.fire('touchmove', e); },
  onTE(e) { this.fire('touchend', e); },

  fire(type, e) {
    try {
      const node = env.node('scene');
      node.dispatch(type, this.toEngineTouches(e));
    } catch (err) { }
  }
});
