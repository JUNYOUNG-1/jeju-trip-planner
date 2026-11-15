/* 제주 12월 동선 플래너 — 데이터
   기준일: 2026-11-15 조사. 좌표는 지도 표시·거리 보정용 근사값(내비는 업체명으로 검색).
   chk:true = 운영/시간/가격을 출발 전 전화로 꼭 다시 확인해야 하는 항목 */
(function (root) {
  const SRC = {
    yeogi: 'https://xn--ok0b236bp0a.com/place/12222',
    jejucom: 'https://www.jeju.com/blog/jeju-tangerine-picking',
    soul: 'https://thesoulofseoul.net/your-ultimate-guide-to-tangerine-picking-on-jeju-island/',
    wonderful: 'https://wonderfulis.co.kr/boarding_guide/time/',
    songak: 'https://www.songakferry.com',
    udo: 'https://gusle.kr/%EC%84%B1%EC%82%B0%ED%95%AD-%EC%9A%B0%EB%8F%84-%EB%B0%B0%ED%8E%B8-%EC%8B%9C%EA%B0%84%ED%91%9C-%EC%9A%94%EA%B8%88-%EC%98%88%EC%95%BD-%EB%B0%A9%EB%B2%95-2026%EB%85%84-%EC%B5%9C%EC%8B%A0/',
    udocar: 'https://travelmapjourney.com/udo-rental-car-restriction-2026-2029/',
    biyang: 'https://travelmapjourney.com/jeju-biyangdo-ferry-timetable-stay-window/',
    gapa: 'https://www.trvlogue.com/ko/gapado-island-ferry-guide',
    fish: 'https://v.daum.net/v/20241220110300380',
    bangeoFest: 'https://www.kmib.co.kr/article/20261115500757',
    bangeoNews: 'https://m.news.nate.com/view/20260108n30109',
    moseulFood: 'https://www.jeju.com/blog/restaurants-jeju-moseulpo-yellowtail',
    visit: 'https://www.visitjeju.net'
  };

  /* 여행 날짜 (2026-12-28 월 ~ 12-30 수) */
  const DAYS = [
    { label: '1일차', date: '12/28', wd: 1, wdName: '월' },
    { label: '2일차', date: '12/29', wd: 2, wdName: '화' },
    { label: '3일차', date: '12/30', wd: 3, wdName: '수' }
  ];
  const SUN = { rise: '07:37', set: '17:33' };

  /* 동네(구역). 이동시간은 아래 행렬(분, 승용차 평상시) + 장소별 거리 보정 */
  const ZONES = {
    AIR: { name: '제주시·공항', short: '제주시', lat: 33.500, lng: 126.510, desc: '공항, 동문시장(야시장), 노형 드림타워, 용두암·도두봉. 렌터카 인수·반납 지점. 남쪽 명소까지는 50~60분.' },
    AEW: { name: '애월', short: '애월', lat: 33.462, lng: 126.330, desc: '해안도로 카페거리, 한담해안산책로, 곽지해변. 공항에서 25~30분, 노을이 좋은 서북쪽 해안.' },
    HAN: { name: '한림·협재', short: '협재', lat: 33.400, lng: 126.250, desc: '협재·금능 해변(에메랄드빛 바다), 한림항(비양도 배). 공항에서 40분대.' },
    GOS: { name: '한경·고산', short: '고산', lat: 33.300, lng: 126.180, desc: '수월봉(일몰), 차귀도, 신창 풍차해안. 섬 서쪽 끝이라 한적하고 멀다.' },
    WSM: { name: '서부 중산간', short: '서부중산간', lat: 33.365, lng: 126.340, desc: '9.81파크(중력 카트), 새별오름, 금오름, 아르떼뮤지엄. 평화로를 타면 공항 30분.' },
    ADM: { name: '안덕 중산간', short: '안덕중산간', lat: 33.292, lng: 126.335, desc: '오설록 티뮤지엄, 카멜리아힐(동백), 제주신화월드, 감귤 체험농장이 몰려 있는 곳.' },
    DAE: { name: '대정·모슬포', short: '모슬포', lat: 33.218, lng: 126.252, desc: '모슬포항(방어낚시·방어회), 운진항(마라도·가파도 배), 추사관. 섬 남서쪽 끝.' },
    AND: { name: '안덕 해안 (사계·산방산)', short: '사계·산방산', lat: 33.232, lng: 126.305, desc: '산방산·용머리해안, 사계해변, 송악산(산이수동항 마라도 배), 산방산 탄산온천.' },
    JUN: { name: '중문', short: '중문', lat: 33.250, lng: 126.415, desc: '중문관광단지 리조트, 주상절리, 천제연폭포, 카트장. 서귀포 시내까지 20분.' },
    SEO: { name: '서귀포 시내', short: '서귀포', lat: 33.252, lng: 126.560, desc: '매일올레시장, 이중섭거리, 외돌개(올레7), 정방·천지연폭포, 쇠소깍, 감귤박물관(효돈).' },
    NAM: { name: '남원·위미', short: '남원·위미', lat: 33.282, lng: 126.672, desc: '귤밭이 가장 많은 동네. 위미 동백군락지, 휴애리, 큰엉 해안(올레5). 조용하다.' },
    PYO: { name: '표선', short: '표선', lat: 33.330, lng: 126.825, desc: '표선해변, 해비치 리조트, 성읍민속마을. 섬 동남쪽.' },
    SSN: { name: '성산', short: '성산', lat: 33.455, lng: 126.910, desc: '성산일출봉, 섭지코지, 광치기해변, 성산포항(우도 배), 빛의 벙커.' },
    GUJ: { name: '구좌 (세화·월정·종달)', short: '구좌', lat: 33.515, lng: 126.850, desc: '세화·월정리 해변 카페, 비자림, 종달리(지미봉, 해녀의 부엌).' },
    JOC: { name: '조천·함덕', short: '함덕', lat: 33.525, lng: 126.660, desc: '함덕해변·서우봉, 제주 레포츠랜드(카트). 공항에서 25~30분.' },
    EMT: { name: '동부 중산간', short: '동부중산간', lat: 33.440, lng: 126.680, desc: '사려니숲길, 에코랜드, 스누피가든, 교래·가시리, 와산 감귤농장.' },
    HAL: { name: '한라산·1100도로', short: '1100고지', lat: 33.360, lng: 126.460, desc: '1100고지 습지(겨울 눈꽃), 어리목·영실. 12월엔 결빙·체인 규제가 생길 수 있다.' }
  };
  const ZORDER = ['AIR', 'AEW', 'HAN', 'GOS', 'WSM', 'ADM', 'DAE', 'AND', 'JUN', 'SEO', 'NAM', 'PYO', 'SSN', 'GUJ', 'JOC', 'EMT', 'HAL'];
  /* 하삼각 이동시간(분). 행 i는 ZORDER[i]와 앞선 구역들 사이 */
  const TRI = [
    [],
    [28],
    [42, 18],
    [55, 32, 18],
    [32, 18, 20, 22],
    [45, 32, 25, 20, 15],
    [52, 45, 32, 20, 30, 18],
    [55, 45, 35, 25, 30, 15, 12],
    [50, 45, 45, 38, 32, 22, 28, 20],
    [55, 55, 58, 52, 45, 38, 42, 35, 22],
    [62, 65, 70, 62, 58, 50, 55, 48, 35, 18],
    [60, 75, 85, 85, 70, 68, 72, 65, 52, 35, 22],
    [62, 80, 95, 100, 80, 82, 88, 82, 68, 52, 40, 25],
    [48, 70, 85, 95, 70, 80, 88, 85, 72, 62, 50, 35, 20],
    [28, 50, 65, 75, 55, 65, 72, 72, 65, 55, 50, 45, 40, 22],
    [35, 55, 65, 70, 55, 55, 62, 58, 48, 35, 28, 25, 35, 25, 20],
    [35, 40, 45, 50, 30, 35, 45, 42, 30, 35, 45, 55, 65, 55, 45, 40]
  ];
  const MATRIX = {};
  ZORDER.forEach(a => { MATRIX[a] = {}; });
  ZORDER.forEach((a, i) => {
    MATRIX[a][a] = 0;
    for (let j = 0; j < i; j++) { const b = ZORDER[j]; MATRIX[a][b] = TRI[i][j]; MATRIX[b][a] = TRI[i][j]; }
  });

  const CATS = {
    tang:   { label: '귤밭 체험', short: '귤밭', color: 'tang' },
    kart:   { label: '카트', short: '카트', color: 'kart' },
    marado: { label: '마라도 (짜장면)', short: '마라도', color: 'sea' },
    udo:    { label: '우도', short: '우도', color: 'sea' },
    fish:   { label: '방어·배낚시', short: '낚시', color: 'navy' },
    olle:   { label: '올레길', short: '올레', color: 'olle' },
    island: { label: '다른 섬 (가파도·비양도)', short: '섬', color: 'sea' },
    flower: { label: '동백 명소', short: '동백', color: 'cam' },
    rest:   { label: '온천·실내 (비 오는 날)', short: '실내', color: 'plum' },
    view:   { label: '풍경·오름·숲', short: '풍경', color: 'view' },
    food:   { label: '먹거리 (식사로 계산)', short: '식사', color: 'food' }
  };

  /* 배 시간표 (시뮬레이션에 쓰는 값) */
  const every = (from, to, step) => { const out = []; let [h, m] = from.split(':').map(Number); let t = h * 60 + m; const [eh, em] = to.split(':').map(Number); const e = eh * 60 + em; while (t <= e) { out.push(String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0')); t += step; } return out; };

  const P = [];
  const add = (o) => { P.push(o); };

  /* ───────── 귤밭 체험 ───────── */
  const T = (id, name, zone, lat, lng, o) => add(Object.assign({ id, cat: 'tang', grp: 'tang', name, zone, lat, lng, day: true }, o));
  T('t_hueree', '휴애리 자연생활공원', 'NAM', 33.309, 126.634, { dur: 120, open: '09:00', close: '18:00', last: '16:00', addr: '서귀포시 남원읍 신례동로 256', price: '입장 성인 13,000원 + 감귤체험 8,000원(약 1kg)', prog: '감귤따기 · 동물 먹이주기(흑돼지·말·염소) · 동백 정원', res: '현장 접수 (체험 접수 16:00 마감)', note: '12월은 동백 시즌이라 귤+동백을 한 번에. 테마파크형이라 2시간은 잡는 게 좋다.', tags: ['동백', '동물', '테마파크', '추천'], src: SRC.yeogi, chk: true });
  T('t_museum', '서귀포 감귤박물관 (감귤수확체험)', 'SEO', 33.280, 126.602, { dur: 75, open: '09:00', close: '18:00', last: '17:00', addr: '서귀포시 효돈순환로 441 (신효동)', price: '체험 5,000원 + 입장료 1,500원 (2025 기준, 약 1kg)', prog: '감귤수확 체험 · 세계감귤전시관 · 카페', res: '현장 접수', note: '공립이라 가장 저렴하고 믿을 만하다. 2025년엔 11/3~12/30 운영 — 올해 종료일 확인 필수. 악천후엔 체험 중단.', tags: ['저렴', '공영', '실내전시'], src: SRC.yeogi, chk: true, warn: '체험 종료일이 12/30 전후. 3일차라면 특히 확인' });
  T('t_harye', '하례감귤체험농장', 'NAM', 33.292, 126.622, { dur: 60, open: '09:30', close: '17:00', last: '16:30', addr: '서귀포시 남원읍 하례리 (중산간동로 5607 일대)', price: '20,000원 / 타이벡 감귤 3kg, 시식 무제한', prog: '타이벡 감귤따기 + 시식', res: '현장 접수', note: '3kg을 담아 갈 수 있어 양이 넉넉하다. 밭을 옮겨 운영해 내비가 옛 밭으로 안내할 수 있음.', tags: ['넉넉함'], src: SRC.jejucom, chk: true });
  T('t_shimter', '쉼터체험농장 (위미)', 'NAM', 33.272, 126.664, { dur: 45, open: '09:00', close: '18:00', last: '17:15', addr: '서귀포시 남원읍 일주동로 7678 (위미리)', price: '입장 3,000원 + 체험 10,000원/1kg', prog: '감귤따기', res: '전화 010-4113-5055', note: '위미 동백군락지와 가깝다. 무료 주차, 반려동물 가능.', tags: ['동백 근처'], src: SRC.jejucom });
  T('t_choinamdan', '최남단체험감귤농장 (가뫼물)', 'NAM', 33.285, 126.710, { dur: 100, open: '09:00', close: '18:00', last: '17:00', addr: '서귀포시 남원읍 남위남성로 164 (남원리)', price: '13,900원/1kg (모노레일 포함 19,900원, 시점 불명)', prog: '감귤따기 · 동물원·곤충 · 모노레일 · 감귤잼/초콜릿 만들기', res: '네이버 예약 / 현장', note: '비 오면 다른 체험으로 대체 가능한 복합형.', tags: ['동물', '만들기', '비와도OK'], rain: true, src: 'https://xn--ok0b236bp0a.com/place/23361' });
  T('t_gudeul', '구들민박 감귤체험농장', 'SEO', 33.248, 126.568, { dur: 40, open: '08:00', close: '17:00', last: '16:30', addr: '서귀포시 정방연로 34 (정방동)', price: '입장·체험 무료, 딴 귤 1kg당 3,000원', prog: '감귤따기 · 염소·토끼 먹이주기', res: '전화 010-9245-6528', note: '정방폭포·올레시장 바로 옆. 귤 소진 시 종료(2024 등록 정보).', tags: ['저렴', '시내'], src: 'https://xn--ok0b236bp0a.com/place/14969', chk: true });
  T('t_kkotgyul', '꽃귤농장 (대포동)', 'JUN', 33.247, 126.437, { dur: 45, open: '11:00', close: '16:00', last: '15:30', closed: [3, 6], addr: '서귀포시 대포로 116 (중문)', price: '약 15,000원 (1kg 포함), 초과 kg당 4,000원', prog: '감귤따기', res: '네이버 예약 (선결제, 당일 가능)', note: '수·토 휴무 → 12/30(수) 불가.', tags: ['중문'], src: 'https://xn--ok0b236bp0a.com/place/23324', chk: true });
  T('t_gamttanam', '감따남 (월산동)', 'SEO', 33.276, 126.488, { dur: 60, open: '12:00', close: '18:00', last: '17:30', closed: [0, 1], addr: '서귀포시 월산로 16', price: '15,000원 (장비·시식·입장 포함)', prog: '감귤따기 · 귤꽃 피크닉 · 스냅사진 · 정원카페', res: '개인 현장 가능, 스냅은 예약', note: '사진 찍기 좋은 곳(커플·웨딩 스냅). 일·월 휴무 → 12/28(월) 불가.', tags: ['사진명소', '카페'], src: 'https://xn--ok0b236bp0a.com/place/23319', chk: true });
  T('t_gyulsarang', '귤사랑 (호근동)', 'SEO', 33.268, 126.515, { dur: 45, open: '08:00', close: '17:30', last: '17:00', closed: [2], addr: '서귀포시 호근북로 173', price: '입장 무료, 시식+1kg 체험비 시즌별', prog: '감귤따기 · 포토존', res: '전화 010-2509-9956', note: '무농약 재배. 화요일 휴무 → 12/29 불가.', tags: ['무농약'], src: 'https://xn--ok0b236bp0a.com/place/14951', chk: true });
  T('t_haepum', '해품은체험농장 (수산리)', 'SSN', 33.446, 126.848, { dur: 40, open: '09:00', close: '17:00', addr: '서귀포시 성산읍 수산리 279-3', price: '2,000~3,000원/1kg', prog: '노지감귤따기', res: '전화 확인', note: '"9월 말~12월" 운영 공지 — 12월 말엔 끝났을 가능성이 높다.', tags: ['저렴', '성산'], src: SRC.jejucom, chk: true, warn: '12월 말 종료 가능성 큼' });
  T('t_901', '제주농원901 (성산)', 'SSN', 33.420, 126.880, { dur: 40, open: '09:00', close: '18:00', addr: '서귀포시 성산읍 (상세주소 전화 확인)', price: '7,000원/1kg', prog: '감귤따기', res: '전화', note: '우도 다녀오는 길에 끼우기 좋다. 무료 주차.', tags: ['성산', '저렴'], src: SRC.jejucom, chk: true });
  T('t_bonaeda', '보내다제주 (토산리)', 'PYO', 33.312, 126.792, { dur: 60, open: '10:00', close: '18:00', last: '17:00', addr: '서귀포시 표선면 토산중앙로 487-134', price: '1kg 체험(시즌가), 초과 kg당 4,000원', prog: '감귤따기 · 정원·포토존 · 무제한 시식', res: '전화 010-2162-3699', note: '연중무휴. 사진 찍기 좋은 정원형.', tags: ['사진명소'], src: 'https://xn--ok0b236bp0a.com/place/23293' });
  T('t_hayul', '하율이네감귤농장 (하천리)', 'PYO', 33.350, 126.800, { dur: 40, open: '10:00', close: '17:00', addr: '서귀포시 표선면 하천리 1485-2', price: '전화 확인', prog: '감귤따기', res: '전화 확인', note: '정보가 적은 소규모 농장.', tags: [], src: SRC.soul, chk: true });
  T('t_bongbong', '봉봉감귤체험농장', 'NAM', 33.318, 126.672, { dur: 70, open: '10:00', close: '17:00', addr: '서귀포시 남원읍 중산간동로 7141번길 16', price: '전화 확인', prog: '감귤따기 · 초콜릿·비누 만들기', res: '전화 확인', note: '만들기 체험 병행형.', tags: ['만들기'], src: SRC.soul, chk: true });
  T('t_kims', '제주킴스농장 귤창고 (서호동)', 'SEO', 33.262, 126.522, { dur: 50, open: '10:00', close: '17:00', addr: '서귀포시 서호동 567', price: '전화 확인', prog: '감귤따기 · 카페', res: '전화 확인', note: '서귀포 시내 서쪽, 법환 근처.', tags: ['카페'], src: SRC.soul, chk: true });
  T('t_doldam', '제주 돌담프룻', 'JUN', 33.255, 126.388, { dur: 45, open: '09:00', close: '16:00', last: '15:30', addr: '서귀포시 안덕면 일주서로 1359 (중문 서쪽)', price: '9,000원/1kg (와그 판매가), 커피 1잔 무료', prog: '감귤따기 · 포토존', res: '와그 온라인 예약', note: '연중무휴. 중문 숙소라면 가깝다.', tags: ['사진명소', '저렴'], src: 'https://www.waug.com/ko/activities/149799' });
  T('t_fathers', '파더스가든', 'ADM', 33.297, 126.358, { dur: 110, open: '09:00', close: '18:00', last: '17:00', addr: '서귀포시 안덕면 병악로 44-33', price: '입장+귤체험 24,000원 / 동물농장+귤체험(1.5kg) 30,000원', prog: '감귤따기 · 동물 먹이주기 · 승마 · 카페 · 호빗마을 포토존', res: '네이버 예약', note: '테마파크형. 동백·유채 포토존. 기상 따라 입장 제한.', tags: ['동물', '테마파크', '사진명소'], src: 'https://xn--ok0b236bp0a.com/place/28639' });
  T('t_troy', '트로이테마농원', 'ADM', 33.312, 126.292, { dur: 60, open: '10:00', close: '17:00', last: '16:30', closed: [5], addr: '서귀포시 안덕면 녹차분재로 56', price: '7,000~9,000원/1kg', prog: '감귤따기 · 승마 · 동물 먹이주기', res: '네이버 예약 / 현장', note: '2026.10.25~2027.02.28 감귤체험 운영 공지 — 이번 시즌 운영이 확인된 곳. 금요일 휴무(이번 일정엔 영향 없음). 오설록 바로 옆.', tags: ['시즌확인됨', '동물', '저렴', '추천'], src: 'https://mom-mom.net/travel/places/65d2bf3f9af6b32c85e83b4e' });
  T('t_namu', '나무와열매 체험농장 (덕수리)', 'AND', 33.258, 126.331, { dur: 70, open: '11:00', close: '17:00', last: '16:00', addr: '서귀포시 안덕면 덕수동로25번길 42-8', price: '약 12,000~16,000원 / 1인 한 바구니', prog: '감귤따기(10~2월) · 수제 과일청 클래스', res: '현장 가능', note: '우천 시 체험 불가. 산방산 근처.', tags: ['만들기'], src: 'https://xn--ok0b236bp0a.com/place/14963', chk: true });
  T('t_eunha', '은하감귤체험농장 (덕수리)', 'AND', 33.262, 126.322, { dur: 50, open: '09:40', close: '16:40', last: '16:00', addr: '서귀포시 안덕면 덕수서로 250 (은하농수산물직판장)', price: '10,000원/약 1.2kg, 시식만 5,000원', prog: '감귤따기 · 시식 · 감귤모자 대여', res: '10명 미만 현장 접수', note: '산방산·송악산·모슬포 일정 사이에 끼우기 가장 좋은 위치. 종료 공지는 네이버·인스타 확인.', tags: ['추천', '마라도 근처'], src: 'https://mom-mom.net/travel/places/6944e433183fe4adf9365bca' });
  T('t_76', '귤밭76번지 (낭만농장)', 'ADM', 33.297, 126.362, { dur: 50, open: '10:00', close: '17:00', last: '16:00', addr: '서귀포시 안덕면 병악로 76', price: '입장 2,000원 + 체험 15,000원/3kg', prog: '감귤따기', res: '전화 070-4001-5303', note: '3kg으로 양이 많다. 비·눈 오면 쉬거나 일찍 닫음(2022 정보).', tags: ['넉넉함'], src: 'https://xn--ok0b236bp0a.com/place/23290', chk: true });
  T('t_prince', '어린왕자감귤밭 (대정)', 'DAE', 33.248, 126.272, { dur: 70, open: '09:30', close: '20:00', last: '19:00', addr: '서귀포시 대정읍 추사로36번길 45-1', price: '입장 12,000원 (1인 1음료, 감귤따기 포함)', prog: '감귤따기 · 알파카 등 먹이주기 · 카페', res: '전화/DM 010-7547-1605', note: '밤 8시까지 해서 낚시·마라도 뒤에 늦게 가도 된다. 해 질 녘 조명이 예쁘다.', tags: ['늦게까지', '동물', '카페', '모슬포 근처'], day: false, src: 'https://xn--ok0b236bp0a.com/place/23294', chk: true });
  T('t_jungok', '귤중옥 (안덕, 숙소 부속)', 'AND', 33.262, 126.348, { dur: 40, open: '10:00', close: '17:00', addr: '서귀포시 안덕면 (숙소 부속 귤밭)', price: '10,000원/1봉지', prog: '감귤따기 (11~2월)', res: '확인 필요', note: '에어비앤비 숙소에 딸린 귤밭. 숙박하면 더 편함.', tags: ['숙소'], src: 'https://www.airbnb.co.kr/rooms/33665567', chk: true });
  T('t_hondi', '혼디인2714 감귤체험카페', 'GOS', 33.322, 126.212, { dur: 60, open: '11:00', close: '19:00', last: '18:00', addr: '제주시 한경면 고조로 402', price: '10,000원 / 최대 2kg', prog: '감귤따기 · 디저트 카페', res: '네이버 예약 / 현장', note: '귤모자 소품 포토존. 반려동물 가능.', tags: ['카페', '늦게까지'], day: false, src: 'https://mom-mom.net/travel/places/6abdaa3eac87b5e1244a5fae' });
  T('t_hanga', '카페귤한가 (명월)', 'HAN', 33.388, 126.292, { dur: 50, open: '11:00', close: '17:00', closed: [1, 2, 3], addr: '제주시 한림읍 명월성로 238-1', price: '10,000원/1.5kg', prog: '감귤따기 · 카페', res: '확인 필요', note: '11~1월 목~일만 영업 → 이번 일정(월·화·수)엔 문 닫을 가능성 큼.', tags: ['카페'], src: SRC.jejucom, chk: true });
  T('t_hippie', '금오름 히피웅농장', 'WSM', 33.355, 126.300, { dur: 40, open: '10:00', close: '17:00', addr: '제주시 한림읍 금악리 (금오름 인근)', price: '입장 3,000원 + 1.5kg 10,000원', prog: '감귤따기', res: '확인 필요', note: '금오름 등반과 묶기 좋다.', tags: ['오름 근처'], src: SRC.jejucom, chk: true });
  T('t_tamna', '탐나는농장 감귤체험카페 (애월)', 'AEW', 33.445, 126.402, { dur: 60, open: '10:00', close: '17:30', last: '17:00', addr: '제주시 애월읍 오당빌레길 88', price: '10,000원/1kg (입장만 5,000원)', prog: '감귤따기 · 감귤청·화과자 클래스 · 카페(트램펄린)', res: '따기는 현장, 클래스는 네이버 예약', note: '휴무일이 목 또는 일로 자료가 엇갈림 — 이번 일정(월~수)은 대체로 무관.', tags: ['만들기', '카페'], src: 'https://xn--ok0b236bp0a.com/place/14940', chk: true });
  T('t_migang', '미깡창고 감귤밭 (광령)', 'AEW', 33.448, 126.428, { dur: 50, open: '11:00', close: '18:00', last: '17:00', closed: [0], addr: '제주시 애월읍 중산간서로 6716', price: '현장 결제 (현금·계좌이체만)', prog: '감귤따기 · 돌창고 카페', res: '선착순 (예약제 아님)', note: '공항 20분. 우천 시 입장만 되고 체험 불가.', tags: ['카페', '공항 근처'], src: 'https://xn--ok0b236bp0a.com/place/14951', chk: true });
  T('t_matdong', '맛동산 감귤체험농장 (광령)', 'AEW', 33.455, 126.436, { dur: 70, open: '12:00', close: '16:00', last: '15:00', closed: [1], addr: '제주시 애월읍 광령2길 62-1', price: '예약 페이지 확인 (시세 변동)', prog: '감귤따기 · 귤청 만들기 · 귤차·마들렌', res: '네이버 예약 필수', note: '월요일 휴무. 타이벡 감귤은 12월 하순이 막바지.', tags: ['만들기', '공항 근처'], src: 'https://xn--ok0b236bp0a.com/place/28628', chk: true });
  T('t_yewon', '예원이네 귤농장 (해안동)', 'AIR', 33.463, 126.463, { dur: 45, open: '10:00', close: '17:30', last: '17:00', addr: '제주시 해안동 2159', price: '입장 5,000원 + 체험비(시즌별)', prog: '감귤따기 · 포토존 · 옆 우영팟카페', res: '전화 010-7597-3899', note: '공항에서 약 15분 — 마지막 날 비행기 전에 넣기 좋다. 연중무휴.', tags: ['공항 근처', '추천'], src: 'https://xn--ok0b236bp0a.com/place/23291', chk: true });
  T('t_analog', '아날로그감귤밭 (해안동)', 'AIR', 33.466, 126.468, { dur: 45, open: '11:00', close: '17:00', last: '16:30', addr: '제주시 해안마을8길 46', price: '7,000원 (시식 + 1kg)', prog: '감귤따기 · 유기농 카페', res: '현장 가능', note: '카페 이용 시 입장 무료. 반려견 불가. 휴무일 자료가 엇갈림.', tags: ['공항 근처', '카페', '저렴'], src: 'https://xn--ok0b236bp0a.com/place/14967', chk: true });
  T('t_gyulhyang', '귤향기 체험농장 (노형)', 'AIR', 33.456, 126.478, { dur: 40, open: '09:00', close: '17:30', addr: '제주시 노형동 1100로 3118', price: '7,000~10,000원', prog: '감귤따기', res: '전화', note: '공항 인접. 10~12월 운영이라 12월 말엔 끝났을 수 있음.', tags: ['공항 근처'], src: SRC.jejucom, chk: true, warn: '12월 말 종료 가능' });
  T('t_songjeong', '제주송정농원 (영평동)', 'AIR', 33.468, 126.565, { dur: 50, open: '10:00', close: '16:30', last: '16:00', addr: '제주시 영평동 2465-7', price: '11,000원/2kg, 시식 무제한', prog: '감귤따기', res: '온라인 예약', note: '10/1~1월 중순 운영. 유치원생 이하 무료.', tags: ['넉넉함', '공항 근처'], src: SRC.jejucom });
  T('t_akkom', '제주 아꼼이네', 'AIR', 33.480, 126.598, { dur: 45, open: '10:00', close: '17:00', addr: '제주시 연삼로 1066-31', price: '11,000원/2kg', prog: '감귤따기', res: '확인 필요', note: '36개월 미만 무료.', tags: ['넉넉함'], src: SRC.jejucom, chk: true });
  T('t_bome', '보메와산 감귤체험농장', 'EMT', 33.468, 126.652, { dur: 60, open: '10:00', close: '17:00', last: '16:30', closed: [1], addr: '제주시 조천읍 미래로 53 (와산리)', price: '감귤따기 9,000원 / +귤청 25,000원', prog: '감귤따기 · 귤청 클래스 · 놀이터 카페', res: '현장 가능, 클래스는 전화', note: '월요일 휴무 가능(자료 엇갈림).', tags: ['만들기'], src: 'https://mom-mom.net/travel/places/66c7e94a99266c3fea04e9ba', chk: true });
  T('t_contena', '카페 더 콘테나 (함와로)', 'JOC', 33.502, 126.652, { dur: 45, open: '10:30', close: '18:00', last: '17:00', closed: [3], addr: '제주시 조천읍 함와로 513', price: '8,000원/1인 바구니', prog: '감귤따기 · 카페', res: '인스타 공지 확인', note: '14세 미만 입장 제한(노키즈). 수요일 휴무.', tags: ['카페'], src: SRC.soul, chk: true });

  /* ───────── 카트 ───────── */
  const K = (id, name, zone, lat, lng, o) => add(Object.assign({ id, cat: 'kart', grp: 'kart', name, zone, lat, lng, day: false }, o));
  K('k_981', '9.81파크 (중력 레이싱)', 'WSM', 33.373, 126.369, { dur: 100, open: '09:00', close: '18:00', last: '17:00', addr: '제주시 애월읍 천덕로 880-24', price: '1회 2~3만원대 (패키지 별도, 추정) · 앱/네이버 예약', prog: '엔진 없는 중력 카트로 언덕 트랙 주행, 최고 약 40km/h. 앱으로 랩타임·주행영상 제공', res: '9.81PARK 앱·네이버 예약 권장', note: '제주에서 가장 유명한 카트. 공항에서 30분이라 첫날·마지막 날 넣기 좋다. 겨울 운영시간은 확인 필요.', tags: ['추천', '공항 근처', '영상제공'], src: 'https://www.trvlogue.com/ko/jeju-981park-kart-review', chk: true });
  K('k_wind', '윈드1947 카트 테마파크', 'SEO', 33.2735, 126.5935, { dur: 60, open: '10:00', close: '18:00', last: '17:30', addr: '서귀포시 토평공단로 78-27', price: '1인승 20,000원~ · 2인승 30,000원~ (온라인 할인가 19,000원대)', prog: '오픈 서킷 카트 (1인승·2인승), 서바이벌 병설', res: '온라인 예약 시 할인', note: '1인승 키 150cm·14세(또는 17세) 이상. 서귀포 시내 숙소면 10분.', tags: ['서귀포 근처', '2인승'], src: 'https://nol.yanolja.com/leisure/10380379' });
  K('k_gamgyul', '감귤카트 (구 얼라이브카트, 중문)', 'JUN', 33.253, 126.412, { dur: 60, open: '10:00', close: '18:00', last: '17:00', addr: '서귀포시 중문관광로 42', price: '1인승 25,000원', prog: '카트 트랙', res: '온라인 예약', note: '중문 리조트에서 가깝다. 운영시간 확인 필요.', tags: ['중문'], src: 'https://www.waug.com/rentalcar/activities/102618', chk: true });
  K('k_jungmun', '제주 중문카트', 'JUN', 33.256, 126.420, { dur: 60, open: '10:00', close: '18:00', addr: '서귀포시 중문관광단지 인근', price: '온라인 예약가 확인', prog: '카트 트랙', res: '온라인 예약', note: '연중무휴로 안내. 감귤카트와 같은 곳인지 예약 시 확인.', tags: ['중문'], src: 'https://www.waug.com/ko/activities/102669', chk: true });
  K('k_leports', '제주 레포츠랜드 (조천)', 'JOC', 33.478, 126.636, { dur: 80, open: '09:30', close: '18:00', last: '17:00', addr: '제주시 조천읍', price: '온라인 예약가 확인', prog: '대형 카트 트랙 · 산악 버기카 · 짚라인', res: '온라인 예약', note: '공항에서 25분 — 첫날/마지막 날 동쪽 동선과 잘 맞는다. 트랙 규모가 크다는 후기.', tags: ['공항 근처', '버기카'], src: 'https://www.waug.com/ko/activities/111244', chk: true });
  K('k_active', '제주 액티브파크 (한림)', 'HAN', 33.387, 126.242, { dur: 70, open: '09:30', close: '18:00', last: '17:00', addr: '제주시 한림읍 금능남로 76', price: '현장 확인', prog: '천연 잔디 위 카트 트랙 · 클라이밍', res: '현장/온라인', note: '협재·금능 해변과 묶기 좋다. 잔디 트랙이라 비 오면 영향.', tags: ['협재 근처'], src: 'https://www.ktriptips.com/kor/leisure/3066990', chk: true });
  K('k_offroad', '중문 오프로드 체험장 (ATV·버기)', 'JUN', 33.262, 126.426, { dur: 60, open: '10:00', close: '17:00', last: '16:00', addr: '서귀포시 중문', price: 'ATV 30,000~70,000원 · 버기 9~14만원', prog: '오프로드 ATV · 몬스터버기 · 지프', res: '온라인 예약', note: '카트 대신 흙길 오프로드를 원하면.', tags: ['오프로드'], src: 'https://www.waug.com/ko/activities/124027' });

  /* ───────── 마라도 ───────── */
  add({ id: 'm_songak', cat: 'marado', grp: 'marado', name: '마라도 — 송악산 산이수동항 출발', zone: 'AND', lat: 33.2050, lng: 126.2905, sea: true,
    slot: { kind: 'ferry', out: ['09:20', '10:00', '10:50', '11:50', '12:40', '13:30', '14:10', '15:30'], back: ['10:00', '10:40', '11:30', '12:30', '13:20', '14:10', '14:50', '16:10'], ride: 30, checkin: 30, stay: 80, stayOpts: [60, 80, 100, 120] },
    addr: '서귀포시 대정읍 송악관광로 (산이수동항)', price: '성인 왕복 21,000원 (온라인 1,000원 할인)', prog: '배 30분 → 마라도 해물·톳짜장면 → 섬 한 바퀴(약 1시간) → 귀항', res: '온라인 maradotour.com·네이버 (1일 전까지), 당일은 전화 064-794-6661. 출항 30분 전까지 매표소', note: '배가 하루 8회로 많아 시간 맞추기 쉽다. 마라도 출발 시각은 공식 게시가 없어 "출항+40분"으로 계산(임시표 기준). 바로 옆이 송악산 둘레길(올레10).', tags: ['추천', '배 자주 있음'], src: SRC.songak, chk: true });
  add({ id: 'm_unjin', cat: 'marado', grp: 'marado', name: '마라도 — 운진항(모슬포 남항) 출발', zone: 'DAE', lat: 33.2135, lng: 126.2515, sea: true,
    slot: { kind: 'ferry', out: ['09:40', '11:10', '13:50', '15:10'], back: ['10:20', '11:50', '14:30', '15:50'], ride: 30, checkin: 40, stay: 80, stayOpts: [60, 80, 100, 120] },
    addr: '서귀포시 대정읍 하모리 (운진항)', price: '송악산과 비슷 (선사 승선요금 페이지 확인)', prog: '배 30분 → 마라도 짜장면 → 섬 산책 → 귀항', res: '홈페이지 예매(1일 전까지) / 현장. 예약자는 출항 40분 전 발권, 매표 10분 전 마감. 064-794-5490', note: '하루 4회뿐이라 11:10에 타면 14:30 배로 나와 섬 체류가 길어진다. 방어낚시 항구(모슬포항)와 붙어 있다.', tags: ['모슬포항 옆'], src: SRC.wonderful, chk: true });

  /* ───────── 우도 ───────── */
  add({ id: 'u_seongsan', cat: 'udo', grp: 'udo', name: '우도 — 성산포항 출발', zone: 'SSN', lat: 33.4735, lng: 126.9330, sea: true,
    slot: { kind: 'ferry', out: every('08:00', '16:30', 30), back: every('08:30', '17:00', 30), ride: 15, checkin: 20, stay: 180, stayOpts: [120, 150, 180, 240] },
    addr: '서귀포시 성산읍 성산등용로 (성산포항 종합여객터미널)', price: '성인 왕복 11,000원 (우도해양도립공원 입장료 포함, 2026)', prog: '배 15분 → 우도봉·검멀레·서빈백사·하고수동 → 땅콩아이스크림 → 귀항', res: '현장 발권만 가능. 승선신고서 2장(입도·출도) + 신분증. 064-782-5671', note: '렌터카는 우도 반입 금지 → 성산항 주차장에 두고 탄다. 섬 안은 전기차·스쿠터 대여 또는 순환버스. 겨울 막배(우도→성산) 17:00 전후(확인 필요).', tags: ['렌터카 반입 금지'], src: SRC.udo, chk: true });

  /* ───────── 낚시 ───────── */
  const F = (id, name, zone, lat, lng, slot, o) => add(Object.assign({ id, cat: 'fish', name, zone, lat, lng, sea: true, slot: Object.assign({ kind: 'boat', checkin: 30, post: 20 }, slot) }, o));
  F('f_moseul_am', '모슬포 방어 선상낚시 (새벽 출항)', 'DAE', 33.2140, 126.2510, { out: ['06:30'], outOpts: ['06:00', '06:30', '07:00'], dur: 240, durOpts: [180, 240, 300] }, { grp: 'fish', early: true, addr: '서귀포시 대정읍 하모리 모슬포항', price: '1인 8~15만원 선 (추정, 업체·인원별 상이)', prog: '마라도 근해 대방어·부시리. 자리돔 생미끼 외줄낚시 또는 지깅', res: '선장 직접 전화 / 네이버 카페·밴드. 최소 인원·채비 대여 확인', note: '방어의 본고장. 새벽에 나가 3~4시간 뒤 귀항하면 오전에 끝나서 마라도와 같은 날 붙이기 좋다. 지난 시즌 어획 부진 보도가 있었고 조과는 보장되지 않는다. 멀미약 필수.', tags: ['방어', '추천'], src: SRC.fish, chk: true });
  F('f_moseul_pm', '모슬포 방어 선상낚시 (오후 출항)', 'DAE', 33.2140, 126.2510, { out: ['13:00'], outOpts: ['12:00', '12:30', '13:00', '13:30'], dur: 240, durOpts: [180, 240] }, { grp: 'fish', addr: '서귀포시 대정읍 모슬포항', price: '1인 8~15만원 선 (추정)', prog: '오후 출조 (운영하는 배가 있는지 확인)', res: '선장 직접 전화', note: '새벽이 부담되면. 오후 출조는 배마다 다르니 꼭 문의. 4시간이면 일몰 무렵 귀항.', tags: ['방어'], src: SRC.fish, chk: true });
  F('f_sagye', '사계항 출조선 (제주왔어호 등)', 'AND', 33.2285, 126.3000, { out: ['06:30', '13:00'], outOpts: ['06:00', '06:30', '07:00', '13:00'], dur: 240, durOpts: [180, 240, 300] }, { grp: 'fish', early: true, addr: '서귀포시 안덕면 사계리 사계항', price: '문의', prog: '방어·부시리 선상낚시', res: '선장 직접 전화', note: '2024년 12월 기사에 소개된 사계항 방어 출조선. 사계·산방산 숙소면 가깝다.', tags: ['방어'], src: SRC.fish, chk: true });
  F('f_dodu', '도두항 출조선 (백호·화원호·가자호)', 'AIR', 33.5075, 126.4665, { out: ['06:30', '13:00'], outOpts: ['06:00', '06:30', '07:00', '13:00'], dur: 240, durOpts: [180, 240, 300] }, { grp: 'fish', early: true, addr: '제주시 도두동 도두항', price: '문의', prog: '방어·부시리 지깅, 갈치 등', res: '선장 직접 전화', note: '공항 10분. 다만 북쪽 바다는 겨울 북서풍에 결항이 더 잦다.', tags: ['방어', '공항 근처'], src: SRC.fish, chk: true });
  F('f_cheonil', '서귀포 천일호 배낚시 (일반 어종)', 'SEO', 33.2390, 126.5650, { out: ['09:00', '13:00', '15:00'], outOpts: ['09:00', '13:00', '15:00'], dur: 150, durOpts: [120, 150, 180] }, { grp: 'fish2', addr: '서귀포시 서귀포항', price: '30,000원~ (정가 40,000원)', prog: '2~3시간 초보용 배낚시 (방어 아님)', res: '와그 등 온라인', note: '방어 전문이 아닌 체험형. 시간은 예약 페이지에서 확인.', tags: ['초보', '방어 아님'], src: 'https://www.waug.com/ko/activities/110443', chk: true });
  F('f_chagwi', '차귀도 달래 뱃낚시 (일반 어종)', 'GOS', 33.3100, 126.1650, { out: ['10:00', '13:00', '14:30'], outOpts: ['10:00', '13:00', '14:30'], dur: 180, durOpts: [180] }, { grp: 'fish2', addr: '제주시 한경면 고산리 자구내포구', price: '27,000원 (미끼 별도), 낚싯대·구명조끼 포함', prog: '3시간 배낚시 (방어 아님). 일몰 돌고래 낚시 상품도', res: 'pelago 등, 전날 전화 확인', note: '수월봉·차귀도 풍경이 좋다.', tags: ['초보', '방어 아님'], src: 'https://www.pelago.com/ko/activity/ph6yd6q5f-chagwido-island-dalrae-boat-fishing-experience-advanced-reservation-required-jeju-island-south-korea-jeju', chk: true });
  F('f_seongsan', '성산포·우도 선상낚시 (유람형)', 'SSN', 33.4720, 126.9320, { out: every('09:30', '15:30', 60), outOpts: every('09:30', '15:30', 60), dur: 90, durOpts: [60, 90, 120] }, { grp: 'fish2', addr: '성산포 여객터미널 매표소', price: '14,000원~ (쿠폰가, 최신 확인)', prog: '1~2시간 유람선 연계 낚시 · 회 시식 (방어 아님)', res: '와그·trazy 사전예약', note: '안전요원 상주, 장비 포함. 짧게 맛보기용.', tags: ['초보', '짧음', '방어 아님'], src: 'https://www.trazy.com/experience/detail/Jeju-Seongsan-Udo-Boat-Fishing', chk: true });

  /* ───────── 올레길 (짧은 구간) ───────── */
  const O = (id, name, zone, lat, lng, o) => add(Object.assign({ id, cat: 'olle', grp: 'olle', name, zone, lat, lng, day: true, open: '07:30', close: '17:33' }, o));
  O('o7', '올레 7코스 · 외돌개 → 돔베낭길 → 법환포구', 'SEO', 33.2400, 126.5450, { dur: 100, km: 5.5, addr: '서귀포시 서홍동 외돌개 주차장', prog: '약 5.5km · 1시간 40분 · 평지 해안', note: '올레에서 가장 유명한 해안 구간. 바다 절벽과 범섬 풍경. 끝나고 택시로 차로 돌아오거나 왕복.', tags: ['추천', '대표구간'], price: '무료' });
  O('o6', '올레 6코스 · 쇠소깍 → 보목포구 → 소천지', 'SEO', 33.2525, 126.6230, { dur: 100, km: 5, addr: '서귀포시 하효동 쇠소깍', prog: '약 5km · 1시간 40분', note: '쇠소깍 계곡에서 시작해 한라산이 비치는 소천지까지.', tags: [], price: '무료' });
  O('o5', '올레 5코스 · 큰엉 해안 → 위미 동백군락지', 'NAM', 33.2735, 126.7020, { dur: 120, km: 6, addr: '서귀포시 남원읍 큰엉 해안경승지', prog: '약 6km · 2시간', note: '12월 동백이 피는 위미 동백군락지를 지난다. 겨울에 특히 좋은 구간.', tags: ['동백', '겨울추천'], price: '무료' });
  O('o10a', '올레 10코스 · 송악산 둘레길', 'AND', 33.2010, 126.2895, { dur: 75, km: 3.5, addr: '서귀포시 대정읍 송악산 주차장 (산이수동항 바로 옆)', prog: '약 3.5km · 1시간 15분', note: '마라도 배 타는 항구에서 바로 시작. 형제섬·산방산·마라도가 보인다.', tags: ['추천', '마라도 근처'], price: '무료' });
  O('o10b', '올레 10코스 · 사계해안 → 용머리 → 산방산', 'AND', 33.2245, 126.2985, { dur: 90, km: 4.5, addr: '서귀포시 안덕면 사계해변', prog: '약 4.5km · 1시간 30분', note: '발자국 화석이 있는 사계해안과 산방산 아래 길. 용머리해안은 물때·바람으로 자주 통제.', tags: [], price: '무료' });
  O('o8', '올레 8코스 · 주상절리 → 중문 색달해변', 'JUN', 33.2380, 126.4240, { dur: 110, km: 6, addr: '서귀포시 중문동 주상절리대', prog: '약 6km · 1시간 50분', note: '주상절리 → 베릿내오름 → 중문해변. 중문 숙소면 가깝다.', tags: [], price: '무료 (주상절리 입장 별도)' });
  O('o9', '올레 9코스 · 대평포구 → 박수기정 → 화순', 'JUN', 33.2330, 126.3720, { dur: 150, km: 6, addr: '서귀포시 안덕면 대평리 대평포구', prog: '약 6km · 2시간 30분 · 오르막 있음', note: '박수기정 절벽 위 숲길. 짧지만 경사가 있다.', tags: ['오르막'], price: '무료' });
  O('o1', '올레 1코스 · 말미오름 → 알오름 → 종달', 'SSN', 33.4790, 126.8900, { dur: 90, km: 4, addr: '서귀포시 성산읍 시흥리 올레 1코스 시작점', prog: '약 4km · 1시간 30분 · 오름 2개', note: '성산일출봉과 우도가 한눈에 보이는 전망 구간.', tags: ['전망', '우도 근처'], price: '무료' });
  O('o21', '올레 21코스 · 지미봉', 'GUJ', 33.5050, 126.8930, { dur: 70, km: 2, addr: '제주시 구좌읍 종달리 지미봉', prog: '약 2km 왕복 · 1시간 10분 · 계단 오르막', note: '우도·성산일출봉 전망이 최고인 작은 오름.', tags: ['전망', '우도 근처'], price: '무료' });
  O('o19', '올레 19코스 · 함덕해변 → 서우봉', 'JOC', 33.5440, 126.6720, { dur: 70, km: 3, addr: '제주시 조천읍 함덕해수욕장', prog: '약 3km · 1시간 10분', note: '에메랄드빛 함덕 바다와 서우봉 둘레길. 공항 30분.', tags: ['공항 근처'], price: '무료' });
  O('o14', '올레 14코스 · 금능 → 협재 → 옹포 해안', 'HAN', 33.3900, 126.2340, { dur: 80, km: 4, addr: '제주시 한림읍 금능해수욕장', prog: '약 4km · 1시간 20분 · 평지', note: '비양도를 보며 걷는 하얀 모래 해안.', tags: [], price: '무료' });
  O('o17', '올레 17코스 · 도두봉 → 이호테우해변', 'AIR', 33.5080, 126.4680, { dur: 80, km: 4, addr: '제주시 도두동 도두봉', prog: '약 4km · 1시간 20분', note: '공항 10분. 마지막 날 비행기 전에 걷기 좋다. 비행기 이착륙이 보이는 도두봉.', tags: ['공항 근처', '추천'], price: '무료' });
  O('o16', '올레 16코스 · 구엄포구 돌염전 해안', 'AEW', 33.4880, 126.3900, { dur: 60, km: 3, addr: '제주시 애월읍 구엄리', prog: '약 3km · 1시간', note: '애월 해안의 옛 돌소금밭. 노을 무렵 좋다.', tags: [], price: '무료' });
  O('o3', '올레 3코스 · 신산 → 표선 해안', 'PYO', 33.3700, 126.8780, { dur: 90, km: 5, addr: '서귀포시 성산읍 신산리', prog: '약 5km · 1시간 30분', note: '사람이 적고 조용한 동남쪽 해안.', tags: ['한적'], price: '무료' });

  /* ───────── 다른 섬 ───────── */
  add({ id: 'i_gapado', cat: 'island', grp: 'i_gapado', name: '가파도 (운진항, 올레 10-1)', zone: 'DAE', lat: 33.2135, lng: 126.2515, sea: true,
    slot: { kind: 'ferry', out: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:50'], back: ['09:20', '10:20', '11:20', '12:20', '14:20', '16:10'], ride: 10, checkin: 30, stay: 90, stayOpts: [60, 90, 120] },
    addr: '서귀포시 대정읍 운진항', price: '성인 13,100원 (왕복 여부 확인)', prog: '배 10분 → 납작한 섬 한 바퀴 올레 10-1 (4.2km)', res: '홈페이지·현장, 064-794-5490', note: '마라도 대신 또는 추가로. 겨울엔 청보리가 없어 한산하다.', tags: [], src: SRC.wonderful, chk: true });
  add({ id: 'i_biyang', cat: 'island', grp: 'i_biyang', name: '비양도 (한림항, 2천년호)', zone: 'HAN', lat: 33.4135, lng: 126.2610, sea: true,
    slot: { kind: 'ferry', out: ['09:00', '12:00', '14:00', '15:30'], back: ['09:15', '12:15', '14:15', '15:45'], ride: 15, checkin: 20, stay: 90, stayOpts: [60, 90, 120, 180] },
    addr: '제주시 한림읍 한림항 도선대합실', price: '대인 왕복 12,000원', prog: '배 15분 → 비양봉 오르기 · 섬 둘레길', res: '현장 발권만. 신분증·승선신고서. 2천년호 064-796-7522 / 비양도호 064-796-3515', note: '비양도호(09:20·11:20·13:20·15:20)도 있다. 왕복은 같은 선사로.', tags: [], src: SRC.biyang, chk: true });

  /* ───────── 동백 ───────── */
  add({ id: 'x_camellia', cat: 'flower', grp: 'x_camellia', name: '카멜리아힐 (동백 수목원)', zone: 'ADM', lat: 33.2905, lng: 126.3700, day: true, dur: 90, open: '08:30', close: '18:00', last: '17:00', addr: '서귀포시 안덕면 병악로 166', price: '성인 약 10,000원 (확인)', prog: '동백 정원 산책 · 포토존', res: '현장', note: '12월이 동백 절정. 제주 겨울 대표 명소.', tags: ['추천', '겨울추천'], chk: true });
  add({ id: 'x_wimi', cat: 'flower', grp: 'x_wimi', name: '위미 동백군락지', zone: 'NAM', lat: 33.2780, lng: 126.6650, day: true, dur: 30, open: '08:00', close: '17:33', addr: '서귀포시 남원읍 위미리', price: '무료 (사유지 일부 입장료)', prog: '100년 넘은 동백나무 숲길', res: '없음', note: '12월 말 붉은 동백. 짧게 들르기 좋다.', tags: ['무료'] });
  add({ id: 'x_dongbaek', cat: 'flower', grp: 'x_dongbaek', name: '제주동백수목원 (위미)', zone: 'NAM', lat: 33.2873, lng: 126.6800, day: true, dur: 50, open: '08:30', close: '17:00', addr: '서귀포시 남원읍 위미리 929-2', price: '성인 약 5,000원 (확인)', prog: '둥글게 다듬은 동백나무 정원', res: '현장', note: '12월 중순~1월이 절정이라 시기가 딱 맞다.', tags: ['겨울추천'], chk: true });

  /* ───────── 온천·실내 ───────── */
  add({ id: 'x_spa', cat: 'rest', grp: 'x_spa', name: '산방산 탄산온천', zone: 'AND', lat: 33.2420, lng: 126.3120, rain: true, dur: 90, open: '07:00', close: '22:00', last: '21:00', addr: '서귀포시 안덕면 사계북로41번길', price: '성인 약 1만원대 (확인)', prog: '탄산 온천탕 · 야외 노천탕', res: '현장', note: '찬바람 맞은 낚시·마라도 뒤에 몸 녹이기 딱. 비 와도 OK. 운영시간 확인.', tags: ['추천', '비와도OK', '겨울추천'], chk: true });
  add({ id: 'x_bunker', cat: 'rest', grp: 'x_bunker', name: '빛의 벙커 (성산)', zone: 'SSN', lat: 33.4405, lng: 126.8995, rain: true, dur: 60, open: '10:00', close: '18:00', last: '17:00', addr: '서귀포시 성산읍 고성리', price: '성인 약 2만원 (확인)', prog: '옛 통신벙커 안 몰입형 미디어아트', res: '온라인/현장', note: '우도 결항 시 대체 1순위.', tags: ['비와도OK'], chk: true });
  add({ id: 'x_arte', cat: 'rest', grp: 'x_arte', name: '아르떼뮤지엄 제주', zone: 'WSM', lat: 33.3985, lng: 126.3455, rain: true, dur: 75, open: '10:00', close: '20:00', last: '19:00', addr: '제주시 애월읍 어림비로 478', price: '성인 약 2만원 (확인)', prog: '미디어아트 전시', res: '온라인/현장', note: '9.81파크와 10분 거리 — 비 오면 카트 대신.', tags: ['비와도OK'], chk: true });
  add({ id: 'x_osulloc', cat: 'rest', grp: 'x_osulloc', name: '오설록 티뮤지엄', zone: 'ADM', lat: 33.3058, lng: 126.2895, rain: true, dur: 60, open: '09:00', close: '18:00', addr: '서귀포시 안덕면 신화역사로 15', price: '무료 (카페 별도)', prog: '녹차밭 · 티뮤지엄 · 녹차 디저트', res: '없음', note: '트로이테마농원(귤)과 바로 옆.', tags: ['비와도OK'] });

  /* ───────── 풍경·오름·숲 ───────── */
  const V = (id, name, zone, lat, lng, o) => add(Object.assign({ id, cat: 'view', grp: id, name, zone, lat, lng, day: true }, o));
  V('x_ilchul', '성산일출봉', 'SSN', 33.4585, 126.9425, { dur: 75, open: '07:00', close: '19:00', addr: '서귀포시 성산읍 일출로 284-12', price: '성인 5,000원', prog: '정상까지 왕복 약 1시간', res: '현장', note: '우도 배 타는 성산항 바로 옆. 일출 07:37.', tags: ['대표명소'], chk: true });
  V('x_seopji', '섭지코지', 'SSN', 33.4240, 126.9305, { dur: 50, open: '07:30', close: '17:33', addr: '서귀포시 성산읍 섭지코지로', price: '무료 (주차 유료)', prog: '해안 언덕 산책, 성산일출봉 전망', res: '없음', note: '' , tags: [] });
  V('x_yongmeori', '용머리해안', 'AND', 33.2320, 126.3140, { dur: 40, open: '09:00', close: '17:00', addr: '서귀포시 안덕면 사계리', price: '성인 2,000원', prog: '파도가 깎은 사암 절벽 해안길', res: '현장', note: '물때·바람으로 자주 통제 → 당일 오전 확인 필수.', tags: ['통제잦음'], chk: true });
  V('x_saebyeol', '새별오름', 'WSM', 33.3660, 126.3575, { dur: 50, open: '07:30', close: '17:33', addr: '제주시 애월읍 봉성리', price: '무료', prog: '정상까지 왕복 50분', res: '없음', note: '9.81파크에서 5분.', tags: [] });
  V('x_1100', '1100고지 습지·휴게소', 'HAL', 33.3575, 126.4625, { dur: 30, open: '08:00', close: '17:00', addr: '서귀포시 1100로', price: '무료', prog: '설경 감상', res: '없음', note: '눈 오면 장관이지만 체인·통제 확인. 평화로가 대안.', tags: ['눈꽃'], chk: true });
  V('x_saryeoni', '사려니숲길', 'EMT', 33.4400, 126.6400, { dur: 90, open: '09:00', close: '17:00', addr: '제주시 조천읍 교래리 (비자림로 입구)', price: '무료', prog: '삼나무 숲길 왕복', res: '없음', note: '바람 센 날 해안 대신.', tags: [] });
  V('x_bija', '비자림', 'GUJ', 33.4895, 126.8085, { dur: 60, open: '09:00', close: '18:00', last: '17:00', addr: '제주시 구좌읍 비자숲길 55', price: '성인 3,000원', prog: '천년 비자나무 숲 산책', res: '현장', note: '', tags: [] });
  V('x_hyeopjae', '협재해수욕장', 'HAN', 33.3940, 126.2395, { dur: 30, open: '07:30', close: '17:33', addr: '제주시 한림읍 협재리', price: '무료', prog: '에메랄드빛 해변 산책', res: '없음', note: '', tags: [] });
  V('x_handam', '애월 한담해안산책로·카페거리', 'AEW', 33.4625, 126.3115, { dur: 60, open: '08:00', close: '20:00', addr: '제주시 애월읍 곽지리', price: '무료', prog: '해안 산책 + 바다 카페', res: '없음', note: '공항 가는 길 마지막 커피.', tags: ['공항 근처'], day: false });
  V('x_soesokkak', '쇠소깍', 'SEO', 33.2525, 126.6235, { dur: 30, open: '08:00', close: '17:33', addr: '서귀포시 하효동', price: '무료', prog: '계곡과 바다가 만나는 곳', res: '없음', note: '', tags: [] });
  V('x_jeongbang', '정방폭포', 'SEO', 33.2448, 126.5720, { dur: 30, open: '09:00', close: '18:00', addr: '서귀포시 동홍동', price: '성인 2,000원', prog: '바다로 바로 떨어지는 폭포', res: '현장', note: '', tags: [] });
  V('x_cheonjiyeon', '천지연폭포 (밤에도 개방)', 'SEO', 33.2465, 126.5545, { dur: 40, open: '09:00', close: '22:00', addr: '서귀포시 천지동', price: '성인 2,000원', prog: '야간 조명 산책', res: '현장', note: '해 진 뒤에도 갈 수 있는 몇 안 되는 곳.', tags: ['야간'], day: false });
  V('x_jusang', '중문 대포 주상절리대', 'JUN', 33.2375, 126.4255, { dur: 30, open: '09:00', close: '18:00', addr: '서귀포시 중문동', price: '성인 2,000원', prog: '육각 기둥 절벽', res: '현장', note: '', tags: [] });
  V('x_suwolbong', '수월봉 (일몰)', 'GOS', 33.2950, 126.1630, { dur: 40, open: '07:30', close: '18:00', addr: '제주시 한경면 고산리', price: '무료', prog: '지질 트레일 · 일몰', res: '없음', note: '일몰 17:33 무렵.', tags: ['일몰'] });
  V('x_hamdeok', '함덕해수욕장', 'JOC', 33.5430, 126.6690, { dur: 30, open: '07:30', close: '17:33', addr: '제주시 조천읍 함덕리', price: '무료', prog: '해변 산책', res: '없음', note: '', tags: ['공항 근처'] });
  V('x_ecoland', '에코랜드 테마파크', 'EMT', 33.4560, 126.6680, { dur: 100, open: '09:00', close: '17:00', last: '16:00', addr: '제주시 조천읍 번영로 1278-169', price: '성인 약 14,000원 (확인)', prog: '숲속 기차 타고 곶자왈 한 바퀴', res: '현장', note: '', tags: [], chk: true });
  V('x_snoopy', '스누피가든', 'EMT', 33.4440, 126.7520, { dur: 90, open: '09:00', close: '18:00', last: '17:00', addr: '제주시 구좌읍 금백조로 930', price: '성인 약 2만원 (확인)', prog: '실내 전시 + 야외 정원', res: '온라인/현장', note: '실내 비중이 있어 날씨 영향 적다.', tags: ['비와도OK'], rain: true, chk: true });

  /* ───────── 먹거리 (점심·저녁으로 계산) ───────── */
  const M = (id, name, zone, lat, lng, meal, o) => add(Object.assign({ id, cat: 'food', grp: id, name, zone, lat, lng, meal }, o));
  M('x_bangeo', '모슬포 방어회 저녁 (하모항구로 식당가)', 'DAE', 33.2165, 126.2510, 'dinner', { dur: 80, open: '11:00', close: '21:00', last: '20:00', addr: '서귀포시 대정읍 하모항구로', price: '특방어 1인 35,000원~ · 2인 세트 6~14만원 (시세 변동)', prog: '부두식당·수눌음·돈지식당·미영이네 등. 대기 길면 항구식당·만선식당·바당포구', res: '전화로 대기 확인', note: '낚시한 방어를 손질해 주는지도 물어보면 좋다.', tags: ['방어', '추천'], src: SRC.moseulFood });
  M('x_olle_market', '서귀포 매일올레시장 저녁', 'SEO', 33.2500, 126.5635, 'dinner', { dur: 70, open: '07:00', close: '21:00', last: '20:00', addr: '서귀포시 중앙로62번길 18', price: '1인 1~3만원', prog: '회·흑돼지 꼬치·오메기떡·딱새우', res: '없음', note: '서귀포 숙소면 걸어서.', tags: ['서귀포 근처'] });
  M('x_dongmun', '동문시장 야시장 저녁', 'AIR', 33.5120, 126.5280, 'dinner', { dur: 70, open: '18:00', close: '23:00', last: '22:00', addr: '제주시 관덕로14길 20', price: '1인 1~3만원', prog: '야시장 먹거리 · 흑돼지·전복김밥', res: '없음', note: '제주시 숙소일 때.', tags: ['야간'], day: false });
  M('x_heukdwaeji', '제주시 흑돼지 저녁 (노형·흑돼지거리)', 'AIR', 33.4880, 126.4870, 'dinner', { dur: 80, open: '11:00', close: '22:00', last: '21:00', addr: '제주시 노형동 · 건입동 흑돼지거리', price: '1인 3~4만원', prog: '흑돼지 근고기', res: '웨이팅 앱 확인', note: '', tags: [] });
  M('x_guksu', '제주시 고기국수 점심 (국수문화거리)', 'AIR', 33.5050, 126.5300, 'lunch', { dur: 50, open: '09:00', close: '20:00', addr: '제주시 일도2동 국수문화거리', price: '1인 1만원 안팎', prog: '돼지 수육을 올린 고기국수', res: '없음', note: '공항 가는 길 마지막 점심.', tags: ['공항 근처'] });
  M('x_haenyeo', '해녀의 부엌 (종달, 공연+식사)', 'GUJ', 33.4955, 126.9025, 'dinner', { dur: 150, open: '17:00', close: '21:00', last: '17:30', addr: '제주시 구좌읍 종달리', price: '1인 수만원대 (공연 포함, 확인)', prog: '해녀 이야기 공연 + 해산물 코스', res: '사전 예약 필수 (회차제)', note: '우도 다녀온 날 저녁으로. 회차·가격 꼭 확인.', tags: ['예약필수'], chk: true });

  /* ───────── 숙소 동네 ───────── */
  const LODGE = {
    SEO: { label: '서귀포 시내', lat: 33.2465, lng: 126.5625, tier: '₩₩', ex: ['서귀포 칼호텔 (토평)', 'JW 메리어트 제주 (법환)', '더 그랜드 섬오름 (법환)', '이중섭거리·올레시장 주변 호텔·에어비앤비'], pros: '섬 남쪽 가운데라 동쪽(우도)·서쪽(모슬포) 모두 40~55분. 올레시장 덕에 저녁 해결이 쉽다.', cons: '공항까지 55분. 새벽 낚시 날엔 5시대 출발.' },
    JUN: { label: '중문', lat: 33.2485, lng: 126.4110, tier: '₩₩~₩₩₩', ex: ['제주신라호텔', '롯데호텔 제주', '그랜드 조선 제주', '파르나스 호텔 제주', '히든클리프 호텔&네이쳐'], pros: '리조트·온수풀. 모슬포·마라도 항까지 25~30분.', cons: '성산·우도까지 70분. 리조트 밖 식당이 적다.' },
    AND: { label: '사계·산방산 (안덕 해안)', lat: 33.2320, lng: 126.3020, tier: '₩~₩₩', ex: ['사계리 독채 펜션·에어비앤비', '산방산 탄산온천 주변 숙소', '화순 해변 쪽 호텔'], pros: '모슬포·송악산 항까지 10~15분 → 새벽 낚시·마라도에 최적. 산방산 뷰.', cons: '성산·우도 80분 이상, 공항 55분. 밤엔 식당이 일찍 닫는다.' },
    DAE: { label: '모슬포 (대정)', lat: 33.2190, lng: 126.2530, tier: '₩', ex: ['모슬포항 주변 호텔·게스트하우스', '하모리 독채'], pros: '낚시 배까지 걸어갈 수 있다. 방어회 식당가가 바로 앞.', cons: '동쪽 일정(우도)과 가장 멀다(85~90분). 숙소 선택지가 적다.' },
    ADM: { label: '신화월드 (안덕 중산간)', lat: 33.3050, lng: 126.3170, tier: '₩₩', ex: ['제주신화월드 (메리어트·랜딩·서머셋)'], pros: '대형 리조트, 서부 한가운데. 평화로로 공항 45분.', cons: '바다가 안 보인다. 동쪽은 멀다.' },
    NAM: { label: '남원·위미', lat: 33.2750, lng: 126.6650, tier: '₩~₩₩', ex: ['위미리 귤밭 독채 (에어비앤비 "위미 귤밭" 검색)', '남원 큰엉 해안 쪽 리조트'], pros: '귤밭 한가운데 감성 숙소, 동백 명소 도보권. 우도 40분.', cons: '모슬포 55분. 저녁 먹을 곳이 적다.' },
    PYO: { label: '표선', lat: 33.3250, lng: 126.8350, tier: '₩₩', ex: ['해비치 호텔&리조트 제주', '표선 해변 펜션'], pros: '우도 25분, 조용한 해변 리조트.', cons: '모슬포 70분 → 새벽 낚시가 매우 이르다.' },
    SSN: { label: '성산', lat: 33.4600, lng: 126.9200, tier: '₩~₩₩', ex: ['플레이스 캠프 제주', '휘닉스 섭지코지', '성산일출봉 뷰 펜션'], pros: '우도 첫배·일출봉 일출에 최적.', cons: '모슬포 88분 → 새벽 방어낚시와 사실상 함께하기 어렵다.' },
    AIR: { label: '제주시 (노형·연동)', lat: 33.4880, lng: 126.4900, tier: '₩₩', ex: ['그랜드 하얏트 제주 (드림타워)', '롯데시티호텔 제주', '메종 글래드 제주'], pros: '첫날·마지막 날이 편하고 밤 식당·시장이 많다.', cons: '남쪽 일정마다 50~60분 왕복이 쌓인다.' },
    AEW: { label: '애월', lat: 33.4620, lng: 126.3200, tier: '₩₩', ex: ['애월 해안도로 오션뷰 펜션·풀빌라'], pros: '노을, 카페거리, 공항 30분.', cons: '동쪽·남쪽 모두 멀다.' },
    JOC: { label: '함덕·조천', lat: 33.5430, lng: 126.6680, tier: '₩₩', ex: ['소노벨 제주 (함덕)', '함덕 해변 앞 호텔·펜션'], pros: '공항 30분, 우도 40분, 예쁜 해변.', cons: '모슬포 72분.' },
    HAN: { label: '협재·한림', lat: 33.3950, lng: 126.2450, tier: '₩~₩₩', ex: ['협재·금능 해변 펜션'], pros: '서쪽 바다 뷰, 모슬포 32분.', cons: '동쪽은 95분.' },
    GUJ: { label: '세화·월정 (구좌)', lat: 33.5230, lng: 126.8560, tier: '₩~₩₩', ex: ['세화·월정리 감성 숙소'], pros: '우도 20분, 바다 카페.', cons: '모슬포 88분.' }
  };
  const LORDER = ['SEO', 'JUN', 'AND', 'DAE', 'ADM', 'NAM', 'PYO', 'SSN', 'AIR', 'AEW', 'JOC', 'HAN', 'GUJ'];

  /* ───────── 베스트 동선 10 (알고리즘이 실시간 채점) ───────── */
  const it = (p, o) => (o ? { p, o } : { p });
  const PLANS = [
    { id: 'b1', title: '시계 방향 한 바퀴', lodge: ['SEO', 'SEO'], concept: '첫날 동쪽(우도·휴애리) → 둘째 날 남서쪽(방어낚시·마라도·송악산) → 마지막 날 공항 쪽(카트·애월). 같은 길을 되돌아가지 않는다.', pros: '원하는 6가지를 모두 넣고도 이동이 덜 겹친다. 배 일정이 1·2일차라 결항되면 3일차로 미룰 여유가 있다.', cons: '2일차 새벽 5시대 출발.',
      days: [[it('u_seongsan', { stay: 150 }), it('t_hueree')], [it('f_moseul_am'), it('m_songak'), it('o10a'), it('x_bangeo')], [it('k_981'), it('x_handam'), it('x_guksu'), it('o17')]] },
    { id: 'b2', title: '모슬포 집중 · 사계 2박', lodge: ['AND', 'AND'], concept: '숙소를 낚시·마라도 항구 10분 거리에 두고, 우도는 첫날 공항에서 바로. 마지막 날은 오설록·귤밭·9.81파크로 공항까지.', pros: '새벽 낚시 출발이 6시 전후로 가장 편하다. 첫날 저녁 탄산온천, 2일차 저녁 방어회.', cons: '1일차 우도에서 사계까지 80분을 달려야 한다. 2일차에 배를 두 번 탄다.',
      days: [[it('u_seongsan', { stay: 150 }), it('x_camellia'), it('x_spa')], [it('f_moseul_am'), it('m_songak'), it('o10a'), it('x_bangeo')], [it('x_osulloc'), it('t_troy'), it('k_981')]] },
    { id: 'b3', title: '리조트 휴양 · 중문 2박', lodge: ['JUN', 'JUN'], concept: '중문 리조트에서 쉬면서 1일차 동쪽 · 2일차 서쪽 · 3일차 중문 근처 카트와 귤밭.', pros: '숙소 퀄리티가 높고 모슬포 28분.', cons: '1일차 위미에서 중문까지 저녁 이동. 귤밭은 마지막 날.',
      days: [[it('u_seongsan', { stay: 150 }), it('x_seopji'), it('x_wimi')], [it('f_moseul_am'), it('m_songak'), it('o10b'), it('x_bangeo')], [it('t_doldam'), it('x_jusang'), it('k_gamgyul')]] },
    { id: 'b4', title: '귤밭 감성 · 위미 2박', lodge: ['NAM', 'NAM'], concept: '귤밭 독채에 묵으며 동백·귤을 실컷. 카트는 첫날 공항 근처 레포츠랜드.', pros: '귤밭·동백 분위기 최고, 우도 40분.', cons: '모슬포 새벽 낚시 출발이 5시 전후.',
      days: [[it('k_leports'), it('u_seongsan', { stay: 150 }), it('t_shimter')], [it('f_moseul_am'), it('m_songak'), it('o10a'), it('x_bangeo')], [it('o5'), it('x_dongbaek')]] },
    { id: 'b5', title: '새벽 기상 없이 · 신화월드 2박', lodge: ['ADM', 'ADM'], concept: '2일차를 오전 마라도(09:20 첫배) → 오후 방어낚시로 짜서 새벽 출발을 없앤 안.', pros: '5시 기상이 없다. 신화월드는 서부 한가운데라 공항 45분.', cons: '오후 출조하는 배를 따로 찾아야 한다. 09:20 배를 놓치면 낚시가 빠듯해진다.',
      days: [[it('u_seongsan', { stay: 150 }), it('t_choinamdan')], [it('m_songak', { slot: '09:20' }), it('f_moseul_pm'), it('x_bangeo')], [it('k_981'), it('x_saebyeol'), it('o17')]] },
    { id: 'b6', title: '공항 거점 · 제주시 2박', lodge: ['AIR', 'AIR'], concept: '첫날·마지막 날을 공항 주변에서 채우고, 2일차에만 남서쪽 원정.', pros: '렌터카 인수·반납이 가장 편하고 밤 시장·식당이 많다.', cons: '2일차 왕복 이동이 길다(편도 50분+).',
      days: [[it('k_leports'), it('u_seongsan', { stay: 150 }), it('o21'), it('x_dongmun')], [it('f_moseul_am'), it('m_songak'), it('o10a'), it('x_bangeo')], [it('o17'), it('x_handam'), it('t_migang')]] },
    { id: 'b7', title: '마지막 날은 걷기·동백으로 느긋하게', lodge: ['SEO', 'SEO'], concept: '배 일정(우도·낚시·마라도)을 1·2일차에 끝내고, 3일차는 올레 7코스·귤밭·카멜리아힐을 천천히 돌며 공항으로.', pros: '귀국일에 결항 걱정이 없고, 마지막 날이 걷기·사진 위주라 여유롭다. 첫날 저녁 탄산온천.', cons: '2일차에 새벽 낚시와 마라도가 몰려 배를 두 번 탄다. 1일차 이동이 길다.',
      days: [[it('u_seongsan', { stay: 150 }), it('k_wind'), it('x_spa')], [it('f_moseul_am'), it('o10b'), it('m_songak')], [it('o7'), it('t_eunha'), it('x_camellia')]] },
    { id: 'b8', title: '우도 빼고 여유롭게', lodge: ['JUN', 'JUN'], concept: '왕복+섬 일주로 반나절이 드는 우도를 빼고 나머지 다섯 가지를 여유 있게.', pros: '하루 이동이 짧고 온천까지 들른다.', cons: '우도를 못 간다.',
      days: [[it('k_981'), it('x_osulloc'), it('t_fathers'), it('x_spa')], [it('f_moseul_am'), it('m_songak'), it('o10a'), it('x_bangeo')], [it('o7'), it('x_jeongbang'), it('x_soesokkak')]] },
    { id: 'b9', title: '숙소 나누기 · 위미 → 사계', lodge: ['NAM', 'AND'], concept: '1박은 동쪽 위미 귤밭 숙소(우도용), 1박은 서쪽 사계 바닷가(낚시·마라도용). 한 곳 2박과 효율을 비교해 보는 안.', pros: '1일차 우도·일출봉 뒤 숙소가 가깝고, 2일차 밤엔 사계에서 바로 쉰다. 3일차 오프로드 카트.', cons: '짐을 한 번 옮겨야 하고 2일차 새벽 낚시가 위미에서 5시대 출발이다.',
      days: [[it('x_ilchul'), it('u_seongsan', { stay: 150 })], [it('f_sagye'), it('o10b'), it('m_songak')], [it('x_camellia'), it('k_offroad'), it('t_tamna')]] },
    { id: 'b10', title: '이른 귀국편도 OK · 2일 몰아치기', lodge: ['SEO', 'SEO'], concept: '핵심을 1·2일차에 끝내고 3일차는 공항 근처 귤밭과 올레만. 오후 2시 비행기여도 성립.', pros: '귀국편이 당겨져도 일정이 무너지지 않는다.', cons: '귤밭이 마지막 날 공항 근처 농장으로 한정된다.',
      days: [[it('k_leports'), it('u_seongsan', { stay: 150 }), it('x_seopji')], [it('f_moseul_am'), it('m_songak'), it('o10a'), it('x_bangeo')], [it('t_yewon'), it('o17')]] }
  ];

  /* 기본 계획 = 베스트 1 */
  const DEFAULT_PLAN = 'b1';

  /* ───────── 배편 정보 표 ───────── */
  const FERRY = [
    { key: 'marado_songak', title: '마라도 · 송악산(산이수동항)', op: '마라도가는여객선', tel: '064-794-6661', rows: [['송악산 출발', '09:20 · 10:00 · 10:50 · 11:50 · 12:40 · 13:30 · 14:10 · 15:30'], ['마라도 출발', '공식 게시 없음 → 임시표 기준 "출항 +40분"으로 계산 (귀항편은 예매 화면에서 확인)'], ['소요', '편도 약 30분'], ['요금', '성인 왕복 21,000원 · 청소년 20,800 · 어린이 10,500 (온라인 1,000원 할인)'], ['예약', 'maradotour.com · 네이버 (1일 전까지) / 당일은 전화'], ['수속', '출항 30분 전까지 매표소 도착, 신분증 원본 필수']], src: SRC.songak, warn: '공식 페이지에 14:10이 두 번 적혀 있어 오기 가능성. 겨울 별도 시간표 미게시.' },
    { key: 'marado_unjin', title: '마라도 · 운진항(모슬포 남항)', op: '아름다운섬나라 정기여객선', tel: '064-794-5490 (08:00~16:30)', rows: [['운진항 출발', '09:40 · 11:10 · 13:50 · 15:10'], ['마라도 출발', '10:20 · 11:50 · 14:30 · 15:50'], ['소요', '편도 약 30분'], ['요금', '선사 승선요금 페이지 확인 (송악산과 비슷)'], ['예약', '홈페이지 예매 1일 전까지 / 현장'], ['수속', '예약자는 출항 40분 전 매표소 발권, 매표는 출항 10분 전 마감. 승선신고서 + 성인 전원 신분증 원본']], src: SRC.wonderful, warn: '정원 문제로 출항 시간에 따라 섬에서 나오는 배가 정해진다. 15:10 배는 사실상 섬 체류가 거의 없다.' },
    { key: 'udo', title: '우도 · 성산포항', op: '우도 도항선', tel: '성산 064-782-5671 · 우도 064-783-0448', rows: [['운항', '약 30분 간격'], ['겨울 막배', '우도 → 성산 17:00 전후 (11~2월, 블로그 기준) · 첫배 08:00 전후 (추정)'], ['소요', '편도 약 15분 (천진항 또는 하우목동항)'], ['요금', '성인 왕복 11,000원 (2026 인상, 도립공원 입장료 포함)'], ['예약', '온라인 불가, 현장 발권만. 승선신고서 2장(입도·출도) + 신분증'], ['렌터카', '일반 렌터카 반입 금지 (2026-08-01~2029-07-31 연장). 예외: 우도 숙박 예약자, 교통약자·영유아 동반, 전기·수소 렌터카 등'], ['섬 안 이동', '전기차·스쿠터 대여(3시간 약 3만원, 확인) 또는 순환버스. 2026-03부터 일부 이륜·PM 운행 제한 보도 있음']], src: SRC.udo, warn: '종달항 → 우도 노선은 겨울 운항 여부 불확실. 당일 아침 운항 확인.' },
    { key: 'gapado', title: '가파도 · 운진항', op: '아름다운섬나라', tel: '064-794-5490', rows: [['운진항 출발', '09:00 · 10:00 · 11:00 · 12:00 · 14:00 · 15:50'], ['가파도 출발', '09:20 · 10:20 · 11:20 · 12:20 · 14:20 · 16:10'], ['소요', '편도 약 10분'], ['요금', '성인 13,100원 (왕복 여부 확인)']], src: SRC.wonderful, warn: '가파도 출발 14:20이 두 번 적혀 있어 확인 필요.' },
    { key: 'biyang', title: '비양도 · 한림항', op: '2천년호 / 비양도호', tel: '2천년호 064-796-7522 · 비양도호 064-796-3515', rows: [['2천년호', '한림 09:00 · 12:00 · 14:00 · 15:30 → 비양도 출발 09:15 · 12:15 · 14:15 · 15:45'], ['비양도호', '한림 09:20 · 11:20 · 13:20 · 15:20 → 비양도 출발 09:35 · 11:35 · 13:35 · 15:35'], ['소요', '편도 15분'], ['요금', '대인 왕복 12,000원 · 소인 6,000원'], ['예약', '한림항 도선대합실 현장 발권만. 신분증 원본·승선신고서']], src: SRC.biyang, warn: '2025-08 비짓제주 자료 기준. 겨울 별도 시간표 없음.' }
  ];

  root.JEJU = { SRC, DAYS, SUN, ZONES, ZORDER, MATRIX, CATS, PLACES: P, LODGE, LORDER, PLANS, DEFAULT_PLAN, FERRY };
  if (typeof module !== 'undefined') module.exports = root.JEJU;
})(typeof window !== 'undefined' ? window : globalThis);
