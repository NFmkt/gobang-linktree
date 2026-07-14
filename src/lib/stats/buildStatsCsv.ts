import type { StatsSummary } from "./types";

/** CSV 필드 하나를 이스케이프한다 (쉼표·따옴표·줄바꿈 포함 시 큰따옴표로 감싼다). */
function csvField(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(fields: (string | number)[]): string {
  return fields.map(csvField).join(",");
}

/** 통계 요약(StatsSummary)을 사람이 읽기 쉬운 다중 섹션 CSV 문자열로 변환한다. */
export function buildStatsCsv(summary: StatsSummary): string {
  const lines: string[] = [];

  lines.push(csvRow(["항목", "값"]));
  lines.push(csvRow(["총 방문수", summary.totalPageviews]));
  lines.push(csvRow(["총 클릭수", summary.totalClicks]));
  lines.push(csvRow(["클릭률(%)", summary.clickThroughRate === null ? "-" : summary.clickThroughRate]));
  lines.push("");

  lines.push("방문 추이");
  lines.push(csvRow(["날짜", "방문수"]));
  for (const point of summary.dailyTrend) {
    lines.push(csvRow([point.date, point.count]));
  }
  lines.push("");

  lines.push("링크별 클릭수");
  lines.push(csvRow(["링크", "클릭수"]));
  for (const item of summary.clicksByLink) {
    lines.push(csvRow([item.title, item.count]));
  }
  lines.push("");

  lines.push("요일별 방문 분포");
  lines.push(csvRow(["요일", "방문수"]));
  for (const item of summary.weekdayDistribution) {
    lines.push(csvRow([item.weekday, item.count]));
  }
  lines.push("");

  lines.push("링크트리 유입 출처");
  lines.push(csvRow(["유입출처", "방문수"]));
  for (const item of summary.topReferrers) {
    lines.push(csvRow([item.source, item.count]));
  }
  lines.push("");

  lines.push("링크별 유입 경로");
  lines.push(csvRow(["링크", "유입 경로", "클릭수"]));
  for (const row of summary.clicksByLinkAndMedium) {
    for (const medium of row.mediums) {
      lines.push(csvRow([row.title, medium.medium, medium.count]));
    }
  }

  return lines.join("\n");
}
