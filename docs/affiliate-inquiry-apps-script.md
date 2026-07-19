# 제휴·협력 문의 — Google Apps Script 배포 가이드

`/api/affiliate-inquiries` (Next.js API 라우트, `src/app/api/affiliate-inquiries/route.ts`)는 문의가 접수되면
`GAS_AFFILIATE_WEBHOOK_URL` 환경변수에 지정된 URL로 JSON을 `POST`한다. 이 문서는 그 URL이 될 Google Apps Script
웹앱을 처음부터 배포하는 방법을 설명한다. **이 문서 자체와 아래 스프레드시트/스크립트는 리포지토리에 커밋되는
대상이 아니라, 사용자(운영자)의 구글 계정에 직접 만들어 사용하는 외부 리소스다.**

## 0. 최종 결과물 요약
- 문의가 들어올 때마다 구글 시트에 한 행씩 백업된다.
- 동시에 운영자 이메일로 알림 메일이 발송된다.
- 배포된 웹앱 URL 하나를 로컬 `.env.local`과 Vercel 프로덕션 환경변수에 등록하면 끝.

## 1. 구글 시트 준비
1. [Google Sheets](https://sheets.new)에서 새 스프레드시트를 만든다. 이름은 예: `고방 제휴문의`.
2. 첫 번째 시트(탭 이름은 상관없음, 기본값 `시트1` 그대로 둬도 됨)의 **1행에 헤더**를 아래 순서로 입력한다.

   | A | B | C | D | E | F |
   |---|---|---|---|---|---|
   | 제출일시 | 회사명 | 전화 | 이메일 | 문의유형 | 문의내용 |

   이후 Apps Script가 이 열 순서 그대로 한 행씩 append한다. 열 순서를 바꾸려면 아래 스크립트의
   `sheet.appendRow([...])` 배열 순서도 함께 바꿔야 한다.

## 2. Apps Script 코드 작성
1. 방금 만든 스프레드시트에서 상단 메뉴 **확장 프로그램(Extensions) → Apps Script**를 클릭한다.
2. 기본 생성된 `Code.gs`(또는 `myFunction` 뼈대)의 내용을 전부 지우고 아래 코드를 붙여넣는다.
3. **⚠️ 코드 상단의 `NOTIFY_EMAIL`을 실제 운영자 수신 이메일로 반드시 바꿔야 한다.** 그대로 두면 알림 메일이
   발송되지 않는다(또는 존재하지 않는 주소로 실패한다).

```javascript
/**
 * 고방 링크트리 — 제휴·협력 문의 웹훅
 *
 * Next.js /api/affiliate-inquiries 라우트가 아래 shape의 JSON을 POST로 보낸다:
 *   {
 *     companyName: string,
 *     phone: string | null,
 *     email: string | null,
 *     inquiryType: "ad" | "content" | "other",
 *     message: string,
 *     submittedAt: string   // ISO 8601, 서버(Vercel)가 찍은 접수 시각
 *   }
 */

// ⚠️ 반드시 실제 운영자 이메일로 변경하십시오. 알림을 받을 주소입니다.
const NOTIFY_EMAIL = "YOUR_EMAIL_HERE";

// 문의유형 코드 → 시트/이메일에 표시할 한글 라벨
const INQUIRY_TYPE_LABELS = {
  ad: "광고 문의",
  content: "콘텐츠 제휴",
  other: "기타",
};

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    const companyName = payload.companyName || "";
    const phone = payload.phone || "";
    const email = payload.email || "";
    const inquiryTypeRaw = payload.inquiryType || "";
    const inquiryTypeLabel = INQUIRY_TYPE_LABELS[inquiryTypeRaw] || inquiryTypeRaw || "(미지정)";
    const message = payload.message || "";
    const submittedAt = payload.submittedAt || new Date().toISOString();

    // 1) 시트에 한 행 추가 — 헤더 순서(제출일시/회사명/전화/이메일/문의유형/문의내용)와 동일하게 맞춘다.
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    sheet.appendRow([submittedAt, companyName, phone, email, inquiryTypeLabel, message]);

    // 2) 운영자에게 알림 메일 발송
    const subject = `[고방 링크트리] 새 제휴 문의 - ${companyName} (${inquiryTypeLabel})`;
    const body = [
      "제휴·협력 문의가 새로 접수되었습니다.",
      "",
      `제출일시: ${submittedAt}`,
      `회사명: ${companyName}`,
      `전화: ${phone || "(미입력)"}`,
      `이메일: ${email || "(미입력)"}`,
      `문의유형: ${inquiryTypeLabel}`,
      "",
      "문의내용:",
      message,
    ].join("\n");

    MailApp.sendEmail(NOTIFY_EMAIL, subject, body);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## 3. 웹앱으로 배포
1. Apps Script 편집기 우측 상단의 **배포(Deploy) → 새 배포(New deployment)**를 클릭한다.
2. 배포 유형 선택(톱니바퀴 아이콘)에서 **웹 앱(Web app)**을 고른다.
3. 설정값:
   - **실행 사용자(Execute as)**: **나(Me)** — 스프레드시트/메일 권한을 스크립트 소유자(운영자 본인) 권한으로 실행.
   - **액세스 권한(Who has access)**: **모든 사용자(Anyone)** — Vercel 서버가 로그인 없이 호출할 수 있어야 하므로.
4. **배포**를 클릭하면 최초 1회 권한 승인 화면이 뜬다. 본인 구글 계정으로 승인한다(Gmail/Sheets 접근 권한 요청 —
   본인 스크립트이므로 "안전하지 않음" 경고가 나와도 계속 진행해도 된다).
5. 배포가 끝나면 **웹 앱 URL**이 발급된다. `https://script.google.com/macros/s/AKfycb.../exec` 형태의 이 URL을
   복사해둔다. (코드를 수정한 뒤에는 같은 배포를 덮어쓰지 말고 **배포 → 배포 관리 → 편집 → 새 버전**으로
   갱신하거나, 새 배포를 만들고 아래 4단계에서 URL을 다시 교체한다.)

## 4. 웹앱 URL을 환경변수로 등록
발급받은 URL을 `GAS_AFFILIATE_WEBHOOK_URL` 값으로 아래 두 곳 모두에 등록해야 한다. 하나만 등록하면 로컬 또는
프로덕션 중 한쪽에서만 문의 접수가 동작한다.

### 로컬 (`.env.local`)
리포지토리 루트의 `.env.local`(gitignore됨, 없으면 `.env.example` 참고해 생성)에 아래 줄을 추가/수정한다.

```
GAS_AFFILIATE_WEBHOOK_URL=https://script.google.com/macros/s/여기에발급받은ID/exec
```

`npm run dev`(또는 `시작 3939.bat`)로 로컬 서버를 재시작하면 즉시 적용된다.

### 프로덕션 (Vercel)
1. [Vercel 대시보드](https://vercel.com) → 해당 프로젝트(`gobang-linktree`) → **Settings → Environment
   Variables**로 이동한다.
2. **Key**: `GAS_AFFILIATE_WEBHOOK_URL`, **Value**: 위와 동일한 웹앱 URL을 입력한다.
3. 적용 환경(Environment)은 최소 **Production**을 포함해야 하며, 로컬과 동일하게 테스트하려면
   **Preview**에도 같이 추가해도 된다.
4. **Save**로 저장한다.
5. **⚠️ Vercel 환경변수는 저장만으로 즉시 반영되지 않는다.** 기존에 배포된 서버리스 함수는 예전 환경변수를
   그대로 들고 있으므로, **Deployments 탭에서 최신 배포를 Redeploy**(또는 `main`에 새 커밋을 push)해야
   변경사항이 실제로 적용된다.

## 5. 동작 확인
1. 배포 완료 후 사이트의 "제휴·협력 문의" 버튼을 눌러 아코디언을 펼치고, 폼을 실제로 제출해본다.
   (폼은 렌더된 지 3초 이상 지나야 전송되도록 스팸 방지 딜레이가 걸려 있으므로, 버튼을 누르자마자 바로
   제출하면 서버가 조용히 성공 응답만 하고 실제로는 시트/메일에 아무 기록도 남기지 않는다 — 정상 동작이다.)
2. 스프레드시트에 새 행이 추가됐는지, `NOTIFY_EMAIL`로 알림 메일이 도착했는지 확인한다.
3. 안 되면 Apps Script 편집기의 **실행(Executions)** 로그에서 `doPost` 실행 기록과 에러를 확인한다.
