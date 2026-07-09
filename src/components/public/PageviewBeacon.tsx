"use client";

import { useEffect } from "react";
import { sendEventBeacon } from "@/lib/events/sendBeacon";

/**
 * 마운트 시 1회 pageview 이벤트를 기록한다. 화면에는 아무것도 렌더하지 않는다.
 */
export function PageviewBeacon() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    sendEventBeacon({
      type: "pageview",
      referrer: document.referrer,
      utm_source: params.get("utm_source") ?? undefined,
      utm_medium: params.get("utm_medium") ?? undefined,
      utm_campaign: params.get("utm_campaign") ?? undefined,
    });
  }, []);

  return null;
}
