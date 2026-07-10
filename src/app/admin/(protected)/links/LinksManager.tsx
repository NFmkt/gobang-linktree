"use client";

import { useState, type DragEvent } from "react";
import type { Link } from "@/lib/links/types";
import { LinkIcon } from "@/components/icons/LinkIcon";
import { ToggleSwitch } from "@/components/admin/ToggleSwitch";
import { reorderLinks } from "@/lib/admin/reorderLinks";
import { LinkForm } from "./LinkForm";

type LinksManagerProps = {
  initialLinks: Link[];
};

export function LinksManager({ initialLinks }: LinksManagerProps) {
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  async function refetch() {
    try {
      const res = await fetch("/api/admin/links");
      if (!res.ok) {
        setError("목록을 다시 불러오지 못했습니다.");
        return;
      }
      const body = await res.json();
      setLinks(body.links);
      setError(null);
    } catch {
      setError("목록을 다시 불러오지 못했습니다. 네트워크 상태를 확인해주세요.");
    }
  }

  async function handleToggleActive(link: Link) {
    try {
      const res = await fetch(`/api/admin/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !link.active }),
      });
      if (!res.ok) {
        setError("노출 상태 변경에 실패했습니다.");
        return;
      }
      await refetch();
    } catch {
      setError("노출 상태 변경 요청에 실패했습니다. 네트워크 상태를 확인해주세요.");
    }
  }

  async function handleDelete(link: Link) {
    if (!window.confirm(`"${link.title}" 링크를 삭제할까요?`)) return;
    try {
      const res = await fetch(`/api/admin/links/${link.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("삭제에 실패했습니다.");
        return;
      }
      await refetch();
    } catch {
      setError("삭제 요청에 실패했습니다. 네트워크 상태를 확인해주세요.");
    }
  }

  function handleFormSaved() {
    setEditingLink(null);
    setIsCreating(false);
    void refetch();
  }

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
  }

  async function handleDrop(targetId: string) {
    if (!draggedId) return;
    const reordered = reorderLinks(links, draggedId, targetId);
    setDraggedId(null);
    setLinks(reordered);
    try {
      const res = await fetch("/api/admin/links/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((link) => link.id) }),
      });
      if (!res.ok) {
        setError("순서 변경에 실패했습니다.");
      }
    } catch {
      setError("순서 변경 요청에 실패했습니다. 네트워크 상태를 확인해주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-extrabold text-[var(--color-ink)]">링크 관리</h1>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="focus-glow min-h-11 rounded-[var(--r-sm)] bg-[var(--color-primary)] px-3 py-1.5 text-[13.5px] font-bold text-[var(--color-on-primary)]"
        >
          + 링크 추가
        </button>
      </div>

      {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}

      {isCreating ? (
        <LinkForm
          mode="create"
          nextOrder={links.length + 1}
          onSaved={handleFormSaved}
          onCancel={() => setIsCreating(false)}
        />
      ) : null}

      {editingLink ? (
        <LinkForm
          mode="edit"
          link={editingLink}
          onSaved={handleFormSaved}
          onCancel={() => setEditingLink(null)}
        />
      ) : null}

      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li
            key={link.id}
            draggable
            onDragStart={() => handleDragStart(link.id)}
            onDragOver={handleDragOver}
            onDrop={() => void handleDrop(link.id)}
            className="flex items-center gap-3 rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--sh-sm)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--color-blue-50)]">
              <LinkIcon iconKey={link.icon} className="h-5 w-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] font-bold text-[var(--color-ink)]">
                {link.title}
              </span>
              <span className="truncate text-[12.5px] text-[var(--color-ink-2)]">{link.url}</span>
            </span>
            <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-ink-2)]">
              <ToggleSwitch
                checked={link.active}
                onChange={() => void handleToggleActive(link)}
                aria-label="노출"
              />
              노출
            </span>
            <button
              type="button"
              onClick={() => setEditingLink(link)}
              className="focus-glow min-h-11 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--color-ink-2)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              수정
            </button>
            <button
              type="button"
              onClick={() => void handleDelete(link)}
              className="focus-glow min-h-11 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--color-danger)]"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
