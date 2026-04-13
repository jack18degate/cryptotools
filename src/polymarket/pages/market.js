// ==============================
// Market Detail Page
// ==============================

import { getMarketById, getPriceHistory } from '../api.js';
import { formatCurrency, formatPercent, formatPriceChange, parseOutcomes, parseClobTokenIds, defaultImage, getPlaceholder } from '../utils.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const DEGATE_LINK = 'https://app.degate.com/?utm_source=walletanalyzer?s=jack18';

let chartInstance = null;

export async function renderMarketDetail(container, marketId, onBack) {
  // Prevent ghost charts
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  container.innerHTML = `
    <div class="market-detail">
      <button class="back-btn" id="pm-back-btn">← Torna indietro</button>
      <div style="text-align:center;padding:60px 0">
        <div class="skeleton" style="width:80px;height:80px;border-radius:12px;margin:0 auto 16px"></div>
        <div class="skeleton" style="width:300px;height:24px;margin:0 auto 8px"></div>
        <div class="skeleton" style="width:200px;height:16px;margin:0 auto"></div>
      </div>
    </div>
  `;

  document.getElementById('pm-back-btn')?.addEventListener('click', onBack);

  try {
    const market = await getMarketById(marketId);
    if (!market) {
      container.innerHTML = `
        <div class="market-detail">
          <button class="back-btn" id="pm-back-btn">← Torna indietro</button>
          <div class="empty-state">
            <div class="empty-icon">❌</div>
            <p>Mercato non trovato</p>
          </div>
        </div>
      `;
      document.getElementById('pm-back-btn')?.addEventListener('click', onBack);
      return;
    }

    const outcomes = parseOutcomes(market);
    const tokenIds = parseClobTokenIds(market);
    const image = defaultImage(market.image);
    const title = market.question || market.groupItemTitle || 'Mercato';
    const description = market.description || '';
    const slug = market.slug || '';
    const polymarketUrl = slug ? `https://polymarket.com/event/${slug}` : 'https://polymarket.com';

    container.innerHTML = `
      <div class="market-detail fade-in">
        <button class="back-btn" id="pm-back-btn">← Torna indietro</button>

        <div class="market-detail-header">
          <img class="market-detail-image" src="${image}" alt="" onerror="this.src='${getPlaceholder()}'" />
          <div>
            <h1 class="market-detail-title">${escapeHtml(title)}</h1>
            <div class="market-card-badges">
              ${market.active && !market.closed ? '<span class="badge badge-live">LIVE</span>' : ''}
              ${market.closed ? '<span class="badge" style="background:var(--red-bg);color:var(--red)">CHIUSO</span>' : ''}
              ${market.category ? `<span class="badge badge-category">${escapeHtml(market.category)}</span>` : ''}
            </div>
          </div>
        </div>

        ${description ? `<p class="market-detail-desc">${escapeHtml(description).slice(0, 500)}${description.length > 500 ? '...' : ''}</p>` : ''}

        <!-- Outcomes -->
        <div class="outcomes-container" style="margin-bottom:24px">
          ${outcomes.map(o => `
            <div class="outcome-row" style="margin-bottom:8px">
              <span class="outcome-label" style="min-width:80px;font-size:14px;font-weight:600">${escapeHtml(o.name)}</span>
              <div class="outcome-bar-bg" style="height:32px">
                <div class="outcome-bar-fill ${o.name.toLowerCase() === 'yes' || o.name.toLowerCase() === 'sì' ? 'yes' : 'no'}"
                     style="width:${Math.max(o.price * 100, 5)}%">
                  <span class="outcome-price" style="font-size:14px">${formatPercent(o.price, 1)}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Stats Grid -->
        <div class="stats-row" style="margin-bottom:24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px;">
          <div class="stat-card" style="background: var(--bg-card); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
            <div class="stat-label" style="color:var(--text-secondary); font-size:12px; margin-bottom:4px">Volume</div>
            <div class="stat-value" style="font-size:22px; font-family:var(--font-mono); font-weight:700;">${formatCurrency(market.volumeNum || market.volume)}</div>
          </div>
          <div class="stat-card" style="background: var(--bg-card); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
            <div class="stat-label" style="color:var(--text-secondary); font-size:12px; margin-bottom:4px">Liquidità</div>
            <div class="stat-value" style="font-size:22px; font-family:var(--font-mono); font-weight:700;">${formatCurrency(market.liquidityNum || market.liquidity)}</div>
          </div>
        </div>

        <!-- Price Chart -->
        ${tokenIds.length > 0 ? `
        <div class="chart-container">
          <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">📈 Storico Prezzi</h3>
          <div class="chart-controls" id="chart-controls">
            <button class="chart-btn" data-interval="1h">1h</button>
            <button class="chart-btn" data-interval="6h">6h</button>
            <button class="chart-btn active" data-interval="1d">1g</button>
            <button class="chart-btn" data-interval="1w">1s</button>
            <button class="chart-btn" data-interval="1m">1m</button>
            <button class="chart-btn" data-interval="all">Tutto</button>
          </div>
          <div class="chart-wrapper">
            <canvas id="price-chart"></canvas>
          </div>
        </div>
        ` : ''}

        <!-- Actions -->
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px">
          <a href="${polymarketUrl}" target="_blank" rel="noopener" class="market-detail-link" style="padding: 12px 24px; background: var(--accent-gradient); border-radius: 8px; color: white; text-decoration: none; font-weight: 600;">
            🔗 Apri su Polymarket
          </a>
        </div>

        <!-- Sponsor -->
        <section class="sponsor-banner" style="margin-top:32px">
          <div class="sponsor-badge">⭐ Partner Consigliato</div>
          <h3>Fai Trading con DeGate</h3>
          <p>Exchange decentralizzato, zero gas fees, la sicurezza di Ethereum.</p>
          <a href="${DEGATE_LINK}" target="_blank" rel="noopener" class="sponsor-cta">
            Scopri DeGate →
          </a>
        </section>
      </div>
    `;

    // Bind back button
    document.getElementById('pm-back-btn')?.addEventListener('click', onBack);

    // Load chart if we have token IDs
    if (tokenIds.length > 0) {
      loadPriceChart(tokenIds[0], '1d');

      // Bind chart interval buttons
      document.getElementById('chart-controls')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.chart-btn');
        if (!btn) return;
        document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadPriceChart(tokenIds[0], btn.dataset.interval);
      });
    }

  } catch (err) {
    console.error('Error loading market detail:', err);
    container.innerHTML = `
      <div class="market-detail">
        <button class="back-btn" id="pm-back-btn">← Torna indietro</button>
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <p>Errore nel caricamento del mercato</p>
        </div>
      </div>
    `;
    document.getElementById('pm-back-btn')?.addEventListener('click', onBack);
  }
}

async function loadPriceChart(tokenId, interval) {
  const canvas = document.getElementById('price-chart');
  if (!canvas) return;

  try {
    const data = await getPriceHistory(tokenId, interval);
    if (!data?.history || data.history.length === 0) return;

    const labels = data.history.map(p => {
      const date = new Date(p.t * 1000);
      if (interval === '1h' || interval === '6h' || interval === '1d') {
        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    });

    const prices = data.history.map(p => p.p);

    if (chartInstance) chartInstance.destroy();

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(124, 58, 237, 0.3)');
    gradient.addColorStop(1, 'rgba(124, 58, 237, 0.0)');

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: prices,
          borderColor: '#7c3aed',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(12, 18, 34, 0.95)',
            callbacks: { label: (ctx) => `Probabilità: ${(ctx.raw * 100).toFixed(1)}%` }
          }
        },
        scales: {
          x: { ticks: { color: '#64748b', maxTicksLimit: 8 } },
          y: { min: 0, max: 1, ticks: { color: '#64748b', callback: (val) => `${(val * 100).toFixed(0)}%` } }
        }
      }
    });
  } catch (err) {
    console.error('Error loading price chart:', err);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
