export const config = {
  runtime: 'edge',
};

// API keys — in production, use Vercel Environment Variables
const ARKHAM_KEY = process.env.ARKHAM_API_KEY || 'a2b649b2-4f66-4b1d-811b-a343a6dc7cb6';
const CMC_KEY = process.env.CMC_API_KEY || 'b54801b516a84a10b55c5066de2866db';
const TIINGO_KEY = process.env.TIINGO_API_KEY || '17b411bb67c24acaee75f486d1b501cfffbe9e93';

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      if ((response.status === 429 || response.status >= 500) && i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }

      return response;
    } catch (err) {
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

export default async function handler(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  let targetUrl = '';
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  if (path.startsWith('/api/coingecko')) {
    const apiPath = path.replace('/api/coingecko', '');
    targetUrl = `https://api.coingecko.com/api/v3${apiPath}${url.search}`;
  } else if (path.startsWith('/api/cryptocompare')) {
    const apiPath = path.replace('/api/cryptocompare', '');
    targetUrl = `https://min-api.cryptocompare.com${apiPath}${url.search}`;
  } else if (path.startsWith('/api/coinpaprika')) {
    const apiPath = path.replace('/api/coinpaprika', '');
    targetUrl = `https://api.coinpaprika.com/v1${apiPath}${url.search}`;
  } else if (path.startsWith('/api/arkham')) {
    const apiPath = path.replace('/api/arkham', '');
    targetUrl = `https://api.arkhamintelligence.com${apiPath}${url.search}`;
    headers['API-Key'] = ARKHAM_KEY;
  } else if (path.startsWith('/gamma-api')) {
    const apiPath = path.replace('/gamma-api', '');
    targetUrl = `https://gamma-api.polymarket.com${apiPath}${url.search}`;
  } else if (path.startsWith('/clob-api')) {
    const apiPath = path.replace('/clob-api', '');
    targetUrl = `https://clob.polymarket.com${apiPath}${url.search}`;
  } else if (path.startsWith('/api/coinmarketcap')) {
    const apiPath = path.replace('/api/coinmarketcap', '');
    targetUrl = `https://pro-api.coinmarketcap.com${apiPath}${url.search}`;
    headers['X-CMC_PRO_API_KEY'] = CMC_KEY;
  } else if (path.startsWith('/api/tiingo')) {
    const apiPath = path.replace('/api/tiingo', '');
    const separator = url.search ? '&' : '?';
    targetUrl = `https://api.tiingo.com${apiPath}${url.search}${separator}token=${TIINGO_KEY}`;
  } else {
    return new Response('Not found', { status: 404 });
  }

  try {
    const response = await fetchWithRetry(targetUrl, { headers });
    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
