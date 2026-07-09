import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { PageviewBeacon } from "../PageviewBeacon";
import { sendEventBeacon } from "@/lib/events/sendBeacon";

vi.mock("@/lib/events/sendBeacon", () => ({
  sendEventBeacon: vi.fn(),
}));

describe("PageviewBeacon", () => {
  const originalReferrer = document.referrer;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, "referrer", {
      value: "https://ref.test/",
      configurable: true,
    });
    window.history.pushState({}, "", "/?utm_source=kakao&utm_medium=chat");
  });

  afterEach(() => {
    Object.defineProperty(document, "referrer", {
      value: originalReferrer,
      configurable: true,
    });
    window.history.pushState({}, "", "/");
  });

  it("마운트 시 referrer와 utm 파라미터를 담아 pageview 이벤트를 1회 전송한다", () => {
    render(<PageviewBeacon />);

    expect(sendEventBeacon).toHaveBeenCalledTimes(1);
    expect(sendEventBeacon).toHaveBeenCalledWith({
      type: "pageview",
      referrer: "https://ref.test/",
      utm_source: "kakao",
      utm_medium: "chat",
      utm_campaign: undefined,
    });
  });

  it("아무 것도 화면에 렌더하지 않는다", () => {
    const { container } = render(<PageviewBeacon />);
    expect(container).toBeEmptyDOMElement();
  });
});
