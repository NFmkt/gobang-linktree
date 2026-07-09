"use client";

import { LinkIcon } from "@/components/icons/LinkIcon";

export const ICON_OPTIONS = [
  "youth",
  "feed",
  "series",
  "home",
  "blog",
  "instagram",
  "youtube",
  "kakao",
] as const;

type IconSelectProps = {
  value: string;
  onChange: (key: string) => void;
};

export function IconSelect({ value, onChange }: IconSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--color-blue-50)]">
        <LinkIcon iconKey={value} className="h-5 w-5" />
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-glow h-9 flex-1 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] outline-none"
      >
        {ICON_OPTIONS.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </div>
  );
}
