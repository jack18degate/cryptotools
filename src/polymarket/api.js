// ==============================
// API Service Layer
// ==============================

const GAMMA_BASE = '/gamma-api';
const CLOB_BASE = '/clob-api';

// Fetch wrapper with error handling
async function apiFetch(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`API Error: ${url}`, err);
    return null;
  }
}

// ==============================
// GAMMA API - Events & Markets
// ==============================

export async function listEvents({ limit = 50, offset = 0, active = true, order = 'volume24hr', ascending = false, tag_slug } = {}) {
  let url = `${GAMMA_BASE}/events?limit=${limit}&offset=${offset}&order=${order}&ascending=${ascending}`;
  if (active !== null) url += `&active=${active}`;
  if (tag_slug) url += `&tag_slug=${tag_slug}`;
  return apiFetch(url);
}

export async function getEventById(id) {
  return apiFetch(`${GAMMA_BASE}/events/${id}`);
}

export async function listMarkets({ limit = 50, offset = 0, order = 'volume24hr', ascending = false, closed } = {}) {
  let url = `${GAMMA_BASE}/markets?limit=${limit}&offset=${offset}&order=${order}&ascending=${ascending}`;
  if (closed !== undefined) url += `&closed=${closed}`;
  return apiFetch(url);
}

export async function getMarketById(id) {
  return apiFetch(`${GAMMA_BASE}/markets/${id}`);
}

export async function searchEventsAndMarkets(query) {
  return apiFetch(`${GAMMA_BASE}/public-search?q=${encodeURIComponent(query)}&limit_per_type=20`);
}

export async function listTags() {
  return apiFetch(`${GAMMA_BASE}/tags`);
}

export async function listEventsByTag(tagSlug) {
  return listEvents({ limit: 30, active: true, order: 'volume24hr', tag_slug: tagSlug });
}

// ==============================
// CLOB API - Prices
// ==============================

export async function getPriceHistory(tokenId, interval = '1w') {
  return apiFetch(`${CLOB_BASE}/prices-history?market=${tokenId}&interval=${interval}&fidelity=60`);
}

// ==============================
// Aggregated fetchers
// ==============================

export async function fetchItalyEvents() {
  // Use tag_slug=italy — this returns events with ALL sub-markets embedded
  const events = await listEvents({ limit: 30, active: true, order: 'volume24hr', tag_slug: 'italy' });
  if (!events) return [];
  return events;
}

export async function fetchTrendingMarkets() {
  const events = await listEvents({ limit: 20, active: true, order: 'volume24hr' });
  if (!events) return [];
  return events;
}
