import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BarChart } from "../BarChart";

describe("BarChart", () => {
  it("항목이 없으면 emptyMessage를 보여준다", () => {
    render(<BarChart items={[]} emptyMessage="데이터가 없습니다." />);
    expect(screen.getByText("데이터가 없습니다.")).toBeInTheDocument();
  });

  it("항목의 라벨과 값을 렌더한다", () => {
    render(
      <BarChart
        items={[
          { label: "홈", value: 10 },
          { label: "블로그", value: 5 },
        ]}
        emptyMessage="데이터가 없습니다."
      />,
    );
    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("블로그")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("최댓값 항목의 막대는 100% 너비를 갖는다", () => {
    render(
      <BarChart
        items={[
          { label: "홈", value: 10 },
          { label: "블로그", value: 5 },
        ]}
        emptyMessage="데이터가 없습니다."
      />,
    );
    const bars = document.querySelectorAll("[data-bar-fill]");
    expect(bars[0]).toHaveStyle({ width: "100%" });
    expect(bars[1]).toHaveStyle({ width: "50%" });
  });
});
