/* ===========================================================================
 * 临汾政府采购专题站 · 每日新增日志
 * 数据：window.LF_DAILY（按日分组的项目数组）+ window.LF_DAILY_SUM（每日汇总）
 * 纯原生 JS，兼容 file://。
 * ======================================================================== */
(function (global) {
  "use strict";
  const LF = global.LF;
  const DAILY = global.LF_DAILY || {};
  const SUM = (global.LF_DAILY_SUM || []).slice();

  LF.renderNav("daily");

  const ov = global.LF_OVERVIEW || {};
  const idxList = document.getElementById("daily-index-list");
  const main = document.getElementById("daily-main");
  const statEl = document.getElementById("daily-stat");
  const searchEl = document.getElementById("daily-search");
  const heroTag = document.getElementById("hero-tag");

  // 顶部 tag：范围与总量
  (function () {
    const dr = ov.daily_range || [];
    const days = ov.daily_days || SUM.length;
    const cnt = ov.daily_count || SUM.reduce((s, x) => s + x.n, 0);
    heroTag.textContent = `覆盖 ${days} 天 · 项目 ${cnt.toLocaleString("zh-CN")} 个`
      + (dr[0] && dr[1] ? ` · ${dr[1]} → ${dr[0]}` : "");
  })();

  let activeDate = null;

  function fmtTime(ts) {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    const p = (n) => (n < 10 ? "0" + n : "" + n);
    return p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function stageChips(stages) {
    if (!stages || !stages.length) return "";
    return `<span class="di-stages">`
      + stages.map((s) => `<span class="di-chip">${LF.esc(s)}</span>`).join("")
      + `</span>`;
  }

  function itemHTML(it, showDate) {
    const href = "detail.html?aid=" + encodeURIComponent(it.aid || "");
    const budget = it.budget ? "预算 " + LF.fmtMoney(it.budget) : "";
    const contract = it.contract ? "合同 " + LF.fmtMoney(it.contract) : "";
    const dateBadge = showDate ? `<span class="di-date">${LF.esc(it._date || "")}</span>` : "";
    return `<a class="daily-item" href="${href}">
      <div class="di-top">
        ${dateBadge}
        <span class="di-name">${LF.esc(it.name)}</span>
        <span class="di-time">${fmtTime(it.ts)}</span>
      </div>
      <div class="di-meta">
        <span class="di-dist">${LF.esc(it.dist || "")}</span>
        ${it.buyer ? `<span class="di-buyer">采购人：${LF.esc(it.buyer)}</span>` : ""}
        ${it.sup ? `<span class="di-sup">中标：${LF.esc(it.sup)}</span>` : ""}
      </div>
      <div class="di-foot">
        ${budget ? `<span class="di-budget">${budget}</span>` : ""}
        ${contract ? `<span class="di-contract">${contract}</span>` : ""}
        ${stageChips(it.stages)}
      </div>
    </a>`;
  }

  // ---------- 日索引 ----------
  function renderIndex() {
    if (!SUM.length) {
      idxList.innerHTML = `<div class="di-empty">暂无可归档的每日数据。</div>`;
      return;
    }
    let html = "";
    for (const s of SUM) {
      const active = s.date === activeDate ? " active" : "";
      html += `<button class="di-day${active}" data-date="${LF.esc(s.date)}" type="button">
        <span class="di-day-d">${LF.esc(s.date)}</span>
        <span class="di-day-meta">
          <span class="di-day-n">${s.n} 项</span>
          <span class="di-day-b">${s.budget ? LF.fmtMoneyShort(s.budget) : "-"}</span>
        </span>
      </button>`;
    }
    idxList.innerHTML = html;
    idxList.querySelectorAll(".di-day").forEach((b) => {
      b.addEventListener("click", () => selectDay(b.getAttribute("data-date")));
    });
  }

  function setActiveIndex() {
    idxList.querySelectorAll(".di-day").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-date") === activeDate);
    });
    const cur = idxList.querySelector(".di-day.active");
    if (cur) cur.scrollIntoView({ block: "nearest" });
  }

  // ---------- 当日列表 ----------
  function selectDay(date) {
    activeDate = date;
    const items = DAILY[date] || [];
    const s = SUM.find((x) => x.date === date);
    let head = `<div class="daily-head">
      <div class="dh-date">${LF.esc(date)}</div>
      <div class="dh-stat">${items.length} 个项目`
      + (s && s.budget ? ` · 预算 ${LF.fmtMoney(s.budget)}` : "")
      + (s && s.contract ? ` · 合同 ${LF.fmtMoney(s.contract)}` : "")
      + `</div>
    </div>`;
    if (!items.length) {
      main.innerHTML = head + `<div class="di-empty">当日无项目记录。</div>`;
    } else {
      main.innerHTML = head + `<div class="daily-items">`
        + items.map((it) => itemHTML(it, false)).join("") + `</div>`;
    }
    setActiveIndex();
    statEl.textContent = "";
    if (searchEl) searchEl.value = "";
  }

  // ---------- 跨日搜索 ----------
  function doSearch(q) {
    q = (q || "").trim().toLowerCase();
    if (!q) { selectDay(activeDate || (SUM[0] && SUM[0].date)); return; }
    const hit = [];
    for (const date in DAILY) {
      for (const it of DAILY[date]) {
        const hay = ((it.name || "") + " " + (it.buyer || "") + " " + (it.sup || "") + " " + (it.dist || "")).toLowerCase();
        if (hay.indexOf(q) >= 0) { it._date = date; hit.push(it); }
      }
    }
    hit.sort((a, b) => b.ts - a.ts);
    statEl.textContent = `命中 ${hit.length} 条`;
    if (!hit.length) {
      main.innerHTML = `<div class="di-empty">未找到匹配「${LF.esc(q)}」的项目。</div>`;
      return;
    }
    main.innerHTML = `<div class="daily-head">
        <div class="dh-date">搜索：${LF.esc(q)}</div>
        <div class="dh-stat">${hit.length} 条结果（按时间倒序）</div>
      </div><div class="daily-items">`
      + hit.map((it) => itemHTML(it, true)).join("") + `</div>`;
    idxList.querySelectorAll(".di-day").forEach((b) => b.classList.remove("active"));
  }

  if (searchEl) {
    let t = null;
    searchEl.addEventListener("input", () => {
      clearTimeout(t);
      const v = searchEl.value;
      t = setTimeout(() => doSearch(v), 160);
    });
  }

  // ---------- 初始化：默认展开最新一天 ----------
  if (SUM.length) {
    renderIndex();
    selectDay(SUM[0].date);
  } else {
    main.innerHTML = `<div class="di-empty">暂无每日新增数据。</div>`;
  }

  const foot = document.getElementById("foot");
  if (foot) {
    foot.innerHTML = `数据来源：中国政府采购网·山西分网公开公告（按项目首次发布日归档）。本页为公开数据聚合展示，仅供参考。`
      + (ov.generated ? ` 生成于 ${LF.esc(ov.generated)}。` : "");
  }

})(window);
