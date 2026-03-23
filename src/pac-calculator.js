/**
 * PAC vs Investimento Singolo Calculator
 * Compare Dollar-Cost Averaging (PAC) vs Single Investment
 */
import { searchCoins, getCoinData, getMarketChart, formatPrice, formatPercentage } from './api.js';
import Chart from 'chart.js/auto';

let searchTimeout = null;
let currentChart = null;
let lastCoinId = null;
let lastCoinInfo = null;
let lastPriceData = null;
let selectedInterval = 7; // default: settimanale
let selectedDuration = 365; // default: 1 anno

const DURATIONS = [
  { key: '180', label: '6 Mesi', days: 180, fetchDays: 180, descLabel: '6 mesi' },
  { key: '365', label: '1 Anno', days: 365, fetchDays: 365, descLabel: '1 anno' },
  { key: '730', label: '2 Anni', days: 730, fetchDays: 730, descLabel: '2 anni' },
  { key: '1825', label: '5 Anni', days: 1825, fetchDays: 1825, descLabel: '5 anni' },
  { key: '3650', label: '10 Anni', days: 3650, fetchDays: 3650, descLabel: '10 anni' },
];

const INTERVALS = [
  { key: 'daily', label: 'Giornaliero', days: 1, emoji: '📅', descLabel: 'giornaliera' },
  { key: 'weekly', label: 'Settimanale', days: 7, emoji: '📆', descLabel: 'settimanale' },
  { key: 'biweekly', label: 'Bimensile', days: 14, emoji: '🗓️', descLabel: 'bimensile' },
  { key: 'monthly', label: 'Mensile', days: 30, emoji: '📋', descLabel: 'mensile' },
];

export function renderPACCalculator() {
  return `
    <div class="page-container">
      <div class="section-header">
        <span class="emoji-icon">💰</span>
        <h1>PAC vs Investimento Singolo</h1>
        <p>Confronta il rendimento di un Piano di Accumulo (PAC) vs un investimento in un'unica soluzione</p>
      </div>

      <div class="glass-card">
        <div class="search-container">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            id="pac-search"
            class="search-input"
            placeholder="Cerca una criptovaluta (es. Bitcoin, Ethereum...)"
            autocomplete="off"
          />
          <div id="pac-autocomplete" class="autocomplete-dropdown"></div>
        </div>

        <div class="input-group">
          <label>💵 Capitale Investito (USD)</label>
          <input
            type="text"
            id="pac-capital"
            class="input-field"
            placeholder="1000"
            value="1000"
            inputmode="decimal"
          />
        </div>

        <div class="input-group">
          <label>🔄 Frequenza PAC</label>
          <div class="interval-selector" id="pac-interval-selector">
            ${INTERVALS.map(iv => `
              <button class="btn-secondary ${iv.days === selectedInterval ? 'active' : ''}" data-interval="${iv.days}" data-key="${iv.key}">
                ${iv.emoji} ${iv.label}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="input-group">
          <label>⏳ Durata Investimento</label>
          <div class="interval-selector" id="pac-duration-selector">
            ${DURATIONS.map(d => `
              <button class="btn-secondary ${d.days === selectedDuration ? 'active' : ''}" data-duration="${d.days}">
                ${d.label}
              </button>
            `).join('')}
          </div>
        </div>

        <div id="pac-results"></div>
      </div>
    </div>
  `;
}

export function initPACCalculator() {
  const searchInput = document.getElementById('pac-search');
  const dropdown = document.getElementById('pac-autocomplete');
  const capitalInput = document.getElementById('pac-capital');

  if (!searchInput) return;

  // Capital input formatting
  capitalInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    e.target.value = val;
  });

  // Interval selector
  const intervalBtns = document.querySelectorAll('#pac-interval-selector .btn-secondary');
  intervalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      intervalBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedInterval = parseInt(btn.dataset.interval);
      recalculateIfReady();
    });
  });

  // Duration selector
  const durationBtns = document.querySelectorAll('#pac-duration-selector .btn-secondary');
  durationBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      durationBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const newDuration = parseInt(btn.dataset.duration);
      selectedDuration = newDuration;

      if (lastCoinId) {
        // Always refetch since CryptoCompare requests are based on duration
        loadPACData(lastCoinId, lastCoinSymbol);
      }
    });
  });

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

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      dropdown.classList.remove('visible');
    }
  });
}

function recalculateIfReady() {
  if (lastCoinInfo && lastPriceData) {
    const capital = parseFloat(document.getElementById('pac-capital').value) || 1000;
    const resultsDiv = document.getElementById('pac-results');
    renderPACResults(resultsDiv, lastCoinInfo, lastPriceData, capital);
  }
}

function renderDropdown(dropdown, coins) {
  if (!coins.length) {
    dropdown.classList.remove('visible');
    return;
  }

  dropdown.innerHTML = coins.map(coin => `
    <div class="autocomplete-item" data-coin-id="${coin.id}" data-coin-symbol="${coin.symbol}">
      <img src="${coin.thumb}" alt="${coin.name}" onerror="this.style.display='none'" />
      <div>
        <span class="coin-name">${coin.name}</span>
        <span class="coin-symbol">${coin.symbol}</span>
      </div>
    </div>
  `).join('');

  dropdown.classList.add('visible');

  dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      const coinId = item.dataset.coinId;
      const coinSymbol = item.dataset.coinSymbol;
      const coinName = item.querySelector('.coin-name').textContent;
      document.getElementById('pac-search').value = coinName;
      dropdown.classList.remove('visible');
      loadPACData(coinId, coinSymbol);
    });
  });
}

let lastCoinSymbol = null;

async function loadPACData(coinId, coinSymbol) {
  const resultsDiv = document.getElementById('pac-results');
  const capitalStr = document.getElementById('pac-capital').value;
  const capital = parseFloat(capitalStr) || 1000;
  const symbol = coinSymbol || lastCoinSymbol || 'BTC';

  resultsDiv.innerHTML = `
    <div class="loading-overlay">
      <div class="spinner"></div>
      <span>Calcolo in corso... (può richiedere qualche secondo)</span>
    </div>
  `;

  try {
    // CoinGecko for coin info, CryptoCompare for historical data
    const [coinInfo, priceData] = await Promise.all([
      getCoinData(coinId),
      getMarketChart(symbol, selectedDuration)
    ]);

    if (!priceData.length) {
      throw new Error('Dati storici non disponibili per questa moneta');
    }

    lastCoinId = coinId;
    lastCoinSymbol = symbol;
    lastCoinInfo = coinInfo;
    lastPriceData = priceData;

    renderPACResults(resultsDiv, coinInfo, priceData, capital);
  } catch (err) {
    resultsDiv.innerHTML = `<div class="error-msg">❌ ${err.message}</div>`;
  }
}

function getIntervalLabel(intervalDays) {
  const iv = INTERVALS.find(i => i.days === intervalDays);
  return iv ? iv.label.toLowerCase() : `ogni ${intervalDays}g`;
}

function getIntervalDescLabel(intervalDays) {
  const iv = INTERVALS.find(i => i.days === intervalDays);
  return iv ? iv.descLabel : `ogni ${intervalDays} giorni`;
}

function getDurationLabel(durationDays) {
  const d = DURATIONS.find(dur => dur.days === durationDays);
  return d ? d.descLabel : `${durationDays} giorni`;
}

function calculatePAC(priceData, capital, days, intervalDays) {
  const now = Date.now();
  const startTs = now - days * 24 * 60 * 60 * 1000;
  const periodData = priceData.filter(d => d.timestamp >= startTs);

  if (periodData.length < 2) return null;

  const currentPrice = periodData[periodData.length - 1].price;
  const startPrice = periodData[0].price;

  // --- Investimento Singolo ---
  const singleCoins = capital / startPrice;
  const singleValue = singleCoins * currentPrice;
  const singleReturn = ((singleValue - capital) / capital) * 100;

  // --- PAC ---
  const interval = intervalDays;
  const sampledPrices = [];
  let lastSampleIdx = 0;
  for (let i = 0; i < periodData.length; i++) {
    const daysDiff = (periodData[i].timestamp - periodData[lastSampleIdx].timestamp) / (24 * 60 * 60 * 1000);
    if (i === 0 || daysDiff >= interval) {
      sampledPrices.push(periodData[i]);
      lastSampleIdx = i;
    }
  }

  if (sampledPrices.length < 2) {
    return {
      period: days,
      single: {
        invested: capital,
        coins: singleCoins,
        currentValue: singleValue,
        returnPct: singleReturn,
        entryPrice: startPrice,
        snapshots: periodData.filter((_, i) => i % Math.max(1, Math.floor(periodData.length / 60)) === 0 || i === periodData.length - 1).map(d => ({
          timestamp: d.timestamp,
          value: singleCoins * d.price
        }))
      },
      pac: null,
      currentPrice,
      winner: 'single',
      tooFewBuys: true
    };
  }

  const numBuys = sampledPrices.length;
  const amountPerBuy = capital / numBuys;
  let totalCoins = 0;
  const pacSnapshots = [];

  sampledPrices.forEach((dataPoint, idx) => {
    const coinsBought = amountPerBuy / dataPoint.price;
    totalCoins += coinsBought;
    const investedSoFar = amountPerBuy * (idx + 1);
    pacSnapshots.push({
      timestamp: dataPoint.timestamp,
      invested: investedSoFar,
      value: totalCoins * dataPoint.price,
      coins: totalCoins
    });
  });

  const pacFinalValue = totalCoins * currentPrice;
  const pacReturn = ((pacFinalValue - capital) / capital) * 100;
  const avgBuyPrice = capital / totalCoins;

  const singleSnapshots = periodData.filter((_, i) => i % Math.max(1, Math.floor(periodData.length / 60)) === 0 || i === periodData.length - 1).map(d => ({
    timestamp: d.timestamp,
    value: singleCoins * d.price
  }));

  return {
    period: days,
    single: {
      invested: capital,
      coins: singleCoins,
      currentValue: singleValue,
      returnPct: singleReturn,
      entryPrice: startPrice,
      snapshots: singleSnapshots
    },
    pac: {
      invested: capital,
      coins: totalCoins,
      currentValue: pacFinalValue,
      returnPct: pacReturn,
      avgBuyPrice,
      numBuys,
      intervalLabel: getIntervalLabel(intervalDays),
      snapshots: pacSnapshots
    },
    currentPrice,
    winner: pacReturn > singleReturn ? 'pac' : 'single',
    tooFewBuys: false
  };
}

function renderPACResults(container, coinInfo, priceData, capital) {
  const result = calculatePAC(priceData, capital, selectedDuration, selectedInterval);
  const intervalLabel = getIntervalLabel(selectedInterval);
  const durationLabel = getDurationLabel(selectedDuration);

  if (!result) {
    container.innerHTML = `<div class="error-msg">❌ Dati insufficienti per il periodo selezionato. Prova un periodo più breve.</div>`;
    return;
  }

  const hasPAC = result.pac && !result.tooFewBuys;

  // Build the summary description
  const summaryHTML = buildSummaryDescription(coinInfo, capital, result, durationLabel, selectedInterval);

  container.innerHTML = `
    <div class="results-area">
      <div class="coin-header">
        <img src="${coinInfo.image}" alt="${coinInfo.name}" onerror="this.style.display='none'" />
        <div class="coin-info">
          <h2>${coinInfo.name}</h2>
          <span class="symbol">${coinInfo.symbol} · Prezzo: ${formatPrice(coinInfo.currentPrice)}</span>
        </div>
      </div>

      <div style="text-align:center; margin-bottom:20px;">
        <span style="font-size:0.88rem; color:var(--text-secondary);">
          Capitale: <strong style="color:var(--accent-green);">$${capital.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          &nbsp;·&nbsp; PAC <strong style="color:var(--accent-purple);">${intervalLabel}</strong>
          &nbsp;·&nbsp; Durata <strong style="color:var(--accent-blue);">${durationLabel}</strong>
        </span>
      </div>

      <div class="stat-grid">
        ${hasPAC ? `
          <div class="stat-card">
            <div class="stat-label">🔄 PAC — Valore Finale</div>
            <div class="stat-value ${result.pac.returnPct >= 0 ? 'green' : 'red'}">${formatPrice(result.pac.currentValue)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">🔄 PAC — Rendimento</div>
            <div class="stat-value ${result.pac.returnPct >= 0 ? 'green' : 'red'}">${formatPercentage(result.pac.returnPct)}</div>
          </div>
        ` : ''}
        <div class="stat-card">
          <div class="stat-label">💎 Singolo — Valore Finale</div>
          <div class="stat-value ${result.single.returnPct >= 0 ? 'green' : 'red'}">${formatPrice(result.single.currentValue)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">💎 Singolo — Rendimento</div>
          <div class="stat-value ${result.single.returnPct >= 0 ? 'green' : 'red'}">${formatPercentage(result.single.returnPct)}</div>
        </div>
      </div>

      ${hasPAC ? `
        <div class="comparison-table-container">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Strategia</th>
                <th>Valore Finale</th>
                <th>Rendimento</th>
                <th>P. Medio / Entrata</th>
                <th>N° Acquisti</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="color:var(--accent-purple); font-family:var(--font-sans);">
                  🔄 PAC <span style="color:var(--text-muted); font-size:0.75rem;">(${result.pac.intervalLabel})</span>
                </td>
                <td>${formatPrice(result.pac.currentValue)}</td>
                <td class="${result.pac.returnPct >= 0 ? 'positive' : 'negative'}">${formatPercentage(result.pac.returnPct)}</td>
                <td>${formatPrice(result.pac.avgBuyPrice)}</td>
                <td>${result.pac.numBuys}</td>
                <td>${result.winner === 'pac' ? '<span class="badge-pac winner">✓ Migliore</span>' : ''}</td>
              </tr>
              <tr>
                <td style="color:var(--accent-blue); font-family:var(--font-sans);">
                  💎 Inv. Singolo
                </td>
                <td>${formatPrice(result.single.currentValue)}</td>
                <td class="${result.single.returnPct >= 0 ? 'positive' : 'negative'}">${formatPercentage(result.single.returnPct)}</td>
                <td>${formatPrice(result.single.entryPrice)}</td>
                <td>1</td>
                <td>${result.winner === 'single' ? '<span class="badge-pac winner">✓ Migliore</span>' : ''}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ` : `
        <div style="text-align:center; color:var(--text-muted); font-size:0.85rem; margin:16px 0;">
          ⚠️ Il PAC ${intervalLabel} non è applicabile per un periodo di ${durationLabel} (troppo pochi acquisti). Riduci l'intervallo.
        </div>
      `}

      <div class="chart-container">
        <canvas id="pac-chart"></canvas>
      </div>

      ${summaryHTML}
    </div>
  `;

  renderChart(result);
}

function buildSummaryDescription(coinInfo, capital, result, durationLabel, intervalDays) {
  const hasPAC = result.pac && !result.tooFewBuys;
  const intervalDescLabel = getIntervalDescLabel(intervalDays);
  const capitalStr = '$' + capital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const singleValueStr = formatPrice(result.single.currentValue);
  const singleReturnStr = formatPercentage(result.single.returnPct);
  const singleProfitLoss = result.single.currentValue - capital;
  const singlePLStr = formatPrice(Math.abs(singleProfitLoss));
  const singleVerb = singleProfitLoss >= 0 ? 'guadagnato' : 'perso';

  let summaryText = '';

  if (hasPAC) {
    const pacValueStr = formatPrice(result.pac.currentValue);
    const pacReturnStr = formatPercentage(result.pac.returnPct);
    const pacProfitLoss = result.pac.currentValue - capital;
    const pacPLStr = formatPrice(Math.abs(pacProfitLoss));
    const pacVerb = pacProfitLoss >= 0 ? 'guadagnato' : 'perso';

    const winnerName = result.winner === 'pac' ? 'PAC' : 'Investimento Singolo';
    const diff = Math.abs(result.pac.currentValue - result.single.currentValue);
    const diffStr = formatPrice(diff);

    summaryText = `
      <p>Se avessi investito <strong>${capitalStr}</strong> in <strong>${coinInfo.name}</strong> per <strong>${durationLabel}</strong>:</p>
      <ul>
        <li>
          <strong style="color:var(--accent-blue);">💎 Investimento Singolo</strong> — Avresti ora <strong>${singleValueStr}</strong> (${singleReturnStr}), 
          con un ${singleVerb} di <strong class="${singleProfitLoss >= 0 ? 'positive' : 'negative'}">${singlePLStr}</strong>
        </li>
        <li>
          <strong style="color:var(--accent-purple);">🔄 PAC con cadenza ${intervalDescLabel}</strong> — Avresti ora <strong>${pacValueStr}</strong> (${pacReturnStr}), 
          con un ${pacVerb} di <strong class="${pacProfitLoss >= 0 ? 'positive' : 'negative'}">${pacPLStr}</strong>
          <span style="color:var(--text-muted); font-size:0.82rem;">(${result.pac.numBuys} acquisti)</span>
        </li>
      </ul>
      <p style="margin-top:12px;">
        👉 La strategia <strong style="color:var(--accent-green);">${winnerName}</strong> avrebbe performato meglio, 
        con una differenza di <strong style="color:var(--accent-green);">${diffStr}</strong>.
      </p>
    `;
  } else {
    summaryText = `
      <p>Se avessi investito <strong>${capitalStr}</strong> in <strong>${coinInfo.name}</strong> per <strong>${durationLabel}</strong> con un 
      <strong style="color:var(--accent-blue);">Investimento Singolo</strong>, avresti ora <strong>${singleValueStr}</strong> (${singleReturnStr}), 
      con un ${singleVerb} di <strong class="${singleProfitLoss >= 0 ? 'positive' : 'negative'}">${singlePLStr}</strong>.</p>
    `;
  }

  return `
    <div class="summary-box">
      <div class="summary-title">📝 Riepilogo</div>
      ${summaryText}
    </div>
  `;
}

function renderChart(result) {
  const canvas = document.getElementById('pac-chart');
  if (!canvas) return;

  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }

  const hasPAC = result.pac && !result.tooFewBuys;
  const baseSnapshots = hasPAC ? result.pac.snapshots : result.single.snapshots;

  const labels = baseSnapshots.map(s =>
    new Date(s.timestamp).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: result.period > 365 ? '2-digit' : undefined })
  );

  const datasets = [];

  if (hasPAC) {
    datasets.push({
      label: '🔄 PAC',
      data: result.pac.snapshots.map(s => s.value),
      borderColor: '#7c3aed',
      backgroundColor: 'rgba(124, 58, 237, 0.1)',
      borderWidth: 2.5,
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 5,
    });
  }

  const singleValues = baseSnapshots.map(s => {
    const closest = result.single.snapshots.reduce((prev, curr) => {
      return Math.abs(curr.timestamp - s.timestamp) < Math.abs(prev.timestamp - s.timestamp) ? curr : prev;
    });
    return closest.value;
  });

  datasets.push({
    label: '💎 Inv. Singolo',
    data: singleValues,
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 2.5,
    fill: false,
    tension: 0.3,
    pointRadius: 0,
    pointHoverRadius: 5,
  });

  if (hasPAC) {
    datasets.push({
      label: '💵 Investito',
      data: result.pac.snapshots.map(s => s.invested),
      borderColor: 'rgba(255, 255, 255, 0.15)',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [6, 4],
      fill: false,
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 0,
    });
  }

  currentChart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#9095a8',
            font: { family: 'Inter', size: 12 },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(10, 10, 30, 0.95)',
          titleColor: '#e8e8f0',
          bodyColor: '#9095a8',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: function (ctx) {
              return ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#5a5f73',
            font: { size: 10 },
            maxTicksLimit: 8,
          },
          grid: { color: 'rgba(255,255,255,0.03)' },
        },
        y: {
          ticks: {
            color: '#5a5f73',
            font: { size: 10, family: 'JetBrains Mono' },
            callback: (v) => '$' + v.toLocaleString('en-US'),
          },
          grid: { color: 'rgba(255,255,255,0.03)' },
        },
      },
    },
  });
}
