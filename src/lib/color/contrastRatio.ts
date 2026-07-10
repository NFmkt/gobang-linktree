/**
 * Calculate the relative luminance of a color according to WCAG 2.0 standards.
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 *
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 * @returns Relative luminance value (0-1)
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  // Normalize to 0-1 range
  const [R, G, B] = [r / 255, g / 255, b / 255];

  // Apply WCAG gamma correction
  const getRsRGB = (c: number): number => {
    if (c <= 0.03928) {
      return c / 12.92;
    }
    return Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const r_ = getRsRGB(R);
  const g_ = getRsRGB(G);
  const b_ = getRsRGB(B);

  // Calculate luminance using standard weights
  return 0.2126 * r_ + 0.7152 * g_ + 0.0722 * b_;
}

/**
 * Parse a hex color string (e.g., "#e5484d" or "e5484d") to RGB components.
 *
 * @param hex Hex color string
 * @returns Object with r, g, b components (0-255)
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace(/^#/, "");

  if (cleanHex.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return { r, g, b };
}

/**
 * Calculate the WCAG 2.0 contrast ratio between two colors.
 * https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 *
 * The contrast ratio is defined as:
 * (L1 + 0.05) / (L2 + 0.05)
 * where L1 is the relative luminance of the lighter color and L2 is the relative luminance of the darker color.
 *
 * @param color1 Hex color string (e.g., "#e5484d")
 * @param color2 Hex color string (e.g., "#ffffff")
 * @returns Contrast ratio (1-21)
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const luminance1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const luminance2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  // Always divide (lighter + 0.05) by (darker + 0.05)
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}
