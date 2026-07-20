"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isSafeLinkUrl } from "@/lib/links/isSafeLinkUrl";

const NAV_ITEMS = [
  { href: "/admin/links", label: "링크 관리" },
  { href: "/admin/settings", label: "사이트 설정" },
  { href: "/admin/stats", label: "통계" },
] as const;

const INACTIVE_TAB_CLASS =
  "font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-primary)]";
const ACTIVE_TAB_CLASS = "font-bold text-[var(--color-primary)]";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

async function handleAffiliateSheetClick() {
  try {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const body = await res.json();
      const url = body?.settings?.affiliate_sheet_url as string | undefined;
      if (url && isSafeLinkUrl(url)) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
    }
  } catch {
    // 네트워크 오류 시에도 아래 안내 메시지로 폴백한다.
  }
  window.alert("관리자 설정에서 시트 링크를 먼저 등록하세요");
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
            className={`focus-glow flex min-h-11 items-center rounded-[var(--r-sm)] px-3 text-[13.5px] ${
              active ? ACTIVE_TAB_CLASS : INACTIVE_TAB_CLASS
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={handleAffiliateSheetClick}
        className={`focus-glow flex min-h-11 items-center rounded-[var(--r-sm)] px-3 text-[13.5px] ${INACTIVE_TAB_CLASS}`}
      >
        제휴 문의
      </button>
    </nav>
  );
}
