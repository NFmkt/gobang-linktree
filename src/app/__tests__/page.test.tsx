import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "../page";

describe("Home page (S0 스모크 테스트)", () => {
  it('브랜드명 "고방"을 렌더한다', () => {
    render(<Home />);
    expect(screen.getByText("고방")).toBeInTheDocument();
  });
});
