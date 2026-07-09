import type { EventPayload } from "./types";

const EVENTS_ENDPOINT = "/api/events";

/**
 * 이벤트를 백그라운드로 전송한다. navigator.sendBeacon을 우선 쓰고,
 * 지원하지 않는 환경에서는 keepalive fetch로 폴백한다.
 * 전송 실패는 사용자 흐름(내비게이션)을 막지 않도록 조용히 무시한다.
 */
export function sendEventBeacon(payload: EventPayload): void {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(EVENTS_ENDPOINT, blob);
    return;
  }

  if (typeof fetch === "function") {
    fetch(EVENTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // 집계 실패는 무시 — 사용자 내비게이션을 막지 않는다.
    });
  }
}
