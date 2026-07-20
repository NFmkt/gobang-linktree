import { describe, it, expect } from "vitest";
import { formatPhoneNumber } from "../formatPhoneNumber";

describe("formatPhoneNumber", () => {
  it("휴대폰 번호(11자리)를 3-4-4로 하이픈 처리한다", () => {
    expect(formatPhoneNumber("01000000000")).toBe("010-0000-0000");
  });

  it("입력 중간(자릿수가 덜 채워진 상태)에도 자연스럽게 하이픈을 붙인다", () => {
    expect(formatPhoneNumber("010")).toBe("010");
    expect(formatPhoneNumber("0100")).toBe("010-0");
    expect(formatPhoneNumber("01012")).toBe("010-12");
    expect(formatPhoneNumber("0101234")).toBe("010-1234");
    expect(formatPhoneNumber("01012345")).toBe("010-1234-5");
  });

  it("지역번호(3자리)도 동일한 규칙으로 처리한다", () => {
    expect(formatPhoneNumber("0311234567")).toBe("031-1234-567");
  });

  it("서울(02) 지역번호는 2자리 국번으로 처리한다", () => {
    expect(formatPhoneNumber("0212345678")).toBe("02-1234-5678");
    expect(formatPhoneNumber("021234567")).toBe("02-1234-567");
  });

  it("숫자가 아닌 문자(하이픈, 공백 등)는 무시하고 다시 포맷한다", () => {
    expect(formatPhoneNumber("010-1234-5678")).toBe("010-1234-5678");
    expect(formatPhoneNumber("010 1234 5678")).toBe("010-1234-5678");
  });

  it("11자리를 넘는 숫자는 잘라낸다", () => {
    expect(formatPhoneNumber("010000000001234")).toBe("010-0000-0000");
  });

  it("빈 문자열은 그대로 빈 문자열이다", () => {
    expect(formatPhoneNumber("")).toBe("");
  });
});
