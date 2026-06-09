// DROGO FI — fonction serverless : prix NQ RÉEL via CNBC (@ND.1, future Nasdaq-100 front-month).
// Marche côté serveur sans clé, sans blocage cloud (contrairement à Yahoo). Futures ~24h.
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' };

async function cnbc(sym) {
  const r = await fetch(`https://quote.cnbc.com/quote-html-webservice/quote.htm?symbols=${encodeURIComponent(sym)}&output=json`, { headers: UA });
  if (!r.ok) throw new Error('cnbc ' + r.status);
  const j = await r.json();
  let q = j.QuickQuoteResult && j.QuickQuoteResult.QuickQuote;
  q = Array.isArray(q) ? q[0] : q;
  return q || {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
  try {
    let q = await cnbc('@ND.1');                 // future NQ front-month
    let price = parseFloat(q.last);
    if (!price) { q = await cnbc('.NDX'); price = parseFloat(q.last); } // fallback indice cash
    if (!price) throw new Error('no price');
    const f = v => { const x = parseFloat(v); return isFinite(x) && x !== 0 ? +x.toFixed(1) : undefined; };
    res.status(200).json({
      live: true,
      generated: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
      price: +price.toFixed(1),
      change: f(q.change),
      open: f(q.open), high: f(q.high), low: f(q.low),
      src: (q.name || 'NQ') + ' · ' + (q.last_time || '') + ' · CNBC'
    });
  } catch (e) {
    res.status(200).json({ live: false, error: String(e) });
  }
};
