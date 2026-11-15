/* 제주 12월 동선 플래너 — 화면 */
(function () {
  'use strict';
  const J = window.JEJU, E = window.JEJU_ENGINE, PL = E.PL;
  const { hm, dstr, tm } = E;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* 무시 */ } }
  };
  const KEY = { cur: 'jeju.v1.current', mine: 'jeju.v1.mine', box: 'jeju.v1.box', tab: 'jeju.v1.tab', theme: 'jeju.v1.theme', name: 'jeju.v1.name', viewing: 'jeju.v1.viewing', mode: 'jeju.v1.mode' };
  const DEFAULT_CFG = { arr: '10:00', pick: 50, dep: '17:00', ret: 90, start: '08:30', pace: 1, meals: true };
  const WISH = [
    { k: 'tang', label: '귤밭', test: p => p.cat === 'tang' },
    { k: 'kart', label: '카트', test: p => p.cat === 'kart' },
    { k: 'marado', label: '마라도 짜장면', test: p => p.cat === 'marado' },
    { k: 'udo', label: '우도', test: p => p.cat === 'udo' },
    { k: 'fish', label: '방어낚시', test: p => p.grp === 'fish' },
    { k: 'olle', label: '올레길', test: p => p.cat === 'olle' }
  ];
  const CATVAR = { tang: '--tang', kart: '--kart', marado: '--sea', udo: '--sea', island: '--sea', fish: '--navy', olle: '--olle', flower: '--cam', rest: '--plum', view: '--view', food: '--food' };
  const AREAS = [
    { k: 'all', label: '전체', z: null },
    { k: 'n', label: '제주시·애월', z: ['AIR', 'AEW', 'HAL'] },
    { k: 'w', label: '서부 (협재·고산·중산간)', z: ['HAN', 'GOS', 'WSM'] },
    { k: 'sw', label: '안덕·대정', z: ['ADM', 'AND', 'DAE'] },
    { k: 's', label: '중문·서귀포', z: ['JUN', 'SEO'] },
    { k: 'se', label: '남원·표선', z: ['NAM', 'PYO'] },
    { k: 'e', label: '동부 (성산·구좌·조천)', z: ['SSN', 'GUJ', 'JOC', 'EMT'] }
  ];
  const TABS = [
    { id: 'plan', label: '일정' }, { id: 'map', label: '지도·동네' }, { id: 'pick', label: '체험 고르기' },
    { id: 'best', label: '베스트 동선 10' }, { id: 'stay', label: '숙소' }, { id: 'info', label: '배편·정보' }, { id: 'save', label: '저장·공유' }
  ];
  const DAYVAR = ['--d1', '--d2', '--d3'];
  const COLLECT = String((window.JEJU_CONFIG && window.JEJU_CONFIG.collectUrl) || '').trim();
  const REPO = 'https://github.com/JUNYOUNG-1/jeju-trip-planner/blob/main/';
  let uidN = 0;
  const uid = () => 'i' + Date.now().toString(36) + (uidN++).toString(36);
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ───── 상태 ───── */
  function planToState(pl, cfg) {
    return { v: 1, cfg: Object.assign({}, cfg || DEFAULT_CFG), lodge: pl.lodge.slice(), same: pl.lodge[0] === pl.lodge[1], lodgeLk: false, from: pl.id,
      days: pl.days.map(d => d.map(x => ({ u: uid(), p: (J.ALIAS && J.ALIAS[x.p]) || x.p, o: x.o ? Object.assign({}, x.o) : undefined, lk: {} }))) };
  }
  function sanitize(st) {
    if (!st || !Array.isArray(st.days) || st.days.length !== 3) return null;
    st.cfg = Object.assign({}, DEFAULT_CFG, st.cfg || {});
    st.lodge = (Array.isArray(st.lodge) ? st.lodge : ['SEO', 'SEO']).slice(0, 2).map(z => (J.LODGE[z] ? z : 'SEO'));
    if (st.lodge.length < 2) st.lodge[1] = st.lodge[0];
    st.days = st.days.map(d => (Array.isArray(d) ? d : []).map(x => (x && J.ALIAS && J.ALIAS[x.p] ? Object.assign({}, x, { p: J.ALIAS[x.p] }) : x)).filter(x => x && PL[x.p]).map(x => ({ u: x.u || uid(), p: x.p, o: x.o && Object.keys(x.o).length ? x.o : undefined, lk: x.lk || {} })));
    st.same = st.lodge[0] === st.lodge[1] && st.same !== false;
    st.lodgeLk = !!st.lodgeLk;
    return st;
  }
  let S = sanitize(LS.get(KEY.cur, null)) || planToState(J.PLANS.find(p => p.id === J.DEFAULT_PLAN));
  let EV = E.evaluate(S);
  let lastDelta = null;
  const undoStack = [];
  let tab = LS.get(KEY.tab, 'plan');
  if (!TABS.some(t => t.id === tab)) tab = 'plan';
  let viewing = LS.get(KEY.viewing, null);
  let mode = LS.get(KEY.mode, 'easy') === 'pro' ? 'pro' : 'easy';
  const ui = { pickCat: 'tang', pickArea: 'all', pickTags: [], pickQ: '', pickHideClosed: false, mapDay: 0, mapAll: true, mapSel: null, bestSort: 'score', cfgOpen: false, shareLink: '', saveName: null, saveMemo: '', collect: { status: 'idle', items: [], err: '', t: 0 } };
  let CACHE = {};
  const sig = () => JSON.stringify([S.cfg, S.lodge, S.same, S.days.map(d => d.map(x => [x.p, x.o || 0]))]);
  function cached(key, fn) { const k = key + '|' + sig(); if (!(k in CACHE)) CACHE[k] = fn(); return CACHE[k]; }

  function commit(ns, msg, opt) {
    opt = opt || {};
    const prev = EV;
    undoStack.push(JSON.stringify(S));
    if (undoStack.length > 40) undoStack.shift();
    S = sanitize(ns);
    EV = E.evaluate(S);
    lastDelta = { d: EV.score - prev.score, dTravel: EV.tot.travel - prev.tot.travel, msg };
    LS.set(KEY.cur, S);
    CACHE = {};
    render();
    if (msg && !opt.silent) toast(`${msg} — ${deltaText(lastDelta.d)} · 운전 ${minDelta(lastDelta.dTravel)}`);
  }
  function undo() {
    if (!undoStack.length) { toast('되돌릴 변경이 없어요'); return; }
    const prev = EV;
    S = sanitize(JSON.parse(undoStack.pop()));
    EV = E.evaluate(S);
    lastDelta = { d: EV.score - prev.score, dTravel: EV.tot.travel - prev.tot.travel, msg: '되돌리기' };
    LS.set(KEY.cur, S); CACHE = {}; render();
    toast('한 단계 되돌렸어요');
  }

  /* ───── 표시 도우미 ───── */
  const fmt1 = n => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '');
  function deltaText(d) { if (d > 0.05) return `▲${fmt1(d)}점`; if (d < -0.05) return `▼${fmt1(-d)}점`; return '점수 변화 없음'; }
  function deltaHtml(d, unit) { unit = unit || ''; if (d > 0.05) return `<span class="delta up">▲${fmt1(d)}${unit}</span>`; if (d < -0.05) return `<span class="delta down">▼${fmt1(-d)}${unit}</span>`; return `<span class="delta same">±0${unit}</span>`; }
  function minDelta(m) { m = Math.round(m); if (m > 0) return `+${m}분`; if (m < 0) return `−${-m}분`; return '변화 없음'; }
  function minDeltaHtml(m) { m = Math.round(m); if (m > 0) return `<span class="delta down">운전 +${m}분</span>`; if (m < 0) return `<span class="delta up">운전 −${-m}분</span>`; return `<span class="delta same">운전 ±0</span>`; }
  const badge = p => `<span class="badge c-${p.cat}">${esc(J.CATS[p.cat].short)}</span>`;
  const zshort = z => (J.ZONES[z] ? J.ZONES[z].short : z);
  const lodgeName = z => (J.LODGE[z] ? J.LODGE[z].label : z);
  const lodgeText = st => (st.lodge[0] === st.lodge[1] ? `${lodgeName(st.lodge[0])} 2박` : `${lodgeName(st.lodge[0])} 1박 → ${lodgeName(st.lodge[1])} 1박`);
  const wdOf = di => `${J.DAYS[di].date} (${J.DAYS[di].wdName})`;
  function closedText(p) {
    if (!p.closed || !p.closed.length) return '';
    const names = ['일', '월', '화', '수', '목', '금', '토'];
    return p.closed.map(d => names[d]).join('·') + '요일 휴무';
  }
  function closedOnTrip(p) { return p.closed ? J.DAYS.filter(d => p.closed.includes(d.wd)) : []; }
  function issueChip(x) { return `<span class="pill ${x.lv === 'err' ? 'err' : x.lv === 'warn' ? 'warn' : 'info'}">${esc(x.msg)}</span>`; }
  function coverage(st) { const ps = st.days.flat().map(x => PL[x.p]).filter(Boolean); return WISH.map(w => ({ w, on: ps.some(w.test) })); }
  function coverHtml(st) { return `<div class="cover">${coverage(st).map(c => `<span class="${c.on ? 'on' : 'off'}">${esc(c.w.label)}</span>`).join('')}</div>`; }
  function toast(msg) {
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    $('#toast').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
  function optsDur(p, cur) {
    const base = [30, 40, 45, 50, 60, 75, 90, 100, 110, 120, 150, 180];
    if (!base.includes(p.dur)) base.push(p.dur);
    base.sort((a, b) => a - b);
    return base.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${dstr(v)}${v === p.dur ? ' (기본)' : ''}</option>`).join('');
  }

  /* ───── 상단 점수판 ───── */
  function renderScore() {
    const g = E.grade(EV.score);
    const d = lastDelta ? deltaHtml(lastDelta.d) : '';
    $('#scorebox').innerHTML = `
      <div class="score-meta">
        <span class="score-num" title="효율 점수">${fmt1(EV.score)}<small>점</small></span>
        <span class="score-sub">${esc(g.label)}${EV.nErr ? ` · <b class="bad">문제 ${EV.nErr}</b>` : ''} ${d}</span>
      </div>`;
  }
  function renderTabs() {
    $('#tabs').innerHTML = TABS.map(t => `<button class="tab" role="tab" type="button" data-act="tab" data-tab="${t.id}" aria-selected="${t.id === tab}">${t.label}</button>`).join('');
  }

  /* ───── 일정 화면 ───── */
  function viewingBanner() {
    if (!viewing) return '';
    const when = viewing.t ? new Date(viewing.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    return `<div class="banner"><div><b>${esc(viewing.name || '누군가')}</b>님이 ${esc(when)}에 저장한 계획을 보고 있어요.${viewing.memo ? ` <span class="muted">메모: ${esc(viewing.memo)}</span>` : ''}<div class="note">비교함에 자동으로 담겼어요. 고치면 이 화면에서 바로 반영돼요.</div></div>
      <div class="row"><button class="btn small" data-act="viewing-back" type="button">내 계획으로 돌아가기</button><button class="btn small" data-act="viewing-keep" type="button">이 계획을 내 것으로</button></div></div>`;
  }
  function renderSettings() {
    const c = S.cfg;
    const paceName = ['여유 (장소마다 15분 여유)', '보통 (10분)', '빡빡 (6분)'][c.pace];
    return `<section class="panel settings"><details ${ui.cfgOpen ? 'open' : ''} id="cfgDetails">
      <summary><span>여행 조건</span><span class="sum">제주 도착 ${c.arr} · 렌터카 인수 ${c.pick}분 · 귀국편 ${c.dep} · 숙소 출발 ${c.start} · ${['여유', '보통', '빡빡'][c.pace]}</span></summary>
      <div class="cfg-grid">
        <label class="field">1일차 제주 도착 시각<input type="time" id="cfg-arr" data-chg="cfg" data-f="arr" value="${c.arr}" step="300"></label>
        <label class="field">렌터카 인수까지 (셔틀·수속)<select id="cfg-pick" data-chg="cfg" data-f="pick">${[20, 30, 40, 50, 60].map(v => `<option value="${v}" ${v === c.pick ? 'selected' : ''}>${v}분</option>`).join('')}</select></label>
        <label class="field">3일차 귀국편 출발 시각<input type="time" id="cfg-dep" data-chg="cfg" data-f="dep" value="${c.dep}" step="300"></label>
        <label class="field">반납·수속 여유 (출발 전)<select id="cfg-ret" data-chg="cfg" data-f="ret">${[60, 75, 90, 105, 120].map(v => `<option value="${v}" ${v === c.ret ? 'selected' : ''}>${v}분 전 공항 도착</option>`).join('')}</select></label>
        <label class="field">2·3일차 숙소 출발<input type="time" id="cfg-start" data-chg="cfg" data-f="start" value="${c.start}" step="300"></label>
        <label class="field">일정 강도<select id="cfg-pace" data-chg="cfg" data-f="pace">${[0, 1, 2].map(v => `<option value="${v}" ${v === c.pace ? 'selected' : ''}>${['여유 (장소마다 15분 여유)', '보통 (10분)', '빡빡 (6분)'][v]}</option>`).join('')}</select></label>
        <label class="check" style="align-self:end"><input type="checkbox" id="cfg-meals" data-chg="cfg" data-f="meals" ${c.meals ? 'checked' : ''}> 점심·저녁 시간 자동으로 넣기</label>
      </div>
      <p class="note" style="margin-top:8px">아침 배 낚시가 첫 일정이면 출발 시각은 배 시간에 맞춰 자동으로 당겨져요. 3일차는 귀국편 ${c.ret}분 전(${hm(tm(c.dep) - c.ret)})까지 공항에 도착해야 감점이 없어요. 현재: ${esc(paceName)}.</p>
    </details></section>`;
  }
  function lodgeOptions(sel) { return J.LORDER.map(z => `<option value="${z}" ${z === sel ? 'selected' : ''}>${esc(J.LODGE[z].label)}</option>`).join(''); }
  function renderLodge() {
    const quick = cached('lodgeQuick', () => J.LORDER.map(z => { const s2 = Object.assign({}, S, { lodge: [z, z] }); return { z, e: E.evaluate(s2) }; }).sort((a, b) => b.e.score - a.e.score));
    const best = quick[0];
    const L = J.LODGE[S.lodge[0]];
    const better = best && best.e.score > EV.score + 0.3 && !(S.lodge[0] === best.z && S.lodge[1] === best.z);
    return `<section class="panel">
      <div class="panel-head"><h3>숙소</h3><button class="btn small" type="button" data-act="tab" data-tab="stay">동네별 비교표</button></div>
      <div class="lodgebar">
        <label class="field">1박 · 12/28 (월)<select id="lodge-0" data-chg="lodge" data-n="0">${lodgeOptions(S.lodge[0])}</select></label>
        <label class="field">2박 · 12/29 (화)<select id="lodge-1" data-chg="lodge" data-n="1" ${S.same ? 'disabled' : ''}>${lodgeOptions(S.lodge[1])}</select></label>
        <label class="check"><input type="checkbox" id="lodge-same" data-chg="same" ${S.same ? 'checked' : ''}> 한 곳에서 2박</label>
        <label class="check"><input type="checkbox" id="lodge-lk" data-chg="lodgeLk" ${S.lodgeLk ? 'checked' : ''}> 자동 최적화 때 숙소는 그대로</label>
      </div>
      <p class="note" style="margin-top:10px">${esc(L.pros)} <span class="muted">· ${esc(L.cons)}</span></p>
      <p class="note">예시: ${L.ex.map(esc).join(' · ')} <span class="tag">${esc(L.tier)}</span></p>
      ${better ? `<div class="callout acc" style="margin-top:8px">지금 일정이면 <b>${esc(J.LODGE[best.z].label)}</b> 2박이 ${deltaHtml(best.e.score - EV.score)} ${minDeltaHtml(best.e.tot.travel - EV.tot.travel)} <button class="btn small" type="button" data-act="lodge-quick" data-z="${best.z}">이 동네로 바꾸기</button></div>` : ''}
    </section>`;
  }
  function renderToolbar() {
    const sugg = cached('sugg', () => E.suggestions(S, EV, 5));
    CACHE.suggList = sugg;
    return `<section class="panel">
      <div class="toolbar">
        <button class="btn primary" type="button" data-act="optimize">자동 최적화</button>
        <button class="btn" type="button" data-act="order-all">하루 순서만 정리</button>
        <button class="btn" type="button" data-act="undo" ${undoStack.length ? '' : 'disabled'}>되돌리기</button>
        <button class="btn" type="button" data-act="tab" data-tab="best">베스트 동선에서 고르기</button>
        <button class="btn ghost" type="button" data-act="clear-plan">전부 비우기</button>
      </div>
      <div style="margin-top:12px">
        <div class="eyebrow" style="margin-bottom:6px">한 가지만 바꾼다면 · 개선 제안</div>
        ${sugg.length ? `<div class="sugg">${sugg.map((s, i) => `<div class="sugg-item"><div class="txt">${esc(s.msg)}</div><div class="row">${deltaHtml(s.d)} ${minDeltaHtml(s.dTravel)}<button class="btn small" type="button" data-act="sugg" data-i="${i}">적용</button></div></div>`).join('')}</div>` : '<p class="note">하나만 바꿔서 좋아지는 방법이 없어요. 지금 구성에서는 꽤 잘 짜인 상태예요.</p>'}
      </div>
    </section>`;
  }
  function slotControls(p, it, di, k) {
    const o = it.o || {};
    if (!p.slot) {
      const cur = o.dur || p.dur;
      return `<select class="sel" aria-label="머무는 시간" data-chg="dur" data-di="${di}" data-k="${k}">${optsDur(p, cur)}</select>`;
    }
    const S2 = p.slot;
    if (S2.kind === 'ferry') {
      const outs = S2.out;
      return `<select class="sel" aria-label="출항 시각" data-chg="slot" data-di="${di}" data-k="${k}"><option value="">출항 자동 (가장 빠른 배)</option>${outs.map(v => `<option value="${v}" ${o.slot === v ? 'selected' : ''}>${v} 출항</option>`).join('')}</select>
        ${S2.pair ? '<span class="small muted">귀항편 고정</span>' : `<select class="sel" aria-label="섬 체류" data-chg="stay" data-di="${di}" data-k="${k}">${S2.stayOpts.map(v => `<option value="${v}" ${(o.stay || S2.stay) === v ? 'selected' : ''}>섬 ${dstr(v)}${v === S2.stay ? ' (기본)' : ''}</option>`).join('')}</select>`}`;
    }
    const outs = S2.outOpts || S2.out;
    return `<select class="sel" aria-label="출항 시각" data-chg="slot" data-di="${di}" data-k="${k}"><option value="">출항 ${S2.out[0]} (기본)</option>${outs.map(v => `<option value="${v}" ${o.slot === v ? 'selected' : ''}>${v} 출항</option>`).join('')}</select>
      <select class="sel" aria-label="낚시 시간" data-chg="dur" data-di="${di}" data-k="${k}">${S2.durOpts.map(v => `<option value="${v}" ${(o.dur || S2.dur) === v ? 'selected' : ''}>낚시 ${dstr(v)}${v === S2.dur ? ' (기본)' : ''}</option>`).join('')}</select>`;
  }
  function renderDay(di) {
    const d = EV.days[di];
    const items = S.days[di];
    const alts = cached('alts' + di, () => items.map((x, k) => (x.lk && x.lk.d) ? null : E.dayMoveDeltas(S, EV, di, k)));
    const dayIssues = d.issues.filter(x => !x.pid);
    const used = {}; S.days.flat().forEach(x => { used[x.p] = 1; });
    const rows = d.rows.map(r => {
      if (r.type === 'start') return `<li class="tl-start"><span class="tt">${hm(r.t)}</span><span class="dot"></span>${esc(r.label)}${r.note ? `<div class="note">${esc(r.note)}</div>` : ''}</li>`;
      if (r.type === 'end') return `<li class="tl-end"><span class="tt">${hm(r.t)}</span><span class="dot"></span>${esc(r.label)}</li>`;
      if (r.type === 'drive') return `<li class="tl-drive"><span class="dot"></span>차로 ${r.min}분 · 약 ${E.kmOf(r.min)}km → ${esc(r.to.kind ? r.to.name : zshort(r.to.zone))}</li>`;
      if (r.type === 'meal') return `<li class="tl-meal"><span class="tt">${hm(r.t)}</span><span class="dot"></span><span class="box">${r.kind === 'lunch' ? '점심' : '저녁'} ${r.end - r.t}분 · ${esc(r.note || '근처 식당')}</span></li>`;
      if (r.type === 'free') return (r.end - r.t < 15) ? '' : `<li class="tl-free"><span class="tt">${hm(r.t)}</span><span class="dot"></span>자유시간 ${dstr(r.end - r.t)} · ${esc(r.at.kind === 'lodge' ? '숙소에서 쉬기' : '주변 산책·카페')}</li>`;
      const p = r.p, it = r.it, k = r.k, v = r.v;
      const g = E.BYGRP[p.grp] || [];
      const hasErr = v.issues.some(x => x.lv === 'err');
      const detail = p.slot ? v.detail : `${p.open || ''}${p.close ? '~' + p.close : ''} 영업 · 머무는 시간 ${dstr(v.end - v.start)}`;
      const alt = alts[k];
      const altHtml = alt ? `<div class="alt">다른 날이면 ${alt.filter(a => !a.cur).map(a => `${a.dj + 1}일차 ${a.nErr > EV.nErr ? '<span class="delta down">시간 부족</span>' : deltaHtml(a.d)}`).join(' · ')}</div>` : '';
      const locks = `${it.lk && it.lk.d ? `<button class="lock" type="button" data-act="unlock" data-f="d" data-di="${di}" data-k="${k}" title="자동 최적화가 날짜를 바꾸지 않음. 누르면 해제">날짜 고정 ✕</button>` : ''}${it.lk && it.lk.p ? `<button class="lock" type="button" data-act="unlock" data-f="p" data-di="${di}" data-k="${k}" title="자동 최적화가 장소를 바꾸지 않음. 누르면 해제">장소 고정 ✕</button>` : ''}`;
      return `<li class="act"><span class="tt">${hm(v.start)}<br>${hm(v.end)}</span><span class="dot"></span>
        <div class="act-card ${hasErr ? 'has-err' : ''}">
          <div class="act-title">${badge(p)}<strong>${esc(p.name)}</strong><span class="zone">${esc(zshort(p.zone))}</span>${v.lunchOnIsland ? '<span class="pill acc">점심은 섬에서</span>' : ''}</div>
          <div class="act-detail">${esc(detail)}${v.wait > 0 && !p.slot ? ` · 도착 ${hm(v.arrive)}` : ''}</div>
          ${v.issues.length ? `<div class="issues">${v.issues.map(issueChip).join('')}</div>` : ''}
          <div class="ctrl">
            <button class="btn small" type="button" data-act="up" data-di="${di}" data-k="${k}" aria-label="위로" ${k === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn small" type="button" data-act="down" data-di="${di}" data-k="${k}" aria-label="아래로" ${k === items.length - 1 ? 'disabled' : ''}>↓</button>
            <select class="sel" aria-label="날짜" data-chg="day" data-di="${di}" data-k="${k}">${[0, 1, 2].map(j => `<option value="${j}" ${j === di ? 'selected' : ''}>${j + 1}일차</option>`).join('')}</select>
            ${slotControls(p, it, di, k)}
            ${g.length > 1 ? `<button class="btn small" type="button" data-act="swap" data-di="${di}" data-k="${k}">다른 곳으로 (${g.length})</button>` : ''}
            <button class="btn small" type="button" data-act="info" data-id="${p.id}">정보</button>
            <button class="btn small ghost" type="button" data-act="del" data-di="${di}" data-k="${k}">삭제</button>
            ${locks}
          </div>
          ${altHtml}
        </div></li>`;
    }).join('');
    const seaItems = items.filter(x => PL[x.p].sea);
    const planB = seaItems.map(x => {
      const alts2 = E.planB(x.p, used);
      return alts2.length ? `<div class="planb callout sea"><b>${esc(PL[x.p].name.split(' — ')[0].split(' (')[0])} 결항 시</b> → ${alts2.map(a => `${esc(a.q.name)} <span class="muted">${a.min}분${a.q.rain ? ' · 실내' : ''}</span>`).join(' · ')}</div>` : '';
    }).join('');
    const marginTxt = di === 2 && d.margin != null ? ` · 공항 여유 <b>${d.margin >= 0 ? dstr(d.margin) : '부족 ' + dstr(-d.margin)}</b>` : '';
    return `<article class="day" style="--dc:var(${DAYVAR[di]})">
      <div class="day-head">
        <h3>${J.DAYS[di].label} <small>${wdOf(di)}</small></h3>
        <div class="day-stats"><span><b>${hm(d.start)}</b> 출발 → <b>${hm(d.end)}</b> ${esc(d.to.kind === 'airport' ? '공항' : lodgeName(d.to.zone))}</span><span>운전 <b>${dstr(d.travel)}</b></span><span>체험 <b>${dstr(d.active)}</b></span><span>대기 <b>${dstr(d.wait)}</b></span>${marginTxt ? `<span>${marginTxt}</span>` : ''}</div>
        ${dayIssues.length ? `<div class="issues">${dayIssues.map(issueChip).join('')}</div>` : ''}
      </div>
      <ol class="tl">${rows}</ol>
      <div class="day-foot">
        <button class="btn small" type="button" data-act="add-open" data-di="${di}">＋ ${J.DAYS[di].label}에 추가</button>
        ${planB}
      </div>
    </article>`;
  }
  function renderExplain() {
    const t = EV.tot;
    const planIssues = EV.issues;
    return `<section class="panel">
      <div class="panel-head"><h3>점수는 이렇게 계산돼요</h3>${coverHtml(S)}</div>
      <p class="formula">시간효율 = 체험 ${dstr(t.active)} ÷ (체험 ${dstr(t.active)} + 운전·주차 ${dstr(t.travel)} + 대기 ${dstr(t.wait)}) = <b>${(EV.E * 100).toFixed(1)}%</b>
        → 환산 <b>${fmt1(EV.effScore)}점</b> (30%=0점, 75%=100점) − 감점 <b>${fmt1(EV.dayPen + EV.pen)}점</b> = <b>${fmt1(EV.score)}점</b></p>
      <p class="note" style="margin-top:6px">감점 기준: 휴무일 방문 15 · 입장 마감 뒤 도착 20 · 배를 못 탐 30 · 비행기 반납 마감 초과 40+ · 일몰 뒤 야외 최대 10 · 늦은 점심 3 · 새벽 5시 전 출발 6 · 밤 9시 반 넘어 숙소 도착 최대 15 · 하루 14시간 초과 · 3일차 배 일정(결항 대비 불가) 4, 자동으로 짤 때는 아예 넣지 않음 ·하루에 배 일정 2개 2 · 숙소 이동 4. 식사·자유시간은 효율 계산에서 빠져요.</p>
      ${planIssues.length ? `<div class="issues" style="margin-top:8px">${planIssues.map(issueChip).join('')}</div>` : ''}
    </section>`;
  }
  function modeSwitch() {
    return `<div class="ez-top"><div class="seg" role="group" aria-label="일정 화면 방식"><button type="button" data-act="mode" data-m="easy" aria-pressed="${mode === 'easy'}">쉽게 짜기</button><button type="button" data-act="mode" data-m="pro" aria-pressed="${mode === 'pro'}">자세히 고치기</button></div>
      <span class="note">${mode === 'easy' ? '하고 싶은 것만 고르면 날짜·순서·장소는 알아서 정해져요' : '시간·순서·배 시간까지 하나하나 고쳐요'}</span></div>`;
  }
  function viewPlan() {
    if (mode === 'easy') return viewEasy();
    return `<div class="view">${modeSwitch()}${viewingBanner()}${renderSettings()}${renderLodge()}${renderToolbar()}
      <div class="days">${[0, 1, 2].map(renderDay).join('')}</div>
      ${renderExplain()}</div>`;
  }

  /* ───── 쉽게 짜기 ───── */
  const EXTRA = [
    { k: 'bangeo', label: '방어회 저녁', test: p => p.id === 'x_bangeo', seed: 'x_bangeo' },
    { k: 'flower', label: '동백꽃 명소', test: p => p.cat === 'flower', seed: 'x_camellia' },
    { k: 'spa', label: '탄산온천', test: p => p.id === 'x_spa', seed: 'x_spa' }
  ];
  const WSEED = { tang: 't_eunha', kart: 'k_981', marado: 'm_songak', udo: 'u_seongsan', fish: 'f_gm_am', olle: 'o10a' };
  const WDESC = { tang: '귤 따기 체험', kart: '카트 타기', marado: '배 타고 가서 짜장면', udo: '배 15분, 섬 한 바퀴', fish: '배 지깅 3~4시간', olle: '바닷길 걷기 2~3시간' };
  const WCOLOR = { tang: '--tang', kart: '--kart', marado: '--sea', udo: '--sea', fish: '--navy', olle: '--olle' };
  let ezRun = null;
  const ezBase = () => clone(ezRun ? ezRun.base : S);
  function findWish(st, test) {
    for (let di = 0; di < 3; di++) { const k = st.days[di].findIndex(x => PL[x.p] && test(PL[x.p])); if (k >= 0) return { di, k, p: PL[st.days[di][k].p] }; }
    return null;
  }
  const timeOpts = (from, to, cur) => { const a = []; for (let t = tm(from); t <= tm(to); t += 5) a.push(hm(t)); if (!a.includes(cur)) { a.push(cur); a.sort(); } return a.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${v}</option>`).join(''); };
  /* 바뀐 조건으로 날짜·순서·장소·숙소를 다시 계산해서 적용 (계산 중 다른 걸 누르면 새로 시작) */
  function ezBuild(base, msg) {
    if (ezRun) ezRun.cancel = true;
    base = sanitize(base); base.from = null;
    if (!base.days.some(d => d.length)) { ezRun = null; commit(base, msg); return; }
    const run = { base, cancel: false };
    ezRun = run;
    const o = E.createOptimizer(base, { allowDay: true, allowPlace: true, allowLodge: !base.lodgeLk, iters: 6000, restarts: 5 });
    render();
    const tick = () => {
      if (run.cancel) return;
      const t0 = performance.now();
      while (performance.now() - t0 < 40) { if (o.run(120)) break; }
      const bar = $('#ezProg i'); if (bar) bar.style.width = Math.round(o.progress * 100) + '%';
      if (!o.done) { setTimeout(tick, 0); return; }
      ezRun = null;
      const r = clone(o.result()); r.from = null;
      commit(r, msg);
    };
    setTimeout(tick, 20);
  }
  function ezToggle(w, seed) {
    if (!w) return;
    const n = ezBase();
    if (findWish(n, w.test)) {
      n.days = n.days.map(d => d.filter(x => !(PL[x.p] && w.test(PL[x.p]))));
      ezBuild(n, `${w.label} 뺌`);
      return;
    }
    // 가장 좋은 날·자리에 먼저 끼워 넣고(3일차엔 배 일정 제외) 그다음 전체를 다시 짠다
    let start = null;
    try { start = clone(E.addDeltas(n, E.evaluate(n), seed).best.s); } catch (e) { start = null; }
    if (!start) {
      const sea = PL[seed].sea;
      const cnt = n.days.map((d, i) => d.length + (sea && i === 2 ? 99 : 0));
      n.days[cnt.indexOf(Math.min(...cnt))].push({ u: uid(), p: seed, lk: {} });
      start = n;
    }
    start.days.forEach(d => d.forEach(x => { if (!x.u) x.u = uid(); if (!x.lk) x.lk = {}; }));
    ezBuild(start, `${w.label} 넣음`);
  }
  function ezTile(w, st) {
    const f = findWish(st, w.test);
    return `<button type="button" class="ez-tile" data-act="ez-wish" data-k="${w.k}" aria-pressed="${!!f}" style="--c:var(${WCOLOR[w.k]})">
      <span class="ck" aria-hidden="true"></span><span class="nm">${esc(w.label)}</span><span class="ds">${esc(WDESC[w.k])}</span>
      ${f ? `<span class="at">${f.di + 1}일차 · ${esc(shortName(f.p))}</span>` : '<span class="ds">누르면 넣어요</span>'}</button>`;
  }
  function viewEasy() {
    const st = ezRun ? ezRun.base : S;
    const c = st.cfg;
    const extras = EXTRA.map(x => { const on = !!findWish(st, x.test); return `<button type="button" class="chip" data-act="ez-extra" data-k="${x.k}" aria-pressed="${on}">${on ? '✓ ' : '+ '}${esc(x.label)}</button>`; }).join('');
    return `<div class="view">
      ${modeSwitch()}${viewingBanner()}
      <section class="panel">
        <div class="ez-h"><span class="ez-n">1</span><h3>하고 싶은 것</h3><span class="note">눌러서 넣고 빼면 일정이 다시 짜여요</span></div>
        <div class="ez-tiles">${WISH.map(w => ezTile(w, st)).join('')}</div>
        <div class="row ez-extra"><span class="note">곁들이면 좋은 것</span>${extras}</div>
      </section>
      <div class="ez-two">
        <section class="panel">
          <div class="ez-h"><span class="ez-n">2</span><h3>숙소 동네</h3><span class="note">2박 모두 한 곳</span></div>
          <div class="row"><button type="button" class="chip" data-act="ez-lodge-auto" aria-pressed="${!st.lodgeLk}">알아서 골라줘</button>
            <select class="sel ez-lodge" aria-label="숙소 동네 직접 고르기" data-chg="ez-lodge">${st.lodgeLk ? '' : '<option value="" selected>직접 고르기…</option>'}${lodgeOptions(st.lodgeLk ? st.lodge[0] : '')}</select></div>
          <p class="note" style="margin-top:8px">지금: <b>${esc(lodgeText(st))}</b>${st.lodgeLk ? '' : ' (일정에 맞춰 고른 곳)'} · <button type="button" class="linkbtn" data-act="tab" data-tab="stay">동네 비교</button></p>
        </section>
        <section class="panel">
          <div class="ez-h"><span class="ez-n">3</span><h3>비행기 시간</h3></div>
          <div class="ez-flight">
            <label class="field">12/28 제주 도착<select data-chg="ez-cfg" data-f="arr">${timeOpts('06:00', '13:00', c.arr)}</select></label>
            <label class="field">12/30 제주 출발<select data-chg="ez-cfg" data-f="dep">${timeOpts('11:00', '22:30', c.dep)}</select></label>
          </div>
        </section>
      </div>
      ${ezResult()}
    </div>`;
  }
  function ezResult() {
    const g = E.grade(EV.score);
    const busy = !!ezRun;
    return `<section class="panel ez-res ${busy ? 'busy' : ''}">
      <div class="ez-sum">
        <div><div class="eyebrow">내 일정</div>
          <div class="ez-score"><b>${fmt1(EV.score)}</b><span>점</span><span class="pill ${g.tone}">${g.label}</span></div>
          <div class="note">운전 ${dstr(EV.tot.travel)} · 체험 ${dstr(EV.tot.active)} · ${esc(lodgeText(S))}${EV.nErr ? ` · <b style="color:var(--err)">문제 ${EV.nErr}개</b>` : ''}</div></div>
        <div class="row"><button class="btn primary" type="button" data-act="ez-build" ${busy ? 'disabled' : ''}>${busy ? '새로 짜는 중…' : '다시 짜기'}</button><button class="btn" type="button" data-act="undo" ${undoStack.length && !busy ? '' : 'disabled'}>되돌리기</button></div>
      </div>
      ${busy ? '<div class="progress" id="ezProg"><i></i></div>' : ''}
      <div class="days">${[0, 1, 2].map(ezDay).join('')}</div>
      <p class="note" style="margin-top:12px">시간·순서·배 시간을 하나씩 고치려면 <button type="button" class="linkbtn" data-act="mode" data-m="pro">자세히 고치기</button>, 미리 짜 둔 10가지 중에서 고르려면 <button type="button" class="linkbtn" data-act="tab" data-tab="best">베스트 동선 10</button>.</p>
    </section>`;
  }
  function ezDay(di) {
    const d = EV.days[di];
    const rows = d.rows.map(r => {
      if (r.type === 'start' || r.type === 'end') return `<li class="ez-se"><span class="t">${hm(r.t)}</span><span>${esc(r.label)}</span></li>`;
      if (r.type === 'drive') return `<li class="ez-drive"><span class="t"></span><span>↓ 차로 ${r.min}분</span></li>`;
      if (r.type === 'meal') return `<li class="ez-meal"><span class="t">${hm(r.t)}</span><span>${r.kind === 'lunch' ? '점심' : '저녁'} · ${esc(r.note || '근처 식당')}</span></li>`;
      if (r.type === 'free') return (r.end - r.t < 30) ? '' : `<li class="ez-drive"><span class="t"></span><span>쉬는 시간 ${dstr(r.end - r.t)}</span></li>`;
      if (r.type !== 'act') return '';
      const p = r.p, v = r.v, k = r.k, it = r.it;
      const g = E.BYGRP[p.grp] || [];
      const iss = v.issues.filter(x => x.lv !== 'info');
      const sub = p.slot ? v.detail : `${hm(v.start)}~${hm(v.end)} · ${zshort(p.zone)}`;
      return `<li class="ez-act" style="--c:var(${CATVAR[p.cat]})"><span class="t">${hm(v.start)}</span>
        <div class="b"><div class="nm"><b>${esc(shortName(p))}</b>${it.lk && it.lk.p ? '<span class="pill info">직접 고름</span>' : ''}</div>
          <div class="sub">${esc(sub)}</div>
          ${iss.length ? `<div class="issues">${iss.map(issueChip).join('')}</div>` : ''}
          <div class="ez-ctrl">${g.length > 1 ? `<button class="btn small" type="button" data-act="swap" data-di="${di}" data-k="${k}">다른 곳으로</button>` : ''}<button class="btn small" type="button" data-act="info" data-id="${p.id}">정보</button><button class="btn small ghost" type="button" data-act="ez-del" data-di="${di}" data-k="${k}">빼기</button></div>
        </div></li>`;
    }).join('');
    const dayIssues = d.issues.filter(x => !x.pid && x.lv !== 'info');
    const used = {}; S.days.flat().forEach(x => { used[x.p] = 1; });
    const pb = S.days[di].filter(x => PL[x.p].sea).map(x => { const a = E.planB(x.p, used).slice(0, 2); return a.length ? `${esc(shortName(PL[x.p]))} 배가 안 뜨면 → ${a.map(y => esc(shortName(y.q))).join(' 또는 ')}` : ''; }).filter(Boolean);
    const margin = di === 2 && d.margin != null ? ` · 공항 여유 ${d.margin >= 0 ? dstr(d.margin) : '<b style="color:var(--err)">부족 ' + dstr(-d.margin) + '</b>'}` : '';
    return `<article class="day" style="--dc:var(${DAYVAR[di]})">
      <div class="day-head"><h3>${J.DAYS[di].label} <small>${wdOf(di)}</small></h3>
        <div class="note">운전 ${dstr(d.travel)}${margin}</div>
        ${dayIssues.length ? `<div class="issues">${dayIssues.map(issueChip).join('')}</div>` : ''}</div>
      <ol class="ez-list">${rows}</ol>
      ${pb.length ? `<div class="ez-pb note">${pb.join('<br>')}</div>` : ''}
    </article>`;
  }

  /* ───── 지도 ───── */
  const X0 = 126.14, Y0 = 33.585, SX = 1190, SY = 1417;
  const proj = (lat, lng) => [Math.round((lng - X0) * SX * 10) / 10, Math.round((Y0 - lat) * SY * 10) / 10];
  const COAST = [[33.512, 126.475], [33.516, 126.50], [33.519, 126.52], [33.522, 126.545], [33.526, 126.57], [33.528, 126.595], [33.535, 126.62], [33.545, 126.64], [33.548, 126.665], [33.554, 126.69], [33.560, 126.72], [33.562, 126.75], [33.558, 126.78], [33.552, 126.80], [33.540, 126.83], [33.528, 126.86], [33.518, 126.885], [33.502, 126.905], [33.485, 126.920], [33.472, 126.930], [33.466, 126.938], [33.462, 126.946], [33.455, 126.945], [33.448, 126.935], [33.437, 126.928], [33.425, 126.932], [33.418, 126.925], [33.405, 126.905], [33.390, 126.890], [33.372, 126.878], [33.350, 126.862], [33.330, 126.845], [33.318, 126.820], [33.300, 126.790], [33.290, 126.760], [33.280, 126.730], [33.274, 126.700], [33.270, 126.670], [33.262, 126.645], [33.252, 126.625], [33.245, 126.600], [33.240, 126.580], [33.238, 126.560], [33.238, 126.540], [33.236, 126.515], [33.228, 126.490], [33.230, 126.465], [33.240, 126.440], [33.245, 126.415], [33.240, 126.390], [33.232, 126.370], [33.234, 126.345], [33.232, 126.320], [33.226, 126.300], [33.212, 126.292], [33.198, 126.290], [33.202, 126.275], [33.210, 126.255], [33.215, 126.240], [33.228, 126.215], [33.245, 126.195], [33.268, 126.175], [33.290, 126.162], [33.308, 126.160], [33.330, 126.165], [33.350, 126.175], [33.370, 126.205], [33.388, 126.225], [33.395, 126.240], [33.408, 126.258], [33.420, 126.270], [33.438, 126.290], [33.452, 126.305], [33.465, 126.325], [33.475, 126.350], [33.482, 126.375], [33.488, 126.400], [33.495, 126.425], [33.502, 126.445], [33.508, 126.460]];
  const UDO = [[33.522, 126.945], [33.526, 126.958], [33.517, 126.970], [33.504, 126.968], [33.495, 126.956], [33.501, 126.945], [33.512, 126.941]];
  const ISLES = { udo: [33.508, 126.955], marado: [33.117, 126.267], gapado: [33.170, 126.272], biyang: [33.408, 126.228] };
  const ISLE_OF = { m_songak: 'marado', m_unjin: 'marado', u_seongsan: 'udo', i_gapado: 'gapado', i_biyang: 'biyang' };
  const poly = pts => pts.map(p => proj(p[0], p[1]).join(',')).join(' ');
  function viewMap() {
    const useL = !!window.L;
    const dots = ui.mapAll ? J.PLACES : [];
    const used = {}; S.days.forEach((d, di) => d.forEach(x => { used[x.p] = di + 1; }));
    const zoneLabels = J.ZORDER.map(z => { const [x, y] = proj(J.ZONES[z].lat, J.ZONES[z].lng); return `<text class="map-zlabel" x="${x}" y="${y - 14}" text-anchor="middle">${esc(J.ZONES[z].short)}</text>`; }).join('');
    const [hx, hy] = proj(33.362, 126.533);
    const hall = [70, 48, 28, 12].map(r => `<ellipse class="map-hall" cx="${hx}" cy="${hy}" rx="${r * 1.6}" ry="${r}" />`).join('') + `<text class="map-zlabel" x="${hx}" y="${hy + 5}" text-anchor="middle">한라산</text>`;
    const isl = Object.entries({ marado: 6, gapado: 9, biyang: 6 }).map(([k, r]) => { const [x, y] = proj(ISLES[k][0], ISLES[k][1]); return `<ellipse class="map-land" cx="${x}" cy="${y}" rx="${r * 1.3}" ry="${r}"/>`; }).join('');
    const isLabels = [['마라도', 'marado', 18, 4], ['가파도', 'gapado', 18, 4], ['비양도', 'biyang', -50, -10], ['우도', 'udo', 18, 0]].map(([n, k, dx, dy]) => { const [x, y] = proj(ISLES[k][0], ISLES[k][1]); return `<text class="map-zlabel" x="${x + dx}" y="${y + dy}">${n}</text>`; }).join('');
    const dotSvg = dots.map(p => { const [x, y] = proj(p.lat, p.lng); const on = used[p.id]; return `<circle class="map-dot ${(!on && S.days.flat().length && ui.mapDay) ? 'dim' : ''}" data-act="map-sel" data-id="${p.id}" cx="${x}" cy="${y}" r="${on ? 7 : 5}" style="fill:var(${CATVAR[p.cat]})"><title>${esc(p.name)}</title></circle>`; }).join('');
    let routes = '';
    EV.days.forEach((d, di) => {
      if (ui.mapDay && ui.mapDay !== di + 1) return;
      const pts = [d.from]; d.rows.filter(r => r.type === 'act').forEach(r => pts.push(r.p)); pts.push(d.to);
      const col = `var(${DAYVAR[di]})`;
      routes += `<polyline class="map-route" points="${pts.map(p => proj(p.lat, p.lng).join(',')).join(' ')}" style="stroke:${col}" />`;
      d.rows.filter(r => r.type === 'act').forEach((r, n) => {
        const [x, y] = proj(r.p.lat, r.p.lng);
        const isle = ISLE_OF[r.p.id];
        if (isle) { const [ix, iy] = proj(ISLES[isle][0], ISLES[isle][1]); routes += `<line class="map-ferry" x1="${x}" y1="${y}" x2="${ix}" y2="${iy}" style="stroke:${col}"/>`; }
        routes += `<circle class="map-stop" cx="${x + di * 3}" cy="${y - di * 3}" r="11" style="fill:${col}"/><text class="map-stopnum" x="${x + di * 3}" y="${y - di * 3}">${n + 1}</text>`;
      });
    });
    const [ax, ay] = proj(E.AIRPORT.lat, E.AIRPORT.lng);
    const marks = `<rect x="${ax - 9}" y="${ay - 9}" width="18" height="18" rx="4" style="fill:var(--ink)"/><path d="M${ax - 6} ${ay + 1} L${ax + 6} ${ay - 3} L${ax + 6} ${ay - 1} L${ax} ${ay + 2} L${ax + 2} ${ay + 6} L${ax} ${ay + 6} L${ax - 3} ${ay + 3} Z" style="fill:var(--bg)"/><text class="map-mark-label" x="${ax + 14}" y="${ay - 8}">공항</text>` +
      [...new Set(S.lodge)].map(z => { const L = E.LP[z]; const [x, y] = proj(L.lat, L.lng); return `<path d="M${x - 10} ${y + 8} V${y - 2} L${x} ${y - 11} L${x + 10} ${y - 2} V${y + 8} Z" style="fill:var(--ink)"/><rect x="${x - 3}" y="${y + 1}" width="6" height="7" style="fill:var(--bg)"/><text class="map-mark-label" x="${x + 14}" y="${y + 22}">숙소</text>`; }).join('');
    const sel = ui.mapSel && PL[ui.mapSel] ? placeCard(PL[ui.mapSel], { compact: true }) : '<p class="note">지도의 점을 누르면 그 장소 정보가 여기 나와요. 굵은 번호는 일정 순서예요(색 = 날짜).</p>';
    const svgPart = () => `
        <p class="map-hint">지도를 옆으로 밀어서 보세요</p>
        <div class="map-wrap"><svg viewBox="0 0 1000 690" role="img" aria-label="제주도 지도와 일정 경로">
          <polygon class="map-land" points="${poly(COAST)}"/><polygon class="map-land" points="${poly(UDO)}"/>${isl}${hall}${zoneLabels}${isLabels}${dotSvg}${routes}${marks}
        </svg></div>
        <div class="legend" style="margin-top:8px">${Object.keys(J.CATS).map(c => `<span style="--c:var(${CATVAR[c]})"><i></i>${esc(J.CATS[c].short)}</span>`).join('')}<span>선은 직선 표시(실제 도로와 다름) · 점선은 배</span></div>
        <div style="margin-top:12px">${sel}</div>
`;
    const fromL = E.LP[S.lodge[0]];
    const zoneCards = J.ZORDER.map(z => {
      const Z = J.ZONES[z]; const zp = { id: 'Z_' + z, zone: z, lat: Z.lat, lng: Z.lng };
      const ps = J.PLACES.filter(p => p.zone === z);
      const cnt = {}; ps.forEach(p => { cnt[p.cat] = (cnt[p.cat] || 0) + 1; });
      return `<div class="zone-card"><h4>${esc(Z.name)}</h4><p class="note">${esc(Z.desc)}</p>
        <div class="small">숙소(${esc(lodgeName(S.lodge[0]))})에서 <b class="mono">${E.travel(fromL, zp)}분</b> · 공항에서 <b class="mono">${E.travel(E.AIRPORT, zp)}분</b></div>
        <div class="tags">${Object.entries(cnt).map(([c, n]) => `<span class="tag">${esc(J.CATS[c].short)} ${n}</span>`).join('')}</div></div>`;
    }).join('');
    const mt = `<table class="tbl"><thead><tr><th></th>${J.ZORDER.map(z => `<th class="num">${esc(J.ZONES[z].short)}</th>`).join('')}</tr></thead><tbody>${J.ZORDER.map(a => `<tr><th>${esc(J.ZONES[a].short)}</th>${J.ZORDER.map(b => `<td class="num">${a === b ? '·' : J.MATRIX[a][b]}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    return `<div class="view">
      <section class="panel">
        <div class="panel-head"><h2>지도로 보는 내 동선</h2>
          <div class="chips">${[0, 1, 2, 3].map(d => `<button class="chip" type="button" data-act="map-day" data-d="${d}" aria-pressed="${ui.mapDay === d}">${d ? `<i class="dd" style="--c:var(${DAYVAR[d - 1]})"></i>${d}일차` : '전체'}</button>`).join('')}
          <button class="chip" type="button" data-act="map-all" aria-pressed="${ui.mapAll}">모든 장소 점</button></div></div>
        ${useL ? `<div id="jmap" class="lmap" role="region" aria-label="제주 지도와 일정 경로"></div>
        <div class="legend" style="margin-top:8px">${Object.keys(J.CATS).map(c => `<span style="--c:var(${CATVAR[c]})"><i></i>${esc(J.CATS[c].short)}</span>`).join('')}<span>굵은 색 선 = 날짜별 운전 경로(실제 도로) · 점선 = 배 · 번호 = 방문 순서</span></div>
        <p class="note" style="margin-top:4px">점이나 번호를 누르면 정보와 카카오맵·네이버 지도 바로가기가 떠요. 확대·축소는 + − 버튼이나 두 손가락으로.</p>` : svgPart()}
      </section>
      <section class="panel"><div class="panel-head"><h2>동네 가이드</h2><span class="note">시간은 승용차 평상시 기준</span></div><div class="zones">${zoneCards}</div>
        <details style="margin-top:12px"><summary class="btn small">동네 간 운전시간표 (분)</summary><div class="scroll-x" style="margin-top:8px">${mt}</div></details></section>
    </div>`;
  }


  /* 실제 지도 (Leaflet + OpenStreetMap 타일, 도로 경로는 OSRM). 못 불러오면 그림 지도로 대신 */
  let LMAP = null;
  const ROUTES = LS.get('jeju.v1.routes', {});
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
  const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; };
  const PLANE = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0v5l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z"/></svg>';
  const HOUSE = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3z"/></svg>';
  function mapLinks(p) {
    const n = shortName(p);
    return `<a class="btn small" href="https://map.kakao.com/link/map/${encodeURIComponent(n)},${p.lat},${p.lng}" target="_blank" rel="noopener">카카오맵</a><a class="btn small" href="https://map.naver.com/p/search/${encodeURIComponent(n)}" target="_blank" rel="noopener">네이버 지도</a>`;
  }
  function popHtml(p, extra) {
    const cl = closedText(p);
    const hours = p.open ? `${p.open}~${p.close}${p.last ? ` (입장 ${p.last}까지)` : ''}` : '';
    return `<div class="mp"><div class="mp-h">${badge(p)}<b>${esc(p.name)}</b></div>
      <div class="small muted">${esc(J.ZONES[p.zone] ? J.ZONES[p.zone].name : '')}${hours ? ' · ' + esc(hours) : ''}${cl ? ' · ' + esc(cl) : ''}</div>
      ${p.price ? `<div class="small">${esc(p.price)}</div>` : ''}${extra || ''}
      <div class="mp-a"><button class="btn small" type="button" data-act="info" data-id="${p.id}">자세히</button>${mapLinks(p)}</div></div>`;
  }
  /* 날짜별 실제 도로 경로 — 한 번 받은 건 브라우저에 저장 */
  function roadRoute(pts) {
    const key = pts.map(q => q[0].toFixed(4) + ',' + q[1].toFixed(4)).join(';');
    if (ROUTES[key]) return Promise.resolve(ROUTES[key]);
    const url = 'https://router.project-osrm.org/route/v1/driving/' + pts.map(q => q[1].toFixed(5) + ',' + q[0].toFixed(5)).join(';') + '?overview=simplified&geometries=geojson';
    return fetch(url).then(r => (r.ok ? r.json() : null)).then(j => {
      const c = j && j.routes && j.routes[0] && j.routes[0].geometry && j.routes[0].geometry.coordinates;
      if (!c || c.length < 2) return null;
      const g = c.map(x => [Math.round(x[1] * 1e5) / 1e5, Math.round(x[0] * 1e5) / 1e5]);
      ROUTES[key] = g;
      const ks = Object.keys(ROUTES); if (ks.length > 24) delete ROUTES[ks[0]];
      LS.set('jeju.v1.routes', ROUTES);
      return g;
    }).catch(() => null);
  }
  function mountMap() {
    const el = $('#jmap'); const Lf = window.L;
    if (!el || !Lf) return;
    const map = Lf.map(el, { scrollWheelZoom: false, zoomSnap: 0.25 });
    LMAP = map;
    Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · 경로 <a href="https://project-osrm.org" target="_blank" rel="noopener">OSRM</a>'
    }).addTo(map);
    el.classList.toggle('dark', isDark());
    const dayCol = DAYVAR.map(cssVar);
    const used = {}; S.days.forEach((d, di) => d.forEach(x => { used[x.p] = di + 1; }));
    J.ZORDER.forEach(z => { const Z = J.ZONES[z]; Lf.marker([Z.lat, Z.lng], { icon: Lf.divIcon({ className: 'zl', html: `<span>${esc(Z.short)}</span>`, iconSize: [0, 0] }), interactive: false, keyboard: false }).addTo(map); });
    if (ui.mapAll) J.PLACES.forEach(p => {
      if (used[p.id]) return;
      Lf.circleMarker([p.lat, p.lng], { radius: 6, weight: 1.5, color: '#fff', fillColor: cssVar(CATVAR[p.cat]), fillOpacity: ui.mapDay ? 0.55 : 0.9, opacity: ui.mapDay ? 0.6 : 1 })
        .bindPopup(popHtml(p), { maxWidth: 290 }).addTo(map);
    });
    const bounds = [];
    EV.days.forEach((d, di) => {
      if (ui.mapDay && ui.mapDay !== di + 1) return;
      const acts = d.rows.filter(r => r.type === 'act');
      const pts = [d.from].concat(acts.map(r => r.p), [d.to]).map(q => [q.lat, q.lng]);
      pts.forEach(q => bounds.push(q));
      const halo = Lf.polyline(pts, { color: '#fff', weight: 8, opacity: 0, interactive: false }).addTo(map);
      const line = Lf.polyline(pts, { color: dayCol[di], weight: 4, opacity: 0.6, dashArray: '2 9', lineCap: 'round', interactive: false }).addTo(map);
      roadRoute(pts).then(g => {
        if (!g || LMAP !== map) return;
        halo.setLatLngs(g); halo.setStyle({ opacity: isDark() ? 0.25 : 0.7 });
        line.setLatLngs(g); line.setStyle({ opacity: 0.9, dashArray: null }); line.bringToFront();
      });
      acts.forEach((r, n) => {
        const isle = ISLE_OF[r.p.id];
        if (isle) { Lf.polyline([[r.p.lat, r.p.lng], ISLES[isle]], { color: dayCol[di], weight: 3, dashArray: '6 7', opacity: 0.95, interactive: false }).addTo(map); bounds.push(ISLES[isle]); }
        const extra = `<div class="small"><b style="color:${dayCol[di]}">${di + 1}일차 ${n + 1}번째</b> · ${hm(r.v.start)}~${hm(r.v.end)}</div>`;
        Lf.marker([r.p.lat, r.p.lng], { icon: Lf.divIcon({ className: 'mk', html: `<span style="background:${dayCol[di]}">${n + 1}</span>`, iconSize: [26, 26], iconAnchor: [13 - di * 6, 13 + di * 6] }), zIndexOffset: 1000 + di * 10, title: r.p.name })
          .bindPopup(popHtml(r.p, extra), { maxWidth: 290 }).addTo(map);
      });
    });
    const ico = (html, t) => Lf.divIcon({ className: 'mk-ico', html: `<span title="${t}">${html}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
    Lf.marker([E.AIRPORT.lat, E.AIRPORT.lng], { icon: ico(PLANE, '제주공항'), zIndexOffset: 900 }).bindPopup('<b>제주국제공항</b><div class="small muted">렌터카 인수·반납</div>').addTo(map);
    [...new Set(S.lodge)].forEach(z => {
      const P2 = E.LP[z];
      Lf.marker([P2.lat, P2.lng], { icon: ico(HOUSE, '숙소'), zIndexOffset: 900 })
        .bindPopup(`<div class="mp"><b>숙소 · ${esc(lodgeName(z))}</b><div class="small muted">${esc(J.LODGE[z].pros)}</div><div class="small">예: ${J.LODGE[z].ex.map(esc).join(' · ')}</div></div>`, { maxWidth: 290 }).addTo(map);
      if (ui.mapDay) bounds.push([P2.lat, P2.lng]);
    });
    map.fitBounds(ui.mapDay && bounds.length ? bounds : [[33.13, 126.16], [33.56, 126.97]], { padding: [26, 26] });
    const zl = () => el.classList.toggle('zlo', map.getZoom() < 10);
    map.on('zoomend', zl); zl();
  }

  /* ───── 장소 카드 ───── */
  function where(pid) { for (let di = 0; di < 3; di++) { const k = S.days[di].findIndex(x => x.p === pid); if (k >= 0) return { di, k }; } return null; }
  function placeCard(p, o) {
    o = o || {};
    const w = where(p.id);
    const closed = closedOnTrip(p);
    const meta = [
      ['주소', p.addr], ['시간', p.slot ? (p.slot.kind === 'ferry' ? `출항 ${p.slot.out.slice(0, 8).join(' · ')}${p.slot.out.length > 8 ? ' …' : ''}` : `출항 ${(p.slot.outOpts || p.slot.out).join(' · ')} · ${dstr(p.slot.dur)}`) : (p.open ? `${p.open}~${p.close}${p.last ? ` (입장 ${p.last}까지)` : ''}` : '')],
      ['휴무', p.closedMsg || closedText(p)], ['가격', p.price], ['비 오면', p.vrain], ['내용', p.prog], ['예약', p.res], ['소요', p.slot ? '' : (p.dur ? dstr(p.dur) + (p.km ? ` · ${p.km}km` : '') : '')]
    ].filter(x => x[1]);
    let foot = '';
    if (!o.compact || true) {
      if (w) foot = `<span class="pill acc">${w.di + 1}일차 일정에 있음</span><button class="btn small" type="button" data-act="goto-plan">일정 보기</button>`;
      else if (o.add) {
        const a = o.add;
        foot = `<div class="row"><span class="small muted">넣으면</span>${a.perDay.map(x => `<button class="btn small ${x.dj === a.best.dj && x.nErr <= EV.nErr ? 'primary' : ''}" type="button" data-act="add-day" data-id="${p.id}" data-dj="${x.dj}" title="${x.dj + 1}일차에 넣기">${x.dj + 1}일차 ${x.nErr > EV.nErr ? '시간 부족' : x.d > 0.05 ? '▲' + fmt1(x.d) : x.d < -0.05 ? '▼' + fmt1(-x.d) : '±0'}</button>`).join('')}</div>`;
      } else foot = `<button class="btn small primary" type="button" data-act="add-best" data-id="${p.id}">가장 좋은 날에 추가</button>`;
    }
    const swap = o.swap ? `<div class="callout acc small">지금 일정의 <b>${esc(PL[o.swap.from].name)}</b> 대신 이걸로: ${deltaHtml(o.swap.d)} ${minDeltaHtml(o.swap.dTravel)} <button class="btn small" type="button" data-act="swap-to" data-id="${p.id}">바꾸기</button></div>` : '';
    return `<article class="card ${w ? 'in-plan' : ''}">
      <div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start"><h4>${esc(p.name)}</h4>${badge(p)}</div>
      <div class="zone">${esc(J.ZONES[p.zone].name)}</div>
      ${p.tags && p.tags.length ? `<div class="tags">${p.tags.map(t => `<span class="tag ${t === '추천' || t === '시즌확인됨' ? 'hot' : ''}">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="meta">${meta.map(m => `<div><span>${m[0]}</span><span>${esc(m[1])}</span></div>`).join('')}</div>
      ${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}
      ${closed.length ? `<div class="callout warn small">이번 일정 중 휴무: ${closed.map(d => `${d.date}(${d.wdName})`).join(', ')}</div>` : ''}
      ${p.warn ? `<div class="callout warn small">${esc(p.warn)}</div>` : ''}
      ${p.vconf ? `<div class="callout small vbox"><b>11/15 인터넷 확인</b> · 신뢰도 ${esc(p.vconf)}${p.vnote ? `<br>${esc(p.vnote)}` : ''}${p.vsrc && p.vsrc.length ? `<br>${p.vsrc.slice(0, 2).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">출처${i + 1}</a>`).join(' · ')}` : ''}</div>` : ''}
      ${p.chk ? '<div class="small muted">운영 여부·시간·가격은 출발 전 전화로 다시 확인</div>' : ''}
      ${swap}
      <div class="foot">${foot}${p.src ? `<a class="small" href="${esc(p.src)}" target="_blank" rel="noopener">출처</a>` : ''}</div>
    </article>`;
  }

  /* ───── 체험 고르기 ───── */
  function viewPick() {
    const cat = ui.pickCat;
    const counts = {}; J.PLACES.forEach(p => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    let list = J.PLACES.filter(p => p.cat === cat);
    const area = AREAS.find(a => a.k === ui.pickArea) || AREAS[0];
    if (area.z) list = list.filter(p => area.z.includes(p.zone));
    if (ui.pickTags.length) list = list.filter(p => ui.pickTags.every(t => (p.tags || []).includes(t) || (t === '비와도OK' && p.rain)));
    if (ui.pickHideClosed) list = list.filter(p => !closedOnTrip(p).length && !p.warn);
    if (ui.pickQ) { const q = ui.pickQ.trim(); list = list.filter(p => (p.name + p.addr + (p.prog || '') + (p.note || '')).includes(q)); }
    const tagSet = {}; J.PLACES.filter(p => p.cat === cat).forEach(p => (p.tags || []).forEach(t => { tagSet[t] = (tagSet[t] || 0) + 1; }));
    const tagChips = Object.entries(tagSet).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => `<button class="chip" type="button" data-act="pick-tag" data-t="${esc(t)}" aria-pressed="${ui.pickTags.includes(t)}">${esc(t)}</button>`).join('');
    // 같은 그룹이 이미 일정에 있으면 교체 효과
    const curOfGroup = {};
    S.days.forEach((d, di) => d.forEach((x, k) => { const p = PL[x.p]; if (!curOfGroup[p.grp]) curOfGroup[p.grp] = { di, k, p: x.p }; }));
    const deltas = cached('pick:' + cat, () => {
      const out = {};
      const groups = {};
      J.PLACES.filter(p => p.cat === cat).forEach(p => {
        if (where(p.id)) return;
        const c = curOfGroup[p.grp];
        if (c && (E.BYGRP[p.grp] || []).length > 1) {
          if (!groups[p.grp]) groups[p.grp] = E.candidateDeltas(S, EV, c.di, c.k);
          const cd = groups[p.grp].find(x => x.id === p.id);
          if (cd && !cd.used) out[p.id] = { swap: { from: c.p, d: cd.d, dTravel: cd.dTravel } };
        }
        out[p.id] = Object.assign(out[p.id] || {}, { add: E.addDeltas(S, EV, p.id) });
      });
      return out;
    });
    CACHE.pickDeltas = deltas;
    const sorted = list.slice().sort((a, b) => {
      const da = deltas[a.id], db = deltas[b.id];
      const va = where(a.id) ? 999 : da ? (da.swap ? da.swap.d : da.add.best.d) : -999;
      const vb = where(b.id) ? 999 : db ? (db.swap ? db.swap.d : db.add.best.d) : -999;
      return vb - va;
    });
    return `<div class="view">
      <section class="panel">
        <div class="panel-head"><h2>체험 고르기</h2><span class="note">카드마다 "넣으면/바꾸면 점수가 얼마나 변하는지"를 계산해 좋은 순서로 보여줘요</span></div>
        <div class="cat-bar">${Object.keys(J.CATS).map(c => `<button class="chip" type="button" data-act="pick-cat" data-c="${c}" aria-pressed="${c === cat}">${esc(J.CATS[c].label)} ${counts[c] || 0}</button>`).join('')}</div>
        <div class="row" style="margin-top:10px">
          <div class="chips">${AREAS.map(a => `<button class="chip" type="button" data-act="pick-area" data-a="${a.k}" aria-pressed="${a.k === ui.pickArea}">${esc(a.label)}</button>`).join('')}</div>
        </div>
        <div class="row" style="margin-top:8px">${tagChips}</div>
        <div class="row" style="margin-top:8px">
          <label class="field" style="flex:1;min-width:180px"><input type="search" id="pickQ" placeholder="이름·동네로 찾기" value="${esc(ui.pickQ)}" data-inp="pickQ"></label>
          <label class="check"><input type="checkbox" id="pickHide" data-chg="pickHide" ${ui.pickHideClosed ? 'checked' : ''}> 이번 일정에 휴무·종료 가능한 곳 숨기기</label>
        </div>
        ${cat === 'tang' ? '<p class="note" style="margin-top:8px">12월 말은 노지 감귤 체험 막바지예요. 귤이 떨어지면 일찍 끝내는 곳이 있고, 비가 오면 대부분 노지 체험을 쉬어요(하우스·복합형은 대체 가능). 가기 전날 전화로 꼭 확인하세요.</p>' : ''}
        ${cat === 'fish' ? '<p class="note" style="margin-top:8px">방어는 모슬포·사계(남서쪽)가 본고장이에요. "방어 아님" 표시는 초보용 일반 배낚시입니다. 출항 시간·가격은 업체별로 달라 추정값이에요 — 일정 화면에서 출항 시각과 낚시 시간을 바꿔 볼 수 있어요.</p>' : ''}
      </section>
      <div class="cards">${sorted.map(p => placeCard(p, deltas[p.id] || {})).join('') || '<p class="note">조건에 맞는 곳이 없어요.</p>'}</div>
    </div>`;
  }

  /* ───── 베스트 동선 ───── */
  function viewBest() {
    const res = cached('best', () => J.PLANS.map((pl, i) => { const st = planToState(pl, S.cfg); return { pl, i, st, e: E.evaluate(st) }; }));
    const arr = res.slice();
    if (ui.bestSort === 'score') arr.sort((a, b) => b.e.score - a.e.score);
    return `<div class="view">
      <section class="panel">
        <div class="panel-head"><h2>베스트 동선 10</h2>
          <div class="chips"><button class="chip" type="button" data-act="best-sort" data-s="score" aria-pressed="${ui.bestSort === 'score'}">점수순</button><button class="chip" type="button" data-act="best-sort" data-s="pick" aria-pressed="${ui.bestSort === 'pick'}">추천 순서</button></div></div>
        <p class="note">점수는 지금 "여행 조건"(도착 ${S.cfg.arr} · 귀국편 ${S.cfg.dep})으로 실시간 계산해요. 불러온 뒤 자유롭게 고치고, 바뀐 점수를 확인하세요. 지금 내 계획은 <b>${fmt1(EV.score)}점</b>이에요.</p>
        <div class="callout acc" style="margin-top:10px;display:grid;gap:8px">
          <b>원하는 것만 고르고 알고리즘에게 맡기기</b>
          <div class="chips">${WISH.map(w => `<label class="check"><input type="checkbox" class="wish" value="${w.k}" checked> ${esc(w.label)}</label>`).join('')}
            <label class="check"><input type="checkbox" class="wish" value="flower"> 동백 명소</label>
            <label class="check"><input type="checkbox" class="wish" value="spa"> 탄산온천</label>
            <label class="check"><input type="checkbox" class="wish" value="bangeo" checked> 방어회 저녁</label></div>
          <div class="row"><button class="btn primary small" type="button" data-act="auto-build">이 조합으로 자동 짜기</button><span class="note">장소·날짜·순서·숙소를 모두 알고리즘이 고릅니다(약 2~5초).</span></div>
        </div>
      </section>
      <div class="plans">${arr.map((r, n) => planCard(r, n)).join('')}</div>
    </div>`;
  }
  function planCard(r, n) {
    const { pl, st, e } = r;
    const g = E.grade(e.score);
    const isCur = S.from === pl.id;
    return `<article class="plan-card ${isCur ? 'cur' : ''}">
      <div class="row" style="justify-content:space-between"><span class="rank">${ui.bestSort === 'score' ? `점수 ${n + 1}위` : `추천 ${r.i + 1}`}</span>${isCur ? '<span class="pill acc">지금 불러온 안</span>' : ''}</div>
      <h3>${esc(pl.title)}</h3>
      <div class="score-line"><span class="big">${fmt1(e.score)}</span><span class="pill ${g.tone}">${g.label}</span><span class="small muted">운전 ${dstr(e.tot.travel)} · 대기 ${dstr(e.tot.wait)}${e.nErr ? ` · <b style="color:var(--err)">문제 ${e.nErr}</b>` : ""}</span></div>
      ${coverHtml(st)}
      <div class="small"><b>숙소</b> ${esc(lodgeText(st))}</div>
      <p class="small">${esc(pl.concept)}</p>
      <div class="grid" style="gap:4px">${e.days.map((d, di) => `<div class="dayline" style="--dc:var(${DAYVAR[di]})"><b>${di + 1}일차</b><span>${d.rows.filter(x => x.type === 'act').map(x => esc(shortName(x.p))).join(' → ') || '—'} <span class="muted">(${hm(d.start)}~${hm(d.end)})</span></span></div>`).join('')}</div>
      <div class="small"><span style="color:var(--ok)">좋은 점</span> ${esc(pl.pros)}</div>
      <div class="small"><span style="color:var(--warn)">아쉬운 점</span> ${esc(pl.cons)}</div>
      <div class="row"><button class="btn primary small" type="button" data-act="load-plan" data-id="${pl.id}">이 동선 불러오기</button><span class="small muted">지금 계획 대비 ${deltaHtml(e.score - EV.score)}</span></div>
    </article>`;
  }
  function shortName(p) {
    const m = { m_songak: '마라도(송악산항)', m_unjin: '마라도(운진항)', u_seongsan: '우도', f_gm_am: '방어낚시(하효항 오전)', f_gm_pm: '방어낚시(하효항 오후)', f_baek_pm: '방어낚시(위미항 오후)', f_moseul_day: '방어낚시(모슬포 종일)', x_bangeo: '방어회 저녁' };
    if (m[p.id]) return m[p.id];
    return p.name.replace(/\s*\(.*?\)\s*/g, ' ').replace(/ · .*$/, '').replace(/ — .*$/, '').trim();
  }

  /* ───── 숙소 ───── */
  function viewStay() {
    const rows = cached('lodgeCmp', () => E.lodgeCompare(S));
    CACHE.lodgeRows = rows;
    const curKey = S.lodge.join('/');
    return `<div class="view">
      <section class="panel">
        <div class="panel-head"><h2>숙소 동네 비교</h2><span class="note">지금 일정은 그대로 두고 숙소만 바꾼 뒤, 하루 순서를 다시 맞춘 결과</span></div>
        <div class="scroll-x"><table class="tbl">
          <thead><tr><th>순위</th><th>동네 (2박)</th><th class="num">점수</th><th class="num">지금 대비</th><th class="num">총 운전</th><th class="num">1·2·3일차 운전</th><th class="num">2일차 출발</th><th>가격대</th><th></th></tr></thead>
          <tbody>${rows.map((r, i) => `<tr class="${curKey === r.z + '/' + r.z ? 'cur' : ''}"><td class="num">${i + 1}</td><td><b>${esc(J.LODGE[r.z].label)}</b></td><td class="num">${fmt1(r.score)}</td><td class="num">${deltaHtml(r.score - EV.score)}</td><td class="num">${dstr(r.travel)}</td><td class="num">${r.perDay.map(m => m + '분').join(' · ')}</td><td class="num">${hm(r.early)}</td><td>${esc(J.LODGE[r.z].tier)}</td><td><button class="btn small" type="button" data-act="lodge-set" data-z="${r.z}">이 동네로</button></td></tr>`).join('')}</tbody>
        </table></div>
        <p class="note" style="margin-top:8px">가격대(12/28 체크인·2인 1박, 11/15 예약 사이트 표시가 기준): ₩ 5~12만 · ₩₩ 12~25만 · ₩₩₩ 25만 이상. 실제 요금은 예약 사이트에서 확인하세요. 한 곳에서 2박이 어렵다면 "베스트 동선 10"의 숙소 나누기 안(사계 → 성산)과 비교해 보세요.</p>
      </section>
      <div class="zones">${J.LORDER.map(z => { const L = J.LODGE[z]; return `<div class="zone-card"><h4>${esc(L.label)} <span class="tag">${esc(L.tier)}</span></h4><p class="small"><span style="color:var(--ok)">장점</span> ${esc(L.pros)}</p><p class="small"><span style="color:var(--warn)">단점</span> ${esc(L.cons)}</p><p class="note">${L.ex.map(esc).join(' · ')}</p></div>`; }).join('')}</div>
    </div>`;
  }

  /* ───── 배편·정보 ───── */
  function viewInfo() {
    const ferry = J.FERRY.map(f => `<div class="panel ferry"><div class="panel-head"><h3>${esc(f.title)}</h3><span class="small muted">${esc(f.op)} · ${esc(f.tel)}</span></div>
      <dl class="kv">${f.rows.map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>
      ${f.warn ? `<div class="callout warn small">${esc(f.warn)}</div>` : ''}<a class="small" href="${esc(f.src)}" target="_blank" rel="noopener">출처</a></div>`).join('');
    const used = S.days.flat().map(x => PL[x.p]);
    const checklist = used.filter(p => p.res && p.res !== '없음' && p.res !== '현장').map(p => `<li><b>${esc(p.name)}</b> — ${esc(p.res)}${p.chk ? ' <span class="pill warn">확인 필요</span>' : ''}</li>`).join('');
    const vsum = J.VNOTES ? `<section class="panel"><div class="panel-head"><h3>11/15 인터넷 확인 요약</h3><span class="note">다른 AI가 찾은 결과를 반영했어요. 출처가 약한 값은 장소 카드에 신뢰도로 표시돼요.</span></div><dl class="kv">${J.VNOTES.map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl></section>` : '';
    return `<div class="view">
      ${vsum}${verifyPanel()}
      <div class="two">${ferry}
        <div class="panel"><h3>배 탈 때 꼭 알아둘 것</h3><ul class="list" style="margin-top:8px">
          <li>마라도·가파도·우도·비양도 모두 <b>신분증 원본</b>이 필요해요(모바일 신분증 가능한 곳 있음). 승선신고서를 작성해요.</li>
          <li>12월은 북서풍이 강해 <b>풍랑 결항</b>이 잦아요. 출발 당일 아침 선사에 전화로 운항 여부를 확인하세요. 송악산항이 결항해도 운진항은 뜨는 날이 있어요(반대도).</li>
          <li><b>우도에는 렌터카를 가져갈 수 없어요</b>(2029년 7월까지 연장). 성산항 주차장에 두고 타요.</li>
          <li>마라도 배는 출항 시간에 따라 섬에서 나오는 배가 정해져요. 예매할 때 귀항 시간을 꼭 보세요.</li>
          <li>이 플래너의 배 시간표는 공식 페이지·블로그 기준 값이고 겨울 전용 시간표가 따로 확인되지 않았어요. 출발 1주 전에 한 번 더 확인하세요.</li>
        </ul></div>
      </div>
      <div class="two">
        <div class="panel"><h3>12월 말 제주 날씨·운전</h3><ul class="list" style="margin-top:8px">
          <li>일출 약 <b>${J.SUN.rise}</b>, 일몰 약 <b>${J.SUN.set}</b> — 야외 일정은 5시 반 전에 끝나게 짜야 해요(점수에 반영).</li>
          <li>낮 기온은 대략 5~10도, 바닷바람 때문에 체감은 더 낮아요. 배·낚시용 방한복, 장갑, 멀미약 필수.</li>
          <li>눈이 오면 1100도로·516도로가 통제되거나 체인이 필요할 수 있어요. 공항↔서귀포는 평화로·번영로가 안전해요.</li>
          <li>비 오는 날 대안: 빛의 벙커, 아르떼뮤지엄, 산방산 탄산온천, 오설록, 스누피가든 ("체험 고르기 → 온천·실내").</li>
        </ul></div>
        <div class="panel"><h3>방어 이야기</h3><ul class="list" style="margin-top:8px">
          <li>방어는 11~2월이 제철, 모슬포가 본고장이에요. 2026 최남단 방어축제는 11/19~22라 여행 때는 이미 끝나요(가두리 낚시 체험은 축제 기간만).</li>
          <li>선상낚시는 보통 새벽에 나가요. 모슬포 출조선은 선장 직접 연락이 대부분이라 숙소 예약처럼 미리 전화로 잡아 두세요(1인 요금, 채비 대여, 최소 인원, 결항 시 환불).</li>
          <li>지난 시즌(2026년 1월) 모슬포에서 방어가 잘 안 잡힌다는 보도가 있었어요. 조과는 보장되지 않아요.</li>
          <li>방어회는 모슬포 하모항구로 식당가(부두식당·수눌음·돈지식당 등). 잡은 고기 손질 가능한지도 물어보세요.</li>
        </ul>
        <p class="small" style="margin-top:6px"><a href="${esc(J.SRC.bangeoFest)}" target="_blank" rel="noopener">방어축제 기사</a> · <a href="${esc(J.SRC.bangeoNews)}" target="_blank" rel="noopener">방어 어획 부진 기사</a> · <a href="${esc(J.SRC.moseulFood)}" target="_blank" rel="noopener">모슬포 식당</a></p></div>
      </div>
      <section class="panel"><h3>내 일정 예약·확인 체크리스트</h3>
        <ul class="list" style="margin-top:8px">
          <li><b>렌터카</b> — 공항 렌터카하우스 셔틀 시간 포함 인수 ${S.cfg.pick}분으로 계산. 3일차 반납은 ${hm(tm(S.cfg.dep) - S.cfg.ret)}까지.</li>
          <li><b>숙소</b> — ${esc(lodgeText(S))}</li>
          ${checklist}
          <li><b>준비물</b> — 신분증 원본(배), 멀미약, 방한복·장갑, 보조배터리</li>
        </ul></section>
      <section class="panel"><h3>데이터 출처와 한계</h3>
        <p class="note" style="margin-top:6px">2026년 11월 15일 기준으로 선사 공식 페이지, 여행 정보 사이트, 블로그를 모아 정리했어요. 귤밭은 2024~2026 시즌 운영 정보 기준이고, 12/28~30 운영을 공지로 확인한 곳은 거의 없어요(트로이테마농원만 2027.02.28까지 운영 공지). 좌표는 동네 기준 근사값이라 내비에는 업체명으로 검색하세요. 운전시간은 17개 동네 사이 시간표에 장소별 거리 보정을 더한 추정치예요.</p>
        <div class="row" style="margin-top:8px">${Object.entries({ '마라도(운진항)': J.SRC.wonderful, '마라도(송악산항)': J.SRC.songak, '우도 배': J.SRC.udo, '우도 렌터카': J.SRC.udocar, '비양도': J.SRC.biyang, '가파도': J.SRC.gapa, '귤밭 목록': J.SRC.jejucom, '귤밭 상세': J.SRC.yeogi, '모슬포 출조선 기사': J.SRC.fish }).map(([k, v]) => `<a class="btn small" href="${esc(v)}" target="_blank" rel="noopener">${esc(k)}</a>`).join('')}</div>
      </section>
    </div>`;
  }

  /* ───── 저장·공유 ───── */
  function b64e(str) { const bytes = new TextEncoder().encode(str); let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); }); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(code) { let b = code.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; const bin = atob(b); return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))); }
  function encodeState(st, name, memo) {
    const c = st.cfg;
    const o = { v: 1, n: name || '', m: memo || '', t: Date.now(), c: [c.arr, c.pick, c.dep, c.ret, c.start, c.pace, c.meals ? 1 : 0], l: st.lodge, s: st.same ? 1 : 0, k: st.lodgeLk ? 1 : 0,
      d: st.days.map(d => d.map(x => { const a = [x.p]; const oo = x.o || {}; const lk = (x.lk && x.lk.d ? 1 : 0) | (x.lk && x.lk.p ? 2 : 0); if (oo.slot || oo.stay || oo.dur || lk) a.push(oo.slot || 0, oo.stay || 0, oo.dur || 0, lk); return a; })) };
    return b64e(JSON.stringify(o));
  }
  function decodeState(code) {
    try {
      const o = JSON.parse(b64d(code));
      const st = { v: 1, cfg: { arr: o.c[0], pick: o.c[1], dep: o.c[2], ret: o.c[3], start: o.c[4], pace: o.c[5], meals: !!o.c[6] }, lodge: o.l, same: !!o.s, lodgeLk: !!o.k,
        days: o.d.map(d => d.map(a => { const it = { u: uid(), p: a[0], lk: {} }; if (a.length > 1) { const oo = {}; if (a[1]) oo.slot = a[1]; if (a[2]) oo.stay = a[2]; if (a[3]) oo.dur = a[3]; if (Object.keys(oo).length) it.o = oo; it.lk = { d: !!(a[4] & 1), p: !!(a[4] & 2) }; } return it; })) };
      const s2 = sanitize(st);
      return s2 ? { st: s2, name: o.n, memo: o.m, t: o.t } : null;
    } catch (e) { return null; }
  }
  const baseUrl = () => location.href.split('#')[0];
  function summaryText(st, ev, name, memo, link) {
    const L = [];
    L.push(`[제주 12/28~30 동선${name ? ' · ' + name : ''}]`);
    L.push(`숙소: ${lodgeText(st)}`);
    L.push(`효율 점수 ${fmt1(ev.score)}점 (${E.grade(ev.score).label}) · 운전 ${dstr(ev.tot.travel)} · 체험 ${dstr(ev.tot.active)}`);
    ev.days.forEach((d, di) => {
      L.push(`■ ${J.DAYS[di].label} ${wdOf(di)} ${hm(d.start)}~${hm(d.end)}`);
      d.rows.filter(r => r.type === 'act').forEach(r => L.push(`  ${hm(r.v.start)} ${r.p.name}${r.p.slot && r.p.slot.kind === 'ferry' ? ` (${hm(r.v.slot)} 출항, ${hm(r.v.back)} 귀항)` : ''}`));
    });
    if (memo) L.push(`메모: ${memo}`);
    if (link) L.push(link);
    return L.join('\n');
  }
  async function copyText(text, inputId) {
    try { await navigator.clipboard.writeText(text); toast('복사했어요'); return true; } catch (e) {
      const el = inputId ? document.getElementById(inputId) : null;
      if (el) { el.focus(); el.select(); }
      toast('복사가 막혀 있어요. 선택된 글자를 직접 복사해 주세요');
      return false;
    }
  }
  function boxList() { return LS.get(KEY.box, []); }
  function boxSave(entry) {
    const box = boxList().filter(b => b.code !== entry.code);
    box.unshift(entry);
    LS.set(KEY.box, box.slice(0, 40));
  }
  function viewSave() {
    const name = LS.get(KEY.name, '');
    const box = boxList();
    const rows = box.map(b => { const dec = decodeState(b.code); if (!dec) return null; const e = E.evaluate(dec.st); return { b, dec, e }; }).filter(Boolean);
    return `<div class="view">
      <div class="two">
        <section class="panel" style="display:grid;gap:10px">
          <h2>이 계획 저장·공유</h2>
          <p class="note">${COLLECT ? '저장하면 아래 <b>모두의 선택</b> 표에 올라가고, ' : '저장하면 '}지금 고른 내용이 통째로 담긴 <b>링크</b>도 만들어져요. 그 링크를 카톡으로 보내면 받은 사람이 같은 화면(점수·일정·숙소)을 그대로 보고, 자기 비교함에도 자동으로 담겨요. 서버에 저장하지 않으니 링크를 잃어버리면 다시 만들어야 해요.</p>
          <label class="field">이름 (누가 고른 계획인지)<input id="saveName" type="text" maxlength="20" value="${esc(ui.saveName != null ? ui.saveName : name)}" placeholder="예: 준영"></label>
          <label class="field">메모 (선택)<textarea id="saveMemo" rows="2" maxlength="120" placeholder="예: 우도는 꼭! 낚시는 오후가 좋아">${esc(ui.saveMemo)}</textarea></label>
          <div class="row">
            <button class="btn primary" type="button" data-act="save-share">저장하고 링크 만들기</button>
            <button class="btn" type="button" data-act="copy-text">카톡용 요약 복사</button>
          </div>
          <div id="shareOut" ${ui.shareLink ? '' : 'hidden'}>
            <div class="linkbox"><input id="shareLink" type="text" readonly value="${esc(ui.shareLink)}" aria-label="공유 링크"><button class="btn small" type="button" data-act="copy-link">복사</button>${navigator.share ? '<button class="btn small sea" type="button" data-act="native-share">보내기</button>' : ''}</div>
            <p class="note" style="margin-top:4px">이 기기의 비교함에도 저장됐어요.</p>
          </div>
          <textarea id="sumText" rows="1" class="field" style="position:absolute;left:-9999px" aria-hidden="true" tabindex="-1"></textarea>
        </section>
        <section class="panel" style="display:grid;gap:8px">
          <h2>지금 계획 요약</h2>
          <pre class="small" style="white-space:pre-wrap;margin:0;font-family:var(--f-body)">${esc(summaryText(S, EV, name, '', ''))}</pre>
        </section>
      </div>
      ${collectPanel()}
      <section class="panel">
        <div class="panel-head"><h2>비교함</h2><span class="note">내가 저장한 계획과 받은 링크가 이 기기에 쌓여요 · 점수는 각 계획의 조건으로 다시 계산</span></div>
        ${rows.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>이름</th><th>구분</th><th>저장 시각</th><th class="num">점수</th><th class="num">운전</th><th>숙소</th><th>포함</th><th>메모</th><th></th></tr></thead><tbody>
        ${rows.map(r => `<tr><td><b>${esc(r.b.name || '이름 없음')}</b></td><td>${r.b.kind === 'received' ? '<span class="pill info">받음</span>' : '<span class="pill acc">내가 저장</span>'}</td><td class="num">${esc(new Date(r.b.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}</td><td class="num">${fmt1(r.e.score)}</td><td class="num">${dstr(r.e.tot.travel)}</td><td>${esc(lodgeText(r.dec.st))}</td><td>${coverHtml(r.dec.st)}</td><td class="small">${esc(r.b.memo || '')}</td><td><div class="row" style="flex-wrap:nowrap"><button class="btn small" type="button" data-act="box-open" data-code="${esc(r.b.code)}">열기</button><button class="btn small" type="button" data-act="box-link" data-code="${esc(r.b.code)}">링크</button><button class="btn small ghost" type="button" data-act="box-del" data-code="${esc(r.b.code)}">삭제</button></div></td></tr>`).join('')}
        </tbody></table></div>` : '<p class="note">아직 비어 있어요. 위에서 저장하거나, 다른 사람이 보낸 링크를 열면 여기에 쌓여요.</p>'}
      </section>
    </div>`;
  }

  /* ───── 모두의 선택 (구글 시트) ───── */
  const fmtTime = t => { const d = new Date(+t || t); return isNaN(d) ? '' : d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const dayLine = (ev, di) => ev.days[di].rows.filter(r => r.type === 'act').map(r => `${hm(r.v.start)} ${shortName(r.p)}`).join(' → ');
  async function postCollect(payload) {
    try {
      const r = await fetch(COLLECT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow' });
      return await r.json().catch(() => ({ ok: r.ok }));
    } catch (e) { return { ok: false, error: String(e) }; }
  }
  async function loadCollect() {
    if (!COLLECT) return;
    ui.collect = Object.assign({}, ui.collect, { status: 'loading' });
    if (tab === 'save') render();
    try {
      const r = await fetch(COLLECT + (COLLECT.includes('?') ? '&' : '?') + 't=' + Date.now(), { redirect: 'follow' });
      const j = await r.json();
      if (!j || j.ok === false) throw new Error((j && j.error) || '응답 오류');
      ui.collect = { status: 'ok', items: Array.isArray(j.items) ? j.items : [], err: '', t: Date.now() };
    } catch (e) { ui.collect = { status: 'err', items: ui.collect.items || [], err: e.message || String(e), t: Date.now() }; }
    if (tab === 'save') render();
  }
  function collectPanel() {
    if (!COLLECT) {
      return `<section class="panel"><div class="panel-head"><h2>모두의 선택</h2><span class="pill info">아직 연결 전</span></div>
        <p class="note">구글 시트를 하나 연결하면, 누가 "저장"을 누를 때마다 그 사람의 선택이 이 표로 모여요. 누가 어느 귤밭·카트·마라도 항구·숙소를 골랐는지 한눈에 보여요. 연결은 5분이면 돼요: <a href="${REPO}collect/README.md" target="_blank" rel="noopener">연결 방법</a></p></section>`;
    }
    const c = ui.collect;
    const rows = (c.items || []).map(it => { const dec = decodeState(String(it.code || '')); return dec ? { it, dec, e: E.evaluate(dec.st) } : null; }).filter(Boolean);
    rows.sort((a, b) => (+b.it.t || 0) - (+a.it.t || 0));
    const latest = {};
    rows.forEach(r => { const k = String(r.it.name || '이름 없음').trim(); if (!latest[k]) latest[k] = r; });
    const people = Object.values(latest);
    const pickOf = (st, test) => { const out = []; st.days.forEach((d, di) => d.forEach(x => { const p = PL[x.p]; if (p && test(p)) out.push(`${esc(shortName(p))} <span class="muted">${di + 1}일</span>`); })); return out.join('<br>') || '<span class="muted">—</span>'; };
    const other = st => st.days.flat().map(x => PL[x.p]).filter(p => p && !WISH.some(w => w.test(p))).map(p => esc(shortName(p))).join(', ') || '<span class="muted">—</span>';
    let body;
    if (c.status === 'loading' && !rows.length) body = '<p class="note">불러오는 중…</p>';
    else if (!people.length) body = c.status === 'err' ? '' : '<p class="note">아직 아무도 저장하지 않았어요. 위에서 이름을 적고 저장하면 첫 줄이 생겨요.</p>';
    else {
      body = `<div class="scroll-x"><table class="tbl"><thead><tr><th>이름</th><th class="num">점수</th><th>숙소</th>${WISH.map(w => `<th>${esc(w.label)}</th>`).join('')}<th>그 밖</th><th>메모</th><th></th></tr></thead><tbody>
        ${people.map(r => `<tr><td><b>${esc(r.it.name || '이름 없음')}</b><div class="small muted">${esc(fmtTime(r.it.t))}</div></td><td class="num">${fmt1(r.e.score)}</td><td class="small">${esc(lodgeText(r.dec.st))}</td>${WISH.map(w => `<td class="small">${pickOf(r.dec.st, w.test)}</td>`).join('')}<td class="small">${other(r.dec.st)}</td><td class="small">${esc(r.it.memo || '')}</td><td><button class="btn small" type="button" data-act="collect-open" data-code="${esc(r.it.code)}">열기</button></td></tr>`).join('')}
        </tbody></table></div>
        ${rows.length > people.length ? `<details style="margin-top:10px"><summary class="btn small">전체 기록 ${rows.length}건</summary><div class="grid" style="gap:4px;margin-top:8px">${rows.map(r => `<div class="row small"><b>${esc(r.it.name || '이름 없음')}</b><span class="muted">${esc(fmtTime(r.it.t))}</span><span class="mono">${fmt1(r.e.score)}점</span><button class="btn small" type="button" data-act="collect-open" data-code="${esc(r.it.code)}">열기</button></div>`).join('')}</div></details>` : ''}`;
    }
    return `<section class="panel">
      <div class="panel-head"><h2>모두의 선택</h2><div class="row"><span class="note">${c.status === 'ok' && c.t ? '갱신 ' + new Date(c.t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : c.status === 'loading' ? '불러오는 중…' : ''}</span><button class="btn small" type="button" data-act="collect-refresh">새로고침</button></div></div>
      <p class="note" style="margin-bottom:8px">사람마다 가장 최근에 저장한 계획이에요. 점수는 각자 고른 조건으로 다시 계산했어요. 잘못 올린 줄은 구글 시트에서 지우면 사라져요.</p>
      ${c.status === 'err' ? `<div class="callout warn small" style="margin-bottom:8px">목록을 못 불러왔어요 (${esc(c.err)}). 잠시 뒤 새로고침해 보세요.</div>` : ''}${body}</section>`;
  }
  function verifyPanel() {
    const text = window.JEJU_VERIFY ? window.JEJU_VERIFY.build(J) : '';
    const text2 = window.JEJU_VERIFY && window.JEJU_VERIFY.build2 ? window.JEJU_VERIFY.build2(J) : '';
    const second = text2 ? `<section class="panel" style="display:grid;gap:8px">
      <div class="panel-head" style="margin-bottom:0"><h3>2차 확인 — 1차에서 못 찾은 것만</h3><div class="row"><button class="btn primary small" type="button" data-act="copy-verify2">2차 프롬프트 복사</button><a class="btn small" href="${REPO}VERIFY_PROMPT_2.md" target="_blank" rel="noopener">GitHub에서 보기</a></div></div>
      <p class="note">마라도 날짜별 시간표 형태, 반나절 방어 배, 휴무가 엇갈리는 귤밭, 농장 좌표, 빠진 숙소 가격처럼 11/15 조사에서 못 찾은 것만 다시 묻는 지시문이에요(${text2.split(String.fromCharCode(10)).length}줄). 돌아온 JSON을 Claude에게 주면 반영할게요.</p>
      <textarea id="verifyText2" class="verify-text" readonly rows="6" aria-label="2차 확인 요청 프롬프트">${esc(text2)}</textarea>
    </section>` : '';
    return `${second}<section class="panel" style="display:grid;gap:8px">
      <div class="panel-head" style="margin-bottom:0"><h3>1차 확인 프롬프트 (전체)</h3><div class="row"><button class="btn primary small" type="button" data-act="copy-verify">프롬프트 복사</button><a class="btn small" href="${REPO}VERIFY_PROMPT.md" target="_blank" rel="noopener">GitHub에서 보기</a></div></div>
      <p class="note">배 시간표, 귤밭 ${J.PLACES.filter(p => p.cat === 'tang').length}곳의 12/28~30 운영 여부, 방어 출조선, 카트, 숙소 가격 등을 인터넷에서 다시 확인하게 하는 지시문이에요(${text.split('\n').length}줄). 웹 검색이 되는 AI에 붙여 넣고, 돌아온 JSON을 Claude에게 주면 플래너 데이터에 반영할 수 있어요.</p>
      <textarea id="verifyText" class="verify-text" readonly rows="8" aria-label="확인 요청 프롬프트">${esc(text)}</textarea>
    </section>`;
  }

  /* ───── 모달 ───── */
  let modalClose = null;
  function openModal(html, onClose) {
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal-back" data-act="modal-back"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
    modalClose = onClose || null;
    const f = root.querySelector('.modal button, .modal select, .modal input');
    if (f) f.focus();
  }
  function closeModal() { $('#modalRoot').innerHTML = ''; if (modalClose) { const f = modalClose; modalClose = null; f(); } }
  function modalShell(title, sub, body, foot) {
    return `<div class="modal-h"><div class="row"><h3>${title}</h3><button class="icon-btn" type="button" data-act="modal-close" aria-label="닫기">✕</button></div>${sub ? `<div class="note">${sub}</div>` : ''}</div>
      <div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}`;
  }
  let swapCtx = null;
  function openSwap(di, k, area) {
    const cur = S.days[di][k], p = PL[cur.p];
    const list = E.candidateDeltas(S, EV, di, k);
    swapCtx = { di, k, list, area: area || 'all' };
    const ar = AREAS.find(a => a.k === swapCtx.area) || AREAS[0];
    const rows = list.filter(c => !ar.z || ar.z.includes(PL[c.id].zone)).sort((a, b) => (b.cur ? 1 : 0) - (a.cur ? 1 : 0) || (a.used ? 1 : 0) - (b.used ? 1 : 0) || (b.d || 0) - (a.d || 0));
    const body = `<div class="chips">${AREAS.map(a => `<button class="chip" type="button" data-act="swap-area" data-a="${a.k}" aria-pressed="${a.k === swapCtx.area}">${esc(a.label)}</button>`).join('')}</div>` +
      rows.map(c => {
        const q = PL[c.id]; const cl = closedOnTrip(q).filter(d => d.wd === J.DAYS[di].wd);
        return `<div class="opt-row ${c.cur ? 'cur' : ''} ${c.used ? 'used' : ''}"><div class="info"><div class="row" style="gap:6px"><strong>${esc(q.name)}</strong><span class="zone">${esc(zshort(q.zone))}</span>${cl.length ? '<span class="pill err">이 날 휴무</span>' : ''}${q.warn ? '<span class="pill warn">종료 가능</span>' : ''}${(q.tags || []).includes('추천') ? '<span class="pill acc">추천</span>' : ''}</div>
          <div class="small muted">${esc(q.open ? q.open + '~' + q.close : '')} · ${esc(q.price || '')}</div><div class="small muted">${esc(q.prog || '')}</div></div>
          <div class="side">${c.cur ? '<span class="pill acc">지금 선택</span>' : c.used ? '<span class="pill info">다른 날에 있음</span>' : `${c.nErr > EV.nErr ? '<span class="pill err">문제 생김</span>' : deltaHtml(c.d)}${minDeltaHtml(c.dTravel)}<button class="btn small primary" type="button" data-act="swap-pick" data-id="${c.id}">이걸로</button>`}</div></div>`;
      }).join('');
    openModal(modalShell(`${esc(J.CATS[p.cat].label)} — 다른 곳으로 바꾸기`, `${J.DAYS[di].label} 안에서 가장 좋은 순서에 넣었을 때의 점수 변화예요. 좋은 순으로 정렬.`, body));
  }
  let addCtx = null;
  function openAdd(di, cat) {
    addCtx = { di, cat: cat || addCtx && addCtx.cat || 'tang' };
    const list = J.PLACES.filter(p => p.cat === addCtx.cat);
    const res = list.map(p => ({ p, w: where(p.id), a: where(p.id) ? null : E.addDeltas(S, EV, p.id) }));
    res.sort((a, b) => (a.w ? 1 : 0) - (b.w ? 1 : 0) || (b.a ? b.a.perDay[di].d : 0) - (a.a ? a.a.perDay[di].d : 0));
    const body = `<div class="cat-bar">${Object.keys(J.CATS).map(c => `<button class="chip" type="button" data-act="add-cat" data-c="${c}" aria-pressed="${c === addCtx.cat}">${esc(J.CATS[c].short)}</button>`).join('')}</div>` +
      res.map(r => {
        const p = r.p; const cl = closedOnTrip(p).filter(d => d.wd === J.DAYS[di].wd);
        return `<div class="opt-row ${r.w ? 'used' : ''}"><div class="info"><div class="row" style="gap:6px"><strong>${esc(p.name)}</strong><span class="zone">${esc(zshort(p.zone))}</span>${cl.length ? '<span class="pill err">이 날 휴무</span>' : ''}${p.warn ? '<span class="pill warn">종료 가능</span>' : ''}</div>
          <div class="small muted">${esc(p.prog || p.note || '')}</div>${r.a ? `<div class="small muted">가장 좋은 날: ${r.a.best.dj + 1}일차 (${r.a.best.d > 0 ? '▲' : '▼'}${fmt1(Math.abs(r.a.best.d))}점)</div>` : ''}</div>
          <div class="side">${r.w ? `<span class="pill info">${r.w.di + 1}일차에 있음</span>` : `${r.a.perDay[di].nErr > EV.nErr ? '<span class="pill err">시간 부족</span>' : deltaHtml(r.a.perDay[di].d)}${minDeltaHtml(r.a.perDay[di].dTravel)}<button class="btn small primary" type="button" data-act="add-pick" data-id="${p.id}">${di + 1}일차에 넣기</button>`}</div></div>`;
      }).join('');
    openModal(modalShell(`${J.DAYS[di].label}에 추가`, '하루 안에서 가장 좋은 위치에 넣었을 때의 점수 변화. 체험이 늘면 효율이 오르거나, 이동이 늘면 내려가요.', body));
  }
  function openInfo(pid) {
    const p = PL[pid];
    openModal(modalShell(esc(p.name), esc(J.ZONES[p.zone].name), placeCard(p, {})));
  }
  /* 자동 최적화 */
  let optRun = null;
  function openOptimize(baseState, title) {
    const st = baseState || S;
    const lk = st.lodgeLk;
    const body = `<p class="note">고정 표시(날짜 고정·장소 고정)된 항목은 그대로 두고, 나머지 날짜·순서·같은 종류의 장소·숙소를 바꿔 가며 점수가 가장 높은 조합을 찾아요.</p>
      <div class="grid" style="gap:6px">
        <label class="check"><input type="checkbox" id="opt-day" checked> 날짜 바꾸기 허용</label>
        <label class="check"><input type="checkbox" id="opt-place" checked> 같은 종류의 다른 장소로 바꾸기 허용 (귤밭·카트·올레·마라도 항구 등)</label>
        <label class="check"><input type="checkbox" id="opt-lodge" ${lk ? '' : 'checked'}> 숙소 동네 바꾸기 허용</label>
      </div>
      <div class="progress" id="optProg" hidden><i></i></div><div id="optOut"></div>`;
    openModal(modalShell(title || '자동 최적화', `지금 ${fmt1(E.evaluate(st).score)}점`, body, `<button class="btn" type="button" data-act="modal-close">닫기</button><button class="btn primary" type="button" id="optGo" data-act="opt-go">계산 시작</button>`), () => { if (optRun) optRun.cancel = true; });
    optRun = { base: st };
  }
  function runOptimize() {
    if (!optRun) return;
    const st = optRun.base;
    const opt = { allowDay: $('#opt-day').checked, allowPlace: $('#opt-place').checked, allowLodge: $('#opt-lodge').checked };
    const o = E.createOptimizer(st, opt);
    const run = optRun; run.cancel = false;
    $('#optProg').hidden = false; $('#optGo').disabled = true;
    const tick = () => {
      if (run.cancel) return;
      const t0 = performance.now();
      while (performance.now() - t0 < 40) { if (o.run(120)) break; }
      const bar = $('#optProg i'); if (bar) bar.style.width = Math.round(o.progress * 100) + '%';
      if (o.done) showOptResult(st, o.result()); else setTimeout(tick, 0);
    };
    setTimeout(tick, 10);
  }
  function showOptResult(before, after) {
    const eb = E.evaluate(before), ea = E.evaluate(after);
    optRun.result = after;
    const day = (st, ev) => ev.days.map((d, di) => `<div class="dayline" style="--dc:var(${DAYVAR[di]})"><b>${di + 1}일차</b><span>${d.rows.filter(r => r.type === 'act').map(r => esc(shortName(r.p))).join(' → ') || '—'}</span></div>`).join('');
    const out = `<div class="two" style="margin-top:8px">
      <div class="panel"><div class="eyebrow">지금</div><div class="score-line" style="display:flex;gap:8px;align-items:baseline"><span class="big mono" style="font-size:1.4rem">${fmt1(eb.score)}</span><span class="small muted">운전 ${dstr(eb.tot.travel)} · ${esc(lodgeText(before))}</span></div>${day(before, eb)}</div>
      <div class="panel" style="box-shadow:inset 0 0 0 2px var(--accent)"><div class="eyebrow">최적안</div><div class="score-line" style="display:flex;gap:8px;align-items:baseline"><span class="big mono" style="font-size:1.4rem">${fmt1(ea.score)}</span>${deltaHtml(ea.score - eb.score)} ${minDeltaHtml(ea.tot.travel - eb.tot.travel)}</div><div class="small muted">${esc(lodgeText(after))}</div>${day(after, ea)}${coverHtml(after)}</div></div>
      ${ea.score <= eb.score + 0.05 ? '<p class="note">더 나은 조합을 찾지 못했어요. 지금 계획이 이미 좋은 상태예요.</p>' : ''}`;
    $('#optOut').innerHTML = out;
    $('#optProg').hidden = true;
    const f = document.querySelector('.modal-f');
    if (f) f.innerHTML = `<button class="btn" type="button" data-act="modal-close">닫기</button>${ea.score > eb.score + 0.05 || optRun.base !== S ? '<button class="btn primary" type="button" data-act="opt-apply">이 안으로 바꾸기</button>' : ''}`;
  }

  /* ───── 전체 렌더 ───── */
  function render() {
    renderScore(); renderTabs();
    const v = { plan: viewPlan, map: viewMap, pick: viewPick, best: viewBest, stay: viewStay, info: viewInfo, save: viewSave }[tab] || viewPlan;
    const y = window.scrollY;
    if (LMAP) { try { LMAP.remove(); } catch (e) { /* 이미 지워짐 */ } LMAP = null; }
    $('#app').innerHTML = v();
    if (tab === 'map') mountMap();
    window.scrollTo(0, y);
    const det = $('#cfgDetails'); if (det) det.addEventListener('toggle', () => { ui.cfgOpen = det.open; });
  }
  function setTab(t) { tab = t; LS.set(KEY.tab, t); render(); window.scrollTo(0, 0); if (t === 'save' && COLLECT && Date.now() - ui.collect.t > 30000) loadCollect(); }

  /* ───── 동작 ───── */
  const st2 = () => clone(S);
  const ACT = {
    'tab': b => setTab(b.dataset.tab),
    'goto-plan': () => { closeModal(); setTab('plan'); },
    'mode': b => { mode = b.dataset.m === 'pro' ? 'pro' : 'easy'; LS.set(KEY.mode, mode); if (tab !== 'plan') setTab('plan'); else { render(); window.scrollTo(0, 0); } },
    'ez-wish': b => ezToggle(WISH.find(w => w.k === b.dataset.k), WSEED[b.dataset.k]),
    'ez-extra': b => { const x = EXTRA.find(w => w.k === b.dataset.k); if (x) ezToggle(x, x.seed); },
    'ez-lodge-auto': () => { const n = ezBase(); if (!n.lodgeLk && n.same) return; n.lodgeLk = false; n.same = true; n.lodge[1] = n.lodge[0]; ezBuild(n, '숙소 동네는 알아서'); },
    'ez-build': () => ezBuild(ezBase(), '일정 다시 짰어요'),
    'ez-del': b => { if (ezRun) return; const n = ezBase(); const [x] = n.days[+b.dataset.di].splice(+b.dataset.k, 1); if (x) ezBuild(n, `${shortName(PL[x.p])} 뺌`); },
    'up': b => { const n = st2(), di = +b.dataset.di, k = +b.dataset.k; const d = n.days[di]; [d[k - 1], d[k]] = [d[k], d[k - 1]]; commit(n, '순서 바꿈'); },
    'down': b => { const n = st2(), di = +b.dataset.di, k = +b.dataset.k; const d = n.days[di]; [d[k + 1], d[k]] = [d[k], d[k + 1]]; commit(n, '순서 바꿈'); },
    'del': b => { const n = st2(), di = +b.dataset.di, k = +b.dataset.k; const [x] = n.days[di].splice(k, 1); commit(n, `${PL[x.p].name} 삭제 (되돌리기 가능)`); },
    'unlock': b => { const n = st2(), di = +b.dataset.di, k = +b.dataset.k; const it = n.days[di][k]; it.lk = Object.assign({}, it.lk); it.lk[b.dataset.f] = false; commit(n, '고정 해제', { silent: true }); },
    'swap': b => openSwap(+b.dataset.di, +b.dataset.k),
    'swap-area': b => { if (swapCtx) { closeModal(); openSwap(swapCtx.di, swapCtx.k, b.dataset.a); } },
    'swap-pick': b => { const c = swapCtx && swapCtx.list.find(x => x.id === b.dataset.id); if (!c) return; closeModal(); commit(c.s, `${E.ro(PL[c.id].name)} 바꿈`); },
    'swap-to': b => { const pid = b.dataset.id; const p = PL[pid]; const c = S.days.flat().find(x => PL[x.p].grp === p.grp); if (!c) return; const w = where(c.p); const list = E.candidateDeltas(S, EV, w.di, w.k); const hit = list.find(x => x.id === pid); if (hit && hit.s) commit(hit.s, `${E.ro(p.name)} 바꿈`); },
    'add-open': b => openAdd(+b.dataset.di),
    'add-cat': b => { if (addCtx) { closeModal(); openAdd(addCtx.di, b.dataset.c); } },
    'add-pick': b => { const r = E.addDeltas(S, EV, b.dataset.id); const x = r.perDay[addCtx.di]; closeModal(); commit(x.s, `${PL[b.dataset.id].name} 추가`); },
    'add-day': b => { const r = E.addDeltas(S, EV, b.dataset.id); const x = r.perDay[+b.dataset.dj]; commit(x.s, `${PL[b.dataset.id].name} → ${+b.dataset.dj + 1}일차 추가`); },
    'add-best': b => { const r = E.addDeltas(S, EV, b.dataset.id); commit(r.best.s, `${PL[b.dataset.id].name} → ${r.best.dj + 1}일차 추가`); },
    'info': b => openInfo(b.dataset.id),
    'sugg': b => { const s = (CACHE.suggList || [])[+b.dataset.i]; if (s) commit(s.s, s.msg); },
    'order-all': () => commit(E.orderAll(S), '하루 순서 정리'),
    'undo': () => undo(),
    'clear-plan': () => { openModal(modalShell('전부 비울까요?', '', '<p>세 날의 일정을 모두 지워요. 여행 조건과 숙소는 그대로 남고, "되돌리기"로 복구할 수 있어요.</p>', '<button class="btn" type="button" data-act="modal-close">취소</button><button class="btn primary" type="button" data-act="clear-yes">비우기</button>')); },
    'clear-yes': () => { closeModal(); const n = st2(); n.days = [[], [], []]; n.from = null; commit(n, '일정 비움'); },
    'lodge-quick': b => { const n = st2(); n.lodge = [b.dataset.z, b.dataset.z]; n.same = true; commit(n, `숙소 → ${J.LODGE[b.dataset.z].label}`); },
    'lodge-set': b => { const r = (CACHE.lodgeRows || []).find(x => x.z === b.dataset.z); const n = r ? clone(r.s) : st2(); n.lodge = [b.dataset.z, b.dataset.z]; n.same = true; commit(n, `숙소 → ${J.LODGE[b.dataset.z].label} (순서 재정렬)`); },
    'optimize': () => openOptimize(),
    'opt-go': () => runOptimize(),
    'opt-apply': () => { const r = optRun && optRun.result; closeModal(); if (r) { const n = clone(r); n.from = null; commit(n, '자동 최적화 적용'); setTab('plan'); } },
    'auto-build': () => {
      const ks = [...document.querySelectorAll('.wish:checked')].map(x => x.value);
      const pickIds = { tang: 't_eunha', kart: 'k_981', marado: 'm_songak', udo: 'u_seongsan', fish: 'f_gm_am', olle: 'o10a', flower: 'x_camellia', spa: 'x_spa', bangeo: 'x_bangeo' };
      const ids = ks.map(k => pickIds[k]).filter(Boolean);
      if (!ids.length) { toast('하나 이상 골라 주세요'); return; }
      const n = { v: 1, cfg: Object.assign({}, S.cfg), lodge: ['SEO', 'SEO'], same: true, lodgeLk: false, days: [[], [], []] };
      ids.forEach((id, i) => n.days[i % 3].push({ u: uid(), p: id, lk: {} }));
      openOptimize(sanitize(n), '이 조합으로 자동 짜기');
      setTimeout(() => runOptimize(), 30);
    },
    'load-plan': b => { const pl = J.PLANS.find(p => p.id === b.dataset.id); commit(planToState(pl, S.cfg), `"${pl.title}" 불러옴 (되돌리기 가능)`); setTab('plan'); },
    'best-sort': b => { ui.bestSort = b.dataset.s; render(); },
    'pick-cat': b => { ui.pickCat = b.dataset.c; ui.pickTags = []; render(); },
    'pick-area': b => { ui.pickArea = b.dataset.a; render(); },
    'pick-tag': b => { const t = b.dataset.t; ui.pickTags = ui.pickTags.includes(t) ? ui.pickTags.filter(x => x !== t) : ui.pickTags.concat(t); render(); },
    'map-day': b => { ui.mapDay = +b.dataset.d; render(); },
    'map-all': () => { ui.mapAll = !ui.mapAll; render(); },
    'map-sel': b => { ui.mapSel = b.dataset.id; render(); },
    'modal-close': () => closeModal(),
    'modal-back': (b, e) => { if (e.target === b) closeModal(); },
    'save-share': async () => {
      const name = ($('#saveName').value || '').trim(), memo = ($('#saveMemo').value || '').trim();
      if (!name) { toast('이름을 적어 주세요 (누가 고른 계획인지 보여요)'); $('#saveName').focus(); return; }
      LS.set(KEY.name, name); ui.saveName = name; ui.saveMemo = memo;
      const code = encodeState(S, name, memo);
      boxSave({ code, name, memo, t: Date.now(), kind: 'saved' });
      ui.shareLink = baseUrl() + '#p=' + code;
      render();
      copyText(ui.shareLink, 'shareLink');
      if (COLLECT) {
        const r = await postCollect({ name, memo, code, link: ui.shareLink, score: Math.round(EV.score * 10) / 10, lodge: lodgeText(S),
          cover: coverage(S).filter(c => c.on).map(c => c.w.label).join(', '), d1: dayLine(EV, 0), d2: dayLine(EV, 1), d3: dayLine(EV, 2) });
        toast(r.ok ? '모두의 선택에 올렸어요' : '모두의 선택에 못 올렸어요 — 링크는 만들어졌어요');
        loadCollect();
      }
    },
    'collect-refresh': () => loadCollect(),
    'collect-open': b => { const dec = decodeState(b.dataset.code); if (!dec) { toast('이 기록을 읽지 못했어요'); return; } if (!viewing) LS.set(KEY.mine, S); viewing = { name: dec.name, t: dec.t, memo: dec.memo }; LS.set(KEY.viewing, viewing); commit(dec.st, `${dec.name || '누군가'}님 계획 열기`); setTab('plan'); },
    'copy-verify2': () => { const t = window.JEJU_VERIFY && window.JEJU_VERIFY.build2 ? window.JEJU_VERIFY.build2(J) : ''; copyText(t, 'verifyText2'); },
    'copy-verify': () => { const t = window.JEJU_VERIFY ? window.JEJU_VERIFY.build(J) : ''; copyText(t, 'verifyText'); },
    'copy-link': () => copyText(ui.shareLink, 'shareLink'),
    'native-share': async () => { try { await navigator.share({ title: '제주 동선', text: summaryText(S, EV, LS.get(KEY.name, ''), '', ''), url: ui.shareLink }); } catch (e) { /* 사용자가 취소 */ } },
    'copy-text': () => { const name = ($('#saveName') ? $('#saveName').value.trim() : '') || LS.get(KEY.name, ''); const t = summaryText(S, EV, name, $('#saveMemo') ? $('#saveMemo').value.trim() : '', ui.shareLink || ''); const ta = $('#sumText'); if (ta) ta.value = t; copyText(t, 'sumText'); },
    'box-open': b => { const dec = decodeState(b.dataset.code); if (!dec) { toast('링크를 읽지 못했어요'); return; } const entry = boxList().find(x => x.code === b.dataset.code); if (entry && entry.kind === 'received') { if (!viewing) LS.set(KEY.mine, S); viewing = { name: dec.name, t: dec.t, memo: dec.memo }; LS.set(KEY.viewing, viewing); } commit(dec.st, `${dec.name || '저장된'} 계획 열기`); setTab('plan'); },
    'box-link': b => { ui.shareLink = baseUrl() + '#p=' + b.dataset.code; render(); copyText(ui.shareLink, 'shareLink'); },
    'box-del': b => { LS.set(KEY.box, boxList().filter(x => x.code !== b.dataset.code)); render(); toast('비교함에서 지웠어요'); },
    'viewing-back': () => { const mine = sanitize(LS.get(KEY.mine, null)); viewing = null; LS.del(KEY.viewing); if (mine) commit(mine, '내 계획으로 돌아옴'); else render(); },
    'viewing-keep': () => { viewing = null; LS.del(KEY.viewing); LS.del(KEY.mine); render(); toast('이제 이 계획이 내 계획이에요'); }
  };
  const CHG = {
    'cfg': el => { const n = st2(); const f = el.dataset.f; let v = el.type === 'checkbox' ? el.checked : el.value; if (['pick', 'ret', 'pace'].includes(f)) v = +v; if (el.type === 'time' && !/^\d\d:\d\d$/.test(v)) return; n.cfg[f] = v; ui.cfgOpen = true; commit(n, '여행 조건 변경'); },
    'lodge': el => { const n = st2(); const i = +el.dataset.n; n.lodge[i] = el.value; if (n.same) n.lodge = [el.value, el.value]; commit(n, `숙소 → ${J.LODGE[el.value].label}`); },
    'same': el => { const n = st2(); n.same = el.checked; if (n.same) n.lodge[1] = n.lodge[0]; commit(n, el.checked ? '한 곳 2박' : '숙소 나누기', { silent: !el.checked }); },
    'lodgeLk': el => { const n = st2(); n.lodgeLk = el.checked; commit(n, '', { silent: true }); },
    'day': el => { const di = +el.dataset.di, k = +el.dataset.k, dj = +el.value; if (di === dj) return; const m = E.dayMoveDeltas(S, EV, di, k)[dj]; commit(m.s, `${PL[S.days[di][k].p].name} → ${dj + 1}일차 (날짜 고정)`); },
    'slot': el => { const n = st2(); const it = n.days[+el.dataset.di][+el.dataset.k]; it.o = Object.assign({}, it.o); if (el.value) it.o.slot = el.value; else delete it.o.slot; commit(n, el.value ? `${el.value} 출항으로` : '출항 자동'); },
    'stay': el => { const n = st2(); const it = n.days[+el.dataset.di][+el.dataset.k]; it.o = Object.assign({}, it.o, { stay: +el.value }); commit(n, `섬 체류 ${dstr(+el.value)}`); },
    'dur': el => { const n = st2(); const it = n.days[+el.dataset.di][+el.dataset.k]; it.o = Object.assign({}, it.o, { dur: +el.value }); commit(n, `머무는 시간 ${dstr(+el.value)}`); },
    'pickHide': el => { ui.pickHideClosed = el.checked; render(); },
    'ez-cfg': el => { const v = el.value; if (!/^\d\d:\d\d$/.test(v)) return; const n = ezBase(); n.cfg[el.dataset.f] = v; ezBuild(n, el.dataset.f === 'arr' ? `제주 도착 ${v}` : `귀국편 ${v}`); },
    'ez-lodge': el => { if (!el.value || !J.LODGE[el.value]) return; const n = ezBase(); n.lodge = [el.value, el.value]; n.same = true; n.lodgeLk = true; ezBuild(n, `숙소 → ${J.LODGE[el.value].label}`); }
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; const f = ACT[b.dataset.act]; if (f) f(b, e); });
  document.addEventListener('change', e => { const el = e.target.closest('[data-chg]'); if (!el) return; const f = CHG[el.dataset.chg]; if (f) f(el, e); });
  document.addEventListener('input', e => { if (e.target.id === 'saveName') ui.saveName = e.target.value; else if (e.target.id === 'saveMemo') ui.saveMemo = e.target.value; });
  let qTimer = null;
  document.addEventListener('input', e => { const el = e.target.closest('[data-inp="pickQ"]'); if (!el) return; clearTimeout(qTimer); qTimer = setTimeout(() => { ui.pickQ = el.value; const pos = el.selectionStart; render(); const n = $('#pickQ'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { /* 무시 */ } } }, 250); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modalRoot').innerHTML) closeModal(); });

  /* 테마 */
  function applyTheme(t) { if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
  applyTheme(LS.get(KEY.theme, 'system'));
  $('#themeBtn').addEventListener('click', () => {
    const cur = LS.get(KEY.theme, 'system');
    const isDark = cur === 'dark' || (cur === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';
    LS.set(KEY.theme, next); applyTheme(next); toast(next === 'dark' ? '어두운 화면' : '밝은 화면');
    if (tab === 'map') render();
  });

  /* 공유 링크로 들어온 경우 */
  function importFromHash() {
    const h = location.hash || '';
    if (!h.startsWith('#p=')) return false;
    const code = h.slice(3);
    const dec = decodeState(code);
    history.replaceState(null, '', location.pathname + location.search);
    if (!dec) { toast('공유 링크를 읽지 못했어요'); return false; }
    if (!viewing) LS.set(KEY.mine, S);
    boxSave({ code, name: dec.name, memo: dec.memo, t: dec.t || Date.now(), kind: 'received' });
    viewing = { name: dec.name, t: dec.t, memo: dec.memo };
    LS.set(KEY.viewing, viewing);
    S = dec.st; EV = E.evaluate(S); LS.set(KEY.cur, S); CACHE = {};
    tab = 'plan';
    setTimeout(() => toast(`${dec.name || '공유된'}님의 계획을 열었어요`), 200);
    return true;
  }
  importFromHash();
  window.addEventListener('hashchange', () => { if (importFromHash()) render(); });
  render();
})();
