/**
 * API Module — CoinGecko (search, coin info) + CryptoCompare (historical prices)
 * Both free tier, no API key required.
 */

// Both Vite dev server and Vercel production use proxy rewrites:
// /api/coingecko/* → https://api.coingecko.com/api/v3/*
// /api/cryptocompare/* → https://min-api.cryptocompare.com/*
const COINGECKO_URL = '/api/coingecko';
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

async function geckoFetch(endpoint) {
  const cacheKey = 'gecko:' + endpoint;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${COINGECKO_URL}${endpoint}`);
  if (res.status === 429) {
    throw new Error('Rate limit raggiunto. Attendi qualche secondo e riprova.');
  }
  if (!res.ok) {
    throw new Error(`Errore API CoinGecko: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

async function ccFetch(endpoint) {
  const cacheKey = 'cc:' + endpoint;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${CRYPTOCOMPARE_URL}${endpoint}`);
  if (!res.ok) {
    throw new Error(`Errore API CryptoCompare: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (data.Response === 'Error') {
    throw new Error(data.Message || 'Errore CryptoCompare');
  }
  setCache(cacheKey, data);
  return data;
}

/**
 * Search for coins by name or symbol (CoinGecko)
 */
export async function searchCoins(query) {
  if (!query || query.length < 2) return [];
  const data = await geckoFetch(`/search?query=${encodeURIComponent(query)}`);
  return (data.coins || []).slice(0, 8).map(c => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    thumb: c.thumb,
    marketCapRank: c.market_cap_rank
  }));
}

/**
 * Get full coin data including ATH (CoinGecko)
 */
export async function getCoinData(coinId) {
  const data = await geckoFetch(
    `/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
  );
  return {
    id: data.id,
    name: data.name,
    symbol: data.symbol,
    image: data.image?.large || data.image?.small,
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

/**
 * Get historical daily prices via CryptoCompare (supports up to 2000 days per request).
 * For longer periods, chains multiple requests.
 * @param {string} symbol - Coin ticker symbol (e.g. 'BTC', 'ETH')
 * @param {number} days - Total number of days of history needed
 * @returns {Array<{timestamp: number, price: number, date: Date}>}
 */
export async function getMarketChart(symbol, days) {
  const upperSymbol = symbol.toUpperCase();
  const allData = [];
  let remaining = days;
  let toTs = ''; // empty = now

  while (remaining > 0) {
    const limit = Math.min(remaining, 2000);
    const tsParam = toTs ? `&toTs=${toTs}` : '';
    const data = await ccFetch(
      `/data/v2/histoday?fsym=${upperSymbol}&tsym=USD&limit=${limit}${tsParam}`
    );

    const points = data.Data?.Data || [];
    if (!points.length) break;

    // Prepend (older data first)
    allData.unshift(...points);

    remaining -= limit;
    if (remaining > 0) {
      // Use earliest timestamp for next batch
      toTs = points[0].time;
    }
  }

  // Deduplicate by timestamp and sort ascending
  const seen = new Set();
  const deduplicated = [];
  for (const p of allData) {
    if (!seen.has(p.time) && p.close > 0) {
      seen.add(p.time);
      deduplicated.push({
        timestamp: p.time * 1000, // CryptoCompare uses seconds, convert to ms
        price: p.close,
        date: new Date(p.time * 1000)
      });
    }
  }
  deduplicated.sort((a, b) => a.timestamp - b.timestamp);
  return deduplicated;
}

/**
 * Format price for display
 */
export function formatPrice(price) {
  if (price == null) return '—';
  if (price >= 1) {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 0.01) {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  // Very small prices (meme coins)
  return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
}

/**
 * Format large numbers (market cap, volume)
 */
export function formatLargeNumber(num) {
  if (num == null) return '—';
  if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
  return '$' + num.toFixed(2);
}

/**
 * Format percentage
 */
export function formatPercentage(pct) {
  if (pct == null) return '—';
  const sign = pct >= 0 ? '+' : '';
  return sign + pct.toFixed(2) + '%';
}
