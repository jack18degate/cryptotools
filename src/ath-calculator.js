/**
 * ATH Recovery Calculator
 * Shows how much a coin needs to rise to return to its All-Time High
 */
import { searchCoins, getCoinData, formatPrice, formatLargeNumber, formatPercentage } from './api.js';

let searchTimeout = null;
let selectedCoin = null;

export function renderATHCalculator() {
  return `
    <div class="page-container">
      <div class="section-header">
        <span class="emoji-icon">📈</span>
        <h1>ATH Recovery Calculator</h1>
        <p>Scopri quanto deve salire una moneta per tornare al suo All-Time High</p>
      </div>

      <div class="glass-card">
        <div class="search-container">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            id="ath-search"
            class="search-input"
            placeholder="Cerca una criptovaluta (es. Bitcoin, Ethereum, Pepe...)"
            autocomplete="off"
          />
          <div id="ath-autocomplete" class="autocomplete-dropdown"></div>
        </div>

        <div id="ath-results"></div>
      </div>
    </div>
  `;
}

export function initATHCalculator() {
  const searchInput = document.getElementById('ath-search');
  const dropdown = document.getElementById('ath-autocomplete');

  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length < 2) {
      dropdown.classList.remove('visible');
      return;
    }

    searchTimeout = setTimeout(async () => {
      try {
        const coins = await searchCoins(query);
        renderDropdown(dropdown, coins);
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 300);
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      dropdown.classList.remove('visible');
    }
  });
}

function renderDropdown(dropdown, coins) {
  if (!coins.length) {
    dropdown.classList.remove('visible');
    return;
  }

  dropdown.innerHTML = coins.map(coin => `
    <div class="autocomplete-item" data-coin-id="${coin.id}">
      <img src="${coin.thumb}" alt="${coin.name}" onerror="this.style.display='none'" />
      <div>
        <span class="coin-name">${coin.name}</span>
        <span class="coin-symbol">${coin.symbol}</span>
      </div>
    </div>
  `).join('');

  dropdown.classList.add('visible');

  // Attach click handlers
  dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      const coinId = item.dataset.coinId;
      const coinName = item.querySelector('.coin-name').textContent;
      document.getElementById('ath-search').value = coinName;
      dropdown.classList.remove('visible');
      loadCoinATH(coinId);
    });
  });
}

async function loadCoinATH(coinId) {
  const resultsDiv = document.getElementById('ath-results');

  resultsDiv.innerHTML = `
    <div class="loading-overlay">
      <div class="spinner"></div>
      <span>Caricamento dati...</span>
    </div>
  `;

  try {
    const coin = await getCoinData(coinId);
    selectedCoin = coin;
    renderATHResults(resultsDiv, coin);
  } catch (err) {
    resultsDiv.innerHTML = `<div class="error-msg">❌ ${err.message}</div>`;
  }
}

function renderATHResults(container, coin) {
  const currentPrice = coin.currentPrice;
  const ath = coin.ath;

  if (!currentPrice || !ath) {
    container.innerHTML = `<div class="error-msg">❌ Dati ATH non disponibili per questa moneta.</div>`;
    return;
  }

  // Calculate the percentage needed to reach ATH from current price
  const pctToATH = ((ath - currentPrice) / currentPrice) * 100;
  // How much of the ATH has been recovered (progress bar)
  const progressPct = Math.min((currentPrice / ath) * 100, 100);
  // Multiplier needed
  const multiplier = ath / currentPrice;

  const athDate = coin.athDate ? new Date(coin.athDate).toLocaleDateString('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric'
  }) : '—';

  const isAtATH = pctToATH <= 0.5;

  container.innerHTML = `
    <div class="results-area">
      <div class="coin-header">
        <img src="${coin.image}" alt="${coin.name}" onerror="this.style.display='none'" />
        <div class="coin-info">
          <h2>${coin.name}</h2>
          <span class="symbol">${coin.symbol} · Rank #${coin.marketCapRank || '—'}</span>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Prezzo Attuale</div>
          <div class="stat-value">${formatPrice(currentPrice)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">All-Time High</div>
          <div class="stat-value gold">${formatPrice(ath)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Data ATH</div>
          <div class="stat-value" style="font-size:0.95rem">${athDate}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Market Cap</div>
          <div class="stat-value">${formatLargeNumber(coin.marketCap)}</div>
        </div>
      </div>

      ${isAtATH ? `
        <div class="ath-big-number">
          <div class="label">🎉 Questa moneta è al suo ATH!</div>
          <div class="value" style="font-size:2rem; background: linear-gradient(135deg, var(--accent-gold), var(--accent-orange)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;">ALL-TIME HIGH</div>
        </div>
      ` : `
        <div class="ath-big-number">
          <div class="label">Deve salire del</div>
          <div class="value">+${pctToATH.toFixed(1)}%</div>
        </div>

        <div style="text-align:center; margin-bottom:24px;">
          <span style="font-size:0.9rem; color:var(--text-secondary);">
            Serve un <strong style="color:var(--accent-purple);">${multiplier.toFixed(2)}x</strong> per tornare all'ATH
          </span>
        </div>

        <div class="ath-progress-container">
          <div class="ath-progress-label">
            <span>Progresso verso ATH</span>
            <span>${progressPct.toFixed(1)}%</span>
          </div>
          <div class="ath-progress-bar">
            <div class="ath-progress-fill" style="width: 0%;" id="ath-progress-fill"></div>
          </div>
        </div>
      `}

      <div class="stat-grid" style="margin-top:24px;">
        <div class="stat-card">
          <div class="stat-label">24h</div>
          <div class="stat-value ${coin.priceChangePercentage24h >= 0 ? 'green' : 'red'}">
            ${formatPercentage(coin.priceChangePercentage24h)}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">7 giorni</div>
          <div class="stat-value ${coin.priceChangePercentage7d >= 0 ? 'green' : 'red'}">
            ${formatPercentage(coin.priceChangePercentage7d)}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">30 giorni</div>
          <div class="stat-value ${coin.priceChangePercentage30d >= 0 ? 'green' : 'red'}">
            ${formatPercentage(coin.priceChangePercentage30d)}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">1 anno</div>
          <div class="stat-value ${coin.priceChangePercentage1y >= 0 ? 'green' : 'red'}">
            ${formatPercentage(coin.priceChangePercentage1y)}
          </div>
        </div>
      </div>

      <div style="text-align:center; margin-top:20px; color:var(--text-muted); font-size:0.78rem;">
        Dall'ATH: <strong style="color:var(--accent-red);">${formatPercentage(coin.athChangePercentage)}</strong>
        &nbsp;·&nbsp; Volume 24h: ${formatLargeNumber(coin.totalVolume)}
      </div>
    </div>
  `;

  // Animate progress bar
  if (!isAtATH) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const fill = document.getElementById('ath-progress-fill');
        if (fill) fill.style.width = progressPct.toFixed(1) + '%';
      });
    });
  }
}
