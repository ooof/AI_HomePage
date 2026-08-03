/* 临汾政府采购专题站 · 总览页渲染 */
(function () {
  "use strict";
  const O = window.LF_OVERVIEW;
  if (!O) { document.body.innerHTML = '<div class="loading">数据文件未载入，请确认 data/ 目录与本页同级。</div>'; return; }
  LF.renderNav("overview");

  function topN(arr, n) { return arr.slice(0, n); }
  function mergeSmall(arr, n) {
    if (arr.length <= n) return arr.map((d) => ({ label: d[0], value: d[1] }));
    const head = arr.slice(0, n).map((d) => ({ label: d[0], value: d[1] }));
    const rest = arr.slice(n).reduce((s, d) => s + d[1], 0);
    head.push({ label: "其他", value: rest });
    return head;
  }

  /* ---- 英雄区 + KPI ---- */
  const intent = O.intent || {}, cp = O.contract_pub || {};
  document.getElementById("hero-tag").textContent =
    "明细 " + LF.fmtInt(O.detail_total) + " 条（" + O.detail_range[0] + " ~ " + O.detail_range[1] +
    "）· 采购意向 " + LF.fmtInt(intent.docs || 0) + " 份 · 合同公示 " + LF.fmtInt(cp.docs || 0) +
    " 份 · 历史聚合 " + LF.fmtInt(O.hist_total) + " 条";

  const kpis = [
    { label: "去重项目数", val: LF.fmtInt(O.proj_total), cls: "", note: "按项目名归一（公告/更正/废标/合同）" },
    { label: "预算合计", val: LF.fmtMoney(O.proj_budget), cls: "red", note: "有预算项目 " + LF.fmtInt(O.proj_with_budget) + " 个" },
    { label: "合同合计", val: LF.fmtMoney(O.proj_contract), cls: "green", note: "有合同项目 " + LF.fmtInt(O.proj_with_contract) + " 个" },
    { label: "平均节支率", val: LF.fmtPct(O.save_rate), cls: "", note: "可比对样本 " + LF.fmtInt(O.save_n) + " 个" }
  ];
  document.getElementById("kpis").innerHTML = kpis.map((k) =>
    `<div class="kpi"><div class="label">${k.label}</div>` +
    `<div class="val ${k.cls}">${k.val}</div><div class="note">${k.note}</div></div>`).join("");

  /* ---- 年度堆叠柱（预算/合同 亿元） ---- */
  const years = Object.keys(O.years).sort();
  LF.stackedBar(document.getElementById("ch-year"),
    years.map((y) => ({
      label: y,
      v1: +(O.years[y].budget / 1e8).toFixed(2),
      v2: +(O.years[y].contract / 1e8).toFixed(2)
    })),
    { l1: "预算", l2: "合同", c1: LF.PALETTE[0], c2: LF.PALETTE[1],
      fmtY: (v) => v + "亿", fmtTip: (v) => v + " 亿元" });

  /* ---- 月度折线 ---- */
  const months = Object.keys(O.monthly).sort();
  LF.lineChart(document.getElementById("ch-month"),
    months.map((m) => ({ label: m, value: O.monthly[m] })),
    { fmtY: (v) => Math.round(v), fmtTip: (v) => v + " 条" });

  /* ---- 采购方式饼 ---- */
  LF.pieChart(document.getElementById("ch-method"),
    mergeSmall(O.methods, 8), { donut: true, center: "方式", centerSub: O.methods.reduce((s, d) => s + d[1], 0) + " 条" });

  /* ---- 品目饼 ---- */
  const cats = (O.cat_main || []).filter((c) => c[0]);
  LF.pieChart(document.getElementById("ch-cat"),
    cats.map((c) => ({ label: c[0], value: c[1] })),
    { donut: true, center: "品目", centerSub: cats.reduce((s, c) => s + c[1], 0) + " 条" });

  /* ---- 区县合同金额 Top15 ---- */
  const distTop = O.districts.slice().sort((a, b) => b.contract - a.contract).slice(0, 15)
    .map((d) => ({ label: d.name, value: +(d.contract / 1e8).toFixed(2) }));
  LF.hBarChart(document.getElementById("ch-dist"), distTop, { fmtVal: (v) => v + " 亿", fmtTip: (v) => v + " 亿元" });

  /* ---- 金额分档 ---- */
  LF.barChart(document.getElementById("ch-bucket"),
    O.budget_buckets.map((b) => ({ label: b[0], value: b[1] })),
    { fmtVal: (v) => v, fmtY: (v) => Math.round(v), fmtTip: (v) => v + " 条" });

  /* ---- 最新公告 ---- */
  const recs = LF.allRecords().sort((a, b) => b.ts - a.ts).slice(0, 15);
  document.getElementById("latest").innerHTML = recs.map((r) =>
    `<a class="list-item" href="detail.html?aid=${encodeURIComponent(r.aid)}">
       <div class="t">${LF.esc(r.title_disp || r.title)}</div>
       <div class="m">
         <span class="chip">${LF.esc(r.dist)}</span>
         <span class="chip meth">${LF.esc(r.method || "—")}</span>
         <span class="chip cat">${LF.esc(r.cat || "—")}</span>
         <span>${LF.fmtDate(r.ts)}</span>
         <span>${LF.esc(r.buyer || "")}</span>
         ${r.budget ? `<span class="amount">预算 ${LF.fmtMoneyShort(r.budget)}</span>` : ""}
       </div>
     </a>`).join("");

  /* ---- 大额项目 ---- */
  function bigList(id, arr) {
    document.getElementById(id).innerHTML = arr.map((p) =>
      `<a class="list-item" href="detail.html?aid=${encodeURIComponent(p.aid)}">
         <div class="t">${LF.esc(p.name)}</div>
         <div class="m">
           <span class="chip">${LF.esc(p.dist)}</span>
           <span>${LF.esc(p.buyer)}</span>
           ${p.budget ? `<span class="amount">预算 ${LF.fmtMoney(p.budget)}</span>` : ""}
           ${p.contract ? `<span class="amount">合同 ${LF.fmtMoney(p.contract)}</span>` : ""}
         </div>
       </a>`).join("");
  }
  bigList("top-budget", topN(O.top_budget, 12));
  bigList("top-contract", topN(O.top_contract, 12));

  /* ---- 参与方排行 ---- */
  function rankTable(id, arr, valFn, valFmt) {
    document.getElementById(id).innerHTML = arr.map((d, i) => {
      const v = valFn(d);
      return `<tr>
        <td><span class="rank ${i < 3 ? "top" : ""}">${i + 1}</span></td>
        <td><b>${LF.esc(d.name)}</b></td>
        <td class="num" style="color:var(--red);font-weight:700">${valFmt(v)}</td>
      </tr>`;
    }).join("");
  }
  rankTable("rank-buyer", O.top_buyers_amt.slice(0, 10), (d) => d.budget, (v) => LF.fmtMoneyShort(v));
  rankTable("rank-agent", O.top_agents.slice(0, 10), (d) => d.n, (v) => v + " 项");
  rankTable("rank-sup", O.top_sups_amt.slice(0, 10), (d) => d.amount, (v) => LF.fmtMoneyShort(v));

  /* ---- 采购意向公开 ---- */
  if (intent.docs) {
    const idist = (intent.districts || []).slice().sort((a, b) => b.amt - a.amt).slice(0, 15)
      .map((d) => ({ label: d.name, value: +(d.amt / 1e8).toFixed(2) }));
    if (idist.length) LF.hBarChart(document.getElementById("ch-intent-dist"), idist,
      { fmtVal: (v) => v + " 亿", fmtTip: (v) => v + " 亿元" });
    const imonths = Object.keys(intent.months || {}).sort();
    if (imonths.length) LF.lineChart(document.getElementById("ch-intent-month"),
      imonths.map((m) => ({ label: m.slice(2), value: intent.months[m] })),
      { fmtY: (v) => Math.round(v), fmtTip: (v) => v + " 项" });
    bigList("top-intent", topN(intent.top || [], 12).map((p) => ({
      aid: p.aid, name: p.name, dist: p.dist, buyer: p.buyer,
      budget: p.budget, contract: 0
    })));
  }

  /* ---- 合同公示 ---- */
  if (cp.docs) {
    const cyears = Object.keys(cp.years || {}).sort();
    if (cyears.length) LF.barChart(document.getElementById("ch-contract-year"),
      cyears.map((y) => ({ label: y, value: +((cp.years[y].amt || 0) / 1e8).toFixed(2) })),
      { fmtVal: (v) => v, fmtY: (v) => Math.round(v), fmtTip: (v) => v + " 亿元" });
    rankTable("rank-contract-sup", (cp.top_sups || []).slice(0, 12),
      (d) => d.amt, (v) => LF.fmtMoneyShort(v));
    document.getElementById("top-contract-pub").innerHTML = (cp.top || []).slice(0, 12).map((p) =>
      `<a class="list-item" href="detail.html?aid=${encodeURIComponent(p.aid)}">
         <div class="t">${LF.esc(p.name)}</div>
         <div class="m">
           <span class="chip">${LF.esc(p.dist || "—")}</span>
           <span>${LF.esc(p.buyer || "")}</span>
           ${p.sup ? `<span>${LF.esc(p.sup)}</span>` : ""}
           <span class="amount">合同 ${LF.fmtMoney(p.amt)}</span>
           ${p.date ? `<span>${LF.esc(p.date)}</span>` : ""}
         </div>
       </a>`).join("");
  }

  /* ---- 详情缓存覆盖率 ---- */
  document.getElementById("cov-tbody").innerHTML = (O.coverage || []).map((c) =>
    `<tr><td>${LF.esc(c.type)}</td>
      <td class="num">${LF.fmtInt(c.total)}</td>
      <td class="num">${LF.fmtInt(c.cached)}</td>
      <td class="num ${c.rate >= 0.5 ? "amount" : ""}">${LF.fmtPct(c.rate)}</td></tr>`).join("");


  /* ---- 页脚 ---- */
  document.getElementById("foot").innerHTML =
    "数据来源：中国政府采购网（ccgp.gov.cn）及其山西分网（ccgp-shanxi.gov.cn）公开公告。" +
    "明细库采集自山西分网接口（districtCode=141000，覆盖临汾全域 17 区县）。" +
    "项目级金额按「同名归一 + 取最大」去重，避免公告/更正/废标/合同重复计入。" +
    "本页为公开数据聚合分析，仅供参考，不作为任何采购依据。生成于 " + O.generated + "。";
})();
