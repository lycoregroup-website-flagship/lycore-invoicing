/* LYCORE Sales Lab -- Phase 3: live voice practice over the Gemini Live API (raw WebSocket).
   The renderer never sees the real API key: main mints a one-use, short-lived token (ai:liveToken).
   Audio is streamed to Google while the call runs and is NOT stored. Only the transcript text is kept. */
const LabVoice = (function () {
  'use strict';
  const WS_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=';
  const MAX_MS = 8 * 60 * 1000;          // one connection lasts about 10 minutes, so calls are capped below that
  const WARN_MS = 7 * 60 * 1000;

  const WORKLET = "class P extends AudioWorkletProcessor{constructor(){super();this.b=[];this.n=0}process(i){const c=i[0]&&i[0][0];if(c){this.b.push(new Float32Array(c));this.n+=c.length;if(this.n>=1600){const o=new Int16Array(this.n);let k=0;for(const f of this.b){for(let j=0;j<f.length;j++){const s=Math.max(-1,Math.min(1,f[j]));o[k++]=s<0?s*32768:s*32767}}this.port.postMessage(o.buffer,[o.buffer]);this.b=[];this.n=0}}return true}}registerProcessor('lab-pcm',P)";

  function b64FromBuffer(buf) {
    const u = new Uint8Array(buf); let s = '';
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function rateFromMime(m) { const r = /rate=(\d+)/.exec(m || ''); return r ? Number(r[1]) : 24000; }

  /* Turns a stream of transcript fragments into whole turns, switching speaker when the other side starts talking. */
  function makeTurnBuffer(onTurn) {
    let role = null, text = '';
    function commit() { const t = text.replace(/\s+/g, ' ').trim(); if (role && t) onTurn(role, t); role = null; text = ''; }
    return {
      add(r, frag) { if (role && role !== r) commit(); role = r; text += frag; },
      commit,
      peek() { return role && text.trim() ? { role, text: text.trim() } : null }
    };
  }

  function create(cb) {
    const st = { ws: null, ctxIn: null, ctxOut: null, stream: null, node: null, sources: [], next: 0, timer: null, warn: null, ready: false, closed: false, started: 0 };
    const turns = makeTurnBuffer((role, text) => cb.onTurn(role, text));

    function playChunk(b64, rate) {
      if (!st.ctxOut) return;
      const bin = atob(b64), n = bin.length >> 1, f = new Float32Array(n);
      for (let i = 0; i < n; i++) { let v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8); if (v & 0x8000) v -= 0x10000; f[i] = v / 32768; }
      const buf = st.ctxOut.createBuffer(1, n, rate); buf.copyToChannel(f, 0);
      const src = st.ctxOut.createBufferSource(); src.buffer = buf; src.connect(st.ctxOut.destination);
      st.next = Math.max(st.ctxOut.currentTime, st.next); src.start(st.next); st.next += buf.duration;
      st.sources.push(src); src.onended = () => { st.sources = st.sources.filter((x) => x !== src); if (!st.sources.length) cb.onState('listening'); };
      cb.onState('speaking');
    }
    function flush() { st.sources.forEach((s) => { try { s.stop(); } catch (e) { /* already ended */ } }); st.sources = []; st.next = 0; }

    /* One server message. Kept separate so it can be tested without a socket. */
    function handle(m) {
      if (m.setupComplete) { st.ready = true; cb.onState('listening'); cb.onReady && cb.onReady(); return; }
      if (m.goAway) { cb.onNotice('The connection will close soon. Wrap up the call.'); }
      const sc = m.serverContent; if (!sc) return;
      if (sc.interrupted) { flush(); }
      if (sc.inputTranscription && sc.inputTranscription.text) { turns.add('rep', sc.inputTranscription.text); cb.onLive(turns.peek()); }
      if (sc.modelTurn && sc.modelTurn.parts) sc.modelTurn.parts.forEach((p) => { if (p.inlineData && p.inlineData.data) playChunk(p.inlineData.data, rateFromMime(p.inlineData.mimeType)); });
      if (sc.outputTranscription && sc.outputTranscription.text) { turns.add('prospect', sc.outputTranscription.text); cb.onLive(turns.peek()); }
      if (sc.turnComplete) { turns.commit(); cb.onLive(null); }
    }

    async function startMic() {
      st.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      st.ctxIn = new AudioContext({ sampleRate: 16000 });
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
      await st.ctxIn.audioWorklet.addModule(url); URL.revokeObjectURL(url);
      const src = st.ctxIn.createMediaStreamSource(st.stream);
      st.node = new AudioWorkletNode(st.ctxIn, 'lab-pcm');
      st.node.port.onmessage = (e) => {
        if (st.ws && st.ws.readyState === 1 && st.ready) st.ws.send(JSON.stringify({ realtimeInput: { audio: { data: b64FromBuffer(e.data), mimeType: 'audio/pcm;rate=16000' } } }));
      };
      src.connect(st.node);
    }

    function cleanup() {
      clearTimeout(st.timer); clearTimeout(st.warn);
      flush();
      try { st.node && st.node.disconnect(); } catch (e) { /* ignore */ }
      try { st.stream && st.stream.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignore */ }
      try { st.ctxIn && st.ctxIn.close(); } catch (e) { /* ignore */ }
      try { st.ctxOut && st.ctxOut.close(); } catch (e) { /* ignore */ }
      st.node = st.stream = st.ctxIn = st.ctxOut = null;
    }

    async function start(token, model, system) {
      st.ctxOut = new AudioContext();
      await new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_BASE + encodeURIComponent(token)); st.ws = ws;
        ws.onopen = () => {
          ws.send(JSON.stringify({ setup: { model: 'models/' + model, responseModalities: ['AUDIO'], systemInstruction: { parts: [{ text: system }] }, inputAudioTranscription: {}, outputAudioTranscription: {} } }));
          resolve();
        };
        ws.onmessage = async (ev) => {
          try { const txt = typeof ev.data === 'string' ? ev.data : await ev.data.text(); handle(JSON.parse(txt)); } catch (e) { /* ignore a malformed frame */ }
        };
        ws.onerror = () => { if (!st.closed) { cb.onError('Could not open the voice connection.'); reject(new Error('ws')); } };
        ws.onclose = (ev) => { if (!st.closed) { st.closed = true; turns.commit(); cleanup(); cb.onClosed(ev && ev.reason ? ev.reason : ''); } };
      });
      await startMic();
      st.started = Date.now();
      st.warn = setTimeout(() => cb.onNotice('One minute left on this call.'), WARN_MS);
      st.timer = setTimeout(() => { cb.onNotice('Time limit reached.'); stop(); }, MAX_MS);
    }

    function stop() {
      if (st.closed) { return; }
      st.closed = true; turns.commit();
      try { st.ws && st.ws.close(); } catch (e) { /* ignore */ }
      cleanup(); cb.onClosed('');
    }

    return { start, stop, handle, _turns: turns, _state: st, _setOut(ctx) { st.ctxOut = ctx; } };
  }

  return { create, makeTurnBuffer, rateFromMime, MAX_MS };
})();
