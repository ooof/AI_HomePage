/* 临汾政府采购专题站 · 信息来源（公告原文，便于阅读版本） */
(function () {
  "use strict";
  LF.renderNav("search");
  const root = document.getElementById("source-root");

  function getAid() {
    const m = location.search.match(/[?&]aid=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }
  const aid = getAid();
  if (!aid) { root.innerHTML = '<div class="notice">未指定公告 ID。<a href="search.html">返回检索</a></div>'; return; }

  // 直接复用详情分片（det-*.js 已内嵌公告原文 text 与附件），无需加载全量 rec
  const shard = LF.detShard(aid);
  LF.loadScript("data/det-" + shard + ".js").then(() => {
    render((window.LF_DET || {})[aid] || null);
  }).catch(() => { render(null); });

  function kv(k, v) {
    if (v == null || v === "" || v === 0) return "";
    return `<div class="kv"><span class="k">${k}</span><span class="v">${LF.esc(v)}</span></div>`;
  }

  function render(d) {
    if (!d) {
      root.innerHTML = `<button class="back" onclick="LF.goBack('detail.html?aid=${encodeURIComponent(aid)}')">← 返回项目页</button>
        <div class="notice" style="margin-top:16px;">该公告暂无结构化详情缓存，无法生成原文视图。
        <a href="detail.html?aid=${encodeURIComponent(aid)}">返回聚合页查看概要</a>。</div>`;
      return;
    }

    const title = d.title_disp || d.title || "（未知标题）";
    const ts = (d.publishDate) || 0;
    const buyer = d.buyer || d.r_buyer || "—";
    const agent = d.agent || "—";
    const type = d.type || d.pathName || d.cat || "—";

    let html = `<button class="back" onclick="LF.goBack('detail.html?aid=${encodeURIComponent(aid)}')">← 返回项目聚合页</button>
      <div class="detail-head"><h1>${LF.esc(title)}</h1>
        <div style="margin-top:6px;">
          <span class="chip">${LF.esc(type)}</span>
          ${ts ? `<span style="color:var(--mute)">${LF.fmtDateTime(Math.floor(ts / 1000))}</span>` : ""}
        </div>
      </div>`;

    // 来源元信息
    html += `<div class="card" style="margin-top:14px;">
      <h3><span class="bar"></span>来源信息</h3>
      <div class="kv-grid">`;
    const rows = [];
    rows.push(kv("采购人", buyer));
    rows.push(kv("采购代理机构", agent));
    rows.push(kv("公告类型", type));
    rows.push(kv("项目编号", d.proj_no || d.projectCode));
    if (d.budget) rows.push(kv("预算金额", LF.fmtMoney(d.budget)));
    if (d.contract_amount || d.contract) rows.push(kv("合同金额", LF.fmtMoney(d.contract_amount || d.contract)));
    html += rows.filter(Boolean).join("") + `</div>
      <div class="src-note">本页为根据「中国政府采购网·山西分网」公开公告（articleId=${LF.esc(aid)}）缓存重排的<b>便于阅读版本</b>；
      原始数据以政府网站为准。下方按公告原文呈现正文与附件。</div>
      </div>`;

    // 公告正文（原文）
    const text = d.text;
    if (text && text.length > 10) {
      html += `<div class="card" style="margin-top:18px;">
        <h3><span class="bar"></span>公告正文（原文）</h3>
        <div class="body-text">${LF.cleanBody(text)}</div></div>`;
    } else {
      html += `<div class="card" style="margin-top:18px;">
        <h3><span class="bar"></span>公告正文</h3>
        <div class="notice">缓存中未包含该公告的正文文本。</div></div>`;
    }

    // 附件
    const att = d.attachments;
    if (att && att.length) {
      html += `<div class="card" style="margin-top:18px;">
        <h3><span class="bar"></span>附件（${att.length}）</h3><ul class="winners">`;
      att.forEach((a) => {
        let name = "", url = "";
        if (typeof a === "string") name = a;
        else { name = a.name || a.fileName || "附件"; url = a.url || a.path || ""; }
        const bad = !url || url.indexOf("undefined") >= 0;
        html += bad
          ? `<li>${LF.esc(name)} <span style="color:var(--mute);font-size:12px;">（源站未提供有效下载链接）</span></li>`
          : `<li><a href="${LF.esc(url)}" target="_blank" rel="noopener">${LF.esc(name)}</a></li>`;
      });
      html += `</ul></div>`;
    }

    html += `<div class="foot">数据来源：中国政府采购网·山西分网公开公告（articleId=${LF.esc(aid)}）。本页为公开数据聚合展示，仅供参考。</div>`;
    root.innerHTML = html;
    window.scrollTo(0, 0);
  }
})();
