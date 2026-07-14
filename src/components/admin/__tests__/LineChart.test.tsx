import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { LineChart, LineChartTooltipContent } from "../LineChart";

/**
 * recharts의 <ResponsiveContainer>는 실제 브라우저에서 ResizeObserver로 부모 요소의
 * 픽셀 크기를 측정해 차트 너비를 정한다. jsdom은 ResizeObserver를 구현하지 않고
 * getBoundingClientRect도 항상 0을 반환하므로, 이 값들을 고정 크기로 모킹해야
 * <ResponsiveContainer>가 렌더를 포기(null 반환)하지 않고 실제 SVG를 그린다.
 * 이 모킹은 이 테스트 파일에만 스코프된다(vitest는 파일 단위로 격리되어 다른
 * 테스트 파일의 전역에는 영향을 주지 않는다).
 */
class MockResizeObserver implements ResizeObserver {
  #callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
  }

  observe(target: Element) {
    this.#callback(
      [{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry],
      this,
    );
  }

  unobserve() {}
  disconnect() {}
}

let originalResizeObserver: typeof ResizeObserver | undefined;
let originalGetBoundingClientRect: typeof Element.prototype.getBoundingClientRect;

beforeAll(() => {
  originalResizeObserver = window.ResizeObserver;
  originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  Element.prototype.getBoundingClientRect = function () {
    return {
      width: 600,
      height: 160,
      top: 0,
      left: 0,
      right: 600,
      bottom: 160,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    };
  };
});

afterAll(() => {
  window.ResizeObserver = originalResizeObserver as typeof ResizeObserver;
  Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
});

describe("LineChart", () => {
  it("포인트가 없으면 emptyMessage를 보여준다", () => {
    render(<LineChart points={[]} emptyMessage="데이터가 없습니다." />);
    expect(screen.getByText("데이터가 없습니다.")).toBeInTheDocument();
  });

  it("포인트가 있으면 접근성을 위한 role=img 컨테이너와 라인을 렌더한다", () => {
    const { container } = render(
      <LineChart
        points={[
          { date: "2026-07-08", count: 1 },
          { date: "2026-07-09", count: 3 },
          { date: "2026-07-10", count: 2 },
        ]}
        emptyMessage="데이터가 없습니다."
      />,
    );
    expect(screen.getByRole("img", { name: "일별 방문 추이" })).toBeInTheDocument();
    expect(container.querySelector(".recharts-line-curve")).toBeInTheDocument();
  });

  it("포인트 개수만큼 dot(원형 마커)을 렌더한다(60개 이하)", () => {
    const { container } = render(
      <LineChart
        points={[
          { date: "2026-07-08", count: 1 },
          { date: "2026-07-09", count: 3 },
          { date: "2026-07-10", count: 2 },
        ]}
        emptyMessage="데이터가 없습니다."
      />,
    );
    const dots = container.querySelectorAll(".recharts-line-dots .recharts-dot");
    expect(dots).toHaveLength(3);
  });

  it("x축에 날짜 라벨(M/D 포맷)을 tick으로 표시한다", () => {
    const { container } = render(
      <LineChart
        points={[
          { date: "2026-07-08", count: 1 },
          { date: "2026-07-09", count: 3 },
          { date: "2026-07-10", count: 2 },
        ]}
        emptyMessage="데이터가 없습니다."
      />,
    );
    const tickTexts = Array.from(
      container.querySelectorAll(".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value"),
    ).map((el) => el.textContent);
    expect(tickTexts).toEqual(["7/8", "7/9", "7/10"]);
  });

  it("포인트가 10개 이하(7일 뷰)면 각 포인트 위에 값을 직접 라벨로 표시한다", () => {
    const { container } = render(
      <LineChart
        points={[
          { date: "2026-07-08", count: 1 },
          { date: "2026-07-09", count: 3 },
          { date: "2026-07-10", count: 2 },
        ]}
        emptyMessage="데이터가 없습니다."
      />,
    );
    const labels = Array.from(container.querySelectorAll(".recharts-label-list text")).map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(["1", "3", "2"]);
  });

  it("포인트가 10개 초과(30일 뷰)면 개별 값 라벨 없이 최고/최근 캡션만 보여준다", () => {
    const points = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      count: i === 14 ? 42 : i + 1,
    }));
    const { container } = render(<LineChart points={points} emptyMessage="데이터가 없습니다." />);
    expect(container.querySelectorAll(".recharts-label-list")).toHaveLength(0);
    expect(screen.getByText(/최고 42/)).toBeInTheDocument();
    expect(screen.getByText(/최근 30/)).toBeInTheDocument();
  });

  it("x축 눈금 개수는 포인트가 많아질수록 성기게 유지된다(라벨 겹침 방지)", () => {
    const points30 = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-07-${String((i % 30) + 1).padStart(2, "0")}`,
      count: i + 1,
    }));
    const points400 = Array.from({ length: 400 }, (_, i) => ({
      date: `point-${i}`,
      count: i % 5,
    }));

    const { container: container30 } = render(
      <LineChart points={points30} emptyMessage="데이터가 없습니다." />,
    );
    const { container: container400 } = render(
      <LineChart points={points400} emptyMessage="데이터가 없습니다." />,
    );

    const ticks30 = container30.querySelectorAll(
      ".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-label",
    );
    const ticks400 = container400.querySelectorAll(
      ".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-label",
    );

    // 30일 뷰든 400개짜리 "전체" 뷰든 눈금 개수가 겹치지 않을 정도로 적게 유지되어야 한다.
    expect(ticks30.length).toBeLessThanOrEqual(10);
    expect(ticks400.length).toBeLessThanOrEqual(10);
  });

  it("포인트가 60개를 초과하면(예: '전체' 프리셋) dot을 전혀 렌더하지 않고 라인과 캡션만 남긴다", () => {
    const points = Array.from({ length: 400 }, (_, i) => ({
      date: `point-${i}`,
      count: i === 200 ? 99 : i % 5,
    }));
    const { container } = render(<LineChart points={points} emptyMessage="데이터가 없습니다." />);
    expect(container.querySelectorAll(".recharts-dot")).toHaveLength(0);
    expect(container.querySelector(".recharts-line-curve")).toBeInTheDocument();
    expect(screen.getByText(/최고 99/)).toBeInTheDocument();
  });

  describe("LineChartTooltipContent", () => {
    it("hover 시(active) 날짜(label)와 값(value)을 표시한다", () => {
      render(
        <LineChartTooltipContent
          active
          label="2026-07-10"
          payload={[
            {
              value: 5,
              dataKey: "count",
              name: "count",
              color: "var(--color-primary)",
              payload: { date: "2026-07-10", count: 5 },
            },
          ]}
        />,
      );
      expect(screen.getByText("2026-07-10")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("active가 false면 아무것도 렌더하지 않는다", () => {
      const { container } = render(
        <LineChartTooltipContent active={false} label="2026-07-10" payload={[]} />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("payload가 비어있으면 아무것도 렌더하지 않는다", () => {
      const { container } = render(<LineChartTooltipContent active label="2026-07-10" payload={[]} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
