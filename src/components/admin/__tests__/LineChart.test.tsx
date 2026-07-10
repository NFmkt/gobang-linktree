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
});
