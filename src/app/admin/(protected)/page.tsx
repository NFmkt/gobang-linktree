import Link from "next/link";

const ADMIN_SECTIONS = [
  { href: "/admin/links", title: "링크 관리", description: "링크 추가·수정·삭제, 노출 순서 변경" },
  { href: "/admin/settings", title: "사이트 설정", description: "브랜드명·bio·소셜·제휴 이메일 편집" },
  { href: "/admin/stats", title: "통계", description: "방문·클릭·유입출처 요약, 통계 초기화" },
] as const;

export default function AdminHomePage() {
  return (
    <ul className="flex flex-col gap-3">
      {ADMIN_SECTIONS.map((section) => (
        <li key={section.href}>
          <Link
            href={section.href}
            className="focus-glow group flex w-full flex-col gap-1 rounded-[var(--r)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3.5 shadow-[var(--sh-sm)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[0_0_0_4px_var(--color-blue-ring)] motion-reduce:transition-none"
          >
            <span className="text-[16px] font-extrabold text-[var(--color-ink)]">
              {section.title}
            </span>
            <span className="text-[13.5px] text-[var(--color-ink-2)]">{section.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
