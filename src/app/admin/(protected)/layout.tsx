import type { ReactNode } from "react";
import { AdminNav } from "./AdminNav";
import { LogoutButton } from "./LogoutButton";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-5">
            <span className="text-[15px] font-extrabold text-[var(--color-ink)]">고방 링크트리 관리자</span>
            <AdminNav />
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl p-5">{children}</main>
    </div>
  );
}
