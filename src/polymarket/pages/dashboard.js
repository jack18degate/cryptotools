// ==============================
// Dashboard Page
// ==============================

import { fetchTrendingMarkets, fetchItalyEvents } from '../api.js';
import { formatCurrency, formatPercent, formatPriceChange, parseOutcomes, defaultImage, getPlaceholder, timeAgo } from '../utils.js';
import { navigate } from '../router.js';

const DEGATE_LINK = 'https://app.degate.com/?utm_source=walletanalyzer?s=jack18';
const MIN_VOLUME = 5000;

export async function renderDashboard(container) {
  container.innerHTML = `
    <!-- Hero -->
    <section class="hero fade-in" style="padding:24px 0 16px">
      <div class="hero-badge">🔮 Powered by Polymarket API</div>
      <h1 style="font-size:clamp(24px,4vw,38px)">Il Futuro ha un <span class="gradient-text">Prezzo</span></h1>
      <p style="font-size:14px;margin-bottom:20px">Scopri i mercati predittivi. Clicca su una scommessa per calcolare quanto potresti guadagnare.</p>
    </section>

    <!-- Stats Row (compact) -->
    <div class="stats-row-compact" id="stats-row">
      <div class="stat-compact skeleton" style="height:36px;width:150px;border-radius:8px"></div>
      <div class="stat-compact skeleton" style="height:36px;width:150px;border-radius:8px"></div>
      <div class="stat-compact skeleton" style="height:36px;width:150px;border-radius:8px"></div>
    </div>

    <!-- ITALIA FIRST -->
    <div class="section-header" id="italy-section-header">
      <h2>🇮🇹 Scommesse Italia</h2>
    </div>
    <div class="markets-grid" id="italy-grid">
      ${skeletonCards(6)}
    </div>

    <!-- Trending -->
    <div class="section-header">
      <h2>🔥 Mercati Trending Globali</h2>
      <a class="see-all" data-nav="/search/trending">Vedi tutti →</a>
    </div>
    <div class="markets-grid" id="trending-grid">
      ${skeletonCards(6)}
    </div>

    <!-- Calculator -->
    <div class="section-header" id="calc-section">
      <h2>🧮 Calcolatore Opportunità</h2>
    </div>
    <section class="calculator-section fade-in">
      <div id="calc-selected-bet" class="calc-selected-bet" style="display:none"></div>

      <!-- Outcome selector for multi-choice events -->
      <div id="calc-outcome-selector" class="calc-outcome-selector" style="display:none"></div>

      <div class="calc-grid">
        <div class="calc-inputs">
          <div class="input-group">
            <label>💰 Importo Investimento (USD)</label>
            <input type="number" id="calc-amount" value="100" min="1" step="10" />
          </div>
          <div class="input-group">
            <label>📊 Probabilità Attuale (prezzo "Sì")</label>
            <input type="range" id="calc-prob" min="1" max="99" value="35" style="accent-color: var(--accent-primary)" />
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted)">
              <span>1%</span>
              <span id="calc-prob-label" style="font-family:var(--font-mono);color:var(--text-accent);font-weight:700">35%</span>
              <span>99%</span>
            </div>
          </div>
          <div class="input-group">
            <label>🎯 Esito: Scommetti che succederà (Sì)</label>
          </div>
        </div>
        <div class="calc-results">
          <h3 style="font-size:16px;margin-bottom:16px;color:var(--text-accent)">📈 Se hai ragione</h3>
          <div class="calc-result-item">
            <span class="calc-result-label">Shares acquistate</span>
            <span class="calc-result-value neutral" id="calc-shares">285.7</span>
          </div>
          <div class="calc-result-item">
            <span class="calc-result-label">Ricavo totale</span>
            <span class="calc-result-value profit" id="calc-payout">$285.71</span>
          </div>
          <div class="calc-result-item">
            <span class="calc-result-label">Profitto netto</span>
            <span class="calc-result-value profit" id="calc-profit">+$185.71</span>
          </div>
          <div class="calc-result-item">
            <span class="calc-result-label">ROI</span>
            <span class="calc-result-value profit" id="calc-roi">+185.7%</span>
          </div>
          <div style="border-top:1px solid rgba(255,255,255,0.05);margin-top:12px;padding-top:12px">
            <div class="calc-result-item">
              <span class="calc-result-label">❌ Se hai torto</span>
              <span class="calc-result-value loss" id="calc-loss">-$100.00</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Guide -->
    <div class="section-header">
      <h2>📚 Cos'è Polymarket?</h2>
    </div>
    <section class="guide-section">
      <div class="guide-grid">
        <div class="guide-card fade-in stagger-1">
          <div class="guide-icon">🔮</div>
          <h3>Mercati Predittivi</h3>
          <p>Polymarket è il più grande mercato predittivo al mondo. Puoi comprare "shares" su eventi futuri: se hai ragione, guadagni; se sbagli, perdi l'investimento.</p>
        </div>
        <div class="guide-card fade-in stagger-2">
          <div class="guide-icon">💱</div>
          <h3>Come Funziona il Prezzo</h3>
          <p>Il prezzo di una share riflette la probabilità percepita. Se "Sì" costa $0.35, il mercato stima una probabilità del 35%. Se l'evento si avvera, ogni share vale $1.</p>
        </div>
        <div class="guide-card fade-in stagger-3">
          <div class="guide-icon">📊</div>
          <h3>Perché è Utile</h3>
          <p>I prediction markets sono spesso più accurati dei sondaggi tradizionali. I partecipanti mettono soldi veri, incentivando previsioni oneste e informate.</p>
        </div>
        <div class="guide-card fade-in stagger-4">
          <div class="guide-icon">🇮🇹</div>
          <h3>Per l'Italia</h3>
          <p>Questo tool ti mostra i mercati più interessanti per il pubblico italiano: politica, economia, sport e tecnologia, tutto tradotto e spiegato.</p>
        </div>
      </div>
    </section>

    <!-- Sponsor -->
    <section class="sponsor-banner fade-in">
      <div class="sponsor-badge">⭐ Partner Consigliato</div>
      <h3>Prova DeGate — Wallet Web3 Multichain</h3>
      <p>Wallet selfcustody con prodotti DeFi integrati: trading, bridge, e gestione asset in totale sicurezza.</p>
      <a href="${DEGATE_LINK}" target="_blank" rel="noopener" class="sponsor-cta">
        Prova DeGate Gratis →
      </a>
    </section>
  `;

  // Bind navigation
  container.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.dataset.nav);
    });
  });

  // Calculator logic
  setupCalculator();

  // Load data
  loadItalyEvents(container);
  loadTrending(container);
  loadStats(container);
}

function skeletonCards(n) {
  return Array(n).fill('<div class="skeleton skeleton-card" style="height:220px;border-radius:16px"></div>').join('');
}

// ==============================
// CALCULATOR with bet pre-fill and outcome selector
// ==============================

// Store current event data for outcome selector
let currentCalcEvent = null;

function scrollToCalculator(betTitle, yesPrice, eventData) {
  const calcSection = document.getElementById('calc-section');
  const probSlider = document.getElementById('calc-prob');
  const selectedBet = document.getElementById('calc-selected-bet');
  const outcomeSelector = document.getElementById('calc-outcome-selector');

  currentCalcEvent = eventData || null;

  const probPercent = Math.max(1, Math.min(99, Math.round(yesPrice * 100)));
  if (probSlider) {
    probSlider.value = probPercent;
    probSlider.dispatchEvent(new Event('input'));
  }

  // Show selected bet banner
  if (selectedBet) {
    selectedBet.style.display = 'block';
    selectedBet.innerHTML = `
      <div class="calc-bet-name">
        <span class="calc-bet-icon">🎯</span>
        <span>Stai calcolando per: <strong>${escapeHtml(betTitle)}</strong></span>
        <span class="calc-bet-prob">${probPercent}%</span>
      </div>
    `;
  }

  // Show outcome selector for multi-choice events
  if (outcomeSelector) {
    if (eventData && eventData.allOutcomes && eventData.allOutcomes.length > 1) {
      const options = eventData.allOutcomes;
      outcomeSelector.style.display = 'block';
      outcomeSelector.innerHTML = `
        <div class="calc-outcome-header">🎯 Scegli l'opzione su cui scommettere:</div>
        <div class="calc-outcome-pills">
          ${options.map((o, i) => {
            const pct = Math.round(o.price * 100);
            const isActive = Math.round(yesPrice * 100) === pct && i === 0 ? 'active' : '';
            return `<button class="calc-outcome-pill ${isActive}" data-prob="${o.price}" data-name="${escapeAttr(o.name)}">${escapeHtml(truncate(o.name, 22))} <span class="pill-pct">${pct}%</span></button>`;
          }).join('')}
        </div>
      `;

      // Mark the first one active if none matches
      const pills = outcomeSelector.querySelectorAll('.calc-outcome-pill');
      const hasActive = [...pills].some(p => p.classList.contains('active'));
      if (!hasActive && pills.length > 0) pills[0].classList.add('active');

      // Bind pill clicks
      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          pills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');

          const prob = parseFloat(pill.dataset.prob || 0.5);
          const name = pill.dataset.name || '';
          const newPct = Math.max(1, Math.min(99, Math.round(prob * 100)));

          if (probSlider) {
            probSlider.value = newPct;
            probSlider.dispatchEvent(new Event('input'));
          }

          // Update banner
          if (selectedBet) {
            selectedBet.innerHTML = `
              <div class="calc-bet-name">
                <span class="calc-bet-icon">🎯</span>
                <span>Stai calcolando per: <strong>${escapeHtml(betTitle)}</strong> → <em>${escapeHtml(name)}</em></span>
                <span class="calc-bet-prob">${newPct}%</span>
              </div>
            `;
          }
        });
      });
    } else {
      outcomeSelector.style.display = 'none';
      outcomeSelector.innerHTML = '';
    }
  }

  if (calcSection) {
    calcSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function setupCalculator() {
  const amountInput = document.getElementById('calc-amount');
  const probSlider = document.getElementById('calc-prob');

  function updateCalc() {
    const amount = parseFloat(amountInput?.value || 100);
    const prob = parseInt(probSlider?.value || 35) / 100;

    const price = prob;
    const shares = amount / price;
    const payout = shares * 1;
    const profit = payout - amount;
    const roi = (profit / amount) * 100;

    const probLabel = document.getElementById('calc-prob-label');
    if (probLabel) probLabel.textContent = `${Math.round(prob * 100)}%`;

    const sharesEl = document.getElementById('calc-shares');
    if (sharesEl) sharesEl.textContent = shares.toFixed(1);

    const payoutEl = document.getElementById('calc-payout');
    if (payoutEl) payoutEl.textContent = `$${payout.toFixed(2)}`;

    const profitEl = document.getElementById('calc-profit');
    if (profitEl) profitEl.textContent = `+$${profit.toFixed(2)}`;

    const roiEl = document.getElementById('calc-roi');
    if (roiEl) roiEl.textContent = `+${roi.toFixed(1)}%`;

    const lossEl = document.getElementById('calc-loss');
    if (lossEl) lossEl.textContent = `-$${amount.toFixed(2)}`;
  }

  amountInput?.addEventListener('input', updateCalc);
  probSlider?.addEventListener('input', updateCalc);
  updateCalc();
}

// ==============================
// DATA LOADERS
// ==============================

async function loadStats(container) {
  const statsRow = container.querySelector('#stats-row');
  if (!statsRow) return;

  try {
    const events = await fetchTrendingMarkets();
    let totalVolume = 0;
    let totalLiquidity = 0;
    let activeMarkets = 0;

    for (const event of events || []) {
      totalVolume += event.volume || 0;
      totalLiquidity += event.liquidity || 0;
      if (event.markets) activeMarkets += event.markets.length;
    }

    statsRow.innerHTML = `
      <div class="stat-compact fade-in">
        <span class="stat-compact-label">📊 Volume</span>
        <span class="stat-compact-value">${formatCurrency(totalVolume)}</span>
      </div>
      <div class="stat-compact fade-in">
        <span class="stat-compact-label">💧 Liquidità</span>
        <span class="stat-compact-value">${formatCurrency(totalLiquidity)}</span>
      </div>
      <div class="stat-compact fade-in">
        <span class="stat-compact-label">📈 Mercati</span>
        <span class="stat-compact-value">${activeMarkets}</span>
      </div>
    `;
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function loadTrending(container) {
  const grid = container.querySelector('#trending-grid');
  if (!grid) return;

  try {
    const events = await fetchTrendingMarkets();
    if (!events || events.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>Nessun mercato trending disponibile</p></div>';
      return;
    }

    const filtered = filterEvents(events);

    grid.innerHTML = filtered.slice(0, 6).map((event, i) =>
      renderEventCard(event, i)
    ).join('');

    bindCardClicks(grid);
  } catch (err) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Errore nel caricamento dei dati</p></div>';
  }
}

async function loadItalyEvents(container) {
  const grid = container.querySelector('#italy-grid');
  const header = container.querySelector('#italy-section-header');
  if (!grid) return;

  try {
    const events = await fetchItalyEvents();
    if (!events || events.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🇮🇹</div><p>Nessun mercato Italia al momento</p></div>';
      return;
    }

    const filtered = filterEvents(events);

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🇮🇹</div><p>Nessun mercato Italia attivo con volume superiore a $5K</p></div>';
      return;
    }

    if (header) header.style.display = 'flex';

    grid.innerHTML = filtered.slice(0, 8).map((event, i) =>
      renderEventCard(event, i)
    ).join('');

    bindCardClicks(grid);
  } catch (err) {
    console.error('Error loading Italy events:', err);
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Errore nel caricamento dei dati Italia</p></div>';
  }
}

// ==============================
// HELPERS
// ==============================

function filterEvents(events) {
  const now = new Date();

  return events.filter(event => {
    // Filter by volume
    const vol = event.volume || event.volume24hr || 0;
    if (vol < MIN_VOLUME) return false;

    // Filter out closed/resolved/inactive events
    if (event.closed) return false;
    if (!event.active) return false;
    if (event.resolved) return false;

    // Filter out events with endDate/endDateIso/expirationDate in the past
    const endDateStr = event.endDate || event.endDateIso || event.end_date_iso || event.expirationDate;
    if (endDateStr) {
      const end = new Date(endDateStr);
      if (!isNaN(end.getTime()) && end < now) return false;
    }

    // Filter out events where ALL sub-markets are closed or resolved
    const markets = event.markets || [];
    if (markets.length > 0) {
      const allClosed = markets.every(m => m.closed || m.resolved);
      if (allClosed) return false;

      // Check individual market end dates
      const allPast = markets.every(m => {
        const mEnd = m.endDate || m.endDateIso || m.end_date_iso;
        if (mEnd) {
          const d = new Date(mEnd);
          return !isNaN(d.getTime()) && d < now;
        }
        return false;
      });
      if (allPast) return false;
    }

    return true;
  });
}

function bindCardClicks(grid) {
  grid.querySelectorAll('.market-card').forEach(card => {
    // Store parsed event data in a data attribute
    const eventDataStr = card.dataset.eventOutcomes;
    let eventData = null;
    try { eventData = JSON.parse(eventDataStr); } catch { /* ignore */ }

    const calcBtn = card.querySelector('.calc-trigger');
    if (calcBtn) {
      calcBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const title = card.dataset.betTitle || '';
        const prob = parseFloat(card.dataset.betProb || 0.5);
        scrollToCalculator(title, prob, eventData);
      });
    }

    card.addEventListener('click', (e) => {
      if (e.target.closest('.detail-link')) return;
      if (e.target.closest('.calc-trigger')) return;
      const title = card.dataset.betTitle || '';
      const prob = parseFloat(card.dataset.betProb || 0.5);
      scrollToCalculator(title, prob, eventData);
    });
  });
}

// ==============================
// EVENT CARD — handles both Yes/No and multi-choice
// ==============================

function getEventOutcomes(event) {
  const markets = event.markets || [];

  // Single market → binary Yes/No
  if (markets.length <= 1) {
    const market = markets[0];
    if (!market) return { isMulti: false, outcomes: [], topProb: 0, allOutcomes: [] };

    const parsed = parseOutcomes(market);
    const yesPrice = parsed.find(o => o.name === 'Yes')?.price || parsed[0]?.price || 0;
    const noPrice = parsed.find(o => o.name === 'No')?.price || parsed[1]?.price || 0;
    return {
      isMulti: false,
      outcomes: parsed,
      topProb: yesPrice,
      allOutcomes: [
        { name: 'Sì (succederà)', price: yesPrice },
        { name: 'No (non succederà)', price: noPrice },
      ],
    };
  }

  // Multiple markets → multi-choice
  const choices = markets
    .map(m => {
      const parsed = parseOutcomes(m);
      const yesPrice = parsed.find(o => o.name === 'Yes')?.price || parsed[0]?.price || 0;
      const name = m.groupItemTitle || m.question || 'Opzione';
      return { name, price: yesPrice, marketId: m.id };
    })
    .filter(c => c.price > 0)
    .sort((a, b) => b.price - a.price);

  return {
    isMulti: true,
    outcomes: choices.slice(0, 5),
    topProb: choices[0]?.price || 0,
    totalChoices: choices.length,
    allOutcomes: choices, // full list for calculator
  };
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

  // Binary Yes/No
  const yesPrice = eventData.outcomes.find(o => o.name === 'Yes')?.price || eventData.outcomes[0]?.price || 0;
  const noPrice = eventData.outcomes.find(o => o.name === 'No')?.price || eventData.outcomes[1]?.price || 0;

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
  const liquidity = event.liquidity || 0;
  const priceChange = event.markets?.[0]?.oneDayPriceChange;
  const marketId = event.markets?.[0]?.id || event.id;

  // Badges — placed inline under title
  let badges = '';
  if (event.active && !event.closed) badges += '<span class="badge badge-live">LIVE</span>';
  if ((event.volume24hr || 0) > 100000) badges += '<span class="badge badge-hot">HOT</span>';
  if (eventData.isMulti) badges += `<span class="badge badge-category">${eventData.totalChoices} opzioni</span>`;

  const stagger = `stagger-${(index % 6) + 1}`;

  // Serialize eventData for the calculator (only essential info)
  const calcData = JSON.stringify({
    isMulti: eventData.isMulti,
    allOutcomes: (eventData.allOutcomes || []).slice(0, 20).map(o => ({ name: o.name, price: o.price })),
  }).replace(/"/g, '&quot;');

  return `
    <div class="market-card fade-in ${stagger}"
         data-market-id="${marketId}"
         data-bet-title="${escapeAttr(title)}"
         data-bet-prob="${eventData.topProb}"
         data-event-outcomes="${calcData}">
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
        ${liquidity > 0 ? `
        <div class="market-stat">
          <span class="label">Liquidità</span>
          <span class="value">${formatCurrency(liquidity)}</span>
        </div>` : ''}
        ${priceChange != null ? `
        <div class="market-stat">
          <span class="label">24h</span>
          <span class="value price-change ${priceChange >= 0 ? 'positive' : 'negative'}">
            ${formatPriceChange(priceChange)}
          </span>
        </div>` : ''}
      </div>
      <div class="market-card-actions">
        <button class="calc-trigger">🧮 Calcola Guadagno</button>
        <a class="detail-link" data-nav-detail="${marketId}">📊 Dettaglio</a>
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
