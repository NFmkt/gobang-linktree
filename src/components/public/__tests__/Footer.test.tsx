import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "../Footer";

describe("Footer", () => {
  it("브랜드명을 포함한 저작권 문구를 렌더한다", () => {
    render(<Footer brandName="고방" />);
    expect(screen.getByText(/고방/)).toBeInTheDocument();
    expect(screen.getByText(/©/)).toBeInTheDocument();
  });
});
