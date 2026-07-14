import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LinkMediumTable } from "../LinkMediumTable";

describe("LinkMediumTable", () => {
  it("행이 없으면 emptyMessage를 보여준다", () => {
    render(<LinkMediumTable rows={[]} emptyMessage="아직 데이터가 없습니다." />);
    expect(screen.getByText("아직 데이터가 없습니다.")).toBeInTheDocument();
  });

  it("링크별 유입 경로와 클릭수를 렌더한다", () => {
    render(
      <LinkMediumTable
        rows={[
          {
            linkId: "home",
            title: "홈",
            total: 3,
            mediums: [
              { medium: "social", count: 2 },
              { medium: "email", count: 1 },
            ],
          },
        ]}
        emptyMessage="아직 데이터가 없습니다."
      />,
    );
    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("social")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("같은 링크의 두 번째 이후 행에는 링크 제목을 반복하지 않는다", () => {
    render(
      <LinkMediumTable
        rows={[
          {
            linkId: "home",
            title: "홈",
            total: 2,
            mediums: [
              { medium: "social", count: 1 },
              { medium: "email", count: 1 },
            ],
          },
        ]}
        emptyMessage="아직 데이터가 없습니다."
      />,
    );
    expect(screen.getAllByText("홈")).toHaveLength(1);
  });
});
