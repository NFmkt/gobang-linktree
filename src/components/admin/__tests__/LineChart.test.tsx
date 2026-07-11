import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LineChart } from "../LineChart";

describe("LineChart", () => {
  it("포인트가 없으면 emptyMessage를 보여준다", () => {
    render(<LineChart points={[]} emptyMessage="데이터가 없습니다." />);
    expect(screen.getByText("데이터가 없습니다.")).toBeInTheDocument();
  });

  it("포인트 개수만큼 원(circle)을 렌더한다", () => {
    render(
      <LineChart
        points={[
          { date: "2026-07-08", count: 1 },
          { date: "2026-07-09", count: 3 },
          { date: "2026-07-10", count: 2 },
        ]}
        emptyMessage="데이터가 없습니다."
      />,
    );
    const circles = document.querySelectorAll("circle");
    expect(circles).toHaveLength(3);
  });

  it("접근성을 위한 aria-label을 가진 svg를 렌더한다", () => {
    render(
      <LineChart points={[{ date: "2026-07-10", count: 1 }]} emptyMessage="데이터가 없습니다." />,
    );
    expect(screen.getByRole("img", { name: "일별 방문 추이" })).toBeInTheDocument();
  });

  it("포인트가 10개 이하(7일 뷰)면 각 포인트 위에 값을 직접 라벨로 표시한다", () => {
    render(
      <LineChart
        points={[
          { date: "2026-07-08", count: 1 },
          { date: "2026-07-09", count: 3 },
          { date: "2026-07-10", count: 2 },
        ]}
        emptyMessage="데이터가 없습니다."
      />,
    );
    const labels = document.querySelectorAll("svg text");
    expect(labels).toHaveLength(3);
    expect(Array.from(labels).map((el) => el.textContent)).toEqual(["1", "3", "2"]);
  });

  it("포인트가 10개 초과(30일 뷰)면 개별 라벨 없이 최고/최근 캡션만 보여준다", () => {
    const points = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      count: i === 14 ? 42 : i + 1,
    }));
    render(<LineChart points={points} emptyMessage="데이터가 없습니다." />);
    expect(document.querySelectorAll("svg text")).toHaveLength(0);
    expect(screen.getByText(/최고 42/)).toBeInTheDocument();
    expect(screen.getByText(/최근 30/)).toBeInTheDocument();
  });

  it("포인트가 60개를 초과하면(예: '전체' 프리셋) circle을 전혀 렌더하지 않고 폴리라인과 캡션만 남긴다", () => {
    const points = Array.from({ length: 400 }, (_, i) => ({
      date: `point-${i}`,
      count: i === 200 ? 99 : i % 5,
    }));
    render(<LineChart points={points} emptyMessage="데이터가 없습니다." />);
    expect(document.querySelectorAll("circle")).toHaveLength(0);
    expect(document.querySelector("polyline")).toBeInTheDocument();
    expect(screen.getByText(/최고 99/)).toBeInTheDocument();
  });

  it("각 포인트의 circle에 날짜·값을 담은 title(툴팁)이 있다", () => {
    render(
      <LineChart
        points={[{ date: "2026-07-10", count: 5 }]}
        emptyMessage="데이터가 없습니다."
      />,
    );
    const title = document.querySelector("circle title");
    expect(title?.textContent).toBe("2026-07-10: 5");
  });
});
