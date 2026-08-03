/* 临汾政府采购专题站 · 乙方透视页（全部乙方列表 + 过程链 drill-down，仅项目信息） */
(function () {
  "use strict";
  LF.renderNav("supplier");
  const SP = window.LF_SUPPLIERS;
  const supView = document.getElementById("sup-all-view");
  const supListEl = document.getElementById("sup-list");
  const supDetailEl = document.getElementById("sup-detail");
  const supFilterEl = document.getElementById("sup-filter");
  const supCountEl = document.getElementById("sup-count");

  function backBtn() {
    return '<button class="back" id="sup-back">← 返回乙方列表</button>';
  }
  function bindBack() {
    const bk = supDetailEl.querySelector("#sup-back");
    if (bk) bk.onclick = function () { LF.goBack("supplier.html"); };
  }

  function renderSupList(filter) {
    if (!SP) { supListEl.innerHTML = '<div class="notice">乙方索引尚未生成。</div>'; return; }
    const items = SP.items; // [[name, ann, proj, amt], ...]
    const f = (filter || "").trim();
    const matched = f ? items.filter((it) => it[0].indexOf(f) >= 0) : items;
    const shown = (!f && items.length > 400) ? matched.slice(0, 400) : matched;
    supCountEl.textContent = "共 " + items.length.toLocaleString("zh-CN") + " 家" +
      ((!f && items.length > 400) ? "（输入名称查看全部）" : "");
    const fmtAmt = (v) => (v / 1e8).toFixed(2) + " 亿";
    supListEl.innerHTML = shown.map(function (it) {
      return '<button class="ent-item" data-name="' + LF.esc(it[0]) + '">' +
        '<span class="ent-name">' + LF.esc(it[0]) + '</span>' +
        '<span class="ent-meta">' + it[2].toLocaleString("zh-CN") + ' 个项目 · 合同 ' +
        fmtAmt(it[3]) + '</span></button>';
    }).join("");
    Array.prototype.forEach.call(supListEl.querySelectorAll(".ent-item"), function (b) {
      b.onclick = function () { openSupDetail(b.getAttribute("data-name"), true); };
    });
  }

  function showList() {
    supDetailEl.style.display = "none";
    supView.style.display = "block";
  }

  // 查看某供应商的全部项目（仅展示项目过程链，不混入任何可视化图表）
  function openSupDetail(name, push) {
    if (push) {
      try {
        history.pushState({ view: "sup-detail", name: name }, "",
          "?name=" + encodeURIComponent(name));
      } catch (e) {}
    }
    supView.style.display = "none";
    supDetailEl.style.display = "block";
    supDetailEl.innerHTML = '<div class="loading">加载「' + LF.esc(name) + '」的项目…</div>';
    LF.entity.loadProjects(name, "sup").then(function (projects) {
      if (!projects.length) {
        supDetailEl.innerHTML = backBtn() + '<div class="notice">未找到该供应商的项目记录。</div>';
      } else {
        supDetailEl.innerHTML = backBtn() +
          '<h2 class="ent-dh">' + LF.esc(name) +
          ' <small>' + projects.length.toLocaleString("zh-CN") + ' 个执行项目 · 点击阶段查看公告详情</small></h2>' +
          '<div class="proj-list">' +
          projects.map(function (p) { return LF.entity.buildProjectCard(p, "sup"); }).join("") +
          '</div>';
      }
      bindBack();
      window.scrollTo(0, 0);
    }).catch(function () {
      supDetailEl.innerHTML = backBtn() + '<div class="notice">加载失败，请重试。</div>';
      bindBack();
    });
  }

  window.addEventListener("popstate", function (e) {
    const st = e.state || {};
    if (st.view === "sup-detail" && st.name) {
      openSupDetail(st.name, false);
    } else {
      showList();
    }
  });

  if (supFilterEl) supFilterEl.addEventListener("input", function () { renderSupList(supFilterEl.value); });
  renderSupList("");

  const sq = location.search.match(/[?&]name=([^&]+)/);
  if (sq) openSupDetail(decodeURIComponent(sq[1]), false);
})();
