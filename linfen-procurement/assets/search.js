/* 临汾政府采购专题站 · 检索页 */
(function () {
  "use strict";
  const O = window.LF_OVERVIEW;
  if (!O) { document.body.innerHTML = '<div class="loading">数据文件未载入。</div>'; return; }
  LF.renderNav("search");

  const ALL = LF.allRecords();
  const PAGE = 60;
  let filtered = ALL;
  let page = 1;

  // 填充筛选下拉
  function fill(sel, items, valKey) {
    items.forEach((it) => {
      const v = valKey ? it[valKey] : it;
      const o = document.createElement("option");
      o.value = v; o.textContent = v;
      sel.appendChild(o);
    });
  }
  const dicts = O.dicts || { years: [], dists: [], types: [], methods: [], cats: [] };
  const years = Object.keys(O.years).sort();
  fill(document.getElementById("f-year"), years);
  // 区县用 districts 名称（已按 ORDER 排好）
  fill(document.getElementById("f-dist"), O.districts.map((d) => d.name));
  fill(document.getElementById("f-type"), (dicts.types || []).filter(Boolean));
  fill(document.getElementById("f-meth"), (dicts.methods || []).filter(Boolean));
  fill(document.getElementById("f-cat"), (dicts.cats || []).filter(Boolean));

  // 按单位：采购人自动补全（单位众多，用输入即筛替代下拉）
  const buyers = Array.from(new Set(ALL.map((r) => (r.buyer || "").trim()).filter(Boolean))).sort();
  const buyerInput = document.getElementById("f-buyer");
  const buyerSuggest = document.getElementById("buyer-suggest");
  function showSuggest() {
    const q = buyerInput.value.trim().toLowerCase();
    if (!q) { buyerSuggest.style.display = "none"; return; }
    const m = buyers.filter((b) => b.toLowerCase().indexOf(q) >= 0).slice(0, 30);
    if (!m.length) { buyerSuggest.style.display = "none"; return; }
    buyerSuggest.innerHTML = m.map((b) =>
      `<div class="suggest-item" data-v="${LF.esc(b)}">${LF.esc(b)}</div>`).join("");
    buyerSuggest.style.display = "block";
    buyerSuggest.querySelectorAll(".suggest-item").forEach((el) => {
      el.onclick = () => { buyerInput.value = el.getAttribute("data-v");
        buyerSuggest.style.display = "none"; apply(); };
    });
  }
  buyerInput.addEventListener("input", showSuggest);
  buyerInput.addEventListener("focus", showSuggest);
  buyerInput.addEventListener("blur", () => setTimeout(() => buyerSuggest.style.display = "none", 150));
  buyerInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { buyerSuggest.style.display = "none"; apply(); } });

  function readFilters() {
    return {
      kw: document.getElementById("f-kw").value.trim(),
      buyer: document.getElementById("f-buyer").value.trim(),
      year: document.getElementById("f-year").value,
      dist: document.getElementById("f-dist").value,
      type: document.getElementById("f-type").value,
      meth: document.getElementById("f-meth").value,
      cat: document.getElementById("f-cat").value,
      min: parseFloat(document.getElementById("f-min").value) || 0,
      max: parseFloat(document.getElementById("f-max").value) || Infinity,
      amt: document.getElementById("f-amt").value,
      sort: document.getElementById("f-sort").value
    };
  }

  function apply() {
    const f = readFilters();
    const kw = f.kw.toLowerCase();
    filtered = ALL.filter((r) => {
      if (f.year && String(new Date(r.ts * 1000).getFullYear()) !== f.year) return false;
      if (f.dist && r.dist !== f.dist) return false;
      if (f.type && r.type !== f.type) return false;
      if (f.meth && r.method !== f.meth) return false;
      if (f.cat && r.cat !== f.cat) return false;
      if (f.buyer && (r.buyer || "").indexOf(f.buyer) < 0) return false;
      if (f.min > 0) {
        const amt = Math.max(r.budget || 0, r.contract || 0);
        if (amt < f.min * 1e4) return false;
      }
      if (f.max !== Infinity) {
        const amt = Math.max(r.budget || 0, r.contract || 0);
        if (amt > f.max * 1e4) return false;
      }
      if (f.amt === "budget" && !r.budget) return false;
      if (f.amt === "contract" && !r.contract) return false;
      if (kw) {
        const hay = (r.title + " " + (r.projectName || "") + " " + (r.buyer || "") + " " + (r.supplier || "")).toLowerCase();
        if (hay.indexOf(kw) < 0) return false;
      }
      return true;
    });
    if (f.sort === "budget") filtered.sort((a, b) => (b.budget || 0) - (a.budget || 0));
    else if (f.sort === "contract") filtered.sort((a, b) => (b.contract || 0) - (a.contract || 0));
    else filtered.sort((a, b) => b.ts - a.ts);
    page = 1;
    render();
  }

  function render() {
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE));
    if (page > pages) page = pages;
    const start = (page - 1) * PAGE;
    const slice = filtered.slice(start, start + PAGE);
    const tb = document.getElementById("results");
    if (!slice.length) {
      tb.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--mute);padding:30px;">没有匹配的项目，换个筛选条件试试。</td></tr>`;
    } else {
      tb.innerHTML = slice.map((r) => {
        const det = r.hasDetail ? `<a class="btn small" href="detail.html?aid=${encodeURIComponent(r.aid)}">详情</a>` : `<span style="color:var(--mute)">—</span>`;
        return `<tr>
          <td><a href="detail.html?aid=${encodeURIComponent(r.aid)}" style="font-weight:600;">${LF.esc(r.title_disp || r.title)}</a></td>
          <td>${LF.esc(r.dist || "—")}</td>
          <td>${LF.esc(r.method || "—")}</td>
          <td>${LF.esc(r.cat || "—")}</td>
          <td>${LF.esc(r.buyer || "—")}</td>
          <td class="num">${r.budget ? LF.fmtMoneyShort(r.budget) : "—"}</td>
          <td class="num">${r.contract ? LF.fmtMoneyShort(r.contract) : "—"}</td>
          <td style="white-space:nowrap;">${LF.fmtDate(r.ts)}</td>
          <td style="white-space:nowrap;">${det}</td>
        </tr>`;
      }).join("");
    }
    document.getElementById("count-tip").textContent =
      "共 " + LF.fmtInt(total) + " 条 · 第 " + page + " / " + pages + " 页";
    renderPager(pages);
  }

  function renderPager(pages) {
    const p = document.getElementById("pager");
    if (pages <= 1) { p.innerHTML = ""; return; }
    let html = "";
    if (page > 1) html += `<a data-pg="${page - 1}">上一页</a>`;
    const win = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 2) win.push(i);
    }
    let last = 0;
    win.forEach((i) => {
      if (i - last > 1) html += `<span>…</span>`;
      html += `<a data-pg="${i}" class="${i === page ? "cur" : ""}">${i}</a>`;
      last = i;
    });
    if (page < pages) html += `<a data-pg="${page + 1}">下一页</a>`;
    p.innerHTML = html;
    p.querySelectorAll("a[data-pg]").forEach((a) => {
      a.onclick = () => { page = +a.getAttribute("data-pg"); render(); window.scrollTo({ top: 0, behavior: "smooth" }); };
    });
  }

  document.getElementById("btn-search").onclick = apply;
  document.getElementById("btn-reset").onclick = () => {
    ["f-kw", "f-min", "f-max", "f-buyer"].forEach((id) => document.getElementById(id).value = "");
    ["f-year", "f-dist", "f-type", "f-meth", "f-cat", "f-amt", "f-sort"].forEach((id) => document.getElementById(id).value = "");
    buyerSuggest.style.display = "none";
    apply();
  };
  document.getElementById("f-kw").addEventListener("keydown", (e) => { if (e.key === "Enter") apply(); });

  document.getElementById("foot").innerHTML =
    "明细库 " + LF.fmtInt(O.detail_total) + " 条（" + O.detail_range[0] + " ~ " + O.detail_range[1] +
    "），来源：中国政府采购网·山西分网。检索结果按筛选条件实时过滤，可点击「详情」查看结构化公告全文。";
  apply();
})();
