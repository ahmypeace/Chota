/* ===== SPSS .sav writer (uncompressed, little-endian, UTF-8) ===== */
function writeSav(vars, rows) {
  // vars: [{name, label, type:'num'|'str', width (str bytes), valueLabels:{code:label}, measure:'nominal'|'ordinal'|'scale', missing:[up to 3 numeric user-missing codes]}]
  // rows: array of objects keyed by var.name
  const enc = new TextEncoder();
  const chunks = [];
  let size = 0;
  const push = (u8) => { chunks.push(u8); size += u8.length; };
  const i32 = (v) => { const b = new Uint8Array(4); new DataView(b.buffer).setInt32(0, v, true); push(b); };
  const f64 = (v) => { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, v, true); push(b); };
  const SYSMIS = -Number.MAX_VALUE;
  const fixed = (s, n) => { // space-padded, byte-truncated
    const out = new Uint8Array(n).fill(32);
    const b = truncBytes(enc.encode(s || ''), n);
    out.set(b, 0); push(out);
  };
  function truncBytes(b, n) {
    if (b.length <= n) return b;
    let end = n;
    while (end > 0 && (b[end] & 0xC0) === 0x80) end--; // don't split a UTF-8 char
    return b.slice(0, end);
  }
  // short names. Strings wider than 255 bytes ("very long strings") are stored as several
  // physical variables (segments) of up to 255 bytes, each carrying 252 bytes of the text.
  const used = new Set();
  const uniqueShort = (base) => { let short = base.slice(0, 8), k = 1; while (used.has(short)) { const suf = String(k++); short = base.slice(0, 8 - suf.length) + suf; } used.add(short); return short; };
  const V = vars.map((v) => {
    let base = v.name.toUpperCase().replace(/[^A-Z0-9_@#$.]/g, '_');
    if (!/^[A-Z@]/.test(base)) base = 'V' + base;
    const short = uniqueShort(base);
    const isStr = v.type === 'str';
    const width = isStr ? Math.min(32767, Math.max(1, v.width || 8)) : 0;
    const nSeg = isStr && width > 255 ? Math.ceil(width / 252) : 1;
    const segs = [];
    for (let s = 0; s < nSeg; s++) {
      const w = !isStr ? 0 : nSeg === 1 ? width : s < nSeg - 1 ? 255 : width - s * 252;
      const used_ = !isStr ? 8 : nSeg === 1 ? width : s < nSeg - 1 ? 252 : width - s * 252;
      segs.push({ short: s === 0 ? short : uniqueShort(base.slice(0, 5) + s), width: w, units: isStr ? Math.ceil(w / 8) : 1, offset: 252 * s, used: used_ });
    }
    return { ...v, short, isStr, width, segs, veryLong: nSeg > 1 };
  });
  const caseSize = V.reduce((a, v) => a + v.segs.reduce((b, s) => b + s.units, 0), 0);
  const now = new Date();
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()];
  const p2 = (n) => String(n).padStart(2, '0');
  // header
  fixed('$FL2', 4);
  fixed('@(#) SPSS DATA FILE - Chota', 60);
  i32(2); i32(caseSize); i32(0); i32(0); i32(rows.length); f64(100);
  fixed(`${p2(now.getDate())} ${mon} ${String(now.getFullYear()).slice(2)}`, 9);
  fixed(`${p2(now.getHours())}:${p2(now.getMinutes())}:${p2(now.getSeconds())}`, 8);
  fixed('', 64); fixed('', 3);
  // variable records
  let idx = 1;
  for (const v of V) {
    v.index = idx;
    v.segs.forEach((sg, s) => {
      const dec = Math.max(0, Math.min(16, v.decimals || 0));
      const fmt = v.isStr ? ((1 << 16) | (Math.min(255, sg.width) << 8)) : ((5 << 16) | (Math.max(8, dec + 6) << 8) | dec);
      const miss = v.isStr ? [] : (v.missing || []).map(Number).filter((x) => isFinite(x)).slice(0, 3);
      const label = s === 0 ? v.label : '';
      i32(2); i32(v.isStr ? sg.width : 0); i32(label ? 1 : 0); i32(miss.length); i32(fmt); i32(fmt);
      fixed(sg.short, 8);
      if (label) {
        const lb = truncBytes(enc.encode(label), 255);
        i32(lb.length);
        const padded = new Uint8Array(Math.ceil(lb.length / 4) * 4).fill(32); padded.set(lb); push(padded);
      }
      for (const m of miss) f64(m);
      for (let u = 1; u < sg.units; u++) { i32(2); i32(-1); i32(0); i32(0); i32(0); i32(0); fixed('', 8); }
      idx += sg.units;
    });
  }
  // value labels (numeric only)
  for (const v of V) {
    if (v.isStr || !v.valueLabels) continue;
    const ents = Object.entries(v.valueLabels).filter(([c]) => c !== '' && !isNaN(Number(c)));
    if (!ents.length) continue;
    i32(3); i32(ents.length);
    for (const [c, l] of ents) {
      f64(Number(c));
      const lb = truncBytes(enc.encode(String(l)), 120);
      const tot = Math.ceil((lb.length + 1) / 8) * 8;
      const b = new Uint8Array(tot).fill(32); b[0] = lb.length; b.set(lb, 1); push(b);
    }
    i32(4); i32(1); i32(v.index);
  }
  // machine integer info
  i32(7); i32(3); i32(4); i32(8); i32(20); i32(0); i32(0); i32(-1); i32(1); i32(1); i32(2); i32(65001);
  // machine float info
  i32(7); i32(4); i32(8); i32(3); f64(SYSMIS); f64(Number.MAX_VALUE); f64(-1.7976931348623155e308);
  // variable display (measure, width, alignment): one entry per physical variable
  const nPhys = V.reduce((a, v) => a + v.segs.length, 0);
  i32(7); i32(11); i32(4); i32(nPhys * 3);
  for (const v of V) for (let s = 0; s < v.segs.length; s++) { i32(v.isStr ? 1 : ({ nominal: 1, ordinal: 2, scale: 3 }[v.measure] || 1)); i32(v.isStr ? Math.min(v.width, 50) : 8); i32(v.isStr ? 0 : 1); }
  // long variable names
  const ln = enc.encode(V.map((v) => `${v.short}=${v.name.slice(0, 64)}`).join('\t'));
  i32(7); i32(13); i32(1); i32(ln.length); push(ln);
  // very long string widths
  const vls = V.filter((v) => v.veryLong);
  if (vls.length) {
    const t = enc.encode(vls.map((v) => `${v.short}=${String(v.width).padStart(5, '0')}\0\t`).join(''));
    i32(7); i32(14); i32(1); i32(t.length); push(t);
  }
  // encoding record
  const encName = enc.encode('UTF-8');
  i32(7); i32(20); i32(1); i32(encName.length); push(encName);
  // dictionary termination
  i32(999); i32(0);
  // data
  for (const r of rows) {
    for (const v of V) {
      const val = r[v.name];
      if (v.isStr) {
        const bytes = truncBytes(enc.encode(val == null ? '' : String(val)), v.width);
        for (const sg of v.segs) {
          const out = new Uint8Array(sg.units * 8).fill(32);
          out.set(bytes.subarray(sg.offset, Math.min(bytes.length, sg.offset + sg.used))); push(out);
        }
      } else {
        const n = (val === '' || val == null || isNaN(Number(val))) ? SYSMIS : Number(val);
        f64(n);
      }
    }
  }
  const out = new Uint8Array(size); let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/* ===== Krippendorff's alpha, nominal, any number of coders per unit ===== */
function kAlphaNominal(units) {
  // units: array of arrays of values (missing excluded already)
  const o = new Map(); // key "c|k" -> count
  const nc = new Map();
  let n = 0;
  for (const u of units) {
    const vals = u.filter((x) => x !== '' && x != null).map(String);
    const m = vals.length;
    if (m < 2) continue;
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
      if (i === j) continue;
      const key = vals[i] + '|' + vals[j];
      o.set(key, (o.get(key) || 0) + 1 / (m - 1));
    }
    for (const v of vals) nc.set(v, (nc.get(v) || 0) + 1);
    n += m;
  }
  if (n < 2) return null;
  let Do = 0;
  for (const [key, c] of o) { const [a, b] = key.split('|'); if (a !== b) Do += c; }
  Do /= n;
  let De = 0;
  const cats = [...nc.keys()];
  for (const a of cats) for (const b of cats) if (a !== b) De += nc.get(a) * nc.get(b);
  De /= n * (n - 1);
  if (De === 0) return null;
  return 1 - Do / De;
}

/* ===== Krippendorff's alpha for nominal, ordinal or interval data (Krippendorff 2019, ch. 12) ===== */
function kAlpha(units, metric = 'nominal') {
  if (metric === 'nominal') return kAlphaNominal(units);
  const o = new Map(); // "c|k" -> coincidences
  for (const u of units) {
    const vals = u.filter((x) => x !== '' && x != null && !isNaN(Number(x))).map(Number);
    const m = vals.length; if (m < 2) continue;
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) if (i !== j) { const key = vals[i] + '|' + vals[j]; o.set(key, (o.get(key) || 0) + 1 / (m - 1)); }
  }
  const nc = new Map(); let n = 0;
  for (const [key, c] of o) { const a = Number(key.split('|')[0]); nc.set(a, (nc.get(a) || 0) + c); n += c; }
  if (n < 2) return null;
  const cats = [...nc.keys()].sort((a, b) => a - b);
  const delta = (c, k) => {
    if (metric === 'interval') return (c - k) ** 2;
    // ordinal: based on the marginal frequencies of the ranks between c and k
    const lo = Math.min(c, k), hi = Math.max(c, k);
    let s = 0; for (const g of cats) if (g >= lo && g <= hi) s += nc.get(g);
    return (s - (nc.get(c) + nc.get(k)) / 2) ** 2;
  };
  let Do = 0; for (const [key, c] of o) { const [a, b] = key.split('|').map(Number); if (a !== b) Do += c * delta(a, b); }
  let De = 0; for (const a of cats) for (const b of cats) if (a !== b) De += nc.get(a) * nc.get(b) * delta(a, b);
  if (De === 0) return null;
  return 1 - ((n - 1) * Do) / De;
}
// 95% interval from resampling the units (articles) with replacement
function kAlphaCI(units, metric = 'nominal', reps = 1000) {
  const usable = units.filter((u) => u.filter((x) => x !== '' && x != null).length >= 2);
  if (usable.length < 5) return null;
  const out = [];
  for (let r = 0; r < reps; r++) {
    const s = new Array(usable.length);
    for (let i = 0; i < usable.length; i++) s[i] = usable[(Math.random() * usable.length) | 0];
    const a = kAlpha(s, metric); if (a !== null) out.push(a);
  }
  if (out.length < reps * 0.5) return null;
  out.sort((a, b) => a - b);
  return [out[Math.floor(out.length * 0.025)], out[Math.min(out.length - 1, Math.ceil(out.length * 0.975) - 1)]];
}

if (typeof module !== 'undefined') module.exports = { writeSav, kAlphaNominal };
