import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { StatsSummary } from "@/lib/stats/types";
import { computePresetRange } from "@/lib/stats/dateRangePresets";

const summaryWithData: StatsSummary = {
  totalPageviews: 42,
  totalClicks: 17,
  clickThroughRate: 40.5,
  pageviewsPeriodOverPeriod: { current: 42, previous: 30, changePercent: 40 },
  clicksByLink: [{ linkId: "home", title: "홈", count: 10 }],
  clicksByLinkAndMedium: [
    { linkId: "home", title: "홈", total: 10, mediums: [{ medium: "social", count: 10 }] },
  ],
  dailyTrend: [
    { date: "2026-07-04", count: 1 },
    { date: "2026-07-05", count: 2 },
    { date: "2026-07-06", count: 3 },
    { date: "2026-07-07", count: 4 },
    { date: "2026-07-08", count: 5 },
    { date: "2026-07-09", count: 6 },
    { date: "2026-07-10", count: 7 },
  ],
  topReferrers: [{ source: "instagram.com", count: 20 }],
  weekdayDistribution: [
    { weekday: "월", count: 5 },
    { weekday: "화", count: 3 },
    { weekday: "수", count: 4 },
    { weekday: "목", count: 2 },
    { weekday: "금", count: 6 },
    { weekday: "토", count: 8 },
    { weekday: "일", count: 1 },
  ],
  capped: false,
};

const emptySummary: StatsSummary = {
  totalPageviews: 0,
  totalClicks: 0,
  clickThroughRate: null,
  pageviewsPeriodOverPeriod: { current: 0, previous: 0, changePercent: null },
  clicksByLink: [],
  clicksByLinkAndMedium: [],
  dailyTrend: [],
  topReferrers: [],
  weekdayDistribution: [],
  capped: false,
};

const cappedSummary: StatsSummary = { ...summaryWithData, capped: true };

const defaultProps = {
  summary: summaryWithData,
  initialPreset: "7d" as const,
  initialFrom: "2026-07-04T00:00:00.000Z",
  initialTo: "2026-07-10T23:59:59.999Z",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function expectedStatsUrl(from: Date, to: Date): string {
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  return `/api/admin/stats?${params.toString()}`;
}

describe("StatsDashboard", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("KPI·차트를 렌더한다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getAllByText("홈").length).toBeGreaterThan(0);
    expect(screen.getByText("instagram.com")).toBeInTheDocument();
  });

  it("CSV 다운로드 버튼 클릭 시 통계 CSV를 담은 Blob으로 다운로드를 트리거한다", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "CSV 다운로드" }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/csv;charset=utf-8;");
    const text = await blob.text();
    expect(text).toContain("총 방문수,42");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("데이터가 전혀 없으면 CSV 다운로드 버튼이 비활성화된다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} summary={emptySummary} />);
    expect(screen.getByRole("button", { name: "CSV 다운로드" })).toBeDisabled();
  });

  it("클릭률 KPI 카드를 보여준다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    expect(screen.getByText("클릭률")).toBeInTheDocument();
    expect(screen.getByText("40.5%")).toBeInTheDocument();
  });

  it("clickThroughRate가 null이면 클릭률 카드에 대시(-)를 보여준다", async () => {
    const withCtrNull: StatsSummary = { ...summaryWithData, clickThroughRate: null };
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} summary={withCtrNull} />);
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("기간 대비 증감 배지를 화살표+텍스트로 보여준다 (색상만으로 표현하지 않음)", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    expect(screen.getByText(/▲.*40%/)).toBeInTheDocument();
  });

  it("직전 기간 데이터가 없으면(changePercent null) 증감 배지를 표시하지 않는다", async () => {
    const noComparison: StatsSummary = {
      ...summaryWithData,
      pageviewsPeriodOverPeriod: { current: 5, previous: 0, changePercent: null },
    };
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} summary={noComparison} />);
    expect(screen.queryByText(/▲|▼/)).not.toBeInTheDocument();
  });

  it("요일별 방문 분포 섹션을 렌더한다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    expect(screen.getByText("요일별 방문 분포")).toBeInTheDocument();
    expect(screen.getByText("월")).toBeInTheDocument();
    expect(screen.getByText("일")).toBeInTheDocument();
  });

  it("링크별 유입 경로 섹션을 렌더한다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    expect(screen.getByText("링크별 유입 경로")).toBeInTheDocument();
    expect(screen.getByText("social")).toBeInTheDocument();
  });

  it("유입 경로 기록이 없으면 empty message를 보여준다", async () => {
    const noMediums: StatsSummary = { ...summaryWithData, clicksByLinkAndMedium: [] };
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} summary={noMediums} />);
    expect(screen.getByText("아직 클릭 기록이 없습니다.")).toBeInTheDocument();
  });

  it("데이터가 전혀 없으면 empty state를 보여준다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} summary={emptySummary} />);
    expect(screen.getByText(/아직 쌓인 통계가 없습니다/)).toBeInTheDocument();
  });

  it("방문 추이 섹션이 summary.dailyTrend 데이터 그대로를 렌더한다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    expect(screen.getByText("방문 추이")).toBeInTheDocument();
    expect(document.querySelectorAll("circle")).toHaveLength(summaryWithData.dailyTrend.length);
  });

  it("초기 진입 시 '7일' 프리셋 버튼이 선택 상태(aria-pressed)로 표시된다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    expect(screen.getByRole("button", { name: "7일" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "오늘" })).toHaveAttribute("aria-pressed", "false");
  });

  it("초기 진입 시 재조회 없이 서버에서 내려온 초기 summary를 그대로 렌더한다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("'오늘' 프리셋 클릭 시 올바른 from/to로 재조회한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(summaryWithData));
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "오늘" }));

    const { from, to } = computePresetRange("today", new Date());
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expectedStatsUrl(from, to));
    });
  });

  it("'30일' 프리셋 클릭 시 올바른 from/to로 재조회한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(summaryWithData));
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "30일" }));

    const { from, to } = computePresetRange("30d", new Date());
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expectedStatsUrl(from, to));
    });
  });

  it("프리셋 재조회 응답을 화면에 반영한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ ...summaryWithData, totalPageviews: 999 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "이번달" }));

    await waitFor(() => {
      expect(screen.getByText("999")).toBeInTheDocument();
    });
  });

  it("재조회 중 로딩 상태를 표시한다", async () => {
    let resolveFetch: (value: Response) => void = () => {};
    const fetchMock = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "이번달" }));

    await waitFor(() => {
      expect(screen.getByTestId("stats-loading")).toBeInTheDocument();
    });

    resolveFetch(jsonResponse(summaryWithData));
    await waitFor(() => {
      expect(screen.queryByTestId("stats-loading")).not.toBeInTheDocument();
    });
  });

  it("응답의 capped:true면 경고 배너를 표시한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(cappedSummary));
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "전체" }));

    await waitFor(() => {
      expect(screen.getByText("선택한 기간 중 일부만 집계되었을 수 있음")).toBeInTheDocument();
    });
  });

  it("초기 summary가 capped:false면 경고 배너를 표시하지 않는다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    expect(screen.queryByText("선택한 기간 중 일부만 집계되었을 수 있음")).not.toBeInTheDocument();
  });

  it("400 에러 응답 시 에러 메시지를 표시한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "from은 to보다 이후일 수 없습니다" }, 400));
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "지난달" }));

    await waitFor(() => {
      expect(screen.getByText("from은 to보다 이후일 수 없습니다")).toBeInTheDocument();
    });
  });

  it("커스텀 시작~종료일을 지정하고 적용하면 올바른 from/to로 재조회한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(summaryWithData));
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-06-01" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-06-15" } });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expectedStatsUrl(new Date("2026-06-01T00:00:00.000Z"), new Date("2026-06-15T23:59:59.999Z")),
      );
    });
  });

  it("커스텀 범위 시작일이 종료일보다 늦으면 요청 없이 안내 문구를 보여준다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-06-20" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));

    expect(screen.getByText(/시작일은 종료일보다 늦을 수 없습니다/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("초기화 버튼 클릭 시 확인 후 DELETE를 호출하고 현재 선택된 범위로 재조회한다(서버 기본값으로 리셋되지 않음)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse(emptySummary));
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);

    // 먼저 "이번달" 프리셋으로 전환
    const monthFetchMock = vi.fn().mockResolvedValue(jsonResponse({ ...summaryWithData, totalPageviews: 321 }));
    vi.stubGlobal("fetch", monthFetchMock);
    fireEvent.click(screen.getByRole("button", { name: "이번달" }));
    await waitFor(() => {
      expect(screen.getByText("321")).toBeInTheDocument();
    });

    // 그 다음 초기화 실행 — router.refresh()가 아니라 "이번달" 범위로 재조회해야 한다
    const resetFetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse(emptySummary));
    vi.stubGlobal("fetch", resetFetchMock);
    fireEvent.click(screen.getByRole("button", { name: "통계 초기화" }));

    await waitFor(() => {
      expect(resetFetchMock).toHaveBeenNthCalledWith(1, "/api/admin/stats", { method: "DELETE" });
    });
    await waitFor(() => {
      expect(resetFetchMock.mock.calls[1][0]).toMatch(/^\/api\/admin\/stats\?from=/);
    });
    await waitFor(() => {
      expect(screen.getByText(/아직 쌓인 통계가 없습니다/)).toBeInTheDocument();
    });
  });

  it("확인 다이얼로그를 취소하면 DELETE를 호출하지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "통계 초기화" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("초기화 요청이 네트워크 오류로 실패하면 에러 메시지를 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "통계 초기화" }));

    await waitFor(() => {
      expect(
        screen.getByText("통계 초기화 요청에 실패했습니다. 네트워크 상태를 확인해주세요."),
      ).toBeInTheDocument();
    });
  });

  it("초기화 응답이 실패(non-2xx)면 에러 메시지를 보여주고 재조회하지 않는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "통계 초기화" }));

    await waitFor(() => {
      expect(screen.getByText("통계 초기화에 실패했습니다.")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
