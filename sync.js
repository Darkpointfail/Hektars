// Hektars Terrain : extraction EZFocus (lancée depuis un onglet insights.ezfocus.ca connecté).
// Lit les magasins et les produits par magasin avec la session de l'utilisateur, calcule les signaux,
// puis envoie le résultat à l'application par postMessage. Aucun mot de passe n'est lu ni stocké.
(async function(){
  const APP = (document.currentScript && new URL(document.currentScript.src).origin) || window.__HK_APP;
  if (location.hostname !== 'insights.ezfocus.ca') { alert('Ouvre d\'abord EZFocus (insights.ezfocus.ca) et connecte-toi, puis relance la synchronisation.'); return; }
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;z-index:99999;right:20px;bottom:20px;background:#24121a;color:#f3e9ec;font:14px/1.4 system-ui,sans-serif;padding:14px 18px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.3);max-width:340px';
  const say = t => { box.textContent = 'Hektars Terrain · ' + t; };
  document.body.appendChild(box);
  try {
    say('lecture des magasins…');
    // période la plus récente : celle affichée par EZFocus
    const perTxt = (document.body.innerText.match(/LAST COMPLETED PERIOD\s*:?\s*(\d{6})/i) || [])[1];
    const AGENT = 17280197;
    const per = perTxt || window.__HK_PER;
    if (!per) throw new Error('Période introuvable sur la page EZFocus. Ouvre l\'accueil EZFocus.');
    const q = (p) => `agent=${AGENT}&perref=${per}&mesure=2&terr=&output=A` + p;
    const sj = await (await fetch('/Reporting/Stores/GetData?' + q(''), { credentials: 'include' })).json();
    const labelsRow = sj.Table1[0];
    const stores = sj.Table.filter(x => x.type2 === 'SUCC' && ['SEL', 'CLA', 'EXP'].includes(x.ban));
    const num = v => (typeof v === 'number' ? v : parseFloat(v)) || 0;
    const R = v => v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
    const PK = k => Array.from({ length: 13 }, (_, i) => 'P' + String(i + 1).padStart(2, '0') + k);
    const PT = PK('TY'), PL = PK('LY');
    const prod = {}, rows = {}, aggRaw = {}, lostRaw = {};
    let done = 0, i = 0;
    async function one(s) {
      const no = s.no_cl.trim();
      for (let a = 0; a < 3; a++) {
        try {
          const t = (await (await fetch('/Reporting/TerrProducts/GetData?' + q('&accnt=' + no), { credentials: 'include' })).json()).Table;
          rows[no] = t.map(x => {
            const id = x.ccnp;
            if (!prod[id]) prod[id] = [String(x.desc_prod).trim(), x.size, num(x.ret_price_curr) || num(x.ret_price), x.code_tp_list, x.categ, x.couleur_nat, x.pays, String(x.cepage3 || '').trim(), String(x.app || '').trim()];
            const k = id + '|' + s.rep; const g = aggRaw[k] || (aggRaw[k] = { t: Array(13).fill(0), l: Array(13).fill(0) });
            PT.forEach((p, j) => g.t[j] += num(x[p])); PL.forEach((p, j) => g.l[j] += num(x[p]));
            if (x.status_prev === 'OBL' && x.status_curr !== 'OBL') (lostRaw[no] = lostRaw[no] || []).push(id);
            return [id, x.status_curr === 'OBL' ? 1 : 0, num(x.inv_succ), num(x.agR03ty), num(x.agR03ly), num(x.agR13ty), num(x.agR13ly)];
          });
          break;
        } catch (e) { if (a === 2) throw new Error('Magasin ' + no + ' illisible : ' + e.message); }
      }
      done++; say(`lecture des produits… ${done}/${stores.length} magasins`);
    }
    await Promise.all(Array.from({ length: 2 }, async () => { while (i < stores.length) { await one(stores[i++]); await new Promise(r => setTimeout(r, 400)); } }));
    say('calcul des signaux…');
    // familles = nom + format
    const famKey = {}, F = [];
    Object.entries(prod).forEach(([id, p]) => {
      const k = p[0] + '|' + p[1];
      if (!(k in famKey)) { famKey[k] = F.length; F.push({ n: p[0], fmt: p[1], px: p[2], type: p[3], cat: p[4], col: p[5], pays: p[6], cep: p[7], app: p[8], codes: [], t13: 0, l13: 0, t3: 0, l3: 0, nT13: 0, nL13: 0, nT3: 0, nObl: 0 }); }
      F[famKey[k]].codes.push(+id);
    });
    const fOf = id => famKey[prod[id][0] + '|' + prod[id][1]];
    const today = new Date();
    const S = stores.map(s => {
      const lv = String(s.last_visit || 0);
      let days = null;
      if (lv.length === 8) days = Math.round((today - new Date(+lv.slice(0, 4), +lv.slice(4, 6) - 1, +lv.slice(6, 8))) / 864e5);
      return { no: s.no_cl.trim(), n: s.nom, v: s.ville, rep: s.rep, ban: s.ban, rang: s.rangsucc, lv, nv: num(s.nbvis), days, t13: num(s.agR13ty), l13: num(s.agR13ly), t3: num(s.agR03ty), l3: num(s.agR03ly), pt: PT.map(k => num(s[k])), pl: PL.map(k => num(s[k])) };
    });
    const M = S.map(s => {
      const m = {};
      (rows[s.no] || []).forEach(r => { const f = fOf(r[0]); const g = m[f] || (m[f] = { obl: 0, inv: 0, t3: 0, l3: 0, t13: 0, l13: 0 }); g.obl |= r[1]; g.inv += r[2]; g.t3 += r[3]; g.l3 += r[4]; g.t13 += r[5]; g.l13 += r[6]; });
      return m;
    });
    M.forEach(m => Object.entries(m).forEach(([f, g]) => { const x = F[f]; x.t13 += g.t13; x.l13 += g.l13; x.t3 += g.t3; x.l3 += g.l3; if (g.t13 > 0) x.nT13++; if (g.l13 > 0) x.nL13++; if (g.t3 > 0) x.nT3++; if (g.obl) x.nObl++; }));
    S.forEach((s, si) => { s.inactive = !(s.t3 > 0); s.sku = Object.values(M[si]).filter(g => g.t3 > 0).length; });
    const qt = (a, p) => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); const ix = (b.length - 1) * p, lo = Math.floor(ix); return b[lo] + (b[Math.min(lo + 1, b.length - 1)] - b[lo]) * (ix - lo); };
    const Z = { obl: 0, inv: 0, t3: 0, l3: 0, t13: 0, l13: 0 };
    const O = [];
    S.forEach((s, si) => {
      if (s.inactive) return;
      const peers = S.map((p, pi) => ({ pi, d: Math.abs(p.rang - s.rang) })).filter(p => p.pi !== si && S[p.pi].ban === s.ban && !S[p.pi].inactive).sort((a, b) => a.d - b.d).slice(0, 20).map(p => p.pi);
      F.forEach((x, f) => {
        const g = M[si][f] || Z;
        const sell = peers.map(pi => (M[pi][f] || Z).t13).filter(v => v > 0);
        const p25 = qt(sell, .25), p50 = qt(sell, .5), np = sell.length;
        const push = (t, v) => O.push([si, f, t, R(g.t13), R(g.l13), R(g.t3), R(g.l3), Math.round(g.inv), R(p25), R(p50), np, R(v)]);
        if (g.obl && g.inv <= 0) return push('O', Math.max(g.t13, g.l13));
        if (x.type === 'Spec Lot') return;
        if (g.t3 > 0.05 && g.inv <= 0) return push('R', g.t13);
        if (Math.max(g.t13, g.l13) >= 3 && g.t3 <= 0 && g.inv <= 0) return push('P', Math.max(g.t13, g.l13));
        if (g.inv > 0 && g.t3 <= 0 && g.t13 + g.l13 > 0) return push('D', 0);
        if (g.t13 <= 0 && g.l13 <= 0 && np >= 10 && p25 >= 3) return push('A', p25);
        if (g.t13 > 0 && g.inv > 0 && np >= 8 && p25 - g.t13 >= 3) return push('S', p25 - g.t13);
      });
    });
    const reps = [...new Set(S.map(s => s.rep))].sort();
    const net = {};
    const agg = {};
    Object.entries(aggRaw).forEach(([k, v]) => {
      const [id, rep] = k.split('|'); const f = fOf(id);
      const n = net[f] || (net[f] = [Array(13).fill(0), Array(13).fill(0)]);
      const a = agg[f + '|' + rep] || (agg[f + '|' + rep] = [Array(13).fill(0), Array(13).fill(0)]);
      for (let j = 0; j < 13; j++) { n[0][j] += v.t[j]; n[1][j] += v.l[j]; a[0][j] += v.t[j]; a[1][j] += v.l[j]; }
    });
    const rr = a => [a[0].map(R), a[1].map(R)];
    const labels = Array.from({ length: 13 }, (_, j) => labelsRow['p' + String(j + 1).padStart(2, '0') + 'ty']);
    const shared = {
      ref: per, gen: today.toISOString().slice(0, 10), labels,
      F: F.map(x => [x.n, x.fmt, x.px, x.type, x.cat, x.col, x.pays, x.cep, x.app, x.codes, 0, R(x.t13), R(x.l13), R(x.t3), R(x.l3), x.nT13, x.nL13, x.nT3, x.nObl]),
      net: Object.fromEntries(Object.entries(net).map(([f, v]) => [f, rr(v)]))
    };
    // une charge utile par représentant (indices de magasins locaux)
    const perRep = {};
    reps.forEach(rep => {
      const idx = []; S.forEach((s, si) => { if (s.rep === rep) idx.push(si); });
      const loc = new Map(idx.map((si, k) => [si, k]));
      perRep[rep] = {
        S: idx.map(si => { const s = S[si]; return [s.no, s.n, s.v, s.ban, s.rang, s.lv, s.nv, s.days, R(s.t13), R(s.l13), R(s.t3), R(s.l3), s.inactive ? 1 : 0, s.pt.map(R), s.pl.map(R), s.sku]; }),
        O: O.filter(o => loc.has(o[0])).map(o => [loc.get(o[0]), ...o.slice(1)]),
        OBL: idx.map(si => Object.entries(M[si]).filter(([, g]) => g.obl).map(([f]) => +f)),
        agg: Object.fromEntries(Object.entries(agg).filter(([k]) => k.endsWith('|' + rep)).map(([k, v]) => [k.split('|')[0], rr(v)])),
        lost: idx.flatMap(si => (lostRaw[S[si].no] || []).map(id => [loc.get(si), fOf(id), R((M[si][fOf(id)] || Z).t13)]))
      };
    });
    say('envoi à Hektars Terrain…');
    const w = window.open(APP + '/#sync', 'hektars-sync');
    if (!w) throw new Error('Le navigateur a bloqué la fenêtre. Autorise les fenêtres pour EZFocus et relance.');
    const msg = { type: 'hektars-sync', shared, perRep };
    let acked = false;
    window.addEventListener('message', e => { if (e.origin === APP && e.data && e.data.type === 'hektars-sync-ack') { acked = true; say(e.data.ok ? `synchronisé : période ${per}, ${S.length} magasins, ${O.length} signaux.` : 'erreur : ' + e.data.error); setTimeout(() => box.remove(), 8000); } });
    for (let k = 0; k < 60 && !acked; k++) { try { w.postMessage(msg, APP); } catch (e) {} await new Promise(r => setTimeout(r, 1000)); }
    if (!acked) say('l\'application n\'a pas répondu. Vérifie que tu y es connecté comme administrateur, puis relance.');
  } catch (e) { say('erreur : ' + e.message); }
})();
