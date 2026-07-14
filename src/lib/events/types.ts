/**
 * /api/events로 전송되는 이벤트 페이로드.
 * type이 "click"이면 link_id가 필수, "pageview"면 referrer가 필수이고 utm은 선택.
 */
export type EventPayload =
  | {
      type: "pageview";
      referrer: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    }
  | {
      type: "click";
      link_id: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    };
