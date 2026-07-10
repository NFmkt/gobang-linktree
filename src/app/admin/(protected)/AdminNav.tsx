"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/links", label: "링크 관리" },
  { href: "/admin/settings", label: "사이트 설정" },
  { href: "/admin/stats", label: "통계" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-3">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`focus-glow rounded-[var(--r-sm)] px-2 py-1 text-[13.5px] ${
              active
                ? "font-bold text-[var(--color-primary)]"
                : "font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-primary)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
