"use client";

import type { KeyboardEvent } from "react";

type ToggleSwitchProps = {
  checked: boolean;
  onChange: () => void;
};

/**
 * 디자인 토큰 기반 커스텀 토글 스위치.
 * 시각적 트랙은 작지만(24x40) 실제 클릭 영역은 min-h-11/min-w-11(44px)로 확보한다.
 */
export function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onChange();
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      onKeyDown={handleKeyDown}
      className="focus-glow flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-sm)]"
    >
      <span
        className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-strong)]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-[var(--color-surface)] shadow-[var(--sh-sm)] transition-transform ${
            checked ? "translate-x-[19px]" : "translate-x-[3px]"
          }`}
        />
      </span>
    </button>
  );
}
