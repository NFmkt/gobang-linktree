import type { ReactNode } from "react";
import { AdminNav } from "./AdminNav";
import { LogoutButton } from "./LogoutButton";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5">
        <div className="flex items-center gap-5">
          <span className="text-[15px] font-extrabold text-[var(--color-ink)]">고방 관리자</span>
          <AdminNav />
        </div>
        <LogoutButton />
      </header>
      <main className="p-5">{children}</main>
    </div>
  );
}
