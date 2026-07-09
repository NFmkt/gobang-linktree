"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("비밀번호가 올바르지 않습니다.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("로그인 요청에 실패했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-6">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[360px] flex-col gap-4 rounded-[var(--r-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--sh)]"
      >
        <h1 className="text-[20px] font-extrabold text-[var(--color-ink)]">관리자 로그인</h1>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호"
          autoFocus
          className="focus-glow h-[46px] rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-4 text-[15px] text-[var(--color-ink)] outline-none"
        />
        {error ? <p className="text-[13.5px] text-[var(--color-danger)]">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || password.length === 0}
          className="focus-glow flex h-[46px] items-center justify-center rounded-[var(--r-sm)] bg-[var(--color-primary)] text-[15px] font-bold text-[var(--color-on-primary)] transition-opacity disabled:opacity-50"
        >
          {submitting ? "확인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
