import { describe, it, expect } from "vitest";
import { computeCustomRange, computePresetRange } from "../dateRangePresets";

// 기준 시각: 2026-07-10(금) 15:30 UTC. "지금 이 순간"이 아니라 그 날의 UTC 하루 끝을 to로 써야 한다.
const NOW = new Date("2026-07-10T15:30:00.000Z");

describe("computePresetRange", () => {
  it("오늘: from/to 모두 오늘 UTC 날짜 경계", () => {
    const { from, to } = computePresetRange("today", NOW);
    expect(from.toISOString()).toBe("2026-07-10T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-07-10T23:59:59.999Z");
  });

  it("7일: from은 오늘-6일 00:00:00.000Z, to는 오늘 23:59:59.999Z", () => {
    const { from, to } = computePresetRange("7d", NOW);
    expect(from.toISOString()).toBe("2026-07-04T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-07-10T23:59:59.999Z");
  });

  it("30일: from은 오늘-29일 00:00:00.000Z, to는 오늘 23:59:59.999Z", () => {
    const { from, to } = computePresetRange("30d", NOW);
    expect(from.toISOString()).toBe("2026-06-11T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-07-10T23:59:59.999Z");
  });

  it("이번달: from은 이번 달 1일 00:00:00.000Z, to는 오늘 23:59:59.999Z", () => {
    const { from, to } = computePresetRange("thisMonth", NOW);
    expect(from.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-07-10T23:59:59.999Z");
  });

  it("지난달: from/to 모두 지난달 범위(1일 00:00:00.000Z ~ 마지막날 23:59:59.999Z)", () => {
    const { from, to } = computePresetRange("lastMonth", NOW);
    expect(from.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-06-30T23:59:59.999Z");
  });

  it("지난달: 1월 기준이면 전년도 12월로 넘어간다(연도 경계)", () => {
    const januaryNow = new Date("2026-01-15T09:00:00.000Z");
    const { from, to } = computePresetRange("lastMonth", januaryNow);
    expect(from.toISOString()).toBe("2025-12-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2025-12-31T23:59:59.999Z");
  });

  it("전체: from은 충분히 과거의 고정 시점, to는 오늘 23:59:59.999Z", () => {
    const { from, to } = computePresetRange("all", NOW);
    expect(from.getTime()).toBeLessThan(new Date("2020-01-01T00:00:00.000Z").getTime());
    expect(to.toISOString()).toBe("2026-07-10T23:59:59.999Z");
  });

  it("7일: 월 경계를 넘어가도 정확히 계산된다", () => {
    const monthBoundaryNow = new Date("2026-08-02T00:00:00.000Z");
    const { from } = computePresetRange("7d", monthBoundaryNow);
    expect(from.toISOString()).toBe("2026-07-27T00:00:00.000Z");
  });
});

describe("computeCustomRange", () => {
  it("시작일 00:00:00.000Z ~ 종료일 23:59:59.999Z로 계산한다", () => {
    const { from, to } = computeCustomRange("2026-06-01", "2026-06-15");
    expect(from.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-06-15T23:59:59.999Z");
  });

  it("시작일과 종료일이 같으면 하루 범위를 계산한다", () => {
    const { from, to } = computeCustomRange("2026-06-01", "2026-06-01");
    expect(from.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-06-01T23:59:59.999Z");
  });
});
