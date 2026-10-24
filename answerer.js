/* ANSWERER — the "brain" spot.
 * Any answerer is: answer(question, context) -> Promise<{text, topic, more, found}>
 *   context = { topic, extract, next, simpler, more }
 * To plug a smarter brain later (no key ever shown on screen), set
 *   window.AskMeBrain = { answer: async (q, ctx) => ({ text, topic, found:true }) }
 * in a file named brain.js next to this one (index.html loads it if present).
 * If the brain fails or returns nothing, the free Wikipedia answerer is used. */
(function () {
  const W = 'https://en.wikipedia.org/w/api.php';
  const STOP = /\b(what|whats|who|whos|where|when|why|how|is|are|was|were|does|do|did|the|a|an|of|tell|me|about|please|can|you|i|my|it|mean|means|explain|know|to|in|made|make|form|forms|work|works|happen|happens|cause|causes|get|thing|things)\b/gi;
  function keywords(q) { return q.replace(/[?!.,']/g, ' ').replace(STOP, ' ').replace(/\s+/g, ' ').trim() || q; }
  async function getJSON(u, tries) {
    tries = tries || 0;
    const r = await fetch(u);
    if (r.status === 429 && tries < 3) { await new Promise(z => setTimeout(z, 800 * (tries + 1))); return getJSON(u, tries + 1); }
    if (!r.ok) throw new Error(r.status); return r.json();
  }
  async function page(title) {
    const e = await getJSON(W + '?action=query&prop=extracts&explaintext=1&exintro=1&redirects=1&format=json&origin=*&titles=' + encodeURIComponent(title));
    const p = Object.values((e.query && e.query.pages) || {})[0];
    return (p && p.extract && !/may refer to|may also refer to/.test(p.extract)) ? { topic: p.title, extract: p.extract } : null;
  }
  async function lookup(q) {
    const k = keywords(q);
    if (k.split(' ').length <= 3) { const d = await page(k); if (d) return d; }
    const s = await getJSON(W + '?action=query&list=search&format=json&origin=*&srlimit=3&srsearch=' + encodeURIComponent(keywords(q)));
    const hits = (s.query && s.query.search) || [];
    for (const h of hits) { const d = await page(h.title); if (d) return d; }
    return null;
  }
  function frame(parts, first) {
    if (!parts.length) return null;
    return (first ? 'Here is what I know. ' : '') + parts.join(' ') + ' Want to know more?';
  }
  const wiki = {
    async answer(question, ctx) {
      ctx = ctx || {};
      let found = ctx.extract ? { topic: ctx.topic, extract: ctx.extract } : null;
      if (!ctx.more && !ctx.simpler) {
        const q = ctx.topic && question.split(' ').length < 6 ? ctx.topic + ' ' + question : question;
        found = await lookup(q) || (ctx.topic ? await lookup(question) : null);
      }
      if (!found) return { found: false, text: 'I am not sure about that one. Try asking a different way.' };
      const S = (typeof Simplify !== 'undefined') ? Simplify : require('./simplify.js');
      const r = S.simplify(found.extract, { start: ctx.more ? ctx.next : 0, simpler: ctx.simpler });
      const text = frame(r.parts, !ctx.more) ||
        'That is all I know about ' + found.topic + '. Try asking about something else.';
      return { found: true, text, topic: found.topic, extract: found.extract, next: r.next };
    }
  };
  async function answer(q, ctx) {
    const b = (typeof window !== 'undefined') && window.AskMeBrain;
    if (b && b.answer) { try { const r = await b.answer(q, ctx); if (r && r.text) return r; } catch (e) {} }
    try { return await wiki.answer(q, ctx); }
    catch (e) { return { found: false, text: 'I could not reach my books just now. Please try again in a little while.' }; }
  }
  const api = { answer, wiki, keywords };
  if (typeof module !== 'undefined') module.exports = api; else window.Answerer = api;
})();
