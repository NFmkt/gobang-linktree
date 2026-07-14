"use client";

import { useEffect } from "react";
import { sendEventBeacon } from "@/lib/events/sendBeacon";
import { getUtmParams } from "@/lib/events/getUtmParams";

/**
 * 마운트 시 1회 pageview 이벤트를 기록한다. 화면에는 아무것도 렌더하지 않는다.
 */
export function PageviewBeacon() {
  useEffect(() => {
    sendEventBeacon({
      type: "pageview",
      referrer: document.referrer,
      ...getUtmParams(),
    });
  }, []);

  return null;
}
