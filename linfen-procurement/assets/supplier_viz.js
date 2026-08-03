/* 临汾政府采购专题站 · 乙方数据透视页（KPI + 图表，独立页面） */
(function () {
  "use strict";
  const S = window.LF_SUPPLIER;
  LF.renderNav("supplier");
  if (!S) {
    document.getElementById("kpis").innerHTML =
      '<div class="notice">供应商统计数据尚未生成。</div>';
    return;
  }

  const wan = (v) => (v / 10000);
  const fmtWan = (v) => wan(v).toLocaleString("zh-CN", { maximumFractionDigits: 1 }) + "万";
  const fmtWanShort = (v) => Math.round(wan(v)).toLocaleString("zh-CN") + "万";

  // KPI（5 项一行显示）
  const kpis = [
    ["乙方（供应商）", S.total_suppliers.toLocaleString("zh-CN") + " 家"],
    ["合同总额", fmtWan(S.total_amount)],
    ["合同份数", S.total_contracts.toLocaleString("zh-CN") + " 份"],
    ["平均合同额", fmtWan(S.avg_amount)],
    ["覆盖区县", S.n_districts + " 个"]
  ];
  document.getElementById("kpis").innerHTML = kpis.map(([k, v]) =>
    `<div class="kpi"><div class="v">${v}</div><div class="k">${k}</div></div>`).join("");

  // 金额 Top 30
  LF.hBarChart(document.getElementById("c-amt"),
    S.top_amount.map((d) => ({ label: d.name, value: d.amount })),
    { fmtVal: fmtWanShort, fmtTip: fmtWan });

  // 数量 Top 20
  LF.hBarChart(document.getElementById("c-cnt"),
    S.top_count.map((d) => ({ label: d.name, value: d.count })),
    { fmtVal: (v) => v + " 份" });

  // 区县
  LF.hBarChart(document.getElementById("c-dist"),
    S.by_dist.map((d) => ({ label: d.name, value: d.amount })),
    { fmtVal: fmtWanShort, fmtTip: fmtWan });

  // 年度（柱状图：y 轴自下而上递增，柱顶直接标注金额，趋势一目了然）
  LF.barChart(document.getElementById("c-year"),
    S.by_year.map((d) => ({ label: String(d.year), value: d.amount })),
    { fmtY: (v) => (v / 1e8).toFixed(1) + "亿",
      fmtVal: (v) => (v / 1e8).toFixed(1) + "亿",
      fmtTip: fmtWan, showVal: true });

  // 金额区间（柱状图：x 轴区间标签完整显示，不缩减）
  LF.barChart(document.getElementById("c-bucket"),
    S.buckets.map((d) => ({ label: d.label, value: d.count })),
    { fmtVal: (v) => v + " 份", fmtTip: (v) => v + " 份" });

  // 明细表（供应商名链接到其全部项目）
  const tb = document.querySelector("#sup-table tbody");
  tb.innerHTML = S.top_table.map((d, i) => `<tr>
    <td>${i + 1}</td>
    <td><a class="ent-link" href="supplier.html?name=${encodeURIComponent(d.name)}">${LF.esc(d.name)}</a></td>
    <td class="num amount">${fmtWan(d.amount)}</td>
    <td class="num">${d.count}</td>
    <td>${LF.esc(d.dists)}</td>
    <td>${LF.esc(d.buyers)}</td>
  </tr>`).join("");
})();
