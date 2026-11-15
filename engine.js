/* 제주 동선 플래너 — 계산 엔진
   1) 이동시간: 17개 동네 사이 운전시간 행렬 + 장소 좌표로 ±12분 보정
   2) 하루 시뮬레이션: 영업시간·휴무일·배 시간표·일몰·점심/저녁·비행기 마감 시각 반영
   3) 점수: 시간효율(체험 ÷ (체험+이동+대기))을 0~100으로 환산한 뒤 감점
   4) 최적화: 담금질(simulated annealing)로 날짜·순서·장소·숙소 탐색 후 날마다 순서 완전탐색 */
(function (root) {
  const J = root.JEJU;
  const PL = {};
  J.PLACES.forEach(p => { PL[p.id] = p; });
  const BYGRP = {};
  J.PLACES.forEach(p => { (BYGRP[p.grp] = BYGRP[p.grp] || []).push(p.id); });

  const tm = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };
  const hm = m => { m = Math.round(m); const neg = m < 0; m = Math.abs(m); return (neg ? '-' : '') + String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const dstr = m => { m = Math.round(Math.abs(m)); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? h + '시간 ' + r + '분' : h + '시간') : r + '분'; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /* 조사 붙이기: 받침 유무로 을/를, 이/가, 으로/로 */
  function jong(word) {
    const s = String(word).replace(/[^가-힣]+$/g, '');
    const c = s.charCodeAt(s.length - 1);
    if (!(c >= 0xAC00 && c <= 0xD7A3)) return -1;
    return (c - 0xAC00) % 28;
  }
  const eul = w => w + (jong(w) > 0 ? '을' : '를');
  const iga = w => w + (jong(w) > 0 ? '이' : '가');
  const ro = w => { const j = jong(w); return w + (j > 0 && j !== 8 ? '으로' : '로'); };

  const SUNSET = tm(J.SUN.set);
  const LUNCH_FROM = tm('11:40'), LUNCH_LATE = tm('14:00'), LUNCH_FORCE = tm('14:30');
  const DINNER_AT = tm('18:00');
  const LUNCH_MIN = 60, DINNER_MIN = 80;

  const AIRPORT = { id: 'AIRPORT', name: '제주공항 · 렌터카', zone: 'AIR', lat: 33.5066, lng: 126.4929, kind: 'airport' };
  const LP = {};
  J.LORDER.forEach(z => { const L = J.LODGE[z]; LP[z] = { id: 'L_' + z, name: L.label + ' 숙소', zone: z, lat: L.lat, lng: L.lng, kind: 'lodge' }; });

  function hav(a, b) {
    const R = 6371, r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  const TT = new Map();
  function travel(a, b) {
    if (!a || !b || a.id === b.id) return 0;
    const key = a.id + '>' + b.id;
    let v = TT.get(key);
    if (v != null) return v;
    const d = hav(a, b);
    if (d < 0.15) v = 0;
    else if (a.zone === b.zone) v = Math.max(5, Math.round(d * 1.35 / 36 * 60) + 3);
    else {
      const base = J.MATRIX[a.zone][b.zone];
      const dc = hav(J.ZONES[a.zone], J.ZONES[b.zone]);
      v = Math.max(8, Math.round(base + clamp((d - dc) * 1.1, -12, 12)));
    }
    TT.set(key, v); TT.set(b.id + '>' + a.id, v);
    return v;
  }
  const kmOf = min => Math.round(min * 0.72);

  const paceBuf = cfg => [15, 10, 6][cfg.pace] ?? 10;
  const durOf = (p, it) => (it.o && it.o.dur) || (p.slot && p.slot.dur) || p.dur || 60;
  const stayOf = (p, it) => (it.o && it.o.stay) || p.slot.stay;

  /* 한 장소 방문을 계산(부작용 없음) */
  function visit(p, it, arrive, di) {
    const r = { arrive, start: arrive, end: arrive, wait: 0, active: 0, meal: 0, pen: 0, issues: [], detail: '' };
    const wd = J.DAYS[di].wd;
    if (p.closed && p.closed.includes(wd)) { r.pen += 15; r.issues.push({ lv: 'err', code: 'closed', msg: p.closedMsg || `${J.DAYS[di].wdName}요일 휴무` }); }
    if (p.slot) {
      const S = p.slot;
      const need = arrive + S.checkin;
      const outs = S.out.map(tm);
      const pin = it.o && it.o.slot ? tm(it.o.slot) : null;
      let s = null;
      if (pin != null) {
        if (pin >= need) s = pin;
        else {
          s = outs.find(x => x >= need) ?? null;
          r.pen += 8; r.issues.push({ lv: 'warn', code: 'missed', msg: `지정한 ${it.o.slot} 출항을 못 탐` + (s != null ? ` → ${hm(s)}로 계산` : '') });
        }
      } else s = outs.find(x => x >= need) ?? null;
      if (s == null) {
        r.pen += 30; r.issues.push({ lv: 'err', code: 'noslot', msg: '이 시간 이후 탈 수 있는 배가 없음' });
        r.skipped = true; return r;
      }
      r.slot = s; r.start = s; r.wait = s - arrive;
      if (S.kind === 'ferry') {
        const arr = s + S.ride, stay = stayOf(p, it);
        const backs = S.back.map(tm);
        const fixed = S.pair && S.pair[hm(s)];
        let b = fixed ? tm(fixed) : backs.find(x => x >= arr + stay);
        if (b == null) {
          const ok = backs.filter(x => x >= arr + 20);
          b = ok.length ? ok[ok.length - 1] : null;
          if (b == null) { r.pen += 30; r.issues.push({ lv: 'err', code: 'noreturn', msg: '섬에서 나오는 배가 없음' }); b = arr + stay; }
          else { r.pen += 6; r.issues.push({ lv: 'warn', code: 'short', msg: `섬 체류가 ${b - arr}분으로 줄어듦 (막배)` }); }
        }
        r.island = [arr, b]; r.back = b;
        r.end = b + S.ride + 5;
        r.active = r.end - s;
        r.detail = `${hm(s)} 출항 → ${hm(arr)} 도착 · 섬 ${dstr(b - arr)} → ${hm(b)} 귀항${S.tag && S.tag[hm(s)] ? ` (${S.tag[hm(s)]})` : ''}`;
      } else {
        const d = durOf(p, it);
        r.end = s + d + (S.post || 20);
        r.active = d;
        r.detail = `${hm(s)} 출항 · ${dstr(d)} 낚시 → ${hm(s + d)} 귀항 · 정리 ${S.post || 20}분`;
        if (r.end > SUNSET + 30) { r.pen += 3; r.issues.push({ lv: 'warn', code: 'dark', msg: '해 진 뒤 귀항' }); }
      }
      if (r.wait > S.checkin + 25) r.issues.push({ lv: 'info', code: 'wait', msg: `항구에서 ${dstr(r.wait - S.checkin)} 대기` });
      return r;
    }
    const open = tm(p.open || '00:00'), close = tm(p.close || '23:59');
    const d = durOf(p, it);
    const last = p.last ? tm(p.last) : close - Math.min(30, Math.round(d / 2));
    r.start = Math.max(arrive, open); r.wait = r.start - arrive;
    r.end = r.start + d;
    if (p.meal) r.meal = d; else r.active = d;
    if (r.start > last) { r.pen += 20; r.issues.push({ lv: 'err', code: 'late', msg: `입장 마감(${hm(last)}) 지나서 도착` }); }
    else if (r.end > close + 5) { r.pen += Math.min(15, (r.end - close) / 2); r.issues.push({ lv: 'warn', code: 'over', msg: `영업 종료 ${hm(close)}를 ${r.end - close}분 넘김` }); }
    if (p.day) {
      if (r.start >= SUNSET) { r.pen += 12; r.issues.push({ lv: 'err', code: 'dark', msg: '해 진 뒤 도착 (일몰 ' + J.SUN.set + ')' }); }
      else if (r.end > SUNSET + 5) { r.pen += Math.min(10, (r.end - SUNSET) / 3); r.issues.push({ lv: 'warn', code: 'dark', msg: `일몰 뒤 ${r.end - SUNSET}분까지 야외` }); }
    }
    if (p.meal === 'dinner' && r.start < tm('16:30')) { r.pen += 3; r.issues.push({ lv: 'warn', code: 'meal', msg: '저녁이라기엔 이른 시간' }); }
    if (p.meal === 'lunch' && (r.start < tm('10:45') || r.start > LUNCH_FORCE)) { r.pen += 2; r.issues.push({ lv: 'warn', code: 'meal', msg: '점심 시간대가 아님' }); }
    if (r.wait > 20) r.issues.push({ lv: 'info', code: 'wait', msg: `문 열 때까지 ${dstr(r.wait)} 대기 (오픈 ${p.open})` });
    return r;
  }

  /* 하루 시뮬레이션 */
  function simDay(st, di, list, from, to) {
    const cfg = st.cfg;
    const R = { di, rows: [], travel: 0, wait: 0, active: 0, meal: 0, free: 0, pen: 0, issues: [], start: 0, end: 0, deadline: null, margin: null, from, to };
    const buf = paceBuf(cfg);
    let t = di === 0 ? tm(cfg.arr) + cfg.pick : tm(cfg.start);
    let loc = from;
    const deadline = di === 2 ? tm(cfg.dep) - cfg.ret : null;
    R.deadline = deadline;
    const items = list.filter(x => PL[x.p]);
    const hasLunchItem = items.some(x => PL[x.p].meal === 'lunch');
    const hasDinnerItem = items.some(x => PL[x.p].meal === 'dinner');
    let lunchDone = !cfg.meals || hasLunchItem;

    if (di > 0 && items.length) {
      const p0 = PL[items[0].p];
      if (p0.slot && p0.early) {
        const tr = travel(loc, p0);
        const outs = p0.slot.out.map(tm);
        const pin = items[0].o && items[0].o.slot ? tm(items[0].o.slot) : null;
        const s = pin != null ? pin : outs[0];
        const lv = s - p0.slot.checkin - tr;
        if (lv < t) t = Math.max(tm('04:30'), lv);
      }
    }
    R.start = t;
    R.rows.push({ type: 'start', t, at: loc, label: di === 0 ? '제주공항 도착 · 렌터카 인수' : (loc.kind === 'lodge' ? loc.name + ' 출발' : '출발'), note: di === 0 ? `비행기 ${cfg.arr} 도착 + 인수 ${cfg.pick}분` : '' });
    if (di > 0 && t < tm('06:00')) { R.pen += t < tm('05:00') ? 6 : 2; R.issues.push({ lv: 'warn', code: 'early', msg: `새벽 ${hm(t)} 출발` }); }

    const addMeal = (kind, at, startT, extraNote) => {
      const d = kind === 'lunch' ? LUNCH_MIN : DINNER_MIN;
      R.rows.push({ type: 'meal', kind, t: startT, end: startT + d, at, note: extraNote || '' });
      R.meal += d;
      return startT + d;
    };

    for (let k = 0; k < items.length; k++) {
      const it = items[k], p = PL[it.p];
      const tr = travel(loc, p);
      if (!lunchDone && t >= LUNCH_FROM && p.meal !== 'lunch') {
        let ok = t >= LUNCH_FORCE || p.meal === 'dinner';
        if (!ok) {
          const a = visit(p, it, t + tr, di), b = visit(p, it, t + LUNCH_MIN + tr, di);
          if (b.pen <= a.pen && (!p.slot || b.slot === a.slot)) ok = true;
          else {
            /* 미루는 건 섬에서 먹거나 곧 먹을 수 있을 때만 */
            const islandLunch = a.island && (Math.min(a.island[1], LUNCH_FORCE) - Math.max(a.island[0], tm('11:00')) >= 30);
            ok = !(islandLunch || a.end <= LUNCH_FORCE);
          }
        }
        if (ok) {
          const late = t > LUNCH_LATE;
          t = addMeal('lunch', loc, t, late ? '늦은 점심' : '');
          if (late) { R.pen += 3; R.issues.push({ lv: 'warn', code: 'meal', msg: `점심이 ${hm(t - LUNCH_MIN)}로 늦음` }); }
          lunchDone = true;
        }
      }
      if (tr > 0) { R.rows.push({ type: 'drive', t, min: tr, from: loc, to: p }); R.travel += tr; }
      const v = visit(p, it, t + tr, di);
      /* 배를 기다리는 동안 점심시간이 끼면 항구 근처에서 간단히 먹은 것으로 친다 (40~60분) */
      let portMeal = 0;
      if (!lunchDone && p.slot && v.wait > 0 && !v.skipped) {
        const s0 = Math.max(v.arrive, tm('11:00')), s1 = Math.min(v.start - (p.slot.checkin || 0), LUNCH_FORCE);
        if (s1 - s0 >= 40) {
          portMeal = Math.min(LUNCH_MIN, s1 - s0);
          R.rows.push({ type: 'meal', kind: 'lunch', t: s0, end: s0 + portMeal, at: p, note: portMeal < LUNCH_MIN ? '항구 근처에서 간단히' : '항구 근처' });
          R.meal += portMeal; lunchDone = true;
        }
      }
      R.rows.push({ type: 'act', t: v.start, end: v.end, arrive: v.arrive, it, p, k, v });
      R.wait += Math.max(0, v.wait - portMeal); R.active += v.active; R.meal += v.meal; R.pen += v.pen;
      v.issues.forEach(x => R.issues.push(Object.assign({ pid: p.id, name: p.name }, x)));
      if (v.island && !lunchDone) {
        const ov = Math.min(v.island[1], LUNCH_FORCE) - Math.max(v.island[0], tm('11:00'));
        if (ov >= 30) { lunchDone = true; v.lunchOnIsland = true; }
      }
      t = v.end;
      if (!v.skipped) { t += buf; R.travel += buf; }
      loc = p;
    }

    if (!lunchDone && t >= LUNCH_FROM) {
      if (di === 2) {
        if (t + LUNCH_MIN + travel(loc, to) <= deadline) { t = addMeal('lunch', loc, t, t > LUNCH_LATE ? '늦은 점심' : ''); lunchDone = true; }
        else { R.pen += 3; R.issues.push({ lv: 'warn', code: 'meal', msg: '비행기 전 점심 시간이 없음' }); }
      } else {
        if (t > LUNCH_LATE) { R.pen += 3; R.issues.push({ lv: 'warn', code: 'meal', msg: `점심이 ${hm(t)}로 늦음` }); }
        t = addMeal('lunch', loc, t, t > LUNCH_LATE ? '늦은 점심' : ''); lunchDone = true;
      }
    }

    const wantDinner = cfg.meals && !hasDinnerItem && (di < 2 || tm(cfg.dep) >= tm('20:00'));
    if (wantDinner) {
      if (di < 2 && t <= tm('17:00')) {
        const trL = travel(loc, to);
        if (trL > 0) { R.rows.push({ type: 'drive', t, min: trL, from: loc, to }); R.travel += trL; t += trL; loc = to; }
        if (t < DINNER_AT) { R.rows.push({ type: 'free', t, end: DINNER_AT, at: loc }); R.free += DINNER_AT - t; t = DINNER_AT; }
        t = addMeal('dinner', loc, t, '숙소 근처');
      } else if (di < 2) {
        const ds = Math.max(t, tm('17:30'));
        if (ds > t) { R.rows.push({ type: 'free', t, end: ds, at: loc }); R.free += ds - t; }
        t = addMeal('dinner', loc, ds, '마지막 장소 근처');
      } else {
        const ds = Math.max(t, tm('17:30'));
        if (ds + DINNER_MIN + travel(loc, to) <= deadline) t = addMeal('dinner', loc, ds, '공항 가기 전');
      }
    }

    if (loc.id !== to.id) {
      const trE = travel(loc, to);
      if (trE > 0) { R.rows.push({ type: 'drive', t, min: trE, from: loc, to }); R.travel += trE; t += trE; }
    }
    R.rows.push({ type: 'end', t, at: to, label: di === 2 ? '공항 도착 · 렌터카 반납' : to.name + ' 도착' });
    R.end = t;
    if (di === 2) {
      R.margin = deadline - t;
      if (R.margin < 0) { R.pen += 40 + Math.min(30, -R.margin / 2); R.issues.push({ lv: 'err', code: 'flight', msg: `반납·수속 마감(${hm(deadline)})보다 ${dstr(-R.margin)} 늦음 — 비행기 위험` }); }
      else if (R.margin < 20) { R.pen += 5; R.issues.push({ lv: 'warn', code: 'flight', msg: `공항 여유가 ${R.margin}분뿐` }); }
    } else if (t > tm('21:30')) {
      R.pen += Math.min(15, (t - tm('21:30')) / 6);
      R.issues.push({ lv: 'warn', code: 'latenight', msg: `숙소 도착 ${hm(t)}` });
    }
    const len = R.end - R.start;
    if (len > 14 * 60) { R.pen += (len - 14 * 60) / 10; R.issues.push({ lv: 'warn', code: 'long', msg: `하루 일정이 ${dstr(len)}` }); }
    return R;
  }

  function endpoints(st) {
    const a = LP[st.lodge[0]] || LP.SEO, b = LP[st.lodge[1]] || a;
    return { from: [AIRPORT, a, b], to: [a, b, AIRPORT] };
  }

  /* 날별 결과를 합쳐 점수 계산 */
  function combine(st, days) {
    const issues = [];
    let pen = 0;
    const seen = {};
    st.days.forEach((list, di) => list.forEach(it => {
      if (seen[it.p]) { pen += 10; issues.push({ lv: 'err', code: 'dup', msg: `${iga(PL[it.p] ? PL[it.p].name : it.p)} 두 번 들어감` }); }
      seen[it.p] = 1;
    }));
    st.days.forEach((list, di) => {
      const sea = list.filter(it => PL[it.p] && PL[it.p].sea).length;
      if (di === 2 && sea) { pen += 4 * sea; issues.push({ lv: 'info', code: 'sea3', msg: '3일차에 배 일정 — 결항되면 미룰 날이 없음' }); }
      if (sea >= 2) { pen += 2 * (sea - 1); issues.push({ lv: 'info', code: 'seamany', msg: `${di + 1}일차에 배 일정 ${sea}개 — 바람 불면 한꺼번에 취소될 수 있음` }); }
    });
    if (st.lodge[0] !== st.lodge[1]) { pen += 4; issues.push({ lv: 'info', code: 'move', msg: '숙소 이동 1회 (체크아웃·짐 옮기기)' }); }
    const tot = { travel: 0, wait: 0, active: 0, meal: 0, free: 0 };
    let dayPen = 0;
    days.forEach(d => { tot.travel += d.travel; tot.wait += d.wait; tot.active += d.active; tot.meal += d.meal; tot.free += d.free; dayPen += d.pen; });
    const denom = tot.active + tot.travel + tot.wait;
    const E = denom > 0 ? tot.active / denom : 0;
    const effScore = clamp((E - 0.30) / 0.45 * 100, 0, 100);
    const raw = effScore - dayPen - pen;
    const score = Math.round(clamp(raw, 0, 100) * 10) / 10;
    const nErr = days.reduce((n, d) => n + d.issues.filter(x => x.lv === 'err').length, 0) + issues.filter(x => x.lv === 'err').length;
    const nWarn = days.reduce((n, d) => n + d.issues.filter(x => x.lv === 'warn').length, 0) + issues.filter(x => x.lv === 'warn').length;
    return { days, issues, pen, dayPen, E, effScore, raw, score, tot, nErr, nWarn, obj: raw - tot.travel * 0.002 };
  }

  function evaluate(st) {
    const ep = endpoints(st);
    const days = st.days.map((list, di) => simDay(st, di, list, ep.from[di], ep.to[di]));
    return combine(st, days);
  }

  /* ───── 순서 최적화 (하루 단위 완전탐색) ───── */
  function permute(arr, fn) {
    const a = arr.slice(), n = a.length, c = new Array(n).fill(0);
    fn(a);
    let i = 0;
    while (i < n) {
      if (c[i] < i) { const j = i % 2 ? c[i] : 0; [a[j], a[i]] = [a[i], a[j]]; fn(a); c[i]++; i = 0; }
      else { c[i] = 0; i++; }
    }
  }
  function dayObjective(st, di, list, from, to, others) {
    const r = simDay(st, di, list, from, to);
    const days = others.slice(); days[di] = r;
    let a = 0, t = 0, w = 0, pn = 0;
    days.forEach(d => { a += d.active; t += d.travel; w += d.wait; pn += d.pen; });
    const E = (a + t + w) > 0 ? a / (a + t + w) : 0;
    return { r, obj: clamp((E - 0.30) / 0.45 * 100, 0, 100) - pn - t * 0.002 };
  }
  function bestOrderDay(st, di, others) {
    const ep = endpoints(st);
    const list = st.days[di];
    if (list.length <= 1) return { list: list.slice(), r: simDay(st, di, list, ep.from[di], ep.to[di]) };
    let best = null, bestObj = -Infinity;
    const consider = cand => {
      const o = dayObjective(st, di, cand, ep.from[di], ep.to[di], others);
      if (o.obj > bestObj + 1e-9) { bestObj = o.obj; best = { list: cand.slice(), r: o.r }; }
    };
    if (list.length <= 7) permute(list, consider);
    else {
      let cur = list.slice(); consider(cur);
      let improved = true, guard = 0;
      while (improved && guard++ < 30) {
        improved = false;
        for (let i = 0; i < cur.length; i++) for (let j = 0; j < cur.length; j++) {
          if (i === j) continue;
          const c = cur.slice(); const [x] = c.splice(i, 1); c.splice(j, 0, x);
          const before = bestObj; consider(c);
          if (bestObj > before + 1e-9) { cur = best.list.slice(); improved = true; }
        }
      }
    }
    return best;
  }
  function orderAll(st) {
    const ep = endpoints(st);
    const s2 = Object.assign({}, st, { days: st.days.map(d => d.slice()) });
    const others = s2.days.map((l, di) => simDay(s2, di, l, ep.from[di], ep.to[di]));
    for (let pass = 0; pass < 2; pass++) {
      for (let di = 0; di < 3; di++) {
        const b = bestOrderDay(s2, di, others);
        s2.days[di] = b.list; others[di] = b.r;
      }
    }
    return s2;
  }

  /* ───── 전체 최적화 (담금질) ───── */
  function rng(seed) {
    let s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* 조금씩 나눠 실행할 수 있는 최적화기. opt: {allowDay, allowPlace, allowLodge, iters, restarts} */
  function createOptimizer(st, opt) {
    opt = Object.assign({ allowDay: true, allowPlace: true, allowLodge: !st.lodgeLk, noSeaLast: true, iters: 4000, restarts: 4 }, opt || {});
    /* 3일차(귀국일)에는 배 일정을 넣지 않는다 — 결항되면 대안이 없으므로. 사용자가 날짜를 고정한 것만 예외 */
    const seaBad = x => opt.noSeaLast && PL[x.p] && PL[x.p].sea && !(x.lk && x.lk.d);
    const objOf = s => evaluate(s).obj - 1000 * s.days[2].filter(seaBad).length;
    const R = rng(hashStr(JSON.stringify(st.days) + st.lodge.join() + JSON.stringify(st.cfg)));
    const cloneS = s => Object.assign({}, s, { lodge: s.lodge.slice(), days: s.days.map(d => d.slice()) });
    const used = s => { const u = {}; s.days.forEach(d => d.forEach(x => { u[x.p] = 1; })); return u; };
    const base = cloneS(st);
    let best = cloneS(st), bestObj = objOf(st);
    const starts = [cloneS(st)];
    if (opt.allowLodge && st.same) {
      const lc = J.LORDER.map(z => { const s2 = cloneS(st); s2.lodge = [z, z]; return { s2, o: objOf(s2) }; }).sort((x, y) => y.o - x.o);
      if (lc[0]) starts.push(lc[0].s2);
      if (lc[1]) starts.push(lc[1].s2);
    }
    while (starts.length < opt.restarts) starts.push(null);
    const total = opt.iters * opt.restarts;
    let r = -1, i = 0, cur = null, curObj = 0, T = 0, done = false, doneIters = 0;
    const cool = Math.pow(0.05 / 8, 1 / opt.iters);

    function nextRestart() {
      r++;
      if (r >= opt.restarts) return false;
      cur = starts[r] ? cloneS(starts[r]) : cloneS(best);
      if (!starts[r]) for (let k = 0; k < 6; k++) cur = mutate(cur) || cur;
      curObj = objOf(cur); T = 8; i = 0;
      return true;
    }
    function finish() {
      let polished = orderAll(best);
      let pObj = objOf(polished);
      if (opt.allowLodge) {
        const zs = st.same ? J.LORDER.map(z => [z, z]) : [];
        zs.forEach(l => {
          const s2 = orderAll(Object.assign(cloneS(polished), { lodge: l }));
          const o2 = objOf(s2);
          if (o2 > pObj + 1e-9) { polished = s2; pObj = o2; }
        });
      }
      if (objOf(base) > pObj) { polished = orderAll(base); }
      best = polished; done = true;
    }
    function run(maxIters) {
      if (done) return true;
      if (r < 0 && !nextRestart()) { finish(); return true; }
      let n = 0;
      while (n < maxIters) {
        if (i >= opt.iters) { if (!nextRestart()) { finish(); return true; } }
        const nx = mutate(cur);
        if (nx) {
          const o = objOf(nx);
          if (o >= curObj || R() < Math.exp((o - curObj) / T)) { cur = nx; curObj = o; }
          if (curObj > bestObj + 1e-9) { bestObj = curObj; best = cloneS(cur); }
        }
        T *= cool; i++; n++; doneIters++;
      }
      return false;
    }
    function mutate(s) {
      const n = cloneS(s);
      const pick = R();
      const all = [];
      n.days.forEach((d, di) => d.forEach((x, k) => all.push([di, k])));
      if (!all.length) return null;
      if (pick < 0.32) {
        if (!opt.allowDay) return null;
        const [di, k] = all[Math.floor(R() * all.length)];
        const x = n.days[di][k];
        if (x.lk && x.lk.d) return null;
        n.days[di].splice(k, 1);
        const dj = Math.floor(R() * 3);
        if (dj === 2 && seaBad(x)) return null;
        n.days[dj].splice(Math.floor(R() * (n.days[dj].length + 1)), 0, x);
        return n;
      } else if (pick < 0.55) {
        const di = Math.floor(R() * 3), d = n.days[di];
        if (d.length < 2) return null;
        const a = Math.floor(R() * d.length); let b = Math.floor(R() * d.length);
        if (a === b) b = (b + 1) % d.length;
        [d[a], d[b]] = [d[b], d[a]];
        return n;
      } else if (pick < 0.80) {
        if (!opt.allowPlace) return null;
        const [di, k] = all[Math.floor(R() * all.length)];
        const x = n.days[di][k], p = PL[x.p];
        if (!p || (x.lk && x.lk.p)) return null;
        const g = BYGRP[p.grp] || [];
        if (g.length < 2) return null;
        const u = used(n);
        const free = g.filter(id => !u[id] && !PL[id].noAuto);
        if (!free.length) return null;
        const q = free[Math.floor(R() * free.length)];
        n.days[di][k] = Object.assign({}, x, { p: q, o: sanitizeOpts(PL[q], x.o) });
        return n;
      } else if (pick < 0.90) {
        if (!opt.allowLodge) return null;
        const z = J.LORDER[Math.floor(R() * J.LORDER.length)];
        if (st.same) n.lodge = [z, z]; else n.lodge[Math.floor(R() * 2)] = z;
        return n;
      } else {
        if (!opt.allowDay || all.length < 2) return null;
        const a = all[Math.floor(R() * all.length)], b = all[Math.floor(R() * all.length)];
        if (a[0] === b[0]) return null;
        const xa = n.days[a[0]][a[1]], xb = n.days[b[0]][b[1]];
        if ((xa.lk && xa.lk.d) || (xb.lk && xb.lk.d)) return null;
        if ((b[0] === 2 && seaBad(xa)) || (a[0] === 2 && seaBad(xb))) return null;
        n.days[a[0]][a[1]] = xb; n.days[b[0]][b[1]] = xa;
        return n;
      }
    }
    return { run, get progress() { return done ? 1 : Math.min(0.99, doneIters / total); }, get done() { return done; }, result: () => best };
  }
  function optimize(st, opt) { const o = createOptimizer(st, opt); o.run(Infinity); return o.result(); }

  function sanitizeOpts(p, o) {
    if (!o || !p.slot) return undefined;
    const r = {};
    if (o.stay && p.slot.stayOpts && p.slot.stayOpts.includes(o.stay)) r.stay = o.stay;
    if (o.dur && p.slot.durOpts && p.slot.durOpts.includes(o.dur)) r.dur = o.dur;
    return Object.keys(r).length ? r : undefined;
  }

  /* ───── 바꿨을 때 효과 계산 ───── */
  function bestInsert(st, base, di, item, skipDi, skipK) {
    // 해당 날짜의 모든 위치에 넣어보고 가장 좋은 결과
    let best = null;
    const d = st.days[di];
    for (let pos = 0; pos <= d.length; pos++) {
      const s2 = Object.assign({}, st, { days: st.days.map(x => x.slice()) });
      s2.days[di].splice(pos, 0, item);
      const e = evaluate(s2);
      if (!best || e.obj > best.e.obj) best = { e, s: s2, pos };
    }
    return best;
  }

  function withoutItem(st, di, k) {
    const s2 = Object.assign({}, st, { days: st.days.map(x => x.slice()) });
    const [x] = s2.days[di].splice(k, 1);
    return { s: s2, x };
  }

  /* 같은 종류 후보로 바꾸면? (위치는 그 날 안에서 가장 좋은 곳) */
  function candidateDeltas(st, base, di, k) {
    const cur = st.days[di][k], p = PL[cur.p];
    const g = BYGRP[p.grp] || [cur.p];
    const u = {}; st.days.forEach((d, i) => d.forEach((x, j) => { if (!(i === di && j === k)) u[x.p] = 1; }));
    const { s: s0 } = withoutItem(st, di, k);
    return g.map(id => {
      if (u[id]) return { id, used: true };
      const item = Object.assign({}, cur, { p: id, o: sanitizeOpts(PL[id], cur.o), lk: Object.assign({}, cur.lk, { p: true }) });
      const b = bestInsert(s0, base, di, item);
      return { id, used: false, score: b.e.score, d: b.e.score - base.score, dTravel: b.e.tot.travel - base.tot.travel, s: b.s, e: b.e, cur: id === cur.p, nErr: b.e.nErr };
    });
  }

  /* 다른 날로 옮기면? */
  function dayMoveDeltas(st, base, di, k) {
    const { s: s0, x } = withoutItem(st, di, k);
    return [0, 1, 2].map(dj => {
      if (dj === di) return { dj, cur: true, score: base.score, d: 0 };
      const b = bestInsert(s0, base, dj, Object.assign({}, x, { lk: Object.assign({}, x.lk, { d: true }) }));
      return { dj, score: b.e.score, d: b.e.score - base.score, dTravel: b.e.tot.travel - base.tot.travel, s: b.s, nErr: b.e.nErr };
    });
  }

  /* 새로 추가하면? (가장 좋은 날·위치) */
  function addDeltas(st, base, pid) {
    const item = { u: 'n' + Math.random().toString(36).slice(2, 8), p: pid };
    let best = null;
    const perDay = [0, 1, 2].map(dj => {
      const b = bestInsert(st, base, dj, item);
      const r = { dj, score: b.e.score, d: b.e.score - base.score, dTravel: b.e.tot.travel - base.tot.travel, dActive: b.e.tot.active - base.tot.active, s: b.s, nErr: b.e.nErr };
      if ((dj < 2 || !PL[pid].sea) && (!best || b.e.obj > best.obj)) best = Object.assign({ obj: b.e.obj }, r);
      return r;
    });
    return { perDay, best };
  }

  /* 숙소 동네별 비교 (각 동네로 바꾸고 순서 재정렬) */
  function lodgeCompare(st) {
    return J.LORDER.map(z => {
      const s2 = Object.assign({}, st, { lodge: [z, z], days: st.days.map(d => d.slice()) });
      const o = orderAll(s2);
      const e = evaluate(o);
      return { z, score: e.score, e, s: o, travel: e.tot.travel, perDay: e.days.map(d => d.travel), early: e.days[1].start };
    }).sort((a, b) => b.e.obj - a.e.obj);
  }

  /* 개선 제안 TOP N (한 번에 하나만 바꾸는 경우) */
  function suggestions(st, base, limit) {
    const out = [];
    const ordered = orderAll(st);
    const eo = evaluate(ordered);
    if (eo.score > base.score + 0.4) out.push({ kind: 'order', d: eo.score - base.score, dTravel: eo.tot.travel - base.tot.travel, s: ordered, msg: '하루 안의 방문 순서만 바꾸기' });
    st.days.forEach((list, di) => list.forEach((x, k) => {
      const p = PL[x.p]; if (!p) return;
      if (!(x.lk && x.lk.d)) {
        dayMoveDeltas(st, base, di, k).forEach(m => { if (!m.cur && m.d > 0.4 && !(m.dj === 2 && p.sea)) out.push({ kind: 'day', d: m.d, dTravel: m.dTravel, s: m.s, msg: `${eul(p.name)} ${m.dj + 1}일차로 옮기기` }); });
      }
      if (!(x.lk && x.lk.p) && (BYGRP[p.grp] || []).length > 1) {
        const c = candidateDeltas(st, base, di, k).filter(c => !c.used && !c.cur && c.d > 0.4).sort((a, b) => b.d - a.d)[0];
        if (c) out.push({ kind: 'place', d: c.d, dTravel: c.dTravel, s: c.s, msg: `${p.name} → ${PL[c.id].name}` });
      }
    }));
    if (!st.lodgeLk) {
      J.LORDER.forEach(z => {
        if (z === st.lodge[0] && z === st.lodge[1]) return;
        const s2 = Object.assign({}, st, { lodge: [z, z] });
        const e = evaluate(s2);
        if (e.score > base.score + 0.4) out.push({ kind: 'lodge', d: e.score - base.score, dTravel: e.tot.travel - base.tot.travel, s: s2, msg: `숙소를 ${ro(J.LODGE[z].label)} (2박)` });
      });
    }
    out.sort((a, b) => b.d - a.d);
    const seen = {};
    return out.filter(o => { if (seen[o.msg]) return false; seen[o.msg] = 1; return true; }).slice(0, limit || 6);
  }

  /* 배 일정이 결항되면 대신 갈 곳 */
  function planB(pid, usedIds) {
    const p = PL[pid];
    return J.PLACES.filter(q => !q.sea && q.cat !== 'food' && !(usedIds && usedIds[q.id]))
      .map(q => ({ q, min: travel(p, q) }))
      .filter(x => x.min <= 30)
      .sort((a, b) => (b.q.rain ? 1 : 0) - (a.q.rain ? 1 : 0) || a.min - b.min)
      .slice(0, 4);
  }

  function grade(score) {
    if (score >= 75) return { label: '아주 효율적', tone: 'ok' };
    if (score >= 62) return { label: '효율적', tone: 'ok' };
    if (score >= 48) return { label: '보통', tone: 'warn' };
    return { label: '손볼 곳이 많음', tone: 'err' };
  }

  const ENGINE = { eul, iga, ro, PL, BYGRP, tm, hm, dstr, clamp, kmOf, AIRPORT, LP, travel, hav, evaluate, simDay, orderAll, optimize, createOptimizer, candidateDeltas, dayMoveDeltas, addDeltas, lodgeCompare, suggestions, planB, grade, sanitizeOpts, SUNSET };
  root.JEJU_ENGINE = ENGINE;
  if (typeof module !== 'undefined') module.exports = ENGINE;
})(typeof window !== 'undefined' ? window : globalThis);
