"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // 네트워크 오류라도 로그인 화면으로는 이동시킨다
      // (쿠키가 실제로 안 지워졌다면 미들웨어가 다음 요청에서 다시 막는다).
    }
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="focus-glow min-h-11 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] px-3 py-1.5 text-[13.5px] font-semibold text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
    >
      로그아웃
    </button>
  );
}
