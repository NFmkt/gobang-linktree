import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MediumDonutChart, MediumDonutChartTooltipContent } from "../MediumDonutChart";

/**
 * recharts의 <ResponsiveContainer>는 jsdom에서 ResizeObserver/getBoundingClientRect를
 * 지원하지 않아 실측 크기를 얻지 못하면 렌더를 포기한다. LineChart.test.tsx와 동일한
 * 모킹을 이 파일에도 적용한다(파일 단위 스코프 — 다른 테스트 파일에 영향 없음).
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
      height: 180,
      top: 0,
      left: 0,
      right: 600,
      bottom: 180,
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

describe("MediumDonutChart", () => {
  it("데이터가 없으면 emptyMessage를 보여준다", () => {
    render(<MediumDonutChart data={[]} emptyMessage="아직 클릭 기록이 없습니다." />);
    expect(screen.getByText("아직 클릭 기록이 없습니다.")).toBeInTheDocument();
  });

  it("데이터가 있으면 접근성을 위한 role=img 컨테이너와 도넛(innerRadius) 슬라이스를 렌더한다", () => {
    const { container } = render(
      <MediumDonutChart
        data={[
          { medium: "social", count: 2 },
          { medium: "email", count: 1 },
        ]}
        emptyMessage="아직 클릭 기록이 없습니다."
      />,
    );
    expect(screen.getByRole("img", { name: "유입 경로별 비중" })).toBeInTheDocument();
    const sectors = container.querySelectorAll(".recharts-pie-sector");
    expect(sectors).toHaveLength(2);
  });

  it("항목마다 medium 라벨과 비중(%)을 범례로 표시한다", () => {
    render(
      <MediumDonutChart
        data={[
          { medium: "social", count: 3 },
          { medium: "미지정", count: 1 },
        ]}
        emptyMessage="아직 클릭 기록이 없습니다."
      />,
    );
    expect(screen.getByText("social")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("미지정")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("슬라이스가 여러 개여도 서로 다른 항목마다 유일한 key(중복 라벨이어도 안전)를 사용한다", () => {
    // "미지정"처럼 여러 링크에서 합산된 라벨이 하나뿐이므로 medium 자체가 이미 유일한 키다.
    const { container } = render(
      <MediumDonutChart
        data={[
          { medium: "social", count: 1 },
          { medium: "email", count: 1 },
          { medium: "미지정", count: 1 },
        ]}
        emptyMessage="아직 클릭 기록이 없습니다."
      />,
    );
    expect(container.querySelectorAll(".recharts-pie-sector")).toHaveLength(3);
  });

  describe("MediumDonutChartTooltipContent", () => {
    it("hover 시(active) medium 이름과 값을 표시한다", () => {
      render(
        <MediumDonutChartTooltipContent
          active
          label="social"
          coordinate={{ x: 0, y: 0 }}
          accessibilityLayer={false}
          activeIndex={null}
          payload={[
            {
              value: 2,
              dataKey: "count",
              name: "social",
              color: "var(--color-primary)",
              payload: { medium: "social", count: 2 },
              graphicalItemId: "count",
            },
          ]}
        />,
      );
      expect(screen.getByText("social")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("active가 false면 아무것도 렌더하지 않는다", () => {
      const { container } = render(
        <MediumDonutChartTooltipContent
          active={false}
          label="social"
          payload={[]}
          coordinate={{ x: 0, y: 0 }}
          accessibilityLayer={false}
          activeIndex={null}
        />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("payload가 비어있으면 아무것도 렌더하지 않는다", () => {
      const { container } = render(
        <MediumDonutChartTooltipContent
          active
          label="social"
          payload={[]}
          coordinate={{ x: 0, y: 0 }}
          accessibilityLayer={false}
          activeIndex={null}
        />,
      );
      expect(container).toBeEmptyDOMElement();
    });
  });
});
