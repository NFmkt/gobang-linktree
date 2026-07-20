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
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
    setExpandedId(null);
    setIsCreating(false);
    void refetch();
  }

  function toggleExpand(id: string) {
    setIsCreating(false);
    setExpandedId((current) => (current === id ? null : id));
  }

  function handleStartCreate() {
    setExpandedId(null);
    setIsCreating(true);
  }

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
  }

  async function performReorder(sourceId: string, targetId: string) {
    const reordered = reorderLinks(links, sourceId, targetId);
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

  async function handleDrop(targetId: string) {
    if (!draggedId) return;
    const sourceId = draggedId;
    setDraggedId(null);
    await performReorder(sourceId, targetId);
  }

  function handleMoveUp(id: string) {
    const index = links.findIndex((link) => link.id === id);
    if (index <= 0) return;
    void performReorder(id, links[index - 1].id);
  }

  function handleMoveDown(id: string) {
    const index = links.findIndex((link) => link.id === id);
    if (index === -1 || index >= links.length - 1) return;
    void performReorder(id, links[index + 1].id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-extrabold text-[var(--color-ink)]">링크 관리</h1>
        <button
          type="button"
          onClick={handleStartCreate}
          className="focus-glow min-h-11 rounded-[var(--r-sm)] bg-[var(--color-primary)] px-3 py-1.5 text-[13.5px] font-bold text-[var(--color-on-primary)]"
        >
          + 링크 추가
        </button>
      </div>

      {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        <ul className="flex flex-col gap-2">
          {links.map((link, index) => {
            const isExpanded = expandedId === link.id;
            const panelId = `link-edit-panel-${link.id}`;
            return (
              <li
                key={link.id}
                draggable
                onDragStart={() => handleDragStart(link.id)}
                onDragOver={handleDragOver}
                onDrop={() => void handleDrop(link.id)}
                className="flex flex-col rounded-[var(--r)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--sh-sm)]"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(link.id)}
                      disabled={index === 0}
                      aria-label="위로 이동"
                      className="focus-glow flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-sm)] text-[13px] text-[var(--color-ink-2)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-[var(--color-ink-2)]"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(link.id)}
                      disabled={index === links.length - 1}
                      aria-label="아래로 이동"
                      className="focus-glow flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-sm)] text-[13px] text-[var(--color-ink-2)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-[var(--color-ink-2)]"
                    >
                      ▼
                    </button>
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--color-blue-50)]">
                    <LinkIcon iconKey={link.icon} className="h-5 w-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-bold text-[var(--color-ink)]">
                      {link.title}
                    </span>
                    <span className="truncate text-[12.5px] text-[var(--color-ink-2)]">
                      {link.url}
                    </span>
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
                    onClick={() => toggleExpand(link.id)}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className="focus-glow flex min-h-11 items-center gap-1 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--color-ink-2)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    {isExpanded ? "닫기" : "수정"}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                        isExpanded ? "-rotate-90" : "rotate-90"
                      }`}
                      fill="currentColor"
                    >
                      <path d="M7.4 4.4a1.15 1.15 0 0 1 1.63 0l4.57 4.57a1.15 1.15 0 0 1 0 1.63L9.03 15.2a1.15 1.15 0 1 1-1.63-1.63L11.34 10 7.4 6.03a1.15 1.15 0 0 1 0-1.63Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(link)}
                    className="focus-glow min-h-11 rounded-[var(--r-sm)] border-[1.5px] border-[var(--color-border-strong)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--color-danger)]"
                  >
                    삭제
                  </button>
                </div>

                {isExpanded ? (
                  <div
                    id={panelId}
                    className="accordion-panel border-t border-[var(--color-border)] px-4 py-3"
                  >
                    <LinkForm
                      mode="edit"
                      link={link}
                      onSaved={handleFormSaved}
                      onCancel={() => setExpandedId(null)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-5">
          {isCreating ? (
            <LinkForm
              mode="create"
              nextOrder={links.length + 1}
              onSaved={handleFormSaved}
              onCancel={() => setIsCreating(false)}
            />
          ) : null}

          {!isCreating ? (
            <p className="rounded-[var(--r)] border border-dashed border-[var(--color-border-strong)] p-4 text-[12.5px] text-[var(--color-ink-2)]">
              링크를 추가하려면 위의 &ldquo;+ 링크 추가&rdquo;를 눌러주세요. 각 링크의
              &ldquo;수정&rdquo;을 누르면 목록에서 바로 펼쳐져 편집할 수 있어요.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
