/**
 * Re:che キャンペーン 申込フォーム バックエンド（GAS ウェブアプリ）
 *
 * 役割：
 *  - フォームからの回答(JSON)を受け取りスプレッドシートに保存
 *  - 参加姿勢で「承認 / 見送り」を判定（やる気のない人は公式LINEに飛ばさない）
 *  - 承認者が定員(100名)に達したら「満員」を返す
 *  - 同一LINEユーザーの重複応募を防ぐ
 *
 * 初回だけ setup() を実行 → 応募者管理スプシが自動生成される（くみこのDriveに作られる）
 */

var DEFINEITION_HEADERS = [
  '応募日時', 'ステータス', 'LINEユーザーID', 'LINE名', '本名',
  'メールアドレス', '年代', 'ご状況', 'スクール興味', '参加姿勢', '公式LINE追加', '追加日時'
];
var SHEET_NAME = '応募者';
var CAPACITY = 100; // 定員

/** スプシを取得（なければ自動作成＋ヘッダ整備）。手動setup不要・doGet/doPostから自動で呼ばれる */
function getOrCreateSheet_() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty('SHEET_ID');
  var ss;
  if (sheetId) {
    ss = SpreadsheetApp.openById(sheetId);
  } else {
    ss = SpreadsheetApp.create('Re:che キャンペーン応募者管理（2026年5-6月）');
    props.setProperty('SHEET_ID', ss.getId());
  }
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
  sheet.setName(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(DEFINEITION_HEADERS);
    sheet.getRange(1, 1, 1, DEFINEITION_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#1f6f5e')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** 動作確認＆スプシURL取得（任意・自動化では使わない）*/
function setup() {
  var url = getOrCreateSheet_().getParent().getUrl();
  Logger.log('スプシ ▶ ' + url);
  return url;
}

/** 動作確認用 */
function doGet() {
  var sheet = getOrCreateSheet_(); // 初回GETでスプシ自動作成＆スコープ認可
  return ContentService
    .createTextOutput(JSON.stringify({ result: 'ok', message: 'alive', sheetUrl: sheet.getParent().getUrl() }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** フォーム送信受信 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 同時送信での定員カウントずれを防止

    var data = JSON.parse(e.postData.contents);
    var sheet = getOrCreateSheet_(); // 手動setup不要・自動でスプシ用意
    var values = sheet.getDataRange().getValues(); // 1行目ヘッダ

    // 重複チェック（同一userId）＋承認者カウント
    var approvedCount = 0;
    for (var i = 1; i < values.length; i++) {
      var rowStatus = values[i][1];
      var rowUserId = values[i][2];
      if (rowStatus === '承認') approvedCount++;
      if (data.userId && rowUserId === data.userId) {
        // 既に応募済み → 既存ステータスをそのまま返す（多重登録させない）
        return json({ result: 'ok', status: rowStatus, duplicated: true });
      }
    }

    // 判定：参加姿勢が様子見、またはスクールを考えていない人=見送り。
    // それ以外=承認。ただし定員超過は満員
    var status;
    if (data.stance === 'まずは様子を見たい' ||
        data.schoolInterest === 'スクールについては考えていない') {
      status = '見送り';
    } else if (approvedCount >= CAPACITY) {
      status = '満員';
    } else {
      status = '承認';
    }

    // テストモード：判定結果だけ返してスプシには保存しない
    if (data.test === true) {
      return json({ result: 'ok', status: status, test: true });
    }

    sheet.appendRow([
      new Date(),
      status,
      data.userId || '',
      data.displayName || '',
      data.realName || '',
      data.email || '',
      data.ageGroup || '',
      data.situation || '',
      data.schoolInterest || '',
      data.stance || '',
      '', // 公式LINE追加（follow Webhook導入時に自動更新）
      ''  // 追加日時
    ]);

    return json({ result: 'ok', status: status });
  } catch (err) {
    return json({ result: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
