// Turns a Wikipedia extract into short plain sentences. Works in browser and node.
(function (root) {
  function clean(t) {
    let s = String(t || '');
    for (let i = 0; i < 4; i++) s = s.replace(/\([^()]*\)/g, '');   // nested parens
    s = s.replace(/\[[^\]]*\]/g, '').replace(/\/[^\/\s][^\/]*\//g, '');
    s = s.replace(/,\s*(commonly|also|often|sometimes)?\s*(known as|called|referred to as|abbreviated)\s[^,.]+,/gi, ',');
    s = s.replace(/,\s+(is|are|was|were)\b/g, ' $1');
    s = s.replace(/\s+([,.;:])/g, '$1').replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',');
    return s.trim();
  }
  function sentences(t) {
    return clean(t).replace(/\b([A-Z])\.(?=\s[A-Z])/g, '$1§').replace(/\b(Mr|Mrs|Ms|Dr|St|Jr|Sr|vs|e\.g|i\.e|U\.S|c)\./g, '$1§')
      .split(/(?<=[.!?])\s+(?=[A-Z"])/).map(x => x.replace(/§/g, '.').trim())
      .filter(x => x.length > 15);
  }
  function shorten(s, max) {
    max = max || 30;
    s = s.replace(/;[^.]*(?=\.)/, '');
    let w = s.split(' ');
    if (w.length <= max) return s;
    let cut = w.slice(0, max).join(' ');
    let c = cut.lastIndexOf(',');
    return (c > 40 ? cut.slice(0, c) : cut).replace(/[,;:]$/, '') + '.';
  }
  function simplify(extract, opts) {
    opts = opts || {};
    const all = sentences(extract).map(s => shorten(s, opts.simpler ? 16 : 30));
    const start = opts.start || 0, n = opts.simpler ? 1 : (opts.count || 3);
    return { parts: all.slice(start, start + n), next: start + n, total: all.length };
  }
  const api = { clean, sentences, shorten, simplify };
  if (typeof module !== 'undefined') module.exports = api; else root.Simplify = api;
})(this);
