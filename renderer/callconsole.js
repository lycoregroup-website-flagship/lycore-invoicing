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
// Cross-list "who have I already called" memory. Keyed by normalized phone
// digits, independent of any one source/list, so it survives a source being
// removed or a list being re-imported under a new name.
let ccContactRegistry = {};
let ccSettings = {};
let ccLead = null, ccScript = null, ccScriptId = '';
let ccFilter = 'all', ccQuery = '', ccOpenObj = null;
let ccHeard = new Set();
let ccTimer = { on: false, start: 0, elapsed: 0 };
let ccRanges = { sum: 30, obj: 30, scr: 30 };
let ccUI = { rail: true, info: false, activity: false, mode: 'full', tab: 'obj', step: 0, wObj: 340, favs: [], recent: [] };

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
// Statuses that mean she actually got someone on the line and talked to them.
const CC_ANSWERED = ['Sold', 'On Hold', 'Audit sent', "Didn't Buy", 'Not interested'];
// "Do not call" is tracked on its own -- it can get set without ever dialling
// (a bad number, a request carried over from an earlier call), so it isn't
// counted as a real conversation either way.
const CC_CONTACT_EXCLUDED = ['Do not call'];
const ccStatus = l => CC_STATUSES.find(s => s.label === l);

/* ------------------------------------------------------- contacted stats */

function ccContactStats(leads) {
  const byStatus = {};
  let attempted = 0, answered = 0, noAnswer = 0, excluded = 0;
  leads.forEach(l => {
    if (!l.status) return;
    attempted++;
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    if (CC_CONTACT_EXCLUDED.includes(l.status)) excluded++;
    else if (CC_NOANS.includes(l.status)) noAnswer++;
    else if (CC_ANSWERED.includes(l.status)) answered++;
  });
  return {
    total: leads.length, attempted, unworked: leads.length - attempted,
    answered, noAnswer, excluded, byStatus
  };
}

function ccSourceLeads(id) { return ccLeads.filter(l => l.sourceId === id); }

/* ------------------------------------------------------------- load/save */

async function ccLoad() {
  ccLeads      = (await sget('lyc-leads')) || [];
  ccSources    = (await sget('lyc-sources')) || [];
  ccContactRegistry = (await sget('lyc-contact-registry')) || {};
  if (!ccSources.length && ccLeads.length) {
    ccSources = [{ id: 'legacy', name: 'Imported leads', count: ccLeads.length, at: new Date().toISOString() }];
    ccLeads.forEach(l => { if (!l.sourceId) l.sourceId = 'legacy'; });
    ccSaveSources();
  }
  ccEvents     = (await sget('lyc-call-events')) || [];
  ccScripts    = (await sget('lyc-scripts')) || DEFAULT_SCRIPTS.map(s => ({ ...s }));
  ccObjections = (await sget('lyc-objections')) || JSON.parse(JSON.stringify(DEFAULT_OBJECTIONS));
  // Offer defaults added after first install, once each, without overwriting saved edits or bringing back deleted ones.
  try {
    const NEW_SCRIPT_IDS = ['07-reputation-6min', '08-pest-plain'];
    const NEW_OBJ = [
      ['dontneed', 'We get our reviews on Angi / Thumbtack / Facebook'],
      ['dontneed', "Our customers don't leave reviews"],
      ['anything', "They're about to hang up for good"],
      ['pest', "We're slammed, it's peak season"],
      ['pest', "Corporate handles that / we're a franchise"],
      ['pest', "Our customers are on plans, they don't need reviews"],
      ['pest', "People just call whoever's cheapest"],
      ['pest', "We run Google Ads / we buy leads"],
      ['pest', "I'm on a job right now"]
    ];
    const seen = (await sget('lyc-defaults-seen')) || [];
    let touched = false;
    NEW_SCRIPT_IDS.forEach(id => {
      const key = 'script:' + id;
      if (seen.includes(key)) return;
      seen.push(key); touched = true;
      const d = DEFAULT_SCRIPTS.find(s => s.id === id);
      if (d && !ccScripts.some(s => s.id === id)) { ccScripts.push({ ...d }); ccSaveScripts(); }
    });
    NEW_OBJ.forEach(([gid, trig]) => {
      const key = 'obj:' + gid + ':' + trig;
      if (seen.includes(key)) return;
      seen.push(key); touched = true;
      const dg = DEFAULT_OBJECTIONS.groups.find(g => g.id === gid);
      const di = dg && dg.items.find(i => i.trigger === trig);
      if (!di) return;
      let g = ccObjections.groups.find(x => x.id === gid);
      if (!g) { g = JSON.parse(JSON.stringify(Object.assign({}, dg, { items: [] }))); ccObjections.groups.splice(Math.min(1, ccObjections.groups.length), 0, g); }
      if (!g.items.some(i => i.trigger === trig)) { g.items.push(JSON.parse(JSON.stringify(di))); sset('lyc-objections', ccObjections); }
    });
    if (touched) sset('lyc-defaults-seen', seen);
  } catch (e) { console.warn('defaults merge skipped', e); }
  ccSettings   = (await sget('lyc-call-settings')) || {};
  if (ccSettings.ui) ccUI = Object.assign(ccUI, ccSettings.ui);
  if (ccUI.wObjV !== 2) { ccUI.wObj = 470; ccUI.wObjV = 2; }
  ccScriptId = ccSettings.lastScript || (ccScripts[0] && ccScripts[0].id) || '';
  ccLoadScript(ccScriptId);
}

const ccSaveLeads    = () => sset('lyc-leads', ccLeads);
const ccSaveSources  = () => sset('lyc-sources', ccSources);
const ccSaveRegistry = () => sset('lyc-contact-registry', ccContactRegistry);
const ccSaveScripts  = () => sset('lyc-scripts', ccScripts);
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
  if (v.negative_unanswered_count !== '' && v.negative_unanswered_count !== undefined && v.negative_unanswered_count !== null) {
    const negN = Number(v.negative_unanswered_count);
    if (!isNaN(negN)) v.negative_review_line = negN > 0 ? `about ${negN} negative review${negN === 1 ? '' : 's'} that ${negN === 1 ? "hasn't" : "haven't"} been answered` : 'no negative reviews sitting there unanswered';
  }
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
    if (!cur || !line.trim()) return;
    if (/^badge:/i.test(line)) { cur.badge = line.slice(line.indexOf(':') + 1).trim(); return; }
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

/* ------------------------------------------------------- script manager
   Lets her create, edit, duplicate, and delete call scripts from inside
   the app -- no more hand-editing calldata.js and shipping a release just
   to change wording. This reads/writes the same ccScripts array that
   already persists through sset('lyc-scripts', ...), so a saved edit
   survives both a restart and a future app update. */

function ccScriptMeta(body) {
  const fm = body.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = {};
  if (fm) fm[1].split('\n').forEach(l => {
    const i = l.indexOf(':');
    if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  });
  return meta;
}

function ccScriptFrontmatterFields(body) {
  // Keeps any custom frontmatter keys a script defines beyond the three the
  // form edits directly (e.g. some scripts add their own {{panic}}-style
  // variables up there) so saving through the editor never silently drops them.
  const meta = ccScriptMeta(body);
  return Object.assign({}, meta, {
    name: meta.name || '', noun: meta.noun || 'business', search: meta.search || '{{category}} {{city}}'
  });
}

function ccScriptBodyAfterFrontmatter(body) {
  const fm = body.match(/^---\n[\s\S]*?\n---\n?/);
  return (fm ? body.slice(fm[0].length) : body).replace(/^\n+/, '');
}

function ccRebuildScriptRaw(fields, bodyText) {
  const order = ['name', 'noun', 'search'];
  const keys = order.concat(Object.keys(fields).filter(k => !order.includes(k)));
  const fm = keys.map(k => k + ': ' + (fields[k] == null ? '' : fields[k])).join('\n');
  return '---\n' + fm + '\n---\n\n' + bodyText.replace(/^\n+/, '');
}

function ccOpenScriptManager() {
  const overlay = document.createElement('div');
  overlay.className = 'cc-modal-overlay';
  const paint = () => {
    overlay.innerHTML = `
      <div class="cc-modal cc-modal-wide">
        <h4>Call scripts</h4>
        <p class="cc-modal-sub">These are the scripts in the Script dropdown. Changes here save immediately and stick around after you close the app -- no new release needed.</p>
        <div class="cc-modal-list">
          ${ccScripts.map(s => {
            const f = ccScriptFrontmatterFields(s.body);
            return `
            <div class="cc-modal-row cc-scriptrow">
              <span>${esc(f.name || s.id)}${s.id === ccScriptId ? ' <b style="color:var(--indigo-600)">(active)</b>' : ''}</span>
              <button class="cc-mini" data-act="edit" data-id="${esc(s.id)}">Edit</button>
              <button class="cc-mini" data-act="dup" data-id="${esc(s.id)}">Duplicate</button>
              <button class="cc-mini" data-act="del" data-id="${esc(s.id)}">Delete</button>
            </div>`;
          }).join('')}
        </div>
        <div class="cc-modal-actions">
          <button class="cc-mini" id="cc-sm-close">Close</button>
          <button class="cc-mini focus" id="cc-sm-new">+ New script</button>
        </div>
      </div>`;
    overlay.querySelector('#cc-sm-close').onclick = () => overlay.remove();
    overlay.querySelector('#cc-sm-new').onclick = () => { overlay.remove(); ccOpenScriptForm(null); };
    overlay.querySelectorAll('[data-act="edit"]').forEach(b => b.onclick = () => { overlay.remove(); ccOpenScriptForm(b.dataset.id); });
    overlay.querySelectorAll('[data-act="dup"]').forEach(b => b.onclick = () => { const newId = ccDuplicateScript(b.dataset.id); if (newId) { overlay.remove(); ccOpenScriptForm(newId); } });
    overlay.querySelectorAll('[data-act="del"]').forEach(b => b.onclick = () => { ccDeleteScript(b.dataset.id); paint(); });
  };
  paint();
  overlay.onclick = ev => { if (ev.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

function ccDuplicateScript(id) {
  const s = ccScripts.find(x => x.id === id); if (!s) return null;
  const f = ccScriptFrontmatterFields(s.body);
  const newId = 'script-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const newFields = Object.assign({}, f, { name: (f.name || 'Untitled') + ' (copy)' });
  ccScripts.push({ id: newId, body: ccRebuildScriptRaw(newFields, ccScriptBodyAfterFrontmatter(s.body)) });
  ccSaveScripts();
  ccRenderScript();
  return newId;
}

function ccDeleteScript(id) {
  if (ccScripts.length <= 1) { toast('Can\'t delete the last script -- keep at least one', 'error'); return; }
  const s = ccScripts.find(x => x.id === id); if (!s) return;
  const f = ccScriptFrontmatterFields(s.body);
  const wasActive = id === ccScriptId;
  const warn = wasActive ? ' This is the one showing right now -- another script will be selected instead.' : '';
  if (!confirm('Delete "' + (f.name || id) + '"?' + warn + ' This can\'t be undone.')) return;
  ccScripts = ccScripts.filter(x => x.id !== id);
  ccSaveScripts();
  if (wasActive) ccLoadScript(ccScripts[0].id);
  ccRenderScript();
  toast('Script deleted', 'success');
}

/* --------------------------------------------------- variable helper */

function ccKnownVarTokens(bodyText) {
  const found = new Set();
  const re = /\{\{(\w+)(?:\|[^}]*)?\}\}/g;
  let m;
  while ((m = re.exec(bodyText))) found.add(m[1]);
  ['first_name', 'last_name', 'business', 'company_name', 'owner_name', 'city', 'state',
   'rep_name', 'offer_line', 'discount_line', 'rank', 'competitor', 'competitor_reviews',
   'competitor_rating', 'reviews', 'rating', 'next_month'].forEach(c => found.add(c));
  return [...found].sort();
}

/* -------------------------------------------------- block grouping/DSL
   The flat lines array (from ccParse) stays the single source of truth
   while the form is open -- grouping is only computed for display, and a
   branch's "children" are simply whatever say/note/etc lines follow its
   `?` line up until the next `?` or the end of the section. Saving just
   walks the same flat array back out to text, so nothing added by
   ccParse (or dropped by it) surprises the editor. */

function ccGroupLines(lines) {
  const items = [];
  let branch = null;
  lines.forEach((line, li) => {
    if (line.t === 'if') { branch = { type: 'branch', li, headerLine: line, children: [] }; items.push(branch); }
    else if (branch) branch.children.push({ type: 'line', li, line });
    else items.push({ type: 'line', li, line });
  });
  return items;
}

function ccBranchInsertIndex(lines, headerLi) {
  let idx = headerLi + 1;
  while (idx < lines.length && lines[idx].t !== 'if') idx++;
  return idx;
}

function ccLineToDsl(line) {
  switch (line.t) {
    case 'say':  return '> ' + (line.text || '').trim() + '\n\n';
    case 'do':   return '~ ' + (line.text || '').trim() + '\n\n';
    case 'if':   return '? ' + (line.text || '').trim() + '\n\n';
    case 'stop': return '! ' + (line.text || '').trim() + '\n\n';
    case 'why':  return '= ' + (line.text || '').trim() + '\n\n';
    case 'cap':  return '+ ' + (line.cap.key || '').trim() + ' | ' + (line.cap.label || line.cap.key || '').trim() + '\n\n';
    default:     return '';
  }
}

function ccSerializeSections(sections) {
  return sections.map(sec => {
    const title = (sec.title || 'SECTION').trim() || 'SECTION';
    let head = '## ' + title + '\n';
    if (sec.badge && sec.badge.trim()) head += 'badge: ' + sec.badge.trim() + '\n';
    head += '\n';
    const body = sec.lines
      .filter(l => l.t === 'cap' ? (l.cap.key || '').trim() : (l.text || '').trim())
      .map(ccLineToDsl).join('');
    return head + body;
  }).join('');
}

/* ------------------------------------------------------- block editor
   Replaces the old raw-DSL textarea. She sees "Say:" boxes and "Note to
   rep:" boxes, not `>` and `~` -- the same underlying script format is
   still what gets saved, just built up from friendly pieces instead of
   typed by hand. */

const CC_LINE_LABEL = { say: 'Say:', do: 'Note to rep:', stop: 'Pause / stop beat:', why: 'Why this works (optional aside):' };

function ccLineItemHTML(it, si, knownVars) {
  const line = it.line, li = it.li;
  if (line.t === 'cap') {
    return `
      <div class="cc-sfitem cc-sfline cap">
        <div class="cc-sfitem-row">
          <label>Ask &amp; save as:</label>
          <button class="cc-mini danger" data-act="del-line" data-si="${si}" data-li="${li}" title="Delete this field">Delete</button>
        </div>
        <div class="cc-sfcap-row">
          <input class="cc-input cc-sfcap-key" data-si="${si}" data-li="${li}" value="${esc(line.cap.key)}" placeholder="field name, e.g. best_time">
          <input class="cc-input cc-sfcap-label" data-si="${si}" data-li="${li}" value="${esc(line.cap.label)}" placeholder="prompt shown on the box, e.g. Best time to call">
        </div>
      </div>`;
  }
  const label = CC_LINE_LABEL[line.t] || 'Line:';
  const varPicker = line.t === 'say' ? `
        <select class="cc-sfvar" data-si="${si}" data-li="${li}">
          <option value="">Insert variable…</option>
          ${knownVars.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}
        </select>` : '';
  return `
    <div class="cc-sfitem cc-sfline ${esc(line.t)}">
      <div class="cc-sfitem-row">
        <label>${label}</label>
        ${varPicker}
        <button class="cc-mini danger" data-act="del-line" data-si="${si}" data-li="${li}" title="Delete this line">Delete</button>
      </div>
      <textarea class="cc-input cc-sfline-text" rows="2" data-si="${si}" data-li="${li}" placeholder="${line.t === 'say' ? 'What you say, word for word' : 'A direction for the rep, never read out loud'}">${esc(line.text)}</textarea>
    </div>`;
}

function ccItemHTML(it, si, knownVars) {
  if (it.type === 'branch') {
    return `
      <div class="cc-sfitem cc-sfbranch">
        <div class="cc-sfitem-row">
          <label>If they say / objection:</label>
          <button class="cc-mini danger" data-act="del-line" data-si="${si}" data-li="${it.li}" title="Delete this objection and its response">Delete</button>
        </div>
        <input class="cc-input cc-sfline-text" data-si="${si}" data-li="${it.li}" value="${esc(it.headerLine.text)}" placeholder="e.g. NOT INTERESTED">
        <div class="cc-sfbranch-children">
          ${it.children.map(c => ccLineItemHTML(c, si, knownVars)).join('') || '<div class="cc-sfempty">No response lines yet -- add one below.</div>'}
        </div>
        <div class="cc-sfsec-add nested">
          <button class="cc-mini" data-act="add-say" data-si="${si}" data-header="${it.li}">+ Say</button>
          <button class="cc-mini" data-act="add-note" data-si="${si}" data-header="${it.li}">+ Note</button>
        </div>
      </div>`;
  }
  return ccLineItemHTML(it, si, knownVars);
}

function ccSectionBlockHTML(sec, si, knownVars) {
  const items = ccGroupLines(sec.lines);
  return `
    <div class="cc-sfsec">
      <div class="cc-sfsec-head">
        <input class="cc-input cc-sfsec-title" data-si="${si}" value="${esc(sec.title)}" placeholder="Section name, e.g. Opener">
        <button class="cc-mini danger" data-act="del-section" data-si="${si}" title="Delete this whole section">Delete section</button>
      </div>
      <div class="cc-sfsec-items">
        ${items.map(it => ccItemHTML(it, si, knownVars)).join('') || '<div class="cc-sfempty">Nothing in this section yet -- add a line below.</div>'}
      </div>
      <div class="cc-sfsec-add">
        <button class="cc-mini" data-act="add-say" data-si="${si}">+ Say</button>
        <button class="cc-mini" data-act="add-note" data-si="${si}">+ Note</button>
        <button class="cc-mini" data-act="add-branch" data-si="${si}">+ Branch / objection</button>
        <button class="cc-mini" data-act="add-pause" data-si="${si}">+ Pause</button>
        <button class="cc-mini" data-act="add-cap" data-si="${si}">+ Capture field</button>
      </div>
    </div>`;
}

function ccOpenScriptForm(id) {
  const isNew = !id;
  const existing = isNew ? null : ccScripts.find(x => x.id === id);
  if (!isNew && !existing) return;
  const fields = isNew
    ? { name: '', noun: 'business', search: '{{category}} {{city}}' }
    : ccScriptFrontmatterFields(existing.body);
  const bodyText = isNew
    ? '## OPENER\n\n> Hey {{first_name}}, how\'s it going?\n\n~ Wait for them to answer before you go on.\n'
    : ccScriptBodyAfterFrontmatter(existing.body);

  const parsed = ccParse('---\nname: x\n---\n' + bodyText);
  let sections = parsed.steps.map(s => ({
    title: s.title,
    badge: s.badge || '',
    lines: s.lines.map(l => l.t === 'cap' ? { t: 'cap', cap: { key: l.cap.key, label: l.cap.label } } : { t: l.t, text: l.text })
  }));
  if (!sections.length) sections = [{ title: 'OPENER', badge: '', lines: [] }];

  const knownVars = ccKnownVarTokens(bodyText);

  const overlay = document.createElement('div');
  overlay.className = 'cc-modal-overlay';
  overlay.innerHTML = `
    <div class="cc-modal cc-modal-edit cc-modal-blocks">
      <h4>${isNew ? 'New script' : 'Edit script'}</h4>
      <p class="cc-modal-sub">Build it out of Say and Note lines -- no code, no symbols to remember. Add a branch when you want a ready answer for something they might say.</p>
      <div class="cc-field">
        <label>Name (shown in the Script dropdown)</label>
        <input id="cc-sf-name" class="cc-input" style="width:100%" value="${esc(fields.name)}" placeholder="e.g. Pest control - work first">
      </div>
      <div class="cc-field">
        <div id="cc-sf-blocks" class="cc-sf-blocks"></div>
        <button class="cc-mini focus" id="cc-sf-addsection">+ Add section</button>
      </div>
      <div class="cc-modal-actions">
        <button class="cc-mini" id="cc-sf-cancel">Cancel</button>
        <button class="cc-mini focus" id="cc-sf-save">Save</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const nameEl = overlay.querySelector('#cc-sf-name');
  const blocksEl = overlay.querySelector('#cc-sf-blocks');

  function paintBlocks() {
    blocksEl.innerHTML = sections.map((sec, si) => ccSectionBlockHTML(sec, si, knownVars)).join('');
  }
  paintBlocks();

  blocksEl.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.si === undefined) return;
    const si = +t.dataset.si;
    if (t.classList.contains('cc-sfsec-title')) { sections[si].title = t.value; return; }
    if (t.dataset.li === undefined) return;
    const li = +t.dataset.li;
    const line = sections[si].lines[li];
    if (!line) return;
    if (t.classList.contains('cc-sfline-text')) line.text = t.value;
    else if (t.classList.contains('cc-sfcap-key')) line.cap.key = t.value;
    else if (t.classList.contains('cc-sfcap-label')) line.cap.label = t.value;
  });

  blocksEl.addEventListener('change', e => {
    const t = e.target;
    if (!t.classList.contains('cc-sfvar')) return;
    const si = +t.dataset.si, li = +t.dataset.li, val = t.value;
    if (!val) return;
    const line = sections[si].lines[li];
    line.text = (line.text || '') + '{{' + val + '}}';
    paintBlocks();
  });

  blocksEl.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const si = b.dataset.si !== undefined ? +b.dataset.si : null;

    if (act === 'del-section') {
      if (sections.length <= 1) { toast('Keep at least one section', 'error'); return; }
      if (!confirm('Delete this whole section and everything in it?')) return;
      sections.splice(si, 1);
      paintBlocks(); return;
    }
    if (act === 'del-line') {
      const li = +b.dataset.li;
      const line = sections[si].lines[li];
      if (!line) return;
      if (line.t === 'if') {
        if (!confirm('Delete this objection and its response?')) return;
        let end = li + 1;
        while (end < sections[si].lines.length && sections[si].lines[end].t !== 'if') end++;
        sections[si].lines.splice(li, end - li);
      } else {
        if (!confirm('Delete this line?')) return;
        sections[si].lines.splice(li, 1);
      }
      paintBlocks(); return;
    }
    if (act === 'add-say' || act === 'add-note' || act === 'add-pause' || act === 'add-cap') {
      const newLine = act === 'add-say' ? { t: 'say', text: '' }
        : act === 'add-note' ? { t: 'do', text: '' }
        : act === 'add-pause' ? { t: 'stop', text: '' }
        : { t: 'cap', cap: { key: '', label: '' } };
      const header = b.dataset.header;
      if (header !== undefined) {
        const idx = ccBranchInsertIndex(sections[si].lines, +header);
        sections[si].lines.splice(idx, 0, newLine);
      } else {
        sections[si].lines.push(newLine);
      }
      paintBlocks(); return;
    }
    if (act === 'add-branch') {
      sections[si].lines.push({ t: 'if', text: '' });
      paintBlocks(); return;
    }
  });

  overlay.querySelector('#cc-sf-addsection').onclick = () => {
    sections.push({ title: 'NEW SECTION', badge: '', lines: [] });
    paintBlocks();
  };
  overlay.querySelector('#cc-sf-cancel').onclick = () => overlay.remove();
  overlay.onclick = ev => { if (ev.target === overlay) overlay.remove(); };

  overlay.querySelector('#cc-sf-save').onclick = () => {
    const name = nameEl.value.trim();
    if (!name) { toast('Give the script a name first', 'error'); nameEl.focus(); return; }
    const bodyOut = ccSerializeSections(sections);
    const rebuilt = ccRebuildScriptRaw(Object.assign({}, fields, { name }), bodyOut);
    const parsedCheck = ccParse(rebuilt);
    if (!parsedCheck.steps.length) {
      if (!confirm('This script has no sections yet, so the call console will show it blank. Save anyway?')) return;
    }
    let savedId;
    if (isNew) {
      savedId = 'script-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      ccScripts.push({ id: savedId, body: rebuilt });
    } else {
      existing.body = rebuilt;
      savedId = existing.id;
    }
    ccSaveScripts();
    if (savedId === ccScriptId) ccLoadScript(savedId);
    ccRenderScript();
    overlay.remove();
    toast(isNew ? 'Script created' : 'Script saved', 'success');
  };
}

/* ------------------------------------------------------------ the shell */


function ccShellHTML() {
  return `
  <div class="cc-wrap" id="cc-wrap">

    <aside class="cc-rail" id="cc-rail">
      <div class="cc-railtop">
        <input id="cc-search" class="cc-input" placeholder="Search leads">
        <label class="cc-import" title="Load a CSV or Excel file">Import<input type="file" id="cc-csv" accept=".csv,.xlsx,.xls,.xlsm" hidden></label>
      </div>
      <button class="cc-quickstats" id="cc-quickstats" onclick="ccOpenStats()" title="How many leads you've actually reached out to"></button>
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

      <div class="cc-cols" id="cc-cols">
        <section class="cc-panel cc-scriptpanel">
          <div class="cc-panelhead">
            <h4>Script</h4>
            <select id="cc-scriptsel" class="cc-select"></select>
            <div class="cc-seg" id="cc-modeseg"><button data-m="full" title="Read the whole script">Full</button><button data-m="guided" title="One section at a time">Guided</button></div>
            <button class="cc-mini" id="cc-scriptedit-btn" title="Create, edit, duplicate, or delete call scripts">Edit scripts</button>
          </div>
          <div class="cc-legend">
            <span class="lg say">words you say</span>
            <span class="lg do">do, never read out</span>
            <span class="lg iff">if they say</span>
            <span class="lg stop">stop</span>
          </div>
          <div class="cc-guidebar" id="cc-guidebar"></div>
          <div class="cc-scriptbox" id="cc-scriptbox" tabindex="0"></div>
        </section>

        <div class="cc-resizer" id="cc-resizer" title="Drag to resize. Double-click to reset."></div>

        <section class="cc-panel cc-objpanel">
          <div class="cc-tabs">
            <button data-t="obj">Quick pivots</button>
            <button data-t="notes">Notes</button>
          </div>
          <div class="cc-tabpane" id="cc-pane-obj">
            <p class="cc-pivhint">Tap what the prospect just said. The response appears below.</p>
            <input id="cc-objsearch" class="cc-input" placeholder="Search objections (Alt+S)" autocomplete="off">
            <div class="cc-objlist" id="cc-objlist"></div>
            <div id="cc-objans"></div>
          </div>
          <div class="cc-tabpane" id="cc-pane-notes">
            <textarea id="cc-notes" placeholder="Notes for this lead. Saved as you type."></textarea>
            <div id="cc-notestatus"></div>
          </div>
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
  document.getElementById('cc-scriptsel').onchange = e => { ccLoadScript(e.target.value); ccUI.step = 0; ccRenderScript(); };
  document.getElementById('cc-scriptedit-btn').onclick = ccOpenScriptManager;
  document.getElementById('cc-csv').onchange = ccImportCSV;
  document.getElementById('cc-actadd').onclick = ccAddActivity;
  ccWireMic();
  ccWireLeadsX();
  if (window.ccVoiceMount) ccVoiceMount();
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
  const archivedIds = new Set(ccSources.filter(s => s.archived).map(s => s.id));
  const list = ccLeads.filter(l => {
    // Closed-out lists stay out of the working rail so it doesn't fill up
    // with lists she's already finished -- but they're never hidden from a
    // search, so a lead is still findable if she needs it.
    if (!q && archivedIds.has(l.sourceId)) return false;
    const s = ccStatus(l.status);
    const bucket = !s ? 'new'
      : s.tone === 'green' ? 'done'
      : s.tone === 'blue' ? 'hope'
      : s.tone === 'yellow' ? 'noans' : 'out';
    if (ccFilter !== 'all' && ccFilter !== bucket) return false;
    if (!q) return true;
    return [l.business, l.first_name, l.city, l.phone].join(' ').toLowerCase().includes(q);
  });
  ccRenderQuickStats();

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

/* Same shape every time regardless of how a number was typed or punctuated,
   so the contact registry can match "(555) 019-4521", "+15550194521" and
   "5550194521" as the same person. A US-style leading 1 is dropped; anything
   else is left as-is rather than guessed at. */
function ccNormPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d;
}


function ccToggleAppNav() { const a = document.getElementById('app-shell'); if (a) a.classList.toggle('nav-open'); }
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

/* Surfaces contact history from OTHER lists on a lead that was imported (or
   chosen to be imported anyway) before this list ever ran into it, so the
   context isn't lost just because the dedupe prompt at import time didn't
   catch it -- an older import, or a deliberate "include anyway" choice. */
function ccPriorContactNote(l) {
  const entry = ccContactRegistry[ccNormPhone(l.phone)];
  if (!entry) return '';
  const elsewhere = entry.sourcesContacted.filter(s => s.sourceId !== l.sourceId);
  if (!elsewhere.length) return '';
  const latest = elsewhere[elsewhere.length - 1];
  const when = entry.lastContactedAt ? new Date(entry.lastContactedAt).toLocaleDateString() : '';
  const outcome = entry.status ? ', outcome: ' + esc(entry.status) : '';
  return `<div class="cc-note">Also contacted via ${esc(latest.sourceName)}${when ? ' on ' + esc(when) : ''}${outcome}</div>`;
}

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
    ${ccPriorContactNote(l)}
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


function ccLineHTML(l) {
  switch (l.t) {
    case 'say':  return `<p class="cc-say"><span class="cc-txt">${ccFill(l.text)}</span><button class="cc-copy" title="Copy this line">Copy</button></p>`;
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

/* -------------------------------------------------------- the objections */



/* ===================== Leads workspace v2 ===================== */
let ccSecOpen = {};
let ccObjQuery = '';
let ccNotesT = null;
let ccSpyT = null, ccStepSaveT = null;

const ccIsNum = s => /^\s*\d/.test(s.title);

function ccIntroN() {
  const st = ccScript ? ccScript.steps : [];
  const f = st.findIndex(ccIsNum);
  return f > 0 ? f : 0;
}

function ccFlowCount() { return ccScript ? Math.max(1, ccScript.steps.length - ccIntroN()) : 1; }

function ccClampStep() { ccUI.step = Math.max(0, Math.min(ccFlowCount() - 1, Number(ccUI.step) || 0)); }

function ccStepHTML(step, i, forceOpen) {
  const intro = i < ccIntroN();
  const key = ccScriptId + '|' + step.title;
  const open = forceOpen || (ccSecOpen[key] !== undefined ? ccSecOpen[key] : !intro);
  return `<div class="cc-step ${open ? '' : 'collapsed'} ${intro ? 'intro' : ''}" data-i="${i}">
    <div class="cc-stephead" data-i="${i}"><span class="cc-chev"></span><span>${esc(step.title)}</span>${step.badge ? ` <span class="cc-badge">${esc(step.badge)}</span>` : ''}</div>
    <div class="cc-stepbody">${step.lines.map(ccLineHTML).join('')}</div>
  </div>`;
}

function ccSelect(l) {
  if (!l) return;
  ccFlushNotes();
  ccLead = l; ccOpenObj = null; ccHeard = new Set(); ccUI.step = 0;
  ccRenderRail(); ccRenderHead(); ccRenderInfo();
  ccRenderScript(); ccRenderObjections(); ccRenderActivity(); ccRenderOutcomes(); ccRenderNotes();
  const box = document.getElementById('cc-scriptbox'); if (box) box.scrollTop = 0;
}

function renderLeadsPane() {
  const p = document.getElementById('pane-leads');
  if (!p.dataset.built) { p.innerHTML = ccShellHTML(); p.dataset.built = '1'; ccWireShell(); }
  ccApplyUI(); ccApplyX();
  ccRenderRail(); ccRenderSources(); ccRenderHead(); ccRenderInfo();
  ccRenderScript(); ccRenderObjections(); ccRenderActivity(); ccRenderOutcomes(); ccRenderNotes();
}

function ccRenderHead() {
  const l = ccLead;
  const h = document.getElementById('cc-head');
  if (!l) { h.innerHTML = '<div class="cc-empty">Pick a lead on the left to start.</div>'; return; }
  const v = ccVars();
  const has = x => x !== undefined && x !== null && String(x).trim() !== '';
  const telDisp = ccFormatPhone(l.phone);
  const tel = telDisp.replace(/[^0-9+]/g, '');
  const facts = [];
  if (has(v.google_rating)) facts.push(`<span class="cc-fact">${ccStars(v.google_rating)} ${esc(v.google_rating)}${has(v.google_review_count) ? ' &middot; ' + esc(v.google_review_count) + ' reviews' : ''}</span>`);
  else if (has(v.google_review_count)) facts.push(`<span class="cc-fact">${esc(v.google_review_count)} Google reviews</span>`);
  if (has(v.google_unanswered_count)) facts.push(`<span class="cc-fact">${esc(v.google_unanswered_count)} unanswered</span>`);
  if (has(v.other_platform)) facts.push(`<span class="cc-fact">${esc(v.other_platform)}${has(v.other_platform_review_count) ? ' ' + esc(v.other_platform_review_count) : ''}</span>`);
  if (has(v.facebook_verified)) facts.push(`<span class="cc-fact">Facebook: ${esc(v.facebook_verified)}</span>`);
  if (has(l.status)) facts.push(`<span class="cc-fact status">${esc(l.status)}</span>`);
  h.innerHTML = `
    <button class="cc-railbtn" onclick="ccToggleAppNav()" title="Show or hide the app menu">&#9638;</button>
    <button class="cc-railbtn" onclick="ccToggleRail()" title="Show or hide the lead list">&#9776;</button>
    <span class="cc-logo" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg></span>
    <div class="cc-headname">
      <div class="cc-biz">${esc(l.business || 'Unnamed')}</div>
      <div class="cc-who">${esc([l.first_name, l.last_name].filter(Boolean).join(' ') || 'owner unknown')}${l.city ? ' &middot; ' + esc(l.city) : ''}</div>
    </div>
    <div class="cc-facts">${facts.join('')}</div>
    <span class="cc-phone-wrap"><span class="cc-phone-tag">PHONE</span><a class="cc-phone" href="tel:${esc(tel)}">${esc(telDisp || 'no number')}</a></span>
    <button class="cc-mini" onclick="ccCopyPhone()">Copy</button>
    <div class="cc-timer" id="cc-timer" onclick="ccToggleTimer()">00:00</div>
    <button class="cc-mini" onclick="ccOpenStats()" title="How many leads you've actually reached out to">Contacted</button>
    <button class="cc-mini" onclick="ccOpenLookup()" title="Quick phone lookup (Ctrl+K)">Lookup</button>
    <button class="cc-mini focus" onclick="ccFocus()">Focus</button>
    <button class="cc-mini" onclick="ccOpenKeys()" title="Keyboard shortcuts">?</button>`;
}

function ccRenderScript() {
  const sel = document.getElementById('cc-scriptsel');
  sel.innerHTML = ccScripts.map(s => `<option value="${esc(s.id)}">${esc(ccScriptName(s.id))}</option>`).join('');
  sel.value = ccScriptId;

  const box = document.getElementById('cc-scriptbox');
  if (!ccScript) { box.innerHTML = ''; ccUpdateGuideBar(); return; }

  ccClampStep();
  const st = ccScript.steps, n = ccIntroN(), top = box.scrollTop;
  if (ccUI.mode === 'guided') {
    const gi = n + ccUI.step, nx = st[gi + 1];
    box.innerHTML = st.slice(0, n).map((s, i) => ccStepHTML(s, i, false)).join('') +
      '<div class="cc-stagehead"><span>Stage guide</span><button class="cc-editpill" data-g="edit" title="Edit this script">&#9998; Edit</button></div>' +
      '<h3 class="cc-stagetitle">' + esc(ccStageIntent(st[gi].title)[0]) + '</h3><p class="cc-stagesub">' + esc(ccStageIntent(st[gi].title)[1]) + '</p>' +
      '<div class="cc-stagecount">' + esc(ccShortTitle(st[gi].title)) + ' &middot; ' + (ccUI.step + 1) + ' of ' + ccFlowCount() + '</div>' +
      ccStepHTML(st[gi], gi, true).replace('<div class="cc-stepbody">', '<div class="cc-stepbody"><div class="cc-sayhead"><span>Say this &bull; suggested</span><button class="cc-copyall" data-g="copyall">Copy all</button></div>') +
      (nx ? '<button class="cc-nextcard" data-g="next"><small>Next move</small><b>' + esc(ccShortTitle(nx.title)) + '</b><span>&rarr;</span></button>'
          : '<div class="cc-nextcard end"><small>End of script</small><b>Log how the call went with the buttons below</b></div>');
  } else {
    box.innerHTML = st.map((s, i) => ccStepHTML(s, i, false)).join('');
  }

  box.querySelectorAll('.cc-stephead').forEach(hd => hd.onclick = () => {
    const i = Number(hd.dataset.i), el = hd.parentElement, key = ccScriptId + '|' + st[i].title;
    const willOpen = el.classList.contains('collapsed');
    el.classList.toggle('collapsed', !willOpen); ccSecOpen[key] = willOpen;
    if (i >= n && ccUI.mode !== 'guided') { ccUI.step = i - n; ccUpdateGuideBar(); }
  });
  box.querySelectorAll('input[data-cap]').forEach(i => i.oninput = () => {
    if (!ccLead) return;
    ccLead.answers = ccLead.answers || {};
    ccLead.answers[i.dataset.cap] = i.value;
    clearTimeout(ccRenderScript._t);
    ccRenderScript._t = setTimeout(ccSaveLeads, 400);
    ccRefreshVars();
  });
  box.classList.toggle('guided', ccUI.mode === 'guided');
  const sp = box.closest('.cc-scriptpanel'); if (sp) sp.classList.toggle('guided-mode', ccUI.mode === 'guided');
  box.onclick = e => {
    const c = e.target.closest('.cc-copy');
    if (c) {
      const tx = c.parentElement.querySelector('.cc-txt'), text = tx ? tx.textContent.trim() : '';
      if (text && navigator.clipboard) navigator.clipboard.writeText(text);
      c.textContent = 'Copied'; setTimeout(() => { c.textContent = 'Copy'; }, 1200); return;
    }
    const ge = e.target.closest('[data-g]');
    if (!ge) return;
    if (ge.dataset.g === 'next') ccGoStep(ccUI.step + 1);
    else if (ge.dataset.g === 'edit') { if (typeof ccOpenScriptForm === 'function') ccOpenScriptForm(ccScriptId); }
    else if (ge.dataset.g === 'copyall') {
      const body = ge.closest('.cc-stepbody'), text = body ? Array.from(body.querySelectorAll('.cc-say .cc-txt')).map(x => x.textContent.trim()).join('\n\n') : '';
      if (text && navigator.clipboard) navigator.clipboard.writeText(text);
      ge.textContent = 'Copied'; setTimeout(() => { ge.textContent = 'Copy all'; }, 1200);
    }
  };
  box.onscroll = () => {
    if (ccUI.mode === 'guided') return;
    clearTimeout(ccSpyT);
    ccSpyT = setTimeout(() => {
      const els = Array.from(box.querySelectorAll('.cc-step')).filter(e => Number(e.dataset.i) >= n);
      const hit = els.find(e => e.offsetTop + e.offsetHeight > box.scrollTop + 24);
      if (hit) { const s = Number(hit.dataset.i) - n; if (s !== ccUI.step) { ccUI.step = s; ccUpdateGuideBar(); clearTimeout(ccStepSaveT); ccStepSaveT = setTimeout(ccSaveUI, 800); } }
    }, 80);
  };
  box.scrollTop = top;
  ccUpdateGuideBar();
}

/* Repaint only the text, so typing into a capture box does not move the caret. */
function ccRefreshVars() {
  const box = document.getElementById('cc-scriptbox'); if (!box || !ccScript) return;
  const steps = ccScript.steps;
  box.querySelectorAll('.cc-step').forEach(el => {
    const sd = steps[Number(el.dataset.i)]; if (!sd) return;
    const body = el.querySelector('.cc-stepbody'); if (!body) return;
    const parts = sd.lines.filter(x => x.t !== 'cap');
    let p = 0;
    Array.from(body.children).forEach(child => {
      if (child.classList.contains('cc-cap')) return;
      const line = parts[p++]; if (!line || line.t === 'why') return;
      if (line.t === 'say') { const tx = child.querySelector('.cc-txt'); if (tx) tx.innerHTML = ccFill(line.text); return; }
      child.innerHTML = line.t === 'if' ? '<span>' + ccFill(line.text) + '</span>' : ccFill(line.text);
    });
  });
  ccRenderObjections();
}

function ccStageIntent(title) {
  const t = String(title || '').toLowerCase();
  if (/say no|objection|\bno\b/.test(t)) return ['Handle the no', 'Treat it as information. Answer once, then respect it.'];
  if (/open|intro|greet|gatekeep|route/.test(t)) return ['Start the conversation', 'Earn curiosity before introducing an offer.'];
  if (/follow/.test(t)) return ['Leave it in a good place', 'Confirm what happens next and when.'];
  if (/close|next step|book|ask for|card|audit|lock/.test(t)) return ['Agree one small next step', 'Ask clearly, then stop talking.'];
  if (/pivot|offer|what you do|value|pitch|show|walk/.test(t)) return ['Show how it works', 'Tie it to what they just told you, nothing more.'];
  return ['Find out what is really happening', 'Ask, then let them say it in their own words.'];
}

function ccShortTitle(t) {
  const s = String(t).replace(/^\s*\d+\s*[-.:)]\s*/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  return s.toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase());
}

function ccUpdateGuideBar() {
  const bar = document.getElementById('cc-guidebar'); if (!bar) return;
  if (!ccScript) { bar.innerHTML = ''; return; }
  const n = ccIntroN(), total = ccFlowCount(), cur = Math.min(ccUI.step, total - 1);
  let pills = '';
  for (let i = 0; i < total; i++) {
    const t = ccScript.steps[n + i];
    pills += '<button class="cc-pill ' + (i === cur ? 'on' : i < cur ? 'done' : '') + '" data-s="' + i + '" title="' + esc(t.title) + '">' + esc(ccShortTitle(t.title)) + '</button>';
  }
  bar.innerHTML = '<button class="cc-arrow" data-g="prev" title="Previous section (Alt+Left)">&lsaquo;</button><div class="cc-pills">' + pills + '</div><button class="cc-arrow" data-g="next" title="Next section (Alt+Right)">&rsaquo;</button>' +
    '<div class="cc-progbar"><i style="width:' + Math.round(((cur + 1) / total) * 100) + '%"></i></div>';
  bar.querySelector('[data-g="prev"]').onclick = () => ccGoStep(ccUI.step - 1);
  bar.querySelector('[data-g="next"]').onclick = () => ccGoStep(ccUI.step + 1);
  bar.querySelectorAll('.cc-pill').forEach(p => p.onclick = () => ccGoStep(Number(p.dataset.s)));
  const on = bar.querySelector('.cc-pill.on');
  if (on && on.scrollIntoView) { try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { /* older engines */ } }
}

function ccScrollToStep() {
  const box = document.getElementById('cc-scriptbox'); if (!box) return;
  const el = box.querySelector('.cc-step[data-i="' + (ccIntroN() + ccUI.step) + '"]');
  if (!el) return;
  if (el.classList.contains('collapsed')) el.classList.remove('collapsed');
  const y = Math.max(0, el.offsetTop - 4);
  if (box.scrollTo) box.scrollTo({ top: y, behavior: 'smooth' }); else box.scrollTop = y;
}

function ccGoStep(i) {
  ccUI.step = Math.max(0, Math.min(ccFlowCount() - 1, i)); ccSaveUI();
  if (ccUI.mode === 'guided') {
    ccRenderScript();
    const box = document.getElementById('cc-scriptbox'); if (box) box.scrollTop = 0;
  } else { ccScrollToStep(); ccUpdateGuideBar(); }
}

function ccSetMode(m) {
  if (ccUI.mode === m) return;
  ccUI.mode = m; ccSaveUI(); ccApplyX(); ccRenderScript();
  if (m === 'full') requestAnimationFrame(ccScrollToStep);
}

function ccSetTab(t) {
  ccUI.tab = t; ccSaveUI(); ccApplyX();
}

function ccApplyX() {
  const cols = document.getElementById('cc-cols'); if (!cols) return;
  ccUI.wObj = Math.max(260, Math.min(620, Number(ccUI.wObj) || 340));
  cols.style.setProperty('--wobj', ccUI.wObj + 'px');
  document.querySelectorAll('#cc-modeseg button').forEach(b => b.classList.toggle('on', b.dataset.m === ccUI.mode));
  document.querySelectorAll('.cc-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === ccUI.tab));
  const po = document.getElementById('cc-pane-obj'), pn = document.getElementById('cc-pane-notes');
  if (po) po.style.display = ccUI.tab === 'obj' ? 'flex' : 'none';
  if (pn) pn.style.display = ccUI.tab === 'notes' ? 'flex' : 'none';
}

function ccFlatObj() {
  const out = [];
  (ccObjections.groups || []).forEach(g => (g.items || []).forEach(it =>
    out.push(Object.assign({ _pinned: !!g.pinned, _g: g.name || '', _gid: g.id || '', _hint: g.hint || '' }, it))));
  return out;
}

function ccObjText(it) {
  return [it.trigger, (it.variants || []).join(' '), it._g, (it.say || []).join(' '), it.then || '', it.means || ''].join(' ').toLowerCase();
}

const CC_GROUP_COLORS = { anything: '#F97316', pest: '#16A34A', start: '#2563EB', busy: '#CA8A04', someoneelse: '#7C3AED', price: '#DB2777', dontneed: '#0891B2', trust: '#4F46E5', hardwork: '#DC2626', puttingoff: '#0D9488', gatekeeper: '#65A30D' };
function ccGroupColor(gid) {
  if (CC_GROUP_COLORS[gid]) return CC_GROUP_COLORS[gid];
  const pal = Object.values(CC_GROUP_COLORS); let h = 0; String(gid || '').split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) >>> 0; });
  return pal[h % pal.length];
}

function ccObjChip(it) {
  const fav = (ccUI.favs || []).includes(it.trigger);
  return `<button class="cc-oc ${it._pinned ? 'pin' : ''} ${ccOpenObj === it.trigger ? 'open' : ''}" style="--oc:${ccGroupColor(it._gid)}" data-t="${esc(it.trigger)}">${fav ? '<b class="cc-fav">&#9733;</b> ' : ''}${esc(it.trigger)}</button>`;
}

function ccRenderObjections() {
  const lb = document.getElementById('cc-objlist'); if (!lb) return;
  const listTop = lb.scrollTop;
  const items = ccFlatObj(), q = ccObjQuery.trim().toLowerCase();
  const byT = t => items.find(i => i.trigger === t);
  const sec = (title, arr, hint, gid) => `<div class="cc-gh" style="--oc:${gid ? ccGroupColor(gid) : 'var(--navy-600)'}" ${hint ? 'title="' + esc(hint) + '"' : ''}>${esc(title)}</div><div class="cc-chipwrap">${arr.map(ccObjChip).join('')}</div>`;
  let html = '';
  if (q) {
    const hits = items.filter(i => ccObjText(i).includes(q));
    html = hits.length ? `<div class="cc-chipwrap">${hits.map(ccObjChip).join('')}</div>` : '<div class="cc-empty">No objection matches that.</div>';
  } else if (!ccUI.pivAll) {
    const fav = (ccUI.favs || []).map(byT).filter(Boolean), seen = new Set(), quick = [];
    fav.concat(items.filter(i => !i._pinned)).forEach(i => { if (!seen.has(i.trigger) && quick.length < 10) { seen.add(i.trigger); quick.push(i); } });
    html = '<div class="cc-chipwrap cc-quick">' + quick.map(ccObjChip).join('') + '</div>' +
      '<button class="cc-seeall" data-piv="all">See all ' + items.length + ' objections</button>';
  } else {
    html += '<button class="cc-seeall top" data-piv="few">Show the quick ten</button>';
    const rec = (ccUI.recent || []).map(byT).filter(Boolean).slice(0, 5);
    const fav = (ccUI.favs || []).map(byT).filter(Boolean);
    if (rec.length) html += sec('Recent', rec);
    if (fav.length) html += sec('Favorites', fav);
    (ccObjections.groups || []).forEach(g => {
      const its = (g.items || []).map(it => Object.assign({ _pinned: !!g.pinned, _g: g.name || '', _gid: g.id || '' }, it));
      if (its.length) html += sec(g.name || 'Other', its, g.hint, g.id);
    });
  }
  lb.innerHTML = html;
  lb.scrollTop = listTop;
  lb.querySelectorAll('.cc-oc').forEach(b => b.onclick = () => ccShowObj(b.dataset.t));
  lb.querySelectorAll('[data-piv]').forEach(b => b.onclick = () => { ccUI.pivAll = b.dataset.piv === 'all'; ccSaveUI(); lb.scrollTop = 0; ccRenderObjections(); });
  ccRenderObjAnswer();
}

function ccShowObj(t) {
  ccOpenObj = t;
  ccUI.recent = [t].concat((ccUI.recent || []).filter(x => x !== t)).slice(0, 8);
  ccSaveUI();
  ccRenderObjections();
  const a = document.getElementById('cc-objans'); if (a) a.scrollTop = 0;
}

function ccRenderObjAnswer() {
  const el = document.getElementById('cc-objans'); if (!el) return;
  const it = ccFlatObj().find(i => i.trigger === ccOpenObj);
  const keep = el.scrollTop;
  if (!it) { el.innerHTML = '<div class="cc-pick"><div class="cc-pickicon">&#9757;</div>Choose an objection to reveal a suggested response and the next move. Your place in the script does not move.</div>'; return; }
  const fav = (ccUI.favs || []).includes(it.trigger), heard = ccHeard.has(it.trigger);
  el.innerHTML = `<div class="cc-ans-head"><b>${esc(it.trigger)}</b>
      <button class="cc-mini" data-a="fav" title="Pin to Favorites">${fav ? '&#9733; Favorite' : '&#9734; Favorite'}</button>
      ${it._pinned ? '' : `<button class="cc-log ${heard ? 'done' : ''}" data-a="log">${heard ? 'logged' : 'they said this'}</button>`}
      <button class="cc-mini" data-a="close" title="Close the answer">&times;</button></div>
    ${(it.say || []).map(s => '<p class="cc-ans-say">' + ccFill(s) + '</p>').join('')}
    ${it.then ? `<div class="cc-then"><b>Then:</b> ${esc(it.then)}</div>` : ''}
    ${it.means ? `<div class="cc-means">${esc(it.means)}</div>` : ''}`;
  el.scrollTop = keep;
  el.querySelector('[data-a="close"]').onclick = () => { ccOpenObj = null; ccRenderObjections(); };
  el.querySelector('[data-a="fav"]').onclick = () => {
    ccUI.favs = ccUI.favs || [];
    const i = ccUI.favs.indexOf(it.trigger);
    if (i >= 0) ccUI.favs.splice(i, 1); else ccUI.favs.push(it.trigger);
    ccSaveUI(); ccRenderObjections();
  };
  const lg = el.querySelector('[data-a="log"]');
  if (lg) lg.onclick = () => {
    if (ccHeard.has(it.trigger)) return;
    ccHeard.add(it.trigger);
    ccLogEvent({ type: 'objection', trigger: it.trigger, leadId: ccLead && ccLead.id, script: ccScriptId });
    ccRenderObjAnswer(); toast('Logged for the report', 'success');
  };
}

function ccNoteStatus(t) { const s = document.getElementById('cc-notestatus'); if (s) s.textContent = t; }

function ccRenderNotes() {
  const ta = document.getElementById('cc-notes'); if (!ta) return;
  ta.value = ccLead ? (ccLead.call_notes || '') : '';
  ta.disabled = !ccLead;
  ccNoteStatus(ccLead ? (ta.value ? 'Saved' : '') : 'Pick a lead to take notes.');
}

function ccFlushNotes() {
  if (ccNotesT) { clearTimeout(ccNotesT); ccNotesT = null; ccSaveLeads(); }
}

function ccOpenKeys() {
  const ov = document.createElement('div'); ov.className = 'cc-modal-overlay';
  const rows = [['Alt+1', 'Focus the script'], ['Alt+2', 'Objections tab'], ['Alt+3', 'Notes tab'], ['Alt+S', 'Search objections'], ['Alt+Left / Alt+Right', 'Previous / next script section'], ['Ctrl+K', 'Phone lookup']];
  ov.innerHTML = '<div class="cc-modal"><h4>Keyboard shortcuts</h4>' + rows.map(r => `<div class="cc-keyrow"><kbd>${esc(r[0])}</kbd><span>${esc(r[1])}</span></div>`).join('') +
    '<p class="cc-hint">Section keys are ignored while you are typing in a box.</p><div class="cc-modal-actions"><button class="cc-mini focus" id="cc-keys-x">Close</button></div></div>';
  document.body.appendChild(ov);
  ov.querySelector('#cc-keys-x').onclick = () => ov.remove();
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
}

function ccWireLeadsX() {
  document.querySelectorAll('#cc-modeseg button').forEach(b => b.onclick = () => ccSetMode(b.dataset.m));
  document.querySelectorAll('.cc-tabs button').forEach(b => b.onclick = () => ccSetTab(b.dataset.t));
  const s = document.getElementById('cc-objsearch');
  s.oninput = () => { ccObjQuery = s.value; ccRenderObjections(); };
  const ta = document.getElementById('cc-notes');
  ta.oninput = () => {
    if (!ccLead) return;
    ccLead.call_notes = ta.value; ccNoteStatus('Saving...');
    clearTimeout(ccNotesT);
    ccNotesT = setTimeout(() => { ccNotesT = null; ccSaveLeads(); ccNoteStatus('Saved'); }, 600);
  };
  const rz = document.getElementById('cc-resizer');
  rz.onmousedown = e => {
    e.preventDefault();
    const x0 = e.clientX, w0 = Number(ccUI.wObj) || 340;
    document.body.classList.add('cc-resizing');
    const mv = ev => { ccUI.wObj = w0 - (ev.clientX - x0); ccApplyX(); };
    const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); document.body.classList.remove('cc-resizing'); ccSaveUI(); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  };
  rz.ondblclick = () => { ccUI.wObj = 340; ccApplyX(); ccSaveUI(); };
  if (!window.__ccKeys) {
    window.__ccKeys = true;
    document.addEventListener('keydown', e => {
      const pane = document.getElementById('pane-leads');
      if (!pane || pane.style.display === 'none') return;
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const tg = e.target, typing = tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable);
      const k = e.key;
      if (k === '1') { e.preventDefault(); const b = document.getElementById('cc-scriptbox'); if (b) b.focus(); }
      else if (k === '2' || k === 's' || k === 'S') { e.preventDefault(); ccSetTab('obj'); const i = document.getElementById('cc-objsearch'); if (i) i.focus(); }
      else if (k === '3') { e.preventDefault(); ccSetTab('notes'); const t = document.getElementById('cc-notes'); if (t && !t.disabled) t.focus(); }
      else if (k === 'ArrowLeft' && !typing) { e.preventDefault(); ccGoStep(ccUI.step - 1); }
      else if (k === 'ArrowRight' && !typing) { e.preventDefault(); ccGoStep(ccUI.step + 1); }
    });
  }
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

/* The contact registry only learns about a phone number when a real contact
   attempt happens -- setting a status is the one place in the app that means
   "I actually worked this lead," so it's the only place that writes here.
   Importing a list, or just browsing one, never touches it. */
function ccUpdateRegistry(l) {
  const key = ccNormPhone(l.phone);
  if (!key) return;
  const src = ccSources.find(s => s.id === l.sourceId);
  const now = new Date().toISOString();
  const ownerName = [l.first_name, l.last_name].filter(Boolean).join(' ') || l.owner || '';
  let entry = ccContactRegistry[key];
  if (!entry) {
    entry = { business: l.business || '', owner: ownerName, firstContactedAt: now, lastContactedAt: now, status: l.status || '', sourcesContacted: [] };
    ccContactRegistry[key] = entry;
  } else {
    entry.lastContactedAt = now;
    if (l.business) entry.business = l.business;
    if (ownerName) entry.owner = ownerName;
    entry.status = l.status || '';
  }
  if (!entry.sourcesContacted.some(s => s.sourceId === l.sourceId)) {
    entry.sourcesContacted.push({ sourceId: l.sourceId, sourceName: (src && src.name) || 'Unknown list', importedAt: (src && src.at) || now });
  }
  ccSaveRegistry();
}

function ccSetStatus(label) {
  const l = ccLead; if (!l) return toast('Pick a lead first', 'error');
  const clearing = l.status === label;

  if (clearing && !confirm('Remove the "' + label + '" status from ' + (l.business || 'this lead') + '? This can\'t be undone automatically.')) return;

  if (!clearing) {
    ccLogEvent({
      type: 'call', outcome: label, leadId: l.id, business: l.business, script: ccScriptId,
      seconds: Math.round((ccTimer.elapsed + (ccTimer.on ? Date.now() - ccTimer.start : 0)) / 1000)
    });
    l.attempts = (parseInt(l.attempts, 10) || 0) + 1;
    l.last_called = new Date().toISOString().slice(0, 16).replace('T', ' ');
  }
  l.status = clearing ? '' : label;
  if (!clearing) ccUpdateRegistry(l);
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
  reviews: ['verified_google_reviews','google_reviews','google_review_count','reviews','review_count','reviews_count','total_reviews','user_ratings_total','leadswift_reviews'],
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
  specific_observation: ['specific_observation'],
  other_platform_review_count: ['other_platform_review_count','other_platform_reviews'],
  bad_review: ['exact_review_excerpt_25_words','bad_review','worst_review','negative_review_text','bad_review_quote'],
  last_review: ['review_date_relative','last_review_date_relative','last_review','last_review_date','most_recent_review','exact_days_since_last_review','days_since_review'],
  unanswered_reviews: ['unanswered_reviews','google_unanswered_count','unresponded_reviews','no_owner_response'],
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

/* Cross-list duplicate check happens once, after every sheet/file has been
   turned into candidate leads but before anything is merged into ccLeads --
   so a multi-sheet Excel import gets one prompt covering the whole file, not
   one per sheet. Skip is the default action (the focus button) because the
   whole point of the registry is not calling someone twice; Include is one
   click away for a deliberate re-approach. */
function ccShowDupePrompt(dupCount, totalCount, sourceNames) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'cc-modal-overlay';
    const shown = sourceNames.slice(0, 4).join(', ');
    const namesLine = sourceNames.length > 4 ? shown + ', and ' + (sourceNames.length - 4) + ' more' : shown;
    overlay.innerHTML = `
      <div class="cc-modal">
        <h4>${dupCount} of ${totalCount} number${totalCount === 1 ? '' : 's'} already contacted before</h4>
        <p class="cc-modal-sub">These show up in your call history already, from: ${esc(namesLine)}. Skipping keeps this import from putting the same person back in front of you under a different list. You can still bring them in if you'd rather re-approach them.</p>
        <div class="cc-modal-actions">
          <button class="cc-mini" id="cc-dupe-cancel">Cancel import</button>
          <button class="cc-mini" id="cc-dupe-include">Include all ${totalCount}</button>
          <button class="cc-mini focus" id="cc-dupe-skip">Skip the ${dupCount} already contacted</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = v => { overlay.remove(); resolve(v); };
    overlay.querySelector('#cc-dupe-cancel').onclick = () => close(null);
    overlay.querySelector('#cc-dupe-include').onclick = () => close('include');
    overlay.querySelector('#cc-dupe-skip').onclick = () => close('skip');
    overlay.onclick = ev => { if (ev.target === overlay) close(null); };
  });
}

async function ccImportCSV(e) {
  const f = e.target.files[0]; if (!f) return;
  const isExcel = /\.(xlsx|xls|xlsm)$/i.test(f.name);
  const pending = []; // [{ sourceId, label, added }]

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
      const label = usable.length > 1 ? f.name + ' — ' + s.name : f.name;
      pending.push({ sourceId, label, added });
    });
  } else {
    const rows = ccParseCSV(await f.text());
    if (rows.length < 2) return toast('That CSV looks empty', 'error');
    const sourceId = 'src-' + Date.now();
    const added = ccRowsToLeads(rows, sourceId);
    if (added.length) pending.push({ sourceId, label: f.name, added });
  }

  if (!pending.length) return toast('No usable rows found in that file', 'error');

  // --- cross-list dedupe check against everyone she's already contacted ---
  const allAdded = pending.flatMap(p => p.added);
  const dupHits = allAdded
    .map(l => ({ lead: l, entry: ccContactRegistry[ccNormPhone(l.phone)] }))
    .filter(x => x.entry);
  const skipIds = new Set();
  if (dupHits.length) {
    const sourceNames = [...new Set(dupHits.flatMap(d => d.entry.sourcesContacted.map(s => s.sourceName)))];
    const choice = await ccShowDupePrompt(dupHits.length, allAdded.length, sourceNames);
    if (choice === null) { e.target.value = ''; return; }
    if (choice === 'skip') dupHits.forEach(d => skipIds.add(d.lead.id));
  }

  const newEntries = [];
  let addedTotal = 0;
  pending.forEach(p => {
    const keep = p.added.filter(l => !skipIds.has(l.id));
    if (!keep.length) return;
    ccLeads = ccLeads.concat(keep);
    ccSources.push({ id: p.sourceId, name: p.label, count: keep.length, at: new Date().toISOString() });
    newEntries.push(...keep);
    addedTotal += keep.length;
  });

  if (!addedTotal) {
    e.target.value = '';
    return toast(skipIds.size ? 'Every number in that list was already contacted before -- nothing new to add' : 'No usable rows found in that file', 'error');
  }

  await ccSaveLeads();
  await ccSaveSources();
  ccRenderRail();
  ccRenderSources();
  if (!ccLead) ccSelect(newEntries[0]);
  const skippedNote = skipIds.size ? (', ' + skipIds.size + ' already-contacted number' + (skipIds.size === 1 ? '' : 's') + ' skipped') : '';
  toast(addedTotal + ' leads added from ' + f.name + skippedNote, 'success');
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
  const visible  = ccSources.filter(s => !s.archived);
  const archived = ccSources.filter(s => s.archived);
  if (!visible.length && !archived.length) { el.innerHTML = ''; return; }

  const srcRow = (s, isArchived) => {
    const leads = ccSourceLeads(s.id);
    const worked = leads.filter(l => l.status).length;
    const total = leads.length;
    const complete = !isArchived && total > 0 && worked === total;
    return `
    <div class="cc-src ${isArchived ? 'archived' : ''}" title="${esc(s.name)}">
      <span class="cc-src-name">${esc(s.name)}</span>
      <b>${s.count}</b>
      ${isArchived
        ? `<button class="cc-src-restore" data-src="${esc(s.id)}" title="Bring this list back into your active view">Restore</button>`
        : complete
          ? `<button class="cc-src-close" data-src="${esc(s.id)}" title="Every lead in this list has an outcome logged">${worked}/${total} \u2014 close out?</button>`
          : `<span class="cc-src-worked">${worked}/${total} worked</span>`}
      <button class="cc-src-x" data-src="${esc(s.id)}" title="Remove this file">&times;</button>
    </div>`;
  };

  el.innerHTML =
    visible.map(s => srcRow(s, false)).join('') +
    (archived.length
      ? `<button class="cc-src-arch-toggle" id="cc-src-arch-toggle" type="button">Closed-out lists (${archived.length}) \u25B8</button>
         <div class="cc-src-archived" id="cc-src-archived">${archived.map(s => srcRow(s, true)).join('')}</div>`
      : '');

  el.querySelectorAll('.cc-src-x').forEach(b => b.onclick = ev => { ev.stopPropagation(); ccRemoveSource(b.dataset.src); });
  el.querySelectorAll('.cc-src-close').forEach(b => b.onclick = ev => { ev.stopPropagation(); ccCloseOutSource(b.dataset.src); });
  el.querySelectorAll('.cc-src-restore').forEach(b => b.onclick = ev => { ev.stopPropagation(); ccRestoreSource(b.dataset.src); });
  const toggle = document.getElementById('cc-src-arch-toggle');
  const box = document.getElementById('cc-src-archived');
  if (toggle && box) toggle.onclick = () => box.classList.toggle('open');
}

/* Closing out a list never touches the leads or their call history -- it
   only flips a flag so the list stops showing up in the working views. */
function ccCloseOutSource(id) {
  const src = ccSources.find(s => s.id === id); if (!src) return;
  const leads = ccSourceLeads(id);
  const worked = leads.filter(l => l.status).length;
  if (!confirm('Close out "' + src.name + '"?\n\nAll ' + worked + ' of ' + leads.length + ' leads have an outcome logged. Closing out just moves the list out of your active view -- the leads and everything you logged on them stay exactly as they are, searchable any time, and you can restore the list whenever you want.')) return;
  src.archived = true;
  src.archivedAt = new Date().toISOString();
  ccSaveSources();
  ccRenderSources();
  ccRenderRail();
  toast('Closed out "' + src.name + '"', 'success');
}

function ccRestoreSource(id) {
  const src = ccSources.find(s => s.id === id); if (!src) return;
  delete src.archived; delete src.archivedAt;
  ccSaveSources();
  ccRenderSources();
  ccRenderRail();
  toast('Restored to your active lists', 'success');
}

/* ------------------------------------------------------------ dashboard */

function ccRenderQuickStats() {
  const el = document.getElementById('cc-quickstats'); if (!el) return;
  if (!ccLeads.length) { el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = '';
  const s = ccContactStats(ccLeads);
  el.innerHTML = `<b>${s.answered}</b> reached <span>\u00b7</span> <b>${s.noAnswer}</b> no answer <span>\u00b7</span> <b>${s.attempted}</b>/${s.total} worked`;
}

/* A simple manual mirror into Notion (or anywhere else): she can drop this
   CSV into a Notion database import herself, no API keys or OAuth living in
   the shipped app. Reuses the same csvEscape/Blob download pattern the
   invoicing CSV export already uses (index.html). */
function ccExportRegistryCSV() {
  const keys = Object.keys(ccContactRegistry);
  if (!keys.length) return toast('No contact history yet to export', 'error');
  const rows = [['Phone', 'Business', 'Owner', 'Status', 'First contacted', 'Last contacted', 'Lists contacted from']];
  keys.forEach(k => {
    const en = ccContactRegistry[k];
    rows.push([
      ccFormatPhone(k), en.business || '', en.owner || '', en.status || '',
      en.firstContactedAt || '', en.lastContactedAt || '',
      (en.sourcesContacted || []).map(s => s.sourceName).join(' | ')
    ]);
  });
  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `LYCORE-contact-history-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Contact history exported', 'success');
}

function ccOpenStats() {
  const overall = ccContactStats(ccLeads);
  const bySource = ccSources.map(s => Object.assign({ name: s.name, archived: !!s.archived }, ccContactStats(ccSourceLeads(s.id))));

  const statCard = (n, l) => `<div class="cc-stat"><div class="n">${n}</div><div class="l">${l}</div></div>`;
  const statusRows = CC_STATUSES.filter(s => overall.byStatus[s.label]).map(s =>
    `<div class="cc-row"><span>${esc(s.label)}</span><b>${overall.byStatus[s.label]}</b></div>`).join('');

  const sourceRows = bySource.length ? bySource.map(s => `
    <div class="cc-modal-row" style="cursor:default">
      <span>${esc(s.name)}${s.archived ? ' <i>(closed out)</i>' : ''}</span>
      <b>${s.answered} reached / ${s.attempted} of ${s.total} worked</b>
    </div>`).join('') : '<div class="cc-empty">No lists imported yet.</div>';

  const overlay = document.createElement('div');
  overlay.className = 'cc-modal-overlay';
  overlay.innerHTML = `
    <div class="cc-modal cc-modal-wide">
      <h4>Who you've actually reached out to</h4>
      <p class="cc-modal-sub">Counts every lead with an outcome logged. "Reached" means you had them on the line \u2014 Sold, On Hold, Audit sent, Didn't Buy, or Not interested. "No answer" means you dialled but didn't get a conversation \u2014 Didn't Answer, Voicemail, or Bad number. "Do not call" is kept separate since it isn't always a real dial.</p>
      <div class="cc-stats" style="margin-bottom:16px">
        ${statCard(overall.total, 'Leads loaded')}
        ${statCard(overall.attempted, 'Worked (any status)')}
        ${statCard(overall.answered, 'Reached / talked to')}
        ${statCard(overall.noAnswer, 'Dialled, no answer')}
        ${statCard(overall.excluded, 'Do not call')}
        ${statCard(overall.unworked, 'Not worked yet')}
      </div>
      <div class="sec">By outcome</div>
      <div class="cc-modal-list" style="margin-bottom:16px">${statusRows || '<div class="cc-empty">No calls logged yet.</div>'}</div>
      <div class="sec">By list</div>
      <div class="cc-modal-list">${sourceRows}</div>
      <div class="cc-modal-actions">
        <button class="cc-mini" id="cc-stats-export" title="Download a CSV you can import into Notion or anywhere else">Export contact history (CSV)</button>
        <button class="cc-mini focus" id="cc-stats-close">Close</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = ev => { if (ev.target === overlay) overlay.remove(); };
  overlay.querySelector('#cc-stats-close').onclick = () => overlay.remove();
  overlay.querySelector('#cc-stats-export').onclick = () => ccExportRegistryCSV();
}

/* -------------------------------------------------------- quick lookup */

function ccPhoneDigits(raw) { return String(raw || '').replace(/\D/g, ''); }

function ccOpenLookup() {
  if (document.getElementById('cc-lookup-overlay')) {
    document.getElementById('cc-lookup-input').focus();
    return;
  }
  const overlay = document.createElement('div');
  overlay.id = 'cc-lookup-overlay';
  overlay.className = 'cc-modal-overlay';
  overlay.innerHTML = `
    <div class="cc-modal cc-lookup-modal">
      <h4>Who's calling?</h4>
      <p class="cc-modal-sub">Type the last few digits of the number on your phone. This searches every lead you've ever imported, across every list, not just the one that's open.</p>
      <input id="cc-lookup-input" class="cc-input" placeholder="e.g. 4521" autocomplete="off" inputmode="numeric">
      <div class="cc-lookup-results" id="cc-lookup-results"></div>
      <div class="cc-modal-actions"><button class="cc-mini" id="cc-lookup-close">Close (Esc)</button></div>
    </div>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#cc-lookup-input');
  const results = overlay.querySelector('#cc-lookup-results');

  const render = () => {
    const q = ccPhoneDigits(input.value);
    if (!q) { results.innerHTML = '<div class="cc-empty">Start typing digits from the incoming number.</div>'; return; }
    const matches = ccLeads.filter(l => ccPhoneDigits(l.phone).includes(q)).slice(0, 8);
    results.innerHTML = matches.length ? matches.map(l => `
      <div class="cc-lookup-row" data-id="${esc(l.id)}">
        <div class="cc-lookup-biz">${esc(l.business || 'Unnamed')}</div>
        <div class="cc-lookup-sub">${esc([l.first_name, l.last_name].filter(Boolean).join(' ') || 'owner unknown')}${l.city ? ' \u00b7 ' + esc(l.city) : ''}</div>
        <div class="cc-lookup-phone">${esc(ccFormatPhone(l.phone))}</div>
        ${l.status ? `<div class="cc-lookup-status">${esc(l.status)}</div>` : ''}
      </div>`).join('') : '<div class="cc-empty">No lead matches those digits.</div>';
    results.querySelectorAll('.cc-lookup-row').forEach(row => row.onclick = () => {
      const lead = ccLeads.find(l => l.id === row.dataset.id);
      ccCloseLookup();
      if (lead) { showTab('leads'); ccSelect(lead); }
    });
  };
  input.oninput = render;
  render();
  setTimeout(() => input.focus(), 0);

  overlay.onclick = ev => { if (ev.target === overlay) ccCloseLookup(); };
  overlay.querySelector('#cc-lookup-close').onclick = ccCloseLookup;
}

function ccCloseLookup() {
  const overlay = document.getElementById('cc-lookup-overlay');
  if (overlay) overlay.remove();
}

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    ccOpenLookup();
    return;
  }
  if (e.key === 'Escape' && document.getElementById('cc-lookup-overlay')) ccCloseLookup();
});

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
