/* ===========================================================================
   LYCORE Call Console, inside the desktop app.

   Everything persists through the same encrypted store the invoices use, so
   leads are covered by the existing Backup Export and never sit in a loose
   file on disk.

   Layout rule: the script and the objections are the job. Everything else
   collapses out of their way and remembers that it was collapsed.
   =========================================================================== */

let ccLeads = [], ccEvents = [], ccScripts = [], ccObjections = { groups: [] };
let ccSources = [];
let ccSettings = {};
let ccLead = null, ccScript = null, ccScriptId = '';
let ccFilter = 'all', ccQuery = '', ccOpenObj = null;
let ccHeard = new Set();
let ccTimer = { on: false, start: 0, elapsed: 0 };
let ccRanges = { sum: 30, obj: 30, scr: 30 };
let ccUI = { rail: true, info: false, activity: false };

const CC_STATUSES = [
  { label: 'Sold',           tone: 'green'  },
  { label: 'On Hold',        tone: 'blue'   },
  { label: 'Audit sent',     tone: 'blue'   },
  { label: "Didn't Answer",  tone: 'yellow' },
  { label: 'Voicemail',      tone: 'yellow' },
  { label: 'Bad number',     tone: 'yellow' },
  { label: "Didn't Buy",     tone: 'red'    },
  { label: 'Not interested', tone: 'red'    },
  { label: 'Do not call',    tone: 'dark'   }
];
const CC_NOANS = ["Didn't Answer", 'Voicemail', 'Bad number'];
const CC_ALIVE = ['On Hold', 'Audit sent'];
const ccStatus = l => CC_STATUSES.find(s => s.label === l);

/* ------------------------------------------------------------- load/save */

async function ccLoad() {
  ccLeads      = (await sget('lyc-leads')) || [];
  ccSources    = (await sget('lyc-sources')) || [];
  if (!ccSources.length && ccLeads.length) {
    ccSources = [{ id: 'legacy', name: 'Imported leads', count: ccLeads.length, at: new Date().toISOString() }];
    ccLeads.forEach(l => { if (!l.sourceId) l.sourceId = 'legacy'; });
    ccSaveSources();
  }
  ccEvents     = (await sget('lyc-call-events')) || [];
  ccScripts    = (await sget('lyc-scripts')) || DEFAULT_SCRIPTS.map(s => ({ ...s }));
  ccObjections = (await sget('lyc-objections')) || JSON.parse(JSON.stringify(DEFAULT_OBJECTIONS));
  ccSettings   = (await sget('lyc-call-settings')) || {};
  if (ccSettings.ui) ccUI = Object.assign(ccUI, ccSettings.ui);
  ccScriptId = ccSettings.lastScript || (ccScripts[0] && ccScripts[0].id) || '';
  ccLoadScript(ccScriptId);
}

const ccSaveLeads    = () => sset('lyc-leads', ccLeads);
const ccSaveSources  = () => sset('lyc-sources', ccSources);
const ccSaveSettings = () => sset('lyc-call-settings', ccSettings);

function ccLogEvent(e) {
  ccEvents.push(Object.assign({ at: new Date().toISOString() }, e));
  sset('lyc-call-events', ccEvents);
}

function ccSaveUI() { ccSettings.ui = ccUI; ccSaveSettings(); }

/* ------------------------------------------------------------- variables */

const CC_AUTO_FALLBACK = { first_name: 'there', last_name: '' };

function ccVars() {
  const L = ccLead || {}, M = (ccScript && ccScript.meta) || {};
  const v = Object.assign({}, M, L, {
    offer_line: ccSettings.offer_line,
    discount_line: ccSettings.discount_line,
    rep_name: ccSettings.rep_name
  }, L.answers || {});

  for (const [k, fallback] of Object.entries(CC_AUTO_FALLBACK)) {
    if (v[k] === undefined || v[k] === null || v[k] === '') v[k] = fallback;
  }
  if (!v.rank) v.rank = v.map_rank || v.google_places_rank || v.web_rank || '';

  /* Pest-control work-first script fields, mapped onto the existing lead
     schema the same way {{rank}} falls back above: prefer a directly
     imported value, then the closest existing field, never a fabricated one. */
  if (!v.owner_name) v.owner_name = v.owner || '';
  if (!v.company_name) v.company_name = v.business || '';
  if (!v.google_rating) v.google_rating = v.rating || '';
  if (!v.google_review_count) v.google_review_count = v.reviews || '';
  if (!v.google_unanswered_count) v.google_unanswered_count = v.unanswered_reviews || '';
  if (!v.negative_unanswered_count) v.negative_unanswered_count = v.negative_unanswered_reviews || v.negative_reviews || '';
  if (!v.positive_unanswered_count) v.positive_unanswered_count = v.positive_unanswered_reviews || '';
  if (!v.other_platform) v.other_platform = v.other_platforms || '';
  if (!v.other_platform_review_count) {
    const CC_PLATFORM_REVIEW_MAP = { yelp: 'yelp_reviews', bbb: 'bbb_reviews', angi: 'angi_reviews', angie: 'angi_reviews', facebook: 'fb_reviews', fb: 'fb_reviews', 'yellow pages': 'yp_reviews', yellowpages: 'yp_reviews', bing: 'bing_reviews' };
    const opName = String(v.other_platform || '').toLowerCase();
    const platKey = Object.keys(CC_PLATFORM_REVIEW_MAP).find(name => opName.includes(name));
    v.other_platform_review_count = platKey ? (v[CC_PLATFORM_REVIEW_MAP[platKey]] || '') : '';
  }

  const y = Number(v.years), j = Number(v.jobs_month);
  if (y > 0 && j > 0) v.customers = Math.round(y * 12 * j).toLocaleString('en-US');
  const d = new Date(); d.setMonth(d.getMonth() + 1);
  v.next_month = d.toLocaleString('en-US', { month: 'long' });
  if (v.search) v.search = String(v.search).replace(/\{\{(\w+)\}\}/g, (m, k) => v[k] || m);
  return v;
}

function ccFill(text) {
  const v = ccVars();
  return esc(text).replace(/\{\{(\w+)(?:\|([^}]*))?\}\}/g, (m, k, fallback) => {
    const val = v[k];
    if (val === undefined || val === null || val === '' || String(val).startsWith('NOT SET')) {
      if (fallback !== undefined) return esc(fallback);
      return '<span class="cc-var miss">[' + esc(k.replace(/_/g, ' ')) + ']</span>';
    }
    return '<span class="cc-var">' + esc(val) + '</span>';
  });
}

/* ---------------------------------------------------------- script parse
   First character of a line decides its colour. Green is spoken, grey is a
   direction you never read out, red is a branch or a hard stop. */

function ccParse(raw) {
  let body = raw, meta = {};
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    body = raw.slice(fm[0].length);
    fm[1].split('\n').forEach(l => {
      const i = l.indexOf(':');
      if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim();
    });
  }
  const steps = []; let cur = null;
  body.split('\n').forEach(rawLine => {
    const line = rawLine.trimEnd();
    if (line.startsWith('## ')) { cur = { title: line.slice(3).trim(), lines: [], caps: [] }; steps.push(cur); return; }
    if (!cur || !line.trim() || /^badge:/i.test(line)) return;
    const k = line[0], text = line.slice(2).trim();
    if (k === '>') cur.lines.push({ t: 'say', text });
    else if (k === '~') cur.lines.push({ t: 'do', text });
    else if (k === '?') cur.lines.push({ t: 'if', text });
    else if (k === '!') cur.lines.push({ t: 'stop', text });
    else if (k === '=') cur.lines.push({ t: 'why', text });
    else if (k === '+') {
      const [key, label] = text.split('|').map(s => s.trim());
      const cap = { key, label: label || key };
      cur.lines.push({ t: 'cap', cap }); cur.caps.push(cap);
    } else cur.lines.push({ t: 'do', text: line.trim() });
  });
  return { meta, steps };
}

function ccLoadScript(id) {
  const s = ccScripts.find(x => x.id === id) || ccScripts[0];
  if (!s) return;
  ccScript = ccParse(s.body);
  ccScriptId = s.id;
  ccSettings.lastScript = s.id; ccSaveSettings();
}

function ccScriptName(id) {
  const s = ccScripts.find(x => x.id === id);
  const m = s && s.body.match(/^name:\s*(.+)$/m);
  return m ? m[1] : id;
}

/* ------------------------------------------------------------ the shell */

function renderLeadsPane() {
  const p = document.getElementById('pane-leads');
  if (!p.dataset.built) { p.innerHTML = ccShellHTML(); p.dataset.built = '1'; ccWireShell(); }
  ccApplyUI();
  ccRenderRail(); ccRenderSources(); ccRenderHead(); ccRenderInfo();
  ccRenderScript(); ccRenderObjections(); ccRenderActivity(); ccRenderOutcomes();
}

function ccShellHTML() {
  return `
  <div class="cc-wrap" id="cc-wrap">

    <aside class="cc-rail" id="cc-rail">
      <div class="cc-railtop">
        <input id="cc-search" class="cc-input" placeholder="Search leads">
        <label class="cc-import" title="Load a CSV or Excel file">Import<input type="file" id="cc-csv" accept=".csv,.xlsx,.xls,.xlsm" hidden></label>
      </div>
      <div class="cc-sources" id="cc-sources"></div>
      <div class="cc-chips" id="cc-filters">
        <button class="cc-chip active" data-f="all">All</button>
        <button class="cc-chip" data-f="new">Not called</button>
        <button class="cc-chip" data-f="hope">On Hold</button>
        <button class="cc-chip" data-f="noans">No answer</button>
        <button class="cc-chip" data-f="out">Ruled out</button>
        <button class="cc-chip" data-f="done">Sold</button>
      </div>
      <div class="cc-list" id="cc-list"></div>
    </aside>

    <div class="cc-main">
      <div class="cc-head" id="cc-head"></div>

      <div class="cc-collapse" id="cc-info-wrap">
        <button class="cc-toggle" id="cc-info-btn">Lead detail</button>
        <div class="cc-collapse-body" id="cc-info"></div>
      </div>

      <div class="cc-cols">
        <section class="cc-panel cc-scriptpanel">
          <div class="cc-panelhead">
            <h4>Script</h4>
            <select id="cc-scriptsel" class="cc-select"></select>
          </div>
          <div class="cc-legend">
            <span class="lg say">words you say</span>
            <span class="lg do">do, never read out</span>
            <span class="lg iff">if they say</span>
            <span class="lg stop">stop</span>
          </div>
          <div class="cc-scriptbox" id="cc-scriptbox"></div>
        </section>

        <section class="cc-panel cc-objpanel">
          <div class="cc-panelhead">
            <h4>Objections</h4>
            <span class="cc-hint">tap a word to see the answer</span>
          </div>
          <div class="cc-objlist" id="cc-objlist"></div>
        </section>
      </div>

      <div class="cc-collapse" id="cc-act-wrap">
        <button class="cc-toggle" id="cc-act-btn">Activity feed</button>
        <div class="cc-collapse-body">
          <div class="cc-actrow">
            <textarea id="cc-actinput" rows="2" placeholder="What happened. Speak it or type it."></textarea>
          </div>
          <div class="cc-actrow">
            <button class="cc-mic" id="cc-mic">Speak</button>
            <select id="cc-actkind" class="cc-select">
              <option value="note">Note</option>
              <option value="objection">Objection they used</option>
              <option value="script-failure">Script broke down here</option>
              <option value="pattern">Pattern I'm noticing</option>
            </select>
            <button class="btn orange" id="cc-actadd">Add</button>
          </div>
          <div class="cc-feed" id="cc-feed"></div>
        </div>
      </div>

      <div class="cc-outcomes" id="cc-outcomes"></div>
    </div>
  </div>`;
}

function ccWireShell() {
  document.getElementById('cc-search').oninput = e => { ccQuery = e.target.value; ccRenderRail(); };
  document.querySelectorAll('#cc-filters .cc-chip').forEach(c => c.onclick = () => {
    document.querySelectorAll('#cc-filters .cc-chip').forEach(x => x.classList.remove('active'));
    c.classList.add('active'); ccFilter = c.dataset.f; ccRenderRail();
  });
  document.getElementById('cc-info-btn').onclick = () => { ccUI.info = !ccUI.info; ccApplyUI(); ccSaveUI(); };
  document.getElementById('cc-act-btn').onclick  = () => { ccUI.activity = !ccUI.activity; ccApplyUI(); ccSaveUI(); };
  document.getElementById('cc-scriptsel').onchange = e => { ccLoadScript(e.target.value); ccRenderScript(); };
  document.getElementById('cc-csv').onchange = ccImportCSV;
  document.getElementById('cc-actadd').onclick = ccAddActivity;
  ccWireMic();
}

function ccApplyUI() {
  const w = document.getElementById('cc-wrap'); if (!w) return;
  w.classList.toggle('rail-off', !ccUI.rail);
  document.getElementById('cc-info-wrap').classList.toggle('open', ccUI.info);
  document.getElementById('cc-act-wrap').classList.toggle('open', ccUI.activity);
}

/* Focus mode: collapse everything that is not the script or the objections. */
function ccFocus() {
  const anyOpen = ccUI.rail || ccUI.info || ccUI.activity;
  ccUI.rail = !anyOpen; ccUI.info = false; ccUI.activity = false;
  ccApplyUI(); ccSaveUI();
  toast(anyOpen ? 'Focus mode, script and objections only' : 'Everything back', 'info');
}

/* ------------------------------------------------------------- lead rail */

function ccStars(r) {
  const n = Math.round(Number(r) || 0);
  return '<span class="cc-stars">' + '★'.repeat(Math.min(5, n)) +
         '<span class="off">' + '★'.repeat(Math.max(0, 5 - n)) + '</span></span>';
}

function ccRenderRail() {
  const q = ccQuery.toLowerCase();
  const list = ccLeads.filter(l => {
    const s = ccStatus(l.status);
    const bucket = !s ? 'new'
      : s.tone === 'green' ? 'done'
      : s.tone === 'blue' ? 'hope'
      : s.tone === 'yellow' ? 'noans' : 'out';
    if (ccFilter !== 'all' && ccFilter !== bucket) return false;
    if (!q) return true;
    return [l.business, l.first_name, l.city, l.phone].join(' ').toLowerCase().includes(q);
  });

  document.getElementById('cc-list').innerHTML = list.length ? list.map(l => {
    const s = ccStatus(l.status);
    return `<div class="cc-card ${s ? 't-' + s.tone : ''} ${ccLead && ccLead.id === l.id ? 'active' : ''}" data-id="${esc(l.id)}">
      <div class="cc-tag">${l.last_called ? 'Called ' + esc(l.last_called) : 'Not called yet'}</div>
      <div class="cc-name">${esc(l.business || 'Unnamed')}</div>
      ${ccStars(l.rating)}
      <div class="cc-sub">${l.reviews === '' || l.reviews == null ? 'no review data' : esc(l.reviews) + ' reviews'}${l.city ? ' · ' + esc(l.city) : ''}</div>
      ${s ? `<div class="cc-state t-${s.tone}">${esc(l.status)}${l.attempts ? ' · ' + esc(l.attempts) + ' tries' : ''}</div>` : ''}
    </div>`;
  }).join('') : '<div class="cc-empty">No leads. Use the CSV button above, or add them in the invoicing Clients tab.</div>';

  document.querySelectorAll('#cc-list .cc-card').forEach(el =>
    el.onclick = () => ccSelect(ccLeads.find(l => l.id === el.dataset.id)));
}

function ccSelect(l) {
  if (!l) return;
  ccLead = l; ccOpenObj = null; ccHeard = new Set();
  ccRenderRail(); ccRenderHead(); ccRenderInfo();
  ccRenderScript(); ccRenderObjections(); ccRenderActivity(); ccRenderOutcomes();
}

/* -------------------------------------------------------------- the head */

function ccFormatPhone(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const digits = s.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  const bare = digits.replace(/\D/g, '');
  if (bare.length === 10) return '+1 ' + bare;
  if (bare.length === 11 && bare.startsWith('1')) return '+' + bare;
  return s;
}

function ccRenderHead() {
  const l = ccLead;
  const h = document.getElementById('cc-head');
  if (!l) { h.innerHTML = '<div class="cc-empty">Pick a lead on the left to start.</div>'; return; }
  const telDisp = ccFormatPhone(l.phone);
  const tel = telDisp.replace(/[^0-9+]/g, '');
  h.innerHTML = `
    <button class="cc-railbtn" onclick="ccToggleRail()" title="Show or hide the lead list">☰</button>
    <div class="cc-headname">
      <div class="cc-biz">${esc(l.business || 'Unnamed')}</div>
      <div class="cc-who">${esc([l.first_name, l.last_name].filter(Boolean).join(' ') || 'owner unknown')}${l.city ? ' · ' + esc(l.city) : ''}</div>
    </div>
    <span class="cc-phone-wrap"><span class="cc-phone-tag">PHONE</span><a class="cc-phone" href="tel:${esc(tel)}">${esc(telDisp || 'no number')}</a></span>
    <button class="cc-mini" onclick="ccCopyPhone()">Copy</button>
    <div class="cc-timer" id="cc-timer" onclick="ccToggleTimer()">00:00</div>
    <button class="cc-mini focus" onclick="ccFocus()">Focus</button>`;
}

function ccToggleRail() { ccUI.rail = !ccUI.rail; ccApplyUI(); ccSaveUI(); }
function ccCopyPhone() { if (ccLead) { navigator.clipboard.writeText(ccFormatPhone(ccLead.phone) || ccLead.phone || ''); toast('Number copied', 'success'); } }
function ccToggleTimer() {
  if (ccTimer.on) { ccTimer.elapsed += Date.now() - ccTimer.start; ccTimer.on = false; }
  else { ccTimer.start = Date.now(); ccTimer.on = true; }
}
setInterval(() => {
  const el = document.getElementById('cc-timer'); if (!el) return;
  const s = Math.floor((ccTimer.elapsed + (ccTimer.on ? Date.now() - ccTimer.start : 0)) / 1000);
  el.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  el.classList.toggle('running', ccTimer.on);
}, 500);

/* ------------------------------------------------------------ lead detail */

function ccRenderInfo() {
  const l = ccLead, el = document.getElementById('cc-info');
  if (!l) { el.innerHTML = ''; return; }
  // row() quietly omits a line when there is nothing to show, so a sparsely
  // populated lead does not turn into a wall of "not pulled" placeholders.
  const row = (k, v, cls) => v ? `<div class="cc-row"><span>${k}</span><b class="${cls || ''}">${v}</b></div>` : '';
  // rowGap() always shows, styled as a gap when empty - reserved for the
  // Competitor & rank card, where an empty field is itself the sales signal.
  const rowGap = (k, v, cls) => `<div class="cc-row"><span>${k}</span><b class="${v ? (cls || '') : 'gap'}">${v || 'not pulled'}</b></div>`;
  const gap = (l.competitor_reviews && l.reviews !== '') ? (Number(l.competitor_reviews) - Number(l.reviews)) : null;
  const revGap = (l.review_gap !== undefined && l.review_gap !== '') ? l.review_gap : (gap != null ? String(gap) : '');
  const ready = l.competitor && l.competitor_reviews && l.reviews !== '' && l.reviews != null;
  const social = ['fb_url','twitter_url','linkedin_url','instagram_url'].map(k => l[k] ? '<a href="' + esc(l[k]) + '" target="_blank" rel="noopener">' + esc(k.replace('_url','')) + '</a>' : '').filter(Boolean).join(' &middot; ');

  el.innerHTML = `
    ${ready ? '' : '<div class="cc-warn">Missing competitor or review data. The script names them out loud five times.</div>'}
    <div class="cc-infogrid">
      <div class="cc-infocard"><h5>Business ${l.priority ? '<span class="cc-tag">' + esc(l.priority) + '</span>' : ''}</h5>
        ${row('Decision maker', esc([l.first_name, l.last_name].filter(Boolean).join(' ')))}
        ${row('Role', esc(l.role))}
        ${row('Type', esc(l.business_type || l.category))}
        ${row('Location', esc([l.address, l.city, l.state].filter(Boolean).join(', ')))}
        ${row('Established', esc(l.established))}
      </div>
      <div class="cc-infocard"><h5>Profiles</h5>
        ${row('Google', l.reviews !== '' && l.reviews != null ? ccStars(l.rating) + ' ' + esc(l.reviews) + ' reviews' : '')}
        ${row('Facebook', l.fb_reviews ? (l.fb_rating ? esc(l.fb_rating) + ' &middot; ' : '') + esc(l.fb_reviews) + ' reviews' : '')}
        ${row('BBB', l.bbb_reviews ? (l.bbb_rating ? esc(l.bbb_rating) + ' &middot; ' : '') + esc(l.bbb_reviews) + ' reviews' : '')}
        ${row('Angi', l.angi_reviews ? (l.angi_rating ? esc(l.angi_rating) + ' &middot; ' : '') + esc(l.angi_reviews) + ' reviews' : '')}
        ${row('Yelp', l.yelp_reviews ? (l.yelp_rating ? esc(l.yelp_rating) + ' &middot; ' : '') + esc(l.yelp_reviews) + ' reviews' : '')}
        ${row('Yellow Pages', l.yp_reviews ? (l.yp_rating ? esc(l.yp_rating) + ' &middot; ' : '') + esc(l.yp_reviews) + ' reviews' : '')}
        ${row('Bing', l.bing_reviews ? (l.bing_rating ? esc(l.bing_rating) + ' &middot; ' : '') + esc(l.bing_reviews) + ' reviews' : '')}
        ${row('Website', l.website ? esc(l.website) : '')}
        ${row('Social', social)}
      </div>
      <div class="cc-infocard hit"><h5>Competitor and rank</h5>
        ${rowGap('Competitor', esc(l.competitor), 'warn')}
        ${rowGap('Their reviews', esc(l.competitor_reviews), 'warn')}
        ${rowGap('Their rating', esc(l.competitor_rating), 'warn')}
        ${rowGap('Map position', esc(l.map_rank || l.rank), 'warn')}
        ${rowGap('Reviews behind', revGap, 'warn')}
      </div>
      <div class="cc-infocard hit"><h5>Reputation health</h5>
        ${row('Last review', esc(l.last_review), 'warn')}
        ${row('Unanswered', esc(l.unanswered_reviews), 'warn')}
        ${row('Negative reviews', esc(l.negative_reviews) || (l.negative_share ? Math.round(Number(l.negative_share) * 100) + '% share' : ''), 'warn')}
        ${row('Owner replied?', esc(l.owner_replied), 'warn')}
        ${row('Rank signal', esc(l.rank_signal), 'warn')}
        ${row('Other platforms', esc(l.other_platforms), 'warn')}
        ${row('Confidence', esc(l.verification_confidence), 'warn')}
        ${row('A bad one said', esc(l.bad_review), 'warn')}
      </div>
      ${(l.qualify_reason || l.outreach_angle || l.sales_implication || l.company_evidence) ? `
      <div class="cc-infocard hit talk"><h5>Talking points</h5>
        ${l.qualify_reason ? '<p><b>Why this lead:</b> ' + esc(l.qualify_reason) + '</p>' : ''}
        ${l.outreach_angle ? '<p><b>Angle:</b> ' + esc(l.outreach_angle) + '</p>' : ''}
        ${l.sales_implication ? '<p><b>Use this:</b> ' + esc(l.sales_implication) + '</p>' : ''}
        ${l.company_evidence ? '<p><b>Evidence:</b> ' + esc(l.company_evidence) + '</p>' : ''}
      </div>` : ''}
    </div>`;
}

/* ----------------------------------------------------------- the script */

function ccRenderScript() {
  const sel = document.getElementById('cc-scriptsel');
  sel.innerHTML = ccScripts.map(s => `<option value="${esc(s.id)}">${esc(ccScriptName(s.id))}</option>`).join('');
  sel.value = ccScriptId;

  const box = document.getElementById('cc-scriptbox');
  if (!ccScript) { box.innerHTML = ''; return; }

  box.innerHTML = ccScript.steps.map(step => `
    <div class="cc-step">
      <div class="cc-stephead">${esc(step.title)}</div>
      ${step.lines.map(ccLineHTML).join('')}
    </div>`).join('');

  box.querySelectorAll('input[data-cap]').forEach(i => i.oninput = () => {
    if (!ccLead) return;
    ccLead.answers = ccLead.answers || {};
    ccLead.answers[i.dataset.cap] = i.value;
    clearTimeout(ccRenderScript._t);
    ccRenderScript._t = setTimeout(ccSaveLeads, 400);
    ccRefreshVars();
  });
}

function ccLineHTML(l) {
  switch (l.t) {
    case 'say':  return `<p class="cc-say">${ccFill(l.text)}</p>`;
    case 'do':   return `<p class="cc-do">${ccFill(l.text)}</p>`;
    case 'if':   return `<p class="cc-if"><span>${ccFill(l.text)}</span></p>`;
    case 'stop': return `<p class="cc-stop">${ccFill(l.text)}</p>`;
    case 'why':  return `<details class="cc-why"><summary>why this works</summary><p>${ccFill(l.text)}</p></details>`;
    case 'cap': {
      const v = (ccLead && ccLead.answers && ccLead.answers[l.cap.key]) || '';
      return `<div class="cc-cap"><label>${esc(l.cap.label)}</label><input data-cap="${esc(l.cap.key)}" value="${esc(v)}" placeholder="their answer"></div>`;
    }
    default: return '';
  }
}

/* Repaint only the text, so typing into a capture box does not move the caret. */
function ccRefreshVars() {
  const box = document.getElementById('cc-scriptbox'); if (!box || !ccScript) return;
  const steps = ccScript.steps;
  box.querySelectorAll('.cc-step').forEach((el, i) => {
    const parts = steps[i].lines.filter(x => x.t !== 'cap');
    let p = 0;
    Array.from(el.children).forEach(child => {
      if (child.classList.contains('cc-cap') || child.classList.contains('cc-stephead')) return;
      const line = parts[p++]; if (!line || line.t === 'why') return;
      child.innerHTML = line.t === 'if' ? '<span>' + ccFill(line.text) + '</span>' : ccFill(line.text);
    });
  });
  ccRenderObjections();
}

/* -------------------------------------------------------- the objections */

function ccFlatObj() {
  const out = [];
  (ccObjections.groups || []).forEach(g => g.items.forEach(it =>
    out.push(Object.assign({ _pinned: !!g.pinned }, it))));
  return out;
}

function ccRenderObjections() {
  const items = ccFlatObj();
  const pinned = items.filter(i => i._pinned);
  const rest = items.filter(i => !i._pinned);

  document.getElementById('cc-objlist').innerHTML = pinned.concat(rest).map(it => `
    <div class="cc-obj ${it._pinned ? 'pin' : ''} ${ccOpenObj === it.trigger ? 'open' : ''}" data-t="${esc(it.trigger)}">
      <span class="cc-trig">${esc(it.trigger)}</span>
      <div class="cc-rest">
        ${it._pinned ? '' : `<button class="cc-log ${ccHeard.has(it.trigger) ? 'done' : ''}" data-log="${esc(it.trigger)}">${ccHeard.has(it.trigger) ? 'logged' : 'they said this'}</button>`}
        ${it.say.map(s => '<p>' + ccFill(s) + '</p>').join('')}
        <div class="cc-then"><b>Then:</b> ${esc(it.then)}</div>
        <div class="cc-means">${esc(it.means)}</div>
      </div>
    </div>`).join('');

  document.querySelectorAll('#cc-objlist .cc-obj').forEach(el => el.onclick = () => {
    ccOpenObj = ccOpenObj === el.dataset.t ? null : el.dataset.t; ccRenderObjections();
  });
  document.querySelectorAll('#cc-objlist .cc-log').forEach(b => b.onclick = ev => {
    ev.stopPropagation();
    const t = b.dataset.log; if (ccHeard.has(t)) return;
    ccHeard.add(t);
    ccLogEvent({ type: 'objection', trigger: t, leadId: ccLead && ccLead.id, script: ccScriptId });
    ccRenderObjections(); toast('Logged for the report', 'success');
  });
}

/* ---------------------------------------------------------- activity feed */

function ccRenderActivity() {
  const l = ccLead;
  const entries = (l && l.activity) || [];
  document.getElementById('cc-feed').innerHTML = entries.length
    ? entries.map((e, i) => `<div class="cc-fi"><div>${esc(e.text)}</div>
        <div class="cc-fm"><span>${esc(e.kind)}</span><span>${new Date(e.at).toLocaleString()}</span>
        <button class="cc-fdel" data-i="${i}">remove</button></div></div>`).join('')
    : '<div class="cc-empty">Nothing logged for this lead yet.</div>';
  document.querySelectorAll('#cc-feed .cc-fdel').forEach(b => b.onclick = () => {
    ccLead.activity.splice(+b.dataset.i, 1); ccSaveLeads(); ccRenderActivity();
  });
}

function ccAddActivity() {
  if (!ccLead) return toast('Pick a lead first', 'error');
  const box = document.getElementById('cc-actinput');
  const text = box.value.trim(); if (!text) return;
  ccLead.activity = ccLead.activity || [];
  ccLead.activity.unshift({ text, kind: document.getElementById('cc-actkind').value, at: new Date().toISOString() });
  ccSaveLeads(); box.value = ''; ccRenderActivity(); toast('Logged', 'success');
}

function ccWireMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById('cc-mic'); if (!btn) return;
  if (!SR) { btn.style.opacity = .45; btn.onclick = () => toast('Dictation needs Chrome or Edge', 'info'); return; }
  let rec = null;
  btn.onclick = () => {
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    const t = document.getElementById('cc-actinput');
    const base = t.value ? t.value.trim() + ' ' : '';
    btn.classList.add('live'); btn.textContent = 'Listening';
    rec.onresult = ev => {
      let done = '', live = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++)
        ev.results[i].isFinal ? (done += ev.results[i][0].transcript) : (live += ev.results[i][0].transcript);
      t.value = (base + done + live).replace(/\s+/g, ' ');
    };
    rec.onend = () => { btn.classList.remove('live'); btn.textContent = 'Speak'; rec = null; };
    rec.onerror = e => { toast('Mic: ' + e.error, 'error'); };
    rec.start();
  };
}

/* --------------------------------------------------------------- outcome */

function ccRenderOutcomes() {
  const l = ccLead;
  document.getElementById('cc-outcomes').innerHTML =
    '<span class="cc-obhint">How did the call go</span>' +
    CC_STATUSES.map(s => `<button class="cc-ob t-${s.tone} ${l && l.status === s.label ? 'active' : ''}" data-l="${esc(s.label)}">${esc(s.label)}</button>`).join('');
  document.querySelectorAll('#cc-outcomes .cc-ob').forEach(b => b.onclick = () => ccSetStatus(b.dataset.l));
}

function ccSetStatus(label) {
  const l = ccLead; if (!l) return toast('Pick a lead first', 'error');
  const clearing = l.status === label;

  if (!clearing) {
    ccLogEvent({
      type: 'call', outcome: label, leadId: l.id, business: l.business, script: ccScriptId,
      seconds: Math.round((ccTimer.elapsed + (ccTimer.on ? Date.now() - ccTimer.start : 0)) / 1000)
    });
    l.attempts = (parseInt(l.attempts, 10) || 0) + 1;
    l.last_called = new Date().toISOString().slice(0, 16).replace('T', ' ');
  }
  l.status = clearing ? '' : label;
  ccSaveLeads();
  ccRenderRail(); ccRenderOutcomes(); ccRenderHead();

  if (!clearing && label === 'Sold') ccOfferInvoice(l);
  else toast(clearing ? 'Cleared' : 'Saved as "' + label + '"', 'success');
}

/* The join. A closed lead walks straight into a new invoice with the client
   block already filled, so nothing gets retyped. */
function ccOfferInvoice(l) {
  if (typeof startNew !== 'function') return;
  const ok = confirm('Nice one.\n\nOpen a new invoice for ' + (l.business || 'this client') + ' with their details filled in?');
  if (!ok) { toast('Saved as Sold', 'success'); return; }
  startNew(true);
  const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
  set('f-client', l.business);
  set('f-attn', [l.first_name, l.last_name].filter(Boolean).join(' '));
  set('f-street', l.address);
  set('f-clientemail', l.email);

  // State and city are linked selects, so set the state and let the app's own
  // handler rebuild the city list before picking the city.
  const st = document.getElementById('f-state');
  if (st && l.state) {
    const opt = Array.from(st.options).find(o =>
      o.value.toUpperCase() === l.state.toUpperCase() || o.text.toUpperCase() === l.state.toUpperCase());
    if (opt) {
      st.value = opt.value;
      st.dispatchEvent(new Event('change'));
      setTimeout(() => {
        const cy = document.getElementById('f-city');
        if (cy && l.city) {
          const c = Array.from(cy.options).find(o => o.text.toUpperCase() === l.city.toUpperCase());
          if (c) { cy.value = c.value; cy.dispatchEvent(new Event('change')); }
          else {
            const other = Array.from(cy.options).find(o => /other/i.test(o.text));
            if (other) {
              cy.value = other.value; cy.dispatchEvent(new Event('change'));
              const box = document.getElementById('f-cityother'); if (box) box.value = l.city;
            }
          }
        }
      }, 60);
    }
  }

  showTab('new');
  toast('Invoice started from the lead, check the city and state', 'success');
}

/* ------------------------------------------------------------ CSV import */

function ccParseCSV(text) {
  text = text.replace(/^ï»¿/, '').replace(/\r\n|\r/g, '\n');
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); field = ''; if (row.some(v => v.trim())) rows.push(row); row = []; }
    else field += c;
  }
  row.push(field); if (row.some(v => v.trim())) rows.push(row);
  return rows;
}

const CC_ALIAS = {
  business: ['business','business_name','company','company_name','name','title'],
  first_name: ['first_name','firstname','owner_first_name','contact_first_name'],
  last_name: ['last_name','lastname','owner_last_name'],
  owner: ['owner','owner_name','contact','contact_name','decision_maker','owner_decision_maker'],
  role: ['role'],
  phone: ['phone','phone_number','telephone','mobile','cell','phone_unformatted'],
  email: ['email','email_address','contact_email'],
  city: ['city','town','locality'], state: ['state','region','province'],
  address: ['current_public_address','address','full_address','street','street_address','original_leadswift_address'],
  website: ['website','url','site','domain'],
  reviews: ['verified_google_reviews','google_reviews','reviews','review_count','reviews_count','total_reviews','user_ratings_total','leadswift_reviews'],
  rating: ['verified_google_rating','google_rating','rating','stars','avg_rating','total_score','score','leadswift_rating'],
  category: ['category','industry','type','categoryname'],
  business_type: ['business_type','primary_category'],
  map_rank: ['map_rank','rank','maps_position','google_rank','position'],
  web_rank: ['web_rank','organic_rank','google_page'],
  google_places_rank: ['google_places_rank','leadswift_places_rank'],
  priority: ['priority'],
  company_size: ['company_size'],
  competitor: ['local_competitor','competitor','top_competitor','top_competitor_name'],
  competitor_reviews: ['competitor_reviews','top_competitor_reviews'],
  competitor_rating: ['competitor_rating','top_competitor_rating'],
  competitor_platform: ['competitor_platform','competitor_source'],
  review_gap: ['review_gap'],
  angi_reviews: ['angi_reviews','angie_reviews','angieslist_reviews'],
  angi_rating: ['angi_rating','angie_rating','angieslist_rating'],
  yelp_reviews: ['yelp_reviews'], yelp_rating: ['yelp_rating'],
  bbb_reviews: ['bbb_reviews'], bbb_rating: ['bbb_rating','bbb_score'],
  yp_reviews: ['yp_reviews','yellowpages_reviews'], yp_rating: ['yp_rating','yellowpages_rating'],
  fb_reviews: ['fb_reviews','facebook_reviews'], fb_rating: ['fb_rating','facebook_rating','facebook_recommendation'],
  bing_rating: ['bing_rating'], bing_reviews: ['bing_reviews'],
  fb_url: ['fb_url','facebook_url'], twitter_url: ['twitter_url'], linkedin_url: ['linkedin_url'], instagram_url: ['instagram_url'],
  verification_confidence: ['verification_confidence'],
  qualify_reason: ['why_this_lead_qualifies'],
  outreach_angle: ['personalised_outreach_angle_why_them','personalized_outreach_angle_why_them'],
  company_evidence: ['unique_selling_point_company_evidence'],
  negative_share: ['1_2_star_share'],
  review_type: ['review_type'],
  owner_replied: ['owner_replied'],
  sales_implication: ['review_summary_sales_implication'],
  rank_signal: ['local_visibility_rank_signal'],
  other_platforms: ['bbb_other_platforms','other_platform','other_platforms'],
  positive_unanswered_reviews: ['positive_unanswered_reviews','positive_unanswered_count','unanswered_positive_reviews','positive_reviews_unanswered'],
  negative_unanswered_reviews: ['negative_unanswered_reviews','negative_unanswered_count','unanswered_negative_reviews','negative_reviews_unanswered'],
  facebook_verified: ['facebook_verified','fb_verified','facebook_confirmed'],
  other_platform_review_count: ['other_platform_review_count','other_platform_reviews'],
  bad_review: ['exact_review_excerpt_25_words','bad_review','worst_review','negative_review_text','bad_review_quote'],
  last_review: ['review_date_relative','last_review_date_relative','last_review','last_review_date','most_recent_review','exact_days_since_last_review','days_since_review'],
  unanswered_reviews: ['unanswered_reviews','unresponded_reviews','no_owner_response'],
  negative_reviews: ['negative_reviews','one_star_reviews','low_star_reviews'],
  established: ['established','established_since','year_founded'],
  years: ['years','years_in_business'], jobs_month: ['jobs_month','jobs_per_month','monthly_jobs'],
  avg_job: ['avg_job','avg_job_value','job_value'],
  status: ['status','call_status','disposition'], last_called: ['last_called'],
  attempts: ['attempts'], notes: ['notes','note','comment']
};

const CC_PLACEHOLDER_EXACT = new Set(['-','--','—','n/a','na','unknown','unverified','tbd','pending','none','']);
function ccCleanPlaceholders(o) {
  for (const k of Object.keys(o)) {
    if (typeof o[k] !== 'string') continue;
    if (CC_PLACEHOLDER_EXACT.has(o[k].trim().toLowerCase())) o[k] = '';
  }
  if (o.owner && /not (publicly )?verified/i.test(o.owner)) o.owner = '';
}

/* Reads .xlsx/.xls/.xlsm into the same row-of-arrays shape ccParseCSV returns,
   so everything downstream (aliasing, saving, rendering) is unchanged.
   Blank rows are dropped, and every cell is stringified because the alias
   mapping below expects strings, not the numbers Excel hands back. */
async function ccReadWorkbook(file) {
  if (typeof XLSX === 'undefined') { toast('Excel support failed to load', 'error'); return []; }
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  return wb.SheetNames.map(name => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' })
      .map(r => r.map(c => c === null || c === undefined ? '' : String(c)));
    return { name, rows };
  });
}

const CC_SHEET_SKIP_HEADERS = ['audit_status', 'why_excluded', 'disposition_reason'];

function ccNormHeads(row) {
  return row.map(h => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
}

function ccSheetLooksLikeLeads(heads) {
  if (heads.some(h => CC_SHEET_SKIP_HEADERS.includes(h))) return false;
  const hasBiz = CC_ALIAS.business.some(a => heads.includes(a));
  const hasPhone = CC_ALIAS.phone.some(a => heads.includes(a));
  return hasBiz && hasPhone;
}

function ccRowsToLeads(rows, sourceId) {
  const heads = ccNormHeads(rows[0]);
  return rows.slice(1).filter(r => r.some(c => String(c || '').trim())).map((r, i) => {
    const raw = {}; heads.forEach((h, j) => raw[h] = (r[j] || '').trim());
    const o = { id: sourceId + '-' + i, sourceId };
    for (const [key, list] of Object.entries(CC_ALIAS)) {
      for (const a of list) if (raw[a]) { o[key] = raw[a]; break; }
      if (o[key] === undefined) o[key] = '';
    }
    ccCleanPlaceholders(o);
    if (o.email && o.email.includes('|')) {
      const parts = o.email.split('|').map(s => s.trim());
      o.email = parts[0] || '';
      if (!o.first_name && parts[1]) o.first_name = parts[1];
      if (!o.last_name && parts[2]) o.last_name = parts[2];
    }
    if (!o.first_name && o.owner) {
      const b = o.owner.split(/\s+/); o.first_name = b[0]; o.last_name = b.slice(1).join(' ');
    }
    return o;
  });
}

function ccShowSheetPicker(fileName, sheetInfos) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'cc-modal-overlay';
    overlay.innerHTML = `
      <div class="cc-modal">
        <h4>Which sheet${sheetInfos.length > 1 ? 's' : ''} from "${esc(fileName)}"?</h4>
        <p class="cc-modal-sub">${sheetInfos.length} sheet${sheetInfos.length === 1 ? '' : 's'} in this file look${sheetInfos.length === 1 ? 's' : ''} like a lead list. Pick which to bring in now — you can come back and import a different one later the same way.</p>
        <div class="cc-modal-list">
          ${sheetInfos.map((s, i) => `
            <label class="cc-modal-row">
              <input type="checkbox" data-idx="${i}" checked>
              <span>${esc(s.name)}</span>
              <b>${s.count} lead${s.count === 1 ? '' : 's'}</b>
            </label>`).join('')}
        </div>
        <div class="cc-modal-actions">
          <button class="cc-mini" id="cc-modal-cancel">Cancel</button>
          <button class="cc-mini focus" id="cc-modal-ok">Import selected</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = result => { overlay.remove(); resolve(result); };
    overlay.querySelector('#cc-modal-cancel').onclick = () => close(null);
    overlay.querySelector('#cc-modal-ok').onclick = () => {
      const checked = [...overlay.querySelectorAll('input[type=checkbox]:checked')].map(c => Number(c.dataset.idx));
      close(checked);
    };
    overlay.onclick = ev => { if (ev.target === overlay) close(null); };
  });
}

async function ccImportCSV(e) {
  const f = e.target.files[0]; if (!f) return;
  const isExcel = /\.(xlsx|xls|xlsm)$/i.test(f.name);
  const newEntries = [];
  let addedTotal = 0;

  if (isExcel) {
    const sheets = await ccReadWorkbook(f);
    const usable = sheets.filter(s => s.rows.length > 1 && ccSheetLooksLikeLeads(ccNormHeads(s.rows[0])));
    if (!usable.length) return toast('No sheet in that file looks like a lead list (need a business name + phone column)', 'error');

    let chosen = usable;
    if (usable.length > 1) {
      const preview = usable.map(s => ({ name: s.name, count: s.rows.length - 1 }));
      const pickedIdx = await ccShowSheetPicker(f.name, preview);
      if (!pickedIdx || !pickedIdx.length) { e.target.value = ''; return; }
      chosen = pickedIdx.map(i => usable[i]);
    }

    chosen.forEach(s => {
      const sourceId = 'src-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      const added = ccRowsToLeads(s.rows, sourceId);
      if (!added.length) return;
      ccLeads = ccLeads.concat(added);
      const label = usable.length > 1 ? f.name + ' — ' + s.name : f.name;
      ccSources.push({ id: sourceId, name: label, count: added.length, at: new Date().toISOString() });
      newEntries.push(...added);
      addedTotal += added.length;
    });
  } else {
    const rows = ccParseCSV(await f.text());
    if (rows.length < 2) return toast('That CSV looks empty', 'error');
    const sourceId = 'src-' + Date.now();
    const added = ccRowsToLeads(rows, sourceId);
    if (added.length) {
      ccLeads = ccLeads.concat(added);
      ccSources.push({ id: sourceId, name: f.name, count: added.length, at: new Date().toISOString() });
      newEntries.push(...added);
      addedTotal += added.length;
    }
  }

  if (!addedTotal) return toast('No usable rows found in that file', 'error');

  await ccSaveLeads();
  await ccSaveSources();
  ccRenderRail();
  ccRenderSources();
  if (!ccLead) ccSelect(newEntries[0]);
  toast(addedTotal + ' leads added from ' + f.name, 'success');
  e.target.value = '';
}

function ccRemoveSource(id) {
  const src = ccSources.find(s => s.id === id); if (!src) return;
  if (!confirm('Remove "' + src.name + '" and its ' + src.count + ' lead' + (src.count === 1 ? '' : 's') + '? This can\'t be undone.')) return;
  const removedIds = new Set(ccLeads.filter(l => l.sourceId === id).map(l => l.id));
  ccLeads = ccLeads.filter(l => l.sourceId !== id);
  ccSources = ccSources.filter(s => s.id !== id);
  if (ccLead && removedIds.has(ccLead.id)) { ccLead = null; if (ccLeads.length) ccSelect(ccLeads[0]); }
  ccSaveLeads();
  ccSaveSources();
  ccRenderRail();
  ccRenderSources();
  if (!ccLeads.length) { ccRenderHead(); ccRenderInfo(); ccRenderScript(); ccRenderObjections(); }
  toast('Removed', 'success');
}

function ccRenderSources() {
  const el = document.getElementById('cc-sources'); if (!el) return;
  if (!ccSources.length) { el.innerHTML = ''; return; }
  el.innerHTML = ccSources.map(s => `
    <div class="cc-src" title="${esc(s.name)}">
      <span class="cc-src-name">${esc(s.name)}</span>
      <b>${s.count}</b>
      <button class="cc-src-x" data-src="${esc(s.id)}" title="Remove this file">&times;</button>
    </div>`).join('');
  el.querySelectorAll('.cc-src-x').forEach(b => b.onclick = ev => { ev.stopPropagation(); ccRemoveSource(b.dataset.src); });
}

/* ------------------------------------------------------------- reports */

function ccEv(days, type) {
  const cut = days ? Date.now() - days * 864e5 : 0;
  return ccEvents.filter(e => (!type || e.type === type) && (!cut || new Date(e.at).getTime() >= cut));
}
const ccPct = (a, b) => b > 0 ? Math.round((a / b) * 1000) / 10 : 0;

function renderCallReports() {
  const p = document.getElementById('pane-callreports');
  const calls = ccEv(ccRanges.sum, 'call');

  if (!calls.length) {
    p.innerHTML = `<div class="card"><div class="cc-empty" style="padding:24px">
      No calls logged yet. A call is recorded the moment you press one of the coloured
      outcome buttons on the Leads tab, and an objection is recorded when you tap
      "they said this" on an objection card.</div></div>`;
    return;
  }

  const sold = calls.filter(c => c.outcome === 'Sold').length;
  const conn = calls.filter(c => !CC_NOANS.includes(c.outcome)).length;
  const alive = calls.filter(c => CC_ALIVE.includes(c.outcome)).length;
  const days = new Set(calls.map(c => c.at.slice(0, 10))).size;
  const mins = Math.round(calls.reduce((s, c) => s + (c.seconds || 0), 0) / 60);

  const stat = (n, l, s) => `<div class="cc-stat"><div class="n">${n}</div><div class="l">${l}</div><div class="s">${s}</div></div>`;

  const objs = ccEv(ccRanges.obj, 'objection');
  const oc = {}; objs.forEach(o => oc[o.trigger] = (oc[o.trigger] || 0) + 1);
  const objRows = Object.entries(oc).sort((a, b) => b[1] - a[1]);

  const bs = {};
  calls.forEach(c => {
    const k = c.script || 'unknown';
    bs[k] = bs[k] || { n: 0, sold: 0, conn: 0 };
    bs[k].n++; if (!CC_NOANS.includes(c.outcome)) bs[k].conn++; if (c.outcome === 'Sold') bs[k].sold++;
  });
  const scriptRows = Object.entries(bs).map(([id, d]) => ({ id, ...d, rate: ccPct(d.sold, d.conn) }))
    .sort((a, b) => b.rate - a.rate);

  const bar = (label, v, sub, tone) => `<div class="cc-bar">
    <div class="bt">${esc(label)}</div>
    <div class="br"><div class="btr"><div class="bf ${tone || ''}" style="width:${Math.min(100, v)}%"></div></div><div class="bp">${v}%</div></div>
    <div class="bs">${esc(sub)}</div></div>`;

  p.innerHTML = `
    <div class="card" style="margin-bottom:16px"><div class="cc-stats">
      ${stat(calls.length, 'Dials', days + ' active day' + (days === 1 ? '' : 's'))}
      ${stat(ccPct(conn, calls.length) + '%', 'Pick-up rate', conn + ' answered')}
      ${stat(ccPct(sold, conn) + '%', 'Close rate', sold + ' sold of ' + conn)}
      ${stat(ccPct(alive, conn) + '%', 'Still alive', alive + ' on hold or audit sent')}
      ${stat(Math.round(calls.length / Math.max(1, days)), 'Dials per day', mins + ' min on the phone')}
    </div></div>

    <div class="card" style="margin-bottom:16px">
      <div class="sec">Objections heard</div>
      <div class="cc-bars">${objRows.length
        ? objRows.map(([t, n]) => bar(t, ccPct(n, calls.length), n + ' time' + (n === 1 ? '' : 's') + ' in ' + calls.length + ' calls')).join('')
        : '<div class="cc-empty">Nothing logged. Tap "they said this" on an objection card during a call.</div>'}</div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="sec">Script effectiveness</div>
      <div class="cc-bars">${scriptRows.map((r, i) =>
        bar(ccScriptName(r.id) + (i === 0 && r.sold ? '  (best so far)' : ''), r.rate,
            r.sold + ' sold from ' + r.conn + ' answered, ' + r.n + ' dialled',
            i === 0 && r.sold ? 'green' : '')).join('')}</div>
    </div>

    <div class="card">
      <div class="sec">Where calls end</div>
      <div class="cc-bars">${(() => {
        const c = {}; calls.forEach(x => c[x.outcome] = (c[x.outcome] || 0) + 1);
        return CC_STATUSES.filter(s => c[s.label]).sort((a, b) => c[b.label] - c[a.label])
          .map(s => bar(s.label, ccPct(c[s.label], calls.length), c[s.label] + ' of ' + calls.length + ' calls',
            s.tone === 'green' ? 'green' : (s.tone === 'red' || s.tone === 'dark' ? 'red' : ''))).join('');
      })()}</div>
    </div>`;
}
