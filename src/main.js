"use strict";
/* ---------- helpers ---------- */
const $ = (s) => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function toast(msg, ms = 2200) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms); }
function ask(html, okLabel = 'OK') {
  return new Promise((res) => {
    $('#mBody').innerHTML = html; $('#mOk').textContent = okLabel; $('#modal').classList.add('on');
    const done = (v) => { $('#modal').classList.remove('on'); $('#mOk').onclick = $('#mCancel').onclick = null; res(v); };
    $('#mOk').onclick = () => done(true); $('#mCancel').onclick = () => done(false);
  });
}
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const natCmp = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare;
const safeSeg = (s) => { let x = s.replace(/[^A-Za-z0-9_\-.~:@+]/g, '_').slice(0, 150); if (x === '.' || x === '..' || !x) x = '_' + x; return x; };
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const dayOf = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/* ---------- defaults ---------- */
const OLD_STARTER = ['market', 'governance', 'capability', 'dominant', 'notes'];
const yesno = (name, label, help) => ({ name, label, type: 'binary', help });
// New users start with an empty codebook; these questions are what "Load example questions" puts in
const EXAMPLE_CODEBOOK = { vars: [
  yesno('ai_central', 'Is AI the main subject of the article?', 'Yes if AI is the focus of the headline, the lead, or most of the text. No if AI only comes up in passing.'),
  yesno('market', 'Is AI presented as a market?', 'AI as something bought, sold, invested in or profited from: products, startups, deals, investment, revenue, jobs created, consumer use.'),
  yesno('governance', 'Is AI presented as something to govern?', 'AI as something to regulate, legislate, set policy or strategy for, or oversee for risks: laws, bills, national AI strategies, ethics guidelines, data protection, regulators.'),
  yesno('capability', 'Is AI presented as a capability to build?', 'AI as national or local capacity to develop: skills and training, research, universities, data centres, compute, infrastructure, homegrown innovation.'),
  { name: 'dominant', label: 'Which orientation gets the most space?', type: 'single', options: [{ code: 1, label: 'Market' }, { code: 2, label: 'Governance' }, { code: 3, label: 'Capability' }, { code: 4, label: 'None of these' }], help: 'Count paragraphs if two seem equal; the one in the headline or lead wins a tie.' },
  yesno('act_gov', 'Is a government actor quoted or cited?', 'Ministers, presidents, legislators, regulators, government agencies.'),
  yesno('act_tech', 'Is a technology company or its staff quoted or cited?', 'Firms of any size, their executives, spokespeople or press releases.'),
  yesno('act_expert', 'Is an academic or expert quoted or cited?', 'University researchers, think tanks, consultants, independent analysts.'),
  yesno('act_civil', 'Is civil society or an ordinary citizen quoted or cited?', 'NGOs, unions, advocacy groups, professional associations, users, workers, students.'),
  yesno('act_intl', 'Is an international organization quoted or cited?', 'UN agencies, World Bank, IMF, AU, ASEAN, ECOWAS, OECD.'),
  { name: 'main_actor', label: 'Who is the main actor?', type: 'single', options: [{ code: 1, label: 'Government' }, { code: 2, label: 'Tech company' }, { code: 3, label: 'Academic or expert' }, { code: 4, label: 'Civil society or citizen' }, { code: 5, label: 'International organization' }, { code: 6, label: 'Other or none' }], help: 'The actor quoted first or given the most space.' },
  yesno('benefit', 'Are benefits of AI mentioned?', 'Growth, efficiency, better services, health, education, jobs created.'),
  yesno('risk', 'Are risks or harms of AI mentioned?', 'Job losses, bias, misinformation, deepfakes, privacy, surveillance, safety.'),
  { name: 'tone', label: 'Overall tone toward AI', type: 'single', options: [{ code: 1, label: 'Positive' }, { code: 2, label: 'Negative' }, { code: 3, label: 'Mixed or neutral' }], help: 'Judge the article as a whole, not single quotes.' },
  { name: 'genre', label: 'Type of article', type: 'single', options: [{ code: 1, label: 'Hard news' }, { code: 2, label: 'Feature or analysis' }, { code: 3, label: 'Opinion or editorial' }, { code: 4, label: 'Interview' }, { code: 5, label: 'Press release or sponsored' }], help: '' },
  { name: 'notes', label: 'Notes', type: 'text', help: 'Anything odd about this article, or a quote worth keeping.' },
] };
const DEFAULT_CODEBOOK = { vars: [] };
const DEFAULT_REASONS = ['Only a passing mention', 'The term means something else', 'Sponsored content or advertorial', 'Duplicate of an article already coded', 'Text truncated or unavailable', 'Other'];
const DEFAULT_SETTINGS = { target: 0, deadline: '', hl: '', outlets: '' };
// Browsers used before the defaults went blank keep the project they were set up with
const LEGACY_SETTINGS = {
  target: 940, deadline: '2026-11-25', hl: 'AI, artificial intelligence, ChatGPT, generative, algorithm, machine learning, regulation, policy',
  outlets:['Daily Guide = Ghana', 'The Herald = Ghana', 'Punch = Nigeria', 'The Nation = Nigeria', 'The Standard = Kenya', 'The Star = Kenya', 'Daily Monitor = Uganda', 'The Observer = Uganda', 'Hindustan Times = India', 'Times of India = India', 'Dawn = Pakistan', 'The News International = Pakistan', 'New Straits Times = Malaysia', 'Malay Mail = Malaysia', 'Philippine Daily Inquirer = Philippines', 'Philippine Star = Philippines'].join('\n'),
};

/* ---------- state ---------- */
// A browser holding Chota data but no version mark was set up when the AI project was the default
const LEGACY = lsGet('cc_v', 0) < 2 && ['cc_records', 'cc_codebook', 'cc_settings', 'cc_folders', 'cc_lib'].some((k) => lsGet(k, null) !== null);
const S = {
  codebook: (() => {
    const c = lsGet('cc_codebook', null);
    if (c && Array.isArray(c.vars) && JSON.stringify(c.vars.map((v) => v.name)) !== JSON.stringify(OLD_STARTER)) return c;
    return JSON.parse(JSON.stringify(c || LEGACY ? EXAMPLE_CODEBOOK : DEFAULT_CODEBOOK));
  })(),
  settings: Object.assign({}, LEGACY ? LEGACY_SETTINGS : DEFAULT_SETTINGS, lsGet('cc_settings', {})),
  records: lsGet('cc_records', {}),
  recodes: lsGet('cc_recodes', {}),
  sample: lsGet('cc_sample', null),
  files: [], articles: [], cur: -1,
  mode: 'code', form: {}, meta: {}, activeQ: 0, confirmMissing: false, openedAt: 0,
  zoom: 1, textMode: false, view: 'code', qFilter: 'todo', showOutlets: false,
  folders: lsGet('cc_folders', []), folderSel: '', openFolders: new Set(), selecting: false, selected: new Set(), libFull: false,
  dl: null, dir: null, pendingDir: null, dirError: false, hidden: new Set(),
  sampling: lsGet('cc_sampling', null), logRow: null, coders: [],
};
if (LEGACY) { lsSet('cc_codebook', S.codebook); lsSet('cc_settings', S.settings); }
lsSet('cc_v', 2);

/* ---------- outlets ---------- */
function outletList() {
  return S.settings.outlets.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [o, c] = l.split('='); return { outlet: (o || '').trim(), country: (c || '').trim() }; }).filter((x) => x.outlet);
}
function countryList() { const out = []; for (const o of outletList()) if (o.country && !out.includes(o.country)) out.push(o.country); return out; }

/* ---------- storage ----------
   Codes always go to this browser's localStorage. On top of that, one of two places keeps everything:
   - a folder on the computer (Chrome and Edge): PDFs are read from it and a codes file is written to it
   - otherwise this browser's IndexedDB, which also keeps the PDFs between visits */
const BACKUP_DIR = 'chota-backups';
const canUseFolder = 'showDirectoryPicker' in window;
const idb = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    const r = indexedDB.open('chota', 1);
    r.onupgradeneeded = () => { const db = r.result; for (const s of ['kv', 'pdfs', 'files']) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s); };
    r.onsuccess = () => res(r.result); r.onerror = () => { p = null; rej(r.error); };
  }));
  const tx = async (store, mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode); const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req.result); t.onerror = t.onabort = () => rej(t.error);
    });
  };
  return {
    get: (st, k) => tx(st, 'readonly', (s) => s.get(k)),
    all: (st) => tx(st, 'readonly', (s) => s.getAll()),
    put: (st, k, v) => tx(st, 'readwrite', (s) => s.put(v, k)),
    del: (st, k) => tx(st, 'readwrite', (s) => s.delete(k)),
  };
})();

function persistRecord() { lsSet('cc_records', S.records); queueSave(); }
function deleteRecord(key) { delete S.records[key]; lsSet('cc_records', S.records); queueSave(); }
function persistRecode() { lsSet('cc_recodes', S.recodes); queueSave(); }
function persistCodebook() { lsSet('cc_codebook', S.codebook); queueSave(); }
function persistSettings() { lsSet('cc_settings', S.settings); queueSave(); }
function persistSample() { lsSet('cc_sample', S.sample); queueSave(); }
function saveAllLocal() { lsSet('cc_records', S.records); lsSet('cc_recodes', S.recodes); lsSet('cc_codebook', S.codebook); lsSet('cc_settings', S.settings); lsSet('cc_sample', S.sample); lsSet('cc_folders', S.folders); }

function setStore(saving) {
  let text, title, ok = false;
  if (S.dirError) { text = 'Not saved'; title = 'Chota could not write to your folder. Click to reconnect it. Your codes are still kept in this browser.'; }
  else if (S.dir) { ok = true; text = saving ? 'Saving' : 'Saved'; title = `Codes are saved to ${S.dir.name}/${S.dir.file} after every article. Click to open the library.`; }
  else if (S.pendingDir) { text = 'Reconnect'; title = `Click to reopen your folder ${S.pendingDir.handle.name}.`; }
  else { text = 'This browser'; title = 'Codes and PDFs are kept in this browser only. Download a backup from Export now and then, or choose a folder to save to in the Library.'; }
  $('#saveDot').classList.toggle('cloud', ok); $('#store').textContent = text; $('#saveDot').title = title;
  renderDirBar();
}
function renderDirBar() {
  const b = $('#dirBar'); if (!b) return;
  if (S.dir) b.innerHTML = `<span>Saving to <b>${esc(S.dir.name)}</b> / ${esc(S.dir.file)}</span><button class="quiet" id="dirBtn" title="Save to a different folder">Change</button>`;
  else if (S.pendingDir) b.innerHTML = `<span>Your folder <b>${esc(S.pendingDir.handle.name)}</b> is not open</span><button class="primary" id="dirBtn">Reconnect</button>`;
  else if (canUseFolder) b.innerHTML = `<span>Saved in this browser only</span><button id="dirBtn" title="Keep your PDFs and codes in a folder on this computer">Save to a folder…</button>`;
  else b.innerHTML = '<span>Saved in this browser. To save to a folder on your computer instead, open Chota in Chrome or Edge.</span>';
  const btn = $('#dirBtn'); if (btn) btn.onclick = () => (!S.dir && S.pendingDir ? reconnectDir() : chooseDir());
}

/* ----- the codes file in the folder ----- */
const dataFileName = (coder) => { const s = (coder || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); return s ? `chota-codes-${s}.json` : 'chota-codes.json'; };
function dataSnapshot() {
  const files = {};
  for (const f of S.files) files[f.id] = { name: f.name, path: f.path || '', size: f.size || 0, folder: f.folder || '', numPages: f.numPages || null, starts: f.starts, metaByStart: f.metaByStart || {}, addedAt: f.addedAt || 0 };
  return { app: 'chota', version: 1, coder: S.dir?.coder || '', exportedAt: new Date().toISOString(), codebook: S.codebook, settings: S.settings, records: S.records, recodes: S.recodes, sample: S.sample, folders: S.folders, fileSplits: S.fileSplits || {}, hidden: [...S.hidden], sampling: S.sampling, files };
}
async function writeText(dir, parts, data) {
  let d = dir;
  for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
  const fh = await d.getFileHandle(parts[parts.length - 1], { create: true });
  const w = await fh.createWritable();
  try { await w.write(data); await w.close(); } catch (e) { try { await w.abort(); } catch {} throw e; }
  return fh;
}
let dirTimer = null, dirDirty = false, dirChain = Promise.resolve();
function queueSave() {
  if (!S.dir) return;
  dirDirty = true; setStore(true);
  clearTimeout(dirTimer); dirTimer = setTimeout(flushDir, 500);
}
function flushDir() {
  clearTimeout(dirTimer);
  dirChain = dirChain.then(async () => {
    if (!dirDirty || !S.dir) return;
    dirDirty = false;
    const d = S.dir;
    try { await writeText(d.handle, [d.file], JSON.stringify(dataSnapshot(), null, 1)); if (S.dir === d) setStore(false); }
    catch (e) {
      console.warn('folder save failed', e);
      if (S.dir !== d) return;
      S.pendingDir = { handle: d.handle, coder: d.coder }; S.dir = null; S.dirError = true; setStore();
      toast('Chota could not save to your folder. Click Reconnect in the library. Your codes are still kept in this browser.', 7000);
    }
  });
  return dirChain;
}

/* ----- opening a folder ----- */
async function walkDir(dir, rel, out) {
  for await (const [name, h] of dir.entries()) {
    if (h.kind === 'directory') { if (!name.startsWith('.') && name !== BACKUP_DIR) await walkDir(h, rel ? rel + '/' + name : name, out); }
    else if (/\.pdf$/i.test(name)) out.push({ handle: h, name, rel });
  }
}
function fileFromDoc(d) {
  return { id: d.id, name: d.name, size: d.size || 0, path: d.path || '', folder: d.folder || '', addedAt: d.addedAt || 0, numPages: d.numPages || null, starts: d.starts && d.starts.length ? d.starts.slice() : [1], metaByStart: JSON.parse(JSON.stringify(d.metaByStart || {})), scanned: !!d.numPages, pages: null };
}
async function chooseDir() {
  if (!canUseFolder) { toast('Saving to a folder works in Chrome and Edge.', 4000); return; }
  let handle;
  try { handle = await window.showDirectoryPicker({ id: 'chota', mode: 'readwrite' }); }
  catch (e) { if (e?.name !== 'AbortError') toast('Could not open that folder: ' + (e?.message || e), 5000); return; }
  let prev = S.dir || S.pendingDir; if (!prev) { try { prev = await idb.get('kv', 'dir'); } catch {} }
  const ok = await ask(`<h3>Save to ${esc(handle.name)}</h3><p class="small">Chota opens the PDFs in this folder and its subfolders, and saves your codes in it after every article. PDFs you add later are copied into it.</p><label class="small" style="display:block">Your name or initials <span class="mute">(optional; gives you your own codes file if several people share this folder)</span><input id="coderIn" style="width:100%;margin-top:6px" value="${esc(prev?.coder || '')}"></label>`, 'Use this folder');
  if (!ok) return;
  const coder = (document.getElementById('coderIn').value || '').trim();
  let same = false;
  try { same = !!(prev?.handle && (await prev.handle.isSameEntry(handle)) && (prev.coder || '') === coder); } catch {}
  if (S.dir) await flushDir();
  await connectDir(handle, coder, same);
}
async function reconnectDir() {
  const p = S.pendingDir; if (!p) return chooseDir();
  let perm = 'denied';
  try { perm = await p.handle.requestPermission({ mode: 'readwrite' }); } catch (e) { console.warn(e); }
  if (perm !== 'granted') { toast('Chota needs your permission to open that folder.', 4000); return; }
  await connectDir(p.handle, p.coder, true);
}
// same = this browser was last saving to this folder and codes file, so its newer codes are merged in without asking
async function connectDir(handle, coder, same) {
  const file = dataFileName(coder), today = todayStr();
  $('#store').textContent = 'Opening';
  try {
    let raw = null, data = null;
    try { raw = await (await (await handle.getFileHandle(file)).getFile()).text(); } catch (e) { if (e?.name !== 'NotFoundError') throw e; }
    if (raw != null) {
      try { data = JSON.parse(raw); if (!data || typeof data !== 'object') throw 0; }
      catch { await ask(`<h3>${esc(file)} could not be read</h3><p class="small">The codes file in ${esc(handle.name)} is damaged, so Chota has left it alone. Restore a copy from the ${BACKUP_DIR} folder, or choose another folder.</p>`, 'OK'); setStore(); return false; }
      await writeText(handle, [BACKUP_DIR, file.replace(/\.json$/, `-${today}.json`)], raw);
    }
    const newer = (a, b) => !b || (a.savedAt || 0) > (b.savedAt || 0);
    const fileRecs = data?.records || {}, fileRcs = data?.recodes || {};
    const extraR = Object.entries(S.records).filter(([k, r]) => newer(r, fileRecs[k]));
    const extraRc = Object.entries(S.recodes).filter(([k, r]) => newer(r, fileRcs[k]));
    let take = true;
    if (!same && (extraR.length || extraRc.length)) {
      const n = extraR.length || extraRc.length;
      take = await ask(data
        ? `<h3>Add this browser's codes?</h3><p class="small">This browser has ${n} coded article${n === 1 ? '' : 's'} that ${n === 1 ? 'is' : 'are'} not in ${esc(file)}, or newer than the copy there. Add ${n === 1 ? 'it' : 'them'} to the file? Either way a copy of this browser's codes is put in ${BACKUP_DIR}.</p>`
        : `<h3>Start with this browser's codes?</h3><p class="small">This browser has ${n} coded article${n === 1 ? '' : 's'}. Put ${n === 1 ? 'it' : 'them'} in your new codes file, or start empty? Either way a copy is put in ${BACKUP_DIR}.</p>`, data ? 'Add them' : 'Include them');
      await writeText(handle, [BACKUP_DIR, `browser-codes-${today}.json`], JSON.stringify({ app: 'chota', version: 1, exportedAt: new Date().toISOString(), codebook: S.codebook, settings: S.settings, records: S.records, recodes: S.recodes, sample: S.sample, fileSplits: S.fileSplits || {} }, null, 1));
    }
    const recs = { ...fileRecs }, rcs = { ...fileRcs };
    if (take) { for (const [k, r] of extraR) recs[k] = r; for (const [k, r] of extraRc) rcs[k] = r; }
    if (data) {
      if (data.codebook && Array.isArray(data.codebook.vars)) S.codebook = data.codebook;
      if (data.settings) S.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings);
      if ('sample' in data) S.sample = data.sample;
      S.folders = Array.isArray(data.folders) ? data.folders : [];
      S.fileSplits = data.fileSplits || {};
      S.hidden = new Set(data.hidden || []);
      if (data.sampling !== undefined) { S.sampling = data.sampling; logIndex = null; lsSet('cc_sampling', S.sampling); }
    } else if (!take) { S.sample = null; S.hidden = new Set(); }
    else S.hidden = new Set();
    S.records = recs; S.recodes = rcs;

    // PDFs in the folder
    const found = []; await walkDir(handle, '', found);
    const meta = data?.files || {}, byId = new Map(), list = [];
    for (const it of found) {
      const fo = await it.handle.getFile();
      let id = safeSeg(it.name); const ex = byId.get(id);
      if (ex) { if (ex.size === fo.size) continue; id = safeSeg(it.name.replace(/\.pdf$/i, '')) + '-' + fo.size + '.pdf'; if (byId.has(id)) continue; }
      const path = it.rel ? it.rel + '/' + it.name : it.name;
      const f = meta[id] ? fileFromDoc({ ...meta[id], id }) : { id, name: it.name, size: fo.size, folder: it.rel, addedAt: fo.lastModified || Date.now(), scanned: false, numPages: null, starts: [1], pages: null, metaByStart: {} };
      Object.assign(f, { handle: it.handle, path, size: fo.size });
      byId.set(id, f);
      if (!S.hidden.has(id)) list.push(f);
    }
    // PDFs kept in this browser, or opened this visit, that the folder does not have yet
    let bdocs = []; try { bdocs = await idb.all('files'); } catch {}
    const toCopy = bdocs.filter((d) => !byId.has(d.id));
    if (toCopy.length && await ask(`<h3>Copy PDFs into the folder?</h3><p class="small">${toCopy.length} PDF${toCopy.length === 1 ? ' is' : 's are'} saved in this browser but not in ${esc(handle.name)}. Copy ${toCopy.length === 1 ? 'it' : 'them'} into the folder? The browser's copies are then removed.</p>`, 'Copy them')) {
      for (const d of toCopy) { let blob = null; try { blob = await idb.get('pdfs', d.id); } catch {} if (blob) { const f = fileFromDoc(d); f.file = blob; f.migrate = true; list.push(f); byId.set(f.id, f); S.hidden.delete(f.id); } }
    }
    for (const f of S.files) if (f.file && !f.handle && !f.stored && !byId.has(f.id)) { list.push(f); byId.set(f.id, f); }

    S.dir = { handle, coder, file, name: handle.name }; S.pendingDir = null; S.dirError = false;
    try { await idb.put('kv', 'dir', { handle, coder }); } catch (e) { console.warn(e); }
    S.files = list; S.cur = -1; viewId = null; S.selected.clear();
    saveAllLocal(); sortFiles(); refreshAll(); renderFolders(); libState();
    dirDirty = true; await flushDir();
    backgroundScan(); storeQueue();
    if (S.articles.length) goNext(-1);
    toast(`Saving to ${handle.name}`, 3000);
    return true;
  } catch (e) {
    console.warn('folder open failed', e);
    toast('That folder could not be opened' + (e?.name === 'NotFoundError' ? ' (it may have been moved)' : '') + '. Choose it again from the library.', 6000);
    setStore(); return false;
  }
}
async function loadBrowserLibrary() {
  let docs = [];
  try { docs = await idb.all('files'); } catch (e) { console.warn('browser storage unavailable', e); }
  for (const d of docs) if (!S.files.some((f) => f.id === d.id)) S.files.push(Object.assign(fileFromDoc(d), { stored: true }));
  sortFiles(); rebuildArticles(); renderFolders(); libState();
  if (S.cur < 0 && S.files.length) goNext(-1);
  try { if (docs.length && navigator.storage?.persist) navigator.storage.persist(); } catch {}
}
async function initStore() {
  setStore();
  if (canUseFolder) {
    let saved = null; try { saved = await idb.get('kv', 'dir'); } catch {}
    if (saved?.handle) {
      let perm = 'prompt'; try { perm = await saved.handle.queryPermission({ mode: 'readwrite' }); } catch {}
      if (perm === 'granted' && await connectDir(saved.handle, saved.coder, true)) return;
      S.pendingDir = saved; setStore();
      if (await ask(`<h3>Open your Chota folder?</h3><p class="small">Your PDFs and codes are in <b>${esc(saved.handle.name)}</b>. Your browser asks for permission to open it each visit.</p>`, 'Open folder')) {
        await reconnectDir(); if (S.dir) return;
      }
    }
  }
  await loadBrowserLibrary();
}

/* ---------- PDF handling ---------- */
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
const DATE_RE = new RegExp(`\\b(${MONTHS})\\s+(\\d{1,2}),?\\s+(\\d{4})`, 'i');
const DATE_RE2 = new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS})\\s+(\\d{4})`, 'i');
// Text lines of a page. An empty string marks a paragraph break, found where the gap
// between two lines is clearly wider than the usual line spacing.
function linesFrom(tc) {
  const raw = []; let cur = '', curY = null, lastY = null;
  const flush = () => { if (cur.trim()) raw.push({ t: cur.trim(), y: curY }); cur = ''; curY = null; };
  for (const it of tc.items) {
    if (typeof it.str !== 'string') continue;
    const y = it.transform ? Math.round(it.transform[5]) : null;
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && cur.trim()) flush();
    if (curY === null) curY = y;
    cur += it.str; if (it.hasEOL) flush();
    lastY = y;
  }
  flush();
  const gaps = []; for (let i = 1; i < raw.length; i++) if (raw[i].y != null && raw[i - 1].y != null) { const g = raw[i - 1].y - raw[i].y; if (g > 0) gaps.push(g); }
  gaps.sort((a, b) => a - b);
  const typical = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
  const out = [];
  raw.forEach((r, i) => {
    if (i && typical && r.y != null && raw[i - 1].y != null && raw[i - 1].y - r.y > typical * 1.45) out.push('');
    out.push(r.t.replace(/\s+/g, ' '));
  });
  return out;
}
// Where articles start in a batch PDF:
//   Nexis Uni    "Page 1 of N" on an article's first page, or "End of Document" on its last
//   ProQuest     "Document 3 of 50" at the top of each article
//   Factiva      a line "Document" + the Factiva ID (e.g. AFPR000020240101ek1100001) closing each article
function detectStarts(pages) {
  const n = pages.length;
  const startsAt = (re) => { const s = []; pages.forEach((ls, i) => { if (ls.some((l) => re.test(l))) s.push(i + 1); }); return s; };
  const fromEnds = (re) => { const ends = startsAt(re); if (ends.length < 2) return null; const s = [1]; for (const e of ends) if (e + 1 <= n) s.push(e + 1); return [...new Set(s)]; };
  const p1 = startsAt(/\bPage\s+1\s+of\s+\d+\b/i); if (p1.length) return p1;
  const nexis = fromEnds(/End of Document/i); if (nexis) return nexis;
  const pq = startsAt(/^Document \d+ of \d+$/i); if (pq.length >= 2) return [...new Set([1, ...pq])].sort((a, b) => a - b);
  const factiva = fromEnds(/^Document [A-Za-z0-9]{18,}$/); if (factiva) return factiva;
  return [1];
}
function guessMeta(lines, fileName) {
  const head = lines.slice(0, 18);
  const meta = { outlet: '', country: '', year: '', date: '', headline: '', words: '' };
  const outs = outletList().slice().sort((a, b) => b.outlet.length - a.outlet.length);
  const hay = head.join('\n').toLowerCase();
  for (const o of outs) { if (hay.includes(o.outlet.toLowerCase())) { meta.outlet = o.outlet; meta.country = o.country; break; } }
  if (!meta.outlet) { const fn = fileName.toLowerCase().replace(/[_\-]+/g, ' '); for (const o of outs) if (fn.includes(o.outlet.toLowerCase())) { meta.outlet = o.outlet; meta.country = o.country; break; } }
  const all = lines.slice(0, 40).join('\n');
  let m = all.match(DATE_RE);
  if (m) { meta.date = `${m[1]} ${m[2]}, ${m[3]}`; meta.year = m[3]; }
  else if ((m = all.match(DATE_RE2))) { meta.date = `${m[1]} ${m[2]} ${m[3]}`; meta.year = m[3]; }
  else { const y = fileName.match(/(20[0-3]\d)/); if (y) meta.year = y[1]; }
  const w = all.match(/Length:\s*([\d,]+)\s*words/i); if (w) meta.words = w[1].replace(/,/g, '');
  const skip = (l) => !l || l.length < 4 || /^Page \d+ of \d+/i.test(l) || /^(Copyright|Section|Length|Byline|Body|Load-Date|Language|Publication|Highlight)\b/i.test(l) || DATE_RE.test(l) || (meta.outlet && l.toLowerCase() === meta.outlet.toLowerCase());
  const hl = head.find((l) => !skip(l));
  meta.headline = hl ? hl.slice(0, 250) : '';
  return meta;
}
function keyFor(f, start) { return f.id + '~p' + start; }
function fileDoc(f) { return { id: f.id, name: f.name, size: f.size || 0, path: f.path || '', folder: f.folder || '', numPages: f.numPages || null, starts: f.starts, metaByStart: f.metaByStart || {}, addedAt: f.addedAt || Date.now(), savedAt: Date.now() }; }
function persistFile(f) {
  if (S.dir) queueSave();
  else if (f.stored) idb.put('files', f.id, fileDoc(f)).catch((e) => console.warn('could not save PDF details', e));
}
function persistFolders() { lsSet('cc_folders', S.folders); queueSave(); }
async function fileBytes(f) {
  if (f.file) return f.file.arrayBuffer();
  if (f.handle) {
    try { return await (await f.handle.getFile()).arrayBuffer(); }
    catch (e) { throw new Error(e?.name === 'NotFoundError' ? 'This PDF is no longer in your folder.' : 'Your folder is not open. Click Reconnect in the library.'); }
  }
  if (f.stored) { let b = null; try { b = await idb.get('pdfs', f.id); } catch {} if (b) return b.arrayBuffer(); throw new Error('The copy of this PDF saved in this browser is missing. Add it again.'); }
  throw new Error('This PDF is not in your library. Add it again.');
}
function sortFiles() { S.files.sort((a, b) => natCmp(a.folder || '', b.folder || '') || natCmp(a.name, b.name)); }
const fileIndex = (f) => S.files.indexOf(f);

async function addFiles(list) {
  const pdfs = [...list].filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
  if (!pdfs.length) { toast('No PDF files found there.'); return; }
  const folder = S.folderSel && S.folderSel !== '__unfiled' ? S.folderSel : '';
  const byId = new Map(S.files.map((f) => [f.id, f]));
  let added = 0, skipped = 0;
  for (const file of pdfs) {
    let id = safeSeg(file.name);
    const ex = byId.get(id);
    if (ex) {
      if (!ex.size || ex.size === file.size) { if (!ex.file) ex.file = file; if (!ex.size) ex.size = file.size; skipped++; continue; }
      id = safeSeg(file.name.replace(/\.pdf$/i, '')) + '-' + file.size + '.pdf';
      if (byId.has(id)) { skipped++; continue; }
    }
    const f = { id, file, name: file.name, size: file.size, folder, addedAt: Date.now(), scanned: false, numPages: null, starts: [1], pages: null, metaByStart: {} };
    S.files.push(f); byId.set(id, f); S.hidden.delete(id); added++;
  }
  sortFiles(); rebuildArticles(); renderFolders();
  toast(`${added} PDF${added === 1 ? '' : 's'} added${folder ? ' to ' + folder : ''}${skipped ? `, ${skipped} already in your library` : ''}`, 3000);
  if (S.cur < 0) await goNext(-1);
  backgroundScan(); storeQueue();
}
function rebuildArticles() {
  const curKey = S.articles[S.cur]?.key;
  const arts = [];
  S.files.forEach((f, fi) => {
    const starts = f.starts.slice().sort((a, b) => a - b);
    starts.forEach((s, i) => {
      const end = i + 1 < starts.length ? starts[i + 1] - 1 : (f.numPages || s);
      arts.push({ key: keyFor(f, s), fi, start: s, end, scanned: f.scanned });
    });
  });
  S.articles = arts;
  S.cur = curKey ? arts.findIndex((a) => a.key === curKey) : S.cur;
  if (S.cur >= arts.length) S.cur = -1;
  renderQueue(); renderProgress();
}
async function extractPages(doc) {
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pg = await doc.getPage(p); const tc = await pg.getTextContent(); pages.push(linesFrom(tc)); pg.cleanup();
    if (p % 3 === 0) await sleep(0);
  }
  return pages;
}
async function scanFile(fi) {
  const f = S.files[fi];
  if (f.scanned) return; if (f.scanP) return f.scanP;
  f.scanP = (async () => {
    try {
      const doc = await pdfjsLib.getDocument({ data: await fileBytes(f) }).promise;
      const pages = await extractPages(doc); const n = doc.numPages;
      doc.destroy();
      f.numPages = n; f.pages = pages;
      let starts = detectStarts(pages);
      const prefix = f.id + '~p';
      for (const k of Object.keys(S.records)) if (k.startsWith(prefix)) { const s = +k.slice(prefix.length); if (s >= 1 && s <= n) starts.push(s); }
      if (S.fileSplits?.[f.name]) starts.push(...S.fileSplits[f.name]);
      starts = [...new Set(starts)].sort((a, b) => a - b);
      f.starts = starts;
      for (const s of starts) { const ls = pages.slice(s - 1, s + 1).flat(); f.metaByStart[s] = guessMeta(ls, f.name); }
      persistFile(f);
    } catch (e) {
      console.warn('scan failed', f.name, e); f.numPages = f.numPages || 1; f.error = String(e.message || e);
    }
    f.scanned = true; rebuildArticles(); renderFolders();
  })();
  return f.scanP;
}
let scanning = false;
async function backgroundScan() {
  if (scanning) return; scanning = true;
  while (true) {
    const fi = S.files.findIndex((f) => !f.scanned && !f.scanP);
    const left = S.files.filter((f) => !f.scanned).length;
    $('#scanState').textContent = left ? `Reading PDFs… ${S.files.length - left} of ${S.files.length}` : '';
    if (fi < 0) break;
    await scanFile(fi); await sleep(5);
  }
  scanning = false; libState();
}
// Keeps PDFs opened this visit: copies them into the folder, or saves them in this browser
async function copyIntoDir(f) {
  const dir = S.dir.handle;
  let name = f.name;
  for (let i = 2; ; i++) {
    let ex = null;
    try { ex = await dir.getFileHandle(name); } catch (e) { if (e?.name !== 'NotFoundError' && e?.name !== 'TypeMismatchError') throw e; }
    if (!ex) break;
    if ((await ex.getFile()).size === f.file.size) { f.handle = ex; f.path = name; return; }
    name = f.name.replace(/(\.pdf)?$/i, `-${i}.pdf`);
  }
  f.handle = await writeText(dir, [name], f.file); f.path = name;
}
let storing = false;
async function storeQueue() {
  if (storing) return;
  storing = true;
  try {
    while (true) {
      const todo = S.files.filter((x) => x.file && !x.handle && (S.dir || !x.stored) && !x.storeFailed);
      libState(todo.length);
      const f = todo[0]; if (!f) break;
      const dir = S.dir;
      try {
        if (dir) {
          await copyIntoDir(f);
          if (f.migrate) { f.migrate = false; f.stored = false; idb.del('pdfs', f.id).catch(() => {}); idb.del('files', f.id).catch(() => {}); }
        } else { await idb.put('pdfs', f.id, f.file); f.stored = true; }
        persistFile(f);
      } catch (e) {
        f.storeFailed = true; console.warn('could not keep PDF', f.name, e);
        if (!dir && e?.name === 'QuotaExceededError') { S.libFull = true; toast('Browser storage is full. The other PDFs stay open for this visit only.', 6000); break; }
        if (dir) { toast('Could not copy ' + f.name + ' into your folder.', 4000); }
      }
    }
  } finally { storing = false; libState(); renderQueue(); }
}
function libState(pending) {
  const n = S.files.length, kept = S.files.filter((f) => f.handle || f.stored).length;
  let t = '';
  if (pending) t = S.dir ? `Copying PDFs into your folder, ${pending} to go` : `Saving PDFs in this browser, ${pending} to go`;
  else if (!n) t = '';
  else if (kept < n) t = `${kept} of ${n} PDFs kept${S.libFull ? '. Browser storage is full' : ''}. The rest are open for this visit only.`;
  else t = `${n} PDF${n === 1 ? '' : 's'}, ${S.articles.length} article${S.articles.length === 1 ? '' : 's'}`;
  $('#libState').textContent = t;
}

/* ---------- folders ---------- */
function allFolders() {
  const set = new Set(S.folders || []);
  for (const f of S.files) if (f.folder) set.add(f.folder);
  for (const p of [...set]) { const parts = p.split('/'); for (let i = 1; i < parts.length; i++) set.add(parts.slice(0, i).join('/')); }
  return [...set].sort(natCmp);
}
const inFolder = (f, sel) => !sel ? true : sel === '__unfiled' ? !f.folder : (f.folder === sel || (f.folder || '').startsWith(sel + '/'));
function renderFolders() {
  const box = $('#folders'); if (!box) return;
  box.innerHTML = '';
  const folders = allFolders();
  const count = (sel) => { let tot = 0, done = 0; for (const a of S.articles) { if (!inFolder(S.files[a.fi], sel)) continue; tot++; if (S.records[a.key]) done++; } return `${done}/${tot}`; };
  const row = (label, sel, depth, hasKids) => {
    const on = (S.folderSel || '') === sel;
    const open = S.openFolders.has(sel);
    return el('div', { class: 'frow' + (on ? ' on' : ''), style: `padding-left:${8 + depth * 14}px`, onclick: () => {
      if (hasKids) { if (open && on) S.openFolders.delete(sel); else S.openFolders.add(sel); }
      S.folderSel = sel; renderFolders(); renderQueue();
    } }, el('span', { class: 'tw' }, hasKids ? (open ? '▾' : '▸') : ''), el('span', { class: 'fn' }, label), el('span', { class: 'fc' }, count(sel)));
  };
  box.append(row('All articles', '', 0, false));
  for (const p of folders) {
    const parts = p.split('/'); const parent = parts.slice(0, -1).join('/');
    if (parent && !(S.openFolders.has(parent) && parentsOpen(parent))) continue;
    const hasKids = folders.some((q) => q.startsWith(p + '/'));
    box.append(row(parts[parts.length - 1], p, parts.length - 1 + 0, hasKids));
  }
  if (folders.length && S.files.some((f) => !f.folder)) box.append(row('No folder', '__unfiled', 0, false));
  const sel = S.folderSel;
  $('#btnDelFolder').style.display = sel && sel !== '__unfiled' ? '' : 'none';
  updateSelBar();
}
function updateSelBar() {
  $('#selBar').style.display = S.selecting ? 'flex' : 'none';
  $('#btnSelect').classList.toggle('on', S.selecting);
  $('#selCount').textContent = `${S.selected.size} selected`;
  const shown = [...(S.shownFiles || [])];
  const all = shown.length > 0 && shown.every((id) => S.selected.has(id));
  $('#btnSelAll').textContent = all ? 'Select none' : `Select all${shown.length ? ' ' + shown.length : ''}`;
  $('#btnSelAll').disabled = !shown.length;
}
function toggleSelectAll() {
  const shown = [...(S.shownFiles || [])];
  if (shown.length && shown.every((id) => S.selected.has(id))) for (const id of shown) S.selected.delete(id);
  else for (const id of shown) S.selected.add(id);
  renderQueue(); renderFolders();
}
function parentsOpen(p) { const parts = p.split('/'); for (let i = 1; i <= parts.length; i++) if (!S.openFolders.has(parts.slice(0, i).join('/'))) return false; return true; }
function chooseFolder(title) {
  return new Promise((res) => {
    const folders = allFolders();
    $('#mBody').innerHTML = `<h3>${esc(title)}</h3><div class="chips" id="fchips" style="max-height:240px;overflow:auto">${['', ...folders].map((p, i) => `<button data-i="${i}">${p ? esc(p) : 'No folder'}</button>`).join('')}</div><p class="small mute" style="margin:12px 0 4px">Or a new folder (use / for subfolders, e.g. Nigeria/Punch)</p><input id="newFolder" style="width:100%" placeholder="New folder name">`;
    $('#mOk').textContent = 'Use new folder'; $('#modal').classList.add('on');
    const done = (v) => { $('#modal').classList.remove('on'); $('#mOk').onclick = $('#mCancel').onclick = null; res(v); };
    document.querySelectorAll('#fchips button').forEach((b) => b.onclick = () => done(['', ...folders][+b.dataset.i]));
    $('#mOk').onclick = () => { const v = $('#newFolder').value.split('/').map((x) => x.trim()).filter(Boolean).join('/'); if (!v) { toast('Type a folder name'); return; } done(v); };
    $('#mCancel').onclick = () => done(null);
    setTimeout(() => $('#newFolder').focus(), 30);
  });
}
function moveFiles(files, folder) {
  for (const f of files) { if (f.folder === folder) continue; f.folder = folder; persistFile(f); }
  if (folder && !S.folders.includes(folder)) { S.folders.push(folder); persistFolders(); }
  sortFiles(); rebuildArticles(); renderFolders();
}
async function newFolder() {
  const ok = await ask('<h3>New folder</h3><p class="small mute">Use / for subfolders, e.g. Nigeria/Punch. New PDFs go into the folder you have open.</p><input id="nf" style="width:100%" placeholder="Folder name">', 'Create');
  if (!ok) return;
  const v = (document.getElementById('nf').value || '').split('/').map((x) => x.trim()).filter(Boolean).join('/');
  if (!v) return;
  if (!S.folders.includes(v)) { S.folders.push(v); persistFolders(); }
  S.folderSel = v; const parts = v.split('/'); for (let i = 1; i <= parts.length; i++) S.openFolders.add(parts.slice(0, i).join('/'));
  renderFolders(); renderQueue();
}
async function deleteFolder() {
  const sel = S.folderSel; if (!sel || sel === '__unfiled') return;
  const parent = sel.split('/').slice(0, -1).join('/');
  if (!(await ask(`<h3>Delete folder ${esc(sel)}?</h3><p class="small">The PDFs inside are kept and move to ${parent ? esc(parent) : 'No folder'}. Codes are not affected.</p>`, 'Delete folder'))) return;
  const files = S.files.filter((f) => inFolder(f, sel));
  for (const f of files) { f.folder = parent; persistFile(f); }
  S.folders = S.folders.filter((p) => p !== sel && !p.startsWith(sel + '/')); persistFolders();
  S.folderSel = parent; sortFiles(); rebuildArticles(); renderFolders();
}
async function autoSort() {
  const choice = await new Promise((res) => {
    $('#mBody').innerHTML = `<h3>Sort PDFs into folders</h3><p class="small mute">Uses the outlet, country and year found on each article's first page. PDFs with nothing detected go to Unsorted.</p><div class="btnrow" id="asb"><button data-k="c">Country</button><button data-k="co">Country / Outlet</button><button data-k="coy">Country / Outlet / Year</button><button data-k="cy">Country / Year</button></div>`;
    $('#mOk').style.display = 'none'; $('#modal').classList.add('on');
    const done = (v) => { $('#modal').classList.remove('on'); $('#mOk').style.display = ''; $('#mCancel').onclick = null; res(v); };
    document.querySelectorAll('#asb button').forEach((b) => b.onclick = () => done(b.dataset.k));
    $('#mCancel').onclick = () => done(null);
  });
  if (!choice) return;
  let moved = 0;
  for (const f of S.files) {
    const m = S.records[keyFor(f, f.starts[0])]?.meta || f.metaByStart[f.starts[0]] || {};
    const parts = { c: m.country, o: m.outlet, y: m.year };
    const path = choice.split('').map((k) => parts[k]).filter(Boolean);
    const folder = path.length ? path.join('/') : 'Unsorted';
    if (f.folder !== folder) { f.folder = folder; persistFile(f); moved++; }
    if (!S.folders.includes(folder)) S.folders.push(folder);
  }
  persistFolders(); sortFiles(); rebuildArticles(); renderFolders();
  toast(`Sorted ${moved} PDFs`);
}
async function removeSelected() {
  const files = S.files.filter((f) => S.selected.has(f.id));
  if (!files.length) return;
  const where = S.dir ? `They stay in your folder ${esc(S.dir.name)} on the computer but are hidden from the library. Adding one again brings it back.` : 'The copies saved in this browser are deleted.';
  if (!(await ask(`<h3>Remove ${files.length} PDF${files.length > 1 ? 's' : ''} from your library?</h3><p class="small">${where} Codes you already saved for them stay in your data.</p>`, 'Remove'))) return;
  for (const f of files) {
    if (S.dir) S.hidden.add(f.id);
    else if (f.stored) { idb.del('pdfs', f.id).catch(() => {}); idb.del('files', f.id).catch(() => {}); }
  }
  S.files = S.files.filter((f) => !S.selected.has(f.id));
  S.selected.clear(); S.cur = -1; viewId = null;
  queueSave(); rebuildArticles(); renderFolders(); libState(); goNext(-1);
}

/* ---------- viewer ---------- */
let viewDoc = null, viewId = null, renderTok = 0;
async function openArticle(i) {
  if (i < 0 || i >= S.articles.length) return;
  const startKey = S.articles[i].key;
  if (libOverlay()) setLib(false);
  S.cur = i;
  let a = S.articles[i];
  if (!S.files[a.fi].scanned) {
    $('#pages').innerHTML = '<div class="status">Reading the PDF…</div>';
    await scanFile(a.fi);
    // after scan, the article list may have changed: find the first article of this file
    const idx = S.articles.findIndex((x) => x.fi === a.fi && (x.key === startKey || x.start === 1)) ;
    S.cur = idx >= 0 ? idx : S.articles.findIndex((x) => x.fi === a.fi);
    a = S.articles[S.cur];
    // jump to first un-done article in this file if the first is done
    if (isDone(a.key)) { const j = S.articles.findIndex((x) => x.fi === a.fi && !isDone(x.key)); if (j >= 0) { S.cur = j; a = S.articles[j]; } }
  }
  const f = S.files[a.fi];
  // set up the form
  const rec = S.mode === 'recode' ? S.recodes[a.key] : S.records[a.key];
  const baseMeta = S.records[a.key]?.meta || f.metaByStart[a.start] || guessMeta([], f.name);
  S.meta = { ...baseMeta, ...(S.mode === 'code' && rec ? rec.meta : {}) };
  S.form = rec ? { ...rec.codes } : {};
  S.logRow = logRowForArticle(a);
  if (S.logRow && !(S.mode === 'code' && rec)) applyLogRow(S.logRow);
  S.activeQ = firstUnanswered(); S.confirmMissing = false; S.editMeta = false; S.openedAt = Date.now();
  renderForm(); renderQueue(true);
  $('#rangeLbl').textContent = `${f.name}, ${a.start === a.end ? 'page ' + a.start : 'pages ' + a.start + '–' + a.end} of ${f.numPages || '?'}`;
  $('#rangeLbl').title = $('#rangeLbl').textContent;
  $('#btnSplit').disabled = a.end <= a.start;
  $('#btnMerge').disabled = !(S.articles[S.cur + 1] && S.articles[S.cur + 1].fi === a.fi);
  // render pages
  const tok = ++renderTok;
  try {
    if (viewId !== f.id || !viewDoc) {
      if (viewDoc) { viewDoc.destroy(); viewDoc = null; }
      $('#pages').innerHTML = '<div class="status">Opening the PDF…</div>';
      viewDoc = await pdfjsLib.getDocument({ data: await fileBytes(f) }).promise; viewId = f.id;
      if (!f.pages) { const d = viewDoc; extractPages(d).then((p) => { f.pages = p; if (S.articles[S.cur]?.fi === fileIndex(f)) renderText(); }).catch(() => {}); }
    }
    if (tok !== renderTok) return;
    await renderPages(a, tok);
  } catch (e) {
    $('#pages').innerHTML = `<div class="drop"><h2>This PDF did not open</h2><p>${esc(e.message || e)}</p></div>`;
  }
  renderText();
}
async function renderPages(a, tok) {
  const box = $('#pages'); box.innerHTML = ''; box.scrollTop = 0;
  const avail = Math.max(300, box.clientWidth - 40);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  for (let p = a.start; p <= a.end; p++) {
    if (tok !== renderTok) return;
    const page = await viewDoc.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const scale = (avail / base.width) * S.zoom;
    const vp = page.getViewport({ scale: scale * dpr });
    const c = document.createElement('canvas');
    c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
    c.style.width = Math.floor(vp.width / dpr) + 'px'; c.style.height = Math.floor(vp.height / dpr) + 'px';
    box.append(c, el('div', { class: 'plabel' }, `page ${p}`));
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  }
}
// Paragraphs of the open article, numbered P1, P2... so notes can cite them
function articleParagraphs(a) {
  const f = S.files[a.fi]; if (!f.pages) return null;
  const paras = []; let cur = [];
  const end = () => { if (cur.length) { paras.push(cur.join(' ').replace(/(\w)- (\w)/g, '$1$2').replace(/\s+/g, ' ').trim()); cur = []; } };
  for (const ls of f.pages.slice(a.start - 1, a.end)) {
    for (const l of ls) { if (l === '') end(); else if (/^Page \d+ of \d+$/i.test(l)) continue; else cur.push(l); }
    // a page break ends a paragraph only when the line before it finishes a sentence
    if (cur.length && /[.!?"”’:]$/.test(cur[cur.length - 1])) end();
  }
  end();
  return paras.filter(Boolean);
}
function renderText() {
  const a = S.articles[S.cur]; if (!a) return;
  const paras = articleParagraphs(a);
  const box = $('#textview');
  if (!paras || !paras.length) { box.innerHTML = `<div class="paper">${esc(paras ? 'This PDF has no text layer, so only the page view works for it.' : 'Reading text…')}</div>`; return; }
  const terms = S.settings.hl.split(',').map((t) => t.trim()).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = terms.length ? new RegExp(`\\b(${terms.join('|')})\\b`, 'gi') : null;
  box.innerHTML = '<div class="paper">' + paras.map((p, i) => `<p data-p="${i + 1}"><span class="pn">P${i + 1}</span>${re ? esc(p).replace(re, '<mark>$1</mark>') : esc(p)}</p>`).join('') + '</div><button id="quoteBtn" class="primary" style="display:none">Add to note</button>';
  $('#quoteBtn').onmousedown = (e) => e.preventDefault();
  $('#quoteBtn').onclick = addQuoteToNote;
}
// Selecting text in the text view offers to add it, with its paragraph number, to the note question
function noteTarget() {
  const vs = vars(), sk = skipState(S.form).skipped;
  const texts = vs.filter((v) => v.type === 'text' && !sk.has(v.name));
  const noteLike = (v) => /note|quot|passage|evidence|excerpt/i.test(v.name + ' ' + (v.label || ''));
  const act = vs[S.activeQ];
  // the note question wins; otherwise the text question you are on; otherwise the last one
  return texts.find(noteLike) || (act && texts.includes(act) && !(act.options || []).length ? act : null) || texts[texts.length - 1] || null;
}
function selectionInText() {
  const sel = window.getSelection(); if (!sel || sel.isCollapsed) return null;
  const txt = sel.toString().replace(/\s+/g, ' ').trim(); if (txt.length < 3) return null;
  const node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
  const p = node && node.closest('#textview p[data-p]'); if (!p) return null;
  const endNode = sel.focusNode && (sel.focusNode.nodeType === 1 ? sel.focusNode : sel.focusNode.parentElement);
  const q = endNode && endNode.closest('#textview p[data-p]');
  const a = +p.dataset.p, b = q ? +q.dataset.p : a;
  return { txt: txt.replace(/^P\d+\s*/, ''), ref: a === b ? `P${a}` : `P${Math.min(a, b)}–P${Math.max(a, b)}`, rect: sel.getRangeAt(0).getBoundingClientRect() };
}
function addQuoteToNote() {
  const s = selectionInText(), v = noteTarget();
  if (!s) return;
  if (!v) { toast('Add a text question, such as a note, to the codebook first.', 3500); return; }
  const prev = (S.form[v.name] || '').trim();
  S.form[v.name] = (prev ? prev + '; ' : '') + `"${s.txt}" (${s.ref})`;
  window.getSelection().removeAllRanges(); $('#quoteBtn').style.display = 'none';
  keepScroll(renderForm); toast(`Added to ${v.name}`);
}
document.addEventListener('selectionchange', () => {
  const b = document.getElementById('quoteBtn'); if (!b) return;
  const s = S.textMode && selectionInText();
  if (!s) { b.style.display = 'none'; return; }
  const box = $('#textview').getBoundingClientRect();
  b.style.display = ''; b.style.top = (s.rect.bottom - box.top + $('#textview').scrollTop + 6) + 'px'; b.style.left = Math.max(8, Math.min(box.width - 140, s.rect.left - box.left)) + 'px';
});
function setTextMode(on) {
  const was = S.textMode; S.textMode = on;
  $('#pages').style.display = on ? 'none' : 'flex';
  $('#textview').style.display = on ? 'block' : 'none';
  document.querySelectorAll('#viewSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.m === 'text') === on));
  if (was && !on) rerender();
}

/* ---------- queue ---------- */
const isDone = (key) => S.mode === 'recode' ? !!S.recodes[key] : !!S.records[key];
function queueItems() {
  if (S.mode === 'recode' && S.sample) {
    const idx = new Map(S.articles.map((a, i) => [a.key, i]));
    return S.sample.keys.map((k) => ({ key: k, i: idx.has(k) ? idx.get(k) : -1 }));
  }
  return S.articles.map((a, i) => ({ key: a.key, i }));
}
function renderQueue(onlyCur) {
  const list = $('#qlist');
  if (onlyCur && list.childElementCount) {
    for (const n of list.children) n.classList.toggle('cur', +n.dataset.i === S.cur);
    const c = list.querySelector('.cur'); if (c) c.scrollIntoView({ block: 'nearest' });
    return;
  }
  const filt = S.qFilter, q = $('#qSearch').value.trim().toLowerCase();
  const frag = document.createDocumentFragment(); let shown = 0;
  S.shownFiles = new Set(); // PDFs matching the folder, filter and search, for Select all
  for (const it of queueItems()) {
    const done = isDone(it.key);
    if (filt === 'todo' && done && it.i !== S.cur) continue;
    if (filt === 'done' && !done) continue;
    const a = it.i >= 0 ? S.articles[it.i] : null;
    const f = a ? S.files[a.fi] : null;
    if (f && !inFolder(f, S.folderSel)) continue;
    const rec = S.records[it.key];
    const meta = rec?.meta || (f && f.metaByStart[a.start]) || {};
    const title = meta.headline || (f ? f.name : it.key.replace(/~p\d+$/, ''));
    const sub = a ? [!S.folderSel && f.folder, f.name + (f.starts.length > 1 ? `, p. ${a.start}–${a.end}` : ''), f.file && !f.handle && (S.dir || !f.stored) && !f.storeFailed ? 'saving' : ''].filter(Boolean).join('  /  ') : 'PDF not in the library yet';
    if (q && !(title + ' ' + sub).toLowerCase().includes(q)) continue;
    if (f) S.shownFiles.add(f.id);
    if (++shown > 1500) continue;
    const ex = S.mode === 'code' && rec?.excluded;
    const seld = f && S.selected.has(f.id);
    frag.append(el('div', { class: 'qi' + (it.i === S.cur && it.i >= 0 && !S.selecting ? ' cur' : '') + (seld ? ' sel' : ''), 'data-i': it.i, onclick: () => {
        if (S.selecting) { if (f) { if (S.selected.has(f.id)) S.selected.delete(f.id); else S.selected.add(f.id); renderQueue(); renderFolders(); } return; }
        if (it.i >= 0) openArticle(it.i); else toast('Add this PDF first: ' + it.key.replace(/~p\d+$/, '')); } },
      S.selecting ? el('span', { class: 'cb' + (seld ? ' on' : '') }, seld ? '✓' : '') : el('span', { class: 'dot' + (done ? (ex ? ' ex' : ' done') : '') }),
      el('div', {}, el('div', { class: 't' }, title), el('div', { class: 's' }, sub))));
  }
  list.innerHTML = ''; list.append(frag);
  if (!shown) list.append(el('p', { class: 'small muted', style: 'padding:8px 10px' }, !S.files.length ? 'Your library is empty. Add PDFs above or drop them anywhere on the page.' : filt === 'todo' ? 'Everything here is coded.' : 'Nothing matches.'));
  const c = list.querySelector('.cur'); if (c) c.scrollIntoView({ block: 'nearest' });
  if (shown > 1500) list.append(el('p', { class: 'small muted', style: 'padding:8px 10px' }, `Showing 1,500 of ${shown}. Search or open a folder to narrow the list.`));
  updateSelBar();
}

/* ---------- form ---------- */
const vars = () => S.codebook.vars;
const hasVal = (x) => x !== undefined && x !== '' && x !== null;
const isAnswered = (v) => hasVal(S.form[v.name]);
const required = (v) => v.type === 'binary' || v.type === 'single';
const qRef = (v, i) => v.ref || String(i + 1);
const naCode = () => { const n = S.codebook.naCode; return n === '' || n == null || isNaN(Number(n)) ? '' : Number(n); };
const missingCodes = () => (S.codebook.missing || []).map(Number).filter((x) => !isNaN(x));
/* Skip rules. Each question can carry rules like { when: 0, to: '__exclude' | '__end' | '<variable name>' }.
   Walking the answers in order gives the questions that are skipped and whether coding ended early. */
function skipState(codes) {
  const vs = vars(), skipped = new Set();
  let endAt = -1, exclude = false, reason = '';
  for (let i = 0; i < vs.length; i++) {
    const v = vs[i], val = codes[v.name];
    const rule = hasVal(val) && (v.skip || []).find((r) => String(r.when).trim().toLowerCase() === String(val).trim().toLowerCase());
    if (!rule) continue;
    if (rule.to === '__end' || rule.to === '__exclude') {
      for (let j = i + 1; j < vs.length; j++) skipped.add(vs[j].name);
      endAt = i; exclude = rule.to === '__exclude'; reason = `${qRef(v, i)} = ${val}`; break;
    }
    const t = vs.findIndex((x) => x.name === rule.to);
    if (t > i) { for (let j = i + 1; j < t; j++) skipped.add(vs[j].name); i = t - 1; }
  }
  return { skipped, endAt, exclude, reason };
}
const isSkipped = (v) => skipState(S.form).skipped.has(v.name);
// A short fingerprint of everything that changes what codes mean. Saved with each article
// so you can tell which articles were coded under which version of the codebook.
function cbHash(cb = S.codebook) {
  const core = JSON.stringify([(cb.vars || []).map((v) => [v.name, v.type, (v.options || []).map((o) => [o.code, o.label]), v.skip || [], v.match || null]), cb.naCode ?? '', cb.missing || []]);
  let h = 0x811c9dc5; for (let i = 0; i < core.length; i++) { h ^= core.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
/* Consistency checks. A categories question can say which earlier Yes/No question each of its
   answers stands for, e.g. V9 dominant framing: 1 -> MARKET, 2 -> GOVERNANCE, 3 -> CAPABILITY,
   0 -> none. Picking 1 then requires MARKET = Yes; picking 0 requires all three to be No. */
function checkIssues(codes) {
  const vs = vars(), sk = skipState(codes).skipped, out = [];
  const lab = (n) => { const i = vs.findIndex((x) => x.name === n); return i < 0 ? n : `${qRef(vs[i], i)} ${n}`; };
  vs.forEach((v, i) => {
    if (!v.match || sk.has(v.name) || !hasVal(codes[v.name])) return;
    const val = codes[v.name], t = v.match[val];
    const linked = [...new Set(Object.values(v.match).filter((x) => x && x !== 'none'))];
    const optLabel = (v.options || []).find((o) => String(o.code) === String(val))?.label || val;
    if (t === 'none') { const yes = linked.filter((n) => Number(codes[n]) === 1); if (yes.length) out.push(`${qRef(v, i)} is ${val} (${optLabel}), but ${yes.map(lab).join(' and ')} ${yes.length > 1 ? 'are' : 'is'} Yes.`); }
    else if (t && Number(codes[t]) !== 1 && !sk.has(t)) out.push(`${qRef(v, i)} is ${val} (${optLabel}), but ${lab(t)} is not Yes.`);
  });
  return out;
}
// Questions that some rule can skip
function skippable() {
  const vs = vars(), out = new Set();
  vs.forEach((v, i) => { for (const r of v.skip || []) { const t = r.to === '__end' || r.to === '__exclude' ? vs.length : vs.findIndex((x) => x.name === r.to); for (let j = i + 1; j < t; j++) out.add(vs[j].name); } });
  return out;
}
function firstUnanswered() { const sk = skipState(S.form).skipped; const i = vars().findIndex((v) => required(v) && !sk.has(v.name) && !isAnswered(v)); return i < 0 ? 0 : i; }
function keepScroll(fn) { const st = $('#formbody').scrollTop; fn(); $('#formbody').scrollTop = st; }
function renderHead() {
  const box = $('#ahead'); box.innerHTML = '';
  const a = S.articles[S.cur]; if (!a) return;
  const m = S.meta;
  box.append(el('div', { class: 'atitle' }, m.headline || S.files[a.fi].name));
  const parts = [m.outlet && (m.country ? `${m.outlet}, ${m.country}` : m.outlet), m.date || m.year].filter(Boolean);
  box.append(el('div', { class: 'ameta' }, el('span', {}, parts.join(', ') || 'Outlet and date not found'), S.logRow ? el('span', { class: 'small', style: 'color:var(--yes)', title: 'Details filled from your sampling log' }, '· from sampling log') : null, el('button', { class: 'link small', onclick: () => { S.editMeta = !S.editMeta; renderHead(); } }, S.editMeta ? 'Done' : 'Edit details')));
  if (!S.editMeta && m.outlet) return;
  const pickOutlet = (o) => { S.meta.outlet = o.outlet; S.meta.country = o.country; renderHead(); };
  const inp = (k, attrs = {}) => el('input', { value: S.meta[k] || '', oninput: (e) => { S.meta[k] = e.target.value; }, onchange: () => renderHead(), ...attrs });
  const outs = outletList();
  box.append(el('div', { class: 'metaedit' },
    outs.length ? el('label', {}, 'Pick') : null, outs.length ? el('div', { class: 'chips' }, outs.map((o) => el('button', { class: o.outlet === S.meta.outlet ? 'on' : '', onclick: () => pickOutlet(o) }, o.outlet))) : null,
    el('label', { for: 'mOutlet' }, 'Outlet'), el('div', { style: 'display:flex;gap:6px' }, inp('outlet', { id: 'mOutlet', placeholder: 'Outlet' }), inp('country', { id: 'mCountry', placeholder: 'Country', 'aria-label': 'Country', style: 'width:130px' })),
    el('label', { for: 'mDate' }, 'Date'), el('div', { style: 'display:flex;gap:6px' }, inp('date', { id: 'mDate', placeholder: 'Date' }), inp('year', { id: 'mYear', placeholder: 'Year', style: 'width:80px' })),
    el('label', { for: 'mHead' }, 'Headline'), inp('headline', { id: 'mHead' })));
}
function renderForm() {
  const body = $('#formbody'); body.innerHTML = ''; $('#notes').innerHTML = '';
  const a = S.articles[S.cur];
  ['#btnSave', '#btnExclude', '#btnClear'].forEach((q) => $(q).disabled = !a);
  $('#btnExclude').style.display = S.mode === 'recode' ? 'none' : '';
  renderHead();
  const toCodebook = () => switchView('codebook');
  if (!vars().length) {
    body.append(el('div', { style: 'padding:20px', class: 'muted' },
      el('h3', { style: 'margin:0 0 8px;color:var(--ink)' }, 'Getting started'),
      el('ol', { style: 'margin:0 0 14px;padding-left:20px;line-height:1.7' },
        el('li', {}, 'Write your questions in ', el('button', { class: 'link', onclick: toCodebook }, 'Codebook'), ', or paste them in all at once.'),
        el('li', {}, 'Optional: in ', el('button', { class: 'link', onclick: () => switchView('settings') }, 'Settings'), ', list your outlets so Chota can spot them, and set a target and deadline.'),
        el('li', {}, 'Add your PDFs. In Chrome or Edge, choose ', el('b', {}, 'Save to a folder'), ' in the library to keep everything between visits.')),
      el('button', { class: 'primary', onclick: toCodebook }, 'Set up the codebook')));
    $('#formMsg').classList.remove('on'); return;
  }
  if (!a) { body.append(el('p', { class: 'muted', style: 'padding:20px' }, 'Open an article to see the coding questions.')); $('#formMsg').classList.remove('on'); return; }
  const rec = S.mode === 'recode' ? S.recodes[a.key] : S.records[a.key];
  if (S.mode === 'recode') $('#notes').append(el('div', { class: 'note info' }, 'Recoding. Your first codes are hidden, so code this article fresh.'));
  if (rec) $('#notes').append(el('div', { class: 'note ok' }, rec.excluded ? 'Excluded. Change the answers and save to include it again.' : `Coded ${new Date(rec.savedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}. Saving again replaces those codes.`));
  const st = skipState(S.form);
  vars().forEach((v, qi) => {
    const val = S.form[v.name];
    if (st.skipped.has(v.name)) {
      const na = naCode();
      body.append(el('div', { class: 'qrow skipped', 'data-q': qi }, el('div', { class: 'qn' }, qRef(v, qi)), el('div', { class: 'ql' }, v.label || v.name), el('span', { class: 'skiptag' }, 'Skipped' + (na !== '' && v.type !== 'text' ? ` (${na})` : ''))));
      return;
    }
    const row = el('div', { class: 'qrow' + (qi === S.activeQ ? ' act' : '') + (isAnswered(v) ? ' done' : '') + (S.confirmMissing && required(v) && !isAnswered(v) ? ' miss' : ''), 'data-q': qi, onclick: () => { if (S.activeQ !== qi) { S.activeQ = qi; markActive(); } } },
      el('div', { class: 'qn' }, qRef(v, qi)), el('div', { class: 'ql' }, v.label || v.name));
    if (v.type === 'binary') {
      row.append(el('div', { class: 'yn' },
        el('button', { class: 'y' + (val === 1 ? ' sel' : ''), title: 'Yes (1 or Y)', onclick: (e) => { e.stopPropagation(); answer(qi, 1); } }, 'Yes'),
        el('button', { class: 'n' + (val === 0 ? ' sel' : ''), title: 'No (0 or N)', onclick: (e) => { e.stopPropagation(); answer(qi, 0); } }, 'No')));
    } else row.append(el('span'));
    if (v.help || v.name) row.append(el('div', { class: 'qh' }, v.help ? v.help + ' ' : '', el('code', {}, v.name)));
    if (v.type === 'single') {
      row.append(el('div', { class: 'opts wide' }, (v.options || []).map((o) => el('button', { class: val === o.code ? 'sel' : '', onclick: (e) => { e.stopPropagation(); answer(qi, o.code); } }, el('span', { class: 'k' }, String(o.code)), o.label))));
    } else if (v.type === 'number') {
      row.append(el('div', { class: 'wide' }, el('input', { type: 'number', 'aria-label': v.label, value: val ?? '', onfocus: () => { S.activeQ = qi; markActive(); }, oninput: (e) => { S.form[v.name] = e.target.value === '' ? '' : Number(e.target.value); } })));
    } else if (v.type === 'text') {
      const ta = el('textarea', { rows: 2, 'aria-label': v.label, onfocus: () => { S.activeQ = qi; markActive(); }, oninput: (e) => { const had = skipState(S.form); S.form[v.name] = e.target.value; const now = skipState(S.form); if (now.skipped.size !== had.skipped.size || now.endAt !== had.endAt) keepScroll(renderForm); } }, val ?? '');
      const presets = (v.options || []).length ? el('div', { class: 'opts' }, v.options.map((o) => el('button', { class: String(val ?? '') === String(o.code) ? 'sel' : '', onclick: (e) => { e.stopPropagation(); answer(qi, String(val ?? '') === String(o.code) ? '' : String(o.code)); } }, el('span', { class: 'k' }, String(o.code)), o.label))) : null;
      row.append(el('div', { class: 'wide', style: 'display:flex;flex-direction:column;gap:6px' }, ta, presets));
    }
    body.append(row);
  });
  if (st.endAt >= 0) body.append(el('div', { class: 'note ' + (st.exclude ? 'warn' : 'info'), style: 'margin:12px 20px' }, `Coding ends at ${st.reason}. ${st.exclude ? 'This article will be saved as excluded, with its answers kept.' : 'The remaining questions are skipped.'} Press Enter to save.`));
  const miss = vars().filter((v) => required(v) && !st.skipped.has(v.name) && !isAnswered(v)).length;
  const issues = S.confirmMissing ? checkIssues(S.form) : [];
  const fm = $('#formMsg');
  fm.classList.toggle('on', !!(S.confirmMissing && (miss || issues.length)));
  fm.innerHTML = '';
  if (miss) fm.append(el('div', {}, `${miss} question${miss > 1 ? 's are' : ' is'} unanswered and will be saved as missing.`));
  for (const t of issues) fm.append(el('div', {}, 'Check: ' + t));
  fm.append(el('div', {}, 'Fix it, or press Enter again to save anyway.'));
}
// Asks why an article is excluded. Resolves to the reason, or null when cancelled.
function askReason(prev) {
  const reasons = S.codebook.excludeReasons?.length ? S.codebook.excludeReasons : DEFAULT_REASONS;
  return new Promise((res) => {
    $('#mBody').innerHTML = '';
    const other = el('input', { id: 'reasonOther', placeholder: 'Or type a reason', style: 'width:100%;margin-top:8px', value: prev && !reasons.includes(prev) ? prev : '' });
    const done = (v) => { $('#modal').classList.remove('on'); $('#mOk').textContent = 'OK'; $('#mOk').onclick = $('#mCancel').onclick = null; res(v); };
    $('#mBody').append(el('h3', {}, 'Why is this article excluded?'), el('p', { class: 'small mute' }, 'The reason is saved with the article and included in the export. Press a number to choose.'),
      el('div', { id: 'reasonList', class: 'opts', style: 'flex-direction:column;align-items:stretch' }, reasons.map((r, i) => el('button', { class: r === prev ? 'sel' : '', style: 'text-align:left;border-radius:var(--r)', onclick: () => done(r) }, el('span', { class: 'k' }, String(i + 1)), r))), other);
    $('#mOk').textContent = 'Save'; $('#modal').classList.add('on');
    $('#mOk').onclick = () => { const t = other.value.trim(); if (t) done(t); else if (prev) done(prev); else other.focus(); };
    $('#mCancel').onclick = () => done(null);
  });
}
function markActive() {
  document.querySelectorAll('#formbody .qrow').forEach((n) => n.classList.toggle('act', +n.dataset.q === S.activeQ));
  const n = document.querySelector(`#formbody .qrow[data-q="${S.activeQ}"]`); if (n) n.scrollIntoView({ block: 'nearest' });
}
function answer(qi, val) {
  const v = vars()[qi];
  S.form[v.name] = S.form[v.name] === val || val === '' ? undefined : val;
  // advance to the next question that is not skipped and still needs an answer
  if (S.form[v.name] !== undefined) {
    const vs = vars(), sk = skipState(S.form).skipped;
    let j = qi + 1;
    while (j < vs.length && (sk.has(vs[j].name) || (!required(vs[j]) && isAnswered(vs[j])))) j++;
    S.activeQ = j < vs.length ? j : qi;
  }
  const st = $('#formbody').scrollTop; renderForm(); $('#formbody').scrollTop = st; markActive();
}
function moveActive(dir) {
  const vs = vars(), sk = skipState(S.form).skipped;
  let j = S.activeQ + dir;
  while (j >= 0 && j < vs.length && sk.has(vs[j].name)) j += dir;
  if (j >= 0 && j < vs.length) { S.activeQ = j; markActive(); }
}
// Lets codes with two or more digits (97, 98) be typed: digits are collected briefly before they count
let digitBuf = '', digitT = null;
function typeCode(v, key) {
  const codes = (v.options || []).map((o) => String(o.code));
  const fits = (b) => codes.some((c) => c.startsWith(b));
  let buf = digitBuf + key;
  if (!fits(buf)) buf = key;
  clearTimeout(digitT);
  if (!fits(buf)) { digitBuf = ''; return false; }
  digitBuf = buf;
  const fire = () => { const b = digitBuf; digitBuf = ''; const o = (v.options || []).find((x) => String(x.code) === b); if (o) answer(S.activeQ, o.code); };
  if (codes.includes(buf) && !codes.some((c) => c !== buf && c.startsWith(buf))) fire(); else digitT = setTimeout(fire, 600);
  return true;
}
async function save(excluded = false) {
  const a = S.articles[S.cur]; if (!a) return;
  const st = skipState(S.form);
  const miss = vars().filter((v) => required(v) && !st.skipped.has(v.name) && !isAnswered(v)).length;
  const codes = {}; for (const v of vars()) if (isAnswered(v) && !st.skipped.has(v.name)) codes[v.name] = S.form[v.name];
  const issues = excluded ? [] : checkIssues(codes);
  if (!excluded && (miss || issues.length) && !S.confirmMissing) { S.confirmMissing = true; const sc = $('#formbody').scrollTop; renderForm(); $('#formbody').scrollTop = sc; return; }
  if (!excluded && st.exclude) { excluded = 'rule'; }
  const secs = Math.round((Date.now() - S.openedAt) / 1000);
  const f = S.files[a.fi];
  if (S.mode === 'recode') {
    const prev = S.recodes[a.key];
    S.recodes[a.key] = { key: a.key, codes, seconds: (prev?.seconds || 0) + secs, savedAt: Date.now(), cbv: cbHash(), coder: S.dir?.coder || '' };
    persistRecode(S.recodes[a.key]);
  } else {
    const prev = S.records[a.key];
    let reason = '';
    if (excluded) { reason = await askReason(prev?.exclude_reason); if (reason === null) return; }
    const r = { key: a.key, file: f.name, page_start: a.start, page_end: a.end, meta: { ...S.meta }, codes: excluded === true ? {} : codes, excluded: excluded ? 1 : 0, exclude_reason: reason,
      coder: S.dir?.coder || '', cbv: cbHash(), flags: issues.join(' '), logKey: S.logRow && S.sampling ? S.logRow[S.sampling.key] : prev?.logKey,
      seconds: (prev?.seconds || 0) + secs, firstSavedAt: prev?.firstSavedAt || Date.now(), savedAt: Date.now() };
    S.records[a.key] = r; persistRecord(r);
  }
  toast(excluded ? 'Excluded' : 'Saved');
  renderProgress(); renderQueue();
  await goNext(S.cur);
}
async function goNext(from) {
  const items = queueItems();
  const pos = items.findIndex((it) => it.i === from);
  for (let k = pos + 1; k < items.length; k++) if (items[k].i >= 0 && !isDone(items[k].key)) return openArticle(items[k].i);
  for (let k = 0; k <= pos; k++) if (items[k].i >= 0 && !isDone(items[k].key)) return openArticle(items[k].i);
  if (from < 0 && S.articles.length) return openArticle(0);
  renderQueue();
  if (S.mode === 'recode') toast('All loaded sample articles are recoded. See the Reliability tab.', 3500);
  else if (S.articles.length) toast('Every loaded article is coded.', 3000);
}
function step(dir) {
  const items = queueItems().filter((it) => it.i >= 0);
  const pos = items.findIndex((it) => it.i === S.cur);
  const n = items[pos + dir]; if (n) openArticle(n.i);
}

/* ---------- split / merge ---------- */
async function splitHere() {
  const a = S.articles[S.cur]; if (!a || a.end <= a.start) return;
  const ok = await ask(`<h3>Split this article</h3><div class="small mute">This article covers pages ${a.start}–${a.end}. The current article will end at the page you give; the following pages become a new article.</div><p><label>Last page of this article <input id="splitP" type="number" min="${a.start}" max="${a.end - 1}" value="${a.start}" style="width:80px"></label></p>`, 'Split');
  if (!ok) return;
  const p = +document.getElementById('splitP').value;
  if (!(p >= a.start && p < a.end)) { toast('Page out of range'); return; }
  const f = S.files[a.fi];
  f.starts = [...new Set([...f.starts, p + 1])].sort((x, y) => x - y);
  if (f.pages) f.metaByStart[p + 1] = guessMeta(f.pages.slice(p, p + 2).flat(), f.name);
  S.fileSplits = S.fileSplits || {}; (S.fileSplits[f.name] = S.fileSplits[f.name] || []).push(p + 1);
  if (S.records[a.key]) { const r = S.records[a.key]; r.page_end = p; persistRecord(r); }
  rebuildArticles(); openArticle(S.articles.findIndex((x) => x.key === a.key));
}
async function mergeNext() {
  const a = S.articles[S.cur], b = S.articles[S.cur + 1];
  if (!a || !b || b.fi !== a.fi) return;
  if (S.records[b.key] && !(await ask(`<h3>Merge?</h3><div class="small">The next article (pages ${b.start}–${b.end}) is already coded. Merging deletes its codes.</div>`, 'Merge'))) return;
  const f = S.files[a.fi];
  f.starts = f.starts.filter((s) => s !== b.start);
  if (S.fileSplits?.[f.name]) S.fileSplits[f.name] = S.fileSplits[f.name].filter((s) => s !== b.start);
  if (S.records[b.key]) deleteRecord(b.key);
  if (S.records[a.key]) { const r = S.records[a.key]; r.page_end = b.end; persistRecord(r); }
  rebuildArticles(); openArticle(S.articles.findIndex((x) => x.key === a.key));
}

/* ---------- progress ---------- */
function renderProgress() {
  const recs = Object.values(S.records);
  const done = recs.length, target = Math.max(0, Math.round(+S.settings.target || 0));
  $('#progText').innerHTML = target ? `<b>${done}</b> of ${target} coded` : `<b>${done}</b> coded`;
  $('#progBar').parentElement.style.display = target ? '' : 'none';
  $('#progBar').style.width = target ? Math.min(100, (done / target) * 100) + '%' : '0';
  const today = todayStr();
  const nToday = recs.filter((r) => dayOf(r.firstSavedAt || r.savedAt) === today).length;
  let pace = `${nToday} today`;
  if (S.settings.deadline && target) {
    const dl = new Date(S.settings.deadline + 'T23:59:59'); const now = new Date();
    const days = Math.max(1, Math.ceil((dl - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000));
    const left = Math.max(0, target - done + nToday);
    pace += left > 0 ? `, ${Math.ceil(left / days)} a day to finish on time` : ', target reached';
  }
  const timed = recs.filter((r) => r.seconds > 0 && r.seconds < 3600);
  if (timed.length >= 3) { const avg = timed.reduce((s, r) => s + r.seconds, 0) / timed.length; $('#paceText').title = `About ${avg < 90 ? Math.round(avg) + ' seconds' : (avg / 60).toFixed(1) + ' minutes'} per article`; }
  $('#paceText').textContent = pace;
}

/* ---------- codebook editor ---------- */
function sanitizeName(s) { let x = (s || '').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, ''); if (!/^[A-Za-z]/.test(x)) x = 'v' + x; return x.slice(0, 64); }
const RESERVED = ['article_id', 'file', 'folder', 'page_start', 'page_end', 'outlet', 'outlet_name', 'country', 'country_name', 'year', 'pub_date', 'headline', 'word_count', 'excluded', 'coder', 'coded_at', 'coding_seconds'];
function optText(v) { return (v.options || []).map((o) => `${o.code}=${o.label}`).join('; '); }
function parseOpts(t) { return t.split(/[;\n]/).map((s) => s.trim()).filter(Boolean).map((s, i) => { const m = s.match(/^(-?\d+(?:\.\d+)?)\s*[=:]\s*(.+)$/); return m ? { code: Number(m[1]), label: m[2].trim() } : { code: i + 1, label: s }; }); }
function renderCodebook() {
  const box = $('#vlist'); box.innerHTML = '';
  const na = S.codebook.naCode;
  $('#cbNa').value = na === '' || na == null ? '' : na;
  $('#cbMissing').value = (S.codebook.missing || []).join(', ');
  $('#cbReasons').value = (S.codebook.excludeReasons?.length ? S.codebook.excludeReasons : DEFAULT_REASONS).join('\n');
  // version and lock
  const h = cbHash(), recs = Object.values(S.records), older = recs.filter((r) => r.cbv && r.cbv !== h).length, same = recs.filter((r) => r.cbv === h).length;
  const locked = !!S.codebook.locked;
  $('#cbState').innerHTML = '';
  $('#cbState').append(
    el('div', { class: 'note ' + (older ? 'warn' : 'info'), style: 'margin:0 0 14px' },
      el('div', {}, `Codebook version ${h}. `, recs.length ? `${same} coded article${same === 1 ? '' : 's'} used this version` + (older ? `; ${older} used an earlier version, so check that changes since then don't alter what their codes mean.` : '.') : 'No articles coded yet.'),
      locked ? el('div', { style: 'margin-top:6px' }, el('b', {}, 'Locked. '), 'Questions and codes cannot be edited, so every coder works from the same version. ', el('button', { class: 'link', onclick: async () => { if (await ask('<h3>Unlock the codebook?</h3><p class="small">Changes made after coding has started can make earlier codes mean something different. Each coded article keeps the version it was coded with.</p>', 'Unlock')) { S.codebook.locked = false; persistCodebook(); renderCodebook(); } } }, 'Unlock')) : null));
  document.querySelector('#v-codebook').classList.toggle('cblocked', locked);
  const vs = vars();
  vs.forEach((v, i) => {
    const row = el('div', { class: 'vrow' },
      el('div', { class: 'num', title: 'Question number' }, qRef(v, i)),
      el('input', { value: v.name, title: 'Variable name (column in SPSS)', onchange: (e) => {
        const n = sanitizeName(e.target.value);
        if (RESERVED.includes(n.toLowerCase()) || vs.some((x, j) => j !== i && x.name.toLowerCase() === n.toLowerCase())) { toast('That name is taken'); e.target.value = v.name; return; }
        for (const x of vs) for (const r of x.skip || []) if (r.to === v.name) r.to = n;
        v.name = n; e.target.value = n; persistCodebook(); renderCodebook();
      } }),
      el('input', { value: v.label || '', placeholder: 'Question', onchange: (e) => { v.label = e.target.value; persistCodebook(); } }),
      el('div', { class: 'seg' }, [['binary', '1/0'], ['single', 'Categories'], ['number', 'Number'], ['text', 'Text']].map(([k, l]) => el('button', { class: v.type === k ? 'on' : '', title: k === 'binary' ? 'Yes = 1, No = 0' : k === 'single' ? 'Numbered categories, such as 0, 1, 98' : '', onclick: () => { v.type = k; if (k === 'single' && !v.options?.length) v.options = [{ code: 1, label: 'Option A' }, { code: 2, label: 'Option B' }]; persistCodebook(); renderCodebook(); } }, l))),
      el('div', { style: 'display:flex;gap:2px' },
        el('button', { class: 'quiet', title: 'Move up', onclick: () => { if (i) { [vs[i - 1], vs[i]] = [vs[i], vs[i - 1]]; persistCodebook(); renderCodebook(); } } }, '↑'),
        el('button', { class: 'quiet', title: 'Move down', onclick: () => { if (i < vs.length - 1) { [vs[i + 1], vs[i]] = [vs[i], vs[i + 1]]; persistCodebook(); renderCodebook(); } } }, '↓'),
        el('button', { class: 'quiet', title: 'Delete', onclick: async () => {
          if (!(await ask(`Delete <b>${esc(v.name)}</b>? Codes already saved for it stay in the backup but leave the export.`, 'Delete'))) return;
          vs.splice(i, 1); for (const x of vs) if (x.skip) x.skip = x.skip.filter((r) => r.to !== v.name);
          persistCodebook(); renderCodebook();
        } }, '✕')));
    if (v.type === 'single') row.append(el('input', { class: 'opttext', value: optText(v), placeholder: '0=No; 1=Yes; 98=Cannot determine', title: 'Codes and their labels, separated by semicolons', onchange: (e) => { v.options = parseOpts(e.target.value); e.target.value = optText(v); persistCodebook(); renderCodebook(); } }));
    if (v.type === 'text') row.append(el('input', { class: 'opttext', value: optText(v), placeholder: 'Preset answers shown as buttons (optional), e.g. 0=No main actor', onchange: (e) => { v.options = e.target.value.trim() ? parseOpts(e.target.value) : []; e.target.value = optText(v); persistCodebook(); renderCodebook(); } }));
    row.append(el('input', { class: 'helptext', value: v.help || '', placeholder: 'Coding instructions shown under the question (optional)', onchange: (e) => { v.help = e.target.value; persistCodebook(); } }));
    row.append(rulesEl(v, i));
    box.append(row);
  });
  document.querySelectorAll('#v-codebook .lockable input, #v-codebook .lockable select, #v-codebook .lockable textarea, #v-codebook .lockable button').forEach((n) => { n.disabled = locked; });
}
function downloadCodebook(lock) {
  const cb = JSON.parse(JSON.stringify(S.codebook)); if (lock) cb.locked = true;
  offer(`codebook_${cbHash()}_${todayStr()}.json`, JSON.stringify({ app: 'chota-codebook', version: 1, exportedAt: new Date().toISOString(), codebookVersion: cbHash(), codebook: cb }, null, 1));
}
// "If the answer is X, end coding / skip to question Y" rules under each question
function rulesEl(v, i) {
  const vs = vars(), wrap = el('div', { class: 'rules' });
  const answers = v.type === 'binary' ? [{ code: 0, label: 'No' }, { code: 1, label: 'Yes' }] : (v.options || []);
  const asCode = (s) => (s !== '' && !isNaN(Number(s)) ? Number(s) : s);
  if (v.type !== 'text') {
    const line = el('div', { class: 'rule' }, el('span', {}, 'Measure in SPSS'),
      el('select', { 'aria-label': 'Measure', onchange: (e) => { v.measure = e.target.value; persistCodebook(); } },
        [['nominal', 'Nominal'], ['ordinal', 'Ordinal'], ['scale', 'Scale']].map(([k, l]) => el('option', { value: k, selected: (v.measure || (v.type === 'number' ? 'scale' : 'nominal')) === k }, l))));
    // V9-style check: which earlier Yes/No question each answer stands for
    const bins = vs.slice(0, i).filter((x) => x.type === 'binary');
    if (v.type === 'single' && bins.length) {
      const txt = v.match ? Object.entries(v.match).map(([c, n]) => `${c}=${n}`).join('; ') : '';
      line.append(el('span', { style: 'margin-left:10px' }, 'Must match a Yes answer'),
        el('input', { value: txt, style: 'flex:1;min-width:200px', placeholder: `e.g. ${(v.options || []).slice(0, 2).map((o, k) => `${o.code}=${bins[k % bins.length].name}`).join('; ')}; 0=none`, title: `Link answers to earlier Yes/No questions (${bins.map((b) => b.name).join(', ')}). "none" means all of them must be No.`,
          onchange: (e) => {
            const m = {};
            for (const part of e.target.value.split(/[;,]/)) { const x = part.trim().match(/^(-?\d+)\s*=\s*(\w+)$/); if (!x) continue; const t = x[2].toLowerCase() === 'none' ? 'none' : (bins.find((b) => b.name.toLowerCase() === x[2].toLowerCase()) || {}).name; if (t) m[x[1]] = t; }
            if (Object.keys(m).length) v.match = m; else delete v.match;
            e.target.value = v.match ? Object.entries(v.match).map(([c, n]) => `${c}=${n}`).join('; ') : '';
            persistCodebook();
          } }));
    }
    wrap.append(line);
  }
  (v.skip || []).forEach((r, k) => {
    const whenEl = answers.length
      ? el('select', { 'aria-label': 'Answer', onchange: (e) => { r.when = asCode(e.target.value); persistCodebook(); } }, answers.map((o) => el('option', { value: o.code, selected: String(o.code) === String(r.when) }, `${o.code} ${o.label}`)))
      : el('input', { 'aria-label': 'Answer', value: r.when ?? '', style: 'width:90px', onchange: (e) => { r.when = asCode(e.target.value.trim()); persistCodebook(); } });
    const toEl = el('select', { 'aria-label': 'Then', onchange: (e) => { r.to = e.target.value; persistCodebook(); } },
      el('option', { value: '__exclude', selected: r.to === '__exclude' }, 'end coding and mark the article excluded'),
      el('option', { value: '__end', selected: r.to === '__end' }, 'end coding'),
      vs.slice(i + 2).map((x, j) => el('option', { value: x.name, selected: r.to === x.name }, `skip to ${qRef(x, i + 2 + j)}${x.label ? ': ' + x.label.slice(0, 50) : ' ' + x.name}`)));
    wrap.append(el('div', { class: 'rule' }, el('span', {}, 'If the answer is'), whenEl, el('span', {}, 'then'), toEl,
      el('button', { class: 'quiet', title: 'Remove this rule', 'aria-label': 'Remove this rule', onclick: () => { v.skip.splice(k, 1); persistCodebook(); renderCodebook(); } }, '✕')));
  });
  wrap.append(el('div', {}, el('button', { class: 'link small', onclick: () => { (v.skip = v.skip || []).push({ when: answers[0]?.code ?? '', to: '__exclude' }); persistCodebook(); renderCodebook(); } }, '+ Skip rule')));
  return wrap;
}

/* ---------- reading a codebook from a document ---------- */
const MISSING_RE = /not applicable|cannot determine|can.?t (tell|determine)|unsure|don.?t know|missing|refused|no answer/i;
async function docxLines(file) {
  const zip = await JSZip.loadAsync(file);
  const xml = zip.file('word/document.xml'); if (!xml) throw new Error('That file has no Word document text.');
  const doc = new DOMParser().parseFromString(await xml.async('string'), 'application/xml');
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const ptext = (p) => { let s = ''; for (const n of p.getElementsByTagNameNS(W, '*')) { if (n.localName === 't') s += n.textContent; else if (n.localName === 'tab' || n.localName === 'br') s += ' '; } return s.trim(); };
  const body = doc.getElementsByTagNameNS(W, 'body')[0], out = [];
  for (const node of body ? body.children : []) {
    if (node.localName === 'p') out.push(ptext(node));
    else if (node.localName === 'tbl') {
      for (const tr of node.getElementsByTagNameNS(W, 'tr')) {
        const cells = [...tr.children].filter((c) => c.localName === 'tc').map((tc) => [...tc.getElementsByTagNameNS(W, 'p')].map(ptext).filter(Boolean).join('; '));
        out.push(cells.join(' | '));
      }
    }
  }
  return out;
}
/* Understands codebooks written as numbered variables, for example
     V3  ELIGIBLE                       or   V1 Does the account have a profile photo?
     Question | Is AI a substantive ...      0=Egg (skip to Section 2)
     Codes | 0 No; 1 Yes                     1=other image
     Skip | If 0, stop ...
   plus a table of codes used throughout, such as "97 | Not applicable". */
function parseCodebookDoc(lines) {
  const blocks = [], sections = {}, global = {};
  let cur = null, pendingSec = null;
  for (const raw of lines) {
    const line = String(raw).replace(/\s+/g, ' ').trim(); if (!line) continue;
    const sec = line.match(/^section\s+(\d+)\b/i); if (sec) { pendingSec = 'section ' + sec[1]; continue; }
    const gc = line.match(/^(-?\d{2,})\s*\|\s*(.+)$/); if (gc) { global[gc[1]] = gc[2]; continue; }
    // headings such as "8 Derived variables", "A. Screening" or "References" close the current question
    if (!line.includes('|') && (/^(\d+(\.\d+)*|[A-Z])[.)]?\s+[A-Z][a-z]/.test(line) || /^references?$/i.test(line))) { cur = null; continue; }
    const h = line.match(/^(V\d+(?:\.\d+)*)\b[\s.:)-]*(.*)$/);
    if (h && !line.includes('|') && !/^\d/.test(h[2])) {
      cur = { ref: h[1], rest: h[2].trim(), opts: [], hints: [], fields: {}, extra: [] }; blocks.push(cur);
      if (pendingSec) { sections[pendingSec] = cur; pendingSec = null; }
      continue;
    }
    if (!cur) continue;
    const f = line.match(/^(Question|Codes?|Rules?|Examples?|Skip|Check|Notes?|Definition)\s*\|\s*(.*)$/i);
    if (f) { const k = f[1].toLowerCase().replace(/s$/, ''); cur.fields[k] = (cur.fields[k] ? cur.fields[k] + ' ' : '') + f[2]; continue; }
    const o = line.match(/^(-?\d+)\s*=\s*(.*)$/);
    if (o) { cur.opts.push({ code: Number(o[1]), label: o[2].trim() }); continue; }
    if (!/^if (yes|no)$/i.test(line) && !line.includes('|')) cur.extra.push(line);
  }
  // codes used throughout
  const missing = [], dropped = [];
  let na = '';
  for (const [c, m] of Object.entries(global)) if (MISSING_RE.test(m)) { missing.push(Number(c)); if (na === '' && /not applicable/i.test(m)) na = Number(c); }
  const vs = [], seen = new Set(), byRef = {};
  for (const b of blocks) {
    const isName = /^[A-Z][A-Z0-9_]*$/.test(b.rest);
    let name = sanitizeName(isName ? b.rest : b.ref.replace(/\./g, '_'));
    if (/^coder(_?id)?$/i.test(name)) { dropped.push(`${b.ref} ${b.rest}: Chota records the coder for you`); continue; }
    if (RESERVED.includes(name.toLowerCase())) name = sanitizeName(b.ref + '_' + name);
    while (seen.has(name.toLowerCase())) name += '_2';
    seen.add(name.toLowerCase());
    const codesText = b.fields.code || '';
    const opts = b.opts.slice();
    for (const part of codesText.split(/;\s*/)) { const m = part.trim().match(/^(-?\d+)\s*[=:.)-]?\s+(.+)$/); if (m) opts.push({ code: Number(m[1]), label: m[2].trim() }); }
    // "(skip to Section 2)" written after an option
    for (const o of opts) {
      const m = o.label.match(/\(\s*skip to ([^)]+)\)\s*$/i);
      if (m) { b.hints.push({ when: o.code, target: m[1].trim() }); o.label = o.label.slice(0, m.index).trim(); }
      if (MISSING_RE.test(o.label) && !missing.includes(o.code)) missing.push(o.code);
    }
    const writeIn = /write[- ]?in|write the name/i.test(codesText + ' ' + b.rest + ' ' + b.extra.join(' '));
    const codes = opts.map((o) => o.code).sort((x, y) => x - y).join(',');
    const yesNo = codes === '0,1' && /^no\b/i.test(opts.find((o) => o.code === 0).label) && /^yes\b/i.test(opts.find((o) => o.code === 1).label);
    const v = { name, ref: b.ref, label: (b.fields.question || (isName ? b.rest : b.rest) || name).trim() };
    if (writeIn || !opts.length) { v.type = 'text'; if (opts.length) v.options = opts; }
    else if (yesNo) v.type = 'binary';
    else { v.type = 'single'; v.options = opts; }
    const help = [b.fields.rule, b.fields.example && 'Examples: ' + b.fields.example, b.fields.check && 'Check: ' + b.fields.check, ...b.extra].filter(Boolean).join(' ');
    if (help) v.help = help;
    v._b = b; vs.push(v); byRef[b.ref.toLowerCase()] = v;
  }
  // skip rules
  const findTarget = (t) => { t = t.toLowerCase().trim(); const blk = sections[t.replace(/^section\s*/, 'section ')]; return byRef[t] || (blk && vs.find((x) => x._b === blk)) || null; };
  vs.forEach((v, i) => {
    const b = v._b, rules = [];
    for (const hnt of b.hints) { const t = findTarget(hnt.target); if (t) rules.push({ when: hnt.when, to: t.name }); }
    const sk = b.fields.skip || '';
    const w = sk.match(/\bif\s+(-?\d+)\b/i);
    if (w) {
      const when = Number(w[1]);
      const goTo = sk.match(/skip to (V\d+(?:\.\d+)*|section \d+)/i);
      const refs = [...sk.matchAll(/\b(V\d+(?:\.\d+)*)\s*=\s*(-?\d+)/gi)];
      if (goTo) { const t = findTarget(goTo[1]); if (t) rules.push({ when, to: t.name }); }
      else if (refs.length) {
        const last = Math.max(...refs.map((m) => vs.indexOf(byRef[m[1].toLowerCase()])));
        if (last >= 0) rules.push({ when, to: last + 1 < vs.length ? vs[last + 1].name : '__end' });
        if (na === '') { const n = Number(refs[0][2]); if (missing.includes(n) || n >= 90) na = n; }
      } else if (/\b(stop|end)\b/i.test(sk)) rules.push({ when, to: '__exclude' });
    }
    if (rules.length) v.skip = rules;
    // "V9 must be one of the framings coded 1 in V6 to V8"
    const rg = `${b.fields.check || ''} ${b.fields.rule || ''}`.match(/coded 1 in (V\d+(?:\.\d+)*) to (V\d+(?:\.\d+)*)/i);
    if (v.type === 'single' && rg) {
      const i1 = vs.indexOf(byRef[rg[1].toLowerCase()]), i2 = vs.indexOf(byRef[rg[2].toLowerCase()]);
      if (i1 >= 0 && i2 >= i1) {
        const linked = vs.slice(i1, i2 + 1).filter((x) => x.type === 'binary'), m = {};
        for (const o of v.options || []) {
          if (/\bnone\b|neither/i.test(o.label)) { m[o.code] = 'none'; continue; }
          const ol = normCol(o.label);
          const t = ol && linked.find((x) => normCol(x.name).includes(ol) || ol.includes(normCol(x.name)));
          if (t) m[o.code] = t.name;
        }
        if (Object.keys(m).length) v.match = m;
      }
    }
  });
  for (const v of vs) delete v._b;
  return { vars: vs, naCode: na, missing: [...new Set(missing)].sort((a, b) => a - b), dropped };
}
function describeRule(r, vs) { const t = r.to === '__exclude' ? 'end coding, excluded' : r.to === '__end' ? 'end coding' : 'skip to ' + (() => { const i = vs.findIndex((x) => x.name === r.to); return i < 0 ? r.to : qRef(vs[i], i); })(); return `if ${r.when}: ${t}`; }
async function importCodebook(file) {
  let parsed;
  try {
    if (/\.json$/i.test(file.name)) {
      const d = JSON.parse(await file.text());
      const cb = d.app === 'chota-codebook' || d.app === 'chota' || d.app === 'corpus-coder' ? d.codebook : null;
      if (!cb || !Array.isArray(cb.vars)) throw new Error('that file has no Chota codebook in it');
      parsed = { vars: cb.vars, naCode: cb.naCode ?? '', missing: cb.missing || [], dropped: [], extra: { excludeReasons: cb.excludeReasons, locked: cb.locked } };
    } else {
      const lines = /\.docx$/i.test(file.name) ? await docxLines(file) : (await file.text()).split(/\r?\n/);
      parsed = parseAnyCodebook(lines);
    }
  } catch (e) { console.warn(e); toast('Could not read that file: ' + (e.message || e), 5000); return; }
  if (!parsed.vars.length) { await ask('<h3>No questions found</h3><p class="small">Chota looks for variables that start with a number such as <code>V3</code>, or lines written as <code>name | question | type | rule</code>. You can also add questions one by one.</p>', 'OK'); return; }
  applyParsedCodebook(parsed, file.name);
}
function parseAnyCodebook(lines) {
  if (lines.some((l) => /^\s*V\d+(\.\d+)*\b/.test(l))) { const p = parseCodebookDoc(lines); if (p.vars.length) return p; }
  return { vars: parseBulk(lines.join('\n')), naCode: S.codebook.naCode ?? '', missing: S.codebook.missing || [], dropped: [] };
}
async function applyParsedCodebook(p, source) {
  const vs = p.vars;
  const typeTxt = (v) => v.type === 'binary' ? '0/1' : v.type === 'single' ? v.options.map((o) => o.code).join(', ') : v.type === 'text' ? 'text' + (v.options?.length ? ' or ' + v.options.map((o) => o.code).join(', ') : '') : v.type;
  const list = vs.map((v, i) => `<tr><td>${esc(qRef(v, i))}</td><td><b>${esc(v.name)}</b><div class="mute">${esc((v.label || '').slice(0, 90))}</div></td><td>${esc(typeTxt(v))}</td><td>${esc([...(v.skip || []).map((r) => describeRule(r, vs)), v.match ? 'must match ' + Object.entries(v.match).map(([c, n]) => `${c}=${n}`).join(', ') : ''].filter(Boolean).join('; '))}</td></tr>`).join('');
  const ok = await ask(`<h3>Use this codebook?</h3><p class="small">${vs.length} question${vs.length === 1 ? '' : 's'}${source ? ' from ' + esc(source) : ''}. ${p.missing.length ? `Missing-value codes: <b>${p.missing.join(', ')}</b>. ` : ''}${p.naCode !== '' ? `Skipped questions export as <b>${p.naCode}</b>. ` : ''}Everything can be changed afterwards.</p>${p.dropped.length ? `<p class="small mute">Left out: ${p.dropped.map(esc).join('; ')}.</p>` : ''}<div style="max-height:45vh;overflow:auto;border:1px solid var(--rule)"><table class="small"><tr><th></th><th>Question</th><th>Codes</th><th>Skip rules</th></tr>${list}</table></div><p class="small" style="margin-top:10px">This replaces your current questions. Codes already saved keep their values.</p>`, 'Use this codebook');
  if (!ok) return;
  S.codebook = { vars: vs, naCode: p.naCode, missing: p.missing, excludeReasons: p.extra?.excludeReasons || S.codebook.excludeReasons, locked: !!p.extra?.locked };
  persistCodebook(); renderCodebook(); renderForm(); toast(S.codebook.locked ? 'Codebook loaded and locked' : 'Codebook loaded');
}

/* ---------- the one-line-per-question text format ---------- */
// name | question | type | coding rule | skip: 0=exclude; 0=end; 1=V9
function parseRules(t) { return t.split(/[;,]/).map((s) => s.trim()).filter(Boolean).map((s) => { const m = s.match(/^(-?\w+)\s*[=:>]+\s*(.+)$/); if (!m) return null; const to = m[2].trim(), when = isNaN(Number(m[1])) ? m[1] : Number(m[1]); return { when, to: /^exclude/i.test(to) ? '__exclude' : /^end/i.test(to) ? '__end' : to }; }).filter(Boolean); }
function parseBulk(t) {
  const out = [], seen = new Set();
  for (const line of t.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('|').map((s) => s.trim());
    let name = sanitizeName(parts[0]); if (RESERVED.includes(name.toLowerCase())) name = name + '_v';
    while (seen.has(name.toLowerCase())) name += '_2'; seen.add(name.toLowerCase());
    const ty = (parts[2] || 'binary').trim();
    const rest = parts.slice(3), skipPart = rest.find((p) => /^skip\s*:/i.test(p));
    const v = { name, label: parts[1] || name, help: rest.filter((p) => p !== skipPart).join(' | ') };
    if (/^single/i.test(ty) || /^cat/i.test(ty)) { v.type = 'single'; v.options = parseOpts(ty.replace(/^\w+\s*:?/, '')); }
    else if (/^num/i.test(ty)) v.type = 'number';
    else if (/^text/i.test(ty)) { v.type = 'text'; const o = ty.replace(/^text\s*:?/i, '').trim(); if (o) v.options = parseOpts(o); }
    else v.type = 'binary';
    if (skipPart) { const r = parseRules(skipPart.replace(/^skip\s*:/i, '')); if (r.length) v.skip = r; }
    out.push(v);
  }
  // rules may name a later question by its number in the list ("1=4")
  for (const v of out) for (const r of v.skip || []) if (/^\d+$/.test(String(r.to)) && out[+r.to - 1]) r.to = out[+r.to - 1].name;
  return out;
}
function codebookToText() {
  const ruleTxt = (v) => v.skip?.length ? 'skip: ' + v.skip.map((r) => `${r.when}=${r.to === '__exclude' ? 'exclude' : r.to === '__end' ? 'end' : r.to}`).join('; ') : '';
  return vars().map((v) => {
    const ty = v.type === 'single' ? 'single: ' + optText(v) : v.type === 'text' && v.options?.length ? 'text: ' + optText(v) : v.type;
    return [v.name, v.label || '', ty, v.help || '', ruleTxt(v)].filter((x, i) => i < 3 || x).join(' | ');
  }).join('\n');
}

/* ---------- export ---------- */
function buildTable(includeEx = true) {
  // listed outlets keep their order; ones typed in while coding are numbered after them
  const outs = outletList(), countries = countryList();
  for (const r of Object.values(S.records).sort((a, b) => (a.firstSavedAt || a.savedAt || 0) - (b.firstSavedAt || b.savedAt || 0))) {
    const o = (r.meta?.outlet || '').trim(), c = (r.meta?.country || '').trim();
    if (o && !outs.some((x) => x.outlet === o)) outs.push({ outlet: o, country: c });
    if (c && !countries.includes(c)) countries.push(c);
  }
  const recs = Object.values(S.records).filter((r) => includeEx || !r.excluded).sort((a, b) => natCmp(a.key, b.key));
  const cols = [
    { name: 'article_id', label: 'Article ID (file and start page)', type: 'str' },
    { name: 'file', label: 'PDF file', type: 'str' },
    { name: 'folder', label: 'Library folder', type: 'str' },
    { name: 'page_start', label: 'First page in PDF', type: 'num', measure: 'scale' },
    { name: 'page_end', label: 'Last page in PDF', type: 'num', measure: 'scale' },
    { name: 'outlet', label: 'Outlet', type: 'num', valueLabels: Object.fromEntries(outs.map((o, i) => [i + 1, o.outlet])) },
    { name: 'country', label: 'Country', type: 'num', valueLabels: Object.fromEntries(countries.map((c, i) => [i + 1, c])) },
    { name: 'year', label: 'Publication year', type: 'num', measure: 'scale' },
    { name: 'pub_date', label: 'Publication date', type: 'str' },
    { name: 'headline', label: 'Headline', type: 'str' },
    { name: 'excluded', label: 'Excluded from analysis', type: 'num', valueLabels: { 0: 'No', 1: 'Yes' } },
    { name: 'coder', label: 'Coder', type: 'str' },
  ];
  // 97-style codes for skipped questions and codes like 98 are written as user-missing values
  const na = naCode(), miss = [...new Set([...(na === '' ? [] : [na]), ...missingCodes()])];
  const naLabel = 'Not applicable (skipped)', canSkip = skippable();
  // optional: start names with the question number, e.g. V3_ELIGIBLE
  const withRef = !!S.settings.refNames, taken = new Set(cols.map((c) => c.name.toLowerCase()));
  const colName = new Map();
  vars().forEach((v, i) => {
    let n = withRef && v.ref && !new RegExp('^' + v.ref.replace(/\./g, '_') + '_', 'i').test(v.name) ? sanitizeName(v.ref.replace(/\./g, '_') + '_' + v.name) : v.name;
    while (taken.has(n.toLowerCase())) n += '_q'; taken.add(n.toLowerCase()); colName.set(v.name, n);
  });
  const decimalsOf = (name) => Math.min(6, Math.max(0, ...Object.values(S.records).map((r) => { const x = r.codes?.[name]; const m = hasVal(x) && String(x).match(/\.(\d+)$/); return m ? m[1].length : 0; })));
  for (const v of vars()) {
    const name = colName.get(v.name), measure = v.measure || (v.type === 'number' ? 'scale' : 'nominal');
    const withNa = (labels) => { const l = { ...labels }; if (na !== '' && canSkip.has(v.name) && !(na in l)) l[na] = naLabel; return l; };
    const missFor = (labels) => miss.filter((c) => c in labels).slice(0, 3);
    if (v.type === 'binary') { const vl = withNa({ 0: 'No', 1: 'Yes' }); cols.push({ name, label: v.label, type: 'num', measure, valueLabels: vl, missing: missFor(vl), cb: v }); }
    else if (v.type === 'single') { const vl = withNa(Object.fromEntries((v.options || []).map((o) => [o.code, o.label]))); cols.push({ name, label: v.label, type: 'num', measure, valueLabels: vl, missing: missFor(vl), cb: v }); }
    else if (v.type === 'number') cols.push({ name, label: v.label, type: 'num', measure, decimals: decimalsOf(v.name), missing: miss.slice(0, 3), cb: v });
    else cols.push({ name, label: v.label, type: 'str', cb: v });
  }
  cols.push({ name: 'exclude_reason', label: 'Reason for exclusion', type: 'str' },
    { name: 'check_flags', label: 'Consistency checks saved anyway', type: 'str' },
    { name: 'codebook_version', label: 'Codebook version the article was coded with', type: 'str' },
    { name: 'coded_at', label: 'Date coded', type: 'str' }, { name: 'coding_seconds', label: 'Seconds spent coding', type: 'num', measure: 'scale' });
  // columns from the sampling log
  const L = S.sampling, logCols = [];
  if (L?.rows?.length) {
    for (const c of L.columns) {
      let n = sanitizeName(c); while (taken.has(n.toLowerCase())) n += '_log'; taken.add(n.toLowerCase());
      const vals = L.rows.map((r) => r[c]).filter((x) => x !== '' && x != null);
      const numeric = vals.length > 0 && vals.every((x) => !isNaN(Number(String(x).replace(/,/g, ''))));
      logCols.push({ src: c, name: n }); cols.push({ name: n, label: 'Sampling log: ' + c, type: numeric ? 'num' : 'str', measure: 'nominal', fromLog: c });
    }
  }
  const logRowOfRecord = (r) => {
    if (!L?.rows?.length) return null;
    if (r.logKey != null) { const row = L.rows.find((x) => String(x[L.key]) === String(r.logKey)); if (row) return row; }
    const i = logLookup(r.file, r.meta?.headline); return i == null ? null : L.rows[i];
  };
  const rows = recs.map((r) => {
    const oi = outs.findIndex((o) => o.outlet === r.meta?.outlet);
    const ci = countries.indexOf(r.meta?.country);
    const row = {
      article_id: r.key, file: r.file, folder: (S.files.find((f) => r.key.startsWith(f.id + '~p')) || {}).folder || '', page_start: r.page_start, page_end: r.page_end,
      outlet: oi >= 0 ? oi + 1 : '', country: ci >= 0 ? ci + 1 : '', year: r.meta?.year ? Number(r.meta.year) : '',
      pub_date: r.meta?.date || '', headline: r.meta?.headline || '', excluded: r.excluded ? 1 : 0, coder: r.coder || '',
      exclude_reason: r.exclude_reason || '', check_flags: r.flags || '', codebook_version: r.cbv || '',
      coded_at: (() => { const d = new Date(r.savedAt), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; })(), coding_seconds: r.seconds || '',
      _outlet_name: r.meta?.outlet || '', _country_name: r.meta?.country || '',
    };
    const sk = r.codes && Object.keys(r.codes).length ? skipState(r.codes).skipped : new Set();
    for (const v of vars()) { const x = r.codes?.[v.name]; row[colName.get(v.name)] = sk.has(v.name) ? (v.type === 'text' || na === '' ? '' : na) : x === undefined ? '' : x; }
    const lr = logRowOfRecord(r);
    for (const lc of logCols) { const x = lr ? lr[lc.src] : ''; const c = cols.find((k) => k.name === lc.name); row[lc.name] = c.type === 'num' && x !== '' && x != null ? Number(String(x).replace(/,/g, '')) : (x ?? ''); }
    return row;
  });
  for (const c of cols) if (c.type === 'str') c.width = Math.min(32767, Math.max(8, ...rows.map((r) => new TextEncoder().encode(String(r[c.name] ?? '')).length)));
  return { cols, rows };
}
function csvOf(cols, rows, withNames = true) {
  const head = [];
  for (const c of cols) { head.push(c.name); if (withNames && c.name === 'outlet') head.push('outlet_name'); if (withNames && c.name === 'country') head.push('country_name'); }
  const q = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = [head.join(',')];
  for (const r of rows) {
    const out = [];
    for (const c of cols) { out.push(q(r[c.name])); if (withNames && c.name === 'outlet') out.push(q(r._outlet_name)); if (withNames && c.name === 'country') out.push(q(r._country_name)); }
    lines.push(out.join(','));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}
function codebookTxt(cols) {
  return cols.map((c) => `${c.name}\t${c.label || ''}${c.valueLabels ? '\n' + Object.entries(c.valueLabels).map(([k, l]) => `\t\t${k} = ${l}${c.missing?.includes(Number(k)) ? '  (missing)' : ''}`).join('\n') : ''}`).join('\n');
}
function rScript(cols) {
  const L = ['# Load the coded data with labels', '# setwd() to the folder with coded_data.csv first', 'd <- read.csv("coded_data.csv", stringsAsFactors = FALSE, fileEncoding = "UTF-8-BOM")', ''];
  for (const c of cols) if (c.valueLabels && Object.keys(c.valueLabels).length) {
    const ks = Object.keys(c.valueLabels), ls = Object.values(c.valueLabels).map((x) => JSON.stringify(String(x)));
    L.push(`d$${c.name}_f <- factor(d$${c.name}, levels = c(${ks.join(', ')}), labels = c(${ls.join(', ')}))`);
  }
  const mc = cols.filter((c) => c.missing?.length);
  if (mc.length) {
    L.push('', '# Missing-value codes (not applicable, cannot determine). d keeps them;', '# d_analysis turns them into NA so they drop out of percentages and models.', 'missing_codes <- list(');
    L.push(mc.map((c) => `  ${c.name} = c(${c.missing.join(', ')})`).join(',\n'), ')', 'd_analysis <- d', 'for (v in names(missing_codes)) d_analysis[[v]][d_analysis[[v]] %in% missing_codes[[v]]] <- NA');
  }
  L.push('', '# Variable labels', 'var_labels <- c(', cols.map((c) => `  ${c.name} = ${JSON.stringify(c.label || '')}`).join(',\n'), ')', '', '# Alternative: haven::read_sav("coded_data.sav", user_na = TRUE) keeps SPSS labels and missing codes', 'str(d)');
  return L.join('\n') + '\n';
}
function pyScript(cols) {
  const L = ['"""Load the coded data with labels. Run from the folder with coded_data.csv."""', 'import pandas as pd', '', 'd = pd.read_csv("coded_data.csv", encoding="utf-8-sig")', '', 'value_labels = {'];
  for (const c of cols) if (c.valueLabels && Object.keys(c.valueLabels).length) L.push(`    ${JSON.stringify(c.name)}: {${Object.entries(c.valueLabels).map(([k, l]) => `${k}: ${JSON.stringify(String(l))}`).join(', ')}},`);
  L.push('}', 'for col, labels in value_labels.items():', '    d[col + "_label"] = d[col].map(labels)', '', 'variable_labels = {');
  for (const c of cols) L.push(`    ${JSON.stringify(c.name)}: ${JSON.stringify(c.label || '')},`);
  L.push('}');
  const mc = cols.filter((c) => c.missing?.length);
  if (mc.length) {
    L.push('', '# Missing-value codes (not applicable, cannot determine). d keeps them;', '# d_analysis turns them into NaN so they drop out of percentages and models.', 'missing_codes = {');
    for (const c of mc) L.push(`    ${JSON.stringify(c.name)}: [${c.missing.join(', ')}],`);
    L.push('}', 'd_analysis = d.copy()', 'for col, codes in missing_codes.items():', '    d_analysis[col] = d_analysis[col].where(~d_analysis[col].isin(codes))');
  }
  L.push('', '# Alternative: import pyreadstat; d, meta = pyreadstat.read_sav("coded_data.sav", user_missing=True)', 'print(d.head())');
  return L.join('\n') + '\n';
}
async function offer(filename, data) {
  if (!S.dl) {
    try {
      const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
      const link = el('a', { href: url, download: filename }); document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000); toast('Downloaded ' + filename); return;
    } catch {}
    if (/\.csv$/.test(filename) && typeof data === 'string') { $('#copyCard').style.display = ''; $('#copyArea').value = data; toast('Downloads are blocked here. Copy the CSV below.'); }
    else toast('Downloads are blocked in this view.', 4000);
    return;
  }
  try { await S.dl.save({ filename, data }); toast('Saved ' + filename); }
  catch (e) { if (e?.code === 'declined') return; if (e?.code === 'rate_limited') toast('A save prompt is already open.'); else toast('Could not save: ' + (e?.message || e?.code || e), 4000); }
}
async function doExport(kind) {
  const stamp = todayStr();
  if (kind === 'backup') {
    const data = JSON.stringify({ app: 'chota', version: 1, coder: S.dir?.coder || '', exportedAt: new Date().toISOString(), codebook: S.codebook, settings: S.settings, records: S.records, recodes: S.recodes, sample: S.sample, fileSplits: S.fileSplits || {}, sampling: S.sampling }, null, 1);
    return offer(`coding_backup_${stamp}.json`, data);
  }
  const { cols, rows } = buildTable(!$('#expEx').checked);
  if (!rows.length) { toast('Nothing coded yet.'); return; }
  if (kind === 'csv') return offer(`coded_data_${stamp}.csv`, csvOf(cols, rows));
  if (kind === 'xlsx') {
    const head = []; for (const c of cols) { head.push(c.name); if (c.name === 'outlet') head.push('outlet_name'); if (c.name === 'country') head.push('country_name'); }
    const aoa = [head, ...rows.map((r) => { const o = []; for (const c of cols) { o.push(r[c.name] === '' ? null : r[c.name]); if (c.name === 'outlet') o.push(r._outlet_name); if (c.name === 'country') o.push(r._country_name); } return o; })];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'data');
    const cbAoa = [['variable', 'label', 'code', 'value label']];
    for (const c of cols) { cbAoa.push([c.name, c.label || '', null, null]); if (c.valueLabels) for (const [k, l] of Object.entries(c.valueLabels)) cbAoa.push([null, null, Number(k), l]); }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cbAoa), 'codebook');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return offer(`coded_data_${stamp}.xlsx`, new Uint8Array(buf));
  }
  if (kind === 'sav' || kind === 'r') {
    const zip = new JSZip();
    const sav = writeSav(cols, rows);
    if (kind === 'sav') {
      zip.file('coded_data.sav', sav);
      zip.file('codebook.txt', codebookTxt(cols));
      zip.file('README.txt', 'Open coded_data.sav in SPSS (File > Open > Data). Variable labels and value labels are already set.\nExported ' + new Date().toString() + '\n');
    } else {
      zip.file('coded_data.csv', csvOf(cols, rows));
      zip.file('coded_data.sav', sav);
      zip.file('load_data.R', rScript(cols));
      zip.file('load_data.py', pyScript(cols));
      zip.file('codebook.txt', codebookTxt(cols));
    }
    const blob = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    return offer(kind === 'sav' ? `coded_data_spss_${stamp}.zip` : `coded_data_R_python_${stamp}.zip`, blob);
  }
}
async function restore(file) {
  let data; try { data = JSON.parse(await file.text()); } catch { toast('That file is not a backup.'); return; }
  if (data.app !== 'chota' && data.app !== 'corpus-coder') { toast('That file is not a Chota backup.'); return; }
  const n = Object.keys(data.records || {}).length;
  if (!(await ask(`<h3>Restore backup?</h3><div class="small">${n} coded articles from ${esc(data.exportedAt || '')}. Articles in the backup replace the same articles here when the backup copy is newer. The codebook and settings are replaced.</div>`, 'Restore'))) return;
  S.codebook = data.codebook || S.codebook; S.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings || {});
  S.fileSplits = data.fileSplits || S.fileSplits;
  for (const [k, r] of Object.entries(data.records || {})) if (!S.records[k] || (S.records[k].savedAt || 0) < (r.savedAt || 0)) S.records[k] = r;
  for (const [k, r] of Object.entries(data.recodes || {})) if (!S.recodes[k] || (S.recodes[k].savedAt || 0) < (r.savedAt || 0)) S.recodes[k] = r;
  if (data.sample) S.sample = data.sample;
  lsSet('cc_records', S.records); lsSet('cc_recodes', S.recodes);
  persistCodebook(); persistSettings(); persistSample();
  toast('Backup restored'); refreshAll();
}

/* ---------- reliability ---------- */
function renderRecode() {
  const coded = Object.values(S.records).filter((r) => !r.excluded);
  const sm = S.sample;
  $('#startRecode').disabled = !sm;
  $('#startRecode').style.display = S.mode === 'recode' ? 'none' : '';
  $('#stopRecode').style.display = S.mode === 'recode' ? '' : 'none';
  if (sm) {
    const done = sm.keys.filter((k) => S.recodes[k]).length;
    const first = Math.min(...sm.keys.map((k) => S.records[k]?.savedAt || Date.now()));
    const daysSince = Math.floor((Date.now() - first) / 86400000);
    $('#sampInfo').innerHTML = `Sample of <b>${sm.keys.length}</b> articles drawn ${new Date(sm.drawnAt).toLocaleDateString()} · <b>${done}</b> recoded. ${daysSince < 7 ? `<span style="color:var(--warn)">The earliest sample article was coded ${daysSince} day${daysSince === 1 ? '' : 's'} ago; a gap of about a week makes the retest more credible.</span>` : ''}`;
  } else $('#sampInfo').textContent = `${coded.length} coded articles available to sample from.`;
  // results
  const keys = (sm?.keys || []).filter((k) => S.recodes[k] && S.records[k]);
  S.relRows = relRows(keys.map((k) => [S.records[k], S.recodes[k]]));
  $('#dlRel').disabled = !keys.length;
  $('#relTable').innerHTML = keys.length ? relTableHtml(S.relRows) : 'Results appear once some sample articles are recoded.';
  renderIcr();
}
/* ----- reliability shared by recoding and coder comparison ----- */
const metricOf = (v) => ({ ordinal: 'ordinal', scale: 'interval' })[v.measure || (v.type === 'number' ? 'scale' : 'nominal')] || 'nominal';
// a code counts for reliability unless the question was skipped, left empty or given a missing-value code
function relValue(rec, v) {
  const x = rec?.codes?.[v.name];
  if (!hasVal(x) || missingCodes().includes(Number(x))) return '';
  return x;
}
// recs: one array per article, holding each coder's record
function relRows(recs) {
  return vars().map((v, i) => {
    if (v.type === 'text') return null;
    const units = recs.map((rs) => rs.map((r) => relValue(r, v)).filter((x) => x !== '')).filter((u) => u.length >= 2);
    const agree = units.filter((u) => u.every((x) => String(x) === String(u[0]))).length;
    const metric = metricOf(v), alpha = units.length >= 2 ? kAlpha(units, metric) : null;
    return { name: v.name, ref: qRef(v, i), label: v.label, n: units.length, pct: units.length ? agree / units.length : null, alpha, ci: alpha !== null ? kAlphaCI(units, metric) : null, metric };
  }).filter(Boolean);
}
function relTableHtml(rows) {
  const fmt = (x) => x == null ? '<span class="mute">n/a</span>' : x.toFixed(2).replace(/^0\./, '.').replace(/^-0\./, '-.');
  return `<table><tr><th>Variable</th><th>Units</th><th>% agreement</th><th>Krippendorff's α</th><th>95% interval</th></tr>${rows.map((r) => `<tr><td><b>${esc(r.ref)} ${esc(r.name)}</b><div class="mute small">${esc(r.label || '')}</div></td><td>${r.n}</td><td>${r.pct == null ? 'n/a' : (r.pct * 100).toFixed(1) + '%'}</td><td class="${r.alpha != null && r.alpha < 0.667 ? 'bad' : ''}">${fmt(r.alpha)} <span class="mute small">${r.metric}</span></td><td>${r.ci ? fmt(r.ci[0]) + ' to ' + fmt(r.ci[1]) : '<span class="mute">n/a</span>'}</td></tr>`).join('')}</table><div class="small mute" style="margin-top:8px">α shows n/a when a variable has no variation (all codes identical); report percent agreement there. The interval needs at least five units.</div>`;
}
const relCsv = (rows) => ['variable,question,label,units,percent_agreement,krippendorff_alpha,metric,ci_low,ci_high', ...rows.map((r) => [r.name, r.ref, '"' + (r.label || '').replace(/"/g, '""') + '"', r.n, r.pct == null ? '' : (r.pct * 100).toFixed(1), r.alpha == null ? '' : r.alpha.toFixed(3), r.metric, r.ci ? r.ci[0].toFixed(3) : '', r.ci ? r.ci[1].toFixed(3) : ''].join(','))].join('\r\n') + '\r\n';

/* ----- comparing coders ----- */
const myName = () => S.dir?.coder || 'You';
function addCoder(name, records, source) {
  if (!records || typeof records !== 'object') return false;
  name = (name || source || 'Coder').trim();
  let n = name, k = 2; while (n === myName() || S.coders.some((c) => c.name === n && c.source !== source)) n = `${name} (${k++})`;
  S.coders = S.coders.filter((c) => c.source !== source); S.coders.push({ name: n, records, source });
  return true;
}
async function addCoderFiles(files) {
  let added = 0;
  for (const f of files) {
    try {
      const d = JSON.parse(await f.text());
      const fromName = (f.name.match(/^chota-codes-(.+)\.json$/i) || [])[1];
      if (addCoder(d.coder || fromName || f.name.replace(/\.json$/i, ''), d.records, f.name)) added++;
    } catch (e) { console.warn(e); }
  }
  toast(added ? `${added} coder file${added === 1 ? '' : 's'} added` : 'No codes found in those files.');
  renderIcr();
}
async function codersFromDir() {
  if (!S.dir) return;
  let added = 0;
  for await (const [name, h] of S.dir.handle.entries()) {
    if (h.kind !== 'file' || !/^chota-codes.*\.json$/i.test(name) || name === S.dir.file) continue;
    try { const d = JSON.parse(await (await h.getFile()).text()); if (addCoder(d.coder || (name.match(/^chota-codes-(.+)\.json$/i) || [])[1] || 'Unnamed coder', d.records, name)) added++; } catch (e) { console.warn(e); }
  }
  toast(added ? `${added} other coder${added === 1 ? '' : 's'} found in your folder` : 'No other coders\' files in this folder yet.');
  renderIcr();
}
function renderIcr() {
  $('#btnCodersDir').style.display = S.dir ? '' : 'none';
  $('#btnCodersClear').style.display = S.coders.length ? '' : 'none';
  const coders = [{ name: myName(), records: S.records }, ...S.coders];
  if (!S.coders.length) { $('#codersInfo').textContent = 'No other coders loaded yet.'; $('#icrTable').innerHTML = ''; $('#disList').innerHTML = ''; $('#dlIcr').disabled = $('#dlDis').disabled = true; S.icrRows = []; S.disRows = []; return; }
  const keys = [...new Set(coders.flatMap((c) => Object.keys(c.records)))].filter((k) => coders.filter((c) => c.records[k]).length >= 2).sort(natCmp);
  $('#codersInfo').textContent = `${coders.map((c) => `${c.name} (${Object.keys(c.records).length})`).join(', ')}. ${keys.length} article${keys.length === 1 ? ' was' : 's were'} coded by two or more of them.`;
  S.icrRows = relRows(keys.map((k) => coders.map((c) => c.records[k]).filter(Boolean)));
  $('#icrTable').innerHTML = keys.length ? relTableHtml(S.icrRows) : '';
  // disagreements, to talk through and settle
  const dis = [], vs = vars();
  for (const k of keys) {
    const rs = coders.map((c) => ({ c: c.name, r: c.records[k] })).filter((x) => x.r);
    const head = rs.find((x) => x.r.meta?.headline)?.r.meta.headline || k;
    if (new Set(rs.map((x) => x.r.excluded ? 1 : 0)).size > 1) dis.push({ key: k, head, q: 'excluded', vals: rs.map((x) => `${x.c}: ${x.r.excluded ? 'excluded' + (x.r.exclude_reason ? ' (' + x.r.exclude_reason + ')' : '') : 'included'}`) });
    vs.forEach((v, i) => {
      if (v.type === 'text') return;
      const vals = rs.map((x) => ({ c: x.c, val: relValue(x.r, v) })).filter((x) => x.val !== '');
      if (vals.length >= 2 && new Set(vals.map((x) => String(x.val))).size > 1) dis.push({ key: k, head, q: `${qRef(v, i)} ${v.name}`, vals: vals.map((x) => `${x.c}: ${x.val}`) });
    });
  }
  S.disRows = dis;
  $('#dlIcr').disabled = !keys.length; $('#dlDis').disabled = !dis.length;
  const box = $('#disList'); box.innerHTML = '';
  if (!keys.length) return;
  box.append(el('h3', { style: 'margin:0 0 6px;font-size:16px' }, dis.length ? `${dis.length} disagreement${dis.length === 1 ? '' : 's'} to settle` : 'No disagreements'));
  const list = el('div', { class: 'dis' });
  for (const d of dis.slice(0, 300)) {
    const ai = S.articles.findIndex((a) => a.key === d.key);
    list.append(el('div', { class: 'disrow' }, el('div', {}, el('b', {}, d.q), ' · ', ai >= 0 ? el('button', { class: 'link', onclick: () => { switchView('code'); openArticle(ai); } }, d.head) : el('span', {}, d.head)), el('div', { class: 'mute' }, d.vals.join('   '))));
  }
  if (dis.length > 300) list.append(el('p', { class: 'mute' }, `Showing 300 of ${dis.length}. Download the CSV for all of them.`));
  box.append(list);
}
function drawSample() {
  const coded = Object.values(S.records).filter((r) => !r.excluded).map((r) => r.key);
  if (coded.length < 2) { toast('Code some articles first.'); return; }
  const pct = Math.min(100, Math.max(1, +$('#sampPct').value || 10));
  const n = Math.max(2, Math.round(coded.length * pct / 100));
  const arr = coded.slice();
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  S.sample = { keys: arr.slice(0, n), drawnAt: Date.now(), pct };
  persistSample(); renderRecode(); toast(`Drew ${n} articles`);
}
function setMode(m) {
  S.mode = m;
  document.body.classList.toggle('recoding', m === 'recode');
  if (m === 'recode') setFilter('todo');
  S.cur = -1; renderQueue(); renderRecode(); switchView('code'); goNext(-1);
}

/* ---------- sampling log: article details from a spreadsheet ---------- */
const normKey = (s) => String(s ?? '').toLowerCase().replace(/\.pdf$/i, '').replace(/[^a-z0-9]+/g, '');
let logIndex = null;
function logLookup(fileName, headline) {
  const L = S.sampling; if (!L || !L.rows?.length || !L.key) return null;
  if (!logIndex) { logIndex = new Map(); L.rows.forEach((r, i) => { const k = normKey(r[L.key]); if (k && !logIndex.has(k)) logIndex.set(k, i); }); }
  const k = normKey(L.by === 'file' ? fileName : headline); if (!k) return null;
  if (logIndex.has(k)) return logIndex.get(k);
  // headlines found on the page may be cut short or run on, so a long shared beginning also counts
  if (L.by !== 'file' && k.length >= 25) for (const [lk, i] of logIndex) if (lk.length >= 25 && (lk.startsWith(k) || k.startsWith(lk))) return i;
  return null;
}
function logRowForArticle(a) {
  if (!a) return null; const f = S.files[a.fi];
  const rec = S.records[a.key];
  if (rec?.logKey != null && S.sampling) { const i = S.sampling.rows.findIndex((r) => String(r[S.sampling.key]) === String(rec.logKey)); if (i >= 0) return S.sampling.rows[i]; }
  const i = logLookup(f.name, (rec?.meta || f.metaByStart[a.start] || {}).headline);
  return i == null ? null : S.sampling.rows[i];
}
const normCol = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const LOG_META = { outlet: /^(outlet|publication|source|newspaper|paper)(name)?$/, country: /^country(name)?$/, date: /^(pub(lication)?)?date$/, year: /^(pub)?year$/, headline: /^(headline|title)$/ };
// Fills article details and same-named questions from the matched row
function applyLogRow(row) {
  for (const [k, re] of Object.entries(LOG_META)) { const c = S.sampling.columns.find((x) => re.test(normCol(x))); if (c && hasVal(row[c])) S.meta[k] = String(row[c]); }
  for (const v of vars()) {
    if (isAnswered(v)) continue;
    const c = S.sampling.columns.find((x) => normCol(x) === normCol(v.name) || normCol(x) === normCol(v.name.replace(/^V\d+(_\d+)*_/i, '')));
    if (!c || !hasVal(row[c])) continue;
    const val = row[c];
    if (v.type === 'text') S.form[v.name] = String(val);
    else if (!isNaN(Number(val))) S.form[v.name] = Number(val);
  }
}
async function importLog(file) {
  let rows, columns;
  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
    columns = rows.length ? Object.keys(rows[0]) : [];
  } catch (e) { toast('Could not read that spreadsheet: ' + (e.message || e), 5000); return; }
  if (!rows.length) { toast('That spreadsheet has no rows under its header.'); return; }
  const guess = columns.find((c) => /file/i.test(c)) || columns.find((c) => /headline|title/i.test(c)) || columns[0];
  S.sampling = { name: file.name, columns, rows, key: guess, by: /file/i.test(guess) ? 'file' : 'headline' };
  logIndex = null; lsSet('cc_sampling', S.sampling); queueSave(); renderLog();
  toast(`${rows.length} rows read from ${file.name}`);
}
function renderLog() {
  const box = $('#logBox'); if (!box) return;
  const L = S.sampling;
  if (!L) { box.innerHTML = ''; return; }
  logIndex = null;
  const matched = S.articles.filter((a) => logRowForArticle(a)).length;
  box.innerHTML = '';
  box.append(
    el('p', { class: 'small' }, el('b', {}, L.name), ` · ${L.rows.length} rows, ${L.columns.length} columns`),
    el('div', { class: 'grid2' },
      el('label', {}, 'Match each article by', el('select', { onchange: (e) => { L.by = e.target.value; lsSet('cc_sampling', L); queueSave(); renderLog(); } }, el('option', { value: 'headline', selected: L.by !== 'file' }, 'Headline'), el('option', { value: 'file', selected: L.by === 'file' }, 'PDF file name'))),
      el('label', {}, 'Using the column', el('select', { onchange: (e) => { L.key = e.target.value; lsSet('cc_sampling', L); queueSave(); renderLog(); } }, L.columns.map((c) => el('option', { value: c, selected: c === L.key }, c))))),
    el('p', { class: 'small', style: 'margin-top:10px' }, S.articles.length ? `${matched} of ${S.articles.length} articles in your library match a row.` : 'Add PDFs to see how many articles match.'),
    el('div', { class: 'btnrow' }, el('button', { onclick: async () => { if (await ask('<h3>Remove the sampling log?</h3><p class="small">Article details already saved with coded articles stay.</p>', 'Remove')) { S.sampling = null; lsSet('cc_sampling', null); queueSave(); renderLog(); } } }, 'Remove')));
}

/* ---------- settings ---------- */
function renderSettings() {
  $('#setTarget').value = +S.settings.target || ''; $('#setDeadline').value = S.settings.deadline || '';
  $('#setOutlets').value = S.settings.outlets; $('#setHl').value = S.settings.hl; applyTheme(); renderLog();
}

/* ---------- views & wiring ---------- */
function switchView(v) {
  S.view = v;
  document.querySelectorAll('#rail button[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
  document.querySelectorAll('.view').forEach((s) => s.classList.toggle('on', s.id === 'v-' + v));
  if (v === 'codebook') renderCodebook();
  if (v === 'recode') renderRecode();
  if (v === 'settings') renderSettings();
  if (v === 'export') $('#expRef').checked = !!S.settings.refNames;
  if (v === 'export') { const n = Object.keys(S.records).length, ex = Object.values(S.records).filter((r) => r.excluded).length; $('#expInfo').textContent = `${n} articles coded (${ex} excluded), ${vars().length} coding variables plus article details.`; }
  if (v === 'code') { renderForm(); renderQueue(); }
}
function refreshAll() { applyTheme(); rebuildArticles(); renderForm(); renderProgress(); if (S.view && S.view !== 'code') switchView(S.view); }

document.querySelectorAll('#rail button[data-v]').forEach((b) => b.onclick = () => switchView(b.dataset.v));
$('#btnLoad').onclick = () => $('#fileIn').click();
$('#btnLoadDir').onclick = () => $('#dirIn').click();
$('#fileIn').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
$('#dirIn').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
function setFilter(f) { S.qFilter = f; document.querySelectorAll('#qFilter button').forEach((b) => b.classList.toggle('on', b.dataset.f === f)); renderQueue(); }
document.querySelectorAll('#qFilter button').forEach((b) => b.onclick = () => setFilter(b.dataset.f));
const libOverlay = () => window.innerWidth <= 1100;
function setLib(open) {
  const was = $('#v-code').classList.contains('lib');
  $('#v-code').classList.toggle('lib', open); $('#railLib').classList.toggle('on', open);
  try { localStorage.setItem('cc_lib', open ? '1' : '0'); } catch {}
  if (was !== open && !libOverlay()) rerender();
}
function rerender() { clearTimeout(rsT); rsT = setTimeout(() => { const a = S.articles[S.cur]; if (a && viewDoc && !S.textMode) renderPages(a, ++renderTok); }, 120); }
let rsT; window.addEventListener('resize', rerender);
$('#btnQueue').onclick = () => setLib(!$('#v-code').classList.contains('lib'));
$('#railLib').onclick = () => { if (S.view !== 'code') { switchView('code'); setLib(true); } else setLib(!$('#v-code').classList.contains('lib')); };
$('#btnCloseQ').onclick = () => setLib(false);
['#pages', '#textview', '#form'].forEach((q) => $(q).addEventListener('click', () => { if (libOverlay()) setLib(false); }));
document.querySelectorAll('#viewSeg button').forEach((b) => b.onclick = () => setTextMode(b.dataset.m === 'text'));
$('#btnKeys').onclick = showKeys;
function showKeys() {
  ask(`<h3>Keyboard shortcuts</h3><div class="keys"><span><span class="kbd">1</span> <span class="kbd">Y</span></span><span>Yes</span><span><span class="kbd">0</span> <span class="kbd">N</span></span><span>No</span><span><span class="kbd">1</span>–<span class="kbd">9</span></span><span>Pick a category by its number</span><span><span class="kbd">↑</span> <span class="kbd">↓</span></span><span>Move between questions</span><span><span class="kbd">Enter</span></span><span>Save and open the next article</span><span><span class="kbd">[</span> <span class="kbd">]</span></span><span>Previous or next article without saving</span><span><span class="kbd">T</span></span><span>Switch between page and text</span><span><span class="kbd">L</span></span><span>Open or close the library</span></div>`, 'Close');
  $('#mCancel').style.display = 'none'; const ok = $('#mOk').onclick; $('#mOk').onclick = () => { $('#mCancel').style.display = ''; ok(); };
}
let dragN = 0;
window.addEventListener('dragenter', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { dragN++; document.body.classList.add('dragging'); } });
window.addEventListener('dragleave', () => { dragN = Math.max(0, dragN - 1); if (!dragN) document.body.classList.remove('dragging'); });
window.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); });
window.addEventListener('drop', (e) => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); dragN = 0; document.body.classList.remove('dragging'); if (S.view !== 'code') switchView('code'); addFiles(e.dataTransfer.files); });
const darkMQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const isDark = () => (S.settings.theme || (darkMQ && darkMQ.matches ? 'dark' : 'light')) === 'dark';
const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>';
const MOON = '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>';
function applyTheme() {
  const t = S.settings.theme || '';
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  document.querySelectorAll('#themeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
  const d = isDark(); $('#themeIcon').innerHTML = d ? SUN : MOON; $('#themeLbl').textContent = d ? 'Light' : 'Dark';
}
if (darkMQ && darkMQ.addEventListener) darkMQ.addEventListener('change', applyTheme);
$('#themeBtn').onclick = () => { S.settings.theme = isDark() ? 'light' : 'dark'; lsSet('cc_settings', S.settings); applyTheme(); persistSettings(); };
document.querySelectorAll('#themeSeg button').forEach((b) => b.onclick = () => { S.settings.theme = b.dataset.t; applyTheme(); persistSettings(); });
$('#qSearch').oninput = () => renderQueue();
$('#btnPrev').onclick = () => step(-1); $('#btnNext').onclick = () => step(1);
$('#zIn').onclick = () => { S.zoom = Math.min(3, S.zoom + 0.15); $('#zLbl').textContent = Math.round(S.zoom * 100) + '%'; const a = S.articles[S.cur]; if (a && viewDoc) renderPages(a, ++renderTok); };
$('#zOut').onclick = () => { S.zoom = Math.max(0.4, S.zoom - 0.15); $('#zLbl').textContent = Math.round(S.zoom * 100) + '%'; const a = S.articles[S.cur]; if (a && viewDoc) renderPages(a, ++renderTok); };
$('#btnSplit').onclick = splitHere; $('#btnMerge').onclick = mergeNext;
$('#btnSave').onclick = () => save(false);
$('#btnExclude').onclick = () => save(true);
$('#btnClear').onclick = () => { S.form = {}; S.activeQ = 0; S.confirmMissing = false; renderForm(); };
$('#addVar').onclick = () => {
  let n = 'var' + (vars().length + 1); while (vars().some((v) => v.name === n)) n += '_';
  vars().push({ name: n, label: '', type: 'binary', help: '' }); persistCodebook(); renderCodebook();
  const row = $('#vlist').lastElementChild;
  if (row) { row.scrollIntoView({ block: 'center' }); row.classList.add('fresh'); const q = row.querySelectorAll('input')[1]; if (q) q.focus({ preventScroll: true }); }
};
$('#applyBulk').onclick = async () => {
  const text = $('#bulkCb').value;
  if (!text.trim()) { toast('Nothing to read. One question per line.'); return; }
  applyParsedCodebook(parseAnyCodebook(text.split(/\r?\n/)), '');
};
$('#btnImportCb').onclick = () => $('#cbFileIn').click();
$('#cbFileIn').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importCodebook(f); };
$('#cbNa').onchange = (e) => { const v = e.target.value.trim(); S.codebook.naCode = v === '' || isNaN(Number(v)) ? '' : Number(v); e.target.value = S.codebook.naCode; persistCodebook(); renderForm(); };
$('#cbMissing').onchange = (e) => { S.codebook.missing = [...new Set(e.target.value.split(/[,;\s]+/).filter((x) => x !== '' && !isNaN(Number(x))).map(Number))]; e.target.value = S.codebook.missing.join(', '); persistCodebook(); };
$('#loadExample').onclick = async () => { if (!(await ask('<h3>Load the example questions?</h3><p class="small">This replaces your current codebook with 16 example questions on AI orientation, actors, benefits, risks, tone and genre. Edit or delete any of them afterwards. Codes already saved keep their values.</p>', 'Load'))) return; S.codebook = JSON.parse(JSON.stringify(EXAMPLE_CODEBOOK)); persistCodebook(); renderCodebook(); renderForm(); toast('Example questions loaded'); };
$('#cbToText').onclick = () => { $('#bulkCb').value = codebookToText(); };
document.querySelectorAll('[data-exp]').forEach((b) => b.onclick = () => doExport(b.dataset.exp));
$('#btnNewFolder').onclick = newFolder; $('#btnAutoSort').onclick = autoSort; $('#btnDelFolder').onclick = deleteFolder;
$('#btnSelect').onclick = () => { S.selecting = !S.selecting; S.selected.clear(); renderFolders(); renderQueue(); };
$('#btnMoveSel').onclick = async () => { const files = S.files.filter((f) => S.selected.has(f.id)); if (!files.length) { toast('Tap PDFs in the list to select them'); return; } const to = await chooseFolder(`Move ${files.length} PDF${files.length > 1 ? 's' : ''} to`); if (to === null) return; moveFiles(files, to); S.selected.clear(); S.selecting = false; S.folderSel = to; if (to) { const ps = to.split('/'); for (let i = 1; i <= ps.length; i++) S.openFolders.add(ps.slice(0, i).join('/')); } renderFolders(); renderQueue(); toast('Moved'); };
$('#btnRemoveSel').onclick = removeSelected;
$('#btnSelAll').onclick = toggleSelectAll;
$('#btnRestore').onclick = () => $('#restoreIn').click();
$('#restoreIn').onchange = (e) => { if (e.target.files[0]) restore(e.target.files[0]); e.target.value = ''; };
$('#drawSample').onclick = async () => { if (S.sample && !(await ask('Draw a new sample? Recodes already done stay saved but may fall outside the new sample.', 'Draw new'))) return; drawSample(); };
$('#startRecode').onclick = () => setMode('recode');
$('#stopRecode').onclick = () => setMode('code');
$('#dlRel').onclick = () => offer(`intracoder_reliability_${todayStr()}.csv`, relCsv(S.relRows || []));
$('#dlIcr').onclick = () => offer(`intercoder_reliability_${todayStr()}.csv`, relCsv(S.icrRows || []));
$('#dlDis').onclick = () => {
  const q = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
  offer(`coder_disagreements_${todayStr()}.csv`, ['article_id,headline,question,codes', ...(S.disRows || []).map((d) => [q(d.key), q(d.head), q(d.q), q(d.vals.join('; '))].join(','))].join('\r\n') + '\r\n');
};
$('#btnCoders').onclick = () => $('#codersIn').click();
$('#codersIn').onchange = (e) => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) addCoderFiles(fs); };
$('#btnCodersDir').onclick = codersFromDir;
$('#btnCodersClear').onclick = () => { S.coders = []; renderIcr(); };
$('#btnCbDownload').onclick = () => downloadCodebook(false);
$('#btnCbDownloadLock').onclick = () => downloadCodebook(true);
$('#btnCbLock').onclick = async () => { if (S.codebook.locked) { toast('Already locked'); return; } if (await ask('<h3>Lock the codebook?</h3><p class="small">Questions, codes and rules can no longer be edited until you unlock it.</p>', 'Lock')) { S.codebook.locked = true; persistCodebook(); renderCodebook(); } };
$('#cbReasons').onchange = (e) => { const r = e.target.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean); S.codebook.excludeReasons = r.length ? r : undefined; persistCodebook(); };
$('#expRef').onchange = (e) => { S.settings.refNames = e.target.checked; persistSettings(); };
$('#btnLog').onclick = () => $('#logIn').click();
$('#logIn').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importLog(f); };
$('#saveSettings').onclick = () => {
  S.settings.target = Math.max(0, Math.round(+$('#setTarget').value || 0)); S.settings.deadline = $('#setDeadline').value;
  S.settings.outlets = $('#setOutlets').value; S.settings.hl = $('#setHl').value;
  persistSettings(); renderProgress(); renderText(); toast('Settings saved');
};
document.addEventListener('keydown', (e) => {
  if ($('#modal').classList.contains('on')) {
    const rl = document.getElementById('reasonList');
    if (rl && /^[1-9]$/.test(e.key) && e.target.tagName !== 'INPUT') { const b = rl.children[+e.key - 1]; if (b) { e.preventDefault(); b.click(); } return; }
    if (e.key === 'Enter') { e.preventDefault(); $('#mOk').click(); } if (e.key === 'Escape') $('#mCancel').click(); return;
  }
  if (e.key === 'Escape' && $('#v-code').classList.contains('lib')) { setLib(false); return; }
  if (S.view !== 'code' || S.cur < 0) return;
  const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(false); return; }
  if (typing) { if (e.key === 'Escape') t.blur(); if (e.key === 'Enter' && t.tagName === 'INPUT') { e.preventDefault(); t.blur(); } return; }
  const v = vars()[S.activeQ];
  if (e.key === 'Enter') { e.preventDefault(); save(false); return; }
  if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); moveActive(1); return; }
  if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); moveActive(-1); return; }
  if (e.key === '?') { showKeys(); return; }
  if (e.key === 't' || e.key === 'T') { setTextMode(!S.textMode); return; }
  if (e.key === 'l' || e.key === 'L') { setLib(!$('#v-code').classList.contains('lib')); return; }
  if (e.key === '[') { step(-1); return; }
  if (e.key === ']') { step(1); return; }
  if (!v || isSkipped(v)) return;
  if (v.type === 'binary') {
    if (e.key === '1' || e.key.toLowerCase() === 'y') { e.preventDefault(); answer(S.activeQ, 1); }
    else if (e.key === '0' || e.key.toLowerCase() === 'n') { e.preventDefault(); answer(S.activeQ, 0); }
  } else if (v.type === 'single') {
    if (/^[0-9-]$/.test(e.key) && typeCode(v, e.key)) e.preventDefault();
  } else if (e.key === 'Tab' || /^[0-9a-z]$/i.test(e.key)) {
    const n = document.querySelector(`#formbody .qrow[data-q="${S.activeQ}"] input, #formbody .qrow[data-q="${S.activeQ}"] textarea`);
    if (n) { n.focus(); }
  }
});
window.addEventListener('beforeunload', () => { lsSet('cc_records', S.records); if (dirDirty) flushDir(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirDirty) flushDir(); });
$('#saveDot').onclick = () => { if (!S.dir && S.pendingDir) reconnectDir(); else { switchView('code'); setLib(true); } };

/* ---------- boot ---------- */
if (!window.pdfjsLib) { $('#pages').innerHTML = '<div class="drop"><h2>The PDF viewer did not load</h2><p>Check your internet connection, then reload the page.</p></div>'; }
applyTheme(); setLib(lsGet('cc_lib', 0) === 1 && !libOverlay()); renderProgress(); renderForm(); renderQueue();
initStore();
