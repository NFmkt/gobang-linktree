import { describe, it, expect } from "vitest";
import { calculateContrastRatio, hexToRgb } from "../contrastRatio";

describe("hexToRgb", () => {
  it("should parse hex color with # prefix", () => {
    const result = hexToRgb("#ffffff");
    expect(result).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("should parse hex color without # prefix", () => {
    const result = hexToRgb("e5484d");
    expect(result).toEqual({ r: 229, g: 72, b: 77 });
  });

  it("should throw on invalid hex length", () => {
    expect(() => hexToRgb("#fff")).toThrow();
  });
});

describe("calculateContrastRatio", () => {
  // Based on WCAG 2.0 specification
  // https://www.w3.org/TR/WCAG20/#contrast-ratiodef

  it("should return exactly 21:1 for black vs white", () => {
    const ratio = calculateContrastRatio("#000000", "#ffffff");
    expect(ratio).toBeCloseTo(21, 1);
  });

  it("should return 1:1 for same color", () => {
    const ratio = calculateContrastRatio("#ffffff", "#ffffff");
    expect(ratio).toBeCloseTo(1, 1);
  });

  /**
   * RED TEST: Current color (#e5484d) has insufficient contrast (< 4.5:1)
   * against white background (#ffffff) and page background (#f3f6fd)
   */
  describe("Current danger color (#e5484d) — SHOULD FAIL WCAG AA", () => {
    it("should have contrast < 4.5:1 against white (#ffffff)", () => {
      const ratio = calculateContrastRatio("#e5484d", "#ffffff");
      // According to WCAG, this should be around 3.7:1
      expect(ratio).toBeLessThan(4.5);
      expect(ratio).toBeGreaterThan(3.5);
    });

    it("should have contrast < 4.5:1 against page background (#f3f6fd)", () => {
      const ratio = calculateContrastRatio("#e5484d", "#f3f6fd");
      // Page background is very light, so contrast should be slightly higher but still below 4.5
      expect(ratio).toBeLessThan(4.5);
    });
  });

  /**
   * GREEN TEST: Proposed new color (#ca2b30) should meet WCAG AA (>= 4.5:1)
   * against both white and page background
   */
  describe("Proposed new danger color (#ca2b30) — SHOULD PASS WCAG AA", () => {
    it("should have contrast >= 4.5:1 against white (#ffffff)", () => {
      const ratio = calculateContrastRatio("#ca2b30", "#ffffff");
      // According to WCAG calculation, this should be around 5.0:1
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("should have contrast >= 4.5:1 against page background (#f3f6fd)", () => {
      const ratio = calculateContrastRatio("#ca2b30", "#f3f6fd");
      // Even against the lighter background, the darker color should maintain >= 4.5:1
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  // Additional validation tests
  it("should return same result regardless of color argument order", () => {
    const ratio1 = calculateContrastRatio("#e5484d", "#ffffff");
    const ratio2 = calculateContrastRatio("#ffffff", "#e5484d");
    expect(ratio1).toBeCloseTo(ratio2);
  });

  it("should handle uppercase hex values", () => {
    const ratio1 = calculateContrastRatio("#E5484D", "#FFFFFF");
    const ratio2 = calculateContrastRatio("#e5484d", "#ffffff");
    expect(ratio1).toBeCloseTo(ratio2);
  });
});
