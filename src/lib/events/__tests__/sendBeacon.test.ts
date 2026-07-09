import { describe, it, expect, vi, afterEach } from "vitest";
import { sendEventBeacon } from "../sendBeacon";

describe("sendEventBeacon", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("navigator.sendBeacon이 있으면 이를 사용해 /api/events로 전송한다", () => {
    const sendBeaconMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { sendBeacon: sendBeaconMock });

    sendEventBeacon({ type: "click", link_id: "youth" });

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeaconMock.mock.calls[0];
    expect(url).toBe("/api/events");
    expect(blob).toBeInstanceOf(Blob);
  });

  it("navigator.sendBeacon이 없으면 keepalive fetch로 폴백한다", () => {
    vi.stubGlobal("navigator", {});
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    sendEventBeacon({ type: "pageview", referrer: "https://ref.test" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/events");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    });
    expect(JSON.parse(init.body as string)).toEqual({
      type: "pageview",
      referrer: "https://ref.test",
    });
  });
});
