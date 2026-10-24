(function () {
  const $ = id => document.getElementById(id);
  const KEY = 'askme-history-v1';
  let ctx = {}, lastQ = '';
  const URGENT = /(chest pain|heart attack|can'?t breathe|cannot breathe|not breathing|stroke|suicid|kill myself|end my life|want to die|overdose|hurt myself|bleeding a lot|fell and can'?t get up)/i;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(h) { try { localStorage.setItem(KEY, JSON.stringify(h.slice(0, 100))); } catch (e) {} }

  function show(q, a) {
    $('theQ').textContent = 'You asked: ' + q;
    $('theA').textContent = a;
    $('answerBox').classList.remove('hidden');
    $('answerBox').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function say(t) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t); u.rate = 0.85; speechSynthesis.speak(u);
  }

  async function ask(q, opts) {
    q = (q || '').trim(); if (!q) return;
    opts = opts || {};
    $('helpBox').classList.toggle('hidden', !URGENT.test(q));
    if (URGENT.test(q)) $('helpBox').scrollIntoView({ behavior: 'smooth' });
    $('wait').classList.remove('hidden');
    const c = opts.follow ? { topic: ctx.topic } : opts.more || opts.simpler ? Object.assign({}, ctx, opts) : {};
    const r = await Answerer.answer(q, c);
    $('wait').classList.add('hidden');
    if (r.found) ctx = { topic: r.topic, extract: r.extract, next: opts.simpler ? ctx.next : r.next };
    const label = opts.more ? lastQ + ' (more)' : opts.simpler ? lastQ + ' (simpler)' : q;
    if (!opts.more && !opts.simpler) lastQ = q;
    show(label, r.text);
    const h = load(); h.unshift({ q: label, a: r.text, t: Date.now() }); save(h);
  }

  $('go').onclick = () => { ask($('typed').value); $('typed').value = ''; };
  $('typed').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('go').click(); } });
  $('followGo').onclick = () => { ask($('follow').value, { follow: true }); $('follow').value = ''; };
  $('read').onclick = () => say($('theA').textContent);
  $('more').onclick = () => ctx.extract ? ask(lastQ, { more: true }) : say('Ask me something first.');
  $('simpler').onclick = () => ctx.extract ? ask(lastQ, { simpler: true }) : null;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { $('talk').textContent = '✍️ Write your question below'; $('talk').onclick = () => $('typed').focus(); }
  else {
    let rec = null;
    $('talk').onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false;
      $('talk').classList.add('listening'); $('talk').textContent = '⏹ Tap when you are done';
      $('hear').classList.remove('hidden');
      rec.onresult = e => { const t = e.results[0][0].transcript; $('typed').value = t; ask(t); $('typed').value = ''; };
      rec.onerror = () => { $('hear').textContent = 'I did not catch that. Try again, or write it below.'; };
      rec.onend = () => { rec = null; $('talk').classList.remove('listening'); $('talk').textContent = '🎤 Ask out loud';
        setTimeout(() => { $('hear').classList.add('hidden'); $('hear').textContent = 'I am listening. Go ahead.'; }, 2500); };
      rec.start();
    };
  }

  function drawHist() {
    const h = load(), box = $('histList'); box.innerHTML = '';
    if (!h.length) { box.innerHTML = '<p>Nothing here yet. Ask me something!</p>'; return; }
    h.forEach(it => {
      const b = document.createElement('button');
      b.textContent = new Date(it.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' — ' + it.q;
      b.onclick = () => { $('histView').classList.add('hidden'); $('askView').classList.remove('hidden'); show(it.q, it.a); };
      box.appendChild(b);
    });
  }
  $('showHist').onclick = () => { drawHist(); $('askView').classList.add('hidden'); $('histView').classList.remove('hidden'); scrollTo(0, 0); };
  $('back').onclick = () => { $('histView').classList.add('hidden'); $('askView').classList.remove('hidden'); };
  $('clear').onclick = () => { if (confirm('Clear all your past questions?')) { save([]); drawHist(); } };

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
