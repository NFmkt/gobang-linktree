type FooterProps = {
  brandName: string;
};

/** 페이지 하단 — 작은 로고 텍스트 + 저작권 표기. */
export function Footer({ brandName }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="flex flex-col items-center gap-1 pb-10 pt-6 text-center text-[12px] text-[var(--color-ink-soft)]">
      <p>
        © {year} {brandName}
      </p>
    </footer>
  );
}
