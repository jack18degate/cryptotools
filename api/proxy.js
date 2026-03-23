export const config = {
  runtime: 'edge',
};

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      // If rate limited (429) or server error (5xx), wait and retry
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

  if (path.startsWith('/api/coingecko')) {
    const apiPath = path.replace('/api/coingecko', '');
    targetUrl = `https://api.coingecko.com/api/v3${apiPath}${url.search}`;
  } else if (path.startsWith('/api/cryptocompare')) {
    const apiPath = path.replace('/api/cryptocompare', '');
    targetUrl = `https://min-api.cryptocompare.com${apiPath}${url.search}`;
  } else if (path.startsWith('/api/coinpaprika')) {
    const apiPath = path.replace('/api/coinpaprika', '');
    targetUrl = `https://api.coinpaprika.com/v1${apiPath}${url.search}`;
  } else {
    return new Response('Not found', { status: 404 });
  }

  try {
    const response = await fetchWithRetry(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

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
