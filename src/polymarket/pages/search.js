// ==============================
// Search / Explore Page
// ==============================

import { searchEventsAndMarkets, fetchTrendingMarkets } from '../api.js';
import { formatCurrency, formatPercent, formatPriceChange, parseOutcomes, defaultImage, getPlaceholder, debounce } from '../utils.js';
import { navigate } from '../router.js';

const DEGATE_LINK = 'https://app.degate.com/?utm_source=walletanalyzer?s=jack18';

export async function renderSearch(container, query) {
  const isTrending = query === 'trending';
  const displayQuery = isTrending ? '' : decodeURIComponent(query || '');

  container.innerHTML = `
    <div class="search-results-container">
      <button class="back-btn" id="back-btn">← Torna alla Dashboard</button>

      <section class="hero" style="padding:24px 0">
        <h1 style="font-size:28px">${isTrending ? '🔥 Tutti i Mercati Trending' : `🔍 Risultati per "${escapeHtml(displayQuery)}"`}</h1>
      </section>

      <input type="text"
             class="search-big-input"
             id="search-input"
             placeholder="Cerca mercati, eventi, argomenti..."
             value="${escapeHtml(displayQuery)}"
             autocomplete="off" />

      <div id="search-results">
        <div class="markets-grid">
          ${skeletonCards(6)}
        </div>
      </div>

      <!-- Sponsor -->
      <section class="sponsor-banner" style="margin-top:32px">
        <div class="sponsor-badge">⭐ Partner Consigliato</div>
        <h3>Esplora il Trading Decentralizzato</h3>
        <p>DeGate: exchange decentralizzato con zero gas fees su Ethereum.</p>
        <a href="${DEGATE_LINK}" target="_blank" rel="noopener" class="sponsor-cta">
          Inizia con DeGate →
        </a>
      </section>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', () => navigate('/'));

  // Search input with debounce
  const searchInput = document.getElementById('search-input');
  const debouncedSearch = debounce(async (q) => {
    if (q.trim()) {
      await performSearch(q.trim());
    }
  }, 400);

  searchInput?.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });

  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim()) {
      navigate(`/search/${encodeURIComponent(searchInput.value.trim())}`);
    }
  });

  // Initial load
  if (isTrending) {
    await loadTrendingAll();
  } else if (displayQuery) {
    await performSearch(displayQuery);
  }
}

async function loadTrendingAll() {
  const resultsDiv = document.getElementById('search-results');
  if (!resultsDiv) return;

  try {
    const events = await fetchTrendingMarkets();
    if (!events || events.length === 0) {
      resultsDiv.innerHTML = emptyState();
      return;
    }

    resultsDiv.innerHTML = `
      <div class="markets-grid">
        ${events.map((event, i) => renderEventCard(event, i)).join('')}
      </div>
    `;

    bindCardClicks(resultsDiv);
  } catch (err) {
    resultsDiv.innerHTML = errorState();
  }
}

async function performSearch(query) {
  const resultsDiv = document.getElementById('search-results');
  if (!resultsDiv) return;

  resultsDiv.innerHTML = `<div class="markets-grid">${skeletonCards(4)}</div>`;

  try {
    const data = await searchEventsAndMarkets(query);
    const events = data?.events || [];

    if (events.length === 0) {
      resultsDiv.innerHTML = emptyState(query);
      return;
    }

    resultsDiv.innerHTML = `
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">${events.length} risultati trovati</p>
      <div class="markets-grid">
        ${events.map((event, i) => renderEventCard(event, i)).join('')}
      </div>
    `;

    bindCardClicks(resultsDiv);
  } catch (err) {
    resultsDiv.innerHTML = errorState();
  }
}

function bindCardClicks(container) {
  container.querySelectorAll('.market-card').forEach(card => {
    card.addEventListener('click', () => {
      const marketId = card.dataset.marketId;
      if (marketId) navigate(`/market/${marketId}`);
    });
  });
}

function renderEventCard(event, index) {
  const market = event.markets?.[0];
  const outcomes = market ? parseOutcomes(market) : [];
  const yesPrice = outcomes.find(o => o.name === 'Yes')?.price || outcomes[0]?.price || 0;
  const noPrice = outcomes.find(o => o.name === 'No')?.price || outcomes[1]?.price || 0;
  const title = event.title || market?.question || 'Mercato senza titolo';
  const image = defaultImage(event.image || market?.image);
  const volume = event.volume || (market?.volumeNum) || 0;
  const liquidity = event.liquidity || (market?.liquidityNum) || 0;
  const priceChange = market?.oneDayPriceChange;
  const marketId = market?.id || event.markets?.[0]?.id || event.id;

  let badges = '';
  if (event.active && !event.closed) badges += '<span class="badge badge-live">LIVE</span>';
  if ((event.volume24hr || 0) > 100000) badges += '<span class="badge badge-hot">HOT</span>';

  const stagger = `stagger-${(index % 6) + 1}`;

  return `
    <div class="market-card fade-in ${stagger}" data-market-id="${marketId}">
      <div class="market-card-header">
        <img class="market-card-image" src="${image}" alt="" loading="lazy" onerror="this.src='${getPlaceholder()}'"/>
        <div class="market-card-title">${escapeHtml(title)}</div>
      </div>
      ${badges ? `<div class="market-card-badges">${badges}</div>` : ''}
      <div class="outcomes-container">
        ${yesPrice > 0 ? `
        <div class="outcome-row">
          <span class="outcome-label">Sì</span>
          <div class="outcome-bar-bg">
            <div class="outcome-bar-fill yes" style="width:${Math.max(yesPrice * 100, 5)}%">
              <span class="outcome-price">${formatPercent(yesPrice, 0)}</span>
            </div>
          </div>
        </div>` : ''}
        ${noPrice > 0 ? `
        <div class="outcome-row">
          <span class="outcome-label">No</span>
          <div class="outcome-bar-bg">
            <div class="outcome-bar-fill no" style="width:${Math.max(noPrice * 100, 5)}%">
              <span class="outcome-price">${formatPercent(noPrice, 0)}</span>
            </div>
          </div>
        </div>` : ''}
      </div>
      <div class="market-card-stats">
        <div class="market-stat">
          <span class="label">Volume</span>
          <span class="value">${formatCurrency(volume)}</span>
        </div>
        <div class="market-stat">
          <span class="label">Liquidità</span>
          <span class="value">${formatCurrency(liquidity)}</span>
        </div>
        ${priceChange != null ? `
        <div class="market-stat">
          <span class="label">24h</span>
          <span class="value price-change ${priceChange >= 0 ? 'positive' : 'negative'}">
            ${formatPriceChange(priceChange)}
          </span>
        </div>` : ''}
      </div>
    </div>
  `;
}

function skeletonCards(n) {
  return Array(n).fill('<div class="skeleton skeleton-card" style="height:220px;border-radius:16px"></div>').join('');
}

function emptyState(query) {
  return `<div class="empty-state"><div class="empty-icon">🔍</div><p>Nessun risultato${query ? ` per "${escapeHtml(query)}"` : ''}. Prova con un'altra ricerca.</p></div>`;
}

function errorState() {
  return '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Errore nel caricamento. Riprova tra qualche secondo.</p></div>';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
