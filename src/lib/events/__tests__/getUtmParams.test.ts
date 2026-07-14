import { describe, it, expect, afterEach } from "vitest";
import { getUtmParams } from "../getUtmParams";

describe("getUtmParams", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("URL 쿼리스트링의 utm_source/utm_medium/utm_campaign을 읽는다", () => {
    window.history.pushState({}, "", "/?utm_source=insta&utm_medium=social&utm_campaign=summer");
    expect(getUtmParams()).toEqual({
      utm_source: "insta",
      utm_medium: "social",
      utm_campaign: "summer",
    });
  });

  it("쿼리스트링에 없는 항목은 undefined로 반환한다", () => {
    window.history.pushState({}, "", "/?utm_medium=chat");
    expect(getUtmParams()).toEqual({
      utm_source: undefined,
      utm_medium: "chat",
      utm_campaign: undefined,
    });
  });

  it("쿼리스트링이 전혀 없으면 전부 undefined다", () => {
    window.history.pushState({}, "", "/");
    expect(getUtmParams()).toEqual({
      utm_source: undefined,
      utm_medium: undefined,
      utm_campaign: undefined,
    });
  });
});
