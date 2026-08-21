const DATA = window.WBF_DATA;
const PAGE_SIZE = 20;
const state = { eventPage: 1, playerPage: 1 };

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const text = (value) => value === null || value === undefined || value === "" ? "—" : String(value);
const number = (value) => Number(value || 0).toFixed(2);
const medalClass = (medal) => medal?.includes("金") ? "gold" : medal?.includes("银") ? "silver" : "bronze";
const escapeHtml = (value) => text(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const urls = (value) => String(value || "").split(/\n+/).map((item) => item.trim()).filter((item) => /^https?:\/\//.test(item));
const sourceLinks = (value) => urls(value).map((url, index) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">官方来源 ${index + 1} ↗</a>`).join("") || "<span>—</span>";
const playerDisplayName = (player) => player.bestChineseName || player.englishName;
const playerSecondaryName = (player) => player.bestChineseName ? player.englishName : "";

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

function renderMedalTrend() {
  const eventYears = DATA.events.map((event) => Number(event.year)).filter(Number.isFinite);
  const firstYear = Math.min(...eventYears);
  const lastYear = Math.max(...eventYears);
  const totals = { gold: 0, silver: 0, bronze: 0 };
  const points = [];
  for (let year = firstYear; year <= lastYear; year += 1) {
    DATA.events.filter((event) => Number(event.year) === year).forEach((event) => {
      totals.gold += Number(event.fraction?.gold || 0);
      totals.silver += Number(event.fraction?.silver || 0);
      totals.bronze += Number(event.fraction?.bronze || 0);
    });
    if (year === 2023) {
      totals.gold += Number(DATA.meta.unallocatedHistoricalAdjustment?.gold || 0);
      totals.silver += Number(DATA.meta.unallocatedHistoricalAdjustment?.silver || 0);
      totals.bronze += Number(DATA.meta.unallocatedHistoricalAdjustment?.bronze || 0);
    }
    points.push({ year, ...totals, total: totals.gold + totals.silver + totals.bronze });
  }

  const width = 980;
  const height = 430;
  const plot = { left: 58, right: 24, top: 28, bottom: 48 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const maxValue = Math.max(...points.map((point) => point.total));
  const yMax = Math.ceil(maxValue / 20) * 20;
  const x = (year) => plot.left + ((year - firstYear) / (lastYear - firstYear)) * plotWidth;
  const y = (value) => plot.top + plotHeight - (value / yMax) * plotHeight;
  const series = [
    { key: "gold", label: "金牌", color: "#c7912f", width: 3 },
    { key: "silver", label: "银牌", color: "#7b8796", width: 3 },
    { key: "bronze", label: "铜牌", color: "#a8643c", width: 3 },
    { key: "total", label: "总计", color: "#071b2e", width: 4 },
  ];
  const yTicks = Array.from({ length: 7 }, (_, index) => (yMax / 6) * index);
  const xTicks = [...new Set([firstYear, 1995, 2000, 2005, 2010, 2015, 2020, 2023, lastYear].filter((year) => year >= firstYear && year <= lastYear))];
  const grid = yTicks.map((value) => `<g><line x1="${plot.left}" y1="${y(value)}" x2="${width - plot.right}" y2="${y(value)}" class="chart-grid-line"/><text x="${plot.left - 11}" y="${y(value) + 4}" text-anchor="end" class="chart-axis-label">${Math.round(value)}</text></g>`).join("");
  const years = xTicks.map((year) => `<text x="${x(year)}" y="${height - 17}" text-anchor="middle" class="chart-axis-label">${year}</text>`).join("");
  const lines = series.map((item) => {
    const path = points.map((point, index) => `${index ? "L" : "M"}${x(point.year).toFixed(2)},${y(point[item.key]).toFixed(2)}`).join(" ");
    const last = points.at(-1);
    return `<path d="${path}" fill="none" stroke="${item.color}" stroke-width="${item.width}" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x(last.year)}" cy="${y(last[item.key])}" r="5" fill="${item.color}"><title>${item.label} ${last.year}：${number(last[item.key])}</title></circle>`;
  }).join("");
  const adjustmentX = x(2023);
  $("#medal-trend").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${firstYear}年至${lastYear}年中国累计金牌、银牌、铜牌和总奖牌数变化图"><g>${grid}<line x1="${adjustmentX}" y1="${plot.top}" x2="${adjustmentX}" y2="${plot.top + plotHeight}" class="adjustment-line"/><text x="${adjustmentX - 7}" y="${plot.top + 13}" text-anchor="end" class="adjustment-label">2023官方调整</text>${lines}${years}</g></svg>`;
}

function renderPreviews() {
  $("#leader-preview").innerHTML = DATA.players.slice(0, 6).map((player) => `
    <button class="leader-row" data-player="${escapeHtml(player.englishName)}">
      <span class="rank-number">${player.rank}</span>
      <span class="leader-name"><strong>${escapeHtml(playerDisplayName(player))}</strong>${playerSecondaryName(player) ? `<small>${escapeHtml(playerSecondaryName(player))}</small>` : ""}</span>
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
  ["#player-search", "#player-sort"].forEach((selector) => $(selector).addEventListener("input", () => { state.playerPage = 1; renderPlayers(); }));
  $("#player-prev").addEventListener("click", () => { state.playerPage -= 1; renderPlayers(); });
  $("#player-next").addEventListener("click", () => { state.playerPage += 1; renderPlayers(); });
}

function filteredPlayers() {
  const query = $("#player-search").value.trim().toLowerCase();
  const sort = $("#player-sort").value;
  const result = DATA.players.filter((player) => {
    const haystack = `${player.englishName} ${player.bestChineseName || ""}`.toLowerCase();
    return !query || haystack.includes(query);
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
    <tr data-player="${escapeHtml(player.englishName)}"><td><span class="rank-number">${player.rank}</span></td><td><span class="cell-primary">${escapeHtml(playerDisplayName(player))}</span>${playerSecondaryName(player) ? `<span class="cell-secondary">${escapeHtml(playerSecondaryName(player))}</span>` : ""}</td><td>${player.gold}</td><td>${player.silver}</td><td>${player.bronze}</td><td><strong>${player.total}</strong></td></tr>`).join("");
  $("#player-cards").innerHTML = page.map((player) => `
    <article class="mobile-card" data-player="${escapeHtml(player.englishName)}"><div class="mobile-card-head"><div><h4>${escapeHtml(playerDisplayName(player))}</h4>${playerSecondaryName(player) ? `<small>${escapeHtml(playerSecondaryName(player))}</small>` : ""}</div><span class="rank-number">#${player.rank}</span></div><p>金 ${player.gold} · 银 ${player.silver} · 铜 ${player.bronze} · 总计 ${player.total}</p></article>`).join("");
}

function renderMethod() {
  $("#method-list").innerHTML = DATA.methodology.map((item) => `<article class="method-row"><strong>${escapeHtml(item.item)}</strong><p>${escapeHtml(item.rule)}</p><p>${escapeHtml(item.handling)}</p><div class="source-list inline-sources">${sourceLinks(item.source)}</div></article>`).join("");
}

function setupFeedbackForm() {
  const form = $("#feedback-form");
  const submitButton = form.querySelector('button[type="submit"]');
  const status = $("#feedback-status");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const type = $("#feedback-type").value;
    const subject = $("#feedback-subject").value.trim();
    const details = $("#feedback-details").value.trim();
    const name = $("#feedback-name").value.trim() || "匿名访客";
    const source = $("#feedback-source").value.trim() || "未填写";
    const email = $("#feedback-email").value.trim();
    const pageUrl = window.location.href;
    const payload = {
      access_key: "adcd238c-9845-4229-9af8-6a3cd7a54dd8",
      subject: `[WBF奖牌档案反馈｜${type}] ${subject}`,
      from_name: "中国桥牌世界奖牌档案",
      name,
      message: [`反馈类型：${type}`, `简要标题：${subject}`, "", "详细说明：", details, "", `资料链接：${source}`, `反馈人：${name}`, `联系邮箱：${email || "未填写"}`, `提交页面：${pageUrl}`].join("\n"),
      feedback_type: type,
      feedback_title: subject,
      source_url: source,
      page_url: pageUrl,
      botcheck: $("#feedback-botcheck").checked ? "spam" : "",
    };
    if (email) payload.email = email;

    submitButton.disabled = true;
    submitButton.textContent = "正在提交…";
    status.dataset.state = "pending";
    status.textContent = "正在发送反馈，请稍候。";

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "提交未成功");
      form.reset();
      status.dataset.state = "success";
      status.textContent = "感谢反馈！内容已经成功提交。";
    } catch (error) {
      status.dataset.state = "error";
      status.textContent = `提交失败：${error.message || "请稍后重试。"}`;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "提交反馈";
    }
  });
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
  $("#dialog-content").innerHTML = `<div class="dialog-inner"><p class="kicker">个人奖牌榜 · 第${player.rank}名</p><h2>${escapeHtml(playerDisplayName(player))}</h2>${playerSecondaryName(player) ? `<p class="dialog-subtitle">${escapeHtml(playerSecondaryName(player))}</p>` : ""}<div class="detail-grid"><div class="detail-item"><span>金牌</span><strong>${player.gold}</strong></div><div class="detail-item"><span>银牌</span><strong>${player.silver}</strong></div><div class="detail-item"><span>铜牌</span><strong>${player.bronze}</strong></div></div>${medalDetails.map(([label, value]) => `<div class="dialog-section"><h3>${label}</h3><p>${escapeHtml(value)}</p></div>`).join("")}<div class="dialog-section"><h3>WBF资料来源</h3><div class="source-list">${sourceLinks(player.wbfSources)}</div></div></div>`;
  $("#detail-dialog").showModal();
}

function setupDelegatedClicks() {
  document.addEventListener("click", (event) => {
    const eventTarget = event.target.closest("[data-event]");
    const playerTarget = event.target.closest("[data-player]");
    if (eventTarget) showEvent(eventTarget.dataset.event);
    else if (playerTarget) showPlayer(playerTarget.dataset.player);
  });
  $(".dialog-close").addEventListener("click", () => $("#detail-dialog").close());
  $("#detail-dialog").addEventListener("click", (event) => { if (event.target === $("#detail-dialog")) $("#detail-dialog").close(); });
}

populateSummary();
renderMedalTrend();
renderPreviews();
setupTabs();
setupEventFilters();
setupPlayerFilters();
setupDelegatedClicks();
setupFeedbackForm();
renderEvents();
renderPlayers();
renderMethod();
