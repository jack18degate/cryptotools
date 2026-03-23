export default async function handler(req, res) {
  const { url } = req;
  // Strip the /api/coingecko prefix to get the CoinGecko API path
  const apiPath = url.replace(/^\/api\/coingecko/, '');
  const targetUrl = `https://api.coingecko.com/api/v3${apiPath}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CryptoDeFiTools/1.0',
      },
    });

    const data = await response.text();

    // Forward CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(response.status).send(data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy error: ' + err.message });
  }
}
