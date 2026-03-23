/**
 * API Module — Multi-provider with automatic fallback
 * 
 * Search & Coin Data:  CoinGecko (primary) → CoinPaprika (fallback)
 * Historical Prices:   CryptoCompare (primary, supports 10+ years)
 * 
 * All free tier, no API keys required.
 */

const COINGECKO_URL = '/api/coingecko';
const COINPAPRIKA_URL = '/api/coinpaprika';
const CRYPTOCOMPARE_URL = '/api/cryptocompare';

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 120_000; // 2 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

async function apiFetch(url, cacheKey) {
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API ${res.status}`);
  }
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

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
    paprikaId: null, // will be filled if paprika is used
  }));
}

async function paprikaSearch(query) {
  const data = await apiFetch(
    `${COINPAPRIKA_URL}/search?q=${encodeURIComponent(query)}&limit=8`,
    `search:paprika:${query}`
  );
  return (data.currencies || []).filter(c => c.is_active).slice(0, 8).map(c => ({
    id: c.id,       // paprika id like "btc-bitcoin"
    name: c.name,
    symbol: c.symbol,
    thumb: '',       // paprika doesn't provide thumbnails in search
    marketCapRank: c.rank,
    paprikaId: c.id,
  }));
}

export async function searchCoins(query) {
  if (!query || query.length < 2) return [];

  // Try CoinGecko first, fall back to CoinPaprika
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
  // CoinPaprika uses ids like "btc-bitcoin"; if we have a gecko id like "bitcoin",
  // we search for it first to get the paprika id
  let paprikaId = coinIdOrSymbol;

  // If it doesn't look like a paprika ID (no hyphen with symbol prefix), search for it
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
    image: '', // CoinPaprika doesn't provide images in ticker data
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

export async function getCoinData(coinId) {
  // Try CoinGecko first, fall back to CoinPaprika
  try {
    return await geckoCoinData(coinId);
  } catch (err) {
    console.warn('CoinGecko coin data failed, trying CoinPaprika...', err.message);
    try {
      return await paprikaCoinData(coinId);
    } catch (err2) {
      throw new Error('Impossibile caricare i dati della moneta. Riprova tra qualche secondo.');
    }
  }
}

// ─────────────────── HISTORICAL PRICES (CryptoCompare) ───────────────────

/**
 * Get historical daily prices via CryptoCompare.
 * Supports up to 2000 days per request; chains for longer periods.
 * @param {string} symbol - Coin ticker symbol (e.g. 'BTC', 'ETH')
 * @param {number} days - Total number of days
 * @returns {Array<{timestamp: number, price: number, date: Date}>}
 */
export async function getMarketChart(symbol, days) {
  const upperSymbol = symbol.toUpperCase();
  const cacheKey = `chart:${upperSymbol}:${days}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

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

  // Deduplicate and sort ascending
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
  setCache(cacheKey, result);
  return result;
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
