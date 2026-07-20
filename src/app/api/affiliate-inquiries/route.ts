import { NextResponse } from "next/server";

type AffiliateInquiryBody = {
  companyName?: string;
  phone?: string;
  email?: string;
  inquiryType?: string;
  message?: string;
  honeypot?: string;
  formRenderedAt?: string | number;
};

const VALID_INQUIRY_TYPES = new Set(["ad", "content", "other"]);
const MIN_SUBMIT_DELAY_MS = 3000;
const MAX_COMPANY_NAME_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

/**
 * `formRenderedAt`은 폼이 화면에 렌더된 시각(ISO 문자열 또는 epoch ms)이다.
 * 값이 없거나 파싱할 수 없으면 스팸 방지 타이밍 검증을 통과시키지 않기 위해
 * null을 반환한다(누락 시 타이밍 체크를 우회할 수 없도록).
 */
function parseFormRenderedAt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? numeric : null;
    }
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export async function POST(request: Request) {
  let body: AffiliateInquiryBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  // 스팸 방지: 허니팟 필드에 값이 채워지면 성공처럼 조용히 응답하고 웹훅은 호출하지 않는다.
  if (body.honeypot) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // 스팸 방지: 폼이 렌더된 지 3초 미만이면(또는 시각을 알 수 없으면) 성공처럼 조용히 응답하고
  // 웹훅은 호출하지 않는다.
  const renderedAt = parseFormRenderedAt(body.formRenderedAt);
  if (renderedAt === null || Date.now() - renderedAt < MIN_SUBMIT_DELAY_MS) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!body.companyName || !body.inquiryType || !body.message) {
    return NextResponse.json(
      { error: "companyName, inquiryType, message는 필수입니다" },
      { status: 400 },
    );
  }

  if (!body.phone && !body.email) {
    return NextResponse.json(
      { error: "phone 또는 email 중 최소 1개는 필수입니다" },
      { status: 400 },
    );
  }

  if (body.companyName.length > MAX_COMPANY_NAME_LENGTH) {
    return NextResponse.json(
      { error: `companyName은 ${MAX_COMPANY_NAME_LENGTH}자를 초과할 수 없습니다` },
      { status: 400 },
    );
  }

  if (body.message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `message는 ${MAX_MESSAGE_LENGTH}자를 초과할 수 없습니다` },
      { status: 400 },
    );
  }

  if (!VALID_INQUIRY_TYPES.has(body.inquiryType)) {
    return NextResponse.json(
      { error: "inquiryType은 ad, content, other 중 하나여야 합니다" },
      { status: 400 },
    );
  }

  const webhookUrl = process.env.GAS_AFFILIATE_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("GAS_AFFILIATE_WEBHOOK_URL 환경변수가 설정되지 않았습니다");
    return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
  }

  try {
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: body.companyName,
        phone: body.phone ?? null,
        email: body.email ?? null,
        inquiryType: body.inquiryType,
        message: body.message,
        submittedAt: new Date().toISOString(),
      }),
    });

    if (!webhookResponse.ok) {
      console.error(`제휴 문의 웹훅 응답 실패: ${webhookResponse.status}`);
      return NextResponse.json({ error: "웹훅 전달에 실패했습니다" }, { status: 502 });
    }
  } catch (err) {
    console.error("제휴 문의 웹훅 호출 중 오류", err);
    return NextResponse.json({ error: "웹훅 전달에 실패했습니다" }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
