/* LYCORE Sales Lab -- Phase 1: Offer Laboratory, Pain Library, Prospect Personas, Script Builder.
   No AI calls. All data is stored through the app's existing sget/sset (lab-* keys).
   Relies on globals from the host app: sget, sset, esc, toast, and (for import/publish) ccScripts. */
const Lab = (function () {
  'use strict';

  const K = { offers: 'lab-offers', pains: 'lab-pains', personas: 'lab-personas', scripts: 'lab-scripts', settings: 'lab-settings', sessions: 'lab-sessions', evidence: 'lab-evidence', panel: 'lab-panel-runs' };
  const EVID = ['Verified fact', 'Reported anecdote', 'Reasonable hypothesis', 'Untested sales assumption', 'Demonstrated LYCORE result'];
  const STATUS = ['proposed', 'testing', 'approved', 'rejected'];
  const STAGES = ['Opening', 'Gatekeeper', 'Discovery', 'Pitch', 'Objection', 'Close', 'Follow-up', 'Other'];
  const TAGTYPES = ['industry', 'persona', 'objection', 'offer'];
  const OFFER_FIELDS = [
    ['idealCustomer', 'Ideal customer'], ['prerequisites', 'Prerequisites'], ['integrations', 'Supported integrations'],
    ['deliverables', 'Deliverables'], ['limitations', 'Limitations'], ['estimatedCosts', 'Estimated costs'],
    ['complianceChecks', 'Required compliance checks'], ['pricing', 'Pricing'], ['riskReversal', 'Risk-reversal conditions'],
    ['outcomes', 'Measurable outcomes']
  ];
  const HFIELDS = [
    ['companySize', 'Company size', 'text'], ['serviceLines', 'Service lines', 'lines'], ['jobVolume', 'Job volume', 'text'],
    ['existingSoftware', 'Existing software', 'text'], ['decisionAuthority', 'Decision authority', 'text'],
    ['genuineProblems', 'Genuine operational problems', 'lines'], ['problemsSolved', 'Problems already solved', 'lines'],
    ['recentEvents', 'Recent business events', 'text'], ['previousVendors', 'Previous vendor experience', 'text'],
    ['timeAvailability', 'Time available', 'text'], ['budgetSensitivity', 'Budget sensitivity (1 low, 5 high)', 'range15'],
    ['trustLevel', 'Trust level (1 low, 5 high)', 'range15'], ['responsePreference', 'Response preference', 'text'],
    ['willingnessToBuy', 'Willingness to buy (0 to 100)', 'range100'], ['likelyObjections', 'Objections likely to arise', 'lines'],
    ['evidenceThatChangesView', 'Evidence that could change their view', 'area'],
    ['hasLegitimateOpportunity', 'There is a legitimate LYCORE opportunity here', 'check']
  ];

  const S = {
    loaded: false, offers: [], pains: [], personas: [], scripts: { playbooks: [], cards: [] }, settings: { provider: 'gemini', models: { gemini: 'gemini-3.8-flash', huggingface: '', live: 'gemini-3.8-live' } }, ai: {}, evidence: [], panelRuns: [], pn: { offerId: null, roles: { skeptic: true, compliance: true, competitor: false, finance: false, delivery: true }, busy: false, progress: '', err: '', run: null }, sessions: [], practice: { personaId: null, session: null, busy: false, err: '', draft: '', mode: 'voice', ctl: null, live: null, notice: '', vstate: '' }, tab: 'live', undo: [],
    ui: {
      offerId: null, moduleId: null, draft: null, dirty: false,
      painId: null, painDraft: null, painFilter: { q: '', sev: '', ev: '', ind: '' }, evId: null, evDraft: null, evSuggest: null, evFilter: { q: '', type: '' },
      personaId: null, personaDraft: null, personaFilter: { q: '' }, reveal: {}, blind: true,
      pbId: null, editCard: null, cardDraft: null, compact: false, open: {},
      filter: { q: '', stage: '', tag: '', fav: false }
    }
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = (p) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now = () => new Date().toISOString();
  const lines = (s) => String(s == null ? '' : s).split('\n').map((x) => x.trim()).filter(Boolean);
  const toText = (a) => (a || []).join('\n');
  const E = (s) => esc(s);
  const save = (k) => sset(K[k], S[k]);
  const fmt = (iso) => { try { return new Date(iso).toLocaleString(); } catch (e) { return iso || ''; } };

  /* ------------------------------------------------------------------ load */
  async function load() {
    if (S.loaded) return;
    S.offers = (await sget(K.offers)) || [];
    S.pains = (await sget(K.pains)) || [];
    S.personas = (await sget(K.personas)) || [];
    S.scripts = (await sget(K.scripts)) || { playbooks: [], cards: [] };
    S.settings = Object.assign({ provider: 'gemini' }, (await sget(K.settings)) || {});
    S.settings.models = Object.assign({ gemini: 'gemini-3.8-flash', huggingface: '', live: 'gemini-3.8-live' }, S.settings.models || {});
    S.sessions = (await sget(K.sessions)) || [];
    S.evidence = (await sget(K.evidence)) || [];
    S.panelRuns = (await sget(K.panel)) || [];
    const seeded = (await sget('lab-seeded')) || {};
    let changed = false;
    [['offers', LAB_SEED_OFFERS], ['pains', LAB_SEED_PAINS], ['personas', LAB_SEED_PERSONAS]].forEach(([k, seed]) => {
      seeded[k] = seeded[k] || [];
      seed.forEach((s) => {
        if (seeded[k].includes(s.id)) return;
        seeded[k].push(s.id); changed = true;
        if (!S[k].some((x) => x.id === s.id)) S[k].push(clone(s));
      });
    });
    if (changed) {
      await sset('lab-seeded', seeded);
      await Promise.all([save('offers'), save('pains'), save('personas')]);
    }
    S.loaded = true;
  }

  /* ---------------------------------------------------------- pure helpers */
  function offerSnapshot(o) { const c = clone(o); delete c.versions; return c; }

  function saveOffer(draft, note) {
    const i = S.offers.findIndex((o) => o.id === draft.id);
    const next = clone(draft);
    if (i < 0) { next.versions = []; next.vc = 0; next.createdAt = now(); }
    else {
      const prev = S.offers[i];
      next.versions = (prev.versions || []).slice();
      next.vc = (prev.vc || next.versions.length) + 1;
      next.versions.push({ v: next.vc, at: now(), note: note || '', data: offerSnapshot(prev) });
      if (next.versions.length > 50) next.versions.shift();
    }
    next.updatedAt = now();
    if (i < 0) S.offers.push(next); else S.offers[i] = next;
    return next;
  }

  function diffOffer(cur, snap) {
    const out = [];
    ['name', 'status', 'industry', 'delivery', 'positioning', 'termsNote'].forEach((f) => { if ((cur[f] || '') !== (snap[f] || '')) out.push(f); });
    if (toText(cur.terms) !== toText(snap.terms)) out.push('terms');
    const ids = new Set([].concat(cur.modules || [], snap.modules || []).map((m) => m.id));
    ids.forEach((id) => {
      const a = (cur.modules || []).find((m) => m.id === id), b = (snap.modules || []).find((m) => m.id === id);
      if (!a || !b) { out.push('module ' + ((a || b).key || '?') + (a ? ' (added)' : ' (removed)')); return; }
      const ch = ['name'].concat(OFFER_FIELDS.map((f) => f[0])).filter((f) => (a[f] || '') !== (b[f] || ''));
      if (ch.length) out.push('module ' + a.key + ': ' + ch.join(', '));
    });
    return out;
  }

  function personaWarnings(p) {
    const h = p.hidden || {}, w = [];
    if (!h.hasLegitimateOpportunity && Number(h.willingnessToBuy) > 40) w.push('Marked as no legitimate opportunity, but willingness to buy is above 40.');
    if (h.hasLegitimateOpportunity && !(h.genuineProblems || []).length) w.push('Marked as a legitimate opportunity, but no genuine problems are listed.');
    if (h.hasLegitimateOpportunity && Number(h.willingnessToBuy) < 5) w.push('Marked as a legitimate opportunity, but willingness to buy is under 5.');
    if ((h.problemsSolved || []).some((x) => (h.genuineProblems || []).includes(x))) w.push('A problem appears in both "genuine problems" and "already solved".');
    return w;
  }

  function diffLines(a, b) {
    const n = a.length, m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { out.push({ t: 'same', x: a[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: 'del', x: a[i] }); i++; }
      else { out.push({ t: 'add', x: b[j] }); j++; }
    }
    while (i < n) out.push({ t: 'del', x: a[i++] });
    while (j < m) out.push({ t: 'add', x: b[j++] });
    return out;
  }

  function guessStage(title) {
    const t = String(title || '').toLowerCase();
    if (/gatekeep|route|not the owner/.test(t)) return 'Gatekeeper';
    if (/objection/.test(t)) return 'Objection';
    if (/open|intro|greet|role/.test(t)) return 'Opening';
    if (/follow/.test(t)) return 'Follow-up';
    if (/close|card|audit|next step|lock|safety|book|ask for/.test(t)) return 'Close';
    if (/pivot|bridge|what it takes|walk|offer|value|pitch|what you do|show/.test(t)) return 'Pitch';
    if (/problem|math|finding|reality|history|status|question|ask|discover|impact|why you called/.test(t)) return 'Discovery';
    return 'Other';
  }

  function parseScript(body) {
    const fm = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    const meta = {}; let rest = body;
    if (fm) {
      fm[1].split(/\r?\n/).forEach((l) => { const i = l.indexOf(':'); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
      rest = body.slice(fm[0].length);
    }
    const cards = []; let cur = null;
    rest.split(/\r?\n/).forEach((raw) => {
      const line = raw.trimEnd();
      if (line.startsWith('## ')) { cur = { title: line.slice(3).trim(), body: [] }; cards.push(cur); return; }
      if (!line.trim()) return;
      if (!cur) { cur = { title: 'Intro', body: [] }; cards.push(cur); }
      cur.body.push(line);
    });
    return { meta, cards };
  }

  function buildBody(pb) {
    const cards = pb.cardIds.map((id) => S.scripts.cards.find((c) => c.id === id)).filter(Boolean);
    const fm = ['name: ' + pb.name, 'noun: ' + (pb.noun || 'business'), 'search: ' + (pb.search || '{{category}} {{city}}')];
    Object.keys(pb.meta || {}).filter((k) => !['name', 'noun', 'search'].includes(k)).forEach((k) => fm.push(k + ': ' + pb.meta[k]));
    let out = '---\n' + fm.join('\n') + '\n---\n\n';
    cards.forEach((c) => {
      out += '## ' + c.title + '\n\n';
      String(c.body || '').split('\n').map((x) => x.trimEnd()).filter((x) => x.trim()).forEach((l) => { out += l + '\n\n'; });
      (c.branches || []).forEach((b) => {
        const t = cards.find((x) => x.id === b.to);
        out += '~ Branch: if ' + b.label + ', go to "' + (t ? t.title : '?') + '".\n\n';
      });
    });
    return out.replace(/\n+$/, '\n');
  }

  function importScript(scriptBody, scriptId) {
    const p = parseScript(scriptBody);
    const pb = { id: uid('pb'), name: (p.meta.name || scriptId || 'Imported script') + ' (builder)', noun: p.meta.noun || 'business', search: p.meta.search || '{{category}} {{city}}', meta: p.meta, source: scriptId || '', cardIds: [] };
    p.cards.forEach((c) => {
      const card = { id: uid('card'), title: c.title, stage: guessStage(c.title), body: c.body.join('\n'), notes: '', tags: [], favorite: false, branches: [], versions: [], createdAt: now() };
      S.scripts.cards.push(card); pb.cardIds.push(card.id);
    });
    S.scripts.playbooks.push(pb);
    return pb;
  }

  function reorder(pbId, dragId, targetId, after) {
    const pb = S.scripts.playbooks.find((x) => x.id === pbId); if (!pb || dragId === targetId) return false;
    const ids = pb.cardIds.filter((x) => x !== dragId);
    const at = ids.indexOf(targetId); if (at < 0) return false;
    ids.splice(after ? at + 1 : at, 0, dragId);
    pb.cardIds = ids; return true;
  }

  function pushUndo() { S.undo.push(JSON.stringify(S.scripts)); if (S.undo.length > 30) S.undo.shift(); }

  /* ----------------------------------------------------------------- views */
  function fld(s, f, label, val, kind, o) {
    o = o || {};
    const at = 'data-s="' + s + '" data-f="' + f + '"' + (o.m ? ' data-m="' + E(o.m) + '"' : '') + (o.h ? ' data-h="1"' : '') + (o.k ? ' data-k="' + o.k + '"' : '');
    if (kind === 'area') return '<div class="field"><label>' + E(label) + '</label><textarea ' + at + ' rows="' + (o.rows || 3) + '">' + E(val) + '</textarea></div>';
    if (kind === 'lines') return '<div class="field"><label>' + E(label) + ' <i>(one per line)</i></label><textarea ' + at + ' data-k="lines" rows="' + (o.rows || 3) + '">' + E(toText(val)) + '</textarea></div>';
    if (kind === 'range') return '<div class="field"><label>' + E(label) + '</label><div class="lab-range"><input type="range" ' + at + ' data-k="num" min="' + o.min + '" max="' + o.max + '" value="' + E(val) + '"><output>' + E(val) + '</output></div></div>';
    if (kind === 'check') return '<label class="lab-check"><input type="checkbox" ' + at + (val ? ' checked' : '') + '> ' + E(label) + '</label>';
    if (kind === 'select') return '<div class="field"><label>' + E(label) + '</label><select ' + at + '>' + o.opts.map((x) => '<option' + (String(x) === String(val) ? ' selected' : '') + '>' + E(x) + '</option>').join('') + '</select></div>';
    return '<div class="field"><label>' + E(label) + '</label><input ' + at + ' value="' + E(val) + '"></div>';
  }


  /* ---- shell: grouped navigation, a plain-English page header, and a Start-here page ---- */
  const NAV = [
    ['', [['home', 'Start here', null, 'What this is for, and what to do next.']]],
    ['Build', [
      ['offers', 'Offers', 'offers', 'What you are selling, on what terms. Written down so it can be tested, not assumed.'],
      ['pains', 'Customer problems', 'pains', 'The problems you think prospects have, and the questions that would prove it.'],
      ['personas', 'Practice buyers', 'personas', 'Pretend prospects to practise against, including some who should say no.'],
      ['scripts', 'Call scripts', 'scripts', 'Reusable script pieces. Nothing reaches a live call until you publish it.']]],
    ['Practice', [['live', 'Guided live', null, 'Scripts and quick answers while you are on a call.'], ['practice', 'Practice calls', 'sessions', 'Talk or type with a pretend buyer, then get coaching quoted from the transcript.']]],
    ['Prove it', [
      ['evidence', 'Evidence', 'evidence', 'What real prospects actually said. This is what turns a guess into proof.'],
      ['panel', 'Expert panel', 'panelRuns', 'Ask AI reviewers to poke holes in an offer before you spend time on it.'],
      ['stats', 'Results', null, 'What the records show so far. Only real data, nothing estimated.']]],
    ['Setup', [['ai', 'AI setup', null, 'Connect your Google or Hugging Face key and check that the models work.']]]
  ];
  function navCount(k) {
    if (!k) return '';
    const n = k === 'scripts' ? S.scripts.cards.length : (S[k] || []).length;
    return n ? String(n) : '';
  }
  function navMeta(tab) {
    for (const g of NAV) for (const it of g[1]) if (it[0] === tab) return it;
    return NAV[0][1][0];
  }
  function secOpen(title, open) { return '<details class="lab-sec"' + (open ? ' open' : '') + '><summary>' + E(title) + '</summary><div class="lab-secbody">'; }
  const secClose = '</div></details>';

  function shellHtml(body) {
    const m = navMeta(S.tab);
    const mini = navMin();
    if (mini) return '<div class="lab-shell mini"><nav class="lab-side"><button class="lab-sideb" data-act="lab-appnav" title="App menu">&#9638;</button><button class="lab-sideb" data-act="lab-navmin" title="Show Sales Lab sections">&raquo;</button></nav><main class="lab-main">' + (S.tab === 'live' ? '' : '<header class="lab-ph"><h2>' + E(m[1]) + '</h2><p>' + E(m[3]) + '</p></header>') + '<div class="lab-body">' + body + '</div></main></div>';
    return '<div class="lab-shell"><nav class="lab-side" aria-label="Sales Lab sections"><div class="lab-sidetools"><button class="lab-sideb" data-act="lab-appnav" title="App menu">&#9638;</button><button class="lab-sideb" data-act="lab-navmin" title="Hide this menu">&laquo;</button></div>' +
      NAV.map((g) => '<div class="lab-group">' + (g[0] ? '<div class="lab-gh">' + E(g[0]) + '</div>' : '') +
        g[1].map((t) => '<button class="lab-nl' + (S.tab === t[0] ? ' on' : '') + '" data-act="tab" data-id="' + t[0] + '"><span>' + E(t[1]) + '</span><em>' + navCount(t[2]) + '</em></button>').join('') + '</div>').join('') +
      '</nav><main class="lab-main">' + (S.tab === 'live' ? '' : '<header class="lab-ph"><h2>' + E(m[1]) + '</h2><p>' + E(m[3]) + '</p></header>') + '<div class="lab-body">' + body + '</div></main></div>';
  }

  function navMin() { try { return localStorage.getItem('lyc-lab-navmin') === '1'; } catch (e) { return false; } }
  function aiReady() {
    const p = S.settings.provider;
    return !!((S.ai[p] || {}).saved && ((S.settings.models || {})[p] || '').trim());
  }

  function vHome() {
    const steps = [
      { t: 'Connect the AI', d: 'Paste your key once. The app checks which models work for you, so you do not have to guess names.', tab: 'ai', done: aiReady(), stat: aiReady() ? 'Connected' : 'Not connected yet', btn: aiReady() ? 'Review' : 'Set up' },
      { t: 'Write down what you are testing', d: 'An offer is a guess about what a prospect will pay for. Writing it down lets you test it honestly.', tab: 'offers', done: S.offers.length > 0, stat: S.offers.length + (S.offers.length === 1 ? ' offer' : ' offers'), btn: 'Open offers' },
      { t: 'Practise a call', d: 'Talk or type with a pretend buyer. Some of them should say no, and the coaching tells you when they were right to.', tab: 'practice', done: S.sessions.length > 0, stat: S.sessions.length + (S.sessions.length === 1 ? ' practice call' : ' practice calls'), btn: 'Start practising' },
      { t: 'Record what real prospects say', d: 'Practice shows how you sound. Only real calls show whether the offer is wanted. Log what people actually said.', tab: 'evidence', done: S.evidence.length > 0, stat: S.evidence.length + ' evidence ' + (S.evidence.length === 1 ? 'item' : 'items'), btn: 'Open evidence' }
    ];
    const next = steps.findIndex((s) => !s.done);
    const more = [['live', 'Guided live', 'Your script and quick answers, laid out for use during a call.'], ['pains', 'Customer problems', 'The problems you think prospects have.'], ['personas', 'Practice buyers', 'Pretend prospects to practise against.'], ['scripts', 'Call scripts', 'Reusable script pieces, published to the call console when you approve.'], ['panel', 'Expert panel', 'Have AI reviewers challenge an offer.'], ['stats', 'Results', 'What the records show so far.']];
    return '<div class="lab-hero"><b>Sales Lab is where you test an idea before you sell it.</b> Nothing here reaches a live call or a real client until you publish it. Everything you see is from your own records.</div>' +
      '<ol class="lab-steps">' + steps.map((s, i) => '<li class="lab-step' + (s.done ? ' done' : '') + (i === next ? ' next' : '') + '"><span class="lab-stepn">' + (s.done ? '&#10003;' : i + 1) + '</span>' +
        '<div class="lab-stepb"><div class="lab-stept">' + E(s.t) + (i === next ? ' <span class="lab-tag">Do this next</span>' : '') + '</div><div class="lab-stepd">' + E(s.d) + '</div><div class="lab-steps-s">' + E(s.stat) + '</div></div>' +
        '<button class="btn' + (i === next ? ' orange' : '') + '" data-act="tab" data-id="' + s.tab + '">' + E(s.btn) + '</button></li>').join('') + '</ol>' +
      '<h4 class="lab-h">Also in here</h4><div class="lab-more">' + more.map((m) => '<button class="lab-morei" data-act="tab" data-id="' + m[0] + '"><b>' + E(m[1]) + '</b><span>' + E(m[2]) + '</span></button>').join('') + '</div>' +
      '<details class="lab-sec" style="margin-top:22px"><summary>Words used here</summary><div class="lab-secbody"><p><b>Offer</b>: what you sell and on what terms.</p><p><b>Customer problem</b>: something you believe prospects struggle with. Treated as a guess until a prospect confirms it.</p><p><b>Practice buyer</b>: a made-up prospect. Never a real person.</p><p><b>Evidence</b>: something a real prospect actually said or did, with where it came from.</p><p><b>Playbook</b>: an ordered set of script cards you can publish to the call console.</p></div></details>';
  }

  /* ---- AI setup: three plain steps, then a check that finds the models that really work for this key ---- */
  function vAi() {
    if (!window.secrets) return '<p class="lab-empty">Key storage is only available inside the desktop app.</p>';
    const cur = S.settings.provider, info = PROV.find((p) => p[0] === cur) || PROV[0], st = S.ai[cur] || {}, ck = S.ui.aiCheck && S.ui.aiCheck.provider === cur ? S.ui.aiCheck : null;
    const models = S.settings.models || {};
    const opts = (arr) => (arr || []).map((m) => '<option value="' + E(m) + '"></option>').join('');
    const line = (okv, text) => '<div class="lab-chk ' + (okv ? 'ok' : 'bad') + '"><span>' + (okv ? '&#10003;' : '&#10005;') + '</span><div>' + text + '</div></div>';
    let res = '';
    if (S.ui.aiBusy) res = '<div class="lab-chk"><span>&hellip;</span><div>Checking. This takes a few seconds.</div></div>';
    else if (ck) {
      if (!ck.ok) res = line(false, E(ck.error || 'The check could not finish.'));
      else {
        res += line(true, 'Your key works.');
        if (ck.note) res += '<div class="lab-count">' + E(ck.note) + '</div>';
        if (ck.textTest) {
          res += ck.textTest.ok ? line(true, 'Text model <b>' + E(ck.textTest.model) + '</b> answered. Used for practice chat, coaching and the expert panel.')
            : line(false, 'Text model <b>' + E(ck.textTest.model || '(none set)') + '</b> did not work: ' + E(ck.textTest.error || 'not available to your key') + '.');
        }
        if (cur === 'gemini') {
          res += ck.liveCheck && ck.liveCheck.listed ? line(true, 'Voice model <b>' + E(ck.liveCheck.model) + '</b> is available' + (ck.liveCheck.tokenOk ? ' and a voice session can be opened.' : ', but a voice session could not be opened: ' + E(ck.liveCheck.error || 'unknown error') + '.'))
            : line(false, 'Voice model <b>' + E((ck.liveCheck && ck.liveCheck.model) || '(none set)') + '</b> is not offered to your key.');
        }
        const rec = ck.recommended || {};
        if ((rec.text && (!ck.textTest || !ck.textTest.ok || ck.textTest.model !== rec.text)) || (rec.live && (!ck.liveCheck || !ck.liveCheck.listed || ck.liveCheck.model !== rec.live))) {
          res += '<div class="lab-rec"><b>Suggested for your key</b>' +
            (rec.text ? '<button class="btn" data-act="ai-use" data-k="text" data-id="' + E(rec.text) + '">Use ' + E(rec.text) + ' for text</button>' : '') +
            (rec.live ? '<button class="btn" data-act="ai-use" data-k="live" data-id="' + E(rec.live) + '">Use ' + E(rec.live) + ' for voice</button>' : '') + '</div>';
        }
        const all = ck.models || {};
        if ((all.text || []).length || (all.live || []).length) {
          res += '<details class="lab-sec"><summary>Every model your key can use (' + ((all.text || []).length + (all.live || []).length) + ')</summary><div class="lab-secbody"><p><b>Text</b>: ' + E((all.text || []).join(', ') || 'none') + '</p><p><b>Voice</b>: ' + E((all.live || []).join(', ') || 'none') + '</p></div></details>';
        }
      }
    }
    return '<div class="lab-ai">' +
      '<div class="lab-aistep"><div class="lab-aihd"><span class="lab-stepn">1</span><b>Choose a provider</b></div>' +
      '<div class="field"><select data-act="ai-provider">' + PROV.map((p) => '<option value="' + p[0] + '"' + (p[0] === cur ? ' selected' : '') + '>' + p[1] + '</option>').join('') + '</select></div>' +
      '<p class="lab-count">' + E(info[2]) + (cur === 'gemini' ? ' Gemini is the only one that can do voice.' : '') + '</p></div>' +
      '<div class="lab-aistep"><div class="lab-aihd"><span class="lab-stepn">2</span><b>Paste your key</b>' + (st.saved ? '<span class="lab-tag ok">Saved, ends in ' + E(st.last4) + '</span>' : '<span class="lab-tag">Not saved</span>') + '</div>' +
      '<div class="field"><input id="lab-aikey" type="password" autocomplete="off" spellcheck="false" placeholder="' + (st.saved ? 'Paste a new key to replace the saved one' : 'Paste your key here') + '"></div>' +
      '<div class="lab-row"><button class="btn orange" data-act="ai-save">Save key</button>' + (st.saved ? '<button class="btn ghost lab-danger" data-act="ai-clear">Remove key</button>' : '') + '<span id="lab-aimsg" class="lab-count"></span></div>' +
      '<p class="lab-count">The key is encrypted on this computer. It is never shown again, never put in backups, and only sent to the provider you picked.</p></div>' +
      '<div class="lab-aistep"><div class="lab-aihd"><span class="lab-stepn">3</span><b>Check that it works</b></div>' +
      '<p class="lab-count">Not sure which model name to use? Press the button. It asks the provider what your key can use, tries your text model, and suggests ones that work.</p>' +
      '<div class="lab-row"><button class="btn orange" data-act="ai-check"' + (st.saved && !S.ui.aiBusy ? '' : ' disabled') + '>Check my setup</button></div>' + res + '</div>' +
      '<details class="lab-sec"><summary>Model names (advanced)</summary><div class="lab-secbody">' +
      '<div class="field"><label>Text model' + (cur === 'huggingface' ? ' (copy it from the model page on Hugging Face)' : '') + '</label><input list="lab-dl-text" data-act="ai-model" value="' + E(models[cur] || '') + '" placeholder="model id"><datalist id="lab-dl-text">' + opts(ck && ck.models && ck.models.text) + '</datalist></div>' +
      (cur === 'gemini' ? '<div class="field"><label>Voice model</label><input list="lab-dl-live" data-act="ai-live-model" value="' + E(models.live || '') + '"><datalist id="lab-dl-live">' + opts(ck && ck.models && ck.models.live) + '</datalist></div>' : '') +
      '</div></details></div>';
  }

  /* ---- Guided live: the call companion. Stage pills, one stage card, quick pivots. Reads the call-console scripts and objections, edits nothing. ---- */
  const LIVE_STAGES = [
    ['Opener', ['Opening', 'Gatekeeper'], 'Start the conversation', 'Earn curiosity before introducing an offer.', 'Listen for what actually happens. Do not bring up the service yet.'],
    ['Discovery', ['Discovery'], 'Find out what is really happening', 'Ask, then let them say the problem in their own words.', 'Write down their exact words. Do not fix anything yet.'],
    ['Pitch', ['Pitch'], 'Show how it works', 'Tie it to what they just told you, nothing more.', 'Stop after the explanation and let them react.'],
    ['Book demo', ['Close'], 'Agree one small next step', 'Ask clearly, then stop talking.', 'If they hesitate, answer one objection from the right, then ask again.'],
    ['Follow-up', ['Follow-up'], 'Leave it in a good place', 'Confirm what happens next and when.', 'Log the call before you do anything else.']
  ];
  const LG_ICON = {
    head: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
    user: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    pen: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    bolt: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M13 3 5 13h6l-1 8 8-10h-6z"/></svg>',
    copy: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
    arrow: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    tap: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V5a1.5 1.5 0 0 1 3 0v5l5 1.2a2 2 0 0 1 1.5 2.4L17.6 19a2 2 0 0 1-2 1.5H11a2 2 0 0 1-1.7-1l-3-4.7a1.5 1.5 0 0 1 2.4-1.8z"/></svg>',
    dots: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18.5" cy="12" r="1.8"/></svg>',
    undo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>'
  };
  function liveState() { if (!S.ui.live) S.ui.live = { stage: 'Opener', part: 0, obj: null, all: false, menu: false, scriptId: '', scn: '' }; return S.ui.live; }
  function liveTitle(t) { return String(t).replace(/^\s*\d+\s*[-.:)]\s*/, '').replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()); }
  function liveScript() {
    if (typeof ccScripts === 'undefined' || !ccScripts.length) return null;
    const L = liveState(), want = L.scriptId || (typeof ccScriptId !== 'undefined' && ccScriptId) || '';
    return ccScripts.find((x) => x.id === want) || ccScripts[0];
  }
  function liveCards() {
    const sc = liveScript(); if (!sc) return [];
    return parseScript(sc.body).cards.filter((c) => c.body.some((l) => l.startsWith('>'))).map((c) => ({ title: liveTitle(c.title), stage: guessStage(c.title), lines: c.body }));
  }
  function liveFill(text) {
    const set = (typeof ccSettings !== 'undefined' && ccSettings) || {}, vals = { rep_name: set.rep_name, offer_line: set.offer_line, discount_line: set.discount_line };
    return E(text).replace(/\{\{(\w+)(?:\|([^}]*))?\}\}/g, (m, k, fb) => {
      const v = vals[k]; if (v) return E(v);
      if (fb !== undefined) return E(fb);
      return '<span class="lg-ph">[' + E(k.replace(/_/g, ' ')) + ']</span>';
    });
  }
  function livePivots() {
    if (typeof ccObjections === 'undefined') return [];
    const all = [];
    (ccObjections.groups || []).forEach((g) => { if (!g.pinned) (g.items || []).forEach((it) => all.push(it)); });
    const rec = ((typeof ccUI !== 'undefined' && ccUI.recent) || []).map((t) => all.find((i) => i.trigger === t)).filter(Boolean);
    const seen = new Set(), out = [];
    rec.concat(all).forEach((i) => { if (!seen.has(i.trigger)) { seen.add(i.trigger); out.push(i); } });
    return out;
  }

  function vLive() {
    const L = liveState(), ready = aiReady();
    const st = LIVE_STAGES.find((s) => s[0] === L.stage) || LIVE_STAGES[0];
    const cards = liveCards().filter((c) => st[1].includes(c.stage));
    if (L.part >= cards.length) L.part = 0;
    const card = cards[L.part];
    const personas = S.personas, sc = personas.find((p) => p.id === L.scn) || null;
    const scenSel = '<select class="lg-sel" data-act="live-scn"><option value="">Typical pest control owner</option>' + personas.map((p) => '<option value="' + E(p.id) + '"' + (p.id === L.scn ? ' selected' : '') + '>' + E(p.name) + (p.mood ? ' · ' + E(p.mood) : '') + '</option>').join('') + '</select>';
    const scenDesc = sc ? ((sc.role || '') + (sc.mood ? ' · ' + sc.mood : '')) : 'Busy, guarded, has heard cold calls before.';

    let say = '', nextMove = st[4], copyText = '';
    if (card) {
      const sayLines = card.lines.filter((l) => l.startsWith('>')).map((l) => l.slice(2).trim());
      copyText = sayLines.map((t) => t.replace(/\{\{(\w+)(?:\|([^}]*))?\}\}/g, (m, k, fb) => { const v = ((typeof ccSettings !== 'undefined' && ccSettings) || {})[k]; return v || (fb !== undefined ? fb : '[' + k.replace(/_/g, ' ') + ']'); })).join('\n\n');
      say = sayLines.map((t) => '<p>' + liveFill(t) + '</p>').join('');
      const moves = card.lines.filter((l) => /^[~!]/.test(l) && !/^~ Branch/.test(l)).map((l) => l.slice(2).trim());
      if (moves.length) nextMove = moves.slice(0, 2).join(' ');
    }
    S.ui.liveCopy = copyText;
    const pager = cards.length > 1 ? '<div class="lg-pager"><button data-act="live-part" data-id="-1" aria-label="Previous part">&lsaquo;</button><span>Part ' + (L.part + 1) + ' of ' + cards.length + (card ? ' &middot; ' + E(card.title) : '') + '</span><button data-act="live-part" data-id="1" aria-label="Next part">&rsaquo;</button></div>' : '';
    const stageCard = '<section class="lg-card"><div class="lg-cardtop"><span class="lg-eyebrow">STAGE GUIDE</span><button class="lg-pillbtn" data-act="live-edit">' + LG_ICON.pen + ' Edit</button></div>' +
      '<h3 class="lg-h3">' + E(st[2]) + '</h3><p class="lg-sub">' + E(st[3]) + '</p>' + pager +
      (card ? '<div class="lg-say"><div class="lg-saytop"><span class="lg-eyebrow">SAY THIS &bull; SUGGESTED</span><button class="lg-copy" data-act="live-copy">' + LG_ICON.copy + ' <span>Copy</span></button></div><div class="lg-saybody">' + say + '</div></div>'
        : '<div class="lg-empty">This script has nothing written for this stage yet. Choose another script below, or press Edit to add it.</div>') +
      '<div class="lg-next"><div class="lg-nexth">' + LG_ICON.arrow + '<b>Next move</b></div><p>' + E(nextMove) + '</p></div></section>';

    const pv = livePivots(), shown = L.all ? pv : pv.slice(0, 10), open = pv.find((i) => i.trigger === L.obj);
    const ans = open ? '<div class="lg-ans"><div class="lg-anst">' + E(open.trigger) + '</div>' + (open.say || []).map((t) => '<p class="lg-anssay">' + liveFill(t) + '</p>').join('') + (open.then ? '<p class="lg-then"><b>Next move:</b> ' + E(open.then) + '</p>' : '') + '</div>'
      : '<div class="lg-pick">' + LG_ICON.tap + '<p>Choose an objection to reveal a suggested response and the next move.</p></div>';
    const pivots = '<section class="lg-card"><div class="lg-cardtop"><h3 class="lg-h3 lg-h3i">' + LG_ICON.bolt + ' Quick pivots</h3></div>' +
      '<p class="lg-sub">Tap what the prospect just said. The response appears below.</p>' +
      '<div class="lg-grid">' + shown.map((i) => '<button class="lg-chip' + (i.trigger === L.obj ? ' on' : '') + '" data-act="live-obj" data-id="' + E(i.trigger) + '">' + E(i.trigger) + '</button>').join('') + '</div>' +
      (pv.length > 10 ? '<button class="lg-more" data-act="live-all">' + (L.all ? 'Show fewer' : 'See all ' + pv.length) + '</button>' : '') + ans + '</section>';

    const scripts = (typeof ccScripts !== 'undefined' ? ccScripts : []);
    const cur = liveScript();
    return '<div class="lg">' +
      '<header class="lg-head"><div class="lg-logo">' + LG_ICON.head + '</div><div class="lg-title"><b>LYCORE Sales Lab</b><span>GUIDED LIVE &bull; Call companion</span></div>' +
      '<div class="lg-status">' + (ready ? '<span class="lg-ready"><i></i>Ready</span>' : '<button class="lg-ready warn" data-act="tab" data-id="ai"><i></i>Set up AI</button>') + '<small>Practice guide</small></div></header>' +
      '<div class="lg-label">Current prospect scenario</div>' + '<div class="lg-selwrap">' + scenSel + '</div>' +
      '<div class="lg-scn">' + LG_ICON.user + '<span>' + E(scenDesc) + '</span></div>' +
      '<div class="lg-label">Conversation stage</div>' +
      '<div class="lg-stages">' + LIVE_STAGES.map((s) => '<button class="lg-stage' + (s[0] === L.stage ? ' on' : '') + '" data-act="live-stage" data-id="' + E(s[0]) + '">' + E(s[0]) + '</button>').join('') + '</div>' +
      '<div class="lg-cols">' + stageCard + pivots + '</div>' +
      '<footer class="lg-foot"><div><b>Edit cards without changing the entire script</b><span>Script: <select class="lg-sel lg-selsm" data-act="live-script">' + scripts.map((s) => '<option value="' + E(s.id) + '"' + (cur && s.id === cur.id ? ' selected' : '') + '>' + E((typeof ccScriptName === 'function' ? ccScriptName(s.id) : s.id)) + '</option>').join('') + '</select></span></div>' +
      '<button class="lg-reset" data-act="live-reset">' + LG_ICON.undo + ' Reset view</button></footer>' +
      '<div class="lg-fab"><button class="lg-dots" data-act="live-menu" aria-label="More">' + LG_ICON.dots + '</button>' +
      (L.menu ? '<div class="lg-menu"><button data-act="live-edit">Edit this script</button><button data-act="live-voice">Practice this by voice</button><button data-act="tab" data-id="practice">Open practice calls</button></div>' : '') + '</div></div>';
  }

  function liveAct(act, id, el) {
    const L = liveState();
    if (act === 'live-stage') { L.stage = id; L.part = 0; L.menu = false; return render(); }
    if (act === 'live-part') { L.part = Math.max(0, L.part + Number(id)); return render(); }
    if (act === 'live-obj') { L.obj = L.obj === id ? null : id; L.menu = false; return render(); }
    if (act === 'live-all') { L.all = !L.all; return render(); }
    if (act === 'live-reset') { Object.assign(L, { stage: 'Opener', part: 0, obj: null, all: false, menu: false }); return render(); }
    if (act === 'live-menu') { L.menu = !L.menu; return render(); }
    if (act === 'live-copy') {
      if (S.ui.liveCopy && navigator.clipboard) navigator.clipboard.writeText(S.ui.liveCopy);
      const sp = el.querySelector('span'); if (sp) { sp.textContent = 'Copied'; setTimeout(() => { sp.textContent = 'Copy'; }, 1200); }
      return;
    }
    if (act === 'live-edit') { L.menu = false; const sc = liveScript(); if (sc && typeof ccOpenScriptForm === 'function') ccOpenScriptForm(sc.id); else toast('Open the Leads screen to edit scripts.', 'info'); return; }
    if (act === 'live-voice') {
      L.menu = false; const sc = liveScript();
      if (sc && typeof ccLoadScript === 'function' && typeof ccVoiceOpen === 'function') { ccScriptId = sc.id; ccLoadScript(sc.id); window.__ccVoiceScn = L.scn || ''; ccVoiceOpen('practice'); }
      else toast('Voice practice needs the desktop app.', 'info');
      return render();
    }
  }

  /* ---- offers */
  function selectOffer(id) {
    const o = S.offers.find((x) => x.id === id), u = S.ui;
    u.offerId = o ? o.id : null; u.draft = o ? clone(o) : null; u.dirty = false;
    u.moduleId = o && o.modules && o.modules[0] ? o.modules[0].id : null;
  }

  function offerEditor(d) {
    const u = S.ui, m = (d.modules || []).find((x) => x.id === u.moduleId) || (d.modules || [])[0];
    const saved = S.offers.find((o) => o.id === d.id) || {};
    const vers = (saved.versions || []).slice().reverse();
    return (d.status !== 'approved' ? '<div class="lab-note">These are proposed terms for testing, not promises made to any real client. Nothing here is sent to the live call script.</div>' : '') +
      '<div class="lab-grid2">' + fld('offer', 'name', 'Offer name', d.name) + fld('offer', 'status', 'Status', d.status, 'select', { opts: STATUS }) +
      fld('offer', 'industry', 'Industry', d.industry) + fld('offer', 'delivery', 'Delivery platform', d.delivery) + '</div>' +
      fld('offer', 'positioning', 'Positioning', d.positioning, 'area', { rows: 3 }) +
      fld('offer', 'terms', 'Commercial terms', d.terms, 'lines', { rows: 7 }) +
      fld('offer', 'termsNote', 'Terms note', d.termsNote, 'area', { rows: 2 }) +
      '<h4 class="lab-h">Modules</h4><div class="lab-mods">' +
      (d.modules || []).map((x) => '<button class="lab-mod' + (m && x.id === m.id ? ' on' : '') + '" data-act="mod-pick" data-id="' + E(x.id) + '"><b>' + E(x.key) + '</b> ' + E(x.name) + '</button>').join('') +
      '<button class="btn ghost" data-act="mod-add">+ Module</button></div>' +
      (m ? '<div class="lab-modbox">' + fld('offer', 'name', 'Module name', m.name, 'text', { m: m.id }) +
        OFFER_FIELDS.map((f) => fld('offer', f[0], f[1], m[f[0]], 'area', { m: m.id, rows: 3 })).join('') +
        '<button class="btn ghost lab-danger" data-act="mod-del" data-id="' + E(m.id) + '">Remove this module</button></div>' : '<p class="lab-empty">No modules yet.</p>') +
      '<div class="lab-bar"><input id="lab-vnote" class="lab-note-in" placeholder="Version note (optional)"><span id="lab-dirty" class="lab-dirty">' + (u.dirty ? 'Unsaved changes' : '') + '</span>' +
      '<button class="btn" data-act="offer-revert">Discard changes</button><button class="btn" data-act="offer-dup">Duplicate</button>' +
      '<button class="btn ghost lab-danger" data-act="offer-del">Delete</button><button class="btn orange" data-act="offer-save">Save new version</button></div>' +
      secOpen('Version history', false) +
      (vers.length ? vers.map((v) => '<div class="lab-ver"><div><b>v' + v.v + '</b> &middot; ' + E(fmt(v.at)) + (v.note ? ' &middot; ' + E(v.note) : '') +
        '<div class="lab-ver-d">Differs from current saved: ' + (E(diffOffer(saved, v.data).join('; ')) || 'nothing') + '</div></div>' +
        '<button class="btn" data-act="ver-restore" data-v="' + v.v + '">Restore into editor</button></div>').join('') : '<p class="lab-empty">No earlier versions yet. Each save keeps the previous state here.</p>') + secClose;
  }

  function vOffers() {
    const u = S.ui;
    if (!u.offerId && S.offers.length) selectOffer(S.offers[0].id);
    return '<div class="lab-split"><div class="lab-list"><div class="lab-listhead"><b>Offers</b><button class="btn" data-act="offer-new">+ New offer</button></div>' +
      S.offers.map((o) => '<button class="lab-item' + (o.id === u.offerId ? ' on' : '') + '" data-act="offer-pick" data-id="' + E(o.id) + '"><span class="lab-item-t">' + E(o.name) + '</span><span class="lab-pill st-' + E(o.status) + '">' + E(o.status) + '</span><span class="lab-item-s">' + (o.versions || []).length + ' saved version' + ((o.versions || []).length === 1 ? '' : 's') + '</span></button>').join('') +
      '</div><div class="lab-detail">' + (u.draft ? offerEditor(u.draft) : '<p class="lab-empty">No offers yet. Create one to start.</p>') + '</div></div>';
  }

  /* ---- pains */
  function newPain() {
    return { id: uid('pain'), name: 'New pain point', industry: 'Pest control (US)', segment: '', symptom: '', rootCause: '', consequence: '', financialEffect: '', discovery: [], consequenceQ: [], statusQuo: [], confirms: [], disproves: [], offer: '', existingSoftware: '', proofRequired: '', severity: 3, willingnessToPay: '', evidenceLevel: 'Untested sales assumption', analogy: '', objections: [], closing: '', favorite: false };
  }
  function painEditor(d) {
    return '<div class="lab-note">A pain point is a hypothesis until a prospect confirms it on a call. Never state it to a prospect as fact.</div>' +
      '<div class="lab-grid2">' + fld('pain', 'name', 'Name', d.name) + fld('pain', 'industry', 'Industry', d.industry) +
      fld('pain', 'segment', 'Customer segment', d.segment) + fld('pain', 'evidenceLevel', 'Evidence level', d.evidenceLevel, 'select', { opts: EVID }) +
      fld('pain', 'severity', 'Severity rating (1 to 5)', d.severity, 'range', { min: 1, max: 5, k: 'num' }) + fld('pain', 'willingnessToPay', 'Willingness-to-pay estimate', d.willingnessToPay) + '</div>' +
      secOpen('The problem in plain words', true) + fld('pain', 'symptom', 'Symptom', d.symptom, 'area') + fld('pain', 'rootCause', 'Root cause', d.rootCause, 'area') +
      fld('pain', 'consequence', 'Business consequence', d.consequence, 'area') + fld('pain', 'financialEffect', 'Possible financial effect', d.financialEffect, 'area') +
      secClose + secOpen('Questions to ask on a call', false) + fld('pain', 'discovery', 'Discovery questions', d.discovery, 'lines') + fld('pain', 'consequenceQ', 'Consequence questions', d.consequenceQ, 'lines') +
      fld('pain', 'statusQuo', 'Questions that challenge the status quo', d.statusQuo, 'lines') +
      fld('pain', 'confirms', 'Responses that confirm the problem', d.confirms, 'lines') + fld('pain', 'disproves', 'Responses that disprove the problem', d.disproves, 'lines') +
      secClose + secOpen('Offer, proof and follow-up', false) + fld('pain', 'offer', 'Relevant LYCORE offer', d.offer) + fld('pain', 'existingSoftware', 'Existing software alternatives', d.existingSoftware, 'area', { rows: 2 }) +
      fld('pain', 'proofRequired', 'Proof required', d.proofRequired, 'area', { rows: 2 }) + fld('pain', 'analogy', 'Suitable analogy', d.analogy, 'area', { rows: 2 }) +
      fld('pain', 'objections', 'Associated objections', d.objections, 'lines') + fld('pain', 'closing', 'Follow-up and closing approach', d.closing, 'area', { rows: 2 }) + secClose +
      '<div class="lab-bar"><span id="lab-dirty" class="lab-dirty">' + (S.ui.dirty ? 'Unsaved changes' : '') + '</span>' +
      '<button class="btn" data-act="pain-cancel">Cancel</button><button class="btn" data-act="pain-dup">Duplicate</button><button class="btn" data-act="pain-copy">Copy to another industry</button><button class="btn ghost lab-danger" data-act="pain-del">Delete</button><button class="btn orange" data-act="pain-save">Save</button></div>';
  }
  function vPains() {
    const u = S.ui, f = u.painFilter, q = f.q.toLowerCase();
    const list = S.pains.filter((p) => (!f.sev || String(p.severity) === f.sev) && (!f.ev || p.evidenceLevel === f.ev) && (!f.ind || p.industry === f.ind) && (!q || JSON.stringify(p).toLowerCase().includes(q)));
    const bar = '<div class="lab-filters"><input id="lab-q" data-flt="painFilter" data-fk="q" placeholder="Search pain points" value="' + E(f.q) + '">' +
      '<select data-flt="painFilter" data-fk="sev"><option value="">Any severity</option>' + [1, 2, 3, 4, 5].map((n) => '<option value="' + n + '"' + (f.sev === String(n) ? ' selected' : '') + '>Severity ' + n + '</option>').join('') + '</select>' +
      '<select data-flt="painFilter" data-fk="ind"><option value="">Any industry</option>' + Array.from(new Set(S.pains.map((p) => p.industry).filter(Boolean))).sort().map((x) => '<option' + (f.ind === x ? ' selected' : '') + '>' + E(x) + '</option>').join('') + '</select>' +
      '<select data-flt="painFilter" data-fk="ev"><option value="">Any evidence level</option>' + EVID.map((x) => '<option' + (f.ev === x ? ' selected' : '') + '>' + E(x) + '</option>').join('') + '</select>' +
      '<button class="btn" data-act="pain-new">+ New pain point</button></div>';
    const grid = list.length ? '<div class="lab-cards3">' + list.map((p) => '<button class="lab-pcard' + (p.id === u.painId ? ' on' : '') + '" data-act="pain-pick" data-id="' + E(p.id) + '"><span class="lab-pcard-t">' + (p.favorite ? '&#9733; ' : '') + E(p.name) + '</span><span class="lab-pcard-s">' + E(p.symptom) + '</span><span class="lab-pcard-m"><span class="lab-pill">Severity ' + E(p.severity) + '</span><span class="lab-pill ev">' + E(p.evidenceLevel) + '</span></span></button>').join('') + '</div>' : '<p class="lab-empty">No pain points match.</p>';
    return bar + '<div class="lab-split2"><div>' + grid + '</div>' + (u.painDraft ? '<div class="lab-detail">' + painEditor(u.painDraft) + '</div>' : '') + '</div>';
  }

  /* ---- personas */
  function newPersona() {
    const h = {}; HFIELDS.forEach((f) => { h[f[0]] = f[2] === 'lines' ? [] : f[2] === 'check' ? true : f[2] === 'range100' ? 30 : f[2] === 'range15' ? 3 : ''; });
    return { id: uid('persona'), name: 'New persona', role: 'Owner', mood: '', synthetic: true, hidden: h };
  }
  function hiddenEditor(d) {
    return HFIELDS.map((f) => {
      const v = d.hidden[f[0]];
      if (f[2] === 'lines') return fld('persona', f[0], f[1], v || [], 'lines', { h: 1, rows: 2 });
      if (f[2] === 'area') return fld('persona', f[0], f[1], v, 'area', { h: 1, rows: 2 });
      if (f[2] === 'range15') return fld('persona', f[0], f[1], v, 'range', { h: 1, min: 1, max: 5, k: 'num' });
      if (f[2] === 'range100') return fld('persona', f[0], f[1], v, 'range', { h: 1, min: 0, max: 100, k: 'num' });
      if (f[2] === 'check') return fld('persona', f[0], f[1], !!v, 'check', { h: 1 });
      return fld('persona', f[0], f[1], v, 'text', { h: 1 });
    }).join('');
  }
  function personaEditor(d) {
    const u = S.ui, shown = !u.blind || u.reveal[d.id], warns = personaWarnings(d);
    return '<div class="lab-note">Synthetic profile for practice. These are made-up buyers, not real businesses. A hidden state must stay consistent through a call.</div>' +
      '<div class="lab-grid2">' + fld('persona', 'name', 'Name', d.name) + fld('persona', 'role', 'Role', d.role) + '</div>' + fld('persona', 'mood', 'How they come across', d.mood, 'area', { rows: 2 }) +
      '<h4 class="lab-h">Hidden buyer state</h4>' +
      (shown ? (warns.length ? '<div class="lab-warn">' + warns.map((w) => '<div>' + E(w) + '</div>').join('') + '</div>' : '') + hiddenEditor(d) :
        '<div class="lab-blind"><p>Blind mode is on. Open this only when you are building or reviewing the persona, because it shows what the buyer is hiding.</p><button class="btn" data-act="persona-reveal">Reveal hidden state</button></div>') +
      '<div class="lab-bar"><span id="lab-dirty" class="lab-dirty">' + (u.dirty ? 'Unsaved changes' : '') + '</span><button class="btn" data-act="persona-cancel">Cancel</button><button class="btn" data-act="persona-dup">Duplicate</button><button class="btn ghost lab-danger" data-act="persona-del">Delete</button><button class="btn orange" data-act="persona-save">Save</button></div>';
  }
  function vPersonas() {
    const u = S.ui, q = u.personaFilter.q.toLowerCase();
    const list = S.personas.filter((p) => !q || (p.name + ' ' + p.role + ' ' + p.mood).toLowerCase().includes(q));
    const noOpp = S.personas.filter((p) => p.hidden && !p.hidden.hasLegitimateOpportunity).length;
    return '<div class="lab-filters"><input id="lab-q" data-flt="personaFilter" data-fk="q" placeholder="Search personas" value="' + E(u.personaFilter.q) + '">' +
      '<label class="lab-check"><input type="checkbox" data-act="blind-toggle"' + (u.blind ? ' checked' : '') + '> Blind mode (hide hidden state)</label>' +
      '<span class="lab-count">' + noOpp + ' of ' + S.personas.length + ' personas have no legitimate LYCORE opportunity</span><button class="btn" data-act="persona-new">+ New persona</button></div>' +
      '<div class="lab-split2"><div class="lab-cards3">' + list.map((p) => '<button class="lab-pcard' + (p.id === u.personaId ? ' on' : '') + '" data-act="persona-pick" data-id="' + E(p.id) + '"><span class="lab-pcard-t">' + E(p.name) + '</span><span class="lab-pcard-s">' + E(p.mood) + '</span><span class="lab-pcard-m"><span class="lab-pill">' + E(p.role) + '</span></span></button>').join('') + '</div>' +
      (u.personaDraft ? '<div class="lab-detail">' + personaEditor(u.personaDraft) + '</div>' : '') + '</div>';
  }

  /* ---- script builder */
  function curPb() { return S.scripts.playbooks.find((p) => p.id === S.ui.pbId) || null; }
  function lineHtml(raw) {
    const k = raw[0], t = E(raw.slice(2).trim());
    const map = { '>': ['say', 'SAY'], '~': ['do', 'NOTE'], '?': ['if', 'IF'], '!': ['stop', 'STOP'], '=': ['why', 'WHY'], '+': ['cap', 'CAPTURE'] };
    const m = map[k]; if (!m) return '<div class="lab-l do"><i>NOTE</i>' + E(raw) + '</div>';
    return '<div class="lab-l ' + m[0] + '"><i>' + m[1] + '</i>' + t + '</div>';
  }
  function visible(c) {
    const f = S.ui.filter, q = f.q.toLowerCase();
    if (f.fav && !c.favorite) return false;
    if (f.stage && c.stage !== f.stage) return false;
    if (f.tag && !(c.tags || []).includes(f.tag)) return false;
    if (q && !(c.title + ' ' + c.body + ' ' + (c.notes || '') + ' ' + (c.tags || []).join(' ')).toLowerCase().includes(q)) return false;
    return true;
  }
  function cardEditor(d, pb) {
    const others = pb.cardIds.filter((id) => id !== d.id).map((id) => S.scripts.cards.find((c) => c.id === id)).filter(Boolean);
    const saved = S.scripts.cards.find((c) => c.id === d.id) || {};
    return '<div class="lab-ed">' + fld('card', 'title', 'Card title', d.title) + fld('card', 'stage', 'Conversational stage', d.stage, 'select', { opts: STAGES }) +
      fld('card', 'body', 'Lines', d.body, 'area', { rows: 10 }) +
      '<div class="lab-legend">Start each line with: &gt; say it &nbsp; ~ note to self &nbsp; ? condition &nbsp; ! stop &nbsp; = reason &nbsp; + variable | label</div>' +
      fld('card', 'notes', 'Delivery and timing notes', d.notes, 'area', { rows: 2 }) +
      '<div class="field"><label>Tags</label><div class="lab-chips">' + (d.tags || []).map((t) => '<span class="lab-chip">' + E(t) + '<button data-act="tag-del" data-t="' + E(t) + '" title="Remove tag">&times;</button></span>').join('') + '</div>' +
      '<div class="lab-row"><select id="lab-tagtype">' + TAGTYPES.map((x) => '<option>' + x + '</option>').join('') + '</select><input id="lab-tagval" placeholder="e.g. pest control"><button class="btn" data-act="tag-add">Add tag</button></div></div>' +
      '<div class="field"><label>Branches (what to do next, depending on the answer)</label>' + (d.branches || []).map((b, i) => '<div class="lab-br">If <b>' + E(b.label) + '</b> go to <b>' + E(((S.scripts.cards.find((c) => c.id === b.to)) || {}).title || 'removed card') + '</b><button data-act="br-del" data-i="' + i + '" title="Remove branch">&times;</button></div>').join('') +
      (others.length ? '<div class="lab-row"><input id="lab-brlabel" placeholder="If they say..."><select id="lab-brto">' + others.map((c) => '<option value="' + E(c.id) + '">' + E(c.title) + '</option>').join('') + '</select><button class="btn" data-act="br-add">Add branch</button></div>' : '<p class="lab-empty">Add more cards to create branches.</p>') + '</div>' +
      ((saved.versions || []).length ? '<div class="field"><label>History</label>' + (saved.versions || []).slice().reverse().map((v, i) => '<div class="lab-ver"><div>' + E(fmt(v.at)) + (v.note ? ' &middot; ' + E(v.note) : '') + '</div><button class="btn" data-act="cver-restore" data-i="' + ((saved.versions.length - 1) - i) + '">Restore into editor</button></div>').join('') + '</div>' : '') +
      '<div class="lab-bar"><input id="lab-cnote" class="lab-note-in" placeholder="Version note (optional)"><span id="lab-dirty" class="lab-dirty">' + (S.ui.dirty ? 'Unsaved changes' : '') + '</span><button class="btn" data-act="card-cancel">Cancel</button><button class="btn orange" data-act="card-save">Save</button></div></div>';
  }
  function cardRow(c, pb, filtering) {
    const u = S.ui, editing = u.editCard === c.id && u.cardDraft, open = !!u.open[c.id];
    const first = String(c.body || '').split('\n').find((l) => l.startsWith('>')) || '';
    const hdr = '<div class="lab-ch"><span class="lab-grip" title="Drag to reorder">&#8942;&#8942;</span><span class="lab-stage">' + E(c.stage) + '</span>' +
      '<button class="lab-title" data-act="card-toggle" data-id="' + E(c.id) + '">' + E(c.title) + '</button>' +
      ((c.branches || []).length ? '<span class="lab-pill">' + c.branches.length + ' branch' + (c.branches.length === 1 ? '' : 'es') + '</span>' : '') +
      '<span class="lab-ca"><button class="lab-star' + (c.favorite ? ' on' : '') + '" data-act="card-fav" data-id="' + E(c.id) + '" title="Favorite">' + (c.favorite ? '&#9733;' : '&#9734;') + '</button>' +
      '<button class="btn ghost" data-act="card-edit" data-id="' + E(c.id) + '">Edit</button><button class="btn ghost" data-act="card-dup" data-id="' + E(c.id) + '">Duplicate</button>' +
      '<button class="btn ghost" data-act="card-cmp" data-id="' + E(c.id) + '">Compare</button><button class="btn ghost lab-danger" data-act="card-del" data-id="' + E(c.id) + '">Delete</button></span></div>';
    const tags = (c.tags || []).length ? '<div class="lab-chips">' + c.tags.map((t) => '<span class="lab-chip">' + E(t) + '</span>').join('') + '</div>' : '';
    let body = '';
    if (editing && !u.compact) body = cardEditor(u.cardDraft, pb);
    else if (open) body = tags + '<div class="lab-lines">' + String(c.body || '').split('\n').filter((l) => l.trim()).map(lineHtml).join('') + '</div>' + (c.notes ? '<div class="lab-cnotes"><b>Delivery notes:</b> ' + E(c.notes) + '</div>' : '') +
      (c.branches || []).map((b) => '<div class="lab-br">If <b>' + E(b.label) + '</b> go to <button class="lab-link" data-act="goto" data-id="' + E(b.to) + '">' + E(((S.scripts.cards.find((x) => x.id === b.to)) || {}).title || 'removed card') + '</button></div>').join('');
    else body = tags + (first ? '<div class="lab-prev">' + E(first.slice(2).slice(0, 150)) + (first.length > 152 ? '...' : '') + '</div>' : '');
    return '<div class="lab-card' + (editing ? ' editing' : '') + '" id="card-' + E(c.id) + '" data-id="' + E(c.id) + '" draggable="' + (editing || filtering ? 'false' : 'true') + '">' + hdr + body + '</div>';
  }
  function vScripts() {
    const u = S.ui, pbs = S.scripts.playbooks;
    if (!u.pbId && pbs.length) u.pbId = pbs[0].id;
    const pb = curPb();
    const f = u.filter, filtering = !!(f.q || f.stage || f.tag || f.fav);
    const alltags = Array.from(new Set(S.scripts.cards.flatMap((c) => c.tags || []))).sort();
    const top = '<div class="lab-filters"><select data-act="pb-pick">' + (pbs.length ? pbs.map((p) => '<option value="' + E(p.id) + '"' + (p.id === u.pbId ? ' selected' : '') + '>' + E(p.name) + '</option>').join('') : '<option value="">No playbooks yet</option>') + '</select>' +
      '<button class="btn" data-act="pb-new">+ New playbook</button><button class="btn" data-act="pb-import">Import from call console</button>' +
      (pb ? '<button class="btn" data-act="pb-rename">Rename</button><button class="btn orange" data-act="pb-publish">Publish to call console</button><button class="btn ghost lab-danger" data-act="pb-del">Delete playbook</button>' : '') + '</div>';
    if (!pb) return top + '<p class="lab-empty">A playbook is an ordered set of script cards. Import one of your call console scripts to start, or make a blank playbook.</p>';
    const bar2 = '<div class="lab-filters"><input id="lab-q" data-flt="filter" data-fk="q" placeholder="Search cards" value="' + E(f.q) + '">' +
      '<select data-flt="filter" data-fk="stage"><option value="">Any stage</option>' + STAGES.map((x) => '<option' + (f.stage === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select>' +
      '<select data-flt="filter" data-fk="tag"><option value="">Any tag</option>' + alltags.map((x) => '<option' + (f.tag === x ? ' selected' : '') + '>' + E(x) + '</option>').join('') + '</select>' +
      '<label class="lab-check"><input type="checkbox" data-flt="filter" data-fk="fav"' + (f.fav ? ' checked' : '') + '> Favorites</label>' +
      '<button class="btn" data-act="card-new">+ Add card</button><button class="btn" data-act="open-all">Expand all</button><button class="btn" data-act="close-all">Collapse all</button>' +
      '<button class="btn" data-act="compact-toggle">' + (u.compact ? 'Inline editing' : 'Side panel editing') + '</button><button class="btn" data-act="undo"' + (S.undo.length ? '' : ' disabled') + '>Undo</button></div>';
    const cards = pb.cardIds.map((id) => S.scripts.cards.find((c) => c.id === id)).filter(Boolean).filter(visible);
    const panel = u.compact && u.editCard && u.cardDraft ? '<aside class="lab-panel">' + cardEditor(u.cardDraft, pb) + '</aside>' : '';
    return top + bar2 + (filtering ? '<div class="lab-note">Filters are on, so drag ordering is paused.</div>' : '') +
      '<div class="lab-sb' + (panel ? ' with-panel' : '') + '"><div class="lab-cards" id="lab-cards">' + (cards.length ? cards.map((c) => cardRow(c, pb, filtering)).join('') : '<p class="lab-empty">No cards match.</p>') + '</div>' + panel + '</div>';
  }

  /* ---- AI settings (keys are write-only; they live in the main process) */
  const PROV = [['gemini', 'Google Gemini', 'Create a key in Google AI Studio.'], ['huggingface', 'Hugging Face', 'Create an access token in your Hugging Face account settings.']];
  async function refreshAi() {
    for (const p of PROV) {
      try { S.ai[p[0]] = (window.secrets ? await window.secrets.status(p[0]) : null) || { saved: false, last4: '' }; } catch (e) { S.ai[p[0]] = { saved: false, last4: '' }; }
    }
  }

  /* ---- Practice (Phase 2): text role-play against a synthetic buyer, then transcript-cited scoring */
  const RUBRIC = [
    ['discovery', 'Discovery', 'Asked questions that surfaced the buyer\'s real situation instead of pitching first.'],
    ['listening', 'Listening', 'Used what the buyer actually said; did not talk over or ignore it.'],
    ['honesty', 'Honesty and pressure', 'No fake urgency, no unsupported claims, no steering around the buyer\'s concerns.'],
    ['objections', 'Objection handling', 'Treated objections as information; answered only what was raised.'],
    ['fit', 'Fit judgment', 'Recognised whether there was a real opportunity and acted accordingly, including stopping when there was not.'],
    ['nextstep', 'Next step', 'Ended with a clear, proportionate next step, or a clean exit when appropriate.']
  ];
  const OUTCOMES = {
    booked_next_step: 'A real next step was agreed',
    declined_appropriately: 'Buyer declined and the rep handled it well',
    should_have_disqualified: 'No real fit, and the rep kept pushing',
    ended_early: 'Call ended before there was enough to judge',
    unclear: 'Unclear'
  };

  function hiddenSummary(h) {
    h = h || {};
    const l = (a) => (a && a.length ? a.join('; ') : 'none');
    return [
      'Company size: ' + (h.companySize || 'unspecified'), 'Service lines: ' + l(h.serviceLines), 'Job volume: ' + (h.jobVolume || 'unspecified'),
      'Software already used: ' + (h.existingSoftware || 'unspecified'), 'Who decides: ' + (h.decisionAuthority || 'unspecified'),
      'Genuine operational problems: ' + l(h.genuineProblems), 'Problems already solved: ' + l(h.problemsSolved),
      'Recent events: ' + (h.recentEvents || 'none'), 'Past vendor experience: ' + (h.previousVendors || 'none'),
      'Time available: ' + (h.timeAvailability || 'unspecified'), 'Budget sensitivity (1 low to 5 high): ' + h.budgetSensitivity,
      'Trust level toward strangers (1 low to 5 high): ' + h.trustLevel, 'How you like to be contacted: ' + (h.responsePreference || 'unspecified'),
      'Willingness to buy (0 to 100): ' + h.willingnessToBuy, 'Objections you are likely to raise: ' + l(h.likelyObjections),
      'What would change your mind: ' + (h.evidenceThatChangesView || 'nothing in particular'),
      'There is a legitimate opportunity for the caller: ' + (h.hasLegitimateOpportunity ? 'yes' : 'NO')
    ].join('\n');
  }

  function buildPersonaPromptBase(p) {
    return 'You are role-playing a small business owner or manager who receives an unsolicited sales phone call, for sales training. Stay in character the whole time. You are not a salesperson and you never coach the caller.\n\n' +
      'WHO YOU ARE\nName: ' + p.name + '\nRole: ' + p.role + '\nHow you come across: ' + (p.mood || 'ordinary') + '\n\n' +
      'YOUR PRIVATE SITUATION (the caller knows none of this; never recite it as a list; let pieces out only when the caller earns them with good questions)\n' + hiddenSummary(p.hidden) + '\n\n' +
      'RULES\n- Talk like a real person on the phone: plain words, one to three short sentences, no stage directions.\n' +
      '- Stay consistent with your private situation. Do not invent facts that contradict it.\n- Do not volunteer your problems. Mention one only when a question would naturally bring it up.\n' +
      '- Your willingness to buy, trust and budget sensitivity above are real. Pressure, vague claims and flattery lower your willingness. Genuine relevance can raise it, but only as far as your situation justifies.\n' +
      '- If there is NO legitimate opportunity for the caller, you must not be talked into buying. Decline politely or firmly, and do not pretend to have problems you do not have.\n' +
      '- If the caller uses fake urgency, guarantees, or avoids answering how something works, react the way a skeptical owner would.\n' +
      '- Real owners hang up sometimes. If you would, say your last line and end the message with [HANGUP].\n- Never say you are an AI or that this is a simulation. Do not break character for any reason.';
  }

  function buildPersonaPrompt(p, opts) {
    let s = buildPersonaPromptBase(p);
    if (opts && opts.voice) s = s.replace('- Real owners hang up sometimes. If you would, say your last line and end the message with [HANGUP].', '- This is a live phone call. Speak naturally and briefly. Real owners end calls sometimes; if you would, say a short goodbye and stop talking.');
    return s;
  }

  function transcriptText(turns) {
    return turns.map((t, i) => '[' + (i + 1) + '] ' + (t.role === 'rep' ? 'REP' : 'BUYER') + ': ' + t.text).join('\n');
  }

  function buildScorePrompt(p, turns) {
    return 'You are a strict, fair sales coach reviewing a practice cold call. The BUYER is a synthetic persona whose private situation is below. The REP is the trainee. Judge only what is in the transcript.\n\n' +
      'BUYER PRIVATE SITUATION\n' + hiddenSummary(p.hidden) + '\n\nTRANSCRIPT (numbered lines)\n' + transcriptText(turns) + '\n\n' +
      'RUBRIC (score each 0 to 5)\n' + RUBRIC.map((r) => '- ' + r[0] + ': ' + r[2]).join('\n') + '\n\n' +
      'SCORING RULES\n- Every score must cite 1 to 3 evidence items: the line number and a SHORT exact quote copied from that line. If you cannot cite evidence, give score null.\n' +
      '- Penalise fake urgency, unsupported claims, pressure after a clear no, and any attempt to steer unhappy customers away from public reviews.\n' +
      '- If the buyer had no legitimate opportunity, the best outcome is a clean, respectful exit. Reward that. Do not reward a sale that should not have happened.\n- Do not invent lines that are not in the transcript.\n\n' +
      'Reply with JSON only, in exactly this shape:\n{"outcome":"booked_next_step|declined_appropriately|should_have_disqualified|ended_early|unclear","fit_was_real":true,' +
      '"scores":[{"category":"discovery","score":0,"evidence":[{"line":1,"quote":"..."}],"comment":"..."}],' +
      '"missed":[{"what":"...","line":1}],"red_flags":[{"type":"...","line":1,"quote":"..."}],"summary":"two or three sentences"}';
  }

  function parseJsonLoose(text) {
    let s = String(text || '').trim();
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try { return JSON.parse(s); } catch (e) { /* fall through */ }
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { /* give up */ } }
    return null;
  }

  const norm = (x) => String(x || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9' ]/g, '').trim();
  function quoteOk(turns, line, quote) {
    const t = turns[Number(line) - 1]; const q = norm(quote);
    return !!(t && q.length >= 4 && norm(t.text).includes(q));
  }

  /* Keeps only claims the transcript supports. A score with no verifiable evidence is dropped, not guessed. */
  function validateScore(raw, turns) {
    if (!raw || typeof raw !== 'object') return null;
    const out = { outcome: OUTCOMES[raw.outcome] ? raw.outcome : 'unclear', fitWasReal: raw.fit_was_real === true, scores: [], missed: [], redFlags: [], summary: String(raw.summary || '').slice(0, 800), dropped: 0 };
    (Array.isArray(raw.scores) ? raw.scores : []).forEach((s) => {
      const cat = RUBRIC.find((r) => r[0] === s.category); if (!cat) return;
      const ev = (Array.isArray(s.evidence) ? s.evidence : []).filter((e) => quoteOk(turns, e.line, e.quote)).map((e) => ({ line: Number(e.line), quote: String(e.quote) }));
      const n = Number(s.score);
      if (!ev.length || !(n >= 0 && n <= 5)) { out.dropped++; return; }
      out.scores.push({ category: cat[0], label: cat[1], score: Math.round(n), evidence: ev, comment: String(s.comment || '').slice(0, 500) });
    });
    (Array.isArray(raw.missed) ? raw.missed : []).forEach((m) => { if (m && m.what) out.missed.push({ what: String(m.what).slice(0, 300), line: turns[Number(m.line) - 1] ? Number(m.line) : null }); });
    (Array.isArray(raw.red_flags) ? raw.red_flags : []).forEach((r) => { if (r && quoteOk(turns, r.line, r.quote)) out.redFlags.push({ type: String(r.type || '').slice(0, 80), line: Number(r.line), quote: String(r.quote) }); else out.dropped++; });
    return out;
  }

  function practiceStats() {
    const done = S.sessions.filter((s) => s.score);
    const by = {}; RUBRIC.forEach((r) => { by[r[0]] = []; });
    done.forEach((s) => s.score.scores.forEach((x) => { if (by[x.category]) by[x.category].push(x.score); }));
    return { total: S.sessions.length, scored: done.length, avg: RUBRIC.map((r) => ({ label: r[1], n: by[r[0]].length, avg: by[r[0]].length ? by[r[0]].reduce((a, b) => a + b, 0) / by[r[0]].length : null })) };
  }

  function curModel() { const m = (S.settings.models || {})[S.settings.provider]; return m ? m.trim() : ''; }

  async function callModel(system, turnsOrMsgs, json) {
    if (!window.ai) return { ok: false, error: 'AI calls only work inside the desktop app.' };
    return window.ai.chat({ provider: S.settings.provider, model: curModel(), system, messages: turnsOrMsgs, json: !!json });
  }

  function vPractice() {
    const P = S.practice, ses = P.session;
    if (!window.ai) return '<p class="lab-empty">Practice calls need the desktop app.</p>';
    if (ses && ses.score) return vDebrief(ses);
    if (ses && ses.mode === 'voice') return vVoice(ses);
    if (ses) {
      const bubbles = ses.turns.map((t) => '<div class="lab-b ' + t.role + '"><i>' + (t.role === 'rep' ? 'You' : E(ses.personaName)) + '</i>' + E(t.text) + '</div>').join('') ||
        '<p class="lab-empty">The phone is ringing. They pick up. You speak first.</p>';
      return '<div class="lab-detail"><div class="lab-ch"><b>Calling a synthetic buyer</b><span class="lab-pill">Hidden state stays hidden until you finish</span><span class="lab-ca"><button class="btn orange" data-act="pr-end"' + (P.busy ? ' disabled' : '') + '>End call and score</button><button class="btn ghost lab-danger" data-act="pr-abandon">Discard</button></span></div>' +
        '<div class="lab-tx" id="lab-tx">' + bubbles + (P.busy ? '<div class="lab-b prospect"><i>' + E(ses.personaName) + '</i>...</div>' : '') + '</div>' +
        (P.err ? '<div class="lab-warn">' + E(P.err) + '</div>' : '') +
        (ses.hungUp ? '<div class="lab-note">They hung up. End the call to see how it went.</div>' :
          '<div class="lab-row"><textarea id="lab-pin" rows="2" placeholder="Say your line. Enter sends, Shift+Enter makes a new line."' + (P.busy ? ' disabled' : '') + '>' + E(P.draft) + '</textarea><button class="btn orange" data-act="pr-send"' + (P.busy ? ' disabled' : '') + '>Send</button></div>') + '</div>';
    }
    const st = practiceStats();
    const prov = PROV.find((p) => p[0] === S.settings.provider)[1], ready = curModel() && (S.ai[S.settings.provider] || {}).saved, voiceReady = S.settings.provider === 'gemini' && (S.ai.gemini || {}).saved && liveModel();
    const done = S.sessions.slice().reverse();
    return '<div class="lab-split2"><div class="lab-detail"><h4 class="lab-h" style="margin-top:0">New practice call</h4>' +
      (ready ? '' : '<div class="lab-warn">Set a key and a model in AI Settings first (provider: ' + E(prov) + ').</div>') +
      '<div class="field"><label>Type of call</label><select data-act="pr-mode"><option value="text"' + (P.mode === 'text' ? ' selected' : '') + '>Text (type your lines)</option><option value="voice"' + (P.mode === 'voice' ? ' selected' : '') + '>Voice (speak out loud)</option></select></div>' +
      (P.mode === 'voice' ? (voiceReady ? '<div class="lab-note">Voice uses your microphone and sends your audio to Google while the call runs. Audio is not saved; only the transcript is. Use headphones so the buyer\'s voice does not feed back. Calls stop after 8 minutes.</div>' : '<div class="lab-warn">Voice needs Gemini selected as the provider, a saved Gemini key, and a voice model name in AI Settings.</div>') : '') +
      '<div class="field"><label>Buyer</label><select data-act="pr-persona">' + S.personas.map((p) => '<option value="' + E(p.id) + '"' + (p.id === P.personaId ? ' selected' : '') + '>' + E(p.name) + ' - ' + E(p.role) + '</option>').join('') + '</select></div>' +
      '<p class="lab-count">Some buyers have no real need for what you sell. Part of the skill is noticing that and leaving cleanly. You will not be told which kind you have drawn.</p>' +
      '<button class="btn" data-act="pr-random">Pick one at random</button> <button class="btn orange" data-act="pr-start"' + ((P.mode === 'voice' ? voiceReady : ready) ? '' : ' disabled') + '>Start call</button></div>' +
      '<div><div class="lab-detail"><h4 class="lab-h" style="margin-top:0">Your record</h4>' +
      (st.scored ? '<p class="lab-count">' + st.scored + ' scored of ' + st.total + ' calls. Averages are only from lines the transcript supports.</p>' + st.avg.map((a) => '<div class="lab-ver"><span>' + E(a.label) + '</span><b>' + (a.avg == null ? 'no data' : a.avg.toFixed(1) + ' / 5 (' + a.n + ')') + '</b></div>').join('') : '<p class="lab-empty">No scored calls yet. Nothing here is estimated.</p>') +
      '</div><div class="lab-detail" style="margin-top:12px"><h4 class="lab-h" style="margin-top:0">Past calls</h4>' +
      (done.length ? done.map((s) => '<div class="lab-ver"><div><b>' + E(s.personaName) + '</b> &middot; ' + E(fmt(s.startedAt)) + '<div class="lab-ver-d">' + (s.score ? E(OUTCOMES[s.score.outcome]) : 'Not scored') + '</div></div><button class="btn" data-act="pr-open" data-id="' + E(s.id) + '">Open</button></div>').join('') : '<p class="lab-empty">None yet.</p>') + '</div></div></div>';
  }

  function vDebrief(ses) {
    const sc = ses.score, p = S.personas.find((x) => x.id === ses.personaId), h = (p && p.hidden) || ses.hiddenSnapshot || {};
    return '<div class="lab-detail"><div class="lab-ch"><b>Debrief: ' + E(ses.personaName) + '</b><span class="lab-ca"><button class="btn" data-act="pr-close">Back</button><button class="btn ghost lab-danger" data-act="pr-delete" data-id="' + E(ses.id) + '">Delete this call</button></span></div>' +
      (ses.mode === 'voice' ? '<div class="lab-note">This was a voice call. The transcript was produced automatically, so wording may differ slightly from what was said. No audio was saved.</div>' : '') + '<div class="lab-note">These scores come from an AI model reading the transcript. Only points backed by a real quote from the call are kept. Treat it as a second opinion, not a verdict.</div>' +
      '<p><b>Outcome:</b> ' + E(OUTCOMES[sc.outcome]) + '. <b>There was ' + (h.hasLegitimateOpportunity ? 'a real opportunity' : 'no real opportunity') + ' here</b>' + (sc.fitWasReal !== !!h.hasLegitimateOpportunity ? ' (the reviewer read it differently)' : '') + '.</p>' +
      (sc.summary ? '<p>' + E(sc.summary) + '</p>' : '') +
      '<h4 class="lab-h">Scores</h4>' + (sc.scores.length ? sc.scores.map((x) => '<div class="lab-ver"><div><b>' + E(x.label) + ': ' + x.score + ' / 5</b><div class="lab-ver-d">' + E(x.comment) + '</div>' + x.evidence.map((e) => '<div class="lab-ver-d">Line ' + e.line + ': "' + E(e.quote) + '"</div>').join('') + '</div></div>').join('') : '<p class="lab-empty">No score could be backed by the transcript.</p>') +
      (sc.dropped ? '<p class="lab-count">' + sc.dropped + ' item(s) were dropped because their quotes were not found in the call.</p>' : '') +
      (sc.redFlags.length ? '<h4 class="lab-h">Red flags</h4>' + sc.redFlags.map((r) => '<div class="lab-warn">' + E(r.type) + ' - line ' + r.line + ': "' + E(r.quote) + '"</div>').join('') : '') +
      (sc.missed.length ? '<h4 class="lab-h">Missed chances</h4>' + sc.missed.map((m) => '<div class="lab-ver-d">' + E(m.what) + (m.line ? ' (line ' + m.line + ')' : '') + '</div>').join('') : '') +
      '<h4 class="lab-h">What the buyer was hiding</h4><pre class="lab-pre">' + E(hiddenSummary(h)) + '</pre>' +
      '<h4 class="lab-h">Transcript</h4><div class="lab-tx">' + ses.turns.map((t, i) => '<div class="lab-b ' + t.role + '"><i>[' + (i + 1) + '] ' + (t.role === 'rep' ? 'You' : E(ses.personaName)) + '</i>' + E(t.text) + '</div>').join('') + '</div></div>';
  }

  function liveModel() { const m = (S.settings.models || {}).live; return m ? m.trim() : ''; }

  function vVoice(ses) {
    const P = S.practice, live = P.live;
    const label = { connecting: 'Connecting...', listening: 'Listening. Talk normally.', speaking: ses.personaName + ' is talking. You can interrupt.', ended: 'Call ended. Press End call and score.' }[P.vstate] || '';
    const bubbles = ses.turns.map((t) => '<div class="lab-b ' + t.role + '"><i>' + (t.role === 'rep' ? 'You' : E(ses.personaName)) + '</i>' + E(t.text) + '</div>').join('') +
      (live ? '<div class="lab-b ' + live.role + '"><i>' + (live.role === 'rep' ? 'You' : E(ses.personaName)) + '</i>' + E(live.text) + ' ...</div>' : '');
    return '<div class="lab-detail"><div class="lab-ch"><b>Voice call with a synthetic buyer</b><span class="lab-pill">' + E(label) + '</span><span class="lab-ca"><button class="btn orange" data-act="pr-end"' + (P.busy ? ' disabled' : '') + '>End call and score</button><button class="btn ghost lab-danger" data-act="pr-abandon">Discard</button></span></div>' +
      '<div class="lab-tx" id="lab-tx">' + (bubbles || '<p class="lab-empty">Start talking when it says Listening. Your words appear here as the call is transcribed.</p>') + '</div>' +
      (P.notice ? '<div class="lab-note">' + E(P.notice) + '</div>' : '') + (P.err ? '<div class="lab-warn">' + E(P.err) + '</div>' : '') + '</div>';
  }

  async function startVoice() {
    const P = S.practice, p = S.personas.find((x) => x.id === P.personaId) || S.personas[0]; if (!p) return;
    if (!window.ai || !window.ai.liveToken || typeof LabVoice === 'undefined') { toast('Voice needs the desktop app.', 'error'); return; }
    const ses = { id: uid('ses'), personaId: p.id, personaName: p.name, startedAt: now(), turns: [], hiddenSnapshot: clone(p.hidden), provider: 'gemini', model: liveModel(), mode: 'voice', score: null };
    P.session = ses; P.err = ''; P.notice = ''; P.live = null; P.vstate = 'connecting'; render();
    const tk = await window.ai.liveToken();
    if (!tk.ok) { P.err = tk.error; P.session = null; P.vstate = ''; return render(); }
    let pending = false;
    const repaint = () => { if (pending) return; pending = true; setTimeout(() => { pending = false; if (S.practice.session === ses && S.tab === 'practice') render(); }, 120); };
    const ctl = LabVoice.create({
      onTurn: (role, text) => { ses.turns.push({ role, text }); repaint(); },
      onLive: (l) => { P.live = l; repaint(); },
      onState: (s) => { P.vstate = s; repaint(); },
      onNotice: (m) => { P.notice = m; repaint(); },
      onError: (m) => { P.err = m; repaint(); },
      onClosed: (why) => { P.ctl = null; P.vstate = 'ended'; P.live = null; if (why) P.notice = 'Call closed: ' + why; repaint(); }
    });
    P.ctl = ctl;
    try { await ctl.start(tk.token, liveModel(), buildPersonaPrompt(Object.assign({}, p, { hidden: ses.hiddenSnapshot }), { voice: true })); }
    catch (e) {
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'NotFoundError');
      ctl.stop(); P.ctl = null; P.session = null; P.vstate = '';
      P.err = denied ? 'The microphone is blocked or missing. Allow it in Windows privacy settings, or use a text call.' : 'Could not start the voice call. Text calls still work.';
      render();
    }
  }

  async function saveSessions() { await sset(K.sessions, S.sessions); }

  async function practiceAct(act, id) {
    const P = S.practice;
    if (act === 'pr-random') { P.personaId = S.personas[Math.floor(Math.random() * S.personas.length)].id; return render(); }
    if (act === 'pr-start' && P.mode === 'voice') return startVoice();
    if (act === 'pr-start') {
      const p = S.personas.find((x) => x.id === P.personaId) || S.personas[0]; if (!p) return;
      P.session = { id: uid('ses'), personaId: p.id, personaName: p.name, startedAt: now(), turns: [], hiddenSnapshot: clone(p.hidden), provider: S.settings.provider, model: curModel(), score: null, hungUp: false };
      P.err = ''; P.draft = ''; return render();
    }
    if (act === 'pr-abandon') { if (!confirm('Discard this call?')) return; if (P.ctl) P.ctl.stop(); P.session = null; P.err = ''; return render(); }
    if (act === 'pr-open') { P.session = S.sessions.find((s) => s.id === id) || null; return render(); }
    if (act === 'pr-close') { P.session = null; return render(); }
    if (act === 'pr-delete') { if (!confirm('Delete this call record?')) return; S.sessions = S.sessions.filter((s) => s.id !== id); await saveSessions(); P.session = null; return render(); }
    if (act === 'pr-send') return practiceSend();
    if (act === 'pr-end') return practiceEnd();
  }

  async function practiceSend() {
    const P = S.practice, ses = P.session, box = document.getElementById('lab-pin');
    const text = ((box && box.value) || P.draft || '').trim(); if (!text || P.busy || !ses) return;
    const p = S.personas.find((x) => x.id === ses.personaId); if (!p) return;
    ses.turns.push({ role: 'rep', text }); P.draft = ''; P.busy = true; P.err = ''; render();
    const system = buildPersonaPrompt(Object.assign({}, p, { hidden: ses.hiddenSnapshot || p.hidden }));
    const r = await callModel(system, ses.turns.map((t) => ({ role: t.role === 'rep' ? 'user' : 'assistant', content: t.text })), false);
    P.busy = false;
    if (!r.ok) { ses.turns.pop(); P.draft = text; P.err = r.error || 'The model did not answer. Your line was kept; try sending again.'; return render(); }
    let reply = String(r.text || '').trim(), hang = /\[HANGUP\]/i.test(reply);
    reply = reply.replace(/\[HANGUP\]/ig, '').trim() || '(hangs up)';
    ses.turns.push({ role: 'prospect', text: reply }); if (hang) ses.hungUp = true;
    if (!S.sessions.some((s) => s.id === ses.id)) S.sessions.push(ses);
    await saveSessions(); render();
  }

  async function practiceEnd() {
    const P = S.practice, ses = P.session; if (!ses || P.busy) return;
    if (ses.mode === 'voice' && P.ctl) { P.ctl.stop(); await new Promise((r) => setTimeout(r, 60)); }
    if (ses.turns.filter((t) => t.role === 'rep').length < 2) { toast('Say at least two lines before scoring.', 'error'); return; }
    P.busy = true; P.err = ''; render();
    const p = { name: ses.personaName, hidden: ses.hiddenSnapshot };
    const r = await callModel('You are a careful sales coach. Reply with valid JSON only.', [{ role: 'user', content: buildScorePrompt(p, ses.turns) }], true);
    P.busy = false;
    if (!r.ok) { P.err = (r.error || 'Scoring failed.') + ' The call is saved; press End call and score to retry.'; if (!S.sessions.some((s) => s.id === ses.id)) S.sessions.push(ses); await saveSessions(); return render(); }
    const v = validateScore(parseJsonLoose(r.text), ses.turns);
    if (!v) { P.err = 'The reviewer did not return a usable score. Press End call and score to try again.'; return render(); }
    ses.score = v; ses.endedAt = now();
    if (!S.sessions.some((s) => s.id === ses.id)) S.sessions.push(ses);
    await saveSessions(); render();
  }

  /* ---- Phase 4: Evidence library, adversarial panel, analytics ---- */
  const SRC_TYPES = ['Call note', 'Prospect reply', 'Article or research', 'Competitor page', 'Own result', 'Other'];
  const PANEL_ROLES = [
    ['skeptic', 'Skeptical owner', 'a busy small-business owner who has been burned by vendors and dislikes being sold to'],
    ['compliance', 'Compliance reviewer', 'a reviewer of US consumer-protection rules: FTC endorsement and review rules, Google review policies, TCPA and A2P messaging consent, CAN-SPAM'],
    ['competitor', 'Rival vendor', 'a rival vendor hunting for the weakest or least provable claims'],
    ['finance', 'Price-sensitive buyer', 'an owner or bookkeeper judging whether the economics make sense'],
    ['delivery', 'Delivery lead', 'the person who must actually deliver this on GoHighLevel with the stated integrations, and who finds what cannot be delivered as promised']
  ];

  function redact(t) {
    return String(t || '').replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]').replace(/(?:\+?\d{1,2}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}/g, '[phone]');
  }

  function newEvidence() {
    return { id: uid('ev'), title: 'New evidence', sourceType: 'Call note', source: '', date: new Date().toISOString().slice(0, 10), type: 'Reported anecdote', relevance: 3, confidence: 3, text: '', offers: [], pains: [], parent: '', createdAt: now() };
  }

  /* An evidence item can only be called a demonstrated LYCORE result if it is one of our own results. */
  function evidenceProblems(e) {
    const w = [];
    if (e.type === 'Demonstrated LYCORE result' && e.sourceType !== 'Own result') w.push('"Demonstrated LYCORE result" is only for results LYCORE produced itself. Change the source type to "Own result" or pick a different level.');
    if (!String(e.text || '').trim()) w.push('Add the actual text or numbers this item rests on.');
    if (!e.date) w.push('Add a date.');
    return w;
  }

  function offerText(o) {
    const mods = (o.modules || []).map((m) => 'Module ' + m.key + ' - ' + m.name + '\n' + OFFER_FIELDS.map((f) => '  ' + f[1] + ': ' + (m[f[0]] || '(blank)')).join('\n')).join('\n');
    return 'Offer: ' + o.name + '\nStatus: ' + o.status + '\nIndustry: ' + o.industry + '\nDelivery: ' + o.delivery + '\nPositioning: ' + o.positioning + '\nTerms:\n' + (o.terms || []).map((x) => '  - ' + x).join('\n') + '\n' + mods;
  }

  function buildPanelPrompt(role, o, ev) {
    return 'You are ' + role[2] + '. Challenge the offer below. You are a challenger, not a judge of demand.\n\nOFFER\n' + offerText(o) + '\n\nEVIDENCE ATTACHED TO THIS OFFER\n' +
      (ev.length ? ev.map((e, i) => '[E' + (i + 1) + '] (' + e.type + ', relevance ' + e.relevance + '/5, confidence ' + e.confidence + '/5, ' + e.date + ') ' + e.title + ': ' + String(e.text).slice(0, 700)).join('\n') : '(none attached)') + '\n\n' +
      'RULES\n- Give 3 to 6 specific challenges from your point of view.\n- For each, say whether the evidence attached supports your concern or the offer\'s claim: "supported" (an attached item backs it, cite its id), "unsupported" (a claim is made with nothing attached to back it), or "missing" (evidence that should exist but does not).\n' +
      '- Any claim about demand, price acceptance or results is "unsupported" unless a listed item backs it.\n- "quote" must be exact words copied from the offer text above, or empty if the challenge is about something absent.\n- Do not estimate willingness to pay or conversion. Do not invent evidence.\n\n' +
      'Reply with JSON only: {"challenges":[{"point":"...","quote":"...","status":"supported|unsupported|missing","evidence_ids":["E1"],"what_would_resolve":"..."}],"biggest_risk":"..."}';
  }

  function validatePanel(raw, o, ev) {
    if (!raw || !Array.isArray(raw.challenges)) return null;
    const text = norm(offerText(o)), out = { challenges: [], biggestRisk: String(raw.biggest_risk || '').slice(0, 400), downgraded: 0 };
    raw.challenges.slice(0, 8).forEach((c) => {
      if (!c || !c.point) return;
      const q = String(c.quote || '').trim(), quoted = q.length >= 4 && text.includes(norm(q));
      const ids = (Array.isArray(c.evidence_ids) ? c.evidence_ids : []).map((x) => /^E(\d+)$/i.exec(String(x))).filter(Boolean).map((m) => Number(m[1])).filter((n) => n >= 1 && n <= ev.length);
      let status = ['supported', 'unsupported', 'missing'].includes(c.status) ? c.status : 'unsupported';
      if (status === 'supported' && !ids.length) { status = 'unsupported'; out.downgraded++; }
      out.challenges.push({ point: String(c.point).slice(0, 500), quote: quoted ? q : '', status, evidence: ids.map((n) => ev[n - 1].title), resolve: String(c.what_would_resolve || '').slice(0, 400) });
    });
    return out.challenges.length ? out : null;
  }

  function evForOffer(oid) { return S.evidence.filter((e) => (e.offers || []).includes(oid)); }

  function computeStats() {
    const ss = S.sessions, scored = ss.filter((s) => s.score), by = (f) => ss.filter(f).length;
    const outcomes = {}; Object.keys(OUTCOMES).forEach((k) => { outcomes[k] = scored.filter((s) => s.score.outcome === k).length; });
    const noFit = scored.filter((s) => s.hiddenSnapshot && !s.hiddenSnapshot.hasLegitimateOpportunity);
    const fit = scored.filter((s) => s.hiddenSnapshot && s.hiddenSnapshot.hasLegitimateOpportunity);
    const flags = {}; scored.forEach((s) => s.score.redFlags.forEach((r) => { const k = (r.type || 'other').toLowerCase(); flags[k] = (flags[k] || 0) + 1; }));
    const levels = {}; EVID.forEach((x) => { levels[x] = S.evidence.filter((e) => e.type === x).length; });
    const painLevels = {}; EVID.forEach((x) => { painLevels[x] = S.pains.filter((p) => p.evidenceLevel === x).length; });
    return {
      calls: ss.length, text: by((s) => s.mode !== 'voice'), voice: by((s) => s.mode === 'voice'), scored: scored.length, outcomes,
      noFit: noFit.length, noFitClean: noFit.filter((s) => s.score.outcome === 'declined_appropriately' || s.score.outcome === 'ended_early').length, noFitPushed: noFit.filter((s) => s.score.outcome === 'should_have_disqualified').length,
      fit: fit.length, fitBooked: fit.filter((s) => s.score.outcome === 'booked_next_step').length,
      flags, recent: scored.slice(-10).map((s) => ({ name: s.personaName, at: s.startedAt, avg: s.score.scores.length ? s.score.scores.reduce((a, b) => a + b.score, 0) / s.score.scores.length : null })),
      evidence: S.evidence.length, levels, painLevels, panelRuns: S.panelRuns.length, offers: S.offers.length
    };
  }

  /* ---- evidence view */
  function selectEvidence(id) { const e = S.evidence.find((x) => x.id === id), u = S.ui; u.evId = e ? e.id : null; u.evDraft = e ? clone(e) : null; u.dirty = false; u.evSuggest = null; }

  function evEditor(d) {
    const probs = evidenceProblems(d);
    return (probs.length ? '<div class="lab-warn">' + probs.map((x) => '<div>' + E(x) + '</div>').join('') + '</div>' : '') +
      '<div class="lab-note">Only paste what you are allowed to keep. Remove names, phone numbers and emails before using any AI feature. The Redact button masks emails and phone numbers only; it cannot find names.</div>' +
      fld('ev', 'title', 'Title', d.title) + '<div class="lab-grid2">' + fld('ev', 'sourceType', 'Source type', d.sourceType, 'select', { opts: SRC_TYPES }) + fld('ev', 'source', 'Source (where it came from)', d.source) +
      fld('ev', 'date', 'Date', d.date) + fld('ev', 'type', 'Evidence level', d.type, 'select', { opts: EVID }) +
      fld('ev', 'relevance', 'Relevance (1 to 5)', d.relevance, 'range', { min: 1, max: 5, k: 'num' }) + fld('ev', 'confidence', 'Confidence (1 to 5)', d.confidence, 'range', { min: 1, max: 5, k: 'num' }) + '</div>' +
      fld('ev', 'text', 'Text, quotes or numbers', d.text, 'area', { rows: 8 }) +
      '<div class="lab-row"><label class="btn">Load a text file<input type="file" accept=".txt,.md,.csv" data-act="ev-file" style="display:none"></label><button class="btn" data-act="ev-redact">Redact emails and phones</button><button class="btn" data-act="ev-suggest">Suggest claims (AI)</button></div>' +
      (S.ui.evSuggest ? '<h4 class="lab-h">Suggested claims</h4>' + (S.ui.evSuggest.length ? S.ui.evSuggest.map((c, i) => '<div class="lab-ver"><div>' + E(c.claim) + '<div class="lab-ver-d">"' + E(c.quote) + '"</div></div><button class="btn" data-act="ev-claim" data-i="' + i + '">Save as its own item</button></div>').join('') + '<p class="lab-count">Each claim is kept only if its quote appears in your text. Saved items start as "Reported anecdote".</p>' : '<p class="lab-empty">No claim could be tied to a quote in the text.</p>') : '') +
      '<h4 class="lab-h">Attach to</h4><div class="lab-chips">' + S.offers.map((o) => '<label class="lab-check"><input type="checkbox" data-act="ev-link" data-kind="offers" data-id="' + E(o.id) + '"' + ((d.offers || []).includes(o.id) ? ' checked' : '') + '> Offer: ' + E(o.name) + '</label>').join('') +
      S.pains.map((p) => '<label class="lab-check"><input type="checkbox" data-act="ev-link" data-kind="pains" data-id="' + E(p.id) + '"' + ((d.pains || []).includes(p.id) ? ' checked' : '') + '> Pain: ' + E(p.name) + '</label>').join('') + '</div>' +
      '<div class="lab-bar"><span id="lab-dirty" class="lab-dirty">' + (S.ui.dirty ? 'Unsaved changes' : '') + '</span><button class="btn" data-act="ev-cancel">Cancel</button><button class="btn ghost lab-danger" data-act="ev-del">Delete</button><button class="btn orange" data-act="ev-save">Save</button></div>';
  }

  function vEvidence() {
    const u = S.ui, f = u.evFilter, q = f.q.toLowerCase();
    const list = S.evidence.filter((e) => (!f.type || e.type === f.type) && (!q || JSON.stringify(e).toLowerCase().includes(q)));
    return '<div class="lab-filters"><input id="lab-q" data-flt="evFilter" data-fk="q" placeholder="Search evidence" value="' + E(f.q) + '"><select data-flt="evFilter" data-fk="type"><option value="">Any level</option>' + EVID.map((x) => '<option' + (f.type === x ? ' selected' : '') + '>' + E(x) + '</option>').join('') + '</select><button class="btn" data-act="ev-new">+ New evidence</button></div>' +
      '<div class="lab-split2"><div>' + (list.length ? '<div class="lab-cards3">' + list.map((e) => '<button class="lab-pcard' + (e.id === u.evId ? ' on' : '') + '" data-act="ev-pick" data-id="' + E(e.id) + '"><span class="lab-pcard-t">' + E(e.title) + '</span><span class="lab-pcard-s">' + E(String(e.text).slice(0, 160)) + '</span><span class="lab-pcard-m"><span class="lab-pill ev">' + E(e.type) + '</span><span class="lab-pill">' + E(e.date) + '</span></span></button>').join('') + '</div>' : '<p class="lab-empty">Nothing here yet. Real call notes, replies and results go in this library. The offer and pain records stay "untested" until something is attached.</p>') + '</div>' +
      (u.evDraft ? '<div class="lab-detail">' + evEditor(u.evDraft) + '</div>' : '') + '</div>';
  }

  /* ---- panel view */
  function vPanel() {
    const N = S.pn, o = S.offers.find((x) => x.id === N.offerId) || S.offers[0];
    if (!window.ai) return '<p class="lab-empty">The panel needs the desktop app.</p>';
    if (o && !N.offerId) N.offerId = o.id;
    const ready = curModel() && (S.ai[S.settings.provider] || {}).saved, ev = o ? evForOffer(o.id) : [];
    const runs = S.panelRuns.filter((r) => !o || r.offerId === o.id).slice().reverse();
    const shown = N.run || runs[0] || null;
    return '<div class="lab-note">The panel produces challenges to your offer. It is not evidence of demand and it never estimates willingness to pay. Anything it calls "unsupported" is a gap in your own evidence, not a finding about the market.</div>' +
      '<div class="lab-split2"><div class="lab-detail"><div class="field"><label>Offer to challenge</label><select data-act="pn-offer">' + S.offers.map((x) => '<option value="' + E(x.id) + '"' + (o && x.id === o.id ? ' selected' : '') + '>' + E(x.name) + '</option>').join('') + '</select></div>' +
      '<p class="lab-count">' + ev.length + ' evidence item(s) attached to this offer.' + (ev.length ? '' : ' With none attached, expect most points to come back unsupported. That is the honest answer.') + '</p>' +
      '<div class="field"><label>Challengers</label>' + PANEL_ROLES.map((r) => '<label class="lab-check"><input type="checkbox" data-act="pn-role" data-id="' + r[0] + '"' + (N.roles[r[0]] ? ' checked' : '') + '> ' + E(r[1]) + '</label>').join('') + '</div>' +
      (ready ? '' : '<div class="lab-warn">Set a key and model in AI Settings first.</div>') + (N.err ? '<div class="lab-warn">' + E(N.err) + '</div>' : '') +
      '<button class="btn orange" data-act="pn-run"' + (ready && !N.busy && o ? '' : ' disabled') + '>' + (N.busy ? E(N.progress || 'Running...') : 'Run the panel') + '</button>' +
      '<h4 class="lab-h">Earlier runs</h4>' + (runs.length ? runs.map((r) => '<div class="lab-ver"><div>' + E(fmt(r.at)) + ' &middot; offer v' + E(r.offerVersion) + '<div class="lab-ver-d">' + r.results.length + ' challenger(s)</div></div><button class="btn" data-act="pn-open" data-id="' + E(r.id) + '">Open</button></div>').join('') : '<p class="lab-empty">None yet.</p>') + '</div>' +
      '<div>' + (shown ? vPanelRun(shown) : '<p class="lab-empty">Run the panel to see challenges here.</p>') + '</div></div>';
  }

  function vPanelRun(r) {
    return r.results.map((x) => '<div class="lab-detail" style="margin-bottom:10px"><b>' + E(x.roleName) + '</b>' + (x.error ? '<div class="lab-warn">' + E(x.error) + '</div>' : (x.biggestRisk ? '<p class="lab-count">Biggest risk: ' + E(x.biggestRisk) + '</p>' : '') +
      x.challenges.map((c) => '<div class="lab-ver"><div><span class="lab-pill st-' + (c.status === 'supported' ? 'approved' : c.status === 'missing' ? 'rejected' : 'proposed') + '">' + E(c.status) + '</span> ' + E(c.point) +
        (c.quote ? '<div class="lab-ver-d">Offer says: "' + E(c.quote) + '"</div>' : '') + (c.evidence.length ? '<div class="lab-ver-d">Evidence: ' + c.evidence.map(E).join('; ') + '</div>' : '') + (c.resolve ? '<div class="lab-ver-d">Would resolve it: ' + E(c.resolve) + '</div>' : '') + '</div></div>').join('') +
      (x.downgraded ? '<p class="lab-count">' + x.downgraded + ' point(s) claimed support without citing real evidence and were marked unsupported.</p>' : '')) + '</div>').join('');
  }

  async function runPanel() {
    const N = S.pn, o = S.offers.find((x) => x.id === N.offerId); if (!o || N.busy) return;
    const roles = PANEL_ROLES.filter((r) => N.roles[r[0]]); if (!roles.length) { N.err = 'Pick at least one challenger.'; return render(); }
    const ev = evForOffer(o.id); N.busy = true; N.err = ''; N.run = null;
    const run = { id: uid('pn'), offerId: o.id, offerVersion: o.vc || 0, at: now(), evidenceCount: ev.length, results: [] };
    for (let i = 0; i < roles.length; i++) {
      N.progress = 'Asking ' + roles[i][1] + ' (' + (i + 1) + ' of ' + roles.length + ')...'; render();
      const r = await callModel('You are a rigorous challenger. Reply with valid JSON only.', [{ role: 'user', content: buildPanelPrompt(roles[i], o, ev) }], true);
      if (!r.ok) { run.results.push({ roleName: roles[i][1], error: r.error || 'No answer.', challenges: [] }); continue; }
      const v = validatePanel(parseJsonLoose(r.text), o, ev);
      run.results.push(v ? Object.assign({ roleName: roles[i][1] }, v) : { roleName: roles[i][1], error: 'The answer could not be read. Try again.', challenges: [] });
    }
    N.busy = false; N.progress = '';
    if (run.results.some((x) => x.challenges.length)) { S.panelRuns.push(run); await sset(K.panel, S.panelRuns); N.run = run; } else N.err = 'Nothing usable came back. ' + (run.results[0] && run.results[0].error || '');
    render();
  }

  /* ---- analytics view */
  function vStats() {
    const s = computeStats(), pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : 'n/a'), row = (k, v) => '<div class="lab-ver"><span>' + E(k) + '</span><b>' + v + '</b></div>';
    const low = s.scored < 5;
    return '<div class="lab-note">Every number here is counted from records in this app. Nothing is estimated. Practice results measure how you perform against synthetic buyers. They say nothing about what the market will pay.</div>' +
      (low ? '<div class="lab-warn">Only ' + s.scored + ' scored call(s). That is too few to read a pattern into. Treat the figures as a log, not a trend.</div>' : '') +
      '<div class="lab-split2" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">' +
      '<div class="lab-detail"><h4 class="lab-h" style="margin-top:0">Practice calls</h4>' + row('Calls', s.calls + ' (' + s.text + ' text, ' + s.voice + ' voice)') + row('Scored', s.scored) +
      Object.keys(OUTCOMES).map((k) => row(OUTCOMES[k], s.outcomes[k])).join('') +
      row('No-fit buyers where you exited cleanly', s.noFit ? s.noFitClean + ' of ' + s.noFit + ' (' + pct(s.noFitClean, s.noFit) + ')' : 'no data') +
      row('No-fit buyers you kept pushing', s.noFit ? s.noFitPushed + ' of ' + s.noFit : 'no data') + row('Real-opportunity buyers where a next step was agreed', s.fit ? s.fitBooked + ' of ' + s.fit + ' (' + pct(s.fitBooked, s.fit) + ')' : 'no data') + '</div>' +
      '<div class="lab-detail"><h4 class="lab-h" style="margin-top:0">Skill averages</h4>' + practiceStats().avg.map((a) => row(a.label, a.avg == null ? 'no data' : a.avg.toFixed(1) + ' / 5 (n=' + a.n + ')')).join('') +
      '<h4 class="lab-h">Last scored calls</h4>' + (s.recent.length ? s.recent.map((r) => row(r.name + ' - ' + new Date(r.at).toLocaleDateString(), r.avg == null ? 'no score' : r.avg.toFixed(1))).join('') : '<p class="lab-empty">None yet.</p>') +
      '<h4 class="lab-h">Red flags raised</h4>' + (Object.keys(s.flags).length ? Object.keys(s.flags).map((k) => row(k, s.flags[k])).join('') : '<p class="lab-empty">None recorded.</p>') + '</div>' +
      '<div class="lab-detail"><h4 class="lab-h" style="margin-top:0">What you actually know</h4>' + row('Evidence items', s.evidence) + EVID.map((x) => row('&nbsp;&nbsp;' + x, s.levels[x])).join('') +
      '<h4 class="lab-h">Pain points by evidence level</h4>' + EVID.map((x) => row(x, s.painLevels[x])).join('') + row('Offers', s.offers) + row('Panel runs', s.panelRuns) + '</div></div>';
  }

  async function evAct(act, id, el) {
    const u = S.ui; const guard = () => !u.dirty || confirm('Discard your unsaved changes?');
    if (act === 'ev-pick') { if (!guard()) return; selectEvidence(id); return render(); }
    if (act === 'ev-new') { if (!guard()) return; const e = newEvidence(); S.evidence.push(e); await sset(K.evidence, S.evidence); selectEvidence(e.id); return render(); }
    if (act === 'ev-save') { const i = S.evidence.findIndex((x) => x.id === u.evDraft.id); S.evidence[i] = clone(u.evDraft); await sset(K.evidence, S.evidence); u.dirty = false; toast('Saved.', 'success'); return render(); }
    if (act === 'ev-cancel') { if (!guard()) return; u.evDraft = null; u.evId = null; u.dirty = false; return render(); }
    if (act === 'ev-del') { if (!confirm('Delete this evidence item?')) return; S.evidence = S.evidence.filter((x) => x.id !== u.evId); await sset(K.evidence, S.evidence); u.evDraft = null; u.evId = null; u.dirty = false; return render(); }
    if (act === 'ev-redact') { u.evDraft.text = redact(u.evDraft.text); markDirty(); return render(); }
    if (act === 'ev-claim') {
      const c = (u.evSuggest || [])[Number(el.dataset.i)]; if (!c) return;
      const e = Object.assign(newEvidence(), { title: c.claim.slice(0, 80), sourceType: u.evDraft.sourceType, source: u.evDraft.source, date: u.evDraft.date, type: 'Reported anecdote', text: c.quote, offers: (u.evDraft.offers || []).slice(), pains: (u.evDraft.pains || []).slice(), parent: u.evDraft.id });
      S.evidence.push(e); await sset(K.evidence, S.evidence); u.evSuggest.splice(Number(el.dataset.i), 1); toast('Saved as its own item.', 'success'); return render();
    }
    if (act === 'ev-suggest') {
      const t = redact(u.evDraft.text).slice(0, 8000); if (t.trim().length < 40) { toast('Add more text first.', 'error'); return; }
      if (!curModel() || !(S.ai[S.settings.provider] || {}).saved) { toast('Set a key and model in AI Settings first.', 'error'); return; }
      toast('Reading...', 'info');
      const r = await callModel('You extract factual claims from a note. Reply with valid JSON only.', [{ role: 'user', content: 'Extract up to 6 specific factual claims from this note that could matter to a sales offer. Each needs an exact short quote copied from the note.\n\nNOTE\n' + t + '\n\nReply: {"claims":[{"claim":"...","quote":"..."}]}' }], true);
      if (!r.ok) { toast(r.error || 'The model did not answer.', 'error'); return; }
      const j = parseJsonLoose(r.text), nt = norm(t);
      u.evSuggest = ((j && Array.isArray(j.claims)) ? j.claims : []).filter((c) => c && c.claim && String(c.quote || '').length >= 6 && nt.includes(norm(c.quote))).slice(0, 6).map((c) => ({ claim: String(c.claim), quote: String(c.quote) }));
      return render();
    }
  }

  async function panelAct(act, id) {
    if (act === 'pn-run') return runPanel();
    if (act === 'pn-open') { S.pn.run = S.panelRuns.find((r) => r.id === id) || null; return render(); }
  }

  /* ---------------------------------------------------------------- render */
  let bound = false;
  async function render(focusId) {
    await load();
    const root = document.getElementById('lab-root'); if (!root) return;
    if (!bound) { bind(root); bound = true; }
    const y = root.scrollTop;
    if (S.tab === 'home' || S.tab === 'live' || S.tab === 'ai' || S.tab === 'practice' || S.tab === 'panel' || S.tab === 'evidence') await refreshAi();
    if (S.tab === 'practice' && !S.practice.personaId && S.personas[0]) S.practice.personaId = S.personas[0].id;
    root.innerHTML = shellHtml(S.tab === 'home' ? vHome() : S.tab === 'live' ? vLive() : S.tab === 'offers' ? vOffers() : S.tab === 'pains' ? vPains() : S.tab === 'personas' ? vPersonas() : S.tab === 'ai' ? vAi() : S.tab === 'practice' ? vPractice() : S.tab === 'evidence' ? vEvidence() : S.tab === 'panel' ? vPanel() : S.tab === 'stats' ? vStats() : vScripts());
    root.scrollTop = y;
    if (S.tab === 'practice') { const tx = document.getElementById('lab-tx'); if (tx) tx.scrollTop = tx.scrollHeight; const pin = document.getElementById('lab-pin'); if (pin && !S.practice.busy) pin.focus(); }
    if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* not a text input */ } } }
  }

  function markDirty() { S.ui.dirty = true; const el = document.getElementById('lab-dirty'); if (el) el.textContent = 'Unsaved changes'; }

  function setField(t) {
    const s = t.dataset.s, f = t.dataset.f; if (!s || !f) return;
    let v = t.type === 'checkbox' ? t.checked : t.value;
    if (t.dataset.k === 'lines') v = lines(v); else if (t.dataset.k === 'num') v = Number(v);
    const u = S.ui;
    if (t.type === 'range') { const o = t.parentElement.querySelector('output'); if (o) o.textContent = t.value; }
    if (s === 'offer' && u.draft) { if (t.dataset.m) { const m = u.draft.modules.find((x) => x.id === t.dataset.m); if (m) m[f] = v; } else u.draft[f] = v; }
    else if (s === 'pain' && u.painDraft) u.painDraft[f] = v;
    else if (s === 'persona' && u.personaDraft) { if (t.dataset.h) u.personaDraft.hidden[f] = v; else u.personaDraft[f] = v; }
    else if (s === 'card' && u.cardDraft) u.cardDraft[f] = v;
    else if (s === 'ev' && u.evDraft) u.evDraft[f] = v;
    markDirty();
  }

  function ask(title, label, value) {
    return new Promise((resolve) => {
      const ov = document.createElement('div'); ov.className = 'cc-modal-overlay';
      ov.innerHTML = '<div class="cc-modal"><h4>' + E(title) + '</h4><p class="cc-modal-sub">' + E(label) + '</p><input id="lab-ask" class="cc-input" style="width:100%" value="' + E(value || '') + '"><div class="cc-modal-actions"><button class="cc-mini" id="lab-ask-no">Cancel</button><button class="cc-mini focus" id="lab-ask-ok">OK</button></div></div>';
      document.body.appendChild(ov);
      const inp = ov.querySelector('#lab-ask'); inp.focus(); inp.select();
      const done = (v) => { ov.remove(); resolve(v); };
      ov.querySelector('#lab-ask-no').onclick = () => done(null);
      ov.querySelector('#lab-ask-ok').onclick = () => done(inp.value.trim() || null);
      inp.onkeydown = (e) => { if (e.key === 'Enter') done(inp.value.trim() || null); if (e.key === 'Escape') done(null); };
    });
  }

  function compareModal(aId) {
    const pb = curPb(), a = S.scripts.cards.find((c) => c.id === aId); if (!pb || !a) return;
    const others = pb.cardIds.filter((id) => id !== aId).map((id) => S.scripts.cards.find((c) => c.id === id)).filter(Boolean);
    if (!others.length) { toast('Add or duplicate another card to compare.', 'info'); return; }
    const ov = document.createElement('div'); ov.className = 'cc-modal-overlay';
    const paint = (bId) => {
      const b = S.scripts.cards.find((c) => c.id === bId);
      const rows = diffLines(String(a.body || '').split('\n').filter((l) => l.trim()), String(b.body || '').split('\n').filter((l) => l.trim()));
      ov.innerHTML = '<div class="cc-modal cc-modal-wide"><h4>Compare cards</h4><p class="cc-modal-sub">Left: <b>' + E(a.title) + '</b> &nbsp; Right: <select id="lab-cmp">' + others.map((c) => '<option value="' + E(c.id) + '"' + (c.id === bId ? ' selected' : '') + '>' + E(c.title) + '</option>').join('') + '</select></p>' +
        '<div class="lab-diff">' + rows.map((r) => '<div class="d-' + r.t + '">' + (r.t === 'del' ? '&minus; ' : r.t === 'add' ? '+ ' : '&nbsp;&nbsp;') + E(r.x) + '</div>').join('') + '</div>' +
        '<p class="cc-modal-sub">Red lines are only on the left card. Green lines are only on the right.</p><div class="cc-modal-actions"><button class="cc-mini focus" id="lab-cmp-x">Close</button></div></div>';
      ov.querySelector('#lab-cmp-x').onclick = () => ov.remove();
      ov.querySelector('#lab-cmp').onchange = (e) => paint(e.target.value);
    };
    document.body.appendChild(ov); paint(others[0].id);
  }

  function importModal() {
    if (typeof ccScripts === 'undefined' || !ccScripts || !ccScripts.length) { toast('No call console scripts found to import.', 'error'); return; }
    const ov = document.createElement('div'); ov.className = 'cc-modal-overlay';
    ov.innerHTML = '<div class="cc-modal cc-modal-wide"><h4>Import a call console script</h4><p class="cc-modal-sub">This copies the script into the builder as cards. The original is not changed.</p><div class="cc-modal-list">' +
      ccScripts.map((s) => { const m = (s.body.match(/^name:\s*(.+)$/m) || [])[1] || s.id; return '<div class="cc-modal-row"><span>' + E(m) + '</span><button class="cc-mini" data-imp="' + E(s.id) + '">Import</button></div>'; }).join('') +
      '</div><div class="cc-modal-actions"><button class="cc-mini" id="lab-imp-x">Cancel</button></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('#lab-imp-x').onclick = () => ov.remove();
    ov.querySelectorAll('[data-imp]').forEach((b) => { b.onclick = async () => {
      const s = ccScripts.find((x) => x.id === b.dataset.imp); ov.remove(); if (!s) return;
      pushUndo(); const pb = importScript(s.body, s.id); S.ui.pbId = pb.id; await save('scripts'); toast('Imported ' + pb.cardIds.length + ' cards.', 'success'); render();
    }; });
  }

  /* ---------------------------------------------------------------- events */
  async function onClick(e) {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act, id = el.dataset.id, u = S.ui;
    if (el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type === 'checkbox' && act !== 'blind-toggle')) return;
    const guard = () => !u.dirty || confirm('Discard your unsaved changes?');
    try {
      if (act === 'tab') { if (!guard()) return; if (S.practice.ctl) S.practice.ctl.stop(); u.dirty = false; S.tab = id; return render(); }

      if (act === 'lab-appnav') { const a = document.getElementById('app-shell'); if (a) a.classList.toggle('nav-open'); return; }
      if (act === 'lab-navmin') { try { localStorage.setItem('lyc-lab-navmin', navMin() ? '0' : '1'); } catch (err) { /* storage blocked */ } return render(); }
      if (act.startsWith('live-')) return liveAct(act, id, el);
      if (act.startsWith('pr-')) return practiceAct(act, id);
      if (act.startsWith('ev-')) return evAct(act, id, el);
      if (act.startsWith('pn-')) return panelAct(act, id);

      /* ai settings */
      if (act === 'ai-save' || act === 'ai-test' || act === 'ai-clear') {
        const msg = document.getElementById('lab-aimsg'), prov = S.settings.provider, say = (t) => { if (msg) msg.textContent = t; };
        if (act === 'ai-save') {
          const inp = document.getElementById('lab-aikey'), val = inp ? inp.value : '';
          const r = await window.secrets.set(prov, val); if (inp) inp.value = '';
          if (!r.success) { say(r.error || 'Could not save.'); return; }
          toast('Key saved securely. Now press Check my setup.', 'success'); return render();
        }
        if (act === 'ai-clear') { if (!confirm('Remove the saved key?')) return; await window.secrets.clear(prov); toast('Key removed.', 'success'); return render(); }
        say('Testing...'); const r = await window.secrets.test(prov); say(r.ok ? 'The provider accepted this key.' : r.error); return;
      }

      if (act === 'ai-check') {
        const prov = S.settings.provider, m = S.settings.models || {};
        S.ui.aiBusy = true; render();
        let r; try { r = await window.ai.checkSetup({ provider: prov, model: m[prov] || '', live: m.live || '' }); } catch (err) { r = { ok: false, error: 'The check could not run.' }; }
        S.ui.aiBusy = false; S.ui.aiCheck = Object.assign({ provider: prov }, r || { ok: false, error: 'No answer.' }); return render();
      }
      if (act === 'ai-use') {
        S.settings.models = S.settings.models || {};
        S.settings.models[el.dataset.k === 'live' ? 'live' : S.settings.provider] = id; await sset(K.settings, S.settings);
        toast('Saved. Press Check my setup again to confirm it works.', 'success'); return render();
      }

      /* offers */
      if (act === 'offer-pick') { if (!guard()) return; selectOffer(id); return render(); }
      if (act === 'offer-new') {
        const o = { id: uid('offer'), name: 'New offer', status: 'proposed', industry: '', delivery: '', positioning: '', terms: [], termsNote: 'PROPOSED terms for testing.', modules: [{ id: uid('mod'), key: 'A', name: 'New module', idealCustomer: '', prerequisites: '', integrations: '', deliverables: '', limitations: '', estimatedCosts: '', complianceChecks: '', pricing: '', riskReversal: '', outcomes: '' }], versions: [], vc: 0, createdAt: now(), updatedAt: now() };
        S.offers.push(o); await save('offers'); selectOffer(o.id); return render();
      }
      if (act === 'offer-save') { const note = (document.getElementById('lab-vnote') || {}).value || ''; const n = saveOffer(u.draft, note.trim()); await save('offers'); selectOffer(n.id); toast('Saved as a new version.', 'success'); return render(); }
      if (act === 'offer-revert') { selectOffer(u.offerId); return render(); }
      if (act === 'offer-dup') { const o = S.offers.find((x) => x.id === u.offerId); if (!o) return; const c = clone(o); c.id = uid('offer'); c.name += ' (copy)'; c.status = 'proposed'; c.versions = []; c.vc = 0; c.createdAt = c.updatedAt = now(); S.offers.push(c); await save('offers'); selectOffer(c.id); return render(); }
      if (act === 'offer-del') { if (!confirm('Delete this offer and its version history?')) return; S.offers = S.offers.filter((x) => x.id !== u.offerId); await save('offers'); selectOffer(S.offers[0] ? S.offers[0].id : null); return render(); }
      if (act === 'mod-pick') { u.moduleId = id; return render(); }
      if (act === 'mod-add') { const d = u.draft; const key = String.fromCharCode(65 + (d.modules || []).length); const m = { id: uid('mod'), key, name: 'New module', idealCustomer: '', prerequisites: '', integrations: '', deliverables: '', limitations: '', estimatedCosts: '', complianceChecks: '', pricing: '', riskReversal: '', outcomes: '' }; d.modules.push(m); u.moduleId = m.id; markDirty(); return render(); }
      if (act === 'mod-del') { if (!confirm('Remove this module from the draft?')) return; u.draft.modules = u.draft.modules.filter((m) => m.id !== id); u.moduleId = u.draft.modules[0] ? u.draft.modules[0].id : null; markDirty(); return render(); }
      if (act === 'ver-restore') { const saved = S.offers.find((o) => o.id === u.offerId); const v = (saved.versions || []).find((x) => String(x.v) === el.dataset.v); if (!v) return; const d = clone(v.data); d.versions = saved.versions; d.vc = saved.vc; u.draft = d; u.moduleId = d.modules[0] ? d.modules[0].id : null; markDirty(); return render(); }

      /* pains */
      if (act === 'pain-pick') { if (!guard()) return; const p = S.pains.find((x) => x.id === id); u.painId = id; u.painDraft = p ? clone(p) : null; u.dirty = false; return render(); }
      if (act === 'pain-new') { if (!guard()) return; const p = newPain(); S.pains.push(p); await save('pains'); u.painId = p.id; u.painDraft = clone(p); u.dirty = false; return render(); }
      if (act === 'pain-save') { const i = S.pains.findIndex((x) => x.id === u.painDraft.id); S.pains[i] = clone(u.painDraft); await save('pains'); u.dirty = false; toast('Saved.', 'success'); return render(); }
      if (act === 'pain-cancel') { if (!guard()) return; u.painDraft = null; u.painId = null; u.dirty = false; return render(); }
      if (act === 'pain-copy') { const ind = await ask('Copy to another industry', 'Industry name', ''); if (!ind) return; const c = clone(S.pains.find((x) => x.id === u.painId) || u.painDraft); c.id = uid('pain'); c.industry = ind; c.name += ' (' + ind + ')'; c.evidenceLevel = 'Untested sales assumption'; c.severity = 3; c.willingnessToPay = ''; S.pains.push(c); await save('pains'); u.painId = c.id; u.painDraft = clone(c); u.dirty = false; toast('Copied. Evidence level reset: nothing from the old industry counts as proof here.', 'success'); return render(); }
      if (act === 'pain-dup') { const c = clone(S.pains.find((x) => x.id === u.painId) || u.painDraft); c.id = uid('pain'); c.name += ' (copy)'; S.pains.push(c); await save('pains'); u.painId = c.id; u.painDraft = clone(c); u.dirty = false; return render(); }
      if (act === 'pain-del') { if (!confirm('Delete this pain point?')) return; S.pains = S.pains.filter((x) => x.id !== u.painId); await save('pains'); u.painDraft = null; u.painId = null; u.dirty = false; return render(); }

      /* personas */
      if (act === 'persona-pick') { if (!guard()) return; const p = S.personas.find((x) => x.id === id); u.personaId = id; u.personaDraft = p ? clone(p) : null; u.dirty = false; return render(); }
      if (act === 'persona-new') { if (!guard()) return; const p = newPersona(); S.personas.push(p); await save('personas'); u.personaId = p.id; u.personaDraft = clone(p); u.reveal[p.id] = true; u.dirty = false; return render(); }
      if (act === 'persona-save') { const i = S.personas.findIndex((x) => x.id === u.personaDraft.id); S.personas[i] = clone(u.personaDraft); await save('personas'); u.dirty = false; toast('Saved.', 'success'); return render(); }
      if (act === 'persona-cancel') { if (!guard()) return; u.personaDraft = null; u.personaId = null; u.dirty = false; return render(); }
      if (act === 'persona-dup') { const c = clone(S.personas.find((x) => x.id === u.personaId) || u.personaDraft); c.id = uid('persona'); c.name += ' (copy)'; S.personas.push(c); await save('personas'); u.personaId = c.id; u.personaDraft = clone(c); u.reveal[c.id] = true; u.dirty = false; return render(); }
      if (act === 'persona-del') { if (!confirm('Delete this persona?')) return; S.personas = S.personas.filter((x) => x.id !== u.personaId); await save('personas'); u.personaDraft = null; u.personaId = null; u.dirty = false; return render(); }
      if (act === 'persona-reveal') { u.reveal[u.personaDraft.id] = true; return render(); }
      if (act === 'blind-toggle') { u.blind = el.checked; return render(); }

      /* script builder */
      if (act === 'pb-new') { const n = await ask('New playbook', 'Name', 'New playbook'); if (!n) return; pushUndo(); const pb = { id: uid('pb'), name: n, noun: 'business', search: '{{category}} {{city}}', meta: {}, source: '', cardIds: [] }; S.scripts.playbooks.push(pb); u.pbId = pb.id; await save('scripts'); return render(); }
      if (act === 'pb-import') return importModal();
      if (act === 'pb-rename') { const pb = curPb(); const n = await ask('Rename playbook', 'Name', pb.name); if (!n) return; pb.name = n; await save('scripts'); return render(); }
      if (act === 'pb-del') { if (!confirm('Delete this playbook and its cards? Published copies in the call console are not touched.')) return; pushUndo(); const pb = curPb(); S.scripts.cards = S.scripts.cards.filter((c) => !pb.cardIds.includes(c.id)); S.scripts.playbooks = S.scripts.playbooks.filter((p) => p.id !== pb.id); u.pbId = null; await save('scripts'); return render(); }
      if (act === 'pb-publish') {
        const pb = curPb(); if (typeof ccScripts === 'undefined') { toast('The call console is not ready yet.', 'error'); return; }
        if (!pb.cardIds.length) { toast('Add at least one card first.', 'error'); return; }
        if (!confirm('Publish "' + pb.name + '" to the call console? It appears in the Script list on the Leads screen. If you published it before, that copy is replaced.')) return;
        const sid = 'lab-' + pb.id, body = buildBody(pb), ex = ccScripts.find((s) => s.id === sid);
        if (ex) ex.body = body; else ccScripts.push({ id: sid, body });
        ccSaveScripts(); toast('Published to the call console.', 'success'); return;
      }
      if (act === 'card-new') { const pb = curPb(); pushUndo(); const c = { id: uid('card'), title: 'New card', stage: 'Other', body: '> ', notes: '', tags: [], favorite: false, branches: [], versions: [], createdAt: now() }; S.scripts.cards.push(c); pb.cardIds.push(c.id); await save('scripts'); u.editCard = c.id; u.cardDraft = clone(c); u.dirty = false; return render(); }
      if (act === 'card-toggle') { u.open[id] = !u.open[id]; return render(); }
      if (act === 'open-all') { curPb().cardIds.forEach((x) => { u.open[x] = true; }); return render(); }
      if (act === 'close-all') { u.open = {}; return render(); }
      if (act === 'compact-toggle') { u.compact = !u.compact; return render(); }
      if (act === 'card-fav') { pushUndo(); const c = S.scripts.cards.find((x) => x.id === id); c.favorite = !c.favorite; await save('scripts'); return render(); }
      if (act === 'card-edit') { if (!guard()) return; const c = S.scripts.cards.find((x) => x.id === id); u.editCard = id; u.cardDraft = clone(c); u.dirty = false; return render(); }
      if (act === 'card-cancel') { if (!guard()) return; u.editCard = null; u.cardDraft = null; u.dirty = false; return render(); }
      if (act === 'card-save') {
        const d = u.cardDraft, i = S.scripts.cards.findIndex((x) => x.id === d.id), old = S.scripts.cards[i]; pushUndo();
        const note = ((document.getElementById('lab-cnote') || {}).value || '').trim();
        const next = clone(d); next.versions = (old.versions || []).slice();
        next.versions.push({ at: now(), note, data: { title: old.title, stage: old.stage, body: old.body, notes: old.notes, tags: old.tags, branches: old.branches } });
        if (next.versions.length > 30) next.versions.shift();
        S.scripts.cards[i] = next; await save('scripts'); u.editCard = null; u.cardDraft = null; u.dirty = false; toast('Card saved.', 'success'); return render();
      }
      if (act === 'card-dup') { const pb = curPb(), c = S.scripts.cards.find((x) => x.id === id); pushUndo(); const n = clone(c); n.id = uid('card'); n.title += ' (variant)'; n.versions = []; n.createdAt = now(); S.scripts.cards.push(n); pb.cardIds.splice(pb.cardIds.indexOf(id) + 1, 0, n.id); await save('scripts'); return render(); }
      if (act === 'card-del') { if (!confirm('Delete this card?')) return; pushUndo(); const pb = curPb(); pb.cardIds = pb.cardIds.filter((x) => x !== id); S.scripts.cards = S.scripts.cards.filter((x) => x.id !== id); S.scripts.cards.forEach((c) => { c.branches = (c.branches || []).filter((b) => b.to !== id); }); if (u.editCard === id) { u.editCard = null; u.cardDraft = null; } await save('scripts'); return render(); }
      if (act === 'card-cmp') return compareModal(id);
      if (act === 'goto') { const t = document.getElementById('card-' + id); if (t) { u.open[id] = true; await render(); const t2 = document.getElementById('card-' + id); if (t2) t2.scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }
      if (act === 'tag-add') { const ty = document.getElementById('lab-tagtype').value, v = document.getElementById('lab-tagval').value.trim(); if (!v) return; const t = ty + ':' + v; if (!u.cardDraft.tags.includes(t)) u.cardDraft.tags.push(t); markDirty(); return render(); }
      if (act === 'tag-del') { u.cardDraft.tags = u.cardDraft.tags.filter((t) => t !== el.dataset.t); markDirty(); return render(); }
      if (act === 'br-add') { const l = document.getElementById('lab-brlabel').value.trim(), to = document.getElementById('lab-brto').value; if (!l || !to) return; u.cardDraft.branches.push({ label: l, to }); markDirty(); return render(); }
      if (act === 'br-del') { u.cardDraft.branches.splice(Number(el.dataset.i), 1); markDirty(); return render(); }
      if (act === 'cver-restore') { const saved = S.scripts.cards.find((c) => c.id === u.cardDraft.id), v = saved.versions[Number(el.dataset.i)]; if (!v) return; Object.assign(u.cardDraft, clone(v.data)); markDirty(); return render(); }
      if (act === 'undo') { return undo(); }
    } catch (err) { console.error('Sales Lab action failed', act, err); toast('Something went wrong. Nothing was lost.', 'error'); }
  }

  async function undo() {
    if (!S.undo.length) return;
    S.scripts = JSON.parse(S.undo.pop()); S.ui.editCard = null; S.ui.cardDraft = null; S.ui.dirty = false;
    if (!S.scripts.playbooks.some((p) => p.id === S.ui.pbId)) S.ui.pbId = S.scripts.playbooks[0] ? S.scripts.playbooks[0].id : null;
    await save('scripts'); render();
  }

  function bind(root) {
    root.addEventListener('click', onClick);
    root.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.flt) { S.ui[t.dataset.flt][t.dataset.fk] = t.type === 'checkbox' ? t.checked : t.value; if (t.type === 'text' || t.tagName === 'INPUT' && t.type !== 'checkbox') render(t.id || null); return; }
      if (t.dataset.s) setField(t);
      if (t.id === 'lab-pin') S.practice.draft = t.value;
    });
    root.addEventListener('keydown', (e) => { if (e.target.id === 'lab-pin' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); S.practice.draft = e.target.value; practiceSend(); } });
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.act === 'pr-persona') { S.practice.personaId = t.value; return; }
      if (t.dataset.act === 'ev-link') { const arr = S.ui.evDraft[t.dataset.kind], i = arr.indexOf(t.dataset.id); if (t.checked && i < 0) arr.push(t.dataset.id); if (!t.checked && i >= 0) arr.splice(i, 1); markDirty(); return; }
      if (t.dataset.act === 'ev-file') { const f = t.files && t.files[0]; if (!f) return; if (f.size > 200000) { toast('That file is too large (200 KB max).', 'error'); return; } const rd = new FileReader(); rd.onload = () => { S.ui.evDraft.text = String(rd.result || '').slice(0, 50000); markDirty(); render(); }; rd.readAsText(f); return; }
      if (t.dataset.act === 'pn-offer') { S.pn.offerId = t.value; S.pn.run = null; render(); return; }
      if (t.dataset.act === 'pn-role') { S.pn.roles[t.dataset.id] = t.checked; return; }
      if (t.dataset.act === 'pr-mode') { S.practice.mode = t.value; render(); return; }
      if (t.dataset.act === 'live-scn') { liveState().scn = t.value; render(); return; }
      if (t.dataset.act === 'live-script') { const L = liveState(); L.scriptId = t.value; L.part = 0; L.obj = null; render(); return; }
      if (t.dataset.act === 'ai-live-model') { S.settings.models.live = t.value.trim(); sset(K.settings, S.settings); return; }
      if (t.dataset.act === 'ai-model') { S.settings.models[S.settings.provider] = t.value.trim(); sset(K.settings, S.settings); return; }
      if (t.dataset.act === 'ai-provider') { S.settings.provider = t.value; sset(K.settings, S.settings); render(); return; }
      if (t.dataset.act === 'pb-pick') { S.ui.pbId = t.value; S.ui.editCard = null; S.ui.cardDraft = null; render(); return; }
      if (t.dataset.flt && (t.tagName === 'SELECT' || t.type === 'checkbox')) { S.ui[t.dataset.flt][t.dataset.fk] = t.type === 'checkbox' ? t.checked : t.value; render(); return; }
      if (t.dataset.s && t.tagName === 'SELECT') setField(t);
    });
    let dragId = null;
    root.addEventListener('dragstart', (e) => { const c = e.target.closest && e.target.closest('.lab-card'); if (!c || c.getAttribute('draggable') !== 'true') return; dragId = c.dataset.id; c.classList.add('dragging'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); } catch (x) { /* ignore */ } });
    root.addEventListener('dragover', (e) => {
      if (!dragId) return; const c = e.target.closest('.lab-card'); if (!c) return; e.preventDefault();
      root.querySelectorAll('.drop-before,.drop-after').forEach((n) => n.classList.remove('drop-before', 'drop-after'));
      const r = c.getBoundingClientRect(); c.classList.add(e.clientY > r.top + r.height / 2 ? 'drop-after' : 'drop-before');
    });
    root.addEventListener('drop', async (e) => {
      if (!dragId) return; const c = e.target.closest('.lab-card'); if (!c) return; e.preventDefault();
      const r = c.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2, pb = curPb(), from = dragId; dragId = null;
      pushUndo(); if (reorder(pb.id, from, c.dataset.id, after)) { await save('scripts'); } else S.undo.pop(); render();
    });
    root.addEventListener('dragend', () => { dragId = null; root.querySelectorAll('.dragging,.drop-before,.drop-after').forEach((n) => n.classList.remove('dragging', 'drop-before', 'drop-after')); });
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      const pane = document.getElementById('pane-lab'); if (!pane || pane.style.display === 'none' || S.tab !== 'scripts') return;
      const tag = (document.activeElement || {}).tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault(); undo();
    });
  }

  return {
    render,
    _t: { redact, validatePanel, computeStats, evidenceProblems, buildPanelPrompt, evForOffer, newEvidence, buildPersonaPrompt, buildScorePrompt, validateScore, parseJsonLoose, practiceStats, S, load, saveOffer, diffOffer, personaWarnings, diffLines, guessStage, parseScript, buildBody, importScript, reorder, pushUndo, undo }
  };
})();
