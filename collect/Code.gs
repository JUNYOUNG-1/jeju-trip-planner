/**
 * 제주 동선 플래너 — "모두의 선택" 모으기 (Google Apps Script 웹 앱)
 * 구글 시트에 붙여 넣고 웹 앱으로 배포하면, 플래너의 "저장" 버튼이 이 시트에 한 줄씩 쌓는다.
 * 시트에서 줄을 지우면 플래너 화면에서도 사라진다.
 */
const SHEET_NAME = '선택모음';
const HEADER = ['저장시각', '이름', '메모', '점수', '숙소', '포함 체험', '1일차', '2일차', '3일차', '링크', '코드'];

/* 플래너가 목록을 읽어 갈 때 */
function doGet() {
  const sh = sheet_();
  const values = sh.getDataRange().getValues();
  values.shift();
  const items = values
    .filter(r => r[10])
    .map(r => ({
      t: r[0] instanceof Date ? r[0].getTime() : String(r[0]),
      name: String(r[1]),
      memo: String(r[2]),
      score: r[3],
      lodge: String(r[4]),
      code: String(r[10])
    }));
  return json_({ ok: true, items: items.slice(-300) });
}

/* 플래너에서 "저장"을 누를 때 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const code = String(d.code || '');
    if (!/^[A-Za-z0-9_-]{20,8000}$/.test(code)) return json_({ ok: false, error: 'bad code' });
    sheet_().appendRow([
      new Date(),
      clip_(d.name, 20),
      clip_(d.memo, 200),
      Number(d.score) || '',
      clip_(d.lodge, 60),
      clip_(d.cover, 120),
      clip_(d.d1, 600),
      clip_(d.d2, 600),
      clip_(d.d3, 600),
      clip_(d.link, 9000),
      code
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADER);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* 글자 수 제한 + 수식으로 해석되지 않게 막기 */
function clip_(v, n) {
  let s = String(v == null ? '' : v).slice(0, n);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
