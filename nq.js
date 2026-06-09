// DROGO FI — prix Nasdaq-100 RÉEL via CNBC, contrat NQ auto-roll (toujours le plus actif).
// @ND.1 = front-month, @ND.2 = suivant ; on prend celui qui a le plus de volume (= ce que trade le marché).
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' };

async function cnbc(sym) {
  const r = await fetch(`https://quote.cnbc.com/quote-html-webservice/quote.htm?symbols=${encodeURIComponent(sym)}&output=json`, { headers: UA });
  if (!r.ok) throw new Error('cnbc ' + r.status);
  const j = await r.json();
  let q = j.QuickQuoteResult && j.QuickQuoteResult.QuickQuote;
  q = Array.isArray(q) ? q[0] : q;
  return q || {};
}
const NUM = v => { const x = parseFloat(v); return isFinite(x) ? x : 0; };

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=10');
  try {
    const [c1, c2, es, vix] = await Promise.all([cnbc('@ND.1').catch(() => ({})), cnbc('@ND.2').catch(() => ({})), cnbc('@SP.1').catch(() => ({})), cnbc('.VIX').catch(() => ({}))]);
    // contrat actif = plus gros volume
    let q = NUM(c2.volume) > NUM(c1.volume) ? c2 : c1;
    let price = NUM(q.last);
    if (!price) { q = NUM(c1.last) ? c1 : c2; price = NUM(q.last); }
    if (!price) { q = await cnbc('.NDX'); price = NUM(q.last); }
    if (!price) throw new Error('no price');
    const f = v => { const x = NUM(v); return x !== 0 ? +x.toFixed(1) : undefined; };
    res.status(200).json({
      live: true,
      generated: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
      price: +price.toFixed(1),
      change: f(q.change), change_pct: f(q.change_pct),
      open: f(q.open), high: f(q.high), low: f(q.low),
      volume: NUM(q.volume) || undefined,
      contract: q.name || 'NQ',
      context: { es: { p: f(es.last), pct: f(es.change_pct) }, vix: { p: f(vix.last), pct: f(vix.change_pct) } },
      src: 'Nasdaq-100 (' + (q.name || 'NQ') + ') · ' + (q.last_time || '') + ' · CNBC'
    });
  } catch (e) {
    res.status(200).json({ live: false, error: String(e) });
  }
};
