/* ===========================================================================
 * 临汾政府采购专题站 · 公共库
 * 负责：数据载入、列式解码、金额/日期格式化、md5（详情分片定位）、SVG 图表
 * 纯原生 JS，无任何外部依赖，兼容 file:// 直接双击打开。
 * ======================================================================== */
(function (global) {
  "use strict";

  const LF = global.LF = {};

  // 详情分片（det-*.js）由 build_data.py 单独生成并异步加载。
  // 若某分片头部漏写 window.LF_DET=window.LF_DET||{}; 初始化，
  // Object.assign(window.LF_DET, …) 会对 undefined 抛错、导致该分片整片为空、
  // 所有走该分片的详情页误报“暂无结构化详情缓存”。这里提前兜底初始化。
  global.LF_DET = global.LF_DET || {};

  /* ---------- 颜色（政务公开风：靛蓝 + 中国红 + 中性灰） ---------- */
  LF.PALETTE = [
    "#1f5fa8", "#c0392b", "#2e8b8b", "#e0883b", "#5b6abf",
    "#7aa86a", "#9b59b6", "#3a8fb7", "#d96b6b", "#4c9a6f",
    "#caa23a", "#6c7a89", "#b06aa5", "#3d8b6e", "#a8743b"
  ];
  LF.INK = "#1f2d3d";
  LF.MUTE = "#6b7785";

  /* ---------- 工具 ---------- */
  LF.fmtDate = function (ts) {
    if (!ts) return "-";
    const d = new Date(ts * 1000);
    const p = (n) => (n < 10 ? "0" + n : "" + n);
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  };
  LF.fmtDateTime = function (ts) {
    if (!ts) return "-";
    const d = new Date(ts * 1000);
    const p = (n) => (n < 10 ? "0" + n : "" + n);
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      " " + p(d.getHours()) + ":" + p(d.getMinutes());
  };
  // 金额（单位：元）→ 自适应 亿元/万元/元
  LF.fmtMoney = function (v) {
    if (v == null || isNaN(v)) return "-";
    const n = Math.abs(v);
    if (n >= 1e8) return (v / 1e8).toFixed(2) + " 亿元";
    if (n >= 1e4) return (v / 1e4).toFixed(2) + " 万元";
    return Math.round(v) + " 元";
  };
  // 紧凑金额（用于坐标轴）：亿元/万元
  LF.fmtMoneyShort = function (v) {
    if (v == null || isNaN(v)) return "-";
    const n = Math.abs(v);
    if (n >= 1e8) return (v / 1e8).toFixed(1) + "亿";
    if (n >= 1e4) return (v / 1e4).toFixed(0) + "万";
    return Math.round(v) + "";
  };
  LF.fmtInt = function (v) {
    if (v == null || isNaN(v)) return "-";
    return Math.round(v).toLocaleString("zh-CN");
  };
  LF.fmtPct = function (v, d) {
    if (v == null || isNaN(v)) return "-";
    return (v * 100).toFixed(d == null ? 1 : d) + "%";
  };
  LF.esc = function (s) {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  };

  /* ---------- 列式记录解码 ---------- */
  // rec 行 = [title, ts, distIdx, typeIdx, methIdx, catIdx, buyer,
  //           budget, supplier, contract, aid, hasDetail, author, projectName]
  LF.decodeRow = function (cols) {
    const O = global.LF_OVERVIEW || {};
    const D = O.dicts || { types: [], methods: [], cats: [], dists: [] };
    return {
      title: cols[0],
      ts: cols[1],
      dist: D.dists[cols[2]] || "",
      type: D.types[cols[3]] || "",
      method: D.methods[cols[4]] || "",
      cat: D.cats[cols[5]] || "",
      buyer: cols[6],
      budget: cols[7],
      supplier: cols[8],
      contract: cols[9],
      aid: cols[10],
      hasDetail: cols[11],
      author: cols[12],
      projectName: cols[13],
      title_disp: cols[14] || ""
    };
  };

  // 取全部年份记录（已按各年降序），展平为解码对象数组
  LF.allRecords = function () {
    const REC = global.LF_REC || {};
    const out = [];
    Object.keys(REC).sort().forEach((y) => {
      (REC[y] || []).forEach((cols) => out.push(LF.decodeRow(cols)));
    });
    return out;
  };

  // 按年份分组的原始行（保留数组形态，供筛选）
  LF.recordsByYear = function () {
    return global.LF_REC || {};
  };

  /* ---------- 动态载入脚本（详情页按需载入分片） ---------- */
  LF.loadScript = function (src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve(src);
      s.onerror = () => reject(new Error("load fail: " + src));
      document.head.appendChild(s);
    });
  };

  /* ---------- md5（用于详情分片定位，取首字符 hex） ---------- */
  // 紧凑可靠实现（基于 RFC 1321 标准）
  function md5cycle(x, k) {
    let [a, b, c, d] = x;
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]); x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
  }
  function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
  function add32(a, b) {
    return (a + b) & 0xffffffff;
  }
  function md5blk(s) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  function md5blk_array(a) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
    }
    return md5blks;
  }
  function md51(s) {
    // 关键：先转 UTF-8 字节数组，保证与 Python hashlib.md5(s.encode('utf-8')) 完全一致。
    // 旧实现用 charCodeAt（UTF-16），中文名哈希与 Python 不符，导致分片定位错误。
    const bytes = [];
    for (let ci = 0; ci < s.length; ci++) {
      let c = s.charCodeAt(ci);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else if (c < 0xd800 || c >= 0xe000) {
        bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      } else { // 代理对 -> 4 字节 UTF-8
        ci++;
        const c2 = 0x10000 + (((c & 0x3ff) << 10) | (s.charCodeAt(ci) & 0x3ff));
        bytes.push(0xf0 | (c2 >> 18), 0x80 | ((c2 >> 12) & 0x3f),
                   0x80 | ((c2 >> 6) & 0x3f), 0x80 | (c2 & 0x3f));
      }
    }
    const n = bytes.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) {
      md5cycle(state, md5blk_array(bytes.slice(i - 64, i)));
    }
    const rem = bytes.slice(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < rem.length; i += 1) tail[i >> 2] |= rem[i] << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i += 1) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }
  function rhex(n) {
    const hexChr = "0123456789abcdef".split("");
    let s = "", j;
    for (j = 0; j < 4; j += 1) {
      s += hexChr[(n >> (j * 8 + 4)) & 0x0f] + hexChr[(n >> (j * 8)) & 0x0f];
    }
    return s;
  }
  function hex(x) {
    return rhex(x[0]) + rhex(x[1]) + rhex(x[2]) + rhex(x[3]);
  }
  LF.md5 = function (s) {
    return hex(md51(s));
  };
  // 详情分片文件名（2 位 hex，须与 build_data.py 的 md5(aid)[:2] 严格一致）
  LF.detShard = function (aid) {
    return LF.md5(aid).slice(0, 2);
  };

  /* 返回上一页：优先使用 history.back() 以保留来源页状态（滚动/筛选/视图），
     仅在无历史记录（如新标签页直接打开）时回退到兜底页 fallback。 */
  LF.goBack = function (fallback) {
    try {
      if (typeof history !== "undefined" && history.length > 1) {
        history.back();
        return;
      }
    } catch (e) {}
    location.href = fallback || "index.html";
  };

  /* ===================================================================
   * SVG 图表（轻量、无依赖）
   * =================================================================== */
  function el(tag, attrs, children) {
    const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (children) children.forEach((c) => e.appendChild(c));
    return e;
  }
  function txt(x, y, s, opts) {
    const o = Object.assign({ fill: LF.INK, "font-size": 12, "text-anchor": "middle" }, opts || {});
    const t = el("text", { x: x, y: y, fill: o.fill, "font-size": o["font-size"], "text-anchor": o["text-anchor"] });
    t.textContent = s;
    return t;
  }

  // 柱状图（横向标签在底部，支持数值标签）
  LF.barChart = function (mount, data, opts) {
    opts = opts || {};
    // y 轴刻度标签估算宽度，自适应 padL，避免左侧数字被裁切（如「2,659,551万」）
    const fs = 10;
    const charW = function (c) {
      const code = c.codePointAt(0);
      if (code > 255) return fs;
      if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return fs * 0.56;
      return fs * 0.62;
    };
    const max = Math.max.apply(null, data.map((d) => d.value).concat([1]));
    let maxLW = 22;
    for (let i = 0; i <= 4; i++) {
      const lab = opts.fmtY ? String(opts.fmtY(max * i / 4)) : String(Math.round(max * i / 4));
      let w = 0; for (let k = 0; k < lab.length; k++) w += charW(lab[k]);
      if (w > maxLW) maxLW = w;
    }
    const padL = Math.min(170, Math.max(48, Math.ceil(maxLW) + 12));
    const padR = 16, padT = 16, padB = 56;
    const H = opts.h || 320;
    const n = data.length;
    // x 轴标签像素宽度（用于自适应图表宽度，保证长标签不被裁切）
    const fsX = 10;
    const charWX = function (c) {
      const code = c.codePointAt(0);
      if (code > 255) return fsX;
      if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return fsX * 0.56;
      return fsX * 0.62;
    };
    let maxXW = 0;
    for (let xi = 0; xi < n; xi++) {
      const lab = opts.fmtX ? opts.fmtX(data[xi].label) : String(data[xi].label || "");
      let w = 0; for (let k = 0; k < lab.length; k++) w += charWX(lab[k]);
      if (w > maxXW) maxXW = w;
    }
    const minBW = Math.max(34, Math.ceil(maxXW) + 10);
    const W = Math.max(opts.w || 720, padL + n * minBW + padR);
    const iw = W - padL - padR, ih = H - padT - padB;
    const bw = iw / n;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: String(W), preserveAspectRatio: "xMidYMid meet", class: "lf-chart", style: "max-width:100%;height:auto" });
    // 网格线 + y 轴刻度
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = max * i / ticks;
      const y = padT + ih - (ih * i / ticks);
      svg.appendChild(el("line", { x1: padL, y1: y, x2: W - padR, y2: y, stroke: "#eef1f4", "stroke-width": 1 }));
      svg.appendChild(txt(padL - 8, y + 4, opts.fmtY ? opts.fmtY(v) : Math.round(v),
        { "text-anchor": "end", fill: LF.MUTE, "font-size": 10 }));
    }
    data.forEach((d, i) => {
      const bh = ih * (d.value / max);
      const x = padL + i * bw + bw * 0.18;
      const w = bw * 0.64;
      const y = padT + ih - bh;
      const color = d.color || LF.PALETTE[i % LF.PALETTE.length];
      const rect = el("rect", { x: x, y: y, width: w, height: bh, rx: 3, fill: color, opacity: 0.92 });
      rect.appendChild(el("title", {})).textContent = d.label + "：" + (opts.fmtTip ? opts.fmtTip(d.value) : d.value);
      svg.appendChild(rect);
      if (opts.showVal !== false && bh > 10)
        svg.appendChild(txt(x + w / 2, y - 5, opts.fmtVal ? opts.fmtVal(d.value) : d.value,
          { "font-size": 10, fill: LF.INK }));
      // x 标签（完整显示，不截断）
      const lab = opts.fmtX ? opts.fmtX(d.label) : String(d.label || "");
      svg.appendChild(txt(x + w / 2, H - padB + 16, lab,
        { "text-anchor": "middle", fill: LF.MUTE, "font-size": 10 }));
    });
    mount.innerHTML = "";
    mount.appendChild(svg);
  };

  // 纵向柱（标签在左侧）— 用于区县排行
  LF.hBarChart = function (mount, data, opts) {
    opts = opts || {};
    const rowH = opts.rowH || 26;
    const fs = 11;
    // 按字符估算标签宽度，CJK 全角、数字/拉丁半角，避免长单位名称被裁切
    const charW = function (c) {
      const code = c.codePointAt(0);
      if (code > 255) return fs;
      if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return fs * 0.56;
      return fs * 0.62;
    };
    let maxLW = 56;
    data.forEach(function (d) {
      let w = 0; const s = String(d.label || "");
      for (let i = 0; i < s.length; i++) w += charW(s[i]);
      if (w > maxLW) maxLW = w;
    });
    const padL = Math.min(360, Math.max(96, Math.ceil(maxLW) + 14)); // 标签区自适应，最长 360px
    const padR = 60, padT = 8;
    const iw = opts.iw || 420;
    const W = opts.w || (padL + iw + padR);
    const H = padT + data.length * rowH + 8;
    const max = Math.max.apply(null, data.map((d) => d.value).concat([1]));
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: String(W), preserveAspectRatio: "xMidYMid meet", class: "lf-chart", style: "max-width:100%;height:auto" });
    data.forEach((d, i) => {
      const y = padT + i * rowH + 3;
      const bh = rowH - 8;
      const w = Math.max(2, iw * (d.value / max));
      const color = d.color || LF.PALETTE[i % LF.PALETTE.length];
      svg.appendChild(txt(padL - 8, y + bh / 2 + 4, d.label, { "text-anchor": "end", fill: LF.INK, "font-size": 11 }));
      const rect = el("rect", { x: padL, y: y, width: w, height: bh, rx: 3, fill: color, opacity: 0.9 });
      rect.appendChild(el("title", {})).textContent = d.label + "：" + (opts.fmtTip ? opts.fmtTip(d.value) : d.value);
      svg.appendChild(rect);
      svg.appendChild(txt(padL + w + 6, y + bh / 2 + 4,
        opts.fmtVal ? opts.fmtVal(d.value) : d.value,
        { "text-anchor": "start", fill: LF.MUTE, "font-size": 11 }));
    });
    mount.innerHTML = "";
    mount.appendChild(svg);
  };

  // 饼图 / 环形图
  LF.pieChart = function (mount, data, opts) {
    opts = opts || {};
    const W = opts.w || 360, H = opts.h || 320;
    const cx = W / 2, cy = H / 2 + 6, R = Math.min(W, H) / 2 - 12;
    const r = opts.donut ? R * 0.58 : 0;
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: String(W), preserveAspectRatio: "xMidYMid meet", class: "lf-chart", style: "max-width:100%;height:auto" });
    let ang = -Math.PI / 2;
    data.forEach((d, i) => {
      const a2 = ang + (d.value / total) * Math.PI * 2;
      const color = d.color || LF.PALETTE[i % LF.PALETTE.length];
      const path = el("path", {
        d: arcPath(cx, cy, R, r, ang, a2),
        fill: color, opacity: 0.92
      });
      path.appendChild(el("title", {})).textContent = d.label + "：" + d.value + "（" + (d.value / total * 100).toFixed(1) + "%）";
      svg.appendChild(path);
      ang = a2;
    });
    if (opts.donut) {
      svg.appendChild(txt(cx, cy - 4, opts.center || "", { fill: LF.INK, "font-size": 15, "font-weight": "bold" }));
      svg.appendChild(txt(cx, cy + 16, opts.centerSub || "", { fill: LF.MUTE, "font-size": 11 }));
    }
    mount.innerHTML = "";
    mount.appendChild(svg);
    // 图例
    if (opts.legend !== false) {
      const lg = document.createElement("div");
      lg.className = "lf-legend";
      data.forEach((d, i) => {
        const item = document.createElement("div");
        item.className = "lf-legend-item";
        const pct = (d.value / total * 100).toFixed(1);
        item.innerHTML = `<span class="lf-dot" style="background:${d.color || LF.PALETTE[i % LF.PALETTE.length]}"></span>` +
          `<span class="lf-legend-label">${LF.esc(d.label)}</span>` +
          `<span class="lf-legend-val">${d.value.toLocaleString("zh-CN")} · ${pct}%</span>`;
        lg.appendChild(item);
      });
      mount.appendChild(lg);
    }
  };
  function polar(cx, cy, r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function arcPath(cx, cy, R, r, a1, a2) {
    const large = (a2 - a1) > Math.PI ? 1 : 0;
    const [x1, y1] = polar(cx, cy, R, a1);
    const [x2, y2] = polar(cx, cy, R, a2);
    if (r <= 0.5) {
      return `M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z`;
    }
    const [x3, y3] = polar(cx, cy, r, a2);
    const [x4, y4] = polar(cx, cy, r, a1);
    return `M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} ` +
      `L${x3},${y3} A${r},${r} 0 ${large} 0 ${x4},${y4} Z`;
  }

  // 折线图（单序列）
  LF.lineChart = function (mount, data, opts) {
    opts = opts || {};
    const W = opts.w || 720, H = opts.h || 280;
    const padL = 52, padR = 16, padT = 14, padB = 44;
    const iw = W - padL - padR, ih = H - padT - padB;
    const vals = data.map((d) => d.value);
    const max = Math.max.apply(null, vals.concat([1]));
    const min = Math.min.apply(null, vals.concat([0]));
    const span = (max - min) || 1;
    const n = data.length;
    const xAt = (i) => padL + (n <= 1 ? iw / 2 : iw * i / (n - 1));
    const yAt = (v) => padT + ih - ih * (v - min) / span;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: String(W), preserveAspectRatio: "xMidYMid meet", class: "lf-chart", style: "max-width:100%;height:auto" });
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = min + span * i / ticks;
      const y = yAt(v);
      svg.appendChild(el("line", { x1: padL, y1: y, x2: W - padR, y2: y, stroke: "#eef1f4" }));
      svg.appendChild(txt(padL - 8, y + 4, opts.fmtY ? opts.fmtY(v) : Math.round(v), { "text-anchor": "end", fill: LF.MUTE, "font-size": 10 }));
    }
    let path = "";
    data.forEach((d, i) => {
      const x = xAt(i), y = yAt(d.value);
      path += (i === 0 ? "M" : "L") + x + "," + y + " ";
    });
    svg.appendChild(el("path", { d: path, fill: "none", stroke: LF.PALETTE[0], "stroke-width": 2.2 }));
    data.forEach((d, i) => {
      const x = xAt(i), y = yAt(d.value);
      const c = el("circle", { cx: x, cy: y, r: 3, fill: "#fff", stroke: LF.PALETTE[0], "stroke-width": 2 });
      c.appendChild(el("title", {})).textContent = d.label + "：" + (opts.fmtTip ? opts.fmtTip(d.value) : d.value);
      svg.appendChild(c);
      if (i % Math.ceil(n / 12) === 0 || i === n - 1) {
        let lab = d.label;
        if (lab.length > 6) lab = lab.slice(0, 6);
        svg.appendChild(txt(x, H - padB + 16, lab, { fill: LF.MUTE, "font-size": 9 }));
      }
    });
    mount.innerHTML = "";
    mount.appendChild(svg);
  };

  // 堆叠柱（两条序列，如 预算/合同）
  LF.stackedBar = function (mount, data, opts) {
    opts = opts || {};
    const W = opts.w || 720, H = opts.h || 300;
    const padL = 64, padR = 16, padT = 14, padB = 50;
    const iw = W - padL - padR, ih = H - padT - padB;
    const max = Math.max.apply(null, data.map((d) => (d.v1 || 0) + (d.v2 || 0)).concat([1]));
    const n = data.length;
    const bw = iw / n;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: String(W), preserveAspectRatio: "xMidYMid meet", class: "lf-chart", style: "max-width:100%;height:auto" });
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = max * i / ticks;
      const y = padT + ih - ih * i / ticks;
      svg.appendChild(el("line", { x1: padL, y1: y, x2: W - padR, y2: y, stroke: "#eef1f4" }));
      svg.appendChild(txt(padL - 8, y + 4, opts.fmtY ? opts.fmtY(v) : Math.round(v), { "text-anchor": "end", fill: LF.MUTE, "font-size": 10 }));
    }
    const col1 = opts.c1 || LF.PALETTE[0], col2 = opts.c2 || LF.PALETTE[1];
    data.forEach((d, i) => {
      const x = padL + i * bw + bw * 0.22;
      const w = bw * 0.56;
      const h1 = ih * (d.v1 / max), h2 = ih * (d.v2 / max);
      const y1 = padT + ih - h1;
      const y2 = y1 - h2;
      if (h1 > 0) {
        const r1 = el("rect", { x, y: y1, width: w, height: h1, fill: col1, opacity: 0.9 });
        r1.appendChild(el("title", {})).textContent = d.label + " 预算：" + (opts.fmtTip ? opts.fmtTip(d.v1) : d.v1);
        svg.appendChild(r1);
      }
      if (h2 > 0) {
        const r2 = el("rect", { x, y: y2, width: w, height: h2, fill: col2, opacity: 0.9 });
        r2.appendChild(el("title", {})).textContent = d.label + " 合同：" + (opts.fmtTip ? opts.fmtTip(d.v2) : d.v2);
        svg.appendChild(r2);
      }
      let lab = d.label;
      if (lab.length > 6) lab = lab.slice(0, 6);
      svg.appendChild(txt(x + w / 2, H - padB + 16, lab, { fill: LF.MUTE, "font-size": 11 }));
    });
    mount.innerHTML = "";
    mount.appendChild(svg);
    // 图例
    const lg = document.createElement("div");
    lg.className = "lf-legend lf-legend-inline";
    lg.innerHTML = `<div class="lf-legend-item"><span class="lf-dot" style="background:${col1}"></span><span class="lf-legend-label">${opts.l1 || "序列1"}</span></div>` +
      `<div class="lf-legend-item"><span class="lf-dot" style="background:${col2}"></span><span class="lf-legend-label">${opts.l2 || "序列2"}</span></div>`;
    mount.appendChild(lg);
  };

  /* ---------- 文本格式化工具 ---------- */

  // 把「主要标的」这类 "键：值 键：值" 的流水串，解析为键值列表 HTML。
  // 仅以「编号键(2.合同金额) + 已知业务键」作为顶级切分点，子字段(施工范围/项目经理…)留在父值内。
  LF.fmtKV = function (s) {
    if (!s) return "";
    const KNOWN = /(?:主要标的名称|数量|单价（?元）?|规格型号（?或服务要求）?|履约期限、?地点等简要信息|采购方式|合同金额（?元）?|项目名称|项目编号|合同编号|合同名称|供应商（?乙方）?|采购人（?甲方）?|地址|联系方式|签订日期|公告日期|其他补充事宜)/;
    const cand = /([一-龥A-Za-z0-9（）().、]{1,22})\s*[：:]/g;
    const pts = []; let m;
    while ((m = cand.exec(s)) !== null) {
      const key = m[1].trim();
      const strong = /^\d+[.、]/.test(key) || KNOWN.test(key);
      pts.push({ idx: m.index, end: m.index + m[0].length, key: key, strong: strong });
    }
    const strongs = pts.filter((p) => p.strong);
    if (!strongs.length) {
      // 退化：无强键，整段当作一个值
      return `<div class="kv-list"><div class="kv"><span class="k">内容</span><span class="v">${LF.esc(s)}</span></div></div>`;
    }
    const out = [];
    for (let i = 0; i < strongs.length; i++) {
      const cur = strongs[i];
      const start = cur.end;
      const end = i + 1 < strongs.length ? strongs[i + 1].idx : s.length;
      const val = s.slice(start, end).trim();
      if (!val) continue;
      out.push(`<div class="kv"><span class="k">${LF.esc(cur.key)}</span><span class="v">${LF.esc(val)}</span></div>`);
    }
    return out.length ? `<div class="kv-list">${out.join("")}</div>` : `<div class="kv-list">${LF.esc(s)}</div>`;
  };

  // 清洗公告正文：去多余空行、给小标题加粗、顺手摘掉文末「附件信息：xxx」冗余
  LF.cleanBody = function (text) {
    if (!text) return "";
    let t = String(text);
    // 去掉文末「附件信息：文件名」段落（附件区已单独呈现）
    t = t.replace(/附件信息[:：]?\s*[\s\S]*$/g, "");
    const lines = t.split("\n").map((x) => x.replace(/[ \t]+/g, " ").trim());
    const body = [];
    let blank = 0;
    const head = /^[一二三四五六七八九十百零\d]+[、.．]\s*.+/;
    for (const ln of lines) {
      if (!ln) { blank++; if (blank <= 1) body.push(""); continue; }
      blank = 0;
      body.push(ln);
    }
    while (body.length && body[body.length - 1] === "") body.pop();
    while (body.length && body[0] === "") body.shift();
    return body.map((ln) => {
      const e = LF.esc(ln);
      return head.test(ln) ? `<p class="body-h">${e}</p>` : `<p>${e}</p>`;
    }).join("");
  };

  /* ---------- 导航条（各页共用） ---------- */
  LF.renderNav = function (active) {
    const nav = document.querySelector("[data-lf-nav]");
    if (!nav) return;
    const items = [
      ["index.html", "总览", "overview"],
      ["daily.html", "每日新增", "daily"],
      ["search.html", "项目检索", "search"],
      ["buyer.html", "甲方透视", "buyer"],
      ["supplier.html", "乙方透视", "supplier"],
      ["about.html", "数据说明", "about"]
    ];
    nav.innerHTML = `<div class="lf-nav-inner">
      <a class="lf-brand" href="index.html">临汾政府采购专题</a>
      <nav class="lf-links">
        ${items.map((it) => `<a href="${it[0]}" class="${active === it[2] ? "active" : ""}">${it[1]}</a>`).join("")}
      </nav>
      <div class="lf-nav-sub">数据截至 2026-08 · 来源 中国政府采购网·山西分网</div>
    </div>`;
  };

})(window);
