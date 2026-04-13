// ==============================
// Dashboard Page Unified
// ==============================

import { fetchTrendingMarkets, fetchItalyEvents, listEventsByTag, searchEventsAndMarkets } from '../api.js';
import { formatCurrency, formatPercent, formatPriceChange, parseOutcomes, defaultImage, getPlaceholder, debounce } from '../utils.js';
import { renderMarketDetail } from './market.js';

const DEGATE_LINK = 'https://app.degate.com/?utm_source=walletanalyzer?s=jack18';
const MIN_VOLUME = 5000;

export async function renderDashboard(dashboardContainer, detailContainer) {
  dashboardContainer.innerHTML = `
    <!-- Top Bar with Search -->
    <div style="margin-bottom: 24px; position: sticky; top: 0; background: var(--bg-primary); z-index: 10; padding: 16px 0; border-bottom: 1px solid var(--border-glass);">
      <input type="text"
             class="search-big-input"
             id="pm-unified-search"
             placeholder="🔍 Cerca mercati, eventi (es. Trump, Bitcoin)..."
             autocomplete="off" />
      
      <!-- Tags / Categories -->
      <div class="tags-grid" style="margin-bottom: 0; margin-top: 12px; gap: 6px; overflow-x: auto; white-space: nowrap; flex-wrap: nowrap; padding-bottom: 4px;">
        <button class="tag-pill active" data-filter="trending">🔥 Trending</button>
        <button class="tag-pill" data-filter="italy">🇮🇹 Italia Focus</button>
        <button class="tag-pill" data-filter="crypto">💰 Crypto</button>
        <button class="tag-pill" data-filter="politics">🏛️ Politica</button>
        <button class="tag-pill" data-filter="sports">⚽ Sport</button>
        <button class="tag-pill" data-filter="world">🌍 Mondo</button>
      </div>
    </div>

    <!-- Active State Header -->
    <div class="section-header" id="pm-active-header">
      <h2>🔥 Mercati Trending</h2>
    </div>

    <!-- Grid Container -->
    <div id="pm-grid-container" class="markets-grid" style="min-height: 400px;">
      ${skeletonCards(8)}
    </div>

    <!-- Sponsor -->
    <section class="sponsor-banner fade-in" style="margin-top: 60px;">
      <div class="sponsor-badge">⭐ Partner Consigliato</div>
      <h3>Prova DeGate — Wallet Web3 Multichain</h3>
      <p>Wallet selfcustody con prodotti DeFi integrati: trading, bridge, e gestione asset in totale sicurezza.</p>
      <a href="${DEGATE_LINK}" target="_blank" rel="noopener" class="sponsor-cta">
        Prova DeGate Gratis →
      </a>
    </section>
  `;

  // --- Internals ---
  const searchInput = dashboardContainer.querySelector('#pm-unified-search');
  const gridContainer = dashboardContainer.querySelector('#pm-grid-container');
  const activeHeader = dashboardContainer.querySelector('#pm-active-header h2');
  const tagPills = dashboardContainer.querySelectorAll('.tag-pill');

  // Debounced Search Loader
  const doSearch = debounce(async (query) => {
    gridContainer.innerHTML = skeletonCards(8);
    activeHeader.textContent = `🔍 Risultati per "${escapeHtml(query)}"`;
    
    // reset pills
    tagPills.forEach(p => p.classList.remove('active'));

    try {
      const data = await searchEventsAndMarkets(query);
      const events = filterEvents(data?.events || []);
      if(events.length === 0) {
        gridContainer.innerHTML = emptyState(query);
      } else {
        gridContainer.innerHTML = events.slice(0, 20).map((e, i) => renderEventCard(e, i)).join('');
        bindCardClicks();
      }
    } catch(err) {
      gridContainer.innerHTML = errorState();
    }
  }, 400);

  // Category Loader
  async function loadCategory(filterId, label) {
    gridContainer.innerHTML = skeletonCards(8);
    activeHeader.textContent = label;
    searchInput.value = ''; // clear search

    tagPills.forEach(p => {
      p.classList.toggle('active', p.dataset.filter === filterId);
    });

    try {
      let events = [];
      if (filterId === 'trending') {
        events = await fetchTrendingMarkets();
      } else if (filterId === 'italy') {
        events = await fetchItalyEvents();
      } else {
        events = await listEventsByTag(filterId);
      }

      const filtered = filterEvents(events);
      
      if(filtered.length === 0) {
        gridContainer.innerHTML = emptyState('questa categoria');
      } else {
        gridContainer.innerHTML = filtered.slice(0, 16).map((e, i) => renderEventCard(e, i)).join('');
        bindCardClicks();
      }
    } catch(err) {
      gridContainer.innerHTML = errorState();
    }
  }

  // Bind Clicks for Navigation directly inside the SPA
  function bindCardClicks() {
    gridContainer.querySelectorAll('.market-card').forEach(card => {
      card.addEventListener('click', () => {
        const marketId = card.dataset.marketId;
        if (marketId) {
          // Slide over to market detail smoothly
          dashboardContainer.style.display = 'none';
          window.scrollTo(0, 0);
          detailContainer.style.display = 'block';
          
          renderMarketDetail(detailContainer, marketId, () => {
            // "Indietro" callback
            detailContainer.innerHTML = ''; // cleanup memory
            detailContainer.style.display = 'none';
            dashboardContainer.style.display = 'block';
            window.scrollTo(0, 0);
          });
        }
      });
    });
  }

  // --- Listeners ---
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if(q) {
      doSearch(q);
    } else {
      // Revert to trending
      loadCategory('trending', '🔥 Mercati Trending');
    }
  });

  tagPills.forEach(pill => {
    pill.addEventListener('click', () => {
      loadCategory(pill.dataset.filter, pill.textContent);
    });
  });

  // Initial Load
  loadCategory('trending', '🔥 Mercati Trending');
}

// ==============================
// HELPERS & RENDERING
// ==============================

function skeletonCards(n) {
  return Array(n).fill('<div class="skeleton skeleton-card" style="height:220px;border-radius:16px"></div>').join('');
}
function emptyState(str) {
  return `<div class="empty-state" style="grid-column: 1 / -1"><div class="empty-icon">📭</div><p>Nessun risultato disponibile per ${escapeHtml(str)}.</p></div>`;
}
function errorState() {
  return `<div class="empty-state" style="grid-column: 1 / -1"><div class="empty-icon">⚠️</div><p>Errore nel caricamento dei dati.</p></div>`;
}

function filterEvents(events) {
  const now = new Date();
  return events.filter(event => {
    const vol = event.volume || event.volume24hr || 0;
    if (vol < MIN_VOLUME) return false;
    if (event.closed || !event.active || event.resolved) return false;
    
    const endDateStr = event.endDate || event.endDateIso || event.end_date_iso || event.expirationDate;
    if (endDateStr) {
      const end = new Date(endDateStr);
      if (!isNaN(end.getTime()) && end < now) return false;
    }
    return true;
  });
}

function getEventOutcomes(event) {
  const markets = event.markets || [];
  if (markets.length <= 1) {
    const market = markets[0];
    if (!market) return { isMulti: false, outcomes: [], topProb: 0 };
    const parsed = parseOutcomes(market);
    const yesPrice = parsed.find(o => o.name === 'Yes')?.price || parsed[0]?.price || 0;
    const noPrice = parsed.find(o => o.name === 'No')?.price || parsed[1]?.price || 0;
    return { isMulti: false, outcomes: parsed, topProb: yesPrice, yesPrice, noPrice };
  }

  const choices = markets
    .map(m => {
      const parsed = parseOutcomes(m);
      const yesPrice = parsed.find(o => o.name === 'Yes')?.price || parsed[0]?.price || 0;
      const name = m.groupItemTitle || m.question || 'Opzione';
      return { name, price: yesPrice, marketId: m.id };
    })
    .filter(c => c.price > 0)
    .sort((a, b) => b.price - a.price);

  return { isMulti: true, outcomes: choices.slice(0, 5), topProb: choices[0]?.price || 0, totalChoices: choices.length };
}

function renderOutcomesHtml(eventData) {
  if (eventData.isMulti) {
    const colors = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444'];
    let html = eventData.outcomes.map((o, i) => {
      const color = colors[i % colors.length];
      return `
        <div class="outcome-row">
          <span class="outcome-label multi-label" title="${escapeAttr(o.name)}">${escapeHtml(truncate(o.name, 18))}</span>
          <div class="outcome-bar-bg">
            <div class="outcome-bar-fill" style="width:${Math.max(o.price * 100, 4)}%;background:linear-gradient(90deg,${color}40,${color}99)">
              <span class="outcome-price">${formatPercent(o.price, 0)}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    if (eventData.totalChoices > 5) {
      html += `<div style="font-size:11px;color:var(--text-muted);margin-top:4px;text-align:right">+${eventData.totalChoices - 5} altre opzioni</div>`;
    }
    return html;
  }

  const { yesPrice, noPrice } = eventData;
  let html = '';
  if (yesPrice > 0) {
    html += `
      <div class="outcome-row">
        <span class="outcome-label">Sì</span>
        <div class="outcome-bar-bg">
          <div class="outcome-bar-fill yes" style="width:${Math.max(yesPrice * 100, 5)}%">
            <span class="outcome-price">${formatPercent(yesPrice, 0)}</span>
          </div>
        </div>
      </div>`;
  }
  if (noPrice > 0) {
    html += `
      <div class="outcome-row">
        <span class="outcome-label">No</span>
        <div class="outcome-bar-bg">
          <div class="outcome-bar-fill no" style="width:${Math.max(noPrice * 100, 5)}%">
            <span class="outcome-price">${formatPercent(noPrice, 0)}</span>
          </div>
        </div>
      </div>`;
  }
  return html;
}

function renderEventCard(event, index) {
  const eventData = getEventOutcomes(event);
  const title = event.title || event.markets?.[0]?.question || 'Mercato senza titolo';
  const image = defaultImage(event.image || event.markets?.[0]?.image);
  const volume = event.volume || 0;
  const marketId = event.markets?.[0]?.id || event.id;

  let badges = '';
  if (event.active && !event.closed) badges += '<span class="badge badge-live">LIVE</span>';
  if ((event.volume24hr || 0) > 100000) badges += '<span class="badge badge-hot">HOT</span>';
  if (eventData.isMulti) badges += `<span class="badge badge-category">${eventData.totalChoices} opzioni</span>`;

  const stagger = `stagger-${(index % 6) + 1}`;

  return `
    <div class="market-card fade-in ${stagger}" style="cursor: pointer;" data-market-id="${marketId}">
      <div class="market-card-header">
        <img class="market-card-image" src="${image}" alt="" loading="lazy" onerror="this.src='${getPlaceholder()}'"/>
        <div class="market-card-header-text">
          <div class="market-card-title">${escapeHtml(title)}</div>
          ${badges ? `<div class="market-card-badges">${badges}</div>` : ''}
        </div>
      </div>
      <div class="outcomes-container">
        ${renderOutcomesHtml(eventData)}
      </div>
      <div class="market-card-stats">
        <div class="market-stat">
          <span class="label">Volume</span>
          <span class="value">${formatCurrency(volume)}</span>
        </div>
      </div>
    </div>
  `;
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str || '';
  return str.slice(0, maxLen) + '…';
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
