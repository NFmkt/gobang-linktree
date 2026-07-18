"use client";

import { useState, type FormEvent } from "react";
import type { SocialItem, SiteSettingsRow } from "@/lib/site/config";

type SettingsFormProps = {
  initialSettings: SiteSettingsRow;
};

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [brandName, setBrandName] = useState(initialSettings.brand_name);
  const [bio, setBio] = useState(initialSettings.bio);
  const [social, setSocial] = useState<SocialItem[]>(initialSettings.social);
  const [affiliateEmail, setAffiliateEmail] = useState(initialSettings.affiliate_email);
  const [affiliateLabel, setAffiliateLabel] = useState(initialSettings.affiliate_label);
  const [affiliateSheetUrl, setAffiliateSheetUrl] = useState(
    initialSettings.affiliate_sheet_url,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateSocialUrl(key: string, url: string) {
    setSocial((prev) => prev.map((item) => (item.key === key ? { ...item, url } : item)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName,
          bio,
          social,
          affiliate_email: affiliateEmail,
          affiliate_label: affiliateLabel,
          affiliate_sheet_url: affiliateSheetUrl,
        }),
      });

      if (!res.ok) {
        setError("저장에 실패했습니다.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("저장 요청에 실패했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-[480px] flex-col gap-3 rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]"
    >
      <h1 className="text-[18px] font-extrabold text-[var(--color-ink)]">사이트 설정</h1>

      <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-[var(--color-ink-2)]">
        브랜드명
        <input
          value={brandName}
          onChange={(event) => setBrandName(event.target.value)}
          required
          className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-[var(--color-ink-2)]">
        소개(bio)
        <input
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          required
          className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
        />
      </label>

      {social.map((item) => (
        <label
          key={item.key}
          className="flex flex-col gap-1 text-[12.5px] font-semibold text-[var(--color-ink-2)]"
        >
          {item.label} URL
          <input
            value={item.url}
            onChange={(event) => updateSocialUrl(item.key, event.target.value)}
            required
            className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
          />
        </label>
      ))}

      <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-[var(--color-ink-2)]">
        제휴 문의 이메일
        <input
          type="email"
          value={affiliateEmail}
          onChange={(event) => setAffiliateEmail(event.target.value)}
          required
          className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-[var(--color-ink-2)]">
        제휴 문의 버튼 라벨
        <input
          value={affiliateLabel}
          onChange={(event) => setAffiliateLabel(event.target.value)}
          required
          className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-[var(--color-ink-2)]">
        제휴 문의 시트 링크 (선택)
        <input
          type="url"
          value={affiliateSheetUrl}
          onChange={(event) => setAffiliateSheetUrl(event.target.value)}
          placeholder="https://docs.google.com/spreadsheets/..."
          className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] font-normal text-[var(--color-ink)] outline-none"
        />
      </label>

      {error ? <p className="text-[12.5px] text-[var(--color-danger)]">{error}</p> : null}
      {success ? <p className="text-[12.5px] text-[var(--color-good)]">저장했습니다.</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="focus-glow flex min-h-11 items-center justify-center rounded-[var(--r-sm)] bg-[var(--color-primary)] text-[14px] font-bold text-[var(--color-on-primary)] disabled:opacity-50"
      >
        {submitting ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
