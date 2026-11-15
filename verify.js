/* 다른 AI에게 맡길 "인터넷 확인" 프롬프트를 data.js 내용으로 만든다 (브라우저·Node 겸용) */
(function (root) {
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  function curText(p) {
    const a = [];
    if (p.open) a.push(`${p.open}~${p.close}${p.last ? ` (입장 ${p.last}까지)` : ''}`);
    a.push(p.closed && p.closed.length ? p.closed.map(d => WD[d]).join('·') + '요일 휴무' : '휴무 정보 없음');
    if (p.price) a.push(p.price);
    if (p.res) a.push('예약: ' + p.res);
    if (p.dur) a.push(`체류 ${p.dur}분으로 계산 중`);
    return a.join(' / ');
  }
  function line(p) { return `- ${p.id} | ${p.name} | ${p.addr || '주소 미확인'} | 지금 값: ${curText(p)}`; }

  function build(J) {
    const P = J.PLACES;
    const by = c => P.filter(p => p.cat === c);
    const L = [];
    L.push('# 제주 여행 정보 인터넷 확인 요청');
    L.push('');
    L.push('## 1. 너의 역할과 목표');
    L.push('너는 여행 정보 검증 담당이다. 아래 목록의 값이 **2026년 12월 28일(월)~30일(수)** 에 실제로 맞는지 인터넷에서 확인하고, 맨 아래 JSON 형식으로만 돌려줘.');
    L.push('이 결과는 제주 렌터카 2박 3일 동선 계산 프로그램의 데이터 파일에 그대로 들어간다. 시간·요일·휴무가 틀리면 일정 계산이 틀어지므로 숫자 정확도가 가장 중요하다.');
    L.push('여행 조건: 성인 일행, 12/28 아침 비행기로 제주 도착 → 렌터카 → 12/30 오후~저녁 비행기로 귀가. 하고 싶은 것: 귤따기 체험, 카트, 마라도 짜장면, 우도, 방어 선상낚시(3~4시간), 올레길 걷기.');
    L.push('');
    L.push('## 2. 규칙');
    L.push('1. 출처 우선순위: ① 업체·선사 공식 홈페이지, 공식 인스타그램, 네이버 플레이스의 최근 공지 ② 비짓제주(visitjeju.net), 제주관광공사, 제주도청·서귀포시청 ③ 네이버·카카오 지도 정보(영업시간·휴무) ④ 최근 3개월 이내 블로그·후기. ④만 있으면 confidence는 "낮음".');
    L.push('2. **겨울(12월) 기준 값**을 찾아라. 여름·성수기 시간표와 섞지 마라. 계절 구분이 안 되어 있으면 note에 "계절 구분 없음"이라고 적어라.');
    L.push('3. 값마다 근거 URL과 그 페이지의 게시·수정 날짜(알 수 있으면)를 sources에 넣어라. 날짜를 모르면 "날짜 불명".');
    L.push('4. 모르면 추측하지 말고 null로 두고 note에 "확인 못 함"이라고 적어라. 전화로만 알 수 있는 건 phone을 채우고 note에 "전화 확인 필요".');
    L.push('5. 형식: 시간은 24시간 "HH:MM", 요일은 일·월·화·수·목·금·토, 날짜는 "YYYY-MM-DD", 금액은 "20,000원/1kg"처럼 짧게.');
    L.push('6. 아래 "지금 값"과 다르면 changed: true. 같으면 false.');
    L.push('7. 2026-12-28(월)·29(화)·30(수) 사흘 각각 운영하는지가 핵심이다. 정기휴무, 시즌 종료일(예: "12/20 체험 종료"), 연말 임시휴무 공지를 꼭 찾아라.');
    L.push('8. 답이 너무 길어지면 나눠서 해도 된다: 1차 = A·B, 2차 = C·D, 3차 = E·F·G. 출력 JSON 형식은 매번 같게, 해당 없는 배열은 빈 배열 [].');
    L.push('9. 최종 출력은 JSON 코드블록 하나. JSON 밖에는 5줄 이내 요약(중요한 변경, 못 찾은 것)만.');
    L.push('');
    L.push('## 3. 확인할 것');
    L.push('');
    L.push('### A. 배 시간표 (가장 중요)');
    by('marado').concat(by('udo'), by('island')).forEach(p => {
      L.push(`- ${p.id} | ${p.name} | 지금 값: 출항 ${p.slot.out.join(', ')} / 섬 출발 ${p.slot.back.join(', ')} / 편도 ${p.slot.ride}분 / 수속 ${p.slot.checkin}분 전 / ${p.price}`);
    });
    L.push('각 노선마다 확인:');
    L.push('  1) 2026년 12월(동절기) 시간표 — 본섬 출발 시각 전부, 섬 출발(귀항) 시각 전부. 동절기 별도 시간표가 있는지.');
    L.push('  2) 출항편과 귀항편 짝 규칙(예: "09:40 배 승객은 11:50 배로 귀항"), 섬 최소·최대 체류시간.');
    L.push('  3) 성인 왕복 요금, 입도료·해상공원 입장료·터미널 이용료 포함 여부.');
    L.push('  4) 예약 방법(홈페이지·네이버·현장)과 예약 마감, 매표·수속 마감(출항 몇 분 전), 신분증·승선신고서.');
    L.push('  5) 12월 결항이 잦은지, 결항 확인 방법(전화번호, 홈페이지, 문자 공지).');
    L.push('  6) 송악산항(산이수동항) 공식 사이트에 14:10이 두 번 적혀 있다 — 실제 마지막 출항편과 마라도 출발 시각을 확인.');
    L.push('  7) 운진항 가파도 시간표의 "14:20"도 두 번 적혀 있다 — 실제 값 확인.');
    L.push('  8) 우도: 동절기 첫배·막배(성산→우도, 우도→성산 각각), 종달항→우도 노선 12월 운항 여부, 렌터카 반입 금지 기간·예외 조건(공식 고시 번호), 섬 안 전기차·전기자전거 대여 가격과 나이·면허 조건, 우도 순환버스 겨울 운행시간·요금.');
    L.push('  9) 마라도 짜장면집(원조 마라도 짜장면집, 마라도 해녀촌 짜장 등) 12월 영업 여부·가격.');
    L.push('');
    L.push('### B. 방어 선상낚시 (지금 데이터가 거의 추정값 — 새로 찾아야 함)');
    by('fish').forEach(p => L.push(line(p) + (p.slot ? ` / 출항 ${(p.slot.outOpts || p.slot.out).join(', ')} / ${p.slot.dur}분` : '')));
    L.push('찾을 것:');
    L.push('  1) 모슬포항·운진항(대정 하모리)·사계항에서 12월에 방어(대방어)·부시리 선상낚시를 하는 배를 최대한 많이: 선박명, 선장 연락처, 네이버 카페·밴드·플레이스·인스타 링크.');
    L.push('  2) 배마다: 출항 시각, 귀항 시각, 총 소요, 3~4시간 반나절 상품 유무, 오후 출조 유무, 1인 요금(합승), 독선(배 전체) 요금, 최소 인원, 낚싯대·채비·미끼 대여비, 초보 가능 여부, 구명조끼·멀미 관련 안내.');
    L.push('  3) 결항 기준(풍속·파고)과 결항·당일 취소 환불 규정.');
    L.push('  4) 잡은 방어를 손질하거나 회를 떠 주는 곳(배 위, 항구 식당)과 비용.');
    L.push('  5) 2025~2026 겨울과 2026년 11~12월 조황 — 방어가 잘 잡히는지(2026년 1월 "방어 실종" 보도 이후 상황).');
    L.push('  6) 서귀포항·위미항·성산항·도두항에서도 방어 출조가 있으면 같은 항목으로.');
    L.push('');
    L.push(`### C. 귤따기 체험 ${by('tang').length}곳`);
    L.push('각 농장마다: 2026 시즌 운영 여부와 종료일(12/28~30에 하는지), 겨울 영업시간·입장 마감, 정기휴무·연말 휴무, 1인 가격과 가져가는 양, 예약 방법, 비 오는 날 운영, 전화번호. 폐업·이전 여부도.');
    by('tang').forEach(p => L.push(line(p)));
    L.push('추가로 목록에 없는 곳을 최대 10곳 찾아라(특히 서귀포 효돈·신효·토평·하효, 구좌, 한림, 대정). 새 곳은 new_places에 좌표까지.');
    L.push('');
    L.push(`### D. 카트·오프로드 ${by('kart').length}곳`);
    by('kart').forEach(p => L.push(line(p)));
    L.push('각 곳: 12월 영업시간·마지막 탑승, 휴무, 1인승·2인승 요금과 몇 바퀴(몇 분)인지, 나이·키 제한, 운전면허 필요 여부, 비·강풍 시 운영, 예약 필요 여부, 전화. 9.81파크·제주 레포츠랜드의 정확한 주소와 좌표. "감귤카트(중문관광로 42)"와 "제주 중문카트"가 같은 곳인지. 애월·성산·표선 쪽 다른 카트장이 있으면 new_places에.');
    L.push('');
    L.push('### E. 그 밖의 장소 (12월 영업시간·휴무·요금·비 오는 날)');
    by('olle').forEach(p => L.push(`- ${p.id} | ${p.name} | 통제·공사 구간 여부, 시작점 주차장`));
    by('flower').concat(by('rest'), by('view'), by('food')).forEach(p => L.push(line(p)));
    L.push('특히: 산방산 탄산온천 영업시간·요금, 카멜리아힐·제주동백수목원 2026년 동백 개화 상황과 요금, 용머리해안 통제 빈도, 성산일출봉 겨울 개방시간, 해녀의 부엌 12/28~29 공연 회차·가격·예약, 모슬포 방어회 식당(부두식당·수눌음·돈지식당·미영이네) 영업시간·휴무와 방어 가격.');
    L.push('');
    L.push('### F. 숙소 (12/28 체크인 → 12/30 체크아웃, 2박, 성인 2명 1실)');
    Object.keys(J.LODGE).forEach(z => { const l = J.LODGE[z]; L.push(`- ${z} | ${l.label} | 예시: ${l.ex.join(', ')} | 지금 가격대 표시: ${l.tier}`); });
    L.push('동네마다 호텔·리조트 2~3곳과 에어비앤비·독채 1~2곳의 12/28~29 1박 가격(2인), 무료 주차, 조식 포함 여부. 예약 사이트 표시가격과 날짜를 적어라. 가격대 기준: ₩ 5~12만, ₩₩ 12~25만, ₩₩₩ 25만 이상.');
    L.push('');
    L.push('### G. 그 밖');
    L.push('  1) 제주공항 렌터카 하우스: 도착 후 셔틀 타고 차 받기까지 보통 몇 분인지, 반납 후 공항까지 몇 분 전에 가야 하는지.');
    L.push(`  2) 한국천문연구원(KASI) 기준 12/28~30 제주시·서귀포 일출·일몰 시각 (지금 값 일출 ${J.SUN.rise}, 일몰 ${J.SUN.set}).`);
    L.push('  3) 12월 한라산 횡단도로(1100도로·516도로) 결빙·통제 정보를 실시간으로 볼 수 있는 곳(사이트·앱).');
    L.push('  4) 12/28~30 제주 행사·축제(성산일출축제 일정 포함)와 그 때문에 막히는 길.');
    L.push('  5) 2026년 12월 제주 감귤 체험 시즌 전반(올해 귤 작황, 체험 조기 종료 소식).');
    L.push('');
    L.push('## 4. 출력 JSON 형식 (이 키 이름 그대로)');
    L.push('```json');
    L.push(JSON.stringify({
      checked_at: 'YYYY-MM-DD',
      ferries: [{ id: 'm_songak', out: ['09:20'], back: ['10:00'], pairing: '출항편-귀항편 짝 규칙', ride_min: 30, checkin_min: 30, stay_rule: '섬 체류 규칙', fare: '성인 왕복 21,000원 (입도료 포함 여부)', booking: '예약 방법·마감', phone: '064-...', winter_note: '동절기 여부·결항 확인 방법', changed: true, confidence: '높음|중간|낮음', sources: [{ url: 'https://...', date: 'YYYY-MM-DD 또는 날짜 불명' }] }],
      places: [{ id: 't_hueree', status: '운영|종료|휴업|폐업|불명', season_end: 'YYYY-MM-DD 또는 null', open_12_28: true, open_12_29: true, open_12_30: true, open: '09:00', close: '18:00', last: '16:00', closed_days: ['월'], price: '...', reserve: '...', phone: '...', rain: '비 올 때 운영 방식', addr: '정확한 도로명 주소', lat: 33.123, lng: 126.456, note: '...', changed: false, confidence: '중간', sources: [{ url: 'https://...', date: '...' }] }],
      fishing: [{ boat: '선박명', port: '모슬포항', phone: '010-...', link: 'https://...', target: '방어·부시리', depart: ['06:00'], return_time: '10:30', hours: 4, halfday: true, pm_trip: false, price_per_person: '...', charter_price: '...', min_people: 2, gear: '대여 품목·가격', beginner: '가능 여부', cancel_refund: '...', fillet: '손질·회 가능 여부와 비용', catch_report: '최근 조황', confidence: '낮음', sources: [{ url: 'https://...', date: '...' }] }],
      new_places: [{ cat: 'tang|kart|fish|view|food|rest|flower', name: '...', addr: '...', lat: 33.123, lng: 126.456, open: '10:00', close: '17:00', last: '16:30', closed_days: [], price: '...', prog: '체험 내용', reserve: '...', phone: '...', note: '...', sources: [{ url: 'https://...', date: '...' }] }],
      lodging: [{ area: 'SEO', name: '숙소명', type: '호텔|리조트|에어비앤비|펜션', price_per_night: '...', parking: '무료|유료|없음', breakfast: '포함|별도', booking_site: '...', checked_price_date: 'YYYY-MM-DD', source: 'https://...' }],
      misc: { rental_pickup_min: 40, rental_return_before_flight_min: 90, sunrise: { '12-28': '07:37' }, sunset: { '12-28': '17:33' }, road_info: 'https://...', events: '...', tangerine_season_2026: '...' },
      unresolved: ['끝내 못 찾은 항목']
    }, null, 2));
    L.push('```');
    return L.join('\n');
  }
  root.JEJU_VERIFY = { build };
  if (typeof module !== 'undefined') module.exports = root.JEJU_VERIFY;
})(typeof window !== 'undefined' ? window : globalThis);
