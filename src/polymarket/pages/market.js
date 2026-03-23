// ==============================
// Market Detail Page
// ==============================

import { getMarketById, getPriceHistory } from '../api.js';
import { formatCurrency, formatPercent, formatPriceChange, parseOutcomes, parseClobTokenIds, defaultImage, getPlaceholder, timeAgo } from '../utils.js';
import { navigate } from '../router.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const DEGATE_LINK = 'https://app.degate.com/?utm_source=walletanalyzer?s=jack18';

let chartInstance = null;

export async function renderMarketDetail(container, marketId) {
  container.innerHTML = `
    <div class="market-detail">
      <button class="back-btn" id="back-btn">← Torna alla Dashboard</button>
      <div style="text-align:center;padding:60px 0">
        <div class="skeleton" style="width:80px;height:80px;border-radius:12px;margin:0 auto 16px"></div>
        <div class="skeleton" style="width:300px;height:24px;margin:0 auto 8px"></div>
        <div class="skeleton" style="width:200px;height:16px;margin:0 auto"></div>
      </div>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', () => navigate('/'));

  try {
    const market = await getMarketById(marketId);
    if (!market) {
      container.innerHTML = `
        <div class="market-detail">
          <button class="back-btn" id="back-btn">← Torna alla Dashboard</button>
          <div class="empty-state">
            <div class="empty-icon">❌</div>
            <p>Mercato non trovato</p>
          </div>
        </div>
      `;
      document.getElementById('back-btn')?.addEventListener('click', () => navigate('/'));
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
        <button class="back-btn" id="back-btn">← Torna alla Dashboard</button>

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
        <div class="stats-row" style="margin-bottom:24px">
          <div class="stat-card">
            <div class="stat-label">Volume</div>
            <div class="stat-value" style="font-size:22px">${formatCurrency(market.volumeNum || market.volume)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Liquidità</div>
            <div class="stat-value" style="font-size:22px">${formatCurrency(market.liquidityNum || market.liquidity)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Variazione 24h</div>
            <div class="stat-value price-change ${(market.oneDayPriceChange || 0) >= 0 ? 'positive' : 'negative'}" style="font-size:22px">
              ${formatPriceChange(market.oneDayPriceChange)}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Spread</div>
            <div class="stat-value" style="font-size:22px">${market.spread != null ? formatPercent(market.spread / 100, 2) : 'N/A'}</div>
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
          <a href="${polymarketUrl}" target="_blank" rel="noopener" class="market-detail-link">
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
    document.getElementById('back-btn')?.addEventListener('click', () => navigate('/'));

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
        <button class="back-btn" id="back-btn">← Torna alla Dashboard</button>
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <p>Errore nel caricamento del mercato</p>
        </div>
      </div>
    `;
    document.getElementById('back-btn')?.addEventListener('click', () => navigate('/'));
  }

  // Cleanup function
  return () => {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  };
}

async function loadPriceChart(tokenId, interval) {
  const canvas = document.getElementById('price-chart');
  if (!canvas) return;

  try {
    const data = await getPriceHistory(tokenId, interval);
    if (!data?.history || data.history.length === 0) {
      return;
    }

    const labels = data.history.map(p => {
      const date = new Date(p.t * 1000);
      if (interval === '1h' || interval === '6h') {
        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      }
      if (interval === '1d') {
        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    });

    const prices = data.history.map(p => p.p);

    if (chartInstance) {
      chartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(124, 58, 237, 0.3)');
    gradient.addColorStop(1, 'rgba(124, 58, 237, 0.0)');

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Prezzo',
          data: prices,
          borderColor: '#7c3aed',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#7c3aed',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(12, 18, 34, 0.95)',
            titleColor: '#f1f5f9',
            bodyColor: '#f1f5f9',
            borderColor: 'rgba(124, 58, 237, 0.3)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `Probabilità: ${(ctx.raw * 100).toFixed(1)}%`,
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: '#64748b',
              font: { size: 10 },
              maxTicksLimit: 8,
            }
          },
          y: {
            min: 0,
            max: 1,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: '#64748b',
              font: { size: 10 },
              callback: (val) => `${(val * 100).toFixed(0)}%`,
            }
          }
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
