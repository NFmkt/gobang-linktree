const SEOUL_AREA_CODE = "02";
const MAX_DIGITS = 11;
const MIDDLE_GROUP_SIZE = 4;

/**
 * 숫자만 입력해도 하이픈이 자동으로 들어가도록 국내 전화번호를 포맷한다.
 * 서울(02)은 2자리 지역번호, 그 외(휴대폰/타 지역번호)는 3자리로 취급하고,
 * 나머지 자릿수는 앞에서부터 최대 4자리씩 채워 넣는다(입력 중간 상태도 자연스럽게 이어짐).
 */
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, MAX_DIGITS);
  const isSeoul = digits.startsWith(SEOUL_AREA_CODE);
  const prefixLength = isSeoul ? 2 : 3;

  const prefix = digits.slice(0, prefixLength);
  const rest = digits.slice(prefixLength);

  if (rest.length === 0) return prefix;
  if (rest.length <= MIDDLE_GROUP_SIZE) return `${prefix}-${rest}`;

  const middle = rest.slice(0, MIDDLE_GROUP_SIZE);
  const last = rest.slice(MIDDLE_GROUP_SIZE);
  return `${prefix}-${middle}-${last}`;
}
