/**
 * Wallet Intelligence Tool
 * Powered by Arkham Intelligence API
 * Analyzes wallet transactions to score expertise level and detect CEX interactions
 */

const ARKHAM_URL = '/api/arkham';

export function renderWalletTool() {
  return `
    <div class="page-container">
      <div class="section-header">
        <span class="emoji-icon">🔍</span>
        <h1>Wallet Intelligence</h1>
        <p>Inserisci un indirizzo EVM o Solana per analizzare le interazioni e il livello di esperienza</p>
      </div>

      <div class="glass-card">
        <div class="search-container">
          <span class="search-icon">🏷️</span>
          <input
            type="text"
            id="wallet-input"
            class="search-input"
            placeholder="Inserisci indirizzo wallet (0x... o Solana)"
            autocomplete="off"
            style="padding-left:48px; font-family:var(--font-mono); font-size:0.85rem;"
          />
        </div>

        <div style="text-align:center;">
          <button class="btn-primary" id="wallet-search-btn">
            🔎 Analizza Wallet
          </button>
        </div>

        <div id="wallet-results"></div>
      </div>
    </div>
  `;
}

export function initWalletTool() {
  const input = document.getElementById('wallet-input');
  const btn = document.getElementById('wallet-search-btn');

  if (!input || !btn) return;

  btn.addEventListener('click', () => {
    const address = input.value.trim();
    if (address) analyzeWallet(address);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const address = input.value.trim();
      if (address) analyzeWallet(address);
    }
  });
}

function detectChain(address) {
  if (address.startsWith('0x') && address.length === 42) return 'EVM';
  if (address.length >= 32 && address.length <= 44 && !address.startsWith('0x')) return 'Solana';
  return 'Sconosciuto';
}

// ─────────────────── MAIN ANALYSIS ───────────────────

async function analyzeWallet(address) {
  const resultsDiv = document.getElementById('wallet-results');
  const chainType = detectChain(address);

  resultsDiv.innerHTML = `
    <div class="loading-overlay">
      <div class="spinner"></div>
      <span>Analisi wallet in corso... Recupero transazioni e label...</span>
    </div>
  `;

  try {
    // Fetch address intelligence + recent transfers in parallel
    const [intelRes, transfersRes] = await Promise.all([
      fetch(`${ARKHAM_URL}/intelligence/address/${address}`),
      fetch(`${ARKHAM_URL}/transfers?base=${address}&limit=100`)
    ]);

    if (!intelRes.ok) {
      throw new Error(intelRes.status === 404
        ? 'Indirizzo non trovato nel database Arkham'
        : `Errore Arkham API: ${intelRes.status}`);
    }

    const intel = await intelRes.json();
    const transfersData = transfersRes.ok ? await transfersRes.json() : { transfers: [] };
    const transfers = transfersData.transfers || [];

    // Analyze the wallet
    const analysis = analyzeTransfers(transfers, address);

    renderFullResults(resultsDiv, intel, analysis, address, chainType, transfers.length);
  } catch (err) {
    resultsDiv.innerHTML = `<div class="error-msg">❌ ${err.message}</div>`;
  }
}

// ─────────────────── TRANSFER ANALYSIS ───────────────────

function analyzeTransfers(transfers, walletAddress) {
  const lowerAddr = walletAddress.toLowerCase();

  const cexInteractions = new Map();    // CEX name → { deposits, withdrawals }
  const defiProtocols = new Set();       // unique DeFi protocols
  const chainsUsed = new Set();          // unique chains
  const tokensTouched = new Set();       // unique tokens
  const contractInteractions = 0;
  let totalTxValue = 0;
  let defiTxCount = 0;
  let unknownTxCount = 0;
  let nftInteractions = 0;
  let bridgeInteractions = 0;
  let totalTx = transfers.length;

  // Known DeFi / Bridge / CEX keywords for fallback classification
  const defiKeywords = ['uniswap', 'aave', 'compound', 'curve', 'sushi', 'balancer', 'maker',
    'lido', 'yearn', 'convex', '1inch', 'pancake', 'dydx', 'gmx', 'synthetix', 'euler',
    'morpho', 'venus', 'benqi', 'trader joe', 'raydium', 'jupiter', 'orca', 'marinade',
    'jito', 'drift', 'mango', 'serum', 'aerodrome', 'velodrome', 'camelot', 'pendle',
    'eigenlayer', 'symbiotic', 'karak', 'etherfi', 'renzo', 'kelp', 'puffer', 'eigenpie',
    'stargate', 'layerzero', 'wormhole', 'across', 'hop', 'celer', 'multichain',
    'gnosis', 'safe', 'opensea', 'blur', 'x2y2', 'looksrare', 'zora', 'manifold',
    'chainlink', 'the graph', 'ens', 'unstoppable'];
  const cexKeywords = ['binance', 'coinbase', 'kraken', 'okx', 'bybit', 'kucoin', 'huobi',
    'htx', 'gate.io', 'bitfinex', 'gemini', 'crypto.com', 'bitstamp', 'mexc',
    'bitget', 'upbit', 'bithumb', 'poloniex', 'ftx', 'nexo', 'celsius', 'blockfi'];
  const bridgeKeywords = ['bridge', 'wormhole', 'stargate', 'hop', 'across', 'celer',
    'multichain', 'layerzero', 'synapse', 'portal'];
  const nftKeywords = ['opensea', 'blur', 'x2y2', 'looksrare', 'zora', 'manifold',
    'rarible', 'foundation', 'superrare', 'nft'];

  for (const tx of transfers) {
    chainsUsed.add(tx.chain || 'unknown');
    if (tx.tokenName) tokensTouched.add(tx.tokenName);
    totalTxValue += tx.historicalUSD || 0;

    // Analyze counterparty (the address that is NOT the wallet being analyzed)
    const counterparty = tx.fromAddress?.address?.toLowerCase() === lowerAddr
      ? tx.toAddress
      : tx.fromAddress;

    if (!counterparty) continue;

    const entityName = counterparty.arkhamEntity?.name || counterparty.arkhamLabel?.name || '';
    const entityType = counterparty.arkhamEntity?.type || '';
    const entityNameLower = entityName.toLowerCase();
    const isContract = counterparty.contract;

    // Detect CEX interactions
    if (entityType === 'exchange' || cexKeywords.some(k => entityNameLower.includes(k))) {
      const cexName = entityName || 'Exchange sconosciuto';
      if (!cexInteractions.has(cexName)) {
        cexInteractions.set(cexName, { deposits: 0, withdrawals: 0 });
      }
      const entry = cexInteractions.get(cexName);
      if (tx.fromAddress?.address?.toLowerCase() === lowerAddr) {
        entry.deposits++; // wallet → CEX = deposit
      } else {
        entry.withdrawals++; // CEX → wallet = withdrawal
      }
    }

    // Detect DeFi interactions
    if (entityType === 'defi' || defiKeywords.some(k => entityNameLower.includes(k))) {
      defiProtocols.add(entityName || 'DeFi Protocol');
      defiTxCount++;
    }

    // Detect bridge usage
    if (bridgeKeywords.some(k => entityNameLower.includes(k))) {
      bridgeInteractions++;
    }

    // Detect NFT interactions
    if (entityType === 'nft' || nftKeywords.some(k => entityNameLower.includes(k))) {
      nftInteractions++;
    }

    // Count unknown/unlabeled interactions
    if (!entityName && isContract) {
      unknownTxCount++;
    }
  }

  // ─── SCORING ───
  let score = 0;
  const breakdown = [];

  // 1. DeFi Protocol Diversity (0-30 pts)
  const defiCount = defiProtocols.size;
  const defiScore = Math.min(defiCount * 5, 30);
  score += defiScore;
  if (defiCount > 0) breakdown.push({ label: 'Protocolli DeFi', value: defiCount, pts: defiScore, max: 30 });

  // 2. Multi-chain usage (0-15 pts)
  const chainCount = chainsUsed.size;
  const chainScore = Math.min((chainCount - 1) * 5, 15);
  score += Math.max(0, chainScore);
  if (chainCount > 1) breakdown.push({ label: 'Multi-chain', value: chainCount + ' chain', pts: Math.max(0, chainScore), max: 15 });

  // 3. Token diversity (0-10 pts)
  const tokenCount = tokensTouched.size;
  const tokenScore = Math.min(Math.floor(tokenCount / 3), 10);
  score += tokenScore;
  if (tokenCount > 0) breakdown.push({ label: 'Token diversi', value: tokenCount, pts: tokenScore, max: 10 });

  // 4. Transaction volume (0-15 pts)
  let volScore = 0;
  if (totalTxValue > 1000000) volScore = 15;
  else if (totalTxValue > 100000) volScore = 12;
  else if (totalTxValue > 10000) volScore = 8;
  else if (totalTxValue > 1000) volScore = 4;
  else if (totalTxValue > 100) volScore = 2;
  score += volScore;
  if (volScore > 0) breakdown.push({ label: 'Volume transazioni', value: '$' + formatNum(totalTxValue), pts: volScore, max: 15 });

  // 5. DeFi transaction ratio (0-15 pts)
  const defiRatio = totalTx > 0 ? defiTxCount / totalTx : 0;
  const ratioScore = Math.min(Math.round(defiRatio * 20), 15);
  score += ratioScore;
  if (defiTxCount > 0) breakdown.push({ label: 'Attività DeFi', value: Math.round(defiRatio * 100) + '%', pts: ratioScore, max: 15 });

  // 6. Bridge usage (0-5 pts)
  const bridgeScore = Math.min(bridgeInteractions * 2, 5);
  score += bridgeScore;
  if (bridgeInteractions > 0) breakdown.push({ label: 'Uso bridge', value: bridgeInteractions + ' tx', pts: bridgeScore, max: 5 });

  // 7. NFT activity (0-5 pts)
  const nftScore = Math.min(nftInteractions, 5);
  score += nftScore;
  if (nftInteractions > 0) breakdown.push({ label: 'Attività NFT', value: nftInteractions + ' tx', pts: nftScore, max: 5 });

  // 8. Contract interactions with unknown protocols (advanced behavior) (0-5 pts)
  const unknownScore = Math.min(Math.floor(unknownTxCount / 2), 5);
  score += unknownScore;
  if (unknownTxCount > 0) breakdown.push({ label: 'Smart contract anonimi', value: unknownTxCount + ' tx', pts: unknownScore, max: 5 });

  // Cap at 100
  score = Math.min(score, 100);

  return {
    score,
    breakdown,
    cexInteractions,
    defiProtocols: [...defiProtocols],
    chainsUsed: [...chainsUsed],
    tokenCount: tokensTouched.size,
    totalTxValue,
    totalTx,
    defiTxCount,
    nftInteractions,
    bridgeInteractions,
  };
}

function formatNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

// ─────────────────── RENDERING ───────────────────

function getExpertiseLevel(score) {
  if (score >= 80) return { label: '🐋 Whale / Esperto', color: '#f59e0b', desc: 'Wallet di un utente estremamente esperto con interazioni DeFi avanzate e multi-chain.' };
  if (score >= 60) return { label: '🧠 Avanzato', color: '#8b5cf6', desc: 'Utente con buona esperienza DeFi e utilizzo diversificato della blockchain.' };
  if (score >= 40) return { label: '📊 Intermedio', color: '#3b82f6', desc: 'Utente con discreta esperienza, ha usato diversi protocolli.' };
  if (score >= 20) return { label: '🌱 Principiante', color: '#10b981', desc: 'Utente relativamente nuovo, interazioni limitate con la DeFi.' };
  return { label: '🐣 Newbie', color: '#6b7280', desc: 'Wallet con pochissima attività o solo trasferimenti base.' };
}

function renderFullResults(container, intel, analysis, address, chainType, txCount) {
  const entity = intel.arkhamEntity;
  const label = intel.arkhamLabel;
  const isContract = intel.contract;
  const entityName = entity?.name || label?.name || 'Sconosciuto';
  const shortAddr = address.substring(0, 8) + '...' + address.substring(address.length - 6);
  const expertise = getExpertiseLevel(analysis.score);

  // Explorer link
  const explorerUrl = chainType === 'Solana'
    ? `https://solscan.io/account/${address}`
    : `https://etherscan.io/address/${address}`;

  container.innerHTML = `
    <div class="results-area">
      <!-- Identity -->
      <div class="wallet-header">
        <div class="wallet-identity">
          <div class="wallet-entity-name">${entityName}</div>
          <div class="wallet-address-row">
            <span class="wallet-chain-badge">${chainType}</span>
            <code class="wallet-address">${shortAddr}</code>
            ${isContract ? '<span class="wallet-contract-badge">📄 Contract</span>' : '<span class="wallet-eoa-badge">👤 EOA</span>'}
          </div>
        </div>
      </div>

      <!-- Expertise Score -->
      <div class="expertise-score-card">
        <div class="expertise-header">
          <span class="expertise-label">LIVELLO ESPERIENZA</span>
          <span class="expertise-badge" style="color:${expertise.color};">${expertise.label}</span>
        </div>
        <div class="expertise-score-row">
          <div class="expertise-score-number" style="color:${expertise.color};">${analysis.score}</div>
          <div class="expertise-score-bar-container">
            <div class="expertise-score-bar">
              <div class="expertise-score-fill" style="width:${analysis.score}%; background:${expertise.color};" id="expertise-fill"></div>
            </div>
            <span class="expertise-desc">${expertise.desc}</span>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Transazioni Analizzate</div>
          <div class="stat-value">${analysis.totalTx}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Protocolli DeFi</div>
          <div class="stat-value" style="color:var(--accent-purple);">${analysis.defiProtocols.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Chain Utilizzate</div>
          <div class="stat-value">${analysis.chainsUsed.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Volume Totale</div>
          <div class="stat-value">$${formatNum(analysis.totalTxValue)}</div>
        </div>
      </div>

      <!-- Score Breakdown -->
      ${renderScoreBreakdown(analysis.breakdown)}

      <!-- CEX Interactions -->
      ${renderCEXInteractions(analysis.cexInteractions)}

      <!-- DeFi Protocols -->
      ${renderDefiProtocols(analysis.defiProtocols)}

      <!-- Chains Used -->
      ${renderChainsUsed(analysis.chainsUsed)}

      <!-- Links -->
      <div style="display:flex; align-items:center; gap:16px; margin-top:20px; flex-wrap:wrap;">
        <a href="${explorerUrl}" target="_blank" rel="noopener" style="color:var(--accent-green); text-decoration:none; font-size:0.85rem;">
          🔗 Explorer
        </a>
        <a href="https://platform.arkhamintelligence.com/explorer/address/${address}" target="_blank" rel="noopener" style="color:var(--accent-orange); text-decoration:none; font-size:0.85rem;">
          🕵️ Arkham Explorer
        </a>
      </div>

      <div style="text-align:center; margin-top:16px; color:var(--text-muted); font-size:0.72rem;">
        Analisi basata sulle ultime ${txCount} transazioni · Powered by Arkham Intelligence
      </div>
    </div>
  `;

  // Animate score bar
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const fill = document.getElementById('expertise-fill');
      if (fill) fill.style.width = analysis.score + '%';
    });
  });
}

function renderScoreBreakdown(breakdown) {
  if (!breakdown.length) return '';

  const rows = breakdown.map(b => `
    <div class="score-row">
      <span class="score-row-label">${b.label}</span>
      <span class="score-row-value">${b.value}</span>
      <div class="score-row-bar-bg">
        <div class="score-row-bar-fill" style="width:${(b.pts / b.max) * 100}%;"></div>
      </div>
      <span class="score-row-pts">${b.pts}/${b.max}</span>
    </div>
  `).join('');

  return `
    <div class="analysis-section">
      <div class="analysis-title">📊 Dettaglio Punteggio</div>
      ${rows}
    </div>
  `;
}

function renderCEXInteractions(cexMap) {
  if (!cexMap.size) {
    return `
      <div class="analysis-section">
        <div class="analysis-title">🏦 Interazioni CEX</div>
        <p style="color:var(--text-muted); font-size:0.85rem;">Nessuna interazione con exchange centralizzati rilevata.</p>
      </div>
    `;
  }

  const rows = [...cexMap.entries()].map(([name, data]) => `
    <tr>
      <td style="font-weight:600; color:var(--text-primary);">🏦 ${name}</td>
      <td style="color:var(--accent-green);">↓ ${data.withdrawals} prelievi</td>
      <td style="color:var(--accent-red);">↑ ${data.deposits} depositi</td>
    </tr>
  `).join('');

  return `
    <div class="analysis-section">
      <div class="analysis-title">🏦 Interazioni CEX Rilevate</div>
      <div class="comparison-table-container">
        <table class="comparison-table">
          <thead>
            <tr><th>Exchange</th><th>Prelievi</th><th>Depositi</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDefiProtocols(protocols) {
  if (!protocols.length) return '';

  const badges = protocols.map(p => `<span class="protocol-badge">${p}</span>`).join('');

  return `
    <div class="analysis-section">
      <div class="analysis-title">🔗 Protocolli DeFi Utilizzati</div>
      <div class="protocol-badges">${badges}</div>
    </div>
  `;
}

function renderChainsUsed(chains) {
  if (chains.length <= 1) return '';

  const chainEmojis = {
    'ethereum': '⟠ Ethereum',
    'base': '🔵 Base',
    'arbitrum': '🔵 Arbitrum',
    'optimism': '🔴 Optimism',
    'polygon': '💜 Polygon',
    'avalanche': '🔺 Avalanche',
    'bsc': '💛 BSC',
    'solana': '☀️ Solana',
    'fantom': '👻 Fantom',
    'zksync': '🔷 zkSync',
    'linea': '🔷 Linea',
    'scroll': '📜 Scroll',
    'blast': '💥 Blast',
    'mantle': '🟢 Mantle',
  };

  const badges = chains
    .filter(c => c !== 'unknown')
    .map(c => `<span class="chain-badge-pill">${chainEmojis[c] || '🔗 ' + c}</span>`)
    .join('');

  return `
    <div class="analysis-section">
      <div class="analysis-title">⛓️ Chain Utilizzate</div>
      <div class="protocol-badges">${badges}</div>
    </div>
  `;
}
