import { describe, it, expect } from "vitest";
import { isSafeLinkUrl } from "../isSafeLinkUrl";

describe("isSafeLinkUrl", () => {
  it("http/https/mailto URL은 안전하다고 판단한다", () => {
    expect(isSafeLinkUrl("https://gobang.kr/youth")).toBe(true);
    expect(isSafeLinkUrl("http://example.com")).toBe(true);
    expect(isSafeLinkUrl("mailto:hi@example.com")).toBe(true);
  });

  it("javascript: 스킴은 안전하지 않다고 판단한다", () => {
    expect(isSafeLinkUrl("javascript:alert(1)")).toBe(false);
  });

  it("data: 스킴은 안전하지 않다고 판단한다", () => {
    expect(isSafeLinkUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("파싱 불가능한 문자열은 안전하지 않다고 판단한다", () => {
    expect(isSafeLinkUrl("not a url")).toBe(false);
  });
});
