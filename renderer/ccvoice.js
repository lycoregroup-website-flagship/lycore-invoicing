/* LYCORE Leads: Gemini voice for practising and editing scripts.
   Reuses the Sales Lab voice engine (LabVoice) and the saved AI key. Audio is streamed to Google
   while the session runs and is not stored. Only the transcript text stays on screen.
   Script edits are NEVER applied on their own: you review the changes, then apply or save a copy. */
(function () {
  'use strict';
  let V = null; // active session state

  async function labSettings() {
    const s = Object.assign({ provider: 'gemini', models: {} }, (await sget('lab-settings')) || {});
    s.models = Object.assign({ gemini: 'gemini-3.8-flash', live: 'gemini-3.8-live' }, s.models || {});
    return s;
  }

  function scriptBody() {
    const s = ccScripts.find(x => x.id === ccScriptId);
    return s ? s.body : '';
  }

  function realFacts() {
    const v = ccVars(), out = [];
    const add = (label, val) => { if (val !== undefined && val !== null && String(val).trim() !== '') out.push(label + ': ' + val); };
    add('Business', v.company_name || v.business); add('City', v.city);
    add('Google rating', v.google_rating); add('Google reviews', v.google_review_count);
    add('Competitor', v.competitor); add('Competitor reviews', v.competitor_reviews);
    return out.join('; ');
  }

  function buyerPrompt() {
    const sc = V && V.scn && (V.personas || []).find(p => p.id === V.scn);
    if (sc && typeof Lab !== 'undefined' && Lab._t && Lab._t.buildPersonaPrompt) {
      try { return Lab._t.buildPersonaPrompt(sc, { voice: true }); } catch (e) { /* fall back to the generic owner */ }
    }
    const objs = ccFlatObj().filter(o => !o._pinned).map(o => '- ' + o.trigger).slice(0, 14).join('\n');
    return [
      'You are role-playing the owner of a small US pest control company who has just picked up a cold phone call from a salesperson. The salesperson is practising. Stay in character the whole time.',
      'Speak the way a busy tradesperson talks: short, plain, one or two sentences. Never say you are an AI or a role-play.',
      'Start by saying only "Yeah?" or similar when you hear the first words. Be a little guarded. Do not make it easy, and do not be rude for no reason.',
      'Pick one or two of these as your real objections and raise them naturally, one at a time:\n' + objs,
      'If the salesperson is clear, honest, shows they looked at your actual business, and asks for a small next step, soften a little. If they are pushy, vague or read from a script, get shorter and end the call.',
      'The salesperson is calling about: ' + (realFacts() || 'your Google page and reviews') + '. Only treat facts they actually say as true. Do not invent numbers about your own business.'
    ].join('\n\n');
  }

  function editorPrompt() {
    return [
      'You are a spoken script editing assistant for a cold-call salesperson. Be brief, one or two sentences per turn.',
      'The person will tell you out loud how they want the call script changed. Repeat back in one sentence exactly what you will change, then ask if there is anything else.',
      'Never invent facts, numbers, guarantees or results. Never remove {{double brace variables}} unless asked. Do not change anything they did not ask about.',
      'Do not read the script back unless asked. When they say they are done, tell them to press "Draft the changes".',
      'Here is the script as it stands:\n\n' + scriptBody().slice(0, 14000)
    ].join('\n\n');
  }

  const esc2 = s => esc(String(s == null ? '' : s));

  function closeModal() {
    if (V && V.ctl) { try { V.ctl.stop(); } catch (e) { /* ignore */ } }
    const o = document.getElementById('cc-voice-ov'); if (o) o.remove();
    V = null;
  }

  function paint() {
    const o = document.getElementById('cc-voice-ov'); if (!o || !V) return;
    const edit = V.mode === 'edit';
    const bubbles = V.turns.map(t => '<div class="cc-vb ' + (t.role === 'rep' ? 'me' : 'them') + '"><i>' + (t.role === 'rep' ? 'You' : (edit ? 'Editor' : 'Owner')) + '</i>' + esc2(t.text) + '</div>').join('') +
      (V.live ? '<div class="cc-vb ' + (V.live.role === 'rep' ? 'me' : 'them') + ' live"><i>' + (V.live.role === 'rep' ? 'You' : (edit ? 'Editor' : 'Owner')) + '</i>' + esc2(V.live.text) + '</div>' : '');
    const running = V.state && V.state !== 'ended' && V.state !== '';
    let panel = '';
    if (V.draft) {
      panel = '<h4>Proposed changes</h4>' + (V.draft.warn ? '<div class="cc-vwarn">' + V.draft.warn + '</div>' : '') +
        '<div class="cc-vdiff">' + V.draft.diffHtml + '</div>' +
        '<div class="cc-modal-actions"><button class="cc-mini" data-v="discard">Discard</button> <button class="cc-mini" data-v="copy">Save as a copy</button> <button class="cc-mini focus" data-v="apply">Apply to this script</button></div>';
    } else if (V.fb) {
      panel = '<h4>Coaching</h4><div class="cc-vfb">' + esc2(V.fb) + '</div>';
    }
    o.querySelector('.cc-vbody').innerHTML =
      '<div class="cc-vtop"><div class="cc-seg"><button data-v="m-practice" class="' + (!edit ? 'on' : '') + '">Practice</button><button data-v="m-edit" class="' + (edit ? 'on' : '') + '">Edit by voice</button></div>' +
      '<span class="cc-hint">' + esc2(ccScriptName(ccScriptId)) + '</span>' +
      ((ccScripts.find(x => x.id === ccScriptId) || {}).prevBody ? '<button class="cc-mini" data-v="undo" title="Swap back to the version before the last voice edit">Undo last edit</button>' : '') + '</div>' +
      (!edit ? '<div class="cc-scn"><label>Prospect scenario</label><select id="cc-vscn"' + (running ? ' disabled' : '') + '><option value="">Typical pest control owner</option>' +
        (V.personas || []).map(p => '<option value="' + esc2(p.id) + '"' + (V.scn === p.id ? ' selected' : '') + '>' + esc2(p.name) + (p.mood ? ' · ' + esc2(p.mood) : '') + '</option>').join('') + '</select>' +
        (V.scn ? '<div class="cc-hint">' + esc2(((V.personas || []).find(p => p.id === V.scn) || {}).role || '') + '</div>' : '') + '</div>' : '') +
      '<p class="cc-hint">' + (edit ? 'Talk through the changes you want. Nothing is changed until you review and apply it.' : 'Gemini plays a pest control owner who just picked up. Start talking when you are connected. Use headphones so it does not hear itself.') + '</p>' +
      (V.err ? '<div class="cc-vwarn">' + esc2(V.err) + '</div>' : '') + (V.notice ? '<div class="cc-hint">' + esc2(V.notice) + '</div>' : '') +
      '<div class="cc-vtx" id="cc-vtx">' + (bubbles || '<div class="cc-empty">Nothing said yet.</div>') + '</div>' +
      '<div class="cc-modal-actions">' +
      (running ? '<button class="cc-mini" data-v="stop">End</button>' : '<button class="cc-mini focus" data-v="start">' + (V.turns.length ? 'Start again' : 'Start') + '</button>') +
      (V.state === 'connecting' ? ' <span class="cc-hint">Connecting...</span>' : running ? ' <span class="cc-hint">Listening</span>' : '') +
      (!running && V.turns.length ? (edit ? ' <button class="cc-mini focus" data-v="draft"' + (V.busy ? ' disabled' : '') + '>' + (V.busy ? 'Working...' : 'Draft the changes') + '</button>' : ' <button class="cc-mini focus" data-v="fb"' + (V.busy ? ' disabled' : '') + '>' + (V.busy ? 'Working...' : 'Get coaching') + '</button>') : '') +
      '</div>' + panel;
    const tx = document.getElementById('cc-vtx'); if (tx) tx.scrollTop = tx.scrollHeight;
  }

  function sections(raw) {
    const out = {}; let cur = '(header)'; out[cur] = [];
    String(raw).replace(/\r\n/g, '\n').split('\n').forEach(l => { if (l.startsWith('## ')) { cur = l.slice(3).trim(); out[cur] = []; } else out[cur].push(l); });
    Object.keys(out).forEach(k => out[k] = out[k].join('\n').trim());
    return out;
  }

  function buildDiff(oldRaw, newRaw) {
    const a = sections(oldRaw), b = sections(newRaw), keys = Array.from(new Set(Object.keys(a).concat(Object.keys(b)))), parts = [];
    keys.forEach(k => {
      if (a[k] === b[k]) return;
      const state = a[k] === undefined ? 'added' : b[k] === undefined ? 'removed' : 'changed';
      parts.push('<div class="cc-vsec"><b>' + esc2(k) + '</b> <span class="cc-hint">' + state + '</span>' +
        (a[k] !== undefined ? '<pre class="old">' + esc2(a[k]) + '</pre>' : '') + (b[k] !== undefined ? '<pre class="new">' + esc2(b[k]) + '</pre>' : '') + '</div>');
    });
    return parts.join('') || '<div class="cc-empty">No differences.</div>';
  }

  function vars(raw) { return new Set((String(raw).match(/\{\{\s*\w+(?:\|[^}]*)?\s*\}\}/g) || []).map(x => x.replace(/\|[^}]*/, '').replace(/\s/g, ''))); }

  async function draft() {
    V.busy = true; V.err = ''; V.draft = null; paint();
    const asks = V.turns.filter(t => t.role === 'rep').map(t => t.text).join('\n');
    if (!asks.trim()) { V.busy = false; V.err = 'I did not catch any instructions. Try again.'; return paint(); }
    const s = await labSettings();
    const system = [
      'You edit a cold-call script. Apply ONLY the changes the user asked for. Return the COMPLETE script and nothing else, no commentary, no code fences.',
      'Keep the exact file format: the frontmatter block between --- lines, "## " section headings, and the line prefixes "> " (say), "~ " (do), "? " (if they say), "! " (stop), "= " (why), "+ key | label" (capture), "badge:" lines.',
      'Keep every {{variable}} exactly as written. Do not add facts, numbers, guarantees, or claims. Do not touch lines the user did not mention.'
    ].join('\n');
    const r = await window.ai.chat({ provider: s.provider, model: (s.models[s.provider] || '').trim(), system, messages: [{ role: 'user', content: 'CURRENT SCRIPT:\n' + scriptBody() + '\n\nWHAT THE USER ASKED FOR (spoken, transcribed):\n' + asks }] });
    V.busy = false;
    if (!r || !r.ok) { V.err = (r && r.error) || 'The model did not answer.'; return paint(); }
    let txt = String(r.text).trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');
    const parsed = ccParse(txt.replace(/\r\n/g, '\n'));
    if (!parsed.steps.length) { V.err = 'The reply did not look like a script, so I threw it away. Nothing was changed.'; return paint(); }
    const oldV = vars(scriptBody()), newV = vars(txt), lost = Array.from(oldV).filter(x => !newV.has(x));
    V.draft = { raw: txt, diffHtml: buildDiff(scriptBody(), txt), warn: lost.length ? 'These variables are no longer in the script: ' + esc2(lost.join(', ')) + '. Check this is what you meant.' : '' };
    paint();
  }

  function applyDraft(asCopy) {
    const cur = ccScripts.find(x => x.id === ccScriptId); if (!cur || !V.draft) return;
    if (asCopy) {
      const id = 'copy-' + Date.now().toString(36);
      const nm = /^name:.*$/m.test(V.draft.raw) ? V.draft.raw.replace(/^name:\s*(.*)$/m, (m, n) => 'name: ' + n + ' (voice edit)') : V.draft.raw;
      ccScripts.push({ id, body: nm }); ccSaveScripts();
      ccScriptId = id; ccSettings.lastScript = id; ccSaveSettings(); ccLoadScript(id);
    } else {
      cur.prevBody = cur.body; cur.body = V.draft.raw; ccSaveScripts(); ccLoadScript(ccScriptId);
    }
    ccUI.step = 0; ccRenderScript(); ccRenderObjections();
    toast(asCopy ? 'Saved as a new script' : 'Script updated. The previous version is kept for undo.', 'success');
    closeModal();
  }

  async function feedback() {
    V.busy = true; V.err = ''; paint();
    const s = await labSettings();
    const tr = V.turns.map(t => (t.role === 'rep' ? 'REP: ' : 'OWNER: ') + t.text).join('\n');
    const r = await window.ai.chat({ provider: s.provider, model: (s.models[s.provider] || '').trim(), system: 'You are a blunt, kind sales coach reviewing a practice cold call. Use only what is in the transcript. Reply in plain text, no markdown: 1) what worked, quoting a short phrase, 2) where the rep lost the owner, quoting it, 3) one exact line to try next time. Under 140 words.', messages: [{ role: 'user', content: 'SCRIPT BEING PRACTISED:\n' + scriptBody().slice(0, 8000) + '\n\nTRANSCRIPT:\n' + tr }] });
    V.busy = false;
    if (r && r.ok) V.fb = r.text; else V.err = (r && r.error) || 'The model did not answer.';
    paint();
  }

  async function start() {
    if (!window.ai || !window.ai.liveToken || typeof LabVoice === 'undefined') { V.err = 'Voice needs the desktop app.'; return paint(); }
    V.turns = []; V.live = null; V.err = ''; V.notice = ''; V.draft = null; V.fb = ''; V.state = 'connecting'; paint();
    const tk = await window.ai.liveToken();
    if (!tk.ok) { V.err = tk.error || 'Could not get a voice session. Check your Gemini key in Sales Lab > AI Settings.'; V.state = ''; return paint(); }
    const s = await labSettings(), me = V;
    const live = () => V === me;
    const ctl = LabVoice.create({
      onTurn: (role, text) => { if (live()) { me.turns.push({ role, text }); paint(); } },
      onLive: l => { if (live()) { me.live = l; paint(); } },
      onState: st => { if (live()) { me.state = st; paint(); } },
      onNotice: m => { if (live()) { me.notice = m; paint(); } },
      onError: m => { if (live()) { me.err = m; paint(); } },
      onClosed: why => { if (live()) { me.ctl = null; me.state = 'ended'; me.live = null; if (why) me.notice = 'Closed: ' + why; paint(); } }
    });
    V.ctl = ctl;
    try { await ctl.start(tk.token, (s.models.live || '').trim(), V.mode === 'edit' ? editorPrompt() : buyerPrompt()); }
    catch (e) {
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'NotFoundError');
      try { ctl.stop(); } catch (x) { /* ignore */ }
      if (live()) { V.ctl = null; V.state = ''; V.err = denied ? 'The microphone is blocked or missing. Allow it in Windows privacy settings.' : 'Could not start the voice session.'; paint(); }
    }
  }

  function open(mode) {
    if (V) closeModal();
    if (!ccScript) return toast('Pick a script first', 'error');
    V = { mode: mode || 'practice', turns: [], live: null, state: '', err: '', notice: '', busy: false, draft: null, fb: '', ctl: null, scn: '', personas: [] };
    const me0 = V;
    sget('lab-personas').then(p => { if (V === me0 && Array.isArray(p)) { me0.personas = p; paint(); } });
    const ov = document.createElement('div'); ov.id = 'cc-voice-ov'; ov.className = 'cc-modal-overlay';
    ov.innerHTML = '<div class="cc-modal cc-vmodal"><div class="cc-vbody"></div><div class="cc-modal-actions"><button class="cc-mini" data-v="close">Close</button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('change', e => { if (e.target && e.target.id === 'cc-vscn' && V) { V.scn = e.target.value; paint(); } });
    ov.addEventListener('click', e => {
      const t = e.target.closest('[data-v]'); if (!t) { if (e.target === ov && !(V && V.ctl)) closeModal(); return; }
      const a = t.dataset.v;
      if (a === 'close') closeModal();
      else if (a === 'start') start();
      else if (a === 'stop') { if (V.ctl) V.ctl.stop(); }
      else if (a === 'm-practice' || a === 'm-edit') { if (V.ctl) V.ctl.stop(); V.mode = a === 'm-edit' ? 'edit' : 'practice'; V.turns = []; V.draft = null; V.fb = ''; V.err = ''; V.state = ''; paint(); }
      else if (a === 'draft') draft();
      else if (a === 'fb') feedback();
      else if (a === 'apply') applyDraft(false);
      else if (a === 'copy') applyDraft(true);
      else if (a === 'undo') { window.ccUndoScriptEdit(); paint(); }
      else if (a === 'discard') { V.draft = null; paint(); }
    });
    paint();
  }

  window.ccVoiceOpen = open;
  window.ccVoiceMount = function () {
    const head = document.querySelector('#pane-leads .cc-scriptpanel .cc-panelhead');
    if (!head || head.querySelector('.cc-voicebtn')) return;
    const b = document.createElement('button');
    b.className = 'cc-mini cc-voicebtn'; b.textContent = 'Voice'; b.title = 'Practice this script by voice, or edit it by talking (Gemini)';
    b.onclick = () => open('practice');
    const edit = head.querySelector('#cc-scriptedit-btn'); head.insertBefore(b, edit);
  };
  window.ccUndoScriptEdit = function () {
    const cur = ccScripts.find(x => x.id === ccScriptId);
    if (!cur || !cur.prevBody) return toast('Nothing to undo', 'info');
    const t = cur.body; cur.body = cur.prevBody; cur.prevBody = t; ccSaveScripts(); ccLoadScript(ccScriptId); ccRenderScript(); toast('Swapped back to the other version', 'success');
  };
})();
