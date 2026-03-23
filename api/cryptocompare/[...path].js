export default async function handler(req, res) {
  const { url } = req;
  // Strip the /api/cryptocompare prefix to get the CryptoCompare API path
  const apiPath = url.replace(/^\/api\/cryptocompare/, '');
  const targetUrl = `https://min-api.cryptocompare.com${apiPath}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CryptoDeFiTools/1.0',
      },
    });

    const data = await response.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    res.status(response.status).send(data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy error: ' + err.message });
  }
}
