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
  clicksByLink: [{ linkId: "home", title: "홈", count: 10 }],
  dailyTrend7: [
    { date: "2026-07-04", count: 1 },
    { date: "2026-07-05", count: 2 },
    { date: "2026-07-06", count: 3 },
    { date: "2026-07-07", count: 4 },
    { date: "2026-07-08", count: 5 },
    { date: "2026-07-09", count: 6 },
    { date: "2026-07-10", count: 7 },
  ],
  dailyTrend30: Array.from({ length: 30 }, (_, i) => ({ date: `2026-06-${i + 1}`, count: i })),
  topReferrers: [{ source: "instagram.com", count: 20 }],
};

const emptySummary: StatsSummary = {
  totalPageviews: 0,
  totalClicks: 0,
  clicksByLink: [],
  dailyTrend7: [],
  dailyTrend30: [],
  topReferrers: [],
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

  it("데이터가 전혀 없으면 empty state를 보여준다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={emptySummary} />);
    expect(screen.getByText(/아직 쌓인 통계가 없습니다/)).toBeInTheDocument();
  });

  it("7일/30일 토글 버튼으로 추이 데이터를 전환한다", async () => {
    const { StatsDashboard } = await import("../StatsDashboard");
    render(<StatsDashboard summary={summaryWithData} />);
    const svgBefore = document.querySelectorAll("circle");
    expect(svgBefore).toHaveLength(7);

    fireEvent.click(screen.getByRole("button", { name: "30일" }));
    const svgAfter = document.querySelectorAll("circle");
    expect(svgAfter).toHaveLength(30);
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
