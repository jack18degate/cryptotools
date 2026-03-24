/**
 * API Module — Multi-provider with automatic fallback, round-robin load balancing,
 * rate-limit resilient queue (handles 4-5 concurrent users gracefully).
 * 
 * Search & Coin Data:  CoinGecko (primary) → CoinPaprika → CoinMarketCap (fallback)
 * Historical Prices:   CryptoCompare (primary) → Tiingo (fallback)
 * 
 * CoinGecko, CoinPaprika, CryptoCompare: free tier, no API keys.
 * CoinMarketCap: free tier, API key via proxy header.
 * Tiingo: free tier, API key via proxy query param.
 */

const COINGECKO_URL = '/api/coingecko';
const COINPAPRIKA_URL = '/api/coinpaprika';
const CRYPTOCOMPARE_URL = '/api/cryptocompare';
const CMC_URL = '/api/coinmarketcap';
const TIINGO_URL = '/api/tiingo';

// ─────────────────── CACHE ───────────────────

const cache = new Map();
const CACHE_TTL = 300_000; // 5 minutes (increased for rate limit resilience)

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ─────────────────── RATE-LIMIT RESILIENT FETCH ───────────────────

/**
 * Fetch with automatic retry + exponential backoff.
 * On 429 (rate limited) or 5xx errors, waits and retries instead of failing.
 * This means the user waits longer but never sees an error.
 */
const MAX_RETRIES = 4;
const BASE_DELAY = 1500;  // 1.5s initial backoff
const MAX_DELAY = 15000;  // 15s max wait

async function resilientFetch(url) {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);

      // Rate limited — wait and retry
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const waitMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
        console.warn(`Rate limited (429) on ${url}, waiting ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(waitMs);
        continue;
      }

      // Server error — wait and retry
      if (res.status >= 500) {
        const waitMs = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
        console.warn(`Server error (${res.status}) on ${url}, waiting ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(waitMs);
        continue;
      }

      // Other errors — throw immediately to trigger fallback
      if (!res.ok) {
        throw new Error(`API ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      lastError = err;
      // Network errors — retry with backoff
      if (err.name === 'TypeError' || err.message.includes('fetch')) {
        const waitMs = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
        console.warn(`Network error on ${url}, waiting ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(waitMs);
        continue;
      }
      throw err; // Non-retryable errors
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────── REQUEST QUEUE ───────────────────
// Prevents flooding APIs with too many simultaneous requests
// when multiple users hit the app at once.

const MAX_CONCURRENT = 3; // max simultaneous outgoing requests
let activeRequests = 0;
const requestQueue = [];

function enqueueRequest(fn) {
  return new Promise((resolve, reject) => {
    const task = async () => {
      activeRequests++;
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      } finally {
        activeRequests--;
        processQueue();
      }
    };

    if (activeRequests < MAX_CONCURRENT) {
      task();
    } else {
      requestQueue.push(task);
    }
  });
}

function processQueue() {
  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT) {
    const next = requestQueue.shift();
    next();
  }
}

// ─────────────────── CACHED + QUEUED FETCH ───────────────────

async function apiFetch(url, cacheKey) {
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Queue the request to avoid flooding
  const data = await enqueueRequest(() => resilientFetch(url));
  setCache(cacheKey, data);
  return data;
}

// ─────────────────── ROUND-ROBIN ───────────────────

let coinDataCounter = 0;   // rotates between gecko/paprika/cmc
let historyCounter = 0;     // rotates between cryptocompare/tiingo

// ─────────────────── SEARCH ───────────────────

async function geckoSearch(query) {
  const data = await apiFetch(
    `${COINGECKO_URL}/search?query=${encodeURIComponent(query)}`,
    `search:gecko:${query}`
  );
  return (data.coins || []).slice(0, 8).map(c => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    thumb: c.thumb || c.large || '',
    marketCapRank: c.market_cap_rank,
    paprikaId: null,
  }));
}

async function paprikaSearch(query) {
  const data = await apiFetch(
    `${COINPAPRIKA_URL}/search?q=${encodeURIComponent(query)}&limit=8`,
    `search:paprika:${query}`
  );
  return (data.currencies || []).filter(c => c.is_active).slice(0, 8).map(c => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    thumb: '',
    marketCapRank: c.rank,
    paprikaId: c.id,
  }));
}

export async function searchCoins(query) {
  if (!query || query.length < 2) return [];

  try {
    return await geckoSearch(query);
  } catch (err) {
    console.warn('CoinGecko search failed, trying CoinPaprika...', err.message);
    try {
      return await paprikaSearch(query);
    } catch (err2) {
      console.error('Both search APIs failed:', err2.message);
      return [];
    }
  }
}

// ─────────────────── COIN DATA ───────────────────

async function geckoCoinData(coinId) {
  const data = await apiFetch(
    `${COINGECKO_URL}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`,
    `coin:gecko:${coinId}`
  );
  return {
    id: data.id,
    name: data.name,
    symbol: data.symbol,
    image: data.image?.large || data.image?.small || '',
    currentPrice: data.market_data?.current_price?.usd,
    ath: data.market_data?.ath?.usd,
    athDate: data.market_data?.ath_date?.usd,
    athChangePercentage: data.market_data?.ath_change_percentage?.usd,
    marketCap: data.market_data?.market_cap?.usd,
    marketCapRank: data.market_cap_rank,
    totalVolume: data.market_data?.total_volume?.usd,
    priceChangePercentage24h: data.market_data?.price_change_percentage_24h,
    priceChangePercentage7d: data.market_data?.price_change_percentage_7d,
    priceChangePercentage30d: data.market_data?.price_change_percentage_30d,
    priceChangePercentage1y: data.market_data?.price_change_percentage_1y,
  };
}

async function paprikaCoinData(coinIdOrSymbol) {
  let paprikaId = coinIdOrSymbol;

  if (!coinIdOrSymbol.match(/^[a-z]+-/)) {
    const searchResults = await apiFetch(
      `${COINPAPRIKA_URL}/search?q=${encodeURIComponent(coinIdOrSymbol)}&limit=1`,
      `paprika:resolve:${coinIdOrSymbol}`
    );
    const match = searchResults.currencies?.[0];
    if (!match) throw new Error('Moneta non trovata su CoinPaprika');
    paprikaId = match.id;
  }

  const data = await apiFetch(
    `${COINPAPRIKA_URL}/tickers/${paprikaId}`,
    `coin:paprika:${paprikaId}`
  );

  const q = data.quotes?.USD || {};
  return {
    id: data.id,
    name: data.name,
    symbol: data.symbol,
    image: '',
    currentPrice: q.price,
    ath: q.ath_price,
    athDate: q.ath_date,
    athChangePercentage: q.percent_from_price_ath,
    marketCap: q.market_cap,
    marketCapRank: data.rank,
    totalVolume: q.volume_24h,
    priceChangePercentage24h: q.percent_change_24h,
    priceChangePercentage7d: q.percent_change_7d,
    priceChangePercentage30d: q.percent_change_30d,
    priceChangePercentage1y: q.percent_change_1y,
  };
}

async function cmcCoinData(coinIdOrSymbol) {
  const slug = coinIdOrSymbol.toLowerCase().replace(/\s+/g, '-');
  const data = await apiFetch(
    `${CMC_URL}/v1/cryptocurrency/quotes/latest?slug=${slug}&convert=USD`,
    `coin:cmc:${slug}`
  );

  const entries = Object.values(data.data || {});
  if (!entries.length) throw new Error('Moneta non trovata su CoinMarketCap');
  const coin = entries[0];
  const quote = coin.quote?.USD || {};

  return {
    id: coin.slug || coinIdOrSymbol,
    name: coin.name,
    symbol: coin.symbol,
    image: '',
    currentPrice: quote.price,
    ath: null,
    athDate: null,
    athChangePercentage: null,
    marketCap: quote.market_cap,
    marketCapRank: coin.cmc_rank,
    totalVolume: quote.volume_24h,
    priceChangePercentage24h: quote.percent_change_24h,
    priceChangePercentage7d: quote.percent_change_7d,
    priceChangePercentage30d: quote.percent_change_30d,
    priceChangePercentage1y: null,
  };
}

// Round-robin provider selection with full fallback chain
const coinDataProviders = [
  { name: 'CoinGecko', fn: geckoCoinData },
  { name: 'CoinPaprika', fn: paprikaCoinData },
  { name: 'CoinMarketCap', fn: cmcCoinData },
];

export async function getCoinData(coinId) {
  const startIdx = coinDataCounter++ % coinDataProviders.length;
  const errors = [];

  for (let i = 0; i < coinDataProviders.length; i++) {
    const idx = (startIdx + i) % coinDataProviders.length;
    const provider = coinDataProviders[idx];
    try {
      const result = await provider.fn(coinId);
      if (result.currentPrice != null) {
        return result;
      }
      throw new Error('No price data returned');
    } catch (err) {
      console.warn(`${provider.name} coin data failed:`, err.message);
      errors.push(`${provider.name}: ${err.message}`);
    }
  }

  throw new Error('Impossibile caricare i dati della moneta. Tutti i provider hanno fallito. Riprova tra qualche secondo.');
}

// ─────────────────── HISTORICAL PRICES ───────────────────

async function cryptoCompareHistory(symbol, days) {
  const upperSymbol = symbol.toUpperCase();
  const allData = [];
  let remaining = days;
  let toTs = '';

  while (remaining > 0) {
    const limit = Math.min(remaining, 2000);
    const tsParam = toTs ? `&toTs=${toTs}` : '';
    const data = await apiFetch(
      `${CRYPTOCOMPARE_URL}/data/v2/histoday?fsym=${upperSymbol}&tsym=USD&limit=${limit}${tsParam}`,
      `cc:${upperSymbol}:${limit}:${toTs}`
    );

    const points = data.Data?.Data || [];
    if (!points.length) break;

    allData.unshift(...points);

    remaining -= limit;
    if (remaining > 0) {
      toTs = points[0].time;
    }
  }

  const seen = new Set();
  const result = [];
  for (const p of allData) {
    if (!seen.has(p.time) && p.close > 0) {
      seen.add(p.time);
      result.push({
        timestamp: p.time * 1000,
        price: p.close,
        date: new Date(p.time * 1000)
      });
    }
  }
  result.sort((a, b) => a.timestamp - b.timestamp);
  return result;
}

async function tiingoHistory(symbol, days) {
  const ticker = symbol.toLowerCase();
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const tiingoTicker = `${ticker}usd`;

  const data = await apiFetch(
    `${TIINGO_URL}/tiingo/crypto/prices?tickers=${tiingoTicker}&startDate=${startStr}&endDate=${endStr}&resampleFreq=1day`,
    `tiingo:${tiingoTicker}:${days}`
  );

  const priceData = data?.[0]?.priceData || [];
  if (!priceData.length) throw new Error('Nessun dato storico da Tiingo');

  return priceData.map(p => ({
    timestamp: new Date(p.date).getTime(),
    price: p.close,
    date: new Date(p.date),
  }));
}

const historyProviders = [
  { name: 'CryptoCompare', fn: cryptoCompareHistory },
  { name: 'Tiingo', fn: tiingoHistory },
];

export async function getMarketChart(symbol, days) {
  const cacheKey = `chart:${symbol.toUpperCase()}:${days}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const startIdx = historyCounter++ % historyProviders.length;

  for (let i = 0; i < historyProviders.length; i++) {
    const idx = (startIdx + i) % historyProviders.length;
    const provider = historyProviders[idx];
    try {
      const result = await provider.fn(symbol, days);
      if (result.length > 0) {
        setCache(cacheKey, result);
        return result;
      }
      throw new Error('No data returned');
    } catch (err) {
      console.warn(`${provider.name} historical failed:`, err.message);
    }
  }

  throw new Error('Impossibile caricare dati storici. Riprova tra qualche secondo.');
}

// ─────────────────── FORMATTERS ───────────────────

export function formatPrice(price) {
  if (price == null) return '—';
  if (price >= 1) {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 0.01) {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
}

export function formatLargeNumber(num) {
  if (num == null) return '—';
  if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
  return '$' + num.toFixed(2);
}

export function formatPercentage(pct) {
  if (pct == null) return '—';
  const sign = pct >= 0 ? '+' : '';
  return sign + pct.toFixed(2) + '%';
}
