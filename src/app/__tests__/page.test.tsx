import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "../page";

// S1b: Home은 async 서버 컴포넌트(getLinks 호출)가 되었다.
// "고방" 브랜드명 렌더 검증은 ProfileHeader 컴포넌트 테스트로 이전했다
// (src/components/public/__tests__/ProfileHeader.test.tsx).
// 여기서는 서버 컴포넌트가 정상적으로 resolve되어 페이지 콘텐츠를
// 렌더하는지(스모크 레벨)만 확인한다.
describe("Home page (S1b 스모크 테스트)", () => {
  it("비동기 서버 컴포넌트를 resolve해서 렌더하면 브랜드명이 포함된다", async () => {
    const ui = await Home();
    render(ui);
    expect(screen.getByText("고방")).toBeInTheDocument();
  });
});
