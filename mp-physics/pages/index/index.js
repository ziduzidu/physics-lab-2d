/* 首页：九个实验模块入口 */
const engine = require('../../utils/engine.js');

const ICONS = {
  conveyor: '▤',
  blockBoard: '◫',
  kinema: '↗',
  statics: '⇅',
  sandbox: '✷',
  circ: '◎',
  link: '⛓',
  astro: '✦',
  cosmos: '✧'
};

Page({
  data: {
    modules: [],
    totalExamples: 0,
    err: ''
  },

  onLoad() {
    try {
      engine.UI.home = true;                 /* 停在首页时不跑物理、不渲染 */
      const mods = (engine.MODULES || []).map(function (m) {
        return {
          id: m.id,
          name: m.name,
          desc: m.desc || '',
          tags: m.tags || [],
          icon: ICONS[m.id] || '•'
        };
      });
      let nEx = 0;
      Object.keys(engine.Scenes || {}).forEach(function (k) {
        nEx += ((engine.Scenes[k].examples) || []).length;
      });
      this.setData({ modules: mods, totalExamples: nEx });
    } catch (e) {
      this.setData({ err: e.message || '引擎加载失败' });
    }
  },

  onShow() {
    try { engine.UI.home = true; } catch (e) { }
  },

  openModule(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/scene/scene?id=' + id });
  },

  openAbout() {
    wx.showModal({
      title: '物理仿真实验室',
      content: '力学、能量动量、运动图像、天体的交互仿真。\n\n所有数据保存在本机，不需要登录。',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
