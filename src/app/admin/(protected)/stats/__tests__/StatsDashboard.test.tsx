import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { StatsSummary } from "@/lib/stats/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const summaryWithData: StatsSummary = {
  totalPageviews: 42,
  totalClicks: 17,
  clickThroughRate: 40.5,
  pageviewsPeriodOverPeriod: { current: 42, previous: 30, changePercent: 40 },
  clicksByLink: [{ linkId: "home", title: "홈", count: 10 }],
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
  topCampaigns: [{ campaign: "summer-sale", count: 5 }],
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
  dailyTrend: [],
  topReferrers: [],
  topCampaigns: [],
  weekdayDistribution: [],
  capped: false,
};

describe("StatsDashboard", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("KPI·차트를 렌더한다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("instagram.com")).toBeInTheDocument();
  });

  it("클릭률 KPI 카드를 보여준다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    expect(screen.getByText("클릭률")).toBeInTheDocument();
    expect(screen.getByText("40.5%")).toBeInTheDocument();
  });

  it("clickThroughRate가 null이면 클릭률 카드에 대시(-)를 보여준다", async () => {
    const withCtrNull: StatsSummary = { ...summaryWithData, clickThroughRate: null };
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={withCtrNull} />);
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("기간 대비 증감 배지를 화살표+텍스트로 보여준다 (색상만으로 표현하지 않음)", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    expect(screen.getByText(/▲.*40%/)).toBeInTheDocument();
  });

  it("직전 기간 데이터가 없으면(changePercent null) 증감 배지를 표시하지 않는다", async () => {
    const noComparison: StatsSummary = {
      ...summaryWithData,
      pageviewsPeriodOverPeriod: { current: 5, previous: 0, changePercent: null },
    };
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={noComparison} />);
    expect(screen.queryByText(/▲|▼/)).not.toBeInTheDocument();
  });

  it("요일별 방문 분포 섹션을 렌더한다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    expect(screen.getByText("요일별 방문 분포")).toBeInTheDocument();
    expect(screen.getByText("월")).toBeInTheDocument();
    expect(screen.getByText("일")).toBeInTheDocument();
  });

  it("캠페인별 유입 TOP 섹션을 렌더한다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    expect(screen.getByText("캠페인별 유입 TOP")).toBeInTheDocument();
    expect(screen.getByText("summer-sale")).toBeInTheDocument();
  });

  it("캠페인 기록이 없으면 empty message를 보여준다", async () => {
    const noCampaigns: StatsSummary = { ...summaryWithData, topCampaigns: [] };
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={noCampaigns} />);
    expect(screen.getByText("아직 캠페인 유입 기록이 없습니다.")).toBeInTheDocument();
  });

  it("데이터가 전혀 없으면 empty state를 보여준다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={emptySummary} />);
    expect(screen.getByText(/아직 쌓인 통계가 없습니다/)).toBeInTheDocument();
  });

  it("방문 추이 섹션이 summary.dailyTrend 데이터 그대로를 렌더한다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    expect(screen.getByText("방문 추이")).toBeInTheDocument();
    expect(document.querySelectorAll("circle")).toHaveLength(summaryWithData.dailyTrend.length);
  });

  it("초기화 버튼 클릭 시 확인 후 DELETE를 호출하고 router.refresh()를 호출한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    fireEvent.click(screen.getByRole("button", { name: "통계 초기화" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/stats", { method: "DELETE" });
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("확인 다이얼로그를 취소하면 DELETE를 호출하지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    fireEvent.click(screen.getByRole("button", { name: "통계 초기화" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("초기화 요청이 네트워크 오류로 실패하면 에러 메시지를 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    fireEvent.click(screen.getByRole("button", { name: "통계 초기화" }));

    await waitFor(() => {
      expect(
        screen.getByText("통계 초기화 요청에 실패했습니다. 네트워크 상태를 확인해주세요."),
      ).toBeInTheDocument();
    });
  });
});
