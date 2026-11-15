/* 可复用的最小 DOM 桩：按 id 返回独立节点 + 记录型 2D 上下文 */
const fs = require('fs'), vm = require('vm'), path = require('path');

function makeStub(opts) {
  opts = opts || {};
  const W = opts.w || 760, H = opts.h || 420;
  const rec = {};                       // id -> ctx 记录
  const nodes = {};

  function ctxFor(id) {
    const r = { id, ops: [], props: {} };
    rec[id] = r;
    const c = {
      __rec: r,
      save(){r.ops.push(['save']);}, restore(){r.ops.push(['restore']);},
      beginPath(){r.ops.push(['beginPath']);},
      closePath(){r.ops.push(['closePath']);},
      moveTo(x,y){r.ops.push(['moveTo',x,y]);},
      lineTo(x,y){r.ops.push(['lineTo',x,y]);},
      arc(x,y,rr,a,b){r.ops.push(['arc',x,y,rr,a,b]);},
      quadraticCurveTo(a,b,c2,d){r.ops.push(['quad',a,b,c2,d]);},
      stroke(){r.ops.push(['stroke']);}, fill(){r.ops.push(['fill']);},
      fillRect(x,y,w,h){r.ops.push(['fillRect',x,y,w,h]);},
      clearRect(x,y,w,h){r.ops.push(['clearRect',x,y,w,h]);},
      fillText(t,x,y){r.ops.push(['fillText',String(t),x,y]);},
      measureText(t){return {width:String(t).length*6};},
      setTransform(){}, setLineDash(a){r.ops.push(['dash',a&&a.length]);}, translate(x,y){r.ops.push(['tr',x,y]);}, rotate(a){r.ops.push(['rot',a]);}, scale(){},
      createLinearGradient(){r.ops.push(['lg']);return {addColorStop(){}};},
      createRadialGradient(){r.ops.push(['rg']);return {addColorStop(){}};},
      createPattern(){return {};},
      putImageData(){}, drawImage(){},
      createImageData(w,h){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};},
      getImageData(x,y,w,h){return {width:w,height:h,data:new Uint8ClampedArray(Math.max(1,w*h*4))};},
      clip(){r.ops.push(['clip']);}, ellipse(){}, rect(){r.ops.push(['rect']);}, strokeRect(){}, arcTo(){}, bezierCurveTo(){}
    };
    return c;
  }

  function el(id, tag) {
    const n = {
      tagName: (tag || 'DIV').toUpperCase(),
      _style: {}, dataset: {}, children: [], value: '', max: '1', min: '0', step: '1',
      textContent: '', checked: false,
      width: W, height: H, clientWidth: W, clientHeight: H,
      classList: (function () {                 /* 真正记录 className，contains 才有意义 */
        const set = {};
        function load() {
          for (const k in set) delete set[k];
          String(n._cn || '').split(/\s+/).forEach(x => { if (x) set[x] = 1; });
        }
        function sync() { n._cn = Object.keys(set).join(' '); }
        const api = {
          add(c) { load(); String(c).split(/\s+/).forEach(x => { if (x) set[x] = 1; }); sync(); },
          remove(c) { load(); String(c).split(/\s+/).forEach(x => { delete set[x]; }); sync(); },
          toggle(c, on) {
            load();
            if (on === undefined) { if (set[c]) delete set[c]; else set[c] = 1; }
            else if (on) set[c] = 1; else delete set[c];
            sync();
          },
          contains(c) { load(); return !!set[c]; }
        };
        return api;
      })(),
      style: {
        setProperty(k, v){n._style[k]=v;}, getPropertyValue(k){return n._style[k]||'';},
        removeProperty(k){delete n._style[k];}
      },
      getContext(){ if(!n._ctx)n._ctx=ctxFor(id); return n._ctx; },
      getBoundingClientRect(){return {left:0,top:0,width:n.clientWidth,height:n.clientHeight,right:n.clientWidth,bottom:n.clientHeight};},
      appendChild(c){n.children.push(c);return c;},
      insertBefore(c){n.children.unshift(c);return c;},
      removeChild(c){return c;},
      querySelector(s){return document.querySelector(s);},
      querySelectorAll(s){return document.querySelectorAll(s);},
      setAttribute(k,v){n['_'+k]=v;}, getAttribute(k){return n['_'+k]||null;},
      addEventListener(){}, removeEventListener(){},
      focus(){}, blur(){}, click(){},
      toDataURL(){return 'data:,';}
    };
    Object.defineProperty(n, 'style', { value: n.style, writable: true });
    /* innerHTML='' 在真实浏览器里会清空子树 —— 桩必须一致，否则重绘会叠加 */
    let _html = '';
    Object.defineProperty(n, 'innerHTML', {
      get() { return _html; },
      set(v) { _html = String(v); if (_html === '') n.children.length = 0; }
    });
    /* 给 id 赋值时注册进索引：这样 createElement 出来的节点也能被 getElementById 找到 */
    let _id = id || '';
    if (_id) nodes[_id] = n;
    Object.defineProperty(n, 'id', {
      get() { return _id; },
      set(v) { _id = String(v); if (_id) nodes[_id] = n; }
    });
    /* className 与 classList 共用同一份数据 */
    n._cn = '';
    Object.defineProperty(n, 'className', {
      get() { return n._cn; },
      set(v) { n._cn = String(v); }
    });
    return n;
  }

  const document = {
    _nodes: nodes,
    createElement(tag){ return el('__' + tag + '_' + Math.random().toString(36).slice(2,7), tag); },
    createTextNode(t){ const n = el('__txt', '#text'); n.textContent = String(t); return n; },
    getElementById(id){ if(!nodes[id])nodes[id]=el(id,'CANVAS'); return nodes[id]; },
    querySelector(s){
      if(s[0]==='#'){ const id=s.slice(1); if(!nodes[id])nodes[id]=el(id,'CANVAS'); return nodes[id]; }
      if(s[0]==='.'){ if(!nodes[s])nodes[s]=el(s.slice(1),'DIV'); return nodes[s]; }
      if(!nodes[s])nodes[s]=el(s,'DIV'); return nodes[s];
    },
    querySelectorAll(s){ return []; },
    addEventListener(){}, removeEventListener(){},
    body: null, documentElement: null, head: null, hidden: false
  };
  document.body = el('body', 'BODY');
  document.documentElement = el('html', 'HTML');
  document.head = el('head', 'HEAD');

  const store = {};
  const sandbox = {
    console, Math, JSON, Date, Number, String, Array, Object, Boolean, RegExp, Error,
    isFinite, isNaN, parseInt, parseFloat, Uint8ClampedArray, Uint8Array, Float32Array,
    setTimeout: (f)=>{ if(typeof f==='function'){} return 0; },
    clearTimeout: ()=>0,
    /* 返回一个非零句柄：产品代码会用它判断"定时器是否已启动" */
    setInterval: (()=>{ let n = 0; return ()=>(++n); })(), clearInterval: ()=>0,
    requestAnimationFrame: ()=>0, cancelAnimationFrame: ()=>0,
    localStorage: {
      getItem:(k)=>(k in store?store[k]:null),
      setItem:(k,v)=>{store[k]=String(v);},
      removeItem:(k)=>{delete store[k];}
    },
    performance: { now: ()=>Date.now() },
    devicePixelRatio: opts.dpr || 1,
    innerWidth: W, innerHeight: H,
    location: { hash: opts.hash || '', href: 'https://x/', reload(){} },
    navigator: { userAgent: 'node', maxTouchPoints: 0 },
    alert: ()=>0, confirm: ()=>true, prompt: ()=>null,
    addEventListener(){}, removeEventListener(){}, scrollTo(){},
    URL: { createObjectURL: ()=>'blob:', revokeObjectURL(){} },
    btoa: (x)=>Buffer.from(String(x),'binary').toString('base64'),
    atob: (x)=>Buffer.from(String(x),'base64').toString('binary'),
    escape: (x)=>encodeURIComponent(String(x)),
    unescape: (x)=>String(x).replace(/%([0-9A-Fa-f]{2})/g,function(m,h){return String.fromCharCode(parseInt(h,16));}),
    Blob: function(){ return {}; },
    Image: function(){ return {addEventListener(){},set src(v){}}; },
    DeviceOrientationEvent: function(){},
    fetch: ()=>Promise.resolve({ok:false})
  };
  sandbox.window = sandbox;
  sandbox.document = document;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  return { sandbox, rec, nodes, document };
}

const DEFAULT_EXPOSE = [
  'Scenes:Scenes', 'App:App', 'MODULES:MODULES', 'SB:SB',
  'render:render', 'resetSim:resetSim', 'loadScene:loadScene', 'enterScene:enterScene', 'showHome:showHome',
  'drawChart:drawChart', 'sbStep:sbStep', 'sbRender:sbRender', 'sbPreset:sbPreset', 'sbClear:sbClear',
  'ASTRO:ASTRO', 'ScenesCosmos:Scenes.cosmos', 'SBPresets:SBPresets', 'MATS:MATS', 'C3:C3',
  'sbMake:sbMake', 'sbSetMat:sbSetMat', 'sbAllMat:sbAllMat', 'sbAddBomb:sbAddBomb', 'sbDetonateAll:sbDetonateAll',
  'sbExplode:sbExplode', 'sbBoomR:sbBoomR', 'sbBreak:sbBreak', 'sbHurt:sbHurt', 'sbSplit:sbSplit',
  'sbDetonate:sbDetonate', 'sbTiltToggle:sbTiltToggle', 'sbTiltApply:sbTiltApply',
  'sbShareCode:sbShareCode', 'sbApplyCode:sbApplyCode', 'sbSnap:sbSnap', 'sbRestore:sbRestore',
  'sbFxStep:sbFxStep', 'matDef:matDef',
  /* v8：环境 / 硬度 / 液体 / 燃烧 / 核武 / 特效强度 */
  'HARDS:HARDS','hardDef:hardDef','SOLIDS:SOLIDS','LIQS:LIQS','SBPR:SBPR',
  'sbSetHard:sbSetHard','sbSetEnv:sbSetEnv','sbSpaceBox:sbSpaceBox','sbEnvBodies:sbEnvBodies',
  'sbBlocked:sbBlocked','sbFreeSpot:sbFreeSpot',
  'sbPartAdd:sbPartAdd','sbPartPour:sbPartPour','sbPartStep:sbPartStep','sbPartBurn:sbPartBurn',
  'sbPartDraw:sbPartDraw','sbPartSnap:sbPartSnap','sbPartRestore:sbPartRestore',
  'sbClearParts:sbClearParts','sbPour:sbPour','sbFireStep:sbFireStep','sbDrawSpace:sbDrawSpace',
  'sbAddAt:sbAddAt','sbAdd:sbAdd','sbWorld:sbWorld','sbHasGround:sbHasGround','sbAutoMass:sbAutoMass',
  'sbSelToLiquid:sbSelToLiquid','sbPanel:sbPanel','sbSelPanel:sbSelPanel','sbMobBar:sbMobBar',
  'sbEnter:sbEnter','sbToast:sbToast','label:label',
  'sbPartPush:sbPartPush','sbPartRelax:sbPartRelax','sbPartPrep:sbPartPrep','sbPartGrid:sbPartGrid',
  'sbIgniteAt:sbIgniteAt','sbIgniteAll:sbIgniteAll','sbSparkToggle:sbSparkToggle',
  'sbAddNuke:sbAddNuke','sbNuke:sbNuke','sbNukeR:sbNukeR','sbFxN:sbFxN',
  /* v9：双击放置 */
  'DBLS:DBLS','sbDblDef:sbDblDef','sbDblAt:sbDblAt','sbDblCycle:sbDblCycle',
  'sbAddAt:sbAddAt','sbPour:sbPour','sbPartPour:sbPartPour',
  /* v13：声效 · 账号 · 反馈 · 设置 */
  'SND:SND','SNDV:SNDV','sfx:sfx','ACC:ACC','BUGS:BUGS','SYS:SYS','accHash:accHash',
  'sysOpen:sysOpen','sysClose:sysClose','sysAct:sysAct','sysRender:sysRender',
  'sbFlushBreak:sbFlushBreak','sbBreak:sbBreak','sbIgniteAt:sbIgniteAt','sbDetonateAll:sbDetonateAll',
  'sysTopbar:sysTopbar','sysBugForm:sysBugForm','sysBugList:sysBugList','sysBuildShell:sysBuildShell',
  'sbSaveStore:sbSaveStore','sbClearStore:sbClearStore',
  /* v14：音频总线 · 41 种音效 · 隐形管理员入口 */
  'SNDCAT:SNDCAT','SNDU:SNDU','sfxAt:sfxAt','MATSND:MATSND','accSalt:accSalt',
  'sysPlayAll:sysPlayAll','sysStopAll:sysStopAll','sysAdmForm:sysAdmForm',
  'sbDel:sbDel','sbUndo:sbUndo','sbLink:sbLink','sbDelLink:sbDelLink','sbZoomAt:sbZoomAt',
  'sbFuse:sbFuse','sbShare:sbShare',
  /* v15：重力修复 · 爆炸特效 · 登录门禁 · 账号管理 */
  'GATE:GATE','gateCan:gateCan','gateShow:gateShow','gateClose:gateClose','gateDo:gateDo',
  'sbGDef:sbGDef','sbGSet:sbGSet','sbGTxt:sbGTxt','sbGCompass:sbGCompass',
  'sbScorch:sbScorch','sbDrawDecals:sbDrawDecals','sbFxDraw:sbFxDraw','sbFxStep:sbFxStep',
  'sbBoomPlus:sbBoomPlus','sbNukePlus:sbNukePlus',
  'sbFxN2:sbFxN2','sbSlowmo:sbSlowmo','sysUserList:sysUserList','sysFmtT:sysFmtT',
  'enterScene:enterScene','buildHome:buildHome','MODULES:MODULES','ICO:ICO','SHORT:SHORT',
  'sbForceList:sbForceList','sbDrawForces:sbDrawForces','sbRender:sbRender','TILT:TILT','sbStep:sbStep',
  'sbDrawField:sbDrawField','sbReadout:sbReadout','sbDecalStep:sbDecalStep','accLv:accLv','ACCLV:ACCLV',
  'sysUserList:sysUserList','sysRoleBadge:sysRoleBadge','sysUserFill:sysUserFill',
  'FLTS:FLTS','ORDS:ORDS','DURS:DURS','sysSelNames:sysSelNames','sysUCard:sysUCard','sysChips:sysChips',
  'VIS:VIS',
  /* v19：3A 精修 */
  'V19:V19','sbSheen:sbSheen','sbDropShadow:sbDropShadow'
].join(',');

function runScript(file, opts) {
  const code = fs.readFileSync(file, 'utf8');
  const st = makeStub(opts);
  const keys = opts && opts.expose;
  const inject = 'globalThis.__T={' + (keys || 'Scenes:Scenes,App:App,MODULES:MODULES,SB:SB,'
    + 'render:render,resetSim:resetSim,loadScene:loadScene,enterScene:enterScene,showHome:showHome,'
    + 'drawChart:drawChart,sbStep:sbStep,sbRender:sbRender,sbPreset:sbPreset,sbClear:sbClear,'
    + DEFAULT_EXPOSE) + '};\n';
  const ii = code.lastIndexOf('})();');
  if (ii < 0) throw new Error('找不到 IIFE 结尾');
  vm.runInContext(code.slice(0, ii) + inject + code.slice(ii), st.sandbox, { filename: file });
  st.T = st.sandbox.__T;
  return st;
}

module.exports = { makeStub, runScript };
