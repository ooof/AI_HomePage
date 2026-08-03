/* 临汾政府采购专题站 · 详情页 */
(function () {
  "use strict";
  const O = window.LF_OVERVIEW;
  LF.renderNav("search");
  const root = document.getElementById("detail-root");

  function getAid() {
    const m = location.search.match(/[?&]aid=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }
  const aid = getAid();
  setupResize();  // 三个对照来源（均在右侧 iframe 内显示）：
  const AID_ENC = encodeURIComponent(aid);
  // 政府网站「人类可读」原文页（/site/detail）。
  // 说明：详情数据与政府 /portal/detail 接口均不含 parentId；该参数仅用于 /site/detail
  // 前端的栏目面包屑定位，文章正文由 articleId 调 /portal/detail 客户端加载。
  // parentId=138010 取自用户在临汾公告上核实可用的真实示例，作为固定栏目父级。
  const GOV_DETAIL = "https://www.ccgp-shanxi.gov.cn/site/detail?parentId=138010&articleId=" + AID_ENC;
  // 本专题站整理的原文页（source.html）
  const SOURCE_URL = "source.html?aid=" + AID_ENC;
  // 政府网站原始数据接口（JSON）
  const RAW_URL = "https://www.ccgp-shanxi.gov.cn/portal/detail?articleId=" + AID_ENC;
  if (!aid) { root.innerHTML = '<div class="notice">未指定公告 ID。<a href="search.html">返回检索</a></div>'; return; }

  // 详情元数据直接来自分片（det-*.js 已内嵌 title/ts/预算/合同/采购人等），
  // 无需加载全部 rec-*.js（约 17MB），详情页打开更快。
  const shard = LF.detShard(aid);
  LF.loadScript("data/det-" + shard + ".js").then(() => {
    const det = (window.LF_DET || {})[aid] || null;
    const rec = det ? {
      title: det.title,
      ts: (det.ts || 0) / 1000,
      budget: det.rec_budget,
      contract: det.rec_contract,
      dist: det.dist, method: det.method, cat: det.cat, type: det.type,
      buyer: det.r_buyer || det.buyer,
      title_disp: det.title_disp
    } : null;
    render(rec, det);
  }).catch(() => { render(null, null); });

  function kv(k, v) {
    if (v == null || v === "" || v === 0) return "";
    return `<div class="kv"><span class="k">${k}</span><span class="v">${LF.esc(v)}</span></div>`;
  }

  function render(r, d) {
    const title = (d && (d.title_disp || d.title)) || (r && (r.title_disp || r.title)) || "（未知标题）";
    const dist = (d && d.dist) || (r && r.dist) || "—";
    const method = (d && d.method) || (r && r.method) || "—";
    const cat = (d && d.cat) || (r && r.cat) || "—";
    const type = (d && d.type) || (r && r.type) || "—";
    const buyer = (d && d.buyer) || (r && r.buyer) || "—";
    const ts = (d && d.publishDate) || (r && r.ts * 1000) || 0;

    let html = `<button class="back" onclick="LF.goBack('search.html')">← 返回</button>
      <div class="detail-head"><h1>${LF.esc(title)}</h1>
        <div style="margin-top:6px;">
          <span class="chip">${LF.esc(dist)}</span>
          <span class="chip meth">${LF.esc(method)}</span>
          <span class="chip cat">${LF.esc(cat)}</span>
          <span class="chip">${LF.esc(type)}</span>
          ${ts ? `<span style="color:var(--mute)">${LF.fmtDateTime(Math.floor(ts / 1000))}</span>` : ""}
          <a class="src-link src-trigger" data-src="source" href="${SOURCE_URL}" target="_blank" rel="noopener" title="本专题站整理的原文页（点击：当前页右侧并排对照）">查看信息来源（原文）↗</a>
          <a class="src-gov src-trigger" data-src="gov" href="${GOV_DETAIL}" target="_blank" rel="noopener" title="政府网站人类可读原文（点击：当前页右侧并排对照）">政府网站原文↗</a>
          <a class="src-raw src-trigger" data-src="raw" href="${RAW_URL}" target="_blank" rel="noopener" title="政府网站原始数据接口 JSON（点击：当前页右侧并排对照）">政府原始数据</a>
        </div>
      </div>`;

    if (!d) {
      html += `<div class="notice" style="margin:16px 0;">该公告暂无结构化详情缓存（仅记录基础信息）。以下为从列表库提取的概要。</div>`;
    }

    // 核心信息
    html += `<div class="card" style="margin-top:14px;">
      <h3><span class="bar"></span>项目概要</h3>
      <div class="kv-grid">`;

    const rows = [];
    rows.push(kv("项目编号", d && d.proj_no));
    // 采购人 -> 甲方透视（全部项目 + 全过程）
    if (buyer && buyer !== "—") {
      rows.push(`<div class="kv"><span class="k">采购人</span><span class="v"><a class="ent-link" href="buyer.html?name=${encodeURIComponent(buyer)}">${LF.esc(buyer)}</a></span></div>`);
    } else {
      rows.push(kv("采购人", buyer));
    }
    rows.push(kv("采购人地址", d && d.buyer_addr));
    rows.push(kv("采购人电话", d && d.buyer_tel));
    rows.push(kv("代理机构", d && d.agent));
    rows.push(kv("代理地址", d && d.agent_addr));
    rows.push(kv("联系人", (d && d.contact) || (d && d.author)));
    rows.push(kv("联系电话", d && (d.contact_tel || d.agent_tel)));
    rows.push(kv("开标时间", d && d.open_time));
    rows.push(kv("开标地点", d && d.open_place));
    rows.push(kv("获取文件截止", d && d.deadline));
    rows.push(kv("合同履行期", d && d.duration));
    rows.push(kv("预算金额", d && d.budget ? LF.fmtMoney(d.budget) : (r && r.budget ? LF.fmtMoney(r.budget) : "")));
    rows.push(kv("合同金额", d && (d.contract_amount || d.contract) ? LF.fmtMoney(d.contract_amount || d.contract) : (r && r.contract ? LF.fmtMoney(r.contract) : "")));
    rows.push(kv("品目分类", d && d.categoryNames));
    rows.push(kv("中小企业预留", d && d.sme));
    rows.push(kv("是否联合体", d && d.consortium));
    rows.push(kv("代理服务费", d && d.agent_fee ? LF.fmtMoney(d.agent_fee) : ""));
    rows.push(kv("采购文件费", d && d.doc_price));
    rows.push(kv("公示期限", d && d.notice_days));
    html += rows.filter(Boolean).join("") + `</div></div>`;

    // 采购意向公开
    const intentRows = (d && d.intent_rows) || [];
    if (intentRows.length) {
      const itotal = d.intent_total || intentRows.reduce((s, x) => s + (x.budget || 0), 0);
      html += `<div class="card" style="margin-top:18px;">
        <h3><span class="bar"></span>采购意向 <span class="sub">预计月份 ${LF.esc(d.intent_month || "—")} · 合计 ${LF.fmtMoney(itotal)}</span></h3>
        <table class="lf"><thead><tr><th>序号</th><th>采购项目</th><th>需求概况</th><th class="num">预算</th><th>预计月份</th><th>中小企业</th></tr></thead><tbody>`;
      html += intentRows.map((x) => `<tr><td>${LF.esc(x.no)}</td>
        <td>${LF.esc(x.name)}</td>
        <td>${LF.esc(x.demand || "—")}</td>
        <td class="num amount">${x.budget ? LF.fmtMoney(x.budget) : "—"}</td>
        <td>${LF.esc(x.month || "—")}</td>
        <td>${LF.esc(x.sme || "—")}</td></tr>`).join("");
      html += `</tbody></table></div>`;
    }

    // 合同公示信息
    const conAmt = d && (d.contract_amount || d.contract);
    if (d && (d.contract_no || d.contract_name || d.supplier || conAmt)) {
      const crows = [];
      crows.push(kv("合同编号", d.contract_no));
      crows.push(kv("合同名称", d.contract_name));
      // 乙方 -> 乙方透视（其执行项目全过程）
      if (d.supplier) {
        crows.push(`<div class="kv"><span class="k">乙方（供应商）</span><span class="v"><a class="ent-link" href="supplier.html?name=${encodeURIComponent(d.supplier)}">${LF.esc(d.supplier)}</a></span></div>`);
      } else {
        crows.push(kv("乙方（供应商）", d.supplier));
      }
      crows.push(kv("供应商地址", d.supplier_addr));
      crows.push(kv("供应商电话", d.supplier_tel));
      crows.push(kv("合同金额", conAmt ? LF.fmtMoney(conAmt) : ""));
      crows.push(kv("签订日期", d.sign_date));
      crows.push(kv("履约期限", d.perform));
      crows.push(kv("主要标的", d.spec));
      html += `<div class="card" style="margin-top:18px;">
        <h3><span class="bar"></span>合同公示信息</h3>
        <div class="kv-grid">` + crows.filter(Boolean).join("") + `</div></div>`;
    }

    // 更正 / 变更对照
    const correctRows = (d && d.correct_rows) || [];
    const hasCorrect = correctRows.length || (d && (d.orig_project || d.first_notice || d.correct_item || d.correct_reason));
    if (hasCorrect) {
      html += `<div class="card" style="margin-top:18px;">
        <h3><span class="bar"></span>更正 / 变更对照</h3>`;
      if (d.orig_project || d.first_notice || d.correct_item) {
        const k2 = [];
        k2.push(kv("原项目名称", d.orig_project));
        k2.push(kv("首次公告日期", d.first_notice));
        k2.push(kv("变更事项", d.correct_item));
        html += `<div class="kv-grid">` + k2.filter(Boolean).join("") + `</div>`;
      }
      if (correctRows.length) {
        html += `<table class="lf"><thead><tr><th>序号</th><th>变更项</th><th>变更前</th><th>变更后</th></tr></thead><tbody>`;
        html += correctRows.map((x) => `<tr><td>${LF.esc(x.no)}</td>
          <td>${LF.esc(x.item || "—")}</td>
          <td>${LF.esc(x.before || "—")}</td>
          <td>${LF.esc(x.after || "—")}</td></tr>`).join("");
        html += `</tbody></table>`;
      }
      if (d.correct_reason) {
        html += `<div style="white-space:pre-wrap;color:var(--ink);margin-top:8px;">${LF.esc(d.correct_reason)}</div>`;
      }
      html += `</div>`;
    }


    // 中标/成交
    const winners = (d && d.winners) || [];
    const winAmounts = (d && d.win_amounts) || [];
    const awardRows = (d && d.award_rows) || [];
    if (winners.length || awardRows.length) {
      html += `<div class="card" style="margin-top:18px;">
        <h3><span class="bar"></span>中标 / 成交信息</h3>`;
      if (awardRows.length) {
        html += `<table class="lf"><thead><tr><th>序号</th><th>供应商</th><th class="num">中标金额</th><th class="num">得分</th></tr></thead><tbody>`;
        html += awardRows.map((a) => `<tr><td>${LF.esc(a.no)}</td>
          <td>${LF.esc(a.supplier)}</td>
          <td class="num amount">${a.amount != null ? LF.fmtMoney(a.amount) : "—"}</td>
          <td class="num">${a.score != null ? a.score : "—"}</td></tr>`).join("");
        html += `</tbody></table>`;
      } else if (winners.length) {
        html += `<ul class="winners">` + winners.map((w, i) =>
          `<li>${LF.esc(w)}${winAmounts[i] != null ? ` — <span class="amount">${LF.fmtMoney(winAmounts[i])}</span>` : ""}</li>`
        ).join("") + `</ul>`;
      }
      html += `</div>`;
    }

    // 评审专家
    const experts = (d && d.experts) || [];
    if (experts.length) {
      html += `<div class="card" style="margin-top:18px;">
        <h3><span class="bar"></span>评审专家（${experts.length}）</h3>
        <div class="row" style="gap:8px;">` +
        experts.map((e) => `<span class="chip" style="background:#eef3fa;color:var(--blue-d);">${LF.esc(e)}</span>`).join("") +
        `</div></div>`;
    }

    // 废标/终止理由
    const fail = d && d.fail_reason;
    if (fail && fail.length > 4) {
      html += `<div class="card" style="margin-top:18px;">
        <h3><span class="bar"></span>废标 / 终止理由</h3>
        <div style="white-space:pre-wrap;color:var(--ink);">${LF.esc(fail)}</div></div>`;
    }

    // 主要标的信息
    const lots = d && d.lots;
    if (lots && lots.length > 4) {
      html += `<div class="card" style="margin-top:18px;">
        <h3><span class="bar"></span>主要标的信息</h3>
        ${LF.fmtKV(lots)}</div>`;
    }

    // 采购需求 / 资格要求
    if (d && d.demand) {
      html += `<div class="card" style="margin-top:18px;">
        <h3><span class="bar"></span>采购需求</h3>
        <div style="white-space:pre-wrap;">${LF.esc(d.demand)}</div></div>`;
    }
    if (d && d.qualify) {
      html += `<div class="card" style="margin-top:18px;">
        <h3><span class="bar"></span>资格要求</h3>
        <div style="white-space:pre-wrap;">${LF.esc(d.qualify)}</div></div>`;
    }

    // 公告正文
    const text = d && d.text;
    if (text && text.length > 10) {
      html += `<div class="card" style="margin-top:18px;">
        <h3><span class="bar"></span>公告正文</h3>
        <div class="body-text">${LF.cleanBody(text)}</div></div>`;
    }

    // 附件
    const att = d && d.attachments;
    if (att && att.length) {
      // 政府刻意隐藏附件（isShowAttachment=false）时仍补出，并显式标注，避免与官方页面不一致造成误解
      const hiddenNote = (d.gov_attach_shown === false)
        ? `<div class="att-note">⚠ 原政府网页未展示以下附件（其接口标记 isShowAttachment=false），此处予以补出，供核验。</div>`
        : "";
      html += `<div class="card" style="margin-top:18px;">
        <h3><span class="bar"></span>附件（${att.length}）</h3>${hiddenNote}<ul class="winners">`;
      att.forEach((a) => {
        let name = "", url = "";
        if (typeof a === "string") name = a;
        else { name = a.name || a.fileName || "附件"; url = a.url || a.path || ""; }
        // 源站部分附件 fileId 含字面量 undefined，属坏链，不挂死链
        const bad = !url || url.indexOf("undefined") >= 0;
        html += bad
          ? `<li>${LF.esc(name)} <span style="color:var(--mute);font-size:12px;">（源站未提供有效下载链接）</span></li>`
          : `<li><a href="${LF.esc(url)}" target="_blank" rel="noopener">${LF.esc(name)}</a></li>`;
      });
      html += `</ul></div>`;
    }

    html += `<div class="foot">数据来源：中国政府采购网·山西分网公开公告（articleId=${LF.esc(aid)}）。本页为公开数据聚合展示，仅供参考。</div>`;
    root.innerHTML = html;
    setupPanel();
    window.scrollTo(0, 0);
  }

  // 右侧对照面板：三个来源（政府网站原文 / 信息来源原文 / 政府原始数据）均在此 iframe 并排显示。
  // 政府站 /site/detail 未设 X-Frame-Options / CSP frame-ancestors，可嵌入；iframe 内 SPA
  // 调同域 /portal/detail 取数不受影响。中键 / Ctrl+点击仍按原链接新标签打开。
  function setupPanel() {
    const panel = document.getElementById("gov-panel");
    const frame = document.getElementById("gp-frame");
    const closeBtn = document.getElementById("gp-close");
    const openNew = document.getElementById("gp-open-new");
    const tabs = Array.prototype.slice.call(document.querySelectorAll(".gp-tab"));
    const triggers = Array.prototype.slice.call(document.querySelectorAll(".src-trigger"));
    if (!panel || !frame) return;
    const SRC = { gov: GOV_DETAIL, source: SOURCE_URL, raw: RAW_URL };
    let active = "gov";
    const loaded = {};
    function setView(src, force) {
      active = src;
      tabs.forEach(function (t) { t.classList.toggle("active", t.dataset.src === src); });
      triggers.forEach(function (t) { t.classList.toggle("active", t.dataset.src === src); });
      if (openNew) openNew.href = SRC[src];
      if (force || loaded[src] === undefined) { frame.src = SRC[src]; loaded[src] = true; }
    }
    function open(src) {
      setView(src, true);
      document.body.classList.add("compare-on");
      panel.setAttribute("aria-hidden", "false");
    }
    function close() {
      document.body.classList.remove("compare-on");
      panel.setAttribute("aria-hidden", "true");
    }
    triggers.forEach(function (t) {
      t.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.button === 1) return; // 保留新标签打开
        e.preventDefault();
        if (document.body.classList.contains("compare-on") && t.dataset.src === active) close();
        else open(t.dataset.src);
      });
    });
    tabs.forEach(function (t) {
      t.addEventListener("click", function () { setView(t.dataset.src); });
    });
    if (closeBtn) closeBtn.addEventListener("click", close);
  }

  // 右侧面板宽度可拖拽调节：拖动左侧分隔条改变 --gp-w（同时驱动左侧内容 margin-right）。
  // 宽度范围 [320px, 视口-280px]，并写入 localStorage 记忆用户偏好；窄屏全屏不启用拖拽。
  function setupResize() {
    const grip = document.getElementById("gp-resize");
    if (!grip) return;
    const MINW = 320, LEFT_MIN = 280;
    let dragging = false;
    function clampW(w) {
      const maxW = window.innerWidth - LEFT_MIN;
      if (w < MINW) w = MINW;
      if (w > maxW) w = maxW;
      return w;
    }
    function apply(w) {
      document.documentElement.style.setProperty("--gp-w", w + "px");
      try { localStorage.setItem("lf_gp_w", String(w)); } catch (_) {}
    }
    function onMove(e) {
      if (!dragging) return;
      apply(clampW(window.innerWidth - e.clientX));
    }
    function onUp() {
      dragging = false;
      document.body.classList.remove("resizing");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    grip.addEventListener("mousedown", function (e) {
      if (window.innerWidth < 820) return; // 窄屏全屏覆盖，禁用拖拽
      e.preventDefault();
      dragging = true;
      document.body.classList.add("resizing");
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
    // 恢复上次记忆的宽度（仅当仍处于合理区间）
    try {
      const saved = parseInt(localStorage.getItem("lf_gp_w") || "", 10);
      if (saved >= MINW && saved <= window.innerWidth - LEFT_MIN) {
        document.documentElement.style.setProperty("--gp-w", saved + "px");
      }
    } catch (_) {}
  }
})();
