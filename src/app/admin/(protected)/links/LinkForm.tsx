"use client";

import { useState, type FormEvent } from "react";
import type { Link } from "@/lib/links/types";
import { IconSelect } from "@/components/admin/IconSelect";

type LinkFormProps =
  | {
      mode: "create";
      nextOrder: number;
      onSaved: () => void;
      onCancel: () => void;
    }
  | {
      mode: "edit";
      link: Link;
      onSaved: () => void;
      onCancel: () => void;
    };

export function LinkForm(props: LinkFormProps) {
  const initial = props.mode === "edit" ? props.link : null;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "home");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res =
        props.mode === "create"
          ? await fetch("/api/admin/links", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title,
                url,
                icon,
                subtitle: subtitle || undefined,
                thumbnail: thumbnail || undefined,
                order: props.nextOrder,
              }),
            })
          : await fetch(`/api/admin/links/${props.link.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title,
                url,
                icon,
                subtitle: subtitle || null,
                thumbnail: thumbnail || null,
              }),
            });

      if (!res.ok) {
        setError("저장에 실패했습니다.");
        return;
      }

      props.onSaved();
    } catch {
      setError("저장 요청에 실패했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--sh-sm)]"
    >
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="제목"
        required
        className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] text-[var(--color-ink)] outline-none"
      />
      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="URL"
        required
        className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] text-[var(--color-ink)] outline-none"
      />
      <input
        value={subtitle}
        onChange={(event) => setSubtitle(event.target.value)}
        placeholder="부제 (선택)"
        className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] text-[var(--color-ink)] outline-none"
      />
      <input
        value={thumbnail}
        onChange={(event) => setThumbnail(event.target.value)}
        placeholder="썸네일 이미지 URL (선택)"
        className="focus-glow h-9 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-[14px] text-[var(--color-ink)] outline-none"
      />
      <IconSelect value={icon} onChange={setIcon} />
      {error ? <p className="text-[12.5px] text-[var(--color-danger)]">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="focus-glow flex-1 rounded-[var(--r-sm)] bg-[var(--color-primary)] py-2 text-[13.5px] font-bold text-[var(--color-on-primary)] disabled:opacity-50"
        >
          {submitting ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={props.onCancel}
          className="focus-glow flex-1 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] py-2 text-[13.5px] font-semibold text-[var(--color-ink-2)]"
        >
          취소
        </button>
      </div>
    </form>
  );
}
