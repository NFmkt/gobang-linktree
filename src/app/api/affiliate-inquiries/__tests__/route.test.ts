import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };
const WEBHOOK_URL = "https://script.google.com/macros/s/fake/exec";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/affiliate-inquiries", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    companyName: "고방컴퍼니",
    phone: "010-1234-5678",
    inquiryType: "ad",
    message: "제휴 문의드립니다.",
    honeypot: "",
    formRenderedAt: Date.now() - 5000,
    ...overrides,
  };
}

describe("POST /api/affiliate-inquiries", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, GAS_AFFILIATE_WEBHOOK_URL: WEBHOOK_URL };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("정상 제출은 웹훅을 호출하고 200 { ok: true }를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(WEBHOOK_URL);
    expect(calledInit.method).toBe("POST");
    const sentBody = JSON.parse(calledInit.body);
    expect(sentBody).toMatchObject({
      companyName: "고방컴퍼니",
      phone: "010-1234-5678",
      inquiryType: "ad",
      message: "제휴 문의드립니다.",
    });
  });

  it("companyName이 없으면 400을 반환하고 웹훅을 호출하지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody({ companyName: undefined })));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("inquiryType이 없으면 400을 반환한다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody({ inquiryType: undefined })));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("message가 없으면 400을 반환한다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody({ message: undefined })));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("phone과 email이 둘 다 없으면 400을 반환한다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody({ phone: undefined, email: undefined })));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("email만 있어도(phone 없이) 통과한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(
      makeRequest(validBody({ phone: undefined, email: "biz@example.com" })),
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("phone과 email이 둘 다 있어도 통과하고 둘 다 웹훅 페이로드에 포함된다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(
      makeRequest(validBody({ phone: "010-1234-5678", email: "biz@example.com" })),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, calledInit] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse(calledInit.body);
    expect(sentBody).toMatchObject({
      phone: "010-1234-5678",
      email: "biz@example.com",
    });
  });

  it.each(["content", "other"] as const)(
    "inquiryType이 %s이면 정상 제출로 처리되어 웹훅을 호출한다",
    async (inquiryType) => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      const { POST } = await import("../route");
      const res = await POST(makeRequest(validBody({ inquiryType })));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, calledInit] = fetchMock.mock.calls[0];
      const sentBody = JSON.parse(calledInit.body);
      expect(sentBody).toMatchObject({ inquiryType });
    },
  );

  it("companyName이 200자면(경계값) 통과한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody({ companyName: "가".repeat(200) })));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("companyName이 200자를 초과하면 400을 반환하고 웹훅을 호출하지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody({ companyName: "가".repeat(201) })));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("companyName");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("message가 5000자면(경계값) 통과한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody({ message: "가".repeat(5000) })));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("message가 5000자를 초과하면 400을 반환하고 웹훅을 호출하지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody({ message: "가".repeat(5001) })));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("message");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("inquiryType이 허용값(ad/content/other) 밖이면 400을 반환한다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody({ inquiryType: "bogus" })));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("honeypot이 채워져 있으면 200을 반환하지만 웹훅은 호출하지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody({ honeypot: "im-a-bot" })));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("formRenderedAt이 3초 미만 전이면 200을 반환하지만 웹훅은 호출하지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody({ formRenderedAt: Date.now() - 500 })));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("formRenderedAt이 누락되어 있으면 200을 반환하지만 웹훅은 호출하지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody({ formRenderedAt: undefined })));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("formRenderedAt이 파싱 불가능한 문자열이면 200을 반환하지만 웹훅은 호출하지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody({ formRenderedAt: "not-a-timestamp" })));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("GAS_AFFILIATE_WEBHOOK_URL 환경변수가 없으면 500을 반환한다", async () => {
    delete process.env.GAS_AFFILIATE_WEBHOOK_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody()));

    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("웹훅 fetch가 예외를 던지면 502를 반환한다", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody()));

    expect(res.status).toBe(502);
    consoleErrorSpy.mockRestore();
  });

  it("웹훅 응답이 non-2xx이면 502를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("../route");
    const res = await POST(makeRequest(validBody()));

    expect(res.status).toBe(502);
    consoleErrorSpy.mockRestore();
  });

  it("잘못된 JSON body면 400을 반환한다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../route");
    const res = await POST(makeRequest("not json"));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
