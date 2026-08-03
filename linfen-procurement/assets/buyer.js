/* 临汾政府采购专题站 · 甲方（采购人）透视页 */
(function () {
  "use strict";
  const B = window.LF_BUYERS;
  LF.renderNav("buyer");
  if (!B) {
    document.getElementById("ent-list").innerHTML = '<div class="notice">甲方索引尚未生成。</div>';
    return;
  }
  const items = B.items; // [[name, ann, proj], ...]
  const listView = document.getElementById("ent-list-view");
  const listEl = document.getElementById("ent-list");
  const detailEl = document.getElementById("ent-detail");
  const filterEl = document.getElementById("ent-filter");
  const countEl = document.getElementById("ent-count");

  function renderList(filter) {
    const f = (filter || "").trim();
    const matched = f ? items.filter((it) => it[0].indexOf(f) >= 0) : items;
    const shown = (!f && items.length > 400) ? matched.slice(0, 400) : matched;
    countEl.textContent = "共 " + matched.length.toLocaleString("zh-CN") + " 家" +
      ((!f && items.length > 400) ? "（输入名称查看全部）" : "");
    listEl.innerHTML = shown.map(function (it) {
      return '<button class="ent-item" data-name="' + LF.esc(it[0]) + '">' +
        '<span class="ent-name">' + LF.esc(it[0]) + '</span>' +
        '<span class="ent-meta">' + it[1].toLocaleString("zh-CN") + ' 条公告 · ' +
        it[2].toLocaleString("zh-CN") + ' 个项目</span></button>';
    }).join("");
    Array.prototype.forEach.call(listEl.querySelectorAll(".ent-item"), function (b) {
      b.onclick = function () { openDetail(b.getAttribute("data-name"), true); };
    });
  }

  function showList() {
    detailEl.style.display = "none";
    listView.style.display = "block";
  }

  function openDetail(name, push) {
    if (push) {
      try {
        history.pushState({ view: "buyer-detail", name: name }, "",
          "?name=" + encodeURIComponent(name));
      } catch (e) {}
    }
    listView.style.display = "none";
    detailEl.style.display = "block";
    detailEl.innerHTML = '<div class="loading">加载「' + LF.esc(name) + '」的项目…</div>';
    LF.entity.loadProjects(name, "buyer").then(function (projects) {
      if (!projects.length) {
        detailEl.innerHTML = backBtn() + '<div class="notice">未找到该单位的项目记录。</div>';
      } else {
        detailEl.innerHTML = backBtn() +
          '<h2 class="ent-dh">' + LF.esc(name) +
          ' <small>' + projects.length.toLocaleString("zh-CN") + ' 个项目 · 点击阶段查看公告详情</small></h2>' +
          '<div class="proj-list">' +
          projects.map(function (p) { return LF.entity.buildProjectCard(p, "buyer"); }).join("") +
          '</div>';
      }
      bindBack();
      window.scrollTo(0, 0);
    }).catch(function () {
      detailEl.innerHTML = backBtn() + '<div class="notice">加载失败，请重试。</div>';
      bindBack();
    });
  }

  function backBtn() {
    return '<button class="back" id="back">← 返回甲方列表</button>';
  }
  function bindBack() {
    const bk = detailEl.querySelector("#back");
    if (bk) bk.onclick = function () { LF.goBack("buyer.html"); };
  }

  // 浏览器前进/后退：保留列表视图的筛选与滚动状态（列表 DOM 从未销毁）
  window.addEventListener("popstate", function (e) {
    const st = e.state || {};
    if (st.view === "buyer-detail" && st.name) {
      openDetail(st.name, false);
    } else {
      showList();
    }
  });

  filterEl.addEventListener("input", function () { renderList(filterEl.value); });
  renderList("");

  const q = location.search.match(/[?&]name=([^&]+)/);
  if (q) openDetail(decodeURIComponent(q[1]), false);
})();
