/* 临汾政府采购专题站 · 甲方/乙方 关系透视（共用 drill-down 逻辑） */
(function () {
  "use strict";
  const LF = window.LF;

  function fmtDate(sec) {
    if (!sec) return "";
    const d = new Date(sec * 1000);
    const p = (n) => (n < 10 ? "0" + n : "" + n);
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  // 公告类型 -> 颜色（与图表调性一致）
  function typeColor(t) {
    if (!t) return "#9aa7b4";
    if (t.indexOf("合同") >= 0) return "#1f7a4d";
    if (t.indexOf("中标") >= 0 || t.indexOf("成交") >= 0 || t.indexOf("结果") >= 0) return "#2e9e6b";
    if (t.indexOf("废标") >= 0 || t.indexOf("终止") >= 0) return "#d9534f";
    if (t.indexOf("更正") >= 0 || t.indexOf("变更") >= 0) return "#e6a23c";
    if (t.indexOf("意向") >= 0) return "#8e7cc3";
    if (t.indexOf("预留") >= 0) return "#b07cc3";
    if (t.indexOf("需求") >= 0) return "#5b8def";
    return "#4a90d9"; // 各类招标/采购公告
  }

  // 同名公告类型的进一步识别：根据标题内容派生子标签，便于区分多个「合同公示」等。
  // 仅当标题含更具体的动作词时才覆盖类型标签；否则保留原类型（如「合同公示」），
  // 真正的区分由公告标题（已在卡片中展示）完成。
  function subTag(type, title) {
    const t = (title || "");
    if (t.indexOf("验收") >= 0) return "验收";
    if (t.indexOf("变更") >= 0) return "变更";
    if (t.indexOf("中止") >= 0 || t.indexOf("终止") >= 0) return "终止";
    if (t.indexOf("补充") >= 0) return "补充";
    if (t.indexOf("签订") >= 0) return "签订";
    if (t.indexOf("解除") >= 0) return "解除";
    return "";
  }

  // 项目「主」公告：点项目标题时跳转的详情（优先 合同/中标）
  const PRIMARY_ORDER = [
    "合同公示", "采购合同公告", "合同变更公告",
    "中标（成交）结果公告", "采购结果变更公告",
    "废标公告", "终止公告", "更正（变更）公告",
    "公开招标公告", "竞争性磋商公告", "竞争性谈判公告",
    "单一来源公示", "询价公告", "采购需求公示",
    "邀请招标资格预审公告", "面向中小企业预留项目执行情况", "采购意向公开"
  ];
  function primaryAid(stages) {
    for (const t of PRIMARY_ORDER) {
      for (const s of stages) if (s[1] === t) return s[0];
    }
    return stages.length ? stages[0][0] : "";
  }

  const PROJ_CACHE = {};
  function loadProjShard(sh) {
    if (!PROJ_CACHE[sh]) PROJ_CACHE[sh] = LF.loadScript("data/proj_index/" + sh + ".js");
    return PROJ_CACHE[sh];
  }

  // 加载某 甲方/乙方 的全部项目（含过程链）
  function loadProjects(name, kind) {
    const sh = LF.md5(name).slice(0, 2);
    const prefix = kind === "buyer" ? "buyer_map/" : "sup_map/";
    const mapVar = kind === "buyer" ? "LF_BUYER_MAP" : "LF_SUP_MAP";
    return LF.loadScript("data/" + prefix + sh + ".js").then(function () {
      const map = window[mapVar] || {};
      const pkeys = (map[sh] && map[sh][name]) || [];
      const shards = {};
      pkeys.forEach(function (pk) {
        const ps = LF.md5(pk).slice(0, 2);
        (shards[ps] = shards[ps] || []).push(pk);
      });
      const keys = Object.keys(shards);
      return Promise.all(keys.map(loadProjShard)).then(function () {
        const PROJ = window.LF_PROJ || {};
        const projects = [];
        pkeys.forEach(function (pk) {
          const ps = LF.md5(pk).slice(0, 2);
          const entry = (PROJ[ps] || {})[pk];
          if (!entry) return;
          projects.push({ pkey: pk, title: entry[0], buyer: entry[1], dist: entry[2], stages: entry[3] });
        });
        projects.sort(function (a, b) {
          const la = a.stages.length ? a.stages[a.stages.length - 1][2] : 0;
          const lb = b.stages.length ? b.stages[b.stages.length - 1][2] : 0;
          return lb - la;
        });
        return projects;
      });
    });
  }

  // 标题归一：政府多次重发同一公告时，标题常只在标点/括号/连接符上有细微差别
  // （如「(滨河东路至建设支路)」与「（滨河东路-建设支路）」），需先归一再判定「同一公告」。
  function normTitle(t) {
    return (t || "")
      .replace(/\s+/g, "")
      .replace(/[（(]/g, "(").replace(/[）)]/g, ")")
      .replace(/[—–~～]/g, "-")
      .replace(/至/g, "-")
      .toLowerCase();
  }

  // 以项目标题为基准，剔除 chip 标题的最长公共前缀，只保留差异后缀。
  // 例：项目「…4标段公告」下的 chip 标题「…2标段公告（乙方：山西浩亮…）」显示为「2标段公告（乙方：山西浩亮…）」，避免与卡片头部标题重复。
  function relTitle(base, t) {
    if (!base || !t) return t || "";
    let i = 0, n = Math.min(base.length, t.length);
    while (i < n && base.charAt(i) === t.charAt(i)) i++;
    if (i >= 2 && i < t.length) return t.slice(i);
    return t;
  }

  function stageChips(stages, projTitle) {
    if (!stages || !stages.length) return "";
    // 归并「同类型 + 同标题（归一后）」的重复公告：政府同一公告常被多次重发，
    // 标题基本一致，逐条罗列既冗余又无法分辨。归并后显示 次数 ×N 与 日期区间。
    const groups = [];
    const idx = {};
    stages.forEach(function (s) {
      const type = s[1], title = s[3] || "", date = s[2] || 0, aid = s[0];
      const key = type + "\u0001" + normTitle(title);
      if (idx[key] != null) {
        const g = groups[idx[key]];
        g.dates.push(date); g.aids.push(aid); g.count++;
      } else {
        idx[key] = groups.length;
        groups.push({ type: type, title: title, dates: [date], aids: [aid], count: 1 });
      }
    });
    // 按该组最早发布日期升序，过程链保持时间顺序
    groups.sort(function (a, b) { return (a.dates[0] || 0) - (b.dates[0] || 0); });
    return '<div class="stages">' + groups.map(function (g) {
      const c = typeColor(g.type);
      const tag = subTag(g.type, g.title);
      const label = tag || g.type;
      const dts = g.dates.slice().sort(function (a, b) { return a - b; });
      const dmin = fmtDate(dts[0]), dmax = fmtDate(dts[dts.length - 1]);
      const dateTxt = (g.count > 1 && dmin !== dmax) ? (dmin + " ~ " + dmax) : dmax;
      const cnt = g.count > 1 ? ' <span class="st-cnt">×' + g.count + '</span>' : "";
      // 链接到该组最新一条详情
      const aid = g.aids[g.aids.length - 1];
      // 小框标题：以卡片项目名为基准，只显示差异后缀，避免与头部项目名重复
      const disp = relTitle(projTitle, g.title);
      const tip = (g.title ? g.title + " ｜ " : "") + g.type +
        (g.count > 1 ? "（共 " + g.count + " 次发布）" : "") +
        (dateTxt ? " ｜ " + dateTxt : "");
      return '<a class="stage" style="--c:' + c + '" href="detail.html?aid=' +
        encodeURIComponent(aid) + '" title="' + LF.esc(tip) + '">' +
        '<span class="st-type">' + LF.esc(label) + cnt + '</span>' +
        (disp ? '<span class="st-title">' + LF.esc(disp) + '</span>' : '') +
        '<span class="st-date">' + LF.esc(dateTxt) + '</span></a>';
    }).join("") + '</div>';
  }

  function buildProjectCard(p, kind) {
    const pa = primaryAid(p.stages);
    const sub = [p.buyer, p.dist].filter(Boolean).join(" · ");
    return '<div class="proj-card">' +
      '<div class="proj-head">' +
      (pa ? '<a class="proj-title" href="detail.html?aid=' + encodeURIComponent(pa) + '">' + LF.esc(p.title) + '</a>'
          : '<span class="proj-title">' + LF.esc(p.title) + '</span>') +
      (sub ? '<span class="proj-sub">' + LF.esc(sub) + '</span>' : '') +
      '</div>' +
      stageChips(p.stages, p.title) +
      '</div>';
  }

  LF.entity = {
    fmtDate: fmtDate, typeColor: typeColor, primaryAid: primaryAid,
    loadProjects: loadProjects, buildProjectCard: buildProjectCard, stageChips: stageChips
  };
})();
