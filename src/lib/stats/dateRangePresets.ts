/**
 * B3 — 통계 대시보드의 날짜 범위 프리셋/커스텀 범위 계산 순수 함수.
 *
 * 모든 프리셋과 커스텀 범위는 일관된 UTC 날짜 경계 규칙을 따른다(task-B3-brief.md 참고):
 * - from: 선택한 시작일의 UTC 자정(00:00:00.000Z)
 * - to: 선택한 종료일의 UTC 하루 끝(23:59:59.999Z) — "오늘"이 종료일이어도 "지금 이 순간"이
 *   아니라 항상 오늘의 UTC 하루 끝을 보낸다(프리셋마다 다른 "현재 시각" 로직이 섞이는 실수 방지).
 */

export type DatePreset = "today" | "7d" | "30d" | "thisMonth" | "lastMonth" | "all";

export type DateRange = {
  from: Date;
  to: Date;
};

/** 실제 서비스 시작보다 훨씬 이전인 고정 시점. "전체" 프리셋의 from으로 사용. */
const ALL_TIME_START = new Date("2000-01-01T00:00:00.000Z");

function startOfUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function addUTCDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** 프리셋과 기준 시각(now)으로부터 [from, to] UTC 날짜 경계를 계산한다. */
export function computePresetRange(preset: DatePreset, now: Date): DateRange {
  const to = endOfUTCDay(now);

  switch (preset) {
    case "today":
      return { from: startOfUTCDay(now), to };
    case "7d":
      return { from: startOfUTCDay(addUTCDays(now, -6)), to };
    case "30d":
      return { from: startOfUTCDay(addUTCDays(now, -29)), to };
    case "thisMonth":
      return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)), to };
    case "lastMonth": {
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
      // Date.UTC(y, m, 0)은 m월의 "0일" = (m-1)월의 마지막 날로 정규화된다.
      const lastDayOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
      return { from, to: endOfUTCDay(lastDayOfPrevMonth) };
    }
    case "all":
      return { from: ALL_TIME_START, to };
    default: {
      const exhaustiveCheck: never = preset;
      throw new Error(`알 수 없는 프리셋: ${String(exhaustiveCheck)}`);
    }
  }
}

/**
 * 커스텀 시작~종료일(YYYY-MM-DD, `<input type="date">` 값)로부터 [from, to] UTC 날짜 경계를 계산한다.
 * 위와 동일한 규칙: from=시작일 UTC 자정, to=종료일 UTC 하루 끝.
 */
export function computeCustomRange(startDateStr: string, endDateStr: string): DateRange {
  const from = startOfUTCDay(new Date(`${startDateStr}T00:00:00.000Z`));
  const to = endOfUTCDay(new Date(`${endDateStr}T00:00:00.000Z`));
  return { from, to };
}
