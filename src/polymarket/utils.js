// ==============================
// Utility Functions
// ==============================

export function formatCurrency(value, decimals = 0) {
  if (value == null || isNaN(value)) return '$0';
  const num = Number(value);
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(decimals)}`;
}

export function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value)) return '0%';
  return `${(Number(value) * 100).toFixed(decimals)}%`;
}

export function formatPriceChange(value) {
  if (value == null || isNaN(value)) return '';
  const pct = (Number(value) * 100).toFixed(1);
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct}%`;
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 60) return `${mins}m fa`;
  if (hours < 24) return `${hours}h fa`;
  if (days < 30) return `${days}g fa`;
  return date.toLocaleDateString('it-IT');
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function parseOutcomes(market) {
  try {
    const outcomes = JSON.parse(market.outcomes || '[]');
    const prices = JSON.parse(market.outcomePrices || '[]');
    return outcomes.map((name, i) => ({
      name,
      price: parseFloat(prices[i] || 0),
    }));
  } catch {
    return [];
  }
}

export function parseClobTokenIds(market) {
  try {
    return JSON.parse(market.clobTokenIds || '[]');
  } catch {
    return [];
  }
}

export function getMarketUrl(market) {
  if (market.slug) return `https://polymarket.com/event/${market.slug}`;
  return `https://polymarket.com`;
}

// Simple 1x1 dark pixel as fallback (avoids SVG quote issues in onerror)
const PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAQ0lEQVRo3u3PMQEAAAgDIJfc6BpjDyQgt1MHMpKRjGQkIxnJSEYykpGMZCQjGclIRjKSkYxkJCMZyUhGMpKRjGR+AS/1APkl7SAAAAAASUVORK5CYII=';

export function defaultImage(url) {
  if (!url) return PLACEHOLDER;
  return url;
}

export function getPlaceholder() {
  return PLACEHOLDER;
}
