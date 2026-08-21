const DATA = window.WBF_DATA;
const PAGE_SIZE = 20;
const NAME_PAGE_SIZE = 18;
const state = { eventPage: 1, playerPage: 1, namePage: 1 };

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const text = (value) => value === null || value === undefined || value === "" ? "—" : String(value);
const number = (value) => Number(value || 0).toFixed(2);
const compactNumber = (value) => Number.isInteger(Number(value)) ? String(value) : Number(value).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
const medalClass = (medal) => medal?.includes("金") ? "gold" : medal?.includes("银") ? "silver" : "bronze";
const confidenceClass = (confidence) => confidence === "高" ? "high" : confidence === "中" ? "medium" : confidence === "低" ? "low" : "blank";
const confidenceLabel = (confidence) => confidence || "空白";
const escapeHtml = (value) => text(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const urls = (value) => String(value || "").split(/\n+/).map((item) => item.trim()).filter((item) => /^https?:\/\//.test(item));
const sourceLinks = (value) => urls(value).map((url, index) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">官方来源 ${index + 1} ↗</a>`).join("") || "<span>—</span>";

function populateSummary() {
  const meta = DATA.meta;
  $("#data-through").textContent = meta.dataThrough;
  $("#latest-event").textContent = `最新完赛节点：${meta.latestCompletedEvent}`;
  $("#hero-gold").textContent = number(meta.officialAlignedEstimate.gold);
  $("#gold-total").textContent = number(meta.officialAlignedEstimate.gold);
  $("#silver-total").textContent = number(meta.officialAlignedEstimate.silver);
  $("#bronze-total").textContent = number(meta.officialAlignedEstimate.bronze);
  $("#medal-total").textContent = number(meta.officialAlignedEstimate.total);
  $("#scope-note-text").textContent = `逐项可落实到具体赛事的记录合计 ${number(meta.auditable.gold)} 金、${number(meta.auditable.silver)} 银、${number(meta.auditable.bronze)} 铜；另保留WBF截至2023年的国家级未拆分调整 0金、1银、5铜，不强行分配给项目或个人。`;
}

function renderPreviews() {
  $("#leader-preview").innerHTML = DATA.players.slice(0, 6).map((player) => `
    <button class="leader-row" data-player="${escapeHtml(player.englishName)}">
      <span class="rank-number">${player.rank}</span>
      <span class="leader-name"><strong>${escapeHtml(player.bestChineseName || player.englishName)}</strong><small>${escapeHtml(player.bestChineseName ? player.englishName : "中文名待核")}</small></span>
      <span class="leader-medals"><span class="g">${player.gold}G</span><span class="s">${player.silver}S</span><span class="b">${player.bronze}B</span></span>
    </button>`).join("");
  const latest = [...DATA.events].sort((a, b) => Number(b.year) - Number(a.year) || b.uid.localeCompare(a.uid)).slice(0, 6);
  $("#latest-preview").innerHTML = latest.map((event) => `
    <button class="latest-row" data-event="${escapeHtml(event.uid)}">
      <span class="latest-date">${escapeHtml(event.date)}</span>
      <span><strong>${escapeHtml(event.event)}</strong><small>${escapeHtml(event.team)}</small></span>
      <span class="medal-chip ${medalClass(event.medal)}">${escapeHtml(event.medal)}</span>
    </button>`).join("");
}

function setupTabs() {
  $$(".tab").forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));
  $$('[data-jump]').forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.jump, true)));
}

function activateTab(name, scroll = false) {
  $$(".tab").forEach((tab) => { const active = tab.dataset.tab === name; tab.classList.toggle("active", active); tab.setAttribute("aria-selected", active); });
  $$(".panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === name));
  if (scroll) $("#records").scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupEventFilters() {
  const years = [...new Set(DATA.events.map((event) => event.year))].sort((a, b) => b - a);
  $("#event-year").insertAdjacentHTML("beforeend", years.map((year) => `<option value="${year}">${year}</option>`).join(""));
  ["#event-search", "#event-medal", "#event-year", "#event-foreign"].forEach((selector) => {
    $(selector).addEventListener("input", () => { state.eventPage = 1; renderEvents(); });
  });
  $("#event-prev").addEventListener("click", () => { state.eventPage -= 1; renderEvents(); });
  $("#event-next").addEventListener("click", () => { state.eventPage += 1; renderEvents(); });
  $("#export-events").addEventListener("click", exportEvents);
}

function filteredEvents() {
  const query = $("#event-search").value.trim().toLowerCase();
  const medal = $("#event-medal").value;
  const year = $("#event-year").value;
  const foreigners = $("#event-foreign").value;
  return DATA.events.filter((event) => {
    const haystack = [event.date, event.location, event.championship, event.event, event.team, event.chinaPlayers, event.lineup].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (!medal || event.medal === medal) && (!year || String(event.year) === year) && (!foreigners || event.hasForeigners === foreigners);
  }).sort((a, b) => Number(b.year) - Number(a.year) || b.uid.localeCompare(a.uid));
}

function renderEvents() {
  const filtered = filteredEvents();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  state.eventPage = Math.min(state.eventPage, pages);
  const page = filtered.slice((state.eventPage - 1) * PAGE_SIZE, state.eventPage * PAGE_SIZE);
  $("#event-count").textContent = `${filtered.length} 条获奖记录`;
  $("#event-page").textContent = `${state.eventPage} / ${pages}`;
  $("#event-prev").disabled = state.eventPage <= 1;
  $("#event-next").disabled = state.eventPage >= pages;
  $("#event-table").innerHTML = page.map((event) => `
    <tr data-event="${escapeHtml(event.uid)}">
      <td><span class="cell-primary">${escapeHtml(event.date)}</span><span class="cell-secondary">${escapeHtml(event.location)}</span></td>
      <td><span class="cell-primary">${escapeHtml(event.event)}</span><span class="cell-secondary">${escapeHtml(event.championship)}</span></td>
      <td><span class="medal-chip ${medalClass(event.medal)}">${escapeHtml(event.medal)}</span></td>
      <td><span class="cell-primary">${escapeHtml(event.team)}</span><span class="cell-secondary">${escapeHtml(event.chinaPlayers)}</span></td>
      <td><span class="share-value">${Math.round(Number(event.fraction?.chinaShare || 0) * 100)}%</span><span class="cell-secondary">${event.fraction?.chinaCount || 0}/${event.fraction?.lineupCount || 0} CHN</span></td>
    </tr>`).join("");
  $("#event-cards").innerHTML = page.map((event) => `
    <article class="mobile-card" data-event="${escapeHtml(event.uid)}"><div class="mobile-card-head"><div><h4>${escapeHtml(event.event)}</h4><small>${escapeHtml(event.date)} · ${escapeHtml(event.location)}</small></div><span class="medal-chip ${medalClass(event.medal)}">${escapeHtml(event.medal)}</span></div><p>${escapeHtml(event.team)}<br />中国份额 ${Math.round(Number(event.fraction?.chinaShare || 0) * 100)}%</p></article>`).join("");
}

function setupPlayerFilters() {
  ["#player-search", "#player-confidence", "#player-sort"].forEach((selector) => $(selector).addEventListener("input", () => { state.playerPage = 1; renderPlayers(); }));
  $("#player-prev").addEventListener("click", () => { state.playerPage -= 1; renderPlayers(); });
  $("#player-next").addEventListener("click", () => { state.playerPage += 1; renderPlayers(); });
}

function filteredPlayers() {
  const query = $("#player-search").value.trim().toLowerCase();
  const confidence = $("#player-confidence").value;
  const sort = $("#player-sort").value;
  const result = DATA.players.filter((player) => {
    const haystack = `${player.englishName} ${player.bestChineseName || ""}`.toLowerCase();
    return (!query || haystack.includes(query)) && (!confidence || confidenceLabel(player.confidence) === confidence);
  });
  if (sort === "gold") result.sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || a.englishName.localeCompare(b.englishName));
  else if (sort === "total") result.sort((a, b) => b.total - a.total || b.gold - a.gold || a.englishName.localeCompare(b.englishName));
  else result.sort((a, b) => a.rank - b.rank || a.englishName.localeCompare(b.englishName));
  return result;
}

function renderPlayers() {
  const filtered = filteredPlayers();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  state.playerPage = Math.min(state.playerPage, pages);
  const page = filtered.slice((state.playerPage - 1) * PAGE_SIZE, state.playerPage * PAGE_SIZE);
  $("#player-count").textContent = `${filtered.length} 名中国选手`;
  $("#player-page").textContent = `${state.playerPage} / ${pages}`;
  $("#player-prev").disabled = state.playerPage <= 1;
  $("#player-next").disabled = state.playerPage >= pages;
  $("#player-table").innerHTML = page.map((player) => `
    <tr data-player="${escapeHtml(player.englishName)}"><td><span class="rank-number">${player.rank}</span></td><td><span class="cell-primary">${escapeHtml(player.bestChineseName || "中文名待核")}</span><span class="cell-secondary">${escapeHtml(player.englishName)}</span></td><td><span class="confidence ${confidenceClass(player.confidence)}">${confidenceLabel(player.confidence)}</span></td><td>${player.gold}</td><td>${player.silver}</td><td>${player.bronze}</td><td><strong>${player.total}</strong></td></tr>`).join("");
  $("#player-cards").innerHTML = page.map((player) => `
    <article class="mobile-card" data-player="${escapeHtml(player.englishName)}"><div class="mobile-card-head"><div><h4>${escapeHtml(player.bestChineseName || "中文名待核")}</h4><small>${escapeHtml(player.englishName)}</small></div><span class="rank-number">#${player.rank}</span></div><p>金 ${player.gold} · 银 ${player.silver} · 铜 ${player.bronze} · 总计 ${player.total}　<span class="confidence ${confidenceClass(player.confidence)}">${confidenceLabel(player.confidence)}</span></p></article>`).join("");
}

function setupNameFilters() {
  ["#name-search", "#name-confidence"].forEach((selector) => $(selector).addEventListener("input", () => { state.namePage = 1; renderNames(); }));
  $("#name-prev").addEventListener("click", () => { state.namePage -= 1; renderNames(); });
  $("#name-next").addEventListener("click", () => { state.namePage += 1; renderNames(); });
}

function filteredNames() {
  const query = $("#name-search").value.trim().toLowerCase();
  const confidence = $("#name-confidence").value;
  return DATA.inferences.filter((item) => {
    const haystack = [item.englishName, item.bestChineseName, item.evidenceType, item.reasoning, item.context].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (!confidence || confidenceLabel(item.confidence) === confidence);
  }).sort((a, b) => ({ 高: 0, 中: 1, 低: 2, 空白: 3 }[confidenceLabel(a.confidence)] - { 高: 0, 中: 1, 低: 2, 空白: 3 }[confidenceLabel(b.confidence)]) || a.englishName.localeCompare(b.englishName));
}

function renderNames() {
  const filtered = filteredNames();
  const pages = Math.max(1, Math.ceil(filtered.length / NAME_PAGE_SIZE));
  state.namePage = Math.min(state.namePage, pages);
  const page = filtered.slice((state.namePage - 1) * NAME_PAGE_SIZE, state.namePage * NAME_PAGE_SIZE);
  $("#name-count").textContent = `${filtered.length} 名选手`;
  $("#name-page").textContent = `${state.namePage} / ${pages}`;
  $("#name-prev").disabled = state.namePage <= 1;
  $("#name-next").disabled = state.namePage >= pages;
  $("#name-grid").innerHTML = page.map((item) => `
    <article class="name-card" data-name="${escapeHtml(item.englishName)}"><div class="name-card-head"><div><h4>${escapeHtml(item.bestChineseName || "暂不推断")}</h4><span class="english">${escapeHtml(item.englishName)}</span></div><span class="confidence ${confidenceClass(item.confidence)}">${confidenceLabel(item.confidence)}</span></div><p>${escapeHtml(item.evidenceType || "暂无可靠映射依据")}</p></article>`).join("");
}

function renderHistory() {
  $("#timeline").innerHTML = DATA.timeline.map((item) => `
    <article class="timeline-item"><div class="timeline-year">${escapeHtml(item.checkpoint)}</div><div class="timeline-copy"><h4>${escapeHtml(item.officialChange)}</h4><p>${escapeHtml(item.finding)}</p><p><strong>归属判断：</strong>${escapeHtml(item.attribution)}</p><span class="confidence ${confidenceClass((item.confidence || "").startsWith("高") ? "高" : (item.confidence || "").startsWith("中") ? "中" : "低")}">${escapeHtml(item.confidence)}</span><div class="source-list inline-sources">${sourceLinks(item.source)}</div></div></article>`).join("");
  $("#revision-grid").innerHTML = DATA.revisions.map((item) => `
    <article class="revision-card"><h4>${escapeHtml(item.batch)}</h4><p><strong>${escapeHtml(item.championship)}</strong><br />${escapeHtml(item.event)} · ${escapeHtml(item.medal)}</p><p>${escapeHtml(item.reasoning)}</p><div class="revision-meta"><span class="confidence ${confidenceClass((item.confidence || "").startsWith("高") ? "高" : (item.confidence || "").startsWith("中") ? "中" : "低")}">${escapeHtml(item.confidence)}</span><span>金${compactNumber(item.gold)} 银${compactNumber(item.silver)} 铜${compactNumber(item.bronze)}</span></div><div class="source-list inline-sources">${sourceLinks(item.source)}</div></article>`).join("");
}

function renderMethod() {
  $("#method-list").innerHTML = DATA.methodology.map((item) => `<article class="method-row"><strong>${escapeHtml(item.item)}</strong><p>${escapeHtml(item.rule)}</p><p>${escapeHtml(item.handling)}</p><div class="source-list inline-sources">${sourceLinks(item.source)}</div></article>`).join("");
  $("#alignment-table").innerHTML = DATA.alignment.map((item) => `<article class="alignment-card"><h4>${escapeHtml(item.step)}</h4><div class="alignment-numbers"><span>${compactNumber(item.gold)} 金</span><span>${compactNumber(item.silver)} 银</span><span>${compactNumber(item.bronze)} 铜</span></div><p>${escapeHtml(item.reason)}</p><div class="source-list inline-sources">${sourceLinks(item.source)}</div></article>`).join("");
  $("#candidate-grid").innerHTML = DATA.candidates.map((item) => `<article class="candidate-card"><h4>${escapeHtml(item.type)} · ${escapeHtml(item.year)}</h4><p><strong>${escapeHtml(item.championship)}</strong><br />${escapeHtml(item.event)} · ${escapeHtml(item.medal)}</p><p>${escapeHtml(item.handling)}：${escapeHtml(item.reasoning)}</p><div class="source-list inline-sources">${sourceLinks(item.source)}</div></article>`).join("");
}

function showEvent(uid) {
  const event = DATA.events.find((item) => item.uid === uid);
  if (!event) return;
  $("#dialog-content").innerHTML = `<div class="dialog-inner"><p class="kicker">${escapeHtml(event.recordId)}</p><h2>${escapeHtml(event.event)}</h2><p class="dialog-subtitle">${escapeHtml(event.championship)}</p><div class="detail-grid"><div class="detail-item"><span>比赛时间</span><strong>${escapeHtml(event.date)}</strong></div><div class="detail-item"><span>地点</span><strong>${escapeHtml(event.location)}</strong></div><div class="detail-item"><span>名次 / 奖牌</span><strong>第${event.rank}名 · ${escapeHtml(event.medal)}</strong></div><div class="detail-item"><span>中国奖牌份额</span><strong>${Math.round(Number(event.fraction?.chinaShare || 0) * 100)}%（${event.fraction?.chinaCount || 0}/${event.fraction?.lineupCount || 0}）</strong></div></div><div class="dialog-section"><h3>获奖队 / 组合</h3><p>${escapeHtml(event.team)}</p></div><div class="dialog-section"><h3>完整参赛阵容</h3><p>${escapeHtml(event.lineup)}</p></div>${event.staff ? `<div class="dialog-section"><h3>领队 / 教练 / NPC</h3><p>${escapeHtml(event.staff)}</p></div>` : ""}${event.fraction?.foreignTeammates ? `<div class="dialog-section"><h3>外籍队友</h3><p>${escapeHtml(event.fraction.foreignTeammates)}</p></div>` : ""}${event.note ? `<div class="dialog-section"><h3>资料备注</h3><p>${escapeHtml(event.note)}</p></div>` : ""}<div class="dialog-section"><h3>WBF来源</h3><div class="source-list">${sourceLinks(event.source)}</div></div></div>`;
  $("#detail-dialog").showModal();
}

function showPlayer(englishName) {
  const player = DATA.players.find((item) => item.englishName === englishName);
  if (!player) return;
  const medalDetails = [["金牌项目", player.goldDetails], ["银牌项目", player.silverDetails], ["铜牌项目", player.bronzeDetails]].filter(([, value]) => value);
  $("#dialog-content").innerHTML = `<div class="dialog-inner"><p class="kicker">个人奖牌榜 · 第${player.rank}名</p><h2>${escapeHtml(player.bestChineseName || "中文名待核")}</h2><p class="dialog-subtitle">${escapeHtml(player.englishName)}</p><div class="detail-grid"><div class="detail-item"><span>金牌</span><strong>${player.gold}</strong></div><div class="detail-item"><span>银牌</span><strong>${player.silver}</strong></div><div class="detail-item"><span>铜牌</span><strong>${player.bronze}</strong></div><div class="detail-item"><span>中文姓名确定度</span><strong><span class="confidence ${confidenceClass(player.confidence)}">${confidenceLabel(player.confidence)}</span></strong></div></div>${medalDetails.map(([label, value]) => `<div class="dialog-section"><h3>${label}</h3><p>${escapeHtml(value)}</p></div>`).join("")}${player.reasoning ? `<div class="dialog-section"><h3>中文姓名推断依据</h3><p>${escapeHtml(player.reasoning)}</p></div>` : ""}${player.ambiguity ? `<div class="dialog-section"><h3>歧义与保留意见</h3><p>${escapeHtml(player.ambiguity)}</p></div>` : ""}<div class="dialog-section"><h3>资料来源</h3><div class="source-list">${sourceLinks([player.chineseSources, player.wbfSources].filter(Boolean).join("\n"))}</div></div></div>`;
  $("#detail-dialog").showModal();
}

function showName(englishName) {
  const item = DATA.inferences.find((entry) => entry.englishName === englishName);
  if (!item) return;
  $("#dialog-content").innerHTML = `<div class="dialog-inner"><p class="kicker">中文姓名最佳猜测</p><h2>${escapeHtml(item.bestChineseName || "暂不推断")}</h2><p class="dialog-subtitle">${escapeHtml(item.englishName)}　<span class="confidence ${confidenceClass(item.confidence)}">${confidenceLabel(item.confidence)}</span></p><div class="dialog-section"><h3>证据类型</h3><p>${escapeHtml(item.evidenceType)}</p></div><div class="dialog-section"><h3>具体推断依据</h3><p>${escapeHtml(item.reasoning)}</p></div><div class="dialog-section"><h3>赛事 / 队伍 / 活动时间上下文</h3><p>${escapeHtml(item.context)}</p></div><div class="dialog-section"><h3>歧义与保留意见</h3><p>${escapeHtml(item.ambiguity)}</p></div><div class="dialog-section"><h3>国内中文资料</h3><div class="source-list">${sourceLinks(item.chineseSources)}</div></div><div class="dialog-section"><h3>WBF成绩 / 阵容来源</h3><div class="source-list">${sourceLinks(item.wbfSources)}</div></div></div>`;
  $("#detail-dialog").showModal();
}

function setupDelegatedClicks() {
  document.addEventListener("click", (event) => {
    const eventTarget = event.target.closest("[data-event]");
    const playerTarget = event.target.closest("[data-player]");
    const nameTarget = event.target.closest("[data-name]");
    if (eventTarget) showEvent(eventTarget.dataset.event);
    else if (playerTarget) showPlayer(playerTarget.dataset.player);
    else if (nameTarget) showName(nameTarget.dataset.name);
  });
  $(".dialog-close").addEventListener("click", () => $("#detail-dialog").close());
  $("#detail-dialog").addEventListener("click", (event) => { if (event.target === $("#detail-dialog")) $("#detail-dialog").close(); });
}

function exportEvents() {
  const rows = filteredEvents();
  const columns = ["记录ID", "比赛时间", "地点", "比赛名称", "项目", "名次", "奖牌", "获奖队/组合", "中国选手", "完整阵容", "中国份额", "WBF来源"];
  const values = rows.map((item) => [item.recordId, item.date, item.location, item.championship, item.event, item.rank, item.medal, item.team, item.chinaPlayers, item.lineup, item.fraction?.chinaShare, item.source]);
  const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = "\ufeff" + [columns, ...values].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = "WBF中国选手获奖记录_筛选结果.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

populateSummary();
renderPreviews();
setupTabs();
setupEventFilters();
setupPlayerFilters();
setupNameFilters();
setupDelegatedClicks();
renderEvents();
renderPlayers();
renderNames();
renderHistory();
renderMethod();
